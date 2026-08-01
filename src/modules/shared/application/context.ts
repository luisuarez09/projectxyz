export type AuthContext = {
  userId: string;
  firmId: string;
  activeCompanyId: string | null;
  allowedCompanyIds: string[];
  permissionKeys: string[];
  firmScope: boolean;
};

export type CommandContext = {
  auth: AuthContext;
  requestId: string;
  idempotencyKey?: string;
};
