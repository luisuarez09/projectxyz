# Operación del backend - Fases 0 y 1

## Limite de esta fase

La infraestructura de Fase 0 está disponible y la Fase 1 comenzó a conectar
identidad y acceso. Better Auth, invitaciones, recuperación, MFA y RLS ya tienen
una base ejecutable. Las pantallas operativas restantes siguen usando datos
demostrativos hasta que cada módulo sea conectado y validado.

## Correo e identidad local

- Better Auth usa `BETTER_AUTH_SECRET` y `BETTER_AUTH_URL`. En producción no
  existen valores por defecto y el proceso falla si no se provisionan.
- El alta pública permanece bloqueada por un token de invitación de un solo uso,
  aunque el endpoint técnico de registro exista para aceptar invitaciones.
- Mailrelay se configura con `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER` y
  `SMTP_PASSWORD` exactamente como aparecen en su panel.
- Ninguna credencial debe guardarse en Git. Las pruebas reales de correo sólo se
  harán contra destinatarios internos autorizados.

## Servicios locales

| Servicio | Responsabilidad | Exposicion local |
| --- | --- | --- |
| `postgres` | PostgreSQL 18 | `127.0.0.1:55432` |
| `migrate` | `prisma migrate deploy` antes de web/worker | no expuesto; termina en 0 |
| `seaweedfs` | API S3 privada de desarrollo | `127.0.0.1:8333` |
| `clamav` | analisis de archivos | `127.0.0.1:3310` |
| `web` | Next.js y health checks | `127.0.0.1:3000` |
| `worker` | `pg-boss` y trabajos futuros | no expuesto |

Los puertos publicados se enlazan a loopback para no exponer servicios de
infraestructura a la red local. En produccion, solamente Caddy podra publicar
80 y 443.

## Flujo de migraciones

1. Modificar los archivos de `prisma/models` y validar con
   `npx prisma validate`.
2. En desarrollo, crear la migracion con
   `npm run db:migrate -- --name nombre_descriptivo`.
3. Leer completamente el `migration.sql` generado. Las extensiones, roles,
   permisos, SQL manual y operaciones destructivas requieren revision expresa.
4. Probar desde una base vacia y, cuando exista produccion, desde una copia
   reciente anonimizada.
5. Ejecutar pruebas y `npm run build`.
6. En produccion usar exclusivamente `npm run db:deploy`.

No se autoriza `prisma db push` en produccion. Un cambio incompatible debe usar
expand/contract y contar con un respaldo verificable antes del despliegue.

`DIRECT_DATABASE_URL` pertenece al rol migrador. `DATABASE_URL` pertenece al
rol de aplicacion, que no es propietario de las tablas, no es superusuario y no
tiene `BYPASSRLS`. El worker usa una credencial separada y administra solamente
el esquema externo `jobs` mediante `pg-boss`.

## Validacion de salud

```powershell
Invoke-RestMethod http://localhost:3000/api/health/live
Invoke-RestMethod http://localhost:3000/api/health/ready
docker compose ps -a
docker compose logs --tail=100 worker
```

`live` confirma que el proceso web responde. `ready` consulta PostgreSQL. El
worker registra un objeto `health` al iniciar. Las pruebas de integracion hacen
una carga/descarga S3 y un escaneo INSTREAM real de ClamAV.

## Respaldo y recuperacion

La siguiente operacion no se considera lista para produccion hasta confirmar el
servicio Contabo Auto Backup y completar una restauracion aislada.

Respaldo logico inicial:

```powershell
New-Item -ItemType Directory -Force backups
docker compose exec -T postgres pg_dump -U proyectoxyz_migrator -d proyectoxyz -Fc --file=/tmp/proyectoxyz.dump
docker cp proyectoxyz-postgres-1:/tmp/proyectoxyz.dump backups/proyectoxyz.dump
```

El respaldo de documentos debe incluir un manifiesto de claves, tamanos y
checksums de SeaweedFS. El dump y el manifiesto deben copiarse a una ruta
incluida en el backup del proveedor. No basta con un snapshot manual.

Recuperacion mensual de prueba:

1. Crear PostgreSQL y SeaweedFS aislados, sin conectarlos al entorno productivo.
2. Restaurar el dump con `pg_restore` usando el rol migrador.
3. Restaurar los objetos y comparar el manifiesto/checksums.
4. Ejecutar `npm run db:deploy`, pruebas de integracion y consultas de muestreo.
5. Registrar fecha, duracion, responsable, resultado y cualquier perdida.

Objetivos iniciales aprobados: RPO de 24 horas y RTO de 8 horas. Cualquier
migracion destructiva exige un backup verificado inmediatamente anterior.
