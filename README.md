# proyectoxyz

Panel administrativo para una firma contable: control tributario, empresas,
sucursales, tareas, comprobantes y reportes.

El alcance, los usuarios y las decisiones iniciales estan documentados en
[`docs/CONTEXTO_DEL_PRODUCTO.md`](docs/CONTEXTO_DEL_PRODUCTO.md). El plan de
backend aprobado se encuentra en
[`docs/PLAN_BACKEND_POSTGRESQL.md`](docs/PLAN_BACKEND_POSTGRESQL.md).

## Estado del backend

La Fase 0 aporta las fundaciones técnicas: Prisma/PostgreSQL, contenedores
locales, health checks, worker, almacenamiento S3, antivirus, pruebas y CI. La
Fase 1 está en ejecución: Better Auth, invitaciones de un solo uso, recuperación,
MFA, Mailrelay SMTP y el modelo inicial de firma/empresas/roles/documentos ya
tienen base implementada. Las pantallas operativas que aún muestran datos
demostrativos se conectarán incrementalmente antes de cerrar la fase.

## Requisitos locales

- Node.js 24 y npm 11.
- Docker Desktop con Docker Compose v2.
- Puertos libres: `3000`, `3310`, `8333` y `55432`.

## Arranque reproducible con Docker

```powershell
Copy-Item .env.example .env
docker compose up -d --build --wait
docker compose ps -a
```

El migrador debe finalizar con codigo `0`; `postgres`, `seaweedfs`, `clamav`,
`web` y `worker` deben figurar saludables. La aplicacion queda en
`http://localhost:3000` y el readiness check en
`http://localhost:3000/api/health/ready`.

Para detener los contenedores sin borrar datos:

```powershell
docker compose down
```

No use `docker compose down -v` salvo que quiera eliminar deliberadamente la
base, los objetos S3 y las firmas persistidas de ClamAV del entorno local.

## Comandos de desarrollo

```powershell
npm run db:generate
npm run db:migrate -- --name nombre_del_cambio
npm run db:deploy
npm run db:seed
npm run db:studio
npm run worker
npm test
npm run test:integration
npm run test:e2e
npm run lint
npm run build
```

Las pruebas de integracion requieren `postgres`, `seaweedfs` y `clamav` activos.
Para Playwright, instale Chromium una vez con
`npx playwright install chromium`.

## Operacion

- Arranque, migraciones y recuperacion:
  [`docs/OPERACION_BACKEND.md`](docs/OPERACION_BACKEND.md).
- Requisitos externos aun pendientes:
  [`docs/REQUISITOS_VPS_MAILRELAY.md`](docs/REQUISITOS_VPS_MAILRELAY.md).
