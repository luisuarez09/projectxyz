# Requisitos pendientes del VPS y Mailrelay

Estado al 1 de agosto de 2026: **VPS contratado; dominio, Mailrelay y respaldo
automático pendientes**. Estos puntos no bloquean el desarrollo local, pero sí
bloquean declarar producción lista.

## VPS Contabo

- VPS 1 confirmado: Ubuntu, 4 vCPU, 8 GB de RAM, SSD de 100 GB, puerto de
  200 Mbit con tráfico ilimitado y un snapshot incluido.
- Activar Contabo Auto Backup y confirmar que cubre las rutas
  donde se guardarán dumps y manifiestos. Si sólo hay snapshots manuales, el
  paso a producción queda bloqueado.
- Comprar un dominio y conservar control DNS; definir el hostname público y el correo
  operativo para certificados TLS de Caddy.
- Instalar y endurecer Linux, Docker Engine y Compose; restringir SSH por llave,
  aplicar actualizaciones, NTP, firewall y monitoreo de disco/memoria.
- Exponer únicamente 80/443 mediante Caddy. PostgreSQL, SeaweedFS, ClamAV,
  worker y consolas deben permanecer en la red privada de Docker.
- Definir volúmenes/rutas persistentes, espacio para cuarentena y firmas de
  ClamAV, y salida a Internet para actualizaciones antivirus y correo SMTP.
- Crear secretos separados para migrador, aplicación, worker, S3, Better Auth,
  Mailrelay y claves maestras AES-256-GCM. Ninguno quedará versionado ni dentro
  de PostgreSQL.
- Crear una credencial S3 de aplicación sin permiso de borrado físico y una
  credencial administrativa separada para retiros excepcionales.
- Ejecutar una restauración mensual aislada documentada y añadir posteriormente
  una copia independiente del proveedor Contabo.

## Mailrelay

- Crear la cuenta Mailrelay cuando exista un correo de dominio propio. El correo
  personal `lsuarez.asesor@gmail.com` se usará para el acceso administrativo,
  no como remitente corporativo verificado.
- Crear los remitentes definitivos y configurar SPF, DKIM y DMARC en DNS.
- En `Configuración > Configuraciones SMTP`, activar SMTP y guardar en un gestor
  de secretos el host, puerto, usuario y contraseña que muestre el panel.
- Confirmar `MAIL_FROM_ADDRESS`, `MAIL_FROM_NAME` y `MAIL_REPLY_TO` definitivos.
- Mantener desactivada la opción de destinatarios CSV para los correos
  transaccionales individuales de identidad.
- Definir una lista de destinatarios internos autorizados para las pruebas; no
  se enviará a clientes reales durante la validación.
- Confirmar con soporte de Mailrelay qué API o eventos autenticables están
  disponibles para conciliar entregas, rebotes, bloqueos y bajas de envíos SMTP.
- Acordar retención de eventos, alertas por rebotes/bloqueos, límites de envío y
  procedimiento de rotación o revocación de la contraseña SMTP.

La aplicación utilizará Nodemailer y una configuración SMTP genérica por firma.
La contraseña SMTP se cifrará antes de guardarse; la clave maestra versionada se
cargará localmente o en el VPS mediante secretos del entorno y nunca se
guardará en PostgreSQL, se enviará por chat ni se versionará en Git. Los envíos
permanecerán desactivados hasta completar el dominio y verificar la conexión.
