import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes, randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import { hashInvitationToken } from "../src/modules/identity/application/invitations";
import { defaultRolePermissionKeys, phaseOnePermissionCatalog } from "../src/modules/identity/domain/permissions";
import { speCalendarMatrices2026, speCalendarSource2026 } from "../src/lib/spe-calendar-2026";

const connectionString = process.env.DIRECT_DATABASE_URL;
if (!connectionString) throw new Error("DIRECT_DATABASE_URL es obligatoria para inicializar la firma.");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const email = (process.env.BOOTSTRAP_ADMIN_EMAIL ?? "lsuarez.asesor@gmail.com").trim().toLowerCase();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  const invitation = await prisma.$transaction(async (transaction) => {
    const firm = await transaction.firm.upsert({
      where: { rif: "V-238572602" },
      update: { legalName: "Luis Suarez", entityType: "NATURAL_PERSON", email },
      create: { legalName: "Luis Suarez", entityType: "NATURAL_PERSON", rif: "V-238572602", email },
    });

    const documentDate = { deadlineMode: "document-date", deadlineDayCount: 0, deadlineDayType: "calendar", deadlineBase: "document-date" };
    const businessDays = (deadlineDayCount: number) => ({ deadlineMode: "days", deadlineDayCount, deadlineDayType: "business", deadlineBase: "next-period-start" });
    const calendarDays = (deadlineDayCount: number) => ({ deadlineMode: "days", deadlineDayCount, deadlineDayType: "calendar", deadlineBase: "next-period-start" });
    const pendingDeadline = businessDays(0);
    const serviceSamples = [
      { key: "electricidad", name: "Electricidad", organism: "Prestador eléctrico", frequency: "Según factura", active: true, ...documentDate },
      { key: "agua", name: "Agua", organism: "Prestador de agua", frequency: "Según factura", active: true, ...documentDate },
      { key: "publicidad", name: "Publicidad", organism: "Alcaldía aplicable", frequency: "Mensual", active: false, ...businessDays(10) },
      { key: "gas", name: "Gas", organism: "Prestador de gas", frequency: "Según factura", active: true, ...documentDate },
      { key: "aseo-urbano", name: "Aseo urbano", organism: "Alcaldía aplicable", frequency: "Mensual", active: false, ...businessDays(10) },
    ];
    const taxSamples = [
      { key: "iva", name: "IVA", organism: "SENIAT", frequency: "Mensual", speFrequency: "Quincenal", templateKey: "iva", ...businessDays(15) },
      { key: "ret-iva", name: "Retenciones de IVA", organism: "SENIAT", frequency: "Mensual", speFrequency: "Quincenal", ...pendingDeadline },
      { key: "igtf", name: "IGTF", organism: "SENIAT", frequency: "Mensual", speFrequency: "Quincenal", ...pendingDeadline },
      { key: "anticipos-islr", name: "Anticipos de ISLR", organism: "SENIAT", frequency: "Mensual", speFrequency: "Quincenal", ...pendingDeadline },
      { key: "ret-islr", name: "Retenciones de ISLR", organism: "SENIAT", frequency: "Mensual", speFrequency: "Mensual", ...pendingDeadline },
      { key: "islr-anual", name: "Autoliquidación anual de ISLR", organism: "SENIAT", frequency: "Anual", speFrequency: "Anual", ...pendingDeadline },
      { key: "grandes-patrimonios", name: "Impuesto a los Grandes Patrimonios", organism: "SENIAT", frequency: "Anual", speFrequency: "Anual", ...pendingDeadline },
      { key: "municipal", name: "Impuesto municipal", organism: "Alcaldía aplicable", frequency: "Mensual", ...businessDays(10) },
      { key: "ivss", name: "IVSS", organism: "IVSS", frequency: "Mensual", templateKey: "ivss", ...calendarDays(5) },
      { key: "dpp", name: "DPP", organism: "SENIAT", frequency: "Mensual", templateKey: "dpp", ...pendingDeadline },
      { key: "inces", name: "INCES", organism: "INCES", frequency: "Trimestral", templateKey: "inces", ...pendingDeadline },
      { key: "faov", name: "FAOV", organism: "BANAVIH", frequency: "Mensual", templateKey: "faov", ...pendingDeadline },
    ];
    const offeringIds = new Map<string, string>();
    for (const sample of serviceSamples) {
      const offering = await transaction.firmOffering.upsert({
        where: { firmId_key: { firmId: firm.id, key: sample.key } }, update: {},
        create: { firmId: firm.id, kind: "SERVICE", speFrequency: null, templateKey: null, source: null, effectiveFrom: null, effectiveTo: null, ...sample },
      });
      offeringIds.set(sample.key, offering.id);
    }
    for (const sample of taxSamples) {
      const offering = await transaction.firmOffering.upsert({
        where: { firmId_key: { firmId: firm.id, key: sample.key } }, update: {},
        create: { firmId: firm.id, kind: "TAX", active: false, source: null, effectiveFrom: null, effectiveTo: null, speFrequency: null, templateKey: null, ...sample },
      });
      offeringIds.set(sample.key, offering.id);
    }

    const ivaOfferingId = offeringIds.get("iva");
    if (!ivaOfferingId) throw new Error("No fue posible preparar la obligación IVA.");
    const existingGeneralRate = await transaction.taxRate.findFirst({ where: { firmId: firm.id, offeringId: ivaOfferingId, name: "Alícuota general" }, select: { id: true } });
    if (!existingGeneralRate) await transaction.taxRate.create({ data: { firmId: firm.id, offeringId: ivaOfferingId, name: "Alícuota general", rate: "16", source: null, effectiveFrom: null, effectiveTo: null, active: false } });

    const fiscalCalendar = await transaction.fiscalCalendar.upsert({
      where: { firmId_key: { firmId: firm.id, key: "seniat-spe-2026" } }, update: {},
      create: {
        firmId: firm.id, key: "seniat-spe-2026", name: "Calendario SENIAT SPE 2026", year: 2026,
        taxpayerCondition: "SPECIAL_TAXPAYER", effectiveFrom: new Date("2026-01-01T00:00:00.000Z"), effectiveTo: new Date("2026-12-31T00:00:00.000Z"),
        sourceGazette: speCalendarSource2026.gazette, sourcePublishedAt: new Date("2025-12-23T00:00:00.000Z"),
        sourceProvision: speCalendarSource2026.provision, sourceIssuedAt: new Date("2025-11-24T00:00:00.000Z"), sourceNote: speCalendarSource2026.note,
        active: false,
      },
    });
    const obligationKeys: Record<string, string[]> = {
      "a-fortnights": ["iva", "anticipos-islr", "igtf", "ret-iva"],
      "b-estimated-islr": ["anticipos-islr"],
      "c-islr-withholdings": ["ret-islr"],
      "f-annual-islr": ["islr-anual"],
      "g-irregular-islr": ["islr-anual"],
      "h-large-assets": ["grandes-patrimonios"],
    };
    const monthNumber: Record<string, number> = { ENE: 1, FEB: 2, MAR: 3, ABR: 4, MAY: 5, JUN: 6, JUL: 7, AGO: 8, SEP: 9, OCT: 10, NOV: 11, DIC: 12 };
    for (const [ordinal, sample] of speCalendarMatrices2026.entries()) {
      const matrix = await transaction.fiscalCalendarMatrix.upsert({
        where: { calendarId_key: { calendarId: fiscalCalendar.id, key: sample.id } }, update: {},
        create: { calendarId: fiscalCalendar.id, key: sample.id, groupKey: sample.groupId, label: sample.label, shortLabel: sample.shortLabel, cadence: sample.cadence, periodLabel: sample.period, note: sample.note, ordinal },
      });
      await transaction.fiscalCalendarMatrixOffering.createMany({
        data: (obligationKeys[sample.groupId] ?? []).flatMap((key) => offeringIds.get(key) ? [{ matrixId: matrix.id, offeringId: offeringIds.get(key)! }] : []),
        skipDuplicates: true,
      });
      if (await transaction.fiscalCalendarDate.count({ where: { matrixId: matrix.id } })) continue;
      const dates = sample.rows.flatMap((row) => sample.columns.flatMap((periodKey) => {
        const value = row.dates[periodKey];
        if (!value) return [];
        if (periodKey === "FECHA") {
          const [day, month, year] = value.split("/");
          return [{ matrixId: matrix.id, rifCriterion: row.rif, periodKey, dueDate: new Date(`${year}-${month}-${day}T00:00:00.000Z`) }];
        }
        const month = monthNumber[periodKey];
        return [{ matrixId: matrix.id, rifCriterion: row.rif, periodKey, dueDate: new Date(`2026-${String(month).padStart(2, "0")}-${value.padStart(2, "0")}T00:00:00.000Z`) }];
      }));
      await transaction.fiscalCalendarDate.createMany({ data: dates });
    }

    for (const permission of phaseOnePermissionCatalog) {
      await transaction.permission.upsert({
        where: { key: permission.key },
        update: { description: permission.description },
        create: permission,
      });
    }

    const roleDefinitions = [
      { slug: "administrador", name: "Administrador", description: "Control completo de la firma y sus empresas." },
      { slug: "supervisor", name: "Supervisor", description: "Supervisa el equipo y las empresas asignadas." },
      { slug: "colaborador", name: "Colaborador", description: "Trabaja únicamente con las empresas asignadas." },
    ] as const;
    const roles = new Map<string, string>();
    for (const definition of roleDefinitions) {
      const role = await transaction.role.upsert({
        where: { firmId_slug: { firmId: firm.id, slug: definition.slug } },
        update: { name: definition.name, description: definition.description, isSystem: true, archivedAt: null },
        create: { firmId: firm.id, ...definition, isSystem: true },
      });
      roles.set(definition.slug, role.id);
      await transaction.rolePermission.deleteMany({ where: { roleId: role.id } });
      await transaction.rolePermission.createMany({
        data: defaultRolePermissionKeys[definition.slug].map((permissionKey) => ({ roleId: role.id, permissionKey })),
      });
    }
    const administratorRoleId = roles.get("administrador");
    if (!administratorRoleId) throw new Error("No fue posible preparar el rol administrador.");

    const existingProfile = await transaction.userProfile.findFirst({
      where: { firmId: firm.id, user: { email } },
      select: { id: true },
    });
    if (existingProfile) return null;

    await transaction.invitation.updateMany({
      where: { firmId: firm.id, email, status: "PENDING" },
      data: { status: "REVOKED" },
    });
    const created = await transaction.invitation.create({
      data: {
        firmId: firm.id,
        email,
        name: "Luis Suarez",
        roleId: administratorRoleId,
        profileType: "STAFF",
        scope: "FIRM",
        tokenHash: hashInvitationToken(token),
        expiresAt,
        invitedByUserId: null,
        lastDeliveryMethod: "MANUAL_LINK",
        lastDeliveredAt: new Date(),
      },
    });
    await transaction.auditEvent.create({
      data: {
        firmId: firm.id,
        requestId: randomUUID(),
        eventType: "identity.bootstrap_invitation.created",
        entityType: "invitation",
        entityId: created.id,
        metadata: { delivery: "local_file", expiresAt: expiresAt.toISOString() },
      },
    });
    return created;
  });

  if (!invitation) {
    console.info("La cuenta administradora ya está inicializada; no se generó otra invitación.");
    return;
  }

  const invitationUrl = new URL("/invitacion", appUrl);
  invitationUrl.searchParams.set("token", token);
  const outputDirectory = path.resolve(".bootstrap");
  const outputPath = path.join(outputDirectory, "admin-invitation-url.txt");
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(outputPath, `${invitationUrl.toString()}\n`, { encoding: "utf8", mode: 0o600 });
  console.info(`Firma inicializada. La invitación local se guardó en ${outputPath} y vence en 48 horas.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
