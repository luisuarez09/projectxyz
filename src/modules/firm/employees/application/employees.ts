import { z } from "zod";

import { withAuthTransaction } from "@/infrastructure/database/auth-transaction";
import {
  AuthorizationError,
  requirePermission,
} from "@/modules/identity/application/auth-context";
import { permissions } from "@/modules/identity/domain/permissions";
import type { AuthContext } from "@/modules/shared/application/context";
import type {
  BranchOption,
  EmployeeDetail,
  EmployeePaymentMethodRow,
  EmployeeSummary,
} from "@/modules/firm/employees/domain/employee";

// ─── Schemas de validación ─────────────────────────────────────────────────

const nullableText = (max: number) =>
  z.string().trim().max(max).transform((v) => v || null);

const nullableDate = z
  .string()
  .trim()
  .transform((v) => {
    if (!v) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new Error("Fecha inválida.");
    return new Date(`${v}T00:00:00.000Z`);
  });

const requiredDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha de ingreso es obligatoria.")
  .transform((v) => new Date(`${v}T00:00:00.000Z`));

const decimalStr = z
  .string()
  .trim()
  .transform((v) => (v === "" ? "0" : v))
  .pipe(
    z
      .string()
      .regex(/^\d+(?:[.,]\d{1,2})?$/, "Importe no válido.")
      .transform((v) => v.replace(",", ".")),
  );

const employeeStatusValues = [
  "ACTIVE",
  "ON_VACATION",
  "SICK_LEAVE",
  "SUSPENDED",
  "RETIRED",
] as const;

const employeeSchema = z.object({
  fullName: z.string().trim().min(2, "El nombre es obligatorio.").max(200),
  identity: z.string().trim().min(2, "La cédula es obligatoria.").max(30),
  birthDate: nullableDate,
  admissionDate: requiredDate,
  role: nullableText(120),
  department: nullableText(120),
  branchId: z
    .union([z.literal(""), z.uuid()])
    .transform((v) => v || null),
  contractType: nullableText(80),
  schedule: nullableText(200),
  gender: nullableText(40),
  address: nullableText(500),
  phone: nullableText(30),
  salary: decimalStr,
  salaryCurrency: z.string().trim().min(1).max(10).default("USD"),
  foodBonus: decimalStr,
  status: z.enum(employeeStatusValues).default("ACTIVE"),
});

const paymentMethodSchema = z.object({
  type: z.enum(["BANK_TRANSFER", "MOBILE_PAYMENT"]),
  bank: z.string().trim().min(2, "El banco es obligatorio.").max(120),
  account: nullableText(30),
  phone: nullableText(20),
  identity: nullableText(20),
});

// ─── Helpers de serialización ──────────────────────────────────────────────

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function serializePaymentMethod(pm: {
  id: string;
  type: string;
  bank: string;
  account: string | null;
  phone: string | null;
  identity: string | null;
  createdAt: Date;
}): EmployeePaymentMethodRow {
  return {
    id: pm.id,
    type: pm.type as EmployeePaymentMethodRow["type"],
    bank: pm.bank,
    account: pm.account,
    phone: pm.phone,
    identity: pm.identity,
    createdAt: pm.createdAt.toISOString(),
  };
}

function serializeSummary(e: {
  id: string;
  version: number;
  fullName: string;
  identity: string;
  admissionDate: Date;
  role: string | null;
  department: string | null;
  branchId: string | null;
  branch: { name: string } | null;
  phone: string | null;
  salary: { toFixed: (n: number) => string };
  salaryCurrency: string;
  status: string;
}): EmployeeSummary {
  return {
    id: e.id,
    version: e.version,
    fullName: e.fullName,
    identity: e.identity,
    admissionDate: toIsoDate(e.admissionDate),
    role: e.role,
    department: e.department,
    branchId: e.branchId,
    branchName: e.branch?.name ?? null,
    phone: e.phone,
    salary: e.salary.toFixed(2),
    salaryCurrency: e.salaryCurrency,
    status: e.status as EmployeeSummary["status"],
  };
}

// ─── Verificar que companyId está autorizado ───────────────────────────────

function requireActiveCompany(auth: AuthContext): string {
  if (!auth.activeCompanyId) {
    throw new AuthorizationError("No hay empresa activa seleccionada.");
  }
  if (!auth.allowedCompanyIds.includes(auth.activeCompanyId)) {
    throw new AuthorizationError("La empresa activa no está autorizada.");
  }
  return auth.activeCompanyId;
}

