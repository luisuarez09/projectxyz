"use client";

import { CommercialInvoiceForm } from "@/components/commercial-invoice-form";

export function PurchaseInvoiceForm({ documentId }: { documentId?: string }) {
  return <CommercialInvoiceForm documentId={documentId} kind="purchase" />;
}
