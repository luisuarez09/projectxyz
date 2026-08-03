import { z } from "zod";

export const accountTypes = ["Activo", "Pasivo", "Patrimonio", "Ingreso", "Costo", "Gasto", "Cuenta de orden", "Orden"] as const;
export const accountNatures = ["Deudora", "Acreedora"] as const;
export const accountStatuses = ["Activa", "Inactiva"] as const;

export const accountInputSchema = z.object({
  code: z.string().trim().min(1).max(60),
  name: z.string().trim().min(2).max(240),
  type: z.enum(accountTypes),
  nature: z.enum(accountNatures),
  level: z.coerce.number().int().min(1).max(5),
  parent: z.string().trim().max(300).transform((value) => value || "Sin cuenta superior"),
  use: z.string().trim().max(600),
  acceptsMovements: z.boolean(),
  status: z.enum(accountStatuses),
});

export const accountUpdateSchema = accountInputSchema.extend({
  version: z.number().int().positive(),
});

export const accountTypeToDatabase = {
  Activo: "ASSET",
  Pasivo: "LIABILITY",
  Patrimonio: "EQUITY",
  Ingreso: "INCOME",
  Costo: "COST",
  Gasto: "EXPENSE",
  "Cuenta de orden": "MEMORANDUM",
  Orden: "MEMORANDUM",
} as const;

export const accountTypeFromDatabase = {
  ASSET: "Activo",
  LIABILITY: "Pasivo",
  EQUITY: "Patrimonio",
  INCOME: "Ingreso",
  COST: "Costo",
  EXPENSE: "Gasto",
  MEMORANDUM: "Cuenta de orden",
} as const;

export function toDatabaseAccount(input: z.infer<typeof accountInputSchema>) {
  return {
    code: input.code,
    name: input.name,
    type: accountTypeToDatabase[input.type],
    nature: input.nature === "Deudora" ? "DEBIT" as const : "CREDIT" as const,
    level: input.level,
    parent: input.parent,
    use: input.use,
    acceptsMovements: input.acceptsMovements,
    status: input.status === "Activa" ? "ACTIVE" as const : "INACTIVE" as const,
  };
}

export function serializeAccount(account: {
  id: string;
  version: number;
  code: string;
  name: string;
  type: keyof typeof accountTypeFromDatabase;
  nature: "DEBIT" | "CREDIT";
  level: number;
  parent: string;
  use: string;
  acceptsMovements: boolean;
  status: "ACTIVE" | "INACTIVE";
  sourceTemplateAccountId?: string | null;
}) {
  return {
    id: account.id,
    version: account.version,
    code: account.code,
    name: account.name,
    type: accountTypeFromDatabase[account.type],
    nature: account.nature === "DEBIT" ? "Deudora" : "Acreedora",
    level: String(account.level),
    parent: account.parent,
    use: account.use,
    acceptsMovements: account.acceptsMovements,
    status: account.status === "ACTIVE" ? "Activa" : "Inactiva",
    source: account.sourceTemplateAccountId ? "Plan base" : "Manual",
  };
}
