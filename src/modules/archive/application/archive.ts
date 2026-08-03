import { randomUUID } from "node:crypto";

import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import { z } from "zod";

import { withAuthTransaction } from "@/infrastructure/database/auth-transaction";
import { getPrivateObject } from "@/infrastructure/object-storage/s3-private-storage";
import {
  generateIvaFiscalBookPdf,
  type IvaFiscalBookKind,
} from "@/modules/declarations/application/iva-book-files";
import type { IvaFiscalBookSnapshot } from "@/modules/declarations/domain/iva-books";
import {
  requirePermission,
  AuthorizationError,
} from "@/modules/identity/application/auth-context";
import { permissions } from "@/modules/identity/domain/permissions";
import type { AuthContext } from "@/modules/shared/application/context";

const periodSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const archivePaperSizes = {
  LETTER: { label: "Carta (8,5 × 11 pulg.)", width: 612, height: 792 },
  A4: { label: "A4 (210 × 297 mm)", width: 595.28, height: 841.89 },
  LEGAL_OFFICIO: {
    label: "Legal / Oficio (8,5 × 13 pulg.)",
    width: 612,
    height: 936,
  },
} as const;
const archivePdfSchema = z.object({
  companyId: z.uuid(),
  period: periodSchema,
  evidenceIds: z.array(z.uuid()).min(1).max(80),
  title: z.string().trim().min(1).max(80),
  description: z.string().trim().max(320).default(""),
  includeIndex: z.boolean().default(true),
  purpose: z.enum(["preview", "download"]).default("download"),
});
const fiscalBoardPdfSchema = z.object({
  companyId: z.uuid(),
  period: periodSchema,
  evidenceIds: z.array(z.uuid()).min(1).max(80),
  layout: z.enum(["ONE_PER_PAGE", "TWO_PER_PAGE"]).default("ONE_PER_PAGE"),
  purpose: z.enum(["preview", "download"]).default("download"),
});
const boardEvidenceRequirementsSchema = z
  .array(
    z.object({
      kind: z.enum([
        "SOLVENCY",
        "DECLARATION_RECEIPT",
        "DECLARATION_FILE",
        "PAYMENT_FORM",
        "PAYMENT_RECEIPT",
      ]),
      required: z.boolean(),
      fiscalBoard: z.boolean().default(false),
    }),
  )
  .catch([]);

const evidenceLabels = {
  SOLVENCY: "Solvencia",
  DECLARATION_RECEIPT: "Comprobante de declaración",
  DECLARATION_FILE: "Archivo de declaración",
  PAYMENT_FORM: "Planilla de pago",
  PAYMENT_RECEIPT: "Comprobante de pago",
  INVOICE: "Factura",
  OTHER: "Otro soporte",
} as const;

function monthStart(period: string) {
  return new Date(`${period}-01T00:00:00.000Z`);
}

