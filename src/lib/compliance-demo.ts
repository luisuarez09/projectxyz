export type ComplianceSeverity = "Crítica" | "Alta" | "Media"

export type ComplianceQuestion = {
  id: string
  label: string
  weight: number
  severity: ComplianceSeverity
  source: string
  applicability?: string
}

export type ComplianceSection = {
  id: string
  title: string
  shortTitle: string
  description: string
  questions: ComplianceQuestion[]
}

const question = (
  id: string,
  label: string,
  source: string,
  weight = 1,
  severity: ComplianceSeverity = "Media",
  applicability?: string,
): ComplianceQuestion => ({ id, label, source, weight, severity, applicability })

export const complianceSections: ComplianceSection[] = [
  {
    id: "generales",
    title: "Datos generales y documentos",
    shortTitle: "Generales",
    description: "Documentos corporativos, permisos, libros y condiciones visibles del establecimiento.",
    questions: [
      question("gen-01", "Copia certificada del acta constitutiva disponible", "Registro mercantil · fuente por validar"),
      question("gen-02", "Copia certificada de la última acta de asamblea disponible", "Registro mercantil · fuente por validar"),
      question("gen-03", "La junta directiva se encuentra vigente", "Documento constitutivo y estatutos · por validar", 2, "Alta"),
      question("gen-04", "El nombramiento del comisario se encuentra vigente", "Código de Comercio · artículo por validar"),
      question("gen-05", "Los estados financieros fueron aprobados por el órgano correspondiente", "Código de Comercio · artículo por validar"),
      question("gen-06", "El capital social registrado coincide con la documentación vigente", "Registro mercantil · fuente por validar"),
      question("gen-07", "El Registro de Información Fiscal (RIF) está vigente y visible", "COT 2020 y normativa SENIAT · artículo por validar", 3, "Crítica"),
      question("gen-08", "El permiso de bomberos está vigente", "Normativa estadal/municipal · según jurisdicción", 2, "Alta"),
      question("gen-09", "El permiso sanitario está vigente", "Normativa sanitaria · según actividad", 2, "Alta", "Sólo actividades sujetas a control sanitario"),
      question("gen-10", "El personal que manipula alimentos posee certificado vigente", "Normativa sanitaria · según actividad", 2, "Alta", "Empresas que manipulan alimentos"),
      question("gen-11", "La empresa conserva la documentación exigible por INPSASEL", "LOPCYMAT y normativa técnica · por validar", 2, "Alta", "Empresas con trabajadores"),
      question("gen-12", "Existe constancia vigente de fumigación y control de plagas", "Normativa sanitaria/municipal · por validar", 1, "Media", "Según actividad económica"),
      question("gen-13", "El medio de facturación utilizado corresponde a las condiciones de la empresa", "Providencias SENIAT de facturación · versión por validar", 3, "Crítica"),
      question("gen-14", "La cartelera fiscal está colocada en un área visible", "Normativa SENIAT · artículo por validar", 2, "Alta"),
      question("gen-15", "Los libros legales obligatorios están disponibles y actualizados", "Código de Comercio · artículos por validar", 2, "Alta"),
      question("gen-16", "El libro auxiliar de compras está actualizado", "Normativa IVA · artículo por validar", 3, "Crítica", "Contribuyentes sujetos a IVA"),
      question("gen-17", "El libro auxiliar de ventas está actualizado", "Normativa IVA · artículo por validar", 3, "Crítica", "Contribuyentes sujetos a IVA"),
      question("gen-18", "El libro diario se encuentra actualizado", "Código de Comercio · artículos por validar", 2, "Alta"),
      question("gen-19", "El libro mayor se encuentra actualizado", "Código de Comercio · artículos por validar"),
      question("gen-20", "El libro de inventarios y balances se encuentra actualizado", "Código de Comercio · artículos por validar", 2, "Alta"),
      question("gen-21", "El libro de accionistas se encuentra actualizado", "Código de Comercio · según tipo societario"),
      question("gen-22", "El libro de asambleas se encuentra actualizado", "Código de Comercio · según tipo societario"),
      question("gen-23", "El libro de junta directiva se encuentra actualizado", "Estatutos y Código de Comercio · por validar"),
      question("gen-24", "La empresa está inscrita en los registros de precios aplicables", "Normativa comercial/SUNDDE · aplicabilidad por validar", 1, "Media", "Según actividad y régimen vigente"),
      question("gen-25", "El registro RUPDAE está vigente cuando corresponde", "Normativa comercial · vigencia y aplicabilidad por validar", 1, "Media", "Según actividad y régimen vigente"),
      question("gen-26", "La tasa de cambio BCV utilizada se informa de forma visible", "Normativa comercial y cambiaria · por validar", 2, "Alta", "Empresas que exhiben precios o cobran en divisas"),
      question("gen-27", "Los precios están marcados de forma visible", "Normativa de protección al consumidor · por validar"),
      question("gen-28", "La empresa conserva una estructura de costos para la fijación de precios", "Normativa comercial · por validar", 1, "Media", "Según actividad y régimen vigente"),
    ],
  },
  {
    id: "municipales",
    title: "Tributos y permisos municipales",
    shortTitle: "Municipales",
    description: "Licencia, declaraciones, solvencias y obligaciones según el municipio de la empresa.",
    questions: [
      question("mun-01", "La empresa está inscrita ante la administración tributaria municipal", "Ordenanza municipal vigente · cargar por jurisdicción", 3, "Crítica"),
      question("mun-02", "La licencia de actividades económicas está vigente", "Ordenanza municipal vigente · cargar por jurisdicción", 3, "Crítica"),
      question("mun-03", "La solvencia del impuesto sobre actividades económicas está vigente", "Ordenanza municipal vigente · cargar por jurisdicción", 2, "Alta"),
      question("mun-04", "Las declaraciones de actividades económicas y sus pagos están disponibles", "Ordenanza municipal vigente · cargar por jurisdicción", 3, "Crítica"),
      question("mun-05", "La declaración y pago por publicidad comercial están disponibles", "Ordenanza municipal de publicidad · por jurisdicción", 2, "Alta", "Empresas con avisos o publicidad"),
      question("mun-06", "Las facturas y pagos de servicios públicos están disponibles", "Contratos y ordenanzas aplicables"),
      question("mun-07", "La solvencia del impuesto sobre publicidad está vigente", "Ordenanza municipal de publicidad · por jurisdicción", 2, "Alta", "Empresas con avisos o publicidad"),
    ],
  },
  {
    id: "ivss",
    title: "Seguro Social",
    shortTitle: "IVSS",
    description: "Registro patronal, movimientos de personal, órdenes de pago y soportes del sistema.",
    questions: [
      question("ivss-01", "El registro en el sistema TIUNA está disponible", "Ley del Seguro Social y reglamento · artículos por validar", 3, "Crítica", "Empresas con trabajadores"),
      question("ivss-02", "El registro patronal de asegurados (Forma 13-12) está disponible", "Normativa IVSS · formulario y vigencia por validar", 2, "Alta", "Empresas con trabajadores"),
      question("ivss-03", "La solvencia del IVSS está vigente", "Normativa IVSS · por validar", 3, "Crítica", "Empresas con trabajadores"),
      question("ivss-04", "Las constancias de ingreso de trabajadores están archivadas", "Normativa IVSS · por validar", 2, "Alta", "Empresas con trabajadores"),
      question("ivss-05", "Las constancias de egreso de trabajadores están archivadas", "Normativa IVSS · por validar", 2, "Alta", "Empresas con trabajadores"),
      question("ivss-06", "Las órdenes de pago y sus comprobantes están disponibles", "Ley del Seguro Social y reglamento · por validar", 3, "Crítica", "Empresas con trabajadores"),
      question("ivss-07", "La lista de trabajadores del sistema coincide con la nómina", "Normativa IVSS · por validar", 2, "Alta", "Empresas con trabajadores"),
      question("ivss-08", "La nómina de trabajadores está actualizada", "LOTTT y normativa de seguridad social · por validar", 2, "Alta", "Empresas con trabajadores"),
    ],
  },
  {
    id: "inces",
    title: "INCES",
    shortTitle: "INCES",
    description: "Inscripción, aportes, declaraciones y solvencia de las entidades de trabajo aplicables.",
    questions: [
      question("inces-01", "La inscripción ante el INCES está disponible", "Ley del INCES · G.O. 6.155, artículos por validar", 2, "Alta", "Según número de trabajadores y aplicabilidad"),
      question("inces-02", "Las declaraciones y sus pagos están disponibles", "Ley del INCES · G.O. 6.155, artículos por validar", 3, "Crítica", "Según número de trabajadores y aplicabilidad"),
      question("inces-03", "La última solvencia del INCES está vigente", "Normativa INCES · por validar", 2, "Alta", "Según número de trabajadores y aplicabilidad"),
    ],
  },
  {
    id: "laboral",
    title: "Registro y deberes laborales",
    shortTitle: "Laboral",
    description: "RNET, declaraciones, solvencia, nómina y condiciones visibles de la jornada laboral.",
    questions: [
      question("lab-01", "El registro en el RNET está vigente", "Normativa del proceso social de trabajo · por validar", 2, "Alta", "Empresas con trabajadores"),
      question("lab-02", "Las declaraciones trimestrales están presentadas", "Normativa RNET · por validar", 2, "Alta", "Empresas con trabajadores"),
      question("lab-03", "La última declaración trimestral está archivada", "Normativa RNET · por validar", 1, "Media", "Empresas con trabajadores"),
      question("lab-04", "La solvencia laboral está vigente", "Normativa laboral · por validar", 3, "Crítica", "Empresas con trabajadores"),
      question("lab-05", "La nómina coincide con los registros laborales", "LOTTT y normativa complementaria · por validar", 2, "Alta", "Empresas con trabajadores"),
      question("lab-06", "El horario de trabajo está publicado y coincide con la jornada aplicable", "LOTTT · G.O. 6.076, artículos por validar", 2, "Alta", "Empresas con trabajadores"),
    ],
  },
  {
    id: "faov",
    title: "Vivienda y hábitat (FAOV)",
    shortTitle: "FAOV",
    description: "Afiliación, solvencia y soportes de pago vinculados al régimen de vivienda y hábitat.",
    questions: [
      question("faov-01", "El comprobante de afiliación ante BANAVIH está disponible", "Ley del Régimen Prestacional de Vivienda y Hábitat · versión 2024 por validar", 2, "Alta", "Empresas con trabajadores"),
      question("faov-02", "La solvencia del FAOV está vigente", "Ley del Régimen Prestacional de Vivienda y Hábitat · G.O. 6.805", 3, "Crítica", "Empresas con trabajadores"),
      question("faov-03", "Las órdenes de pago y sus comprobantes están disponibles", "Normativa BANAVIH/FAOV · por validar", 3, "Crítica", "Empresas con trabajadores"),
    ],
  },
  {
    id: "verificaciones",
    title: "Verificaciones en sitio",
    shortTitle: "En sitio",
    description: "Comprobaciones prácticas que el asistente realiza durante la visita al establecimiento.",
    questions: [
      question("ver-01", "El domicilio observado coincide con el RIF", "COT y normativa del RIF · artículos por validar", 3, "Crítica"),
      question("ver-02", "Los libros de IVA no presentan atraso", "Normativa IVA · artículos por validar", 3, "Crítica", "Contribuyentes sujetos a IVA"),
      question("ver-03", "El medio de facturación observado corresponde a la actividad y condiciones de la empresa", "Providencias SENIAT de facturación · versión por validar", 3, "Crítica"),
      question("ver-04", "Las facturas observadas cumplen los requisitos formales aplicables", "Providencias SENIAT de facturación · versión por validar", 3, "Crítica"),
      question("ver-05", "El libro de reparación de la impresora fiscal está disponible", "Normativa de máquinas fiscales · por validar", 2, "Alta", "Empresas que utilizan máquina fiscal"),
      question("ver-06", "Existe un registro actualizado de entradas y salidas de inventario", "Normativa contable/tributaria · por validar", 2, "Alta", "Empresas con inventario"),
      question("ver-07", "Existe un talonario de facturación alternativo disponible", "Providencias SENIAT de facturación · por validar", 2, "Alta", "Según medio de facturación"),
    ],
  },
]

