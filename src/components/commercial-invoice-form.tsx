"use client";

import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  Keyboard,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { AttachmentInput } from "@/components/ui/attachment-input";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { SimpleSelect } from "@/components/ui/simple-select";

type Kind = "sale" | "purchase";
type Account = {
  id: string;
  code: string;
  name: string;
  label: string;
  nature: "DEBIT" | "CREDIT";
};
type Party = {
  id: string;
  legalName: string;
  rif: string;
  fiscalAddress: string;
  primaryAccountId: string | null;
  primaryAccount: string;
  counterpartAccountId: string | null;
  counterpartAccount: string;
};
type VatRate = {
  id: string;
  name: string;
  rate: string;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  source: string;
};
type Assignment = { id: string; label: string };
type Entry = { id: string; accountId: string; amount: string; source: string };
type Item = {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
  taxable: boolean;
};
type DocumentDetail = {
  id: string;
  type: Kind;
  documentNumber: string;
  counterpartyId: string;
  issueDate: string;
  currencyCode: string;
  taxableBase: string;
  exemptAmount: string;
  nonTaxableAmount: string;
  vatCreditStatus: "pending" | "applied" | "excluded" | null;
  status: "registered" | "declared" | "voided";
  editable: boolean;
  invoiceAttachment: { name: string; status: string } | null;
  items: Item[];
  accountingEntries: Array<{
    id: string;
    accountId: string;
    nature: "DEBIT" | "CREDIT";
    debit: string;
    credit: string;
    source: string;
  }>;
  retentions: Array<{
    type: "IVA" | "ISLR";
    receiptNumber: string;
    issueDate: string;
    percentage: string | null;
    amount: string;
    attachment: { name: string; status: string } | null;
  }>;
};

const today = new Date().toISOString().slice(0, 10);
const money = (value: number) =>
  value.toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const numeric = (raw: string) => {
  const value = raw.trim().replace(/\s/g, "");
  if (!value) return 0;
  if (value.includes(","))
    return Number(value.replaceAll(".", "").replace(",", ".")) || 0;
  if (/^-?\d{1,3}(?:\.\d{3})+$/.test(value))
    return Number(value.replaceAll(".", "")) || 0;
  return Number(value) || 0;
};
const cleanAmount = (value: string) => value.replace(/[^0-9,.-]/g, "");
const entryAmount = (value: number) =>
  money(Number.isFinite(value) ? value : 0);
const emptyItem = (id: string): Item => ({
  id,
  description: "",
  quantity: "1",
  unitPrice: "",
  taxable: true,
});

