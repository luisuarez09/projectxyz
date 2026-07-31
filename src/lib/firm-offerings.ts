export type FirmOffering = {
  id: string;
  name: string;
  organism: string;
  cadence: string;
};

// Catálogo demostrativo compartido por la configuración de la firma y de la empresa.
// La persistencia deberá reemplazar estas listas por las ofertas activas de la firma.
export const firmTaxOfferings: FirmOffering[] = [
  { id: "iva", name: "IVA", organism: "SENIAT", cadence: "Mensual" },
  { id: "ret-iva", name: "Retenciones de IVA", organism: "SENIAT", cadence: "Mensual" },
  { id: "ret-islr", name: "Retenciones de ISLR", organism: "SENIAT", cadence: "Mensual" },
  { id: "municipal", name: "Impuesto municipal", organism: "Alcaldía aplicable", cadence: "Mensual" },
  { id: "ivss", name: "IVSS", organism: "IVSS", cadence: "Mensual" },
  { id: "inces", name: "INCES", organism: "INCES", cadence: "Trimestral" },
  { id: "faov", name: "FAOV", organism: "BANAVIH", cadence: "Mensual" },
];

export const firmServiceOfferings: FirmOffering[] = [
  { id: "electricidad", name: "Electricidad", organism: "Prestador eléctrico", cadence: "Según factura" },
  { id: "agua", name: "Agua", organism: "Prestador de agua", cadence: "Según factura" },
  { id: "gas", name: "Gas", organism: "Prestador de gas", cadence: "Según factura" },
];