function periodLabel(period: string) {
  const date = monthStart(period);
  const label = new Intl.DateTimeFormat("es-VE", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export async function getArchivePeriod(
  auth: AuthContext,
  rawPeriod: unknown,
  requestedCompanyId?: string | null,
) {
  requirePermission(auth, permissions.calendarRead);
  const period = periodSchema.parse(rawPeriod);
  return withAuthTransaction(auth, async (transaction) => {
    const [firm, companies] = await Promise.all([
      transaction.firm.findUniqueOrThrow({
        where: { id: auth.firmId },
        select: { archivePaperSize: true },
      }),
      transaction.company.findMany({
        where: { id: { in: auth.allowedCompanyIds }, status: "ACTIVE" },
        select: { id: true, legalName: true, rif: true },
        orderBy: { legalName: "asc" },
      }),
    ]);
    const fallbackCompanyId = auth.activeCompanyId ?? companies[0]?.id ?? null;
    const companyId = requestedCompanyId || fallbackCompanyId;
    if (!companyId || !companies.some((company) => company.id === companyId))
      throw new AuthorizationError(
        "Selecciona una empresa disponible para preparar el archivo.",
      );

    const cases = await transaction.complianceCase.findMany({
      where: {
        firmId: auth.firmId,
        companyId,
        periodMonth: monthStart(period),
        suppressedAt: null,
      },
      select: {
        id: true,
        offeringName: true,
        offeringKind: true,
        cadence: true,
        offering: {
          select: { archiveOrder: true, evidenceRequirements: true },
        },
        evidences: {
          where: {
            storedObject: { status: { in: ["AVAILABLE", "QUARANTINED"] } },
          },
          select: {
            id: true,
            kind: true,
            createdAt: true,
            storedObject: {
              select: {
                originalName: true,
                declaredMime: true,
                sizeBytes: true,
                status: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: [
        { offering: { archiveOrder: "asc" } },
        { offeringKind: "asc" },
        { offeringName: "asc" },
      ],
    });
    const ivaBooks = await transaction.ivaFiscalBook.findMany({
      where: {
        firmId: auth.firmId,
        companyId,
        periodKey: period,
        declaration: {
          complianceCase: {
            status: { in: ["SUBMITTED", "PAID", "CLOSED"] },
            suppressedAt: null,
          },
        },
      },
      select: {
        id: true,
        kind: true,
        snapshot: true,
        generatedAt: true,
        declaration: { select: { caseId: true } },
      },
      orderBy: { kind: "asc" },
    });
    const booksByCase = new Map<string, typeof ivaBooks>();
    for (const book of ivaBooks) {
      const current = booksByCase.get(book.declaration.caseId) ?? [];
      current.push(book);
      booksByCase.set(book.declaration.caseId, current);
    }
    const company = companies.find((item) => item.id === companyId)!;
    const serializeCase = (item: (typeof cases)[number]) => {
      const requirements = boardEvidenceRequirementsSchema.parse(
        item.offering.evidenceRequirements,
      );
      const requirementByKind = new Map(
        requirements.map((requirement, index) => [
          requirement.kind,
          { ...requirement, order: index },
        ]),
      );
      const evidenceDocuments = item.evidences
        .map((evidence) => {
          const requirement = requirementByKind.get(
            evidence.kind as (typeof requirements)[number]["kind"],
          );
          return {
            id: evidence.id,
            name: evidenceLabels[evidence.kind],
            fileName: evidence.storedObject.originalName,
            mimeType: evidence.storedObject.declaredMime,
            sizeBytes: Number(evidence.storedObject.sizeBytes),
            status: evidence.storedObject.status as
              | "AVAILABLE"
              | "QUARANTINED",
            origin:
              item.offeringKind === "TAX"
                ? "Expediente de declaración"
                : "Calendario de servicios",
            fiscalBoard:
              item.offeringKind === "SERVICE" ||
              Boolean(requirement?.fiscalBoard),
            documentOrder: requirement?.order ?? 999,
          };
        })
        .sort(
          (left, right) =>
            left.documentOrder - right.documentOrder ||
            left.name.localeCompare(right.name, "es"),
        );
      const bookDocuments = (booksByCase.get(item.id) ?? [])
        .sort((left, right) => {
          const order = { PURCHASES: 0, SALES: 1 } as const;
          return order[left.kind] - order[right.kind];
        })
        .map((book, index) => ({
          id: book.id,
          name: book.kind === "PURCHASES" ? "Libro de compras" : "Libro de ventas",
          fileName: `${book.kind === "PURCHASES" ? "libro-compras" : "libro-ventas"}-${period}.pdf`,
          mimeType: "application/pdf",
          sizeBytes: Buffer.byteLength(JSON.stringify(book.snapshot), "utf8"),
          status: "AVAILABLE" as const,
          origin: "Libro fiscal generado",
          fiscalBoard: false,
          documentOrder: 10_000 + index,
        }));
      const documents = [...evidenceDocuments, ...bookDocuments];
      const expectedBoardDocuments =
        item.offeringKind === "TAX"
          ? requirements
              .filter(({ fiscalBoard }) => fiscalBoard)
              .map(({ kind }) => evidenceLabels[kind])
          : ["Factura", "Comprobante de pago"];
      return {
        id: item.id,
        name: item.offeringName,
        cadence: item.cadence,
        kind: item.offeringKind,
        archiveOrder: item.offering.archiveOrder,
        expectedBoardDocuments,
        documents,
      };
    };
    const serializedCases = cases.map(serializeCase);
    return {
      period: { key: period, label: periodLabel(period) },
      company,
      companies,
      archivePaperSize: firm.archivePaperSize,
      archivePaperLabel:
        archivePaperSizes[
          firm.archivePaperSize as keyof typeof archivePaperSizes
        ]?.label ?? archivePaperSizes.LETTER.label,
      groups: serializedCases.filter((item) => item.documents.length > 0),
      fiscalBoardGroups: serializedCases.map((item) => ({
        ...item,
        documents: item.documents.filter(({ fiscalBoard }) => fiscalBoard),
      })),
    };
  });
}

type ArchiveSource = {
  id: string;
  group: string;
  label: string;
  fileName: string;
  mimeType: string;
  objectKey?: string;
  generatedBook?: {
    kind: IvaFiscalBookKind;
    snapshot: IvaFiscalBookSnapshot;
  };
  sizeBytes: number;
  archiveOrder: number;
  documentOrder: number;
};

type LoadedSource = ArchiveSource & {
  bytes: Uint8Array;
  pageCount: number;
  sourcePdf?: PDFDocument;
};

function cleanPdfText(value: string) {
  return value
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, " ");
}

function ivaBookSnapshot(value: unknown): IvaFiscalBookSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value) || !("version" in value) || value.version !== 1)
    throw new Error("La instantánea de un libro fiscal no tiene una versión compatible.");
  return value as IvaFiscalBookSnapshot;
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = cleanPdfText(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (!current || font.widthOfTextAtSize(candidate, size) <= maxWidth)
      current = candidate;
    else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawWrappedText(
  page: PDFPage,
  text: string,
  options: {
    x: number;
    y: number;
    maxWidth: number;
    size: number;
    lineHeight: number;
    font: PDFFont;
    color?: ReturnType<typeof rgb>;
    maxLines?: number;
  },
) {
  const lines = wrapText(
    text,
    options.font,
    options.size,
    options.maxWidth,
  ).slice(0, options.maxLines);
  lines.forEach((line, index) =>
    page.drawText(line, {
      x: options.x,
      y: options.y - index * options.lineHeight,
      size: options.size,
      font: options.font,
      color: options.color,
    }),
  );
  return options.y - lines.length * options.lineHeight;
}

async function loadSource(source: ArchiveSource): Promise<LoadedSource> {
  const bytes = source.generatedBook
    ? await generateIvaFiscalBookPdf(source.generatedBook.snapshot, source.generatedBook.kind)
    : source.objectKey
      ? await getPrivateObject(source.objectKey)
      : null;
  if (!bytes) throw new Error(`No se encontró el contenido de ${source.fileName}.`);
  if (source.mimeType === "application/pdf") {
    try {
      const sourcePdf = await PDFDocument.load(bytes);
      return {
        ...source,
        bytes,
        sourcePdf,
        pageCount: sourcePdf.getPageCount(),
      };
    } catch {
      throw new Error(
        `No se pudo incorporar ${source.fileName}. Confirma que el PDF no esté cifrado ni dañado.`,
      );
    }
  }
  if (source.mimeType === "image/jpeg" || source.mimeType === "image/png")
    return { ...source, bytes, pageCount: 1 };
  throw new Error(
    `${source.fileName} no tiene un formato compatible con el expediente PDF.`,
  );
}

function drawBrand(
  page: PDFPage,
  firmName: string,
  regular: PDFFont,
  bold: PDFFont,
) {
  const top = page.getHeight() - 92;
  page.drawRectangle({
    x: 56,
    y: top,
    width: 38,
    height: 38,
    color: rgb(0.078, 0.208, 0.176),
  });
  page.drawText("PX", {
    x: 66,
    y: top + 14,
    size: 11,
    font: bold,
    color: rgb(1, 1, 1),
  });
  page.drawText(cleanPdfText(firmName), {
    x: 106,
    y: top + 21,
    size: 11,
    font: bold,
    color: rgb(0.1, 0.1, 0.1),
  });
  page.drawText("FIRMA CONTABLE", {
    x: 106,
    y: top + 6,
    size: 7,
    font: regular,
    color: rgb(0.45, 0.45, 0.43),
  });
}

export async function generateArchivePdf(auth: AuthContext, rawInput: unknown) {
  requirePermission(auth, permissions.calendarRead);
  const input = archivePdfSchema.parse(rawInput);
  if (!auth.allowedCompanyIds.includes(input.companyId))
    throw new AuthorizationError(
      "No tienes acceso a los documentos de esta empresa.",
    );

  const snapshot = await withAuthTransaction(auth, async (transaction) => {
    const [firm, company, evidences, fiscalBooks] = await Promise.all([
      transaction.firm.findUniqueOrThrow({
        where: { id: auth.firmId },
        select: { legalName: true, tradeName: true, archivePaperSize: true },
      }),
      transaction.company.findFirstOrThrow({
        where: { id: input.companyId, firmId: auth.firmId, status: "ACTIVE" },
        select: { legalName: true, rif: true },
      }),
      transaction.complianceCaseEvidence.findMany({
        where: {
          id: { in: input.evidenceIds },
          firmId: auth.firmId,
          companyId: input.companyId,
          case: { periodMonth: monthStart(input.period), suppressedAt: null },
          storedObject: { status: "AVAILABLE" },
        },
        select: {
          id: true,
          kind: true,
          case: {
            select: {
              offeringName: true,
              offering: {
                select: { archiveOrder: true, evidenceRequirements: true },
              },
            },
          },
          storedObject: {
            select: {
              originalName: true,
              declaredMime: true,
              objectKey: true,
              sizeBytes: true,
            },
          },
        },
      }),
      transaction.ivaFiscalBook.findMany({
        where: {
          id: { in: input.evidenceIds },
          firmId: auth.firmId,
          companyId: input.companyId,
          periodKey: input.period,
          declaration: {
            complianceCase: {
              status: { in: ["SUBMITTED", "PAID", "CLOSED"] },
              suppressedAt: null,
            },
          },
        },
        select: {
          id: true,
          kind: true,
          snapshot: true,
          declaration: {
            select: {
              complianceCase: {
                select: {
                  offeringName: true,
                  offering: { select: { archiveOrder: true } },
                },
              },
            },
          },
        },
      }),
    ]);
    if (evidences.length + fiscalBooks.length !== input.evidenceIds.length)
      throw new Error(
        "La selección contiene archivos no disponibles o ajenos al período.",
      );
    const byId = new Map(evidences.map((evidence) => [evidence.id, evidence]));
    const bookById = new Map(fiscalBooks.map((book) => [book.id, book]));
    const sources = input.evidenceIds.map((id): ArchiveSource => {
      const book = bookById.get(id);
      if (book) {
        const label = book.kind === "PURCHASES" ? "Libro de compras" : "Libro de ventas";
        const snapshot = ivaBookSnapshot(book.snapshot);
        return {
          id,
          group: book.declaration.complianceCase.offeringName,
          label,
          fileName: `${book.kind === "PURCHASES" ? "libro-compras" : "libro-ventas"}-${input.period}.pdf`,
          mimeType: "application/pdf",
          sizeBytes: Buffer.byteLength(JSON.stringify(book.snapshot), "utf8"),
          archiveOrder: book.declaration.complianceCase.offering.archiveOrder,
          documentOrder: book.kind === "PURCHASES" ? 10_000 : 10_001,
          generatedBook: { kind: book.kind, snapshot },
        };
      }
      const evidence = byId.get(id);
      if (!evidence) throw new Error("La selección contiene un documento no disponible.");
      const requirements = boardEvidenceRequirementsSchema.parse(
        evidence.case.offering.evidenceRequirements,
      );
      const documentOrder = requirements.findIndex(
        ({ kind }) => kind === evidence.kind,
      );
      return {
        id,
        group: evidence.case.offeringName,
        label: evidenceLabels[evidence.kind],
        fileName: evidence.storedObject.originalName,
        mimeType: evidence.storedObject.declaredMime,
        objectKey: evidence.storedObject.objectKey,
        sizeBytes: Number(evidence.storedObject.sizeBytes),
        archiveOrder: evidence.case.offering.archiveOrder,
        documentOrder: documentOrder < 0 ? 999 : documentOrder,
      };
    });
    sources.sort(
      (left, right) =>
        left.archiveOrder - right.archiveOrder ||
        left.group.localeCompare(right.group, "es") ||
        left.documentOrder - right.documentOrder,
    );
    if (
      sources.reduce((total, source) => total + source.sizeBytes, 0) >
      150 * 1024 * 1024
    )
      throw new Error(
        "La selección supera 150 MB. Genera el expediente en varias secciones.",
      );
    return { firm, company, sources };
  });

  const loaded = await Promise.all(snapshot.sources.map(loadSource));
  const indexPageCount = input.includeIndex
    ? Math.max(1, Math.ceil(loaded.length / 16))
    : 0;
  let nextContentPage = 2 + indexPageCount;
  const indexRows = loaded.map((source) => {
    const row = { ...source, startsAt: nextContentPage };
    nextContentPage += source.pageCount;
    return row;
  });
  const totalPages = nextContentPage - 1;
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const brand = snapshot.firm.tradeName || snapshot.firm.legalName;
  const green = rgb(0.078, 0.208, 0.176);
  const muted = rgb(0.39, 0.39, 0.36);
  const paper =
    archivePaperSizes[
      snapshot.firm.archivePaperSize as keyof typeof archivePaperSizes
    ] ?? archivePaperSizes.LETTER;
  const pageSize: [number, number] = [paper.width, paper.height];
  const pageWidth = paper.width;
  const pageHeight = paper.height;
  const verticalOffset = pageHeight - 792;

  const cover = pdf.addPage(pageSize);
  cover.drawRectangle({
    x: 38,
    y: 38,
    width: pageWidth - 76,
    height: pageHeight - 76,
    borderColor: green,
    borderWidth: 3,
  });
  drawBrand(cover, brand, regular, bold);
  cover.drawText("EXPEDIENTE DEL PERIODO", {
    x: 70,
    y: 602 + verticalOffset,
    size: 10,
    font: bold,
    color: rgb(0.18, 0.44, 0.37),
  });
  let coverY = drawWrappedText(cover, input.title, {
    x: 70,
    y: 565 + verticalOffset,
    maxWidth: pageWidth - 140,
    size: 25,
    lineHeight: 30,
    font: bold,
    maxLines: 3,
  });
  coverY = drawWrappedText(cover, snapshot.company.legalName, {
    x: 70,
    y: coverY - 35,
    maxWidth: pageWidth - 140,
    size: 18,
    lineHeight: 23,
    font: bold,
    maxLines: 3,
  });
  cover.drawText(`RIF ${cleanPdfText(snapshot.company.rif)}`, {
    x: 70,
    y: coverY - 10,
    size: 11,
    font: bold,
    color: muted,
  });
  cover.drawLine({
    start: { x: 70, y: coverY - 43 },
    end: { x: pageWidth - 70, y: coverY - 43 },
    thickness: 1,
    color: rgb(0.86, 0.86, 0.84),
  });
  cover.drawText(cleanPdfText(periodLabel(input.period)), {
    x: 70,
    y: coverY - 82,
    size: 20,
    font: bold,
    color: green,
  });
  if (input.description)
    drawWrappedText(cover, input.description, {
      x: 70,
      y: coverY - 120,
      maxWidth: pageWidth - 140,
      size: 11,
      lineHeight: 16,
      font: regular,
      color: muted,
      maxLines: 6,
    });
  cover.drawText("Archivo tributario y de servicios", {
    x: 70,
    y: 62,
    size: 8,
    font: regular,
    color: muted,
  });
  cover.drawText(`Página 1 de ${totalPages}`, {
    x: pageWidth - 142,
    y: 62,
    size: 8,
    font: regular,
    color: muted,
  });

  for (let indexPage = 0; indexPage < indexPageCount; indexPage += 1) {
    const page = pdf.addPage(pageSize);
    drawBrand(page, brand, regular, bold);
    page.drawText("Índice del expediente", {
      x: 56,
      y: 660 + verticalOffset,
      size: 23,
      font: bold,
      color: rgb(0.1, 0.1, 0.1),
    });
    page.drawText("Documentos incorporados en el orden de salida", {
      x: 56,
      y: 638 + verticalOffset,
      size: 10,
      font: regular,
      color: muted,
    });
    const rows = indexRows.slice(indexPage * 16, (indexPage + 1) * 16);
    rows.forEach((row, rowIndex) => {
      const y = 595 + verticalOffset - rowIndex * 32;
      page.drawText(String(indexPage * 16 + rowIndex + 1).padStart(2, "0"), {
        x: 56,
        y,
        size: 9,
        font: bold,
        color: green,
      });
      const heading = `${row.group} - ${row.label}`;
      page.drawText(cleanPdfText(heading).slice(0, 70), {
        x: 82,
        y: y + 4,
        size: 9,
        font: bold,
        color: rgb(0.15, 0.15, 0.14),
      });
      page.drawText(cleanPdfText(row.fileName).slice(0, 72), {
        x: 82,
        y: y - 9,
        size: 7.5,
        font: regular,
        color: muted,
      });
      page.drawText(String(row.startsAt), {
        x: pageWidth - 77,
        y,
        size: 9,
        font: bold,
        color: muted,
      });
      page.drawLine({
        start: { x: 82, y: y - 15 },
        end: { x: pageWidth - 56, y: y - 15 },
        thickness: 0.5,
        color: rgb(0.9, 0.9, 0.88),
      });
    });
    page.drawText(`Página ${indexPage + 2} de ${totalPages}`, {
      x: pageWidth - 142,
      y: 38,
      size: 8,
      font: regular,
      color: muted,
    });
  }

  for (const source of loaded) {
    if (source.sourcePdf) {
      const embeddedPages = await pdf.embedPdf(
        source.bytes,
        source.sourcePdf.getPageIndices(),
      );
      embeddedPages.forEach((embeddedPage) => {
        const page = pdf.addPage(pageSize);
        const availableWidth = pageWidth - 36;
        const availableHeight = pageHeight - 50;
        const scale = Math.min(
          availableWidth / embeddedPage.width,
          availableHeight / embeddedPage.height,
        );
        const width = embeddedPage.width * scale;
        const height = embeddedPage.height * scale;
        page.drawPage(embeddedPage, {
          x: (pageWidth - width) / 2,
          y: 28 + (availableHeight - height) / 2,
          width,
          height,
        });
      });
    } else {
      const page = pdf.addPage(pageSize);
      const image =
        source.mimeType === "image/png"
          ? await pdf.embedPng(source.bytes)
          : await pdf.embedJpg(source.bytes);
      const availableWidth = pageWidth - 36;
      const availableHeight = pageHeight - 50;
      const scale = Math.min(
        availableWidth / image.width,
        availableHeight / image.height,
        1,
      );
      const width = image.width * scale;
      const height = image.height * scale;
      page.drawImage(image, {
        x: (pageWidth - width) / 2,
        y: 28 + (availableHeight - height) / 2,
        width,
        height,
      });
    }
  }

  pdf.getPages().forEach((page, index) => {
    if (index < 1 + indexPageCount) return;
    const { width } = page.getSize();
    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height: 20,
      color: rgb(1, 1, 1),
      opacity: 0.92,
    });
    page.drawText(`Página ${index + 1} de ${totalPages}`, {
      x: Math.max(18, width - 92),
      y: 7,
      size: 7,
      font: regular,
      color: muted,
    });
  });
  pdf.setTitle(
    `${input.title} - ${snapshot.company.legalName} - ${periodLabel(input.period)}`,
  );
  pdf.setAuthor(brand);
  pdf.setSubject("Expediente tributario y de servicios");
  pdf.setCreator("proyectoxyz");
  const bytes = await pdf.save();

  if (input.purpose === "download")
    await withAuthTransaction(auth, async (transaction) => {
      await transaction.auditEvent.create({
        data: {
          firmId: auth.firmId,
          actorUserId: auth.userId,
          requestId: randomUUID(),
          eventType: "archive.pdf.generated",
          entityType: "company",
          entityId: input.companyId,
          metadata: {
            period: input.period,
            evidenceIds: input.evidenceIds,
            documentCount: input.evidenceIds.length,
            pageCount: totalPages,
            includeIndex: input.includeIndex,
          },
        },
      });
    });
  return {
    bytes,
    fileName: `expediente-${snapshot.company.rif}-${input.period}.pdf`
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "-"),
  };
}

export async function generateFiscalBoardPdf(
  auth: AuthContext,
  rawInput: unknown,
) {
  requirePermission(auth, permissions.calendarRead);
  const input = fiscalBoardPdfSchema.parse(rawInput);
  if (!auth.allowedCompanyIds.includes(input.companyId))
    throw new AuthorizationError(
      "No tienes acceso a los documentos de esta empresa.",
    );

  const snapshot = await withAuthTransaction(auth, async (transaction) => {
    const [firm, company, evidences] = await Promise.all([
      transaction.firm.findUniqueOrThrow({
        where: { id: auth.firmId },
        select: { legalName: true, tradeName: true, archivePaperSize: true },
      }),
      transaction.company.findFirstOrThrow({
        where: { id: input.companyId, firmId: auth.firmId, status: "ACTIVE" },
        select: { legalName: true, rif: true },
      }),
      transaction.complianceCaseEvidence.findMany({
        where: {
          id: { in: input.evidenceIds },
          firmId: auth.firmId,
          companyId: input.companyId,
          case: { periodMonth: monthStart(input.period), suppressedAt: null },
          storedObject: { status: "AVAILABLE" },
        },
        select: {
          id: true,
          kind: true,
          case: {
            select: {
              offeringName: true,
              offeringKind: true,
              offering: {
                select: { archiveOrder: true, evidenceRequirements: true },
              },
            },
          },
          storedObject: {
            select: {
              originalName: true,
              declaredMime: true,
              objectKey: true,
              sizeBytes: true,
            },
          },
        },
      }),
    ]);
    if (evidences.length !== input.evidenceIds.length)
      throw new Error(
        "La selección contiene archivos no disponibles o ajenos al período.",
      );

    const byId = new Map(evidences.map((evidence) => [evidence.id, evidence]));
    const sources = input.evidenceIds.map((id) => {
      const evidence = byId.get(id)!;
      const requirements = boardEvidenceRequirementsSchema.parse(
        evidence.case.offering.evidenceRequirements,
      );
      const documentOrder = requirements.findIndex(
        ({ kind }) => kind === evidence.kind,
      );
      const requirement = requirements[documentOrder];
      const eligible =
        evidence.case.offeringKind === "SERVICE" ||
        Boolean(requirement?.fiscalBoard);
      if (!eligible)
        throw new Error(
          `${evidenceLabels[evidence.kind]} de ${evidence.case.offeringName} no está configurado para la cartelera fiscal.`,
        );
      return {
        id,
        group: evidence.case.offeringName,
        label: evidenceLabels[evidence.kind],
        fileName: evidence.storedObject.originalName,
        mimeType: evidence.storedObject.declaredMime,
        objectKey: evidence.storedObject.objectKey,
        sizeBytes: Number(evidence.storedObject.sizeBytes),
        archiveOrder: evidence.case.offering.archiveOrder,
        documentOrder: documentOrder < 0 ? 999 : documentOrder,
      };
    });
    sources.sort(
      (left, right) =>
        left.archiveOrder - right.archiveOrder ||
        left.group.localeCompare(right.group, "es") ||
        left.documentOrder - right.documentOrder,
    );
    if (
      sources.reduce((total, source) => total + source.sizeBytes, 0) >
      150 * 1024 * 1024
    )
      throw new Error(
        "La selección supera 150 MB. Genera la cartelera en varios lotes.",
      );
    return { firm, company, sources };
  });

  const loaded = await Promise.all(snapshot.sources.map(loadSource));
  const paper =
    archivePaperSizes[
      snapshot.firm.archivePaperSize as keyof typeof archivePaperSizes
    ] ?? archivePaperSizes.LETTER;
  const twoPerPage = input.layout === "TWO_PER_PAGE";
  const pageSize: [number, number] = twoPerPage
    ? [paper.height, paper.width]
    : [paper.width, paper.height];
  const pdf = await PDFDocument.create();
  let currentPage: PDFPage | null = null;
  let slot = 0;

  const addSheet = (
    width: number,
    height: number,
    draw: (page: PDFPage, box: { x: number; y: number; width: number; height: number }) => void,
  ) => {
    if (!currentPage || !twoPerPage || slot === 0) {
      currentPage = pdf.addPage(pageSize);
      if (twoPerPage)
        currentPage.drawLine({
          start: { x: pageSize[0] / 2, y: 14 },
          end: { x: pageSize[0] / 2, y: pageSize[1] - 14 },
          thickness: 0.5,
          color: rgb(0.82, 0.82, 0.8),
        });
    }
    const margin = 18;
    const gutter = twoPerPage ? 14 : 0;
    const boxWidth = twoPerPage
      ? (pageSize[0] - margin * 2 - gutter) / 2
      : pageSize[0] - margin * 2;
    const boxHeight = pageSize[1] - margin * 2;
    const boxX = twoPerPage
      ? margin + slot * (boxWidth + gutter)
      : margin;
    const scale = Math.min(boxWidth / width, boxHeight / height);
    const fittedWidth = width * scale;
    const fittedHeight = height * scale;
    draw(currentPage, {
      x: boxX + (boxWidth - fittedWidth) / 2,
      y: margin + (boxHeight - fittedHeight) / 2,
      width: fittedWidth,
      height: fittedHeight,
    });
    slot = twoPerPage ? (slot + 1) % 2 : 0;
  };

  for (const source of loaded) {
    if (source.sourcePdf) {
      const embeddedPages = await pdf.embedPdf(
        source.bytes,
        source.sourcePdf.getPageIndices(),
      );
      embeddedPages.forEach((embeddedPage) =>
        addSheet(embeddedPage.width, embeddedPage.height, (page, box) =>
          page.drawPage(embeddedPage, box),
        ),
      );
    } else {
      const image =
        source.mimeType === "image/png"
          ? await pdf.embedPng(source.bytes)
          : await pdf.embedJpg(source.bytes);
      addSheet(image.width, image.height, (page, box) =>
        page.drawImage(image, box),
      );
    }
  }

  const brand = snapshot.firm.tradeName || snapshot.firm.legalName;
  pdf.setTitle(
    `Cartelera fiscal - ${snapshot.company.legalName} - ${periodLabel(input.period)}`,
  );
  pdf.setAuthor(brand);
  pdf.setSubject("Cartelera fiscal del período");
  pdf.setCreator("proyectoxyz");
  const bytes = await pdf.save();

  if (input.purpose === "download")
    await withAuthTransaction(auth, async (transaction) => {
      await transaction.auditEvent.create({
        data: {
          firmId: auth.firmId,
          actorUserId: auth.userId,
          requestId: randomUUID(),
          eventType: "archive.fiscal_board_pdf.generated",
          entityType: "company",
          entityId: input.companyId,
          metadata: {
            period: input.period,
            evidenceIds: input.evidenceIds,
            documentCount: input.evidenceIds.length,
            pageCount: pdf.getPageCount(),
            layout: input.layout,
          },
        },
      });
    });
  return {
    bytes,
    fileName: `cartelera-fiscal-${snapshot.company.rif}-${input.period}.pdf`
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "-"),
  };
}