export function CommercialInvoiceForm({
  kind,
  documentId,
}: {
  kind: Kind;
  documentId?: string;
}) {
  const isSale = kind === "sale";
  const partyKind = isSale ? "customer" : "supplier";
  const partyWord = isSale ? "cliente" : "proveedor";
  const [parties, setParties] = useState<Party[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [assignments, setAssignments] = useState<Record<string, Assignment>>(
    {},
  );
  const [vatRates, setVatRates] = useState<VatRate[]>([]);
  const [vatEnabled, setVatEnabled] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [partyQuery, setPartyQuery] = useState("");
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeOption, setActiveOption] = useState(0);
  const [quickOpen, setQuickOpen] = useState(false);
  const [date, setDate] = useState(today);
  const [currency, setCurrency] = useState("VES");
  const [purchaseTaxable, setPurchaseTaxable] = useState("");
  const [purchaseExempt, setPurchaseExempt] = useState("");
  const [purchaseNonTaxable, setPurchaseNonTaxable] = useState("");
  const [hasVatCredit, setHasVatCredit] = useState(true);
  const [items, setItems] = useState<Item[]>([emptyItem("item-1")]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [existingInvoiceName, setExistingInvoiceName] = useState("");
  const [ivaEnabled, setIvaEnabled] = useState(false);
  const [ivaReceipt, setIvaReceipt] = useState("");
  const [ivaDate, setIvaDate] = useState(today);
  const [ivaPercentage, setIvaPercentage] = useState<75 | 100>(75);
  const [ivaFile, setIvaFile] = useState<File | null>(null);
  const [existingIvaName, setExistingIvaName] = useState("");
  const [islrEnabled, setIslrEnabled] = useState(false);
  const [islrReceipt, setIslrReceipt] = useState("");
  const [islrDate, setIslrDate] = useState(today);
  const [islrAmount, setIslrAmount] = useState("");
  const [islrFile, setIslrFile] = useState<File | null>(null);
  const [existingIslrName, setExistingIslrName] = useState("");
  const [voidOpen, setVoidOpen] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editable, setEditable] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const itemCounter = useRef(1);
  const entryCounter = useRef(0);

  const filteredParties = useMemo(
    () =>
      parties
        .filter((party) =>
          `${party.legalName} ${party.rif}`
            .toLowerCase()
            .includes(partyQuery.toLowerCase()),
        )
        .slice(0, 8),
    [parties, partyQuery],
  );
  const selectedRate = useMemo(
    () =>
      vatRates.find(
        (rate) =>
          (!rate.effectiveFrom || rate.effectiveFrom <= date) &&
          (!rate.effectiveTo || rate.effectiveTo >= date),
      ) ?? null,
    [date, vatRates],
  );
  const rateValue = Number(selectedRate?.rate ?? 0);
  const lineItems = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        total: numeric(item.quantity) * numeric(item.unitPrice),
      })),
    [items],
  );
  const taxableBase = isSale
    ? lineItems
        .filter((item) => item.taxable)
        .reduce((sum, item) => sum + item.total, 0)
    : numeric(purchaseTaxable);
  const exemptBase = isSale
    ? lineItems
        .filter((item) => !item.taxable)
        .reduce((sum, item) => sum + item.total, 0)
    : numeric(purchaseExempt);
  const nonTaxableBase = isSale ? 0 : numeric(purchaseNonTaxable);
  const tax =
    taxableBase > 0 && selectedRate ? (taxableBase * rateValue) / 100 : 0;
  const total = taxableBase + exemptBase + nonTaxableBase + tax;
  const accountById = useMemo(
    () => new Map(accounts.map((account) => [account.id, account])),
    [accounts],
  );
  const sideTotals = useMemo(
    () =>
      entries.reduce(
        (totals, entry) => {
          const amount = numeric(entry.amount);
          const nature = accountById.get(entry.accountId)?.nature;
          if (nature === "DEBIT") totals.debit += amount;
          if (nature === "CREDIT") totals.credit += amount;
          return totals;
        },
        { debit: 0, credit: 0 },
      ),
    [accountById, entries],
  );
  const difference = Math.abs(sideTotals.debit - sideTotals.credit);
  const balanced = sideTotals.debit > 0 && difference < 0.005;
  const ivaRetentionAmount = (tax * ivaPercentage) / 100;
  const retentionReady =
    (!ivaEnabled || /^\d{14}$/.test(ivaReceipt)) &&
    (!islrEnabled || Boolean(islrReceipt.trim() && numeric(islrAmount) > 0));
  const requiredVatAssignment = tax > 0 && (isSale || hasVatCredit);
  const accountReady =
    entries.length >= 2 &&
    entries.every((entry) => entry.accountId && numeric(entry.amount) > 0) &&
    (!requiredVatAssignment ||
      Boolean(assignments[isSale ? "iva-debit" : "iva-credit"]));
  const taxReady = taxableBase <= 0 || !vatEnabled || Boolean(selectedRate);
  const canSave = Boolean(
    editable &&
    selectedParty &&
    date &&
    total > 0 &&
    balanced &&
    accountReady &&
    taxReady &&
    retentionReady &&
    (!isSale || invoiceNumber),
  );

  const loadOptions = useCallback(async () => {
    const [partyResponse, optionsResponse, detailResponse] = await Promise.all([
      fetch(`/api/counterparties?kind=${partyKind}`, { cache: "no-store" }),
      fetch(`/api/commercial-documents?type=${kind}&mode=form`, {
        cache: "no-store",
      }),
      documentId
        ? fetch(`/api/commercial-documents?id=${documentId}`, {
            cache: "no-store",
          })
        : Promise.resolve(null),
    ]);
    const partyBody = await partyResponse.json();
    const optionsBody = await optionsResponse.json();
    const detailBody = detailResponse ? await detailResponse.json() : null;
    if (!partyResponse.ok)
      throw new Error(
        partyBody.error ?? `No fue posible cargar los ${partyWord}s.`,
      );
    if (!optionsResponse.ok)
      throw new Error(
        optionsBody.error ??
          "No fue posible cargar la configuración comercial.",
      );
    if (detailResponse && !detailResponse.ok)
      throw new Error(detailBody.error ?? "No fue posible cargar la factura.");
    setParties(partyBody.parties);
    setAccounts(partyBody.accounts);
    setAssignments(optionsBody.assignments);
    setVatRates(optionsBody.vatRates);
    setVatEnabled(Boolean(optionsBody.vatEnabled));
    if (!detailBody) {
      setInvoiceNumber(optionsBody.nextSaleNumber ?? "");
      return;
    }
    const detail = detailBody.document as DocumentDetail;
    if (detail.type !== kind)
      throw new Error("La factura no corresponde a este tipo de operación.");
    const party =
      partyBody.parties.find(
        (candidate: Party) => candidate.id === detail.counterpartyId,
      ) ?? null;
    setEditable(detail.editable);
    setSelectedParty(party);
    setPartyQuery(party?.legalName ?? "");
    setInvoiceNumber(detail.documentNumber);
    setDate(detail.issueDate);
    setCurrency(detail.currencyCode);
    setPurchaseTaxable(String(Number(detail.taxableBase)));
    setPurchaseExempt(String(Number(detail.exemptAmount)));
    setPurchaseNonTaxable(String(Number(detail.nonTaxableAmount)));
    setHasVatCredit(detail.vatCreditStatus !== "excluded");
    if (detail.items.length)
      setItems(
        detail.items.map((item) => ({
          ...item,
          quantity: String(Number(item.quantity)),
          unitPrice: String(Number(item.unitPrice)),
        })),
      );
    setEntries(
      detail.accountingEntries.map((entry) => ({
        id: entry.id,
        accountId: entry.accountId,
        amount: entryAmount(
          Number(entry.nature === "DEBIT" ? entry.debit : entry.credit),
        ),
        source: entry.source,
      })),
    );
    setExistingInvoiceName(detail.invoiceAttachment?.name ?? "");
    const iva = detail.retentions.find((retention) => retention.type === "IVA");
    const islr = detail.retentions.find(
      (retention) => retention.type === "ISLR",
    );
    setIvaEnabled(Boolean(iva));
    setIvaReceipt(iva?.receiptNumber ?? "");
    setIvaDate(iva?.issueDate ?? detail.issueDate);
    if (iva?.percentage && [75, 100].includes(Number(iva.percentage)))
      setIvaPercentage(Number(iva.percentage) as 75 | 100);
    setExistingIvaName(iva?.attachment?.name ?? "");
    setIslrEnabled(Boolean(islr));
    setIslrReceipt(islr?.receiptNumber ?? "");
    setIslrDate(islr?.issueDate ?? detail.issueDate);
    setIslrAmount(islr?.amount ? String(Number(islr.amount)) : "");
    setExistingIslrName(islr?.attachment?.name ?? "");
  }, [documentId, kind, partyKind, partyWord]);

  useEffect(() => {
    void loadOptions().catch((reason) =>
      setError(
        reason instanceof Error
          ? reason.message
          : "No fue posible cargar el formulario.",
      ),
    );
  }, [loadOptions]);

  useEffect(() => {
    if (!selectedParty) {
      setEntries([]);
      return;
    }
    if (documentId) return;
    const taxAssignment = assignments[isSale ? "iva-debit" : "iva-credit"];
    const primaryAccount = selectedParty.primaryAccountId
      ? accountById.get(selectedParty.primaryAccountId)
      : null;
    const counterpartAccount = selectedParty.counterpartAccountId
      ? accountById.get(selectedParty.counterpartAccountId)
      : null;
    const debitAccountId =
      primaryAccount?.nature === "DEBIT"
        ? primaryAccount.id
        : counterpartAccount?.nature === "DEBIT"
          ? counterpartAccount.id
          : (selectedParty.primaryAccountId ?? "");
    const creditAccountId =
      counterpartAccount?.nature === "CREDIT"
        ? counterpartAccount.id
        : primaryAccount?.nature === "CREDIT"
          ? primaryAccount.id
          : (selectedParty.counterpartAccountId ?? "");
    const automatic: Entry[] = isSale
      ? [
          {
            id: "party",
            accountId: debitAccountId,
            amount: entryAmount(total),
            source: "party",
          },
          {
            id: "counterpart",
            accountId: creditAccountId,
            amount: entryAmount(taxableBase + exemptBase),
            source: "counterpart",
          },
          ...(tax > 0
            ? [
                {
                  id: "tax",
                  accountId: taxAssignment?.id ?? "",
                  amount: entryAmount(tax),
                  source: "tax",
                },
              ]
            : []),
        ]
      : [
          {
            id: "party",
            accountId: debitAccountId,
            amount: entryAmount(
              taxableBase +
                exemptBase +
                nonTaxableBase +
                (hasVatCredit ? 0 : tax),
            ),
            source: "party",
          },
          ...(tax > 0 && hasVatCredit
            ? [
                {
                  id: "tax",
                  accountId: taxAssignment?.id ?? "",
                  amount: entryAmount(tax),
                  source: "tax",
                },
              ]
            : []),
          {
            id: "counterpart",
            accountId: creditAccountId,
            amount: entryAmount(total),
            source: "counterpart",
          },
        ];
    setEntries((current) => [
      ...automatic.map((entry) => ({
        ...entry,
        accountId:
          current.find((row) => row.id === entry.id)?.accountId ||
          entry.accountId,
      })),
      ...current.filter((entry) => entry.source === "manual"),
    ]);
  }, [
    accountById,
    assignments,
    exemptBase,
    hasVatCredit,
    isSale,
    documentId,
    nonTaxableBase,
    selectedParty,
    tax,
    taxableBase,
    total,
  ]);

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (event.altKey && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void save();
      }
      if (event.altKey && event.key.toLowerCase() === "n") {
        event.preventDefault();
        void save("new");
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  });

  const selectParty = (party: Party) => {
    setSelectedParty(party);
    setPartyQuery(party.legalName);
    setPickerOpen(false);
    setActiveOption(0);
  };
  const partyKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setPickerOpen(true);
      setActiveOption((current) =>
        Math.min(current + 1, Math.max(0, filteredParties.length - 1)),
      );
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setPickerOpen(true);
      setActiveOption((current) => Math.max(0, current - 1));
    }
    if (event.key === "Enter" && pickerOpen && filteredParties[activeOption]) {
      event.preventDefault();
      selectParty(filteredParties[activeOption]);
    }
    if (event.key === "Escape") setPickerOpen(false);
  };

  const save = async (afterSave: "stay" | "new" = "stay") => {
    if (!canSave || saving) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const accountingEntries = entries.map((entry) => {
        const amount = numeric(entry.amount).toFixed(6);
        const nature = accountById.get(entry.accountId)?.nature;
        return {
          accountId: entry.accountId,
          debit: nature === "DEBIT" ? amount : "0.000000",
          credit: nature === "CREDIT" ? amount : "0.000000",
          source: entry.source,
        };
      });
      const payload = {
        type: kind,
        counterpartyId: selectedParty!.id,
        documentNumber: isSale ? "" : invoiceNumber,
        issueDate: date,
        currencyCode: currency,
        taxableBase: taxableBase.toFixed(6),
        exemptAmount: exemptBase.toFixed(6),
        nonTaxableAmount: nonTaxableBase.toFixed(6),
        taxAmount: tax.toFixed(6),
        totalAmount: total.toFixed(6),
        vatRateId: selectedRate?.id ?? null,
        hasVatCredit,
        items: isSale
          ? items
              .filter(
                (item) => item.description.trim() && numeric(item.quantity) > 0,
              )
              .map((item) => ({
                description: item.description,
                quantity: numeric(item.quantity).toFixed(6),
                unitPrice: numeric(item.unitPrice).toFixed(6),
                taxable: item.taxable,
              }))
          : [],
        accountingEntries,
        retentions: isSale
          ? [
              ...(ivaEnabled
                ? [
                    {
                      type: "IVA",
                      receiptNumber: ivaReceipt,
                      issueDate: ivaDate,
                      percentage: String(ivaPercentage),
                      amount: ivaRetentionAmount.toFixed(6),
                    },
                  ]
                : []),
              ...(islrEnabled
                ? [
                    {
                      type: "ISLR",
                      receiptNumber: islrReceipt,
                      issueDate: islrDate,
                      percentage: "",
                      amount: numeric(islrAmount).toFixed(6),
                    },
                  ]
                : []),
            ]
          : [],
      };
      const form = new FormData();
      form.set("payload", JSON.stringify(payload));
      if (documentId) form.set("documentId", documentId);
      if (invoiceFile) form.set("invoice", invoiceFile);
      if (ivaFile) form.set("retentionIVA", ivaFile);
      if (islrFile) form.set("retentionISLR", islrFile);
      const response = await fetch("/api/commercial-documents", {
        method: documentId ? "PATCH" : "POST",
        body: form,
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error ?? "No fue posible registrar la factura.");
      setNotice(
        `${isSale ? "Venta" : "Compra"} ${body.document.documentNumber} ${documentId ? "actualizada" : "registrada"} en el período ${body.document.impositionPeriod}.`,
      );
      const newPath = isSale
        ? "/operaciones/ventas/nueva"
        : "/operaciones/compras/nueva";
      if (afterSave === "new") {
        window.location.assign(newPath);
      } else if (!documentId) {
        window.location.assign(
          `${isSale ? "/operaciones/ventas" : "/operaciones/compras"}/${body.document.id}/editar`,
        );
      } else {
        if (invoiceFile) setExistingInvoiceName(invoiceFile.name);
        if (ivaFile) setExistingIvaName(ivaFile.name);
        if (islrFile) setExistingIslrName(islrFile.name);
        setInvoiceFile(null);
        setIvaFile(null);
        setIslrFile(null);
      }
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No fue posible registrar la factura.",
      );
    } finally {
      setSaving(false);
    }
  };

  const voidNumber = async () => {
    if (!voidReason.trim() || saving) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(
        "/api/commercial-documents/void-sale-number",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ issueDate: date, reason: voidReason }),
        },
      );
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error ?? "No fue posible anular el correlativo.");
      setNotice(
        `El correlativo ${body.document.documentNumber} quedó anulado y no se reutilizará.`,
      );
      setVoidOpen(false);
      setVoidReason("");
      await loadOptions();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No fue posible anular el correlativo.",
      );
    } finally {
      setSaving(false);
    }
  };

  const deletePurchase = async () => {
    if (!documentId || !editable || deleting) return;
    setDeleting(true);
    setError("");
    try {
      const response = await fetch(
        `/api/commercial-documents?id=${documentId}`,
        { method: "DELETE" },
      );
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error ?? "No fue posible eliminar la compra.");
      window.location.assign("/operaciones/compras");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No fue posible eliminar la compra.",
      );
      setDeleteOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const createParty = async (draft: {
    legalName: string;
    rif: string;
    fiscalAddress: string;
    primaryAccountId: string;
    counterpartAccountId: string;
  }) => {
    const response = await fetch("/api/counterparties", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: partyKind, ...draft, email: "", phone: "" }),
    });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error ?? `No fue posible crear el ${partyWord}.`);
      return;
    }
    setParties((current) => [...current, body.party]);
    selectParty(body.party);
    setQuickOpen(false);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-10 lg:py-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            className="inline-flex items-center gap-2 text-sm font-medium text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
            href={isSale ? "/operaciones/ventas" : "/operaciones/compras"}
          >
            <ArrowLeft size={16} /> Volver a {isSale ? "ventas" : "compras"}
          </Link>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">
            {documentId ? "Editar" : "Registrar"} {isSale ? "venta" : "compra"}
          </h1>
          <p className="mt-2 text-sm text-stone-500">
            La operación, el asiento y sus soportes se guardan juntos en la
            empresa activa.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {documentId && !isSale && editable && (
            <Button
              className="border-rose-300 text-rose-700 hover:bg-rose-50 hover:text-rose-800 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950"
              disabled={saving || deleting}
              onClick={() => setDeleteOpen(true)}
              type="button"
              variant="outline"
            >
              <Trash2 size={16} /> Eliminar compra
            </Button>
          )}
          <Button
            disabled={!canSave || saving}
            onClick={() => void save()}
            variant="outline"
          >
            <Save size={16} /> {saving ? "Guardando…" : "Guardar"}
          </Button>
          <Button
            className="bg-[#14352d] text-white hover:bg-[#0e2821] dark:bg-emerald-950 dark:text-emerald-100 dark:hover:bg-emerald-900"
            disabled={!canSave || saving}
            onClick={() => void save("new")}
          >
            <Plus size={16} /> Guardar y nuevo
          </Button>
          <span className="hidden items-center gap-1 text-xs text-stone-400 sm:flex">
            <Keyboard size={14} />
            <Kbd>Alt</Kbd>+<Kbd>S</Kbd> / <Kbd>Alt</Kbd>+<Kbd>N</Kbd>
          </span>
        </div>
      </div>
      {notice && (
        <p className="mt-5 flex gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200">
          <CheckCircle2 size={17} />
          {notice}
        </p>
      )}
      {error && (
        <p className="mt-5 flex gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-300">
          <CircleAlert size={17} />
          {error}
        </p>
      )}
      {!editable && documentId && (
        <p className="mt-5 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-200">
          <CircleAlert size={17} /> Esta factura ya fue declarada o anulada. Se
          muestra en modo de consulta y no admite cambios.
        </p>
      )}
      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <fieldset
          className="space-y-5 disabled:opacity-75"
          disabled={!editable}
        >
          <Section
            title="Datos del documento"
            description={`Información fiscal y ${partyWord} asociado.`}
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="field-label relative sm:col-span-2 lg:col-span-4">
                {isSale ? "Cliente" : "Proveedor"} *
                <div className="mt-1.5 flex gap-2">
                  <div className="relative flex-1">
                    <Search
                      className="absolute left-3 top-2.5 text-stone-400"
                      size={16}
                    />
                    <Input
                      aria-activedescendant={
                        pickerOpen ? `party-option-${activeOption}` : undefined
                      }
                      aria-autocomplete="list"
                      className="field pl-9"
                      onChange={(event) => {
                        setPartyQuery(event.target.value);
                        setSelectedParty(null);
                        setPickerOpen(true);
                        setActiveOption(0);
                      }}
                      onFocus={() => setPickerOpen(true)}
                      onKeyDown={partyKeyDown}
                      placeholder={`Buscar ${partyWord} por nombre o RIF`}
                      role="combobox"
                      value={partyQuery}
                    />
                    {pickerOpen && partyQuery && (
                      <div
                        className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-stone-200 bg-white p-1 shadow-xl dark:border-stone-700 dark:bg-stone-900"
                        role="listbox"
                      >
                        {filteredParties.map((party, index) => (
                          <button
                            aria-selected={index === activeOption}
                            className={`block w-full rounded-lg px-3 py-2 text-left ${index === activeOption ? "bg-[#e7f0e9] text-[#14352d] dark:bg-emerald-950 dark:text-emerald-200" : "hover:bg-stone-50 dark:hover:bg-stone-800"}`}
                            id={`party-option-${index}`}
                            key={party.id}
                            onMouseDown={(event) => event.preventDefault()}
                            onMouseEnter={() => setActiveOption(index)}
                            onClick={() => selectParty(party)}
                            role="option"
                            type="button"
                          >
                            <span className="block text-sm font-medium">
                              {party.legalName}
                            </span>
                            <span className="text-xs text-stone-500">
                              {party.rif}
                            </span>
                          </button>
                        ))}
                        {!filteredParties.length && (
                          <p className="p-3 text-sm text-stone-500">
                            Sin coincidencias.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={() => setQuickOpen(true)}
                    type="button"
                    variant="outline"
                  >
                    <Plus size={15} /> Nuevo
                  </Button>
                </div>
                <span className="mt-1 block text-xs font-normal text-stone-500">
                  Usa ↑ ↓ y Enter para seleccionar. Las cuentas del tercero se
                  cargan automáticamente.
                </span>
              </div>
              <Field label="N.º de factura *">
                <Input
                  className={`field mt-1.5 ${isSale ? "bg-stone-50 dark:bg-stone-800/50" : ""}`}
                  onChange={(event) =>
                    !isSale &&
                    setInvoiceNumber(event.target.value.toUpperCase())
                  }
                  placeholder={
                    isSale ? "Configura el correlativo" : "Número del proveedor"
                  }
                  readOnly={isSale}
                  value={invoiceNumber}
                />
                {isSale && (
                  <button
                    className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400"
                    onClick={() => setVoidOpen(true)}
                    type="button"
                  >
                    Anular este correlativo
                  </button>
                )}
              </Field>
              <Field label="Fecha">
                <div className="mt-1.5">
                  <DatePicker
                    aria-label="Fecha de la factura"
                    keyboardEntry
                    onChange={(event) => setDate(event.target.value)}
                    value={date}
                  />
                </div>
              </Field>
              <Field label="Moneda">
                <SimpleSelect
                  className="field mt-1.5"
                  onChange={(event) => setCurrency(event.target.value)}
                  value={currency}
                >
                  <option value="VES">VES · Bolívar</option>
                  <option value="USD">USD · Dólar</option>
                </SimpleSelect>
              </Field>
              <Field label="Período de imposición">
                <div className="mt-1.5 flex h-9 items-center rounded-md border border-stone-200 bg-stone-50 px-3 text-sm dark:border-stone-700 dark:bg-stone-800/50 dark:text-stone-300">
                  {date.slice(0, 7)}
                </div>
              </Field>
            </div>
          </Section>

          {isSale ? (
            <Section
              title="Detalle de la venta"
              description="Clasifica cada renglón como gravado o exento."
            >
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    className="grid gap-2 rounded-xl border border-stone-200 p-3 dark:border-stone-800 md:grid-cols-[minmax(12rem,1fr)_6rem_9rem_8rem_2rem] md:items-end"
                    key={item.id}
                  >
                    <Field label="Descripción">
                      <Input
                        className="field mt-1.5"
                        onChange={(event) =>
                          setItems((current) =>
                            current.map((row) =>
                              row.id === item.id
                                ? { ...row, description: event.target.value }
                                : row,
                            ),
                          )
                        }
                        value={item.description}
                      />
                    </Field>
                    <Field label="Cantidad">
                      <Input
                        className="field mt-1.5 text-right"
                        inputMode="decimal"
                        onChange={(event) =>
                          setItems((current) =>
                            current.map((row) =>
                              row.id === item.id
                                ? {
                                    ...row,
                                    quantity: cleanAmount(event.target.value),
                                  }
                                : row,
                            ),
                          )
                        }
                        value={item.quantity}
                      />
                    </Field>
                    <Field label="Precio">
                      <Input
                        className="field mt-1.5 text-right"
                        inputMode="decimal"
                        onChange={(event) =>
                          setItems((current) =>
                            current.map((row) =>
                              row.id === item.id
                                ? {
                                    ...row,
                                    unitPrice: cleanAmount(event.target.value),
                                  }
                                : row,
                            ),
                          )
                        }
                        value={item.unitPrice}
                      />
                    </Field>
                    <Field label="Tratamiento">
                      <SimpleSelect
                        className="field mt-1.5"
                        onChange={(event) =>
                          setItems((current) =>
                            current.map((row) =>
                              row.id === item.id
                                ? {
                                    ...row,
                                    taxable: event.target.value === "taxable",
                                  }
                                : row,
                            ),
                          )
                        }
                        value={item.taxable ? "taxable" : "exempt"}
                      >
                        <option value="taxable">Gravado</option>
                        <option value="exempt">Exento</option>
                      </SimpleSelect>
                    </Field>
                    <Button
                      aria-label="Eliminar renglón"
                      onClick={() =>
                        setItems((current) =>
                          current.length === 1
                            ? [emptyItem(current[0].id)]
                            : current.filter((row) => row.id !== item.id),
                        )
                      }
                      size="icon-sm"
                      type="button"
                      variant="ghost"
                    >
                      <Trash2 size={15} />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                className="mt-3"
                onClick={() => {
                  itemCounter.current += 1;
                  setItems((current) => [
                    ...current,
                    emptyItem(`item-${itemCounter.current}`),
                  ]);
                }}
                size="sm"
                type="button"
                variant="outline"
              >
                <Plus size={15} /> Agregar renglón
              </Button>
            </Section>
          ) : (
            <Section
              title="Importes de la compra"
              description="Separa los montos según su tratamiento fiscal."
            >
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Base imponible">
                  <Input
                    className="field mt-1.5 text-right"
                    inputMode="decimal"
                    onChange={(event) =>
                      setPurchaseTaxable(cleanAmount(event.target.value))
                    }
                    value={purchaseTaxable}
                  />
                </Field>
                <Field label="Exento">
                  <Input
                    className="field mt-1.5 text-right"
                    inputMode="decimal"
                    onChange={(event) =>
                      setPurchaseExempt(cleanAmount(event.target.value))
                    }
                    value={purchaseExempt}
                  />
                </Field>
                <Field label="No gravado">
                  <Input
                    className="field mt-1.5 text-right"
                    inputMode="decimal"
                    onChange={(event) =>
                      setPurchaseNonTaxable(cleanAmount(event.target.value))
                    }
                    value={purchaseNonTaxable}
                  />
                </Field>
              </div>
              <label className="mt-4 flex w-fit cursor-pointer items-start gap-3 rounded-lg border border-stone-200 px-3 py-2.5 dark:border-stone-700">
                <input
                  checked={hasVatCredit}
                  className="mt-0.5 size-4 accent-[#14352d]"
                  onChange={(event) => setHasVatCredit(event.target.checked)}
                  type="checkbox"
                />
                <span>
                  <span className="block text-sm font-medium">
                    Derecho a crédito fiscal
                  </span>
                  <span className="mt-0.5 block text-xs text-stone-500">
                    Si se desmarca, el IVA se incorpora al costo y queda
                    excluido del crédito fiscal.
                  </span>
                </span>
              </label>
            </Section>
          )}

          <Section
            title="Distribución contable"
            description="Cuenta + monto. El Debe o Haber se determina por la naturaleza de cada cuenta."
          >
            <div className="grid grid-cols-[minmax(0,1fr)_9rem_2.25rem] gap-2 px-1 text-xs text-stone-500 dark:text-stone-400">
              <span>Cuenta</span>
              <span className="text-right">Monto</span>
              <span />
            </div>
            <div className="mt-1.5 space-y-2">
              {entries.map((entry) => (
                <div
                  className="grid grid-cols-[minmax(0,1fr)_9rem_2.25rem] items-center gap-2"
                  key={entry.id}
                >
                  <AccountPicker
                    accounts={accounts}
                    onChange={(accountId) =>
                      setEntries((current) =>
                        current.map((row) =>
                          row.id === entry.id ? { ...row, accountId } : row,
                        ),
                      )
                    }
                    value={entry.accountId}
                  />
                  <Input
                    aria-label="Monto"
                    className="field text-right"
                    inputMode="decimal"
                    onBlur={(event) =>
                      setEntries((current) =>
                        current.map((row) =>
                          row.id === entry.id
                            ? {
                                ...row,
                                amount: entryAmount(
                                  numeric(event.target.value),
                                ),
                              }
                            : row,
                        ),
                      )
                    }
                    onChange={(event) =>
                      setEntries((current) =>
                        current.map((row) =>
                          row.id === entry.id
                            ? {
                                ...row,
                                amount: cleanAmount(event.target.value),
                              }
                            : row,
                        ),
                      )
                    }
                    value={entry.amount}
                  />
                  <Button
                    aria-label="Eliminar línea"
                    onClick={() =>
                      setEntries((current) =>
                        current.filter((row) => row.id !== entry.id),
                      )
                    }
                    size="icon-sm"
                    type="button"
                    variant="ghost"
                  >
                    <Trash2 size={15} />
                  </Button>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button
                onClick={() => {
                  entryCounter.current += 1;
                  setEntries((current) => [
                    ...current,
                    {
                      id: `manual-${entryCounter.current}`,
                      accountId: "",
                      amount: "0,00",
                      source: "manual",
                    },
                  ]);
                }}
                size="sm"
                type="button"
                variant="outline"
              >
                <Plus size={15} /> Agregar línea
              </Button>
              <p className="text-xs text-stone-500">
                Las cuentas del tercero y del IVA se proponen automáticamente.
              </p>
            </div>
            <div className="mt-4 grid gap-2 border-t border-stone-200 pt-4 text-sm dark:border-stone-800 sm:grid-cols-3">
              <p>
                Débitos: <strong>{money(sideTotals.debit)}</strong>
              </p>
              <p>
                Créditos: <strong>{money(sideTotals.credit)}</strong>
              </p>
              <p
                className={`sm:text-right ${balanced ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}`}
              >
                {balanced ? "Cuadrado" : `Descuadre: ${money(difference)}`}
              </p>
            </div>
            {!accountReady && selectedParty && (
              <p className="mt-3 text-xs text-rose-600 dark:text-rose-400">
                Selecciona cuentas activas y completa cada monto. La cuenta de
                IVA debe estar configurada en Configuración → Empresa activa →
                Plan de cuentas.
              </p>
            )}
          </Section>

          <Section
            title="Soporte de factura"
            description="Archivo privado sujeto a validación antes de estar disponible."
          >
            <AttachmentInput
              accept=".pdf,image/*"
              description="PDF, JPG o PNG · máximo 20 MB"
              fileName={invoiceFile?.name ?? existingInvoiceName}
              label={`Factura de ${isSale ? "venta" : "compra"}`}
              onChange={(event) =>
                setInvoiceFile(event.target.files?.[0] ?? null)
              }
            />
          </Section>

          {isSale && (
            <Section
              title="Retenciones recibidas"
              description="Una misma venta puede incluir simultáneamente comprobantes de IVA y de ISLR."
            >
              <div className="grid gap-4 lg:grid-cols-2">
                <RetentionCard
                  enabled={ivaEnabled}
                  onToggle={() => setIvaEnabled((value) => !value)}
                  title="Retención de IVA"
                >
                  {ivaEnabled && (
                    <div className="mt-4 space-y-3">
                      <Field label="N.º de comprobante (14 dígitos)">
                        <Input
                          className="field mt-1.5"
                          inputMode="numeric"
                          maxLength={14}
                          onChange={(event) =>
                            setIvaReceipt(
                              event.target.value
                                .replace(/\D/g, "")
                                .slice(0, 14),
                            )
                          }
                          value={ivaReceipt}
                        />
                      </Field>
                      <Field label="Fecha">
                        <DatePicker
                          aria-label="Fecha de retención de IVA"
                          className="mt-1.5"
                          keyboardEntry
                          onChange={(event) => setIvaDate(event.target.value)}
                          value={ivaDate}
                        />
                      </Field>
                      <Field label="Porcentaje">
                        <SimpleSelect
                          className="field mt-1.5"
                          onChange={(event) =>
                            setIvaPercentage(
                              Number(event.target.value) as 75 | 100,
                            )
                          }
                          value={String(ivaPercentage)}
                        >
                          <option value="75">75 %</option>
                          <option value="100">100 %</option>
                        </SimpleSelect>
                      </Field>
                      <p className="text-sm font-medium">
                        Monto: {currency} {money(ivaRetentionAmount)}
                      </p>
                      <AttachmentInput
                        accept=".pdf,image/*"
                        fileName={ivaFile?.name ?? existingIvaName}
                        label="Comprobante de IVA"
                        onChange={(event) =>
                          setIvaFile(event.target.files?.[0] ?? null)
                        }
                      />
                    </div>
                  )}
                </RetentionCard>
                <RetentionCard
                  enabled={islrEnabled}
                  onToggle={() => setIslrEnabled((value) => !value)}
                  title="Retención de ISLR"
                >
                  {islrEnabled && (
                    <div className="mt-4 space-y-3">
                      <Field label="N.º de comprobante">
                        <Input
                          className="field mt-1.5"
                          onChange={(event) =>
                            setIslrReceipt(event.target.value.toUpperCase())
                          }
                          value={islrReceipt}
                        />
                      </Field>
                      <Field label="Fecha">
                        <DatePicker
                          aria-label="Fecha de retención de ISLR"
                          className="mt-1.5"
                          keyboardEntry
                          onChange={(event) => setIslrDate(event.target.value)}
                          value={islrDate}
                        />
                      </Field>
                      <Field label="Monto retenido">
                        <Input
                          className="field mt-1.5 text-right"
                          inputMode="decimal"
                          onChange={(event) =>
                            setIslrAmount(cleanAmount(event.target.value))
                          }
                          value={islrAmount}
                        />
                      </Field>
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        No se calcula automáticamente hasta configurar concepto,
                        porcentaje, sustraendo, fuente y vigencia.
                      </p>
                      <AttachmentInput
                        accept=".pdf,image/*"
                        fileName={islrFile?.name ?? existingIslrName}
                        label="Comprobante de ISLR"
                        onChange={(event) =>
                          setIslrFile(event.target.files?.[0] ?? null)
                        }
                      />
                    </div>
                  )}
                </RetentionCard>
              </div>
            </Section>
          )}
        </fieldset>

        <aside className="h-fit rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900 xl:sticky xl:top-22">
          <p className="font-semibold">Revisión de la factura</p>
          <dl className="mt-4 space-y-3 text-sm">
            <Row
              label={isSale ? "Cliente" : "Proveedor"}
              value={selectedParty?.legalName ?? "Sin seleccionar"}
            />
            <Row label="Factura" value={invoiceNumber || "Sin número"} />
            <Row label="Período" value={date.slice(0, 7)} />
            <Row
              label="Base imponible"
              value={`${currency} ${money(taxableBase)}`}
            />
            <Row label="Exento" value={`${currency} ${money(exemptBase)}`} />
            {!isSale && (
              <Row
                label="No gravado"
                value={`${currency} ${money(nonTaxableBase)}`}
              />
            )}
            <Row
              label={`IVA${selectedRate ? ` (${rateValue} %)` : ""}`}
              value={`${currency} ${money(tax)}`}
            />
          </dl>
          <div className="my-5 border-t border-stone-200 dark:border-stone-800" />
          <p className="text-xs uppercase tracking-wide text-stone-500">
            Total
          </p>
          <p className="mt-1 text-2xl font-semibold">
            {currency} {money(total)}
          </p>
          {taxableBase > 0 && vatEnabled && !selectedRate && (
            <p className="mt-4 rounded-lg bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
              Falta una alícuota de IVA activa y vigente para esta fecha.
            </p>
          )}
          {!vatEnabled && (
            <p className="mt-4 rounded-lg bg-stone-100 p-3 text-xs text-stone-600 dark:bg-stone-800 dark:text-stone-300">
              Esta empresa no tiene IVA habilitado. La factura se registrará sin IVA.
            </p>
          )}
          {selectedRate && (
            <p className="mt-4 text-xs leading-5 text-stone-500">
              {selectedRate.name} · {selectedRate.source || "Fuente pendiente"}
            </p>
          )}
          {!isSale && tax > 0 && (
            <p className="mt-4 rounded-lg bg-sky-50 p-3 text-xs text-sky-800 dark:bg-sky-950/60 dark:text-sky-200">
              {hasVatCredit
                ? "Crédito fiscal pendiente de decidir en la declaración."
                : "IVA incorporado al costo, sin derecho a crédito fiscal."}
            </p>
          )}
        </aside>
      </div>

      {quickOpen && (
        <QuickPartyModal
          accounts={accounts}
          kind={kind}
          onClose={() => setQuickOpen(false)}
          onCreate={createParty}
        />
      )}
      {voidOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-stone-950/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl dark:border dark:border-stone-800 dark:bg-stone-900">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  Anular correlativo {invoiceNumber}
                </h2>
                <p className="mt-1 text-sm text-stone-500">
                  El número quedará visible en el historial y la próxima venta
                  usará el siguiente.
                </p>
              </div>
              <Button
                aria-label="Cerrar"
                onClick={() => setVoidOpen(false)}
                size="icon-sm"
                variant="ghost"
              >
                <X />
              </Button>
            </div>
            <textarea
              className="field mt-4 min-h-24 py-2"
              onChange={(event) => setVoidReason(event.target.value)}
              placeholder="Motivo de la anulación"
              value={voidReason}
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button onClick={() => setVoidOpen(false)} variant="outline">
                Cancelar
              </Button>
              <Button
                className="bg-rose-700 hover:bg-rose-800"
                disabled={voidReason.trim().length < 5 || saving}
                onClick={() => void voidNumber()}
              >
                Confirmar anulación
              </Button>
            </div>
          </div>
        </div>
      )}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="p-6 sm:max-w-md">
          <DialogHeader className="pr-8">
            <DialogTitle className="text-lg font-semibold">¿Confirmar eliminación de compra?</DialogTitle>
            <DialogDescription className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
              Esta acción eliminará permanentemente la compra{" "}
              {invoiceNumber ? `N° ${invoiceNumber}` : ""} registrada y sus asientos
              contables. Esta operación no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              disabled={deleting}
              onClick={() => setDeleteOpen(false)}
              type="button"
              variant="outline"
            >
              Cancelar
            </Button>
            <Button
              disabled={deleting}
              onClick={() => void deletePurchase()}
              type="button"
              variant="destructive"
            >
              {deleting ? "Eliminando…" : "Eliminar compra"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AccountPicker({
  accounts,
  ariaLabel = "Cuenta contable",
  onChange,
  placeholder = "Código o nombre de cuenta",
  value,
}: {
  accounts: Account[];
  ariaLabel?: string;
  onChange: (accountId: string) => void;
  placeholder?: string;
  value: string;
}) {
  const selected = accounts.find((account) => account.id === value);
  const [query, setQuery] = useState(selected?.label ?? "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const filtered = useMemo(
    () =>
      accounts
        .filter((account) =>
          `${account.code} ${account.name}`
            .toLowerCase()
            .includes(query.toLowerCase()),
        )
        .slice(0, 12),
    [accounts, query],
  );
  useEffect(() => {
    setQuery(selected?.label ?? "");
  }, [selected?.label]);
  const choose = (account: Account) => {
    onChange(account.id);
    setQuery(account.label);
    setOpen(false);
    setActive(0);
  };
  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute right-3 top-2.5 z-10 text-stone-400"
        size={16}
      />
      <Input
        aria-label={ariaLabel}
        aria-autocomplete="list"
        className="field pr-9"
        onChange={(event) => {
          setQuery(event.target.value);
          onChange("");
          setOpen(true);
          setActive(0);
        }}
        onFocus={(event) => {
          event.currentTarget.select();
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive((current) =>
              Math.min(current + 1, Math.max(0, filtered.length - 1)),
            );
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((current) => Math.max(0, current - 1));
          }
          if (event.key === "Enter" && filtered[active]) {
            event.preventDefault();
            choose(filtered[active]);
          }
          if (event.key === "Escape") setOpen(false);
        }}
        placeholder={placeholder}
        role="combobox"
        value={query}
      />
      {open && (
        <div
          className="absolute z-40 mt-1 max-h-64 w-full min-w-72 overflow-y-auto rounded-xl border border-stone-200 bg-white p-1 shadow-xl dark:border-stone-700 dark:bg-stone-900"
          role="listbox"
        >
          {filtered.map((account, index) => (
            <button
              aria-selected={index === active}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm ${index === active ? "bg-[#e7f0e9] dark:bg-emerald-950" : "hover:bg-stone-50 dark:hover:bg-stone-800"}`}
              key={account.id}
              onClick={() => choose(account)}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActive(index)}
              role="option"
              type="button"
            >
              <span className="shrink-0 font-medium">{account.code}</span>
              <span className="truncate border-l border-stone-200 pl-3 text-stone-600">
                {account.name}
              </span>
            </button>
          ))}
          {!filtered.length && (
            <p className="p-3 text-sm text-stone-500">Sin coincidencias.</p>
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900 sm:p-5">
      <h2 className="font-semibold">{title}</h2>
      {description && (
        <p className="mt-1 text-sm text-stone-500">{description}</p>
      )}
      <div className="mt-4">{children}</div>
    </section>
  );
}
function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="field-label">
      {label}
      {children}
    </label>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-stone-500">{label}</dt>
      <dd className="max-w-48 truncate text-right font-medium">{value}</dd>
    </div>
  );
}
function RetentionCard({
  children,
  enabled,
  onToggle,
  title,
}: {
  children: ReactNode;
  enabled: boolean;
  onToggle: () => void;
  title: string;
}) {
  return (
    <article
      className={`rounded-xl border p-4 ${enabled ? "border-[#14352d] bg-[#e7f0e9]/40 dark:border-emerald-800 dark:bg-emerald-950/20" : "border-stone-200 dark:border-stone-800"}`}
    >
      <button
        aria-pressed={enabled}
        className="flex w-full items-center justify-between text-left"
        onClick={onToggle}
        type="button"
      >
        <span className="font-semibold">{title}</span>
        <span
          className={`rounded-full px-2 py-1 text-xs ${enabled ? "bg-[#14352d] text-white dark:bg-emerald-950 dark:text-emerald-200" : "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400"}`}
        >
          {enabled ? "Incluida" : "No recibida"}
        </span>
      </button>
      {children}
    </article>
  );
}

function QuickPartyModal({
  accounts,
  kind,
  onClose,
  onCreate,
}: {
  accounts: Account[];
  kind: Kind;
  onClose: () => void;
  onCreate: (draft: {
    legalName: string;
    rif: string;
    fiscalAddress: string;
    primaryAccountId: string;
    counterpartAccountId: string;
  }) => Promise<void>;
}) {
  const [legalName, setLegalName] = useState("");
  const [rif, setRif] = useState("");
  const [fiscalAddress, setFiscalAddress] = useState("");
  const [primaryAccountId, setPrimaryAccountId] = useState("");
  const [counterpartAccountId, setCounterpartAccountId] = useState("");
  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      open
    >
      <DialogContent className="max-w-2xl gap-0 p-0">
        <DialogHeader className="border-b border-stone-100 p-5 pr-14 dark:border-stone-800">
          <DialogTitle>
            Nuevo {kind === "sale" ? "cliente" : "proveedor"}
          </DialogTitle>
          <DialogDescription>
            Se guardará y quedará seleccionado sin perder la factura.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Nombre legal *">
            <Input
              className="field mt-1.5"
              onChange={(event) => setLegalName(event.target.value)}
              value={legalName}
            />
          </Field>
          <Field label="RIF *">
            <Input
              className="field mt-1.5"
              onChange={(event) => setRif(event.target.value.toUpperCase())}
              value={rif}
            />
          </Field>
          <Field label="Dirección fiscal">
            <Input
              className="field mt-1.5"
              onChange={(event) => setFiscalAddress(event.target.value)}
              value={fiscalAddress}
            />
          </Field>
          <div className="field-label">
            {kind === "sale" ? "Cuenta por cobrar" : "Cuenta de compra / gasto"}
            <div className="mt-1.5">
              <AccountPicker
                accounts={accounts}
                ariaLabel={
                  kind === "sale"
                    ? "Cuenta por cobrar"
                    : "Cuenta de compra o gasto"
                }
                onChange={setPrimaryAccountId}
                value={primaryAccountId}
              />
            </div>
          </div>
          <div className="field-label">
            {kind === "sale" ? "Cuenta de ingresos" : "Cuenta por pagar"}
            <div className="mt-1.5">
              <AccountPicker
                accounts={accounts}
                ariaLabel={
                  kind === "sale" ? "Cuenta de ingresos" : "Cuenta por pagar"
                }
                onChange={setCounterpartAccountId}
                value={counterpartAccountId}
              />
            </div>
          </div>
        </div>
        <DialogFooter className="border-t border-stone-100 p-5 dark:border-stone-800">
          <Button onClick={onClose} variant="outline">
            Cancelar
          </Button>
          <Button
            className="bg-[#14352d]"
            disabled={
              !legalName.trim() ||
              !rif.trim() ||
              !primaryAccountId ||
              !counterpartAccountId
            }
            onClick={() =>
              void onCreate({
                legalName,
                rif,
                fiscalAddress,
                primaryAccountId,
                counterpartAccountId,
              })
            }
          >
            Crear y seleccionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
