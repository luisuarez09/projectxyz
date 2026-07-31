export type SpeCalendarRow = {
  rif: string;
  dates: Record<string, string>;
};

export type SpeCalendarMatrix = {
  id: string;
  groupId: string;
  label: string;
  shortLabel: string;
  cadence: string;
  period: string;
  obligations: string[];
  columns: string[];
  rows: SpeCalendarRow[];
  note?: string;
};

export const speCalendarSource2026 = {
  year: "2026",
  gazette: "Gaceta Oficial N.º 43.283",
  publishedAt: "23 de diciembre de 2025",
  provision: "SNAT/2025/000091",
  issuedAt: "24 de noviembre de 2025",
  note: "Reimpresión por error de imprenta de la publicación inicial en la Gaceta Oficial N.º 43.273.",
};

export const speCalendarGroups = [
  { id: "a-fortnights", label: "IVA, anticipos de ISLR, IGTF y retenciones de IVA", matrixIds: ["a1-first-half", "a2-second-half"] },
  { id: "b-estimated-islr", label: "Estimadas de ISLR", matrixIds: ["b-estimated-islr"] },
  { id: "c-islr-withholdings", label: "Retenciones de ISLR", matrixIds: ["c-islr-withholdings"] },
  { id: "f-annual-islr", label: "Autoliquidación anual de ISLR", matrixIds: ["f-annual-islr"] },
  { id: "g-irregular-islr", label: "ISLR de ejercicios irregulares", matrixIds: ["g-irregular-islr"] },
  { id: "h-large-assets", label: "Impuesto a los Grandes Patrimonios", matrixIds: ["h-large-assets"] },
] as const;

const monthColumns = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