export const sourceCatalog = [
  { id: "cot", name: "Código Orgánico Tributario", reference: "G.O. 6.507 Extraordinario · 29 ene 2020", scope: "Tributario nacional", status: "Referencia localizada", validity: "Vigencia por confirmar" },
  { id: "facturacion", name: "Providencias SENIAT de facturación", reference: "Incluye SNAT/2024/000102 · G.O. 43.032", scope: "Facturación", status: "Revisión requerida", validity: "Desde 19 dic 2024 · confirmar alcance" },
  { id: "ivss", name: "Ley del Seguro Social y reglamento", reference: "Texto y reformas aplicables", scope: "Seguridad social", status: "Revisión requerida", validity: "Por confirmar" },
  { id: "lottt", name: "Ley Orgánica del Trabajo, los Trabajadores y las Trabajadoras", reference: "G.O. 6.076 Extraordinario · 7 may 2012", scope: "Laboral", status: "Referencia localizada", validity: "Vigencia por confirmar" },
  { id: "inces", name: "Ley del Instituto Nacional de Capacitación y Educación Socialista", reference: "G.O. 6.155 Extraordinario · 19 nov 2014", scope: "INCES", status: "Revisión requerida", validity: "Por confirmar" },
  { id: "faov", name: "Ley del Régimen Prestacional de Vivienda y Hábitat", reference: "G.O. 6.805 Extraordinario · 1 may 2024", scope: "Vivienda y hábitat", status: "Revisión requerida", validity: "Desde publicación · confirmar artículos" },
  { id: "municipal", name: "Ordenanzas tributarias municipales", reference: "Una versión por municipio y materia", scope: "Municipal", status: "Sin cargar", validity: "Depende de la jurisdicción" },
]

export const totalComplianceQuestions = complianceSections.reduce((total, section) => total + section.questions.length, 0)
