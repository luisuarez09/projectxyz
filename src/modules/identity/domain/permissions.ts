export const permissions = {
  firmSettingsRead: "firm.settings.read",
  firmSettingsUpdate: "firm.settings.update",
  firmMailTest: "firm.mail.test",
  teamRead: "team.read",
  teamManage: "team.manage",
  teamInvite: "team.invite",
  companiesRead: "companies.read",
  companiesManage: "companies.manage",
} as const;

export const phaseOnePermissionCatalog = [
  { key: permissions.firmSettingsRead, description: "Consultar la configuración de la firma" },
  { key: permissions.firmSettingsUpdate, description: "Modificar la configuración de la firma" },
  { key: permissions.firmMailTest, description: "Probar la conexión de correo de la firma" },
  { key: permissions.teamRead, description: "Consultar integrantes, roles y asignaciones" },
  { key: permissions.teamManage, description: "Modificar accesos e integrantes de la firma" },
  { key: permissions.teamInvite, description: "Invitar integrantes y clientes" },
  { key: permissions.companiesRead, description: "Consultar las empresas autorizadas" },
  { key: permissions.companiesManage, description: "Crear y modificar empresas de la firma" },
] as const;

export const defaultRolePermissionKeys = {
  administrador: phaseOnePermissionCatalog.map(({ key }) => key),
  supervisor: [permissions.teamRead, permissions.companiesRead, permissions.firmSettingsRead],
  colaborador: [permissions.companiesRead],
} as const;
