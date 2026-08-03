import { strFromU8, unzipSync } from "fflate";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";

import {
  generateIvaFiscalBookPdf,
  generateIvaFiscalBookXlsx,
} from "@/modules/declarations/application/iva-book-files";
import { buildIvaFiscalBookSnapshot } from "@/modules/declarations/domain/iva-books";

const snapshot = buildIvaFiscalBookSnapshot({
  generatedAt: "2026-07-08T14:36:20.000Z",
  period: "2026-06",
  periodLabel: "Junio de 2026",
  company: {
    legalName: "CEVIDEMCA TIERRA NEGRA, C.A.",
    rif: "J-50442956-2",
    fiscalAddress: "Maracaibo, Zulia",
  },
  source: { ruleSource: "Plantilla IVA de la firma", ruleVersion: 1 },
  sales: [{
    id: "sale-1",
    date: "2026-06-04",
    partyName: "Miriam Guerra",
    rif: "V-4529541",
    documentNumber: "135",
    taxableBase: 0,
    exemptAmount: 147_000,
    nonTaxableAmount: 0,
    taxAmount: 0,
    totalAmount: 147_000,
    vatRate: 16,
    taxRateName: "Alícuota general",
    retentions: [],
  }],
  purchases: [{
    id: "purchase-1",
    date: "2026-06-08",
    partyName: "Insumed de Occidente, C.A.",
    rif: "J-40997268-2",
    documentNumber: "4387",
    taxableBase: 41_552.12,
    exemptAmount: 0,
    nonTaxableAmount: 0,
    taxAmount: 0,
    totalAmount: 41_552.12,
    vatRate: 16,
    taxRateName: "Alícuota general",
    retentions: [],
  }],
});

describe("libros fiscales de IVA", () => {
  it("reconcilia operaciones sin impuesto como compras sin derecho a crédito", () => {
    expect(snapshot.summary.sales.exemptAmount).toBe(147_000);
    expect(snapshot.summary.sales.totalDebit).toBe(0);
    expect(snapshot.purchases[0].noCreditAmount).toBe(41_552.12);
    expect(snapshot.summary.purchases.totalCredit).toBe(0);
  });

  it("recovers the rate from base and tax when a historical document has no saved percentage", () => {
    const historical = buildIvaFiscalBookSnapshot({
      generatedAt: "2026-08-03T00:00:00.000Z",
      period: "2026-08",
      periodLabel: "Agosto de 2026",
      company: snapshot.company,
      source: { ruleSource: "Plantilla IVA de la firma", ruleVersion: 1 },
      sales: [{
        id: "historical-sale",
        date: "2026-08-01",
        partyName: "Cliente historico",
        rif: "J-00000000-0",
        documentNumber: "2530",
        taxableBase: 5_000,
        exemptAmount: 0,
        nonTaxableAmount: 0,
        taxAmount: 800,
        totalAmount: 5_800,
        vatRate: 0,
        taxRateName: "Alicuota general",
        retentions: [],
      }],
      purchases: [],
    });

    expect(historical.sales[0].generalSales.rate).toBe(16);
  });

  it("genera un Excel con el libro y el resumen sin referencias rotas", () => {
    const files = unzipSync(generateIvaFiscalBookXlsx(snapshot, "PURCHASES"));
    expect(Object.keys(files)).toContain("xl/worksheets/sheet1.xml");
    expect(Object.keys(files)).toContain("xl/worksheets/sheet2.xml");
    const workbook = strFromU8(files["xl/workbook.xml"]);
    const book = strFromU8(files["xl/worksheets/sheet1.xml"]);
    expect(workbook).toContain("COMPRAS");
    expect(workbook).toContain("RESUMEN");
    expect(book).toContain("Insumed de Occidente");
    expect(book).not.toContain("#REF!");
  });

  it("genera un PDF con el libro y una página final de resumen", async () => {
    const pdf = await PDFDocument.load(await generateIvaFiscalBookPdf(snapshot, "SALES"));
    expect(pdf.getPageCount()).toBe(2);
  });
});
