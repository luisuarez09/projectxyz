import { randomUUID } from "node:crypto";

import { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import { withAuthTransaction } from "@/infrastructure/database/auth-transaction";
import { getIvaDeclarationWorkspace } from "@/modules/declarations/application/declarations";
import {
  generateIvaFiscalBookPdf,
  generateIvaFiscalBookXlsx,
} from "@/modules/declarations/application/iva-book-files";
import {
  buildIvaFiscalBookSnapshot,
  type IvaBookDocumentInput,
  type IvaFiscalBookSnapshot,
} from "@/modules/declarations/domain/iva-books";
import { requirePermission } from "@/modules/identity/application/auth-context";
import { permissions } from "@/modules/identity/domain/permissions";
import type { AuthContext } from "@/modules/shared/application/context";

const exportSchema = z.object({
  period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  kind: z.enum(["SALES", "PURCHASES"]),
  format: z.enum(["pdf", "xlsx"]),
  selectedPurchaseIds: z.array(z.uuid()).max(1000).default([]),
});

type Workspace = Awaited<ReturnType<typeof getIvaDeclarationWorkspace>>;

function decimal(value: string | number | null | undefined) {
  return Number(value ?? 0);
}

function salesDocument(item: Workspace["sales"][number]): IvaBookDocumentInput {
  return {
    id: item.id,
    date: item.date,
    partyName: item.customer,
    rif: item.rif,
    documentNumber: item.documentNumber,
    taxableBase: decimal(item.taxableBase),
    exemptAmount: decimal(item.exemptAmount),
    nonTaxableAmount: decimal(item.nonTaxableAmount),
    taxAmount: decimal(item.taxAmount),
    totalAmount: decimal(item.totalAmount),
    vatRate: decimal(item.vatRate),
    taxRateName: item.taxRateName,
    retentions: item.retentions.map((retention) => ({
      receiptNumber: retention.receiptNumber,
      percentage: decimal(retention.percentage),
      amount: decimal(retention.amount),
    })),
  };
}

function purchaseDocument(item: Workspace["purchases"][number]): IvaBookDocumentInput {
  return {
    id: item.id,
    date: item.date,
    partyName: item.supplier,
    rif: item.rif,
    documentNumber: item.documentNumber,
    taxableBase: decimal(item.taxableBase),
    exemptAmount: decimal(item.exemptAmount),
    nonTaxableAmount: decimal(item.nonTaxableAmount),
    taxAmount: decimal(item.taxAmount),
    totalAmount: decimal(item.totalAmount),
    vatRate: decimal(item.vatRate),
    taxRateName: item.taxRateName,
    retentions: item.retentions.map((retention) => ({
      receiptNumber: retention.receiptNumber,
      percentage: decimal(retention.percentage),
      amount: decimal(retention.amount),
    })),
  };
}

function preliminarySnapshot(workspace: Workspace, selectedPurchaseIds: string[]) {
  const selected = new Set(selectedPurchaseIds);
  if ([...selected].some((id) => !workspace.purchases.some((purchase) => purchase.id === id)))
    throw new Error("La selección contiene compras que ya no están disponibles en este expediente.");
  return buildIvaFiscalBookSnapshot({
    period: workspace.declaration.period,
    periodLabel: workspace.declaration.periodLabel,
    company: {
      legalName: workspace.company.legalName,
      rif: workspace.company.rif,
      fiscalAddress: workspace.company.fiscalAddress ?? "",
    },
    source: {
      ruleSource: workspace.case.source,
      ruleVersion: workspace.case.ruleVersion,
    },
    sales: workspace.sales.map(salesDocument),
    purchases: workspace.purchases.filter(({ id }) => selected.has(id)).map(purchaseDocument),
  });
}

function storedSnapshot(value: Prisma.JsonValue): IvaFiscalBookSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value) || value.version !== 1)
    throw new Error("La instantánea del libro fiscal no tiene una versión compatible.");
  return value as unknown as IvaFiscalBookSnapshot;
}

function safeFileName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-");
}

export async function exportIvaFiscalBook(auth: AuthContext, rawInput: unknown) {
  requirePermission(auth, permissions.calendarRead);
  const input = exportSchema.parse(rawInput);
  const workspace = await getIvaDeclarationWorkspace(auth, input.period);
  const closed = ["SUBMITTED", "PAID", "CLOSED"].includes(workspace.declaration.status);
  let snapshot: IvaFiscalBookSnapshot;
  if (closed) {
    snapshot = await withAuthTransaction(auth, async (transaction) => {
      const book = await transaction.ivaFiscalBook.findFirst({
        where: {
          declarationId: workspace.declaration.id,
          companyId: workspace.company.id,
          kind: input.kind,
        },
        select: { snapshot: true },
      });
      return book ? storedSnapshot(book.snapshot) : preliminarySnapshot(
        workspace,
        workspace.purchases.filter(({ selected }) => selected).map(({ id }) => id),
      );
    });
  } else {
    snapshot = preliminarySnapshot(workspace, input.selectedPurchaseIds);
  }

  const bytes = input.format === "pdf"
    ? await generateIvaFiscalBookPdf(snapshot, input.kind)
    : generateIvaFiscalBookXlsx(snapshot, input.kind);
  await withAuthTransaction(auth, async (transaction) => {
    await transaction.auditEvent.create({
      data: {
        firmId: auth.firmId,
        actorUserId: auth.userId,
        requestId: randomUUID(),
        eventType: "declaration.iva.fiscal_book.exported",
        entityType: "iva_declaration",
        entityId: workspace.declaration.id,
        metadata: {
          period: input.period,
          kind: input.kind,
          format: input.format,
          closedSnapshot: closed,
        },
      },
    });
  });
  const label = input.kind === "SALES" ? "libro-ventas" : "libro-compras";
  return {
    bytes,
    mimeType: input.format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    fileName: safeFileName(`${label}-${workspace.company.rif}-${input.period}.${input.format}`),
  };
}

export { storedSnapshot };
