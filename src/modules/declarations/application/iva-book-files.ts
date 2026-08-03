import { strToU8, zipSync } from "fflate";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import type {
  IvaBookSummary,
  IvaFiscalBookSnapshot,
  IvaPurchaseBookRow,
  IvaSalesBookRow,
} from "@/modules/declarations/domain/iva-books";

export type IvaFiscalBookKind = "SALES" | "PURCHASES";

type CellValue = string | number;
type Column<Row> = { label: string; width: number; value: (row: Row) => CellValue };

const salesColumns: Array<Column<IvaSalesBookRow>> = [
  { label: "N° Op.", width: 34, value: (row) => row.operation },
  { label: "Fecha", width: 54, value: (row) => row.date },
  { label: "RIF", width: 65, value: (row) => row.rif },
  { label: "Comprador", width: 115, value: (row) => row.partyName },
  { label: "Factura", width: 58, value: (row) => row.invoiceNumber },
  { label: "Control", width: 54, value: (row) => row.controlNumber },
  { label: "Nota débito", width: 48, value: (row) => row.debitNoteNumber },
  { label: "Nota crédito", width: 48, value: (row) => row.creditNoteNumber },
  { label: "Guía / declaración exportación", width: 62, value: (row) => row.exportDeclarationNumber },
  { label: "Comprobante retención", width: 70, value: (row) => row.retentionReceiptNumber },
  { label: "Factura afectada", width: 54, value: (row) => row.affectedInvoiceNumber },
  { label: "Total con IVA", width: 62, value: (row) => row.totalAmount },
  { label: "Ventas exentas", width: 59, value: (row) => row.exemptAmount },
  { label: "Ventas exoneradas", width: 59, value: (row) => row.exoneratedAmount },
  { label: "Ventas no sujetas", width: 59, value: (row) => row.nonTaxableAmount },
  { label: "Exportación base", width: 56, value: (row) => row.exportSales.base },
  { label: "Exp. %", width: 38, value: (row) => row.exportSales.rate },
  { label: "Exp. IVA", width: 52, value: (row) => row.exportSales.tax },
  { label: "General base", width: 56, value: (row) => row.generalSales.base },
  { label: "Gen. %", width: 38, value: (row) => row.generalSales.rate },
  { label: "Gen. IVA", width: 52, value: (row) => row.generalSales.tax },
  { label: "Reducida base", width: 56, value: (row) => row.reducedSales.base },
  { label: "Red. %", width: 38, value: (row) => row.reducedSales.rate },
  { label: "Red. IVA", width: 52, value: (row) => row.reducedSales.tax },
  { label: "SPE", width: 32, value: (row) => row.specialTaxpayer },
  { label: "% ret.", width: 38, value: (row) => row.retentionPercentage },
  { label: "IVA retenido", width: 58, value: (row) => row.retainedVat },
];

const purchaseColumns: Array<Column<IvaPurchaseBookRow>> = [
  { label: "N° Op.", width: 32, value: (row) => row.operation },
  { label: "Fecha", width: 50, value: (row) => row.date },
  { label: "RIF", width: 60, value: (row) => row.rif },
  { label: "Proveedor", width: 105, value: (row) => row.partyName },
  { label: "Factura", width: 52, value: (row) => row.invoiceNumber },
  { label: "Nota débito", width: 44, value: (row) => row.debitNoteNumber },
  { label: "Nota crédito", width: 44, value: (row) => row.creditNoteNumber },
  { label: "Planilla importación", width: 54, value: (row) => row.importFormNumber },
  { label: "Comprobante retención", width: 60, value: (row) => row.retentionReceiptNumber },
  { label: "Factura afectada", width: 48, value: (row) => row.affectedInvoiceNumber },
  { label: "Total con IVA", width: 56, value: (row) => row.totalAmount },
  { label: "Exentas", width: 50, value: (row) => row.exemptAmount },
  { label: "Exoneradas", width: 50, value: (row) => row.exoneratedAmount },
  { label: "No sujetas", width: 50, value: (row) => row.nonTaxableAmount },
  { label: "Sin derecho a crédito", width: 56, value: (row) => row.noCreditAmount },
  { label: "Imp. general base", width: 52, value: (row) => row.importGeneral.base },
  { label: "Imp. gen. %", width: 34, value: (row) => row.importGeneral.rate },
  { label: "Imp. gen. IVA", width: 48, value: (row) => row.importGeneral.tax },
  { label: "Imp. reducida base", width: 52, value: (row) => row.importReduced.base },
  { label: "Imp. red. %", width: 34, value: (row) => row.importReduced.rate },
  { label: "Imp. red. IVA", width: 48, value: (row) => row.importReduced.tax },
  { label: "Nac. general base", width: 52, value: (row) => row.nationalGeneral.base },
  { label: "Nac. gen. %", width: 34, value: (row) => row.nationalGeneral.rate },
  { label: "Nac. gen. IVA", width: 48, value: (row) => row.nationalGeneral.tax },
  { label: "Nac. reducida base", width: 52, value: (row) => row.nationalReduced.base },
  { label: "Nac. red. %", width: 34, value: (row) => row.nationalReduced.rate },
  { label: "Nac. red. IVA", width: 48, value: (row) => row.nationalReduced.tax },
  { label: "SPE", width: 30, value: (row) => row.specialTaxpayer },
  { label: "% ret.", width: 34, value: (row) => row.retentionPercentage },
  { label: "IVA retenido", width: 52, value: (row) => row.retainedVat },
];

