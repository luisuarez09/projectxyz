import { z } from "zod";

import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/infrastructure/database/prisma";
import type { AuthContext } from "@/modules/shared/application/context";

const uuid = z.uuid();

export async function withAuthTransaction<T>(
  auth: AuthContext,
  operation: (transaction: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  uuid.parse(auth.userId);
  uuid.parse(auth.firmId);
  auth.allowedCompanyIds.forEach((companyId) => uuid.parse(companyId));

  return getPrisma().$transaction(async (transaction) => {
    await transaction.$executeRaw`SELECT set_config('app.user_id', ${auth.userId}, true)`;
    await transaction.$executeRaw`SELECT set_config('app.firm_id', ${auth.firmId}, true)`;
    await transaction.$executeRaw`SELECT set_config('app.firm_scope', ${String(auth.firmScope)}, true)`;
    await transaction.$executeRaw`SELECT set_config('app.allowed_company_ids', ${auth.allowedCompanyIds.join(",")}, true)`;

    return operation(transaction);
  });
}
