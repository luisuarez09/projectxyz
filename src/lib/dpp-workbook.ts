import { strToU8, zipSync } from "fflate";

export type DppWorkbookEmployee = {
  identity: string;
  name: string;
  startedAt: string;
};

type DppWorkbookInput = {
  closingDateLabel: string;
  companyName: string;
  companyRif: string;
  employees: DppWorkbookEmployee[];
  indexedIncome: number;
  periodLabel: string;
  rate: number;
};

function xmlEscape(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function inlineCell(reference: string, value: string, style = 0) {
  return `<c r="${reference}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`;
}

function numberCell(reference: string, value: number, style = 0) {
  return `<c r="${reference}" s="${style}"><v>${Number.isFinite(value) ? value : 0}</v></c>`;
}

function formulaCell(reference: string, formula: string, value: number, style = 0) {
  return `<c r="${reference}" s="${style}"><f>${xmlEscape(formula)}</f><v>${Number.isFinite(value) ? value : 0}</v></c>`;
}

function rowXml(row: number, cells: string[], height?: number) {
  const sizing = height ? ` ht="${height}" customHeight="1"` : "";
  return `<row r="${row}"${sizing}>${cells.join("")}</row>`;
}

function excelSerial(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return Math.round((Date.UTC(year, month - 1, day) - Date.UTC(1899, 11, 30)) / 86_400_000);
}

function worksheetXml(input: DppWorkbookInput) {
  const dataStart = 10;
  const dataEnd = dataStart + input.employees.length - 1;
  const totalRow = dataEnd + 3;
  const rows: string[] = [
    rowXml(1, [inlineCell("A1", input.companyName.toUpperCase(), 1)], 22),
    rowXml(2, [inlineCell("A2", input.companyRif, 1)], 20),
    rowXml(3, [inlineCell("A3", "CALCULO CONTRIBUCION ESPECIAL LEY DE PENSIONES DE SEGURIDAD SOCIAL", 1)], 22),
    rowXml(4, [inlineCell("A4", input.periodLabel.toUpperCase(), 1)], 20),
    rowXml(5, []),
    rowXml(6, []),
  ];

  const headerRow7 = [
    "Nro.",
    "RIF",
    "Nombre y Apellido",
    "Fecha de ingreso",
    "",
    "Ingreso minimo indexado",
    "",
    "",
    "Total base imponible",
    "Alicuota",
    "Monto a pagar",
  ].map((value, column) => inlineCell(`${String.fromCharCode(65 + column)}7`, value, 2));
  const headerRow8 = [
    "",
    "",
    "",
    "",
    "",
    "Monto en USD",
    `Tasa de cambio BCV (${input.closingDateLabel})`,
    "Monto en BS",
    "",
    "",
    "",
  ].map((value, column) => inlineCell(`${String.fromCharCode(65 + column)}8`, value, 2));
  rows.push(rowXml(7, headerRow7, 28), rowXml(8, headerRow8, 34), rowXml(9, []));

  input.employees.forEach((employee, index) => {
    const row = dataStart + index;
    const base = input.indexedIncome * input.rate;
    const tax = base * 0.09;
    rows.push(
      rowXml(row, [
        numberCell(`A${row}`, index + 1, 4),
        inlineCell(`B${row}`, employee.identity, 3),
        inlineCell(`C${row}`, employee.name.toUpperCase(), 3),
        numberCell(`D${row}`, excelSerial(employee.startedAt), 9),
        inlineCell(`E${row}`, "", 3),
        numberCell(`F${row}`, input.indexedIncome, 5),
        numberCell(`G${row}`, input.rate, 6),
        formulaCell(`H${row}`, `F${row}*G${row}`, base, 7),
        formulaCell(`I${row}`, `H${row}`, base, 7),
        numberCell(`J${row}`, 0.09, 8),
        formulaCell(`K${row}`, `I${row}*J${row}`, tax, 7),
      ], 22),
    );
  });

  const total = input.employees.length * input.indexedIncome * input.rate * 0.09;
  rows.push(
    rowXml(dataEnd + 1, []),
    rowXml(dataEnd + 2, []),
    rowXml(totalRow, [
      inlineCell(`I${totalRow}`, "Total a pagar", 10),
      inlineCell(`J${totalRow}`, "", 10),
      formulaCell(`K${totalRow}`, `SUM(K${dataStart}:K${dataEnd})`, total, 11),
    ], 24),
  );

  const merges = [
    "A1:K1",
    "A2:K2",
    "A3:K3",
    "A4:K4",
    "A7:A8",
    "B7:B8",
    "C7:C8",
    "D7:E8",
    "F7:H7",
    "I7:I8",
    "J7:J8",
    "K7:K8",
    `I${totalRow}:J${totalRow}`,
  ];

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:K${totalRow}"/>
  <sheetViews><sheetView workbookViewId="0" showGridLines="0"/></sheetViews>
  <sheetFormatPr defaultRowHeight="15"/>
  <cols>
    <col min="1" max="1" width="7" customWidth="1"/>
    <col min="2" max="2" width="16" customWidth="1"/>
    <col min="3" max="3" width="42" customWidth="1"/>
    <col min="4" max="4" width="14" customWidth="1"/>
    <col min="5" max="5" width="2" customWidth="1"/>
    <col min="6" max="6" width="15" customWidth="1"/>
    <col min="7" max="7" width="20" customWidth="1"/>
    <col min="8" max="9" width="18" customWidth="1"/>
    <col min="10" max="10" width="11" customWidth="1"/>
    <col min="11" max="11" width="17" customWidth="1"/>
  </cols>
  <sheetData>${rows.join("")}</sheetData>
  <mergeCells count="${merges.length}">${merges.map((reference) => `<mergeCell ref="${reference}"/>`).join("")}</mergeCells>
  <pageMargins left="0.35" right="0.35" top="0.45" bottom="0.45" header="0.2" footer="0.2"/>
  <pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="1"/>
</worksheet>`;
}

const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="4">
    <numFmt numFmtId="164" formatCode="&quot;$&quot;#,##0.00"/>
    <numFmt numFmtId="165" formatCode="0.00000"/>
    <numFmt numFmtId="166" formatCode="#,##0.00"/>
    <numFmt numFmtId="167" formatCode="dd/mm/yyyy"/>
  </numFmts>
  <fonts count="3">
    <font><sz val="11"/><name val="Aptos"/><family val="2"/></font>
    <font><b/><sz val="11"/><name val="Aptos"/><family val="2"/></font>
    <font><b/><sz val="12"/><name val="Aptos"/><family val="2"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFD9D9D9"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="3">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FF57534E"/></left>
      <right style="thin"><color rgb="FF57534E"/></right>
      <top style="thin"><color rgb="FF57534E"/></top>
      <bottom style="thin"><color rgb="FF57534E"/></bottom>
      <diagonal/>
    </border>
    <border>
      <left/><right/>
      <top style="thin"><color rgb="FF57534E"/></top>
      <bottom style="double"><color rgb="FF57534E"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="12">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="166" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="9" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="167" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="2" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="166" fontId="1" fillId="0" borderId="2" xfId="0" applyFont="1" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
  <dxfs count="0"/>
  <tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/>
</styleSheet>`;

export function createDppWorkbookBlob(input: DppWorkbookInput) {
  const createdAt = new Date().toISOString();
  const files: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`),
    "_rels/.rels": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`),
    "docProps/core.xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${xmlEscape(`Relación DPP ${input.periodLabel}`)}</dc:title>
  <dc:subject>Cálculo de la contribución especial de protección a las pensiones</dc:subject>
  <dc:creator>proyectoxyz</dc:creator>
  <cp:lastModifiedBy>proyectoxyz</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${createdAt}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${createdAt}</dcterms:modified>
</cp:coreProperties>`),
    "docProps/app.xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>proyectoxyz</Application>
  <Company>${xmlEscape(input.companyName)}</Company>
</Properties>`),
    "xl/workbook.xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <bookViews><workbookView xWindow="0" yWindow="0" windowWidth="24000" windowHeight="12000"/></bookViews>
  <sheets><sheet name="${xmlEscape(input.periodLabel.toUpperCase().slice(0, 31))}" sheetId="1" r:id="rId1"/></sheets>
  <calcPr calcId="191029" calcMode="auto" fullCalcOnLoad="1" forceFullCalc="1"/>
</workbook>`),
    "xl/_rels/workbook.xml.rels": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`),
    "xl/styles.xml": strToU8(stylesXml),
    "xl/worksheets/sheet1.xml": strToU8(worksheetXml(input)),
  };
  const zipped = zipSync(files, { level: 6 });
  const output = new Uint8Array(zipped.byteLength);
  output.set(zipped);
  return new Blob([output.buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