function cleanText(value: string) {
  return value.replace(/[\u2013\u2014]/g, "-").replace(/[^\x20-\x7E\xA0-\xFF]/g, " ");
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

function truncate(value: string, font: PDFFont, size: number, width: number) {
  const clean = cleanText(value || "-");
  if (font.widthOfTextAtSize(clean, size) <= width) return clean;
  let result = clean;
  while (result.length > 1 && font.widthOfTextAtSize(`${result}...`, size) > width) result = result.slice(0, -1);
  return `${result}...`;
}

function drawCell(page: PDFPage, value: CellValue, x: number, y: number, width: number, height: number, font: PDFFont, options?: { bold?: PDFFont; header?: boolean; numeric?: boolean }) {
  page.drawRectangle({
    x,
    y,
    width,
    height,
    color: options?.header ? rgb(0.56, 0.76, 0.94) : rgb(1, 1, 1),
    borderColor: rgb(0.18, 0.18, 0.18),
    borderWidth: 0.45,
  });
  const text = typeof value === "number" ? formatNumber(value) : value || "-";
  const size = options?.header ? 5.2 : 5.1;
  const drawFont = options?.header && options.bold ? options.bold : font;
  const clipped = truncate(text, drawFont, size, width - 4);
  const textWidth = drawFont.widthOfTextAtSize(clipped, size);
  page.drawText(clipped, {
    x: options?.numeric || typeof value === "number" ? x + width - textWidth - 2 : x + 2,
    y: y + height / 2 - 2,
    size,
    font: drawFont,
    color: rgb(0.08, 0.08, 0.08),
  });
}

function wrap(value: string, font: PDFFont, size: number, width: number) {
  const words = cleanText(value).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (!current || font.widthOfTextAtSize(next, size) <= width) current = next;
    else { lines.push(current); current = word; }
  }
  if (current) lines.push(current);
  return lines;
}

function drawBookHeader(page: PDFPage, snapshot: IvaFiscalBookSnapshot, title: string, regular: PDFFont, bold: PDFFont) {
  const width = page.getWidth();
  page.drawText(cleanText(snapshot.company.legalName), { x: 24, y: page.getHeight() - 26, size: 10, font: bold });
  page.drawText(`RIF: ${cleanText(snapshot.company.rif)}`, { x: 24, y: page.getHeight() - 39, size: 7, font: regular });
  page.drawText(cleanText(snapshot.company.fiscalAddress || "Dirección fiscal no registrada"), { x: 24, y: page.getHeight() - 50, size: 6.5, font: regular });
  const titleWidth = bold.widthOfTextAtSize(title, 12);
  page.drawText(title, { x: (width - titleWidth) / 2, y: page.getHeight() - 31, size: 12, font: bold });
  const period = `CORRESPONDIENTE A ${cleanText(snapshot.periodLabel.toLocaleUpperCase("es"))}`;
  page.drawText(period, { x: (width - bold.widthOfTextAtSize(period, 8)) / 2, y: page.getHeight() - 44, size: 8, font: bold });
  page.drawText(`Referencia: ${cleanText(snapshot.source.model)} | Regla v${snapshot.source.ruleVersion}`, { x: 24, y: page.getHeight() - 63, size: 5.5, font: regular, color: rgb(0.35, 0.35, 0.35) });
}