export const speCalendarMatrices2026: SpeCalendarMatrix[] = [
  {
    id: "a1-first-half",
    groupId: "a-fortnights",
    label: "IVA, anticipos de ISLR, IGTF y retenciones de IVA",
    shortLabel: "1ra quincena",
    cadence: "Quincenal",
    period: "Operaciones entre los días 01 y 15 de cada mes",
    obligations: ["IVA", "Anticipos de ISLR", "IGTF", "Retenciones de IVA"],
    columns: ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"],
    rows: rowsByDigit([
      ["0", "28", "20", "25", "23", "20", "29", "27", "31", "29", "20", "27", "16"],
      ["1", "19", "23", "20", "27", "18", "26", "21", "25", "18", "28", "26", "29"],
      ["2", "21", "18", "24", "21", "29", "16", "30", "24", "24", "29", "17", "21"],
      ["3", "30", "18", "23", "30", "22", "18", "23", "18", "21", "23", "23", "28"],
      ["4", "23", "25", "26", "20", "21", "19", "28", "19", "30", "22", "20", "22"],
      ["5", "22", "27", "30", "22", "28", "17", "22", "21", "25", "30", "18", "17"],
      ["6", "20", "19", "27", "24", "19", "30", "20", "28", "28", "21", "25", "18"],
      ["7", "27", "24", "18", "17", "26", "22", "31", "20", "22", "27", "19", "18"],
      ["8", "26", "26", "31", "29", "27", "23", "17", "26", "17", "26", "24", "30"],
      ["9", "29", "27", "17", "28", "25", "25", "29", "27", "23", "19", "30", "23"],
    ]),
  },
  {
    id: "a2-second-half",
    groupId: "a-fortnights",
    label: "IVA, anticipos de ISLR, IGTF y retenciones de IVA",
    shortLabel: "2da quincena",
    cadence: "Quincenal",
    period: "Operaciones entre los días 16 y el último de cada mes",
    obligations: ["IVA", "Anticipos de ISLR", "IGTF", "Retenciones de IVA"],
    columns: ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"],
    rows: rowsByDigit([
      ["0", "15", "09", "06", "01", "06", "12", "08", "14", "14", "05", "13", "03"],
      ["1", "06", "10", "03", "14", "04", "11", "03", "13", "03", "14", "12", "15"],
      ["2", "08", "05", "09", "08", "14", "03", "14", "12", "10", "15", "02", "04"],
      ["3", "16", "12", "04", "16", "07", "10", "07", "05", "02", "07", "09", "11"],
      ["4", "09", "02", "11", "07", "13", "02", "10", "06", "09", "06", "05", "07"],
      ["5", "05", "13", "12", "09", "15", "08", "06", "03", "15", "08", "04", "10"],
      ["6", "13", "04", "10", "13", "05", "15", "09", "04", "11", "02", "11", "08"],
      ["7", "12", "11", "02", "06", "11", "04", "15", "10", "04", "13", "03", "02"],
      ["8", "07", "03", "13", "10", "12", "05", "02", "07", "08", "09", "06", "09"],
      ["9", "14", "06", "05", "15", "08", "09", "13", "11", "07", "01", "10", "14"],
    ]),
  },
  monthlyMatrix("b-estimated-islr", "b-estimated-islr", "Estimadas de ISLR", "Estimadas ISLR", "Mensual", [
    ["0 y 8", "15", "09", "13", "10", "12", "12", "08", "14", "08", "09", "13", "09"],
    ["1 y 4", "09", "10", "11", "14", "13", "11", "10", "13", "09", "14", "12", "15"],
    ["2 y 3", "08", "12", "09", "08", "14", "10", "14", "12", "10", "15", "09", "11"],
    ["5 y 9", "14", "13", "12", "09", "15", "09", "13", "11", "15", "08", "10", "10"],
    ["6 y 7", "13", "11", "10", "13", "11", "15", "09", "10", "11", "13", "11", "08"],
  ]),
  monthlyMatrix("c-islr-withholdings", "c-islr-withholdings", "Retenciones de Impuesto sobre la Renta", "Retenciones ISLR", "Mensual", [
    ["0 y 8", "15", "09", "06", "10", "12", "05", "08", "07", "08", "09", "06", "09"],
    ["1 y 4", "09", "10", "11", "07", "13", "11", "10", "06", "09", "06", "05", "07"],
    ["2 y 3", "08", "05", "09", "08", "07", "10", "07", "12", "10", "07", "09", "04"],
    ["5 y 9", "14", "06", "05", "09", "08", "09", "06", "11", "07", "08", "10", "10"],
    ["6 y 7", "13", "11", "10", "06", "11", "04", "09", "10", "04", "13", "11", "08"],
  ]),
  {
    id: "f-annual-islr",
    groupId: "f-annual-islr",
    label: "Autoliquidación anual de Impuesto sobre la Renta",
    shortLabel: "ISLR anual",
    cadence: "Anual",
    period: "Ejercicio fiscal 01/01/2025 al 31/12/2025",
    obligations: ["Autoliquidación anual de ISLR"],
    columns: ["FECHA"],
    rows: [
      { rif: "2 y 3", dates: { FECHA: "30/01/2026" } },
      { rif: "5 y 9", dates: { FECHA: "27/02/2026" } },
      { rif: "0 y 8", dates: { FECHA: "06/03/2026" } },
      { rif: "1 y 4", dates: { FECHA: "11/03/2026" } },
      { rif: "6 y 7", dates: { FECHA: "16/03/2026" } },
    ],
  },
  {
    id: "g-irregular-islr",
    groupId: "g-irregular-islr",
    label: "Autoliquidación de ISLR de ejercicios irregulares",
    shortLabel: "ISLR irregular",
    cadence: "Según cierre",
    period: "Ejercicios fiscales irregulares",
    obligations: ["Autoliquidación de ISLR"],
    columns: ["ENE", "FEB", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"],
    rows: rowsWithColumns(["ENE", "FEB", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"], [
      ["0 y 8", "26", "20", "23", "20", "23", "17", "26", "17", "20", "24", "16"],
      ["1 y 4", "23", "23", "27", "21", "19", "21", "25", "18", "22", "20", "22"],
      ["2 y 3", "21", "18", "21", "22", "18", "23", "24", "21", "23", "17", "21"],
      ["5 y 9", "22", "19", "22", "25", "17", "22", "21", "23", "19", "18", "17"],
      ["6 y 7", "27", "24", "24", "19", "22", "20", "20", "22", "21", "19", "18"],
    ]),
    note: "La matriz publicada no incluye una columna MAR; se conserva la estructura exacta de la referencia.",
  },
  {
    id: "h-large-assets",
    groupId: "h-large-assets",
    label: "Impuesto a los Grandes Patrimonios",
    shortLabel: "Grandes patrimonios",
    cadence: "Anual",
    period: "Declaración anual 2026",
    obligations: ["Impuesto a los Grandes Patrimonios"],
    columns: ["OCT", "NOV"],
    rows: rowsWithColumns(["OCT", "NOV"], [
      ["0 y 8", "09", "13"], ["1 y 4", "14", "12"], ["2 y 3", "15", "09"], ["5 y 9", "08", "10"], ["6 y 7", "13", "11"],
    ]),
  },
];

function rowsByDigit(values: string[][]) {
  return rowsWithColumns(monthColumns, values);
}

function monthlyMatrix(id: string, groupId: string, label: string, shortLabel: string, cadence: string, values: string[][]): SpeCalendarMatrix {
  return { id, groupId, label, shortLabel, cadence, period: "Calendario mensual 2026", obligations: [label], columns: monthColumns, rows: rowsWithColumns(monthColumns, values) };
}

function rowsWithColumns(columns: string[], values: string[][]): SpeCalendarRow[] {
  return values.map(([rif, ...days]) => ({ rif, dates: Object.fromEntries(columns.map((column, index) => [column, days[index] ?? ""])) }));
}
