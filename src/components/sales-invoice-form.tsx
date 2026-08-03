"use client";

import { CommercialInvoiceForm } from "@/components/commercial-invoice-form";

export function SalesInvoiceForm({ documentId }: { documentId?: string }) {
  return <CommercialInvoiceForm documentId={documentId} kind="sale" />;
}