// ─── Servicios públicos ────────────────────────────────────────────────────

/** Lista los empleados de la empresa activa. */
export async function listEmployees(
  auth: AuthContext,
): Promise<{ employees: EmployeeSummary[]; branches: BranchOption[] }> {
  requirePermission(auth, permissions.employeesRead);
  const companyId = requireActiveCompany(auth);

  return withAuthTransaction(auth, async (tx) => {
    const [rows, branches] = await Promise.all([
      tx.employee.findMany({
        where: { companyId },
        orderBy: { fullName: "asc" },
        select: {
          id: true,
          version: true,
          fullName: true,
          identity: true,
          admissionDate: true,
          role: true,
          department: true,
          branchId: true,
          branch: { select: { name: true } },
          phone: true,
          salary: true,
          salaryCurrency: true,
          status: true,
        },
      }),
      tx.branch.findMany({
        where: { companyId, active: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
    ]);

    return {
      employees: rows.map(serializeSummary),
      branches,
    };
  });
}

/** Obtiene el detalle completo de un empleado con sus medios de pago. */
export async function getEmployee(
  auth: AuthContext,
  employeeId: string,
): Promise<EmployeeDetail> {
  requirePermission(auth, permissions.employeesRead);
  const companyId = requireActiveCompany(auth);

  return withAuthTransaction(auth, async (tx) => {
    const row = await tx.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        version: true,
        companyId: true,
        fullName: true,
        identity: true,
        admissionDate: true,
        birthDate: true,
        role: true,
        department: true,
        branchId: true,
        branch: { select: { name: true } },
        contractType: true,
        schedule: true,
        gender: true,
        address: true,
        phone: true,
        salary: true,
        salaryCurrency: true,
        foodBonus: true,
        status: true,
        paymentMethods: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            type: true,
            bank: true,
            account: true,
            phone: true,
            identity: true,
            createdAt: true,
          },
        },
      },
    });

    if (!row || row.companyId !== companyId) {
      throw new AuthorizationError("Empleado no encontrado.");
    }

    return {
      ...serializeSummary(row),
      birthDate: row.birthDate ? toIsoDate(row.birthDate) : null,
      contractType: row.contractType,
      schedule: row.schedule,
      gender: row.gender,
      address: row.address,
      foodBonus: row.foodBonus.toFixed(2),
      paymentMethods: row.paymentMethods.map(serializePaymentMethod),
    };
  });
}

/** Crea un nuevo empleado en la empresa activa. */
export async function createEmployee(
  auth: AuthContext,
  input: unknown,
): Promise<EmployeeDetail> {
  requirePermission(auth, permissions.employeesManage);
  const companyId = requireActiveCompany(auth);
  const data = employeeSchema.parse(input);

  return withAuthTransaction(auth, async (tx) => {
    // Verificar branchId pertenece a esta empresa
    if (data.branchId) {
      const branch = await tx.branch.findUnique({
        where: { id: data.branchId },
        select: { companyId: true },
      });
      if (!branch || branch.companyId !== companyId) {
        throw new AuthorizationError("La sucursal no pertenece a esta empresa.");
      }
    }

    const created = await tx.employee.create({
      data: {
        companyId,
        branchId: data.branchId,
        fullName: data.fullName,
        identity: data.identity,
        birthDate: data.birthDate,
        admissionDate: data.admissionDate,
        role: data.role,
        department: data.department,
        contractType: data.contractType,
        schedule: data.schedule,
        gender: data.gender,
        address: data.address,
        phone: data.phone,
        salary: data.salary,
        salaryCurrency: data.salaryCurrency,
        foodBonus: data.foodBonus,
        status: data.status,
      },
      select: {
        id: true,
        version: true,
        companyId: true,
        fullName: true,
        identity: true,
        admissionDate: true,
        birthDate: true,
        role: true,
        department: true,
        branchId: true,
        branch: { select: { name: true } },
        contractType: true,
        schedule: true,
        gender: true,
        address: true,
        phone: true,
        salary: true,
        salaryCurrency: true,
        foodBonus: true,
        status: true,
        paymentMethods: true,
      },
    });

    return {
      ...serializeSummary(created),
      birthDate: created.birthDate ? toIsoDate(created.birthDate) : null,
      contractType: created.contractType,
      schedule: created.schedule,
      gender: created.gender,
      address: created.address,
      foodBonus: created.foodBonus.toFixed(2),
      paymentMethods: [],
    };
  });
}