function drawSummaryPage(pdf: PDFDocument, snapshot: IvaFiscalBookSnapshot, regular: PDFFont, bold: PDFFont) {
  const page = pdf.addPage([841.89, 595.28]);
  drawBookHeader(page, snapshot, "RESUMEN DEL PERÍODO DE IMPOSICIÓN", regular, bold);
  const leftRows: Array<[string, number, number]> = [
    ["Ventas internas gravadas por alícuota general", snapshot.summary.sales.general.base, snapshot.summary.sales.general.tax],
    ["Ventas internas gravadas por alícuota reducida", snapshot.summary.sales.reduced.base, snapshot.summary.sales.reduced.tax],
    ["Ventas internas gravadas por alícuota general más adicional", snapshot.summary.sales.additional.base, snapshot.summary.sales.additional.tax],
    ["Ventas internas no gravadas", snapshot.summary.sales.exemptAmount + snapshot.summary.sales.exoneratedAmount + snapshot.summary.sales.nonTaxableAmount, 0],
    ["Ventas internas exentas", snapshot.summary.sales.exemptAmount, 0],
    ["Ventas internas exoneradas", snapshot.summary.sales.exoneratedAmount, 0],
    ["Ventas internas no sujetas", snapshot.summary.sales.nonTaxableAmount, 0],
    ["Ventas de exportación", snapshot.summary.sales.exportAmount, 0],
    ["Total ventas y débitos fiscales del período", snapshot.summary.sales.totalBase, snapshot.summary.sales.totalDebit],
  ];
  const rightRows: Array<[string, number, number]> = [
    ["Compras nacionales no gravadas y/o sin derecho a crédito fiscal", snapshot.summary.purchases.noCreditAmount, 0],
    ["Compras nacionales exentas", snapshot.summary.purchases.exemptAmount, 0],
    ["Compras nacionales exoneradas", snapshot.summary.purchases.exoneratedAmount, 0],
    ["Compras nacionales no sujetas", snapshot.summary.purchases.nonTaxableAmount, 0],
    ["Compras nacionales gravadas por alícuota general", snapshot.summary.purchases.nationalGeneral.base, snapshot.summary.purchases.nationalGeneral.tax],
    ["Compras nacionales gravadas por alícuota reducida", snapshot.summary.purchases.nationalReduced.base, snapshot.summary.purchases.nationalReduced.tax],
    ["Compras nacionales gravadas por alícuota general más adicional", snapshot.summary.purchases.nationalAdditional.base, snapshot.summary.purchases.nationalAdditional.tax],
    ["Compras de importación gravadas", snapshot.summary.purchases.importGeneral.base + snapshot.summary.purchases.importReduced.base + snapshot.summary.purchases.importAdditional.base, snapshot.summary.purchases.importGeneral.tax + snapshot.summary.purchases.importReduced.tax + snapshot.summary.purchases.importAdditional.tax],
    ["Total compras y créditos fiscales del período", snapshot.summary.purchases.totalBase, snapshot.summary.purchases.totalCredit],
  ];
  const startY = 500;
  const blockWidth = 390;
  const labelWidth = 245;
  for (const [blockX, heading, rows] of [[24, "Resumen de débitos fiscales", leftRows], [427, "Resumen de créditos fiscales", rightRows]] as const) {
    drawCell(page, heading, blockX, startY, labelWidth, 24, regular, { header: true, bold });
    drawCell(page, "Base imponible", blockX + labelWidth, startY, 72, 24, regular, { header: true, bold });
    drawCell(page, heading.includes("débitos") ? "Débito fiscal" : "Crédito fiscal", blockX + labelWidth + 72, startY, 73, 24, regular, { header: true, bold });
    rows.forEach(([label, base, tax], index) => {
      const y = startY - (index + 1) * 24;
      drawCell(page, label, blockX, y, labelWidth, 24, regular, index === rows.length - 1 ? { header: true, bold } : undefined);
      drawCell(page, base, blockX + labelWidth, y, 72, 24, regular, { numeric: true, ...(index === rows.length - 1 ? { header: true, bold } : {}) });
      drawCell(page, tax, blockX + labelWidth + 72, y, 73, 24, regular, { numeric: true, ...(index === rows.length - 1 ? { header: true, bold } : {}) });
    });
    page.drawRectangle({ x: blockX, y: startY - rows.length * 24, width: blockWidth, height: (rows.length + 1) * 24, borderWidth: 0.8, borderColor: rgb(0.08, 0.08, 0.08) });
  }
  let warningY = 238;
  page.drawText("Observaciones de completitud", { x: 24, y: warningY, size: 8, font: bold });
  warningY -= 13;
  snapshot.warnings.forEach((warning) => {
    const lines = wrap(`- ${warning}`, regular, 6.5, 790);
    lines.forEach((line) => { page.drawText(line, { x: 24, y: warningY, size: 6.5, font: regular, color: rgb(0.35, 0.35, 0.35) }); warningY -= 9; });
  });
}