/** Actualiza una ficha de empleado (control optimista con version). */
export async function updateEmployee(
  auth: AuthContext,
  employeeId: string,
  input: unknown,
): Promise<EmployeeDetail> {
  requirePermission(auth, permissions.employeesManage);
  const companyId = requireActiveCompany(auth);
  const data = employeeSchema.extend({ version: z.number().int().min(1) }).parse(input);

  return withAuthTransaction(auth, async (tx) => {
    const existing = await tx.employee.findUnique({
      where: { id: employeeId },
      select: { companyId: true, version: true },
    });

    if (!existing || existing.companyId !== companyId) {
      throw new AuthorizationError("Empleado no encontrado.");
    }
    if (existing.version !== data.version) {
      throw new Error("CONFLICT: La ficha fue modificada por otro usuario. Recarga la página.");
    }

    if (data.branchId) {
      const branch = await tx.branch.findUnique({
        where: { id: data.branchId },
        select: { companyId: true },
      });
      if (!branch || branch.companyId !== companyId) {
        throw new AuthorizationError("La sucursal no pertenece a esta empresa.");
      }
    }

    const updated = await tx.employee.update({
      where: { id: employeeId },
      data: {
        branchId: data.branchId,
        fullName: data.fullName,
        identity: data.identity,
        birthDate: data.birthDate,
        admissionDate: data.admissionDate,
        role: data.role,
        department: data.department,
        contractType: data.contractType,
        schedule: data.schedule,
        gender: data.gender,
        address: data.address,
        phone: data.phone,
        salary: data.salary,
        salaryCurrency: data.salaryCurrency,
        foodBonus: data.foodBonus,
        status: data.status,
        version: { increment: 1 },
      },
      select: {
        id: true,
        version: true,
        companyId: true,
        fullName: true,
        identity: true,
        admissionDate: true,
        birthDate: true,
        role: true,
        department: true,
        branchId: true,
        branch: { select: { name: true } },
        contractType: true,
        schedule: true,
        gender: true,
        address: true,
        phone: true,
        salary: true,
        salaryCurrency: true,
        foodBonus: true,
        status: true,
        paymentMethods: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            type: true,
            bank: true,
            account: true,
            phone: true,
            identity: true,
            createdAt: true,
          },
        },
      },
    });

    return {
      ...serializeSummary(updated),
      birthDate: updated.birthDate ? toIsoDate(updated.birthDate) : null,
      contractType: updated.contractType,
      schedule: updated.schedule,
      gender: updated.gender,
      address: updated.address,
      foodBonus: updated.foodBonus.toFixed(2),
      paymentMethods: updated.paymentMethods.map(serializePaymentMethod),
    };
  });
}

/** Agrega un medio de pago a un empleado. */
export async function addPaymentMethod(
  auth: AuthContext,
  employeeId: string,
  input: unknown,
): Promise<EmployeePaymentMethodRow> {
  requirePermission(auth, permissions.employeesManage);
  const companyId = requireActiveCompany(auth);
  const data = paymentMethodSchema.parse(input);

  return withAuthTransaction(auth, async (tx) => {
    const employee = await tx.employee.findUnique({
      where: { id: employeeId },
      select: { companyId: true },
    });
    if (!employee || employee.companyId !== companyId) {
      throw new AuthorizationError("Empleado no encontrado.");
    }

    const created = await tx.employeePaymentMethod.create({
      data: {
        employeeId,
        type: data.type,
        bank: data.bank,
        account: data.account,
        phone: data.phone,
        identity: data.identity,
      },
      select: {
        id: true,
        type: true,
        bank: true,
        account: true,
        phone: true,
        identity: true,
        createdAt: true,
      },
    });

    return serializePaymentMethod(created);
  });
}

/** Elimina un medio de pago de un empleado. */
export async function deletePaymentMethod(
  auth: AuthContext,
  employeeId: string,
  methodId: string,
): Promise<void> {
  requirePermission(auth, permissions.employeesManage);
  const companyId = requireActiveCompany(auth);

  return withAuthTransaction(auth, async (tx) => {
    const pm = await tx.employeePaymentMethod.findUnique({
      where: { id: methodId },
      select: { employeeId: true, employee: { select: { companyId: true } } },
    });
    if (!pm || pm.employeeId !== employeeId || pm.employee.companyId !== companyId) {
      throw new AuthorizationError("Medio de pago no encontrado.");
    }
    await tx.employeePaymentMethod.delete({ where: { id: methodId } });
  });
}