export async function generateIvaFiscalBookPdf(snapshot: IvaFiscalBookSnapshot, kind: IvaFiscalBookKind) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const rows = kind === "SALES" ? snapshot.sales : snapshot.purchases;
  const columns = kind === "SALES" ? salesColumns : purchaseColumns;
  const title = kind === "SALES" ? "LIBRO DE VENTAS" : "LIBRO DE COMPRAS";
  const pageSize: [number, number] = [1190.55, 841.89];
  const tableWidth = columns.reduce((total, column) => total + column.width, 0);
  const scale = Math.min(1, (pageSize[0] - 48) / tableWidth);
  const scaledColumns = columns.map((column) => ({ ...column, width: column.width * scale }));
  const rowHeight = 18;
  const headerHeight = 30;
  const rowsPerPage = 37;
  const pages = Math.max(1, Math.ceil(rows.length / rowsPerPage));
  for (let pageIndex = 0; pageIndex < pages; pageIndex += 1) {
    const page = pdf.addPage(pageSize);
    drawBookHeader(page, snapshot, title, regular, bold);
    let x = 24;
    const headerY = page.getHeight() - 104;
    scaledColumns.forEach((column) => {
      drawCell(page, column.label, x, headerY, column.width, headerHeight, regular, { header: true, bold });
      x += column.width;
    });
    const pageRows = rows.slice(pageIndex * rowsPerPage, (pageIndex + 1) * rowsPerPage);
    pageRows.forEach((row, rowIndex) => {
      let rowX = 24;
      const y = headerY - (rowIndex + 1) * rowHeight;
      scaledColumns.forEach((column) => {
        const value = column.value(row as never);
        drawCell(page, value, rowX, y, column.width, rowHeight, regular, { numeric: typeof value === "number" });
        rowX += column.width;
      });
    });
    page.drawText(`Página ${pageIndex + 1} de ${pages + 1}`, { x: page.getWidth() - 92, y: 16, size: 6.5, font: regular, color: rgb(0.4, 0.4, 0.4) });
  }
  drawSummaryPage(pdf, snapshot, regular, bold);
  const allPages = pdf.getPages();
  const summaryPage = allPages[allPages.length - 1];
  summaryPage.drawText(`Página ${allPages.length} de ${allPages.length}`, { x: summaryPage.getWidth() - 92, y: 16, size: 6.5, font: regular, color: rgb(0.4, 0.4, 0.4) });
  pdf.setTitle(`${title} - ${snapshot.company.legalName} - ${snapshot.periodLabel}`);
  pdf.setSubject("Libro fiscal preliminar/final generado desde la declaración de IVA");
  pdf.setCreator("proyectoxyz");
  return new Uint8Array(await pdf.save());
}

function xml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function columnName(index: number) {
  let value = index + 1;
  let result = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }
  return result;
}

function cell(address: string, value: CellValue, style = 0) {
  return typeof value === "number"
    ? `<c r="${address}" s="${style}"><v>${Number.isFinite(value) ? value : 0}</v></c>`
    : `<c r="${address}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xml(value || "-")}</t></is></c>`;
}

function worksheetXml<Row>(snapshot: IvaFiscalBookSnapshot, title: string, columns: Array<Column<Row>>, rows: Row[]) {
  const lastColumn = columnName(columns.length - 1);
  const sheetRows: string[] = [];
  const titleRows: Array<[string, number]> = [
    [snapshot.company.legalName, 1],
    [`RIF: ${snapshot.company.rif}`, 2],
    [snapshot.company.fiscalAddress || "Dirección fiscal no registrada", 3],
    [title, 5],
    [`CORRESPONDIENTE A ${snapshot.periodLabel.toLocaleUpperCase("es")}`, 6],
    [`Referencia: ${snapshot.source.model} | Regla v${snapshot.source.ruleVersion}`, 7],
  ];
  titleRows.forEach(([value, row]) => sheetRows.push(`<row r="${row}">${cell(`A${row}`, value, row === 5 ? 1 : 0)}</row>`));
  sheetRows.push(`<row r="9" ht="45" customHeight="1">${columns.map((column, index) => cell(`${columnName(index)}9`, column.label, 2)).join("")}</row>`);
  rows.forEach((row, rowIndex) => {
    const current = rowIndex + 10;
    sheetRows.push(`<row r="${current}">${columns.map((column, colIndex) => {
      const value = column.value(row);
      return cell(`${columnName(colIndex)}${current}`, value, typeof value === "number" ? 3 : 0);
    }).join("")}</row>`);
  });
  const totalRow = rows.length + 10;
  sheetRows.push(`<row r="${totalRow}">${cell(`A${totalRow}`, "Total general", 2)}${columns.slice(1).map((column, index) => {
    const values = rows.map(column.value);
    const numeric = values.every((value) => typeof value === "number");
    const shouldTotal = numeric && !column.label.includes("%") && !column.label.startsWith("NÂ°");
    return cell(`${columnName(index + 1)}${totalRow}`, shouldTotal ? (values as number[]).reduce((total, value) => total + value, 0) : "", shouldTotal ? 4 : 2);
  }).join("")}</row>`);
  const merges = titleRows.map(([, row]) => `<mergeCell ref="A${row}:${lastColumn}${row}"/>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView showGridLines="0" workbookViewId="0"><pane ySplit="9" topLeftCell="A10" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${columns.map((column, index) => `<col min="${index + 1}" max="${index + 1}" width="${Math.max(8, Math.min(28, column.width / 6))}" customWidth="1"/>`).join("")}</cols><sheetData>${sheetRows.join("")}</sheetData><mergeCells count="${titleRows.length}">${merges}</mergeCells><autoFilter ref="A9:${lastColumn}${Math.max(9, totalRow - 1)}"/><pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0" paperSize="8"/><pageMargins left="0.25" right="0.25" top="0.4" bottom="0.4" header="0.2" footer="0.2"/></worksheet>`;
}

function summaryWorksheetXml(summary: IvaBookSummary) {
  const salesRows: Array<[string, number, number]> = [
    ["Ventas internas gravadas por alícuota general", summary.sales.general.base, summary.sales.general.tax],
    ["Ventas internas gravadas por alícuota reducida", summary.sales.reduced.base, summary.sales.reduced.tax],
    ["Ventas internas gravadas por alícuota general más adicional", summary.sales.additional.base, summary.sales.additional.tax],
    ["Ventas internas no gravadas", summary.sales.exemptAmount + summary.sales.exoneratedAmount + summary.sales.nonTaxableAmount, 0],
    ["Ventas internas exentas", summary.sales.exemptAmount, 0],
    ["Ventas internas exoneradas", summary.sales.exoneratedAmount, 0],
    ["Ventas internas no sujetas", summary.sales.nonTaxableAmount, 0],
    ["Ventas de exportación", summary.sales.exportAmount, 0],
    ["Total ventas y débitos fiscales del período", summary.sales.totalBase, summary.sales.totalDebit],
  ];
  const purchaseRows: Array<[string, number, number]> = [
    ["Compras nacionales no gravadas y/o sin derecho a crédito fiscal", summary.purchases.noCreditAmount, 0],
    ["Compras nacionales exentas", summary.purchases.exemptAmount, 0],
    ["Compras nacionales exoneradas", summary.purchases.exoneratedAmount, 0],
    ["Compras nacionales no sujetas", summary.purchases.nonTaxableAmount, 0],
    ["Compras nacionales gravadas por alícuota general", summary.purchases.nationalGeneral.base, summary.purchases.nationalGeneral.tax],
    ["Compras nacionales gravadas por alícuota reducida", summary.purchases.nationalReduced.base, summary.purchases.nationalReduced.tax],
    ["Compras nacionales gravadas por alícuota general más adicional", summary.purchases.nationalAdditional.base, summary.purchases.nationalAdditional.tax],
    ["Compras de importación gravadas", summary.purchases.importGeneral.base + summary.purchases.importReduced.base + summary.purchases.importAdditional.base, summary.purchases.importGeneral.tax + summary.purchases.importReduced.tax + summary.purchases.importAdditional.tax],
    ["Total compras y créditos fiscales del período", summary.purchases.totalBase, summary.purchases.totalCredit],
  ];
  const rows: string[] = [
    `<row r="1">${cell("A1", "RESUMEN DEL PERÍODO DE IMPOSICIÓN", 1)}</row>`,
    `<row r="2">${cell("A2", "Resumen de débitos fiscales", 2)}${cell("B2", "Base imponible", 2)}${cell("C2", "Débito fiscal", 2)}${cell("D2", "Resumen de créditos fiscales", 2)}${cell("E2", "Base imponible", 2)}${cell("F2", "Crédito fiscal", 2)}</row>`,
  ];
  const maxRows = Math.max(salesRows.length, purchaseRows.length);
  for (let index = 0; index < maxRows; index += 1) {
    const row = index + 3;
    const sale = salesRows[index] ?? ["", 0, 0];
    const purchase = purchaseRows[index] ?? ["", 0, 0];
    const totalStyle = index === maxRows - 1 ? 2 : 0;
    rows.push(`<row r="${row}">${cell(`A${row}`, sale[0], totalStyle)}${cell(`B${row}`, sale[1], totalStyle ? 4 : 3)}${cell(`C${row}`, sale[2], totalStyle ? 4 : 3)}${cell(`D${row}`, purchase[0], totalStyle)}${cell(`E${row}`, purchase[1], totalStyle ? 4 : 3)}${cell(`F${row}`, purchase[2], totalStyle ? 4 : 3)}</row>`);
  }
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView showGridLines="0" workbookViewId="0"/></sheetViews><cols><col min="1" max="1" width="54" customWidth="1"/><col min="2" max="3" width="18" customWidth="1"/><col min="4" max="4" width="62" customWidth="1"/><col min="5" max="6" width="18" customWidth="1"/></cols><sheetData>${rows.join("")}</sheetData><mergeCells count="1"><mergeCell ref="A1:F1"/></mergeCells><pageSetup orientation="landscape" fitToWidth="1" fitToHeight="1" paperSize="9"/></worksheet>`;
}

export function generateIvaFiscalBookXlsx(snapshot: IvaFiscalBookSnapshot, kind: IvaFiscalBookKind) {
  const isSales = kind === "SALES";
  const title = isSales ? "LIBRO DE VENTAS" : "LIBRO DE COMPRAS";
  const sheetName = isSales ? "VENTAS" : "COMPRAS";
  const bookXml = isSales
    ? worksheetXml(snapshot, title, salesColumns, snapshot.sales)
    : worksheetXml(snapshot, title, purchaseColumns, snapshot.purchases);
  const files: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`),
    "_rels/.rels": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`),
    "docProps/app.xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>proyectoxyz</Application></Properties>`),
    "docProps/core.xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/"><dc:title>${xml(title)}</dc:title><dc:creator>proyectoxyz</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">${xml(snapshot.generatedAt)}</dcterms:created></cp:coreProperties>`),
    "xl/workbook.xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${sheetName}" sheetId="1" r:id="rId1"/><sheet name="RESUMEN" sheetId="2" r:id="rId2"/></sheets></workbook>`),
    "xl/_rels/workbook.xml.rels": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`),
    "xl/styles.xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,#0.00"/></numFmts><fonts count="2"><font><sz val="10"/><name val="Arial"/></font><font><b/><sz val="10"/><name val="Arial"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF8FC2F2"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border/><border><left style="thin"/><right style="thin"/><top style="thin"/><bottom style="thin"/></border></borders><cellXfs count="5"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" alignment="center"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="164" fontId="0" fillId="0" borderId="1" applyNumberFormat="1"/><xf numFmtId="164" fontId="1" fillId="2" borderId="1" applyNumberFormat="1"/></cellXfs></styleSheet>`),
    "xl/worksheets/sheet1.xml": strToU8(bookXml),
    "xl/worksheets/sheet2.xml": strToU8(summaryWorksheetXml(snapshot.summary)),
  };
  return zipSync(files, { level: 6 });
}
