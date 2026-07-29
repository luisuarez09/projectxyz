# proyectoxyz — Contexto del producto

## Propósito

`proyectoxyz` será el panel administrativo de una firma contable. Su objetivo es centralizar el control financiero, contable, tributario y documental de las empresas atendidas, reducir trabajo manual de forma progresiva y permitir supervisar a futuros colaboradores.

La primera etapa se concentrará en el área tributaria: calendario de obligaciones, seguimiento de declaraciones, estados de cumplimiento y prevención de mora.

## Usuarios y acceso

| Perfil | Necesidades principales |
| --- | --- |
| Administrador de la firma | Configurar empresas, planes, obligaciones, asignaciones, vencimientos y permisos. |
| Contador colaborador | Ejecutar y registrar tareas asignadas, adjuntar soportes y actualizar estados. |
| Cliente | Consultar únicamente sus empresas, ver su estado, descargar comprobantes y reportes autorizados. |

Un usuario puede tener acceso a varias empresas. Una empresa puede tener una o varias sucursales.

## Alcance funcional inicial (MVP tributario)

1. **Clientes, empresas y sucursales**: ficha, datos fiscales, responsables y estructura organizativa.
2. **Planes configurables**: cada plan define los servicios que se controlan para cada empresa, incluidos servicios públicos (aseo, electricidad y agua) cuando correspondan.
3. **Calendario tributario**: obligaciones por empresa, período, fecha límite, responsable y estatus.
4. **Flujo de cumplimiento**: pendiente → en preparación → listo para revisión → presentado/pagado → vencido o con incidencia.
5. **Evidencias**: comprobantes de declaración, pago y documentos vinculados, disponibles según permisos.
6. **Panel de la firma**: prioridades del día, próximos vencimientos, tareas retrasadas y carga por colaborador.
7. **Portal del cliente**: estado resumido de su empresa y descargas de comprobantes/reportes autorizados.

## Principios de diseño

- Interfaz sobria, minimalista y orientada a prioridades, no a mostrar todas las opciones al mismo tiempo.
- Navegación principal limitada: Inicio, Empresas, Calendario, Tareas, Reportes y Configuración.
- Acciones contextuales y permisos por perfil para reducir errores y saturación.
- El estado tributario debe entenderse de un vistazo mediante fechas, responsables y señales de riesgo claras.
- La información financiera y tributaria requiere trazabilidad: quién cambió qué, cuándo y con qué soporte.

## Fuera del MVP

- Contabilidad completa o generación automática de asientos.
- Automatización de declaraciones ante portales gubernamentales.
- Nómina, facturación electrónica o conciliación bancaria automática.
- Aplicación móvil nativa.

Estas capacidades se evaluarán por fases, una vez que el control tributario sea estable y se conozcan los calendarios, obligaciones y flujos reales de cada cliente.

## Datos que se definirán con el usuario

- País/administración tributaria aplicable y reglas de vencimiento.
- Tipos de declaraciones, periodicidad y requisitos por empresa.
- Catálogo de planes y servicios incluidos.
- Estados, responsables, aprobaciones y alertas deseados.
- Estructura y formatos de reportes contables y legales.
- Política de retención, privacidad y acceso a documentos.

## Decisiones técnicas propuestas

- Aplicación web: **Next.js con React y TypeScript**.
- Base de datos: **PostgreSQL**.
- ORM y migraciones: **Prisma**.
- UI: **Tailwind CSS + shadcn/ui**, con Radix UI como base de accesibilidad.
- Validación y formularios: **Zod + React Hook Form**.
- Autenticación y roles: **Auth.js** o una alternativa equivalente que soporte sesiones seguras y RBAC.
- Almacenamiento de comprobantes: servicio compatible con S3 (por ejemplo Cloudflare R2, Backblaze B2 o MinIO en fase local), no dentro de PostgreSQL.
- Procesos programados y alertas: cron/contenedor worker inicialmente; cola dedicada (p. ej. BullMQ + Redis) al crecer.
- Infraestructura: **Docker Compose** para desarrollo y despliegue inicial en el VPS.

## Criterios de seguridad desde el inicio

- Contraseñas con hash seguro, MFA para personal de la firma en una fase temprana y control de acceso por rol/empresa.
- Archivos privados, enlaces temporales de descarga y registro de auditoría.
- Copias de seguridad verificadas de PostgreSQL y documentos.
- Variables sensibles solo en `.env`, nunca en Git.
- Separación estricta de datos entre clientes y empresas.

## Hitos sugeridos

1. Definir diseño visual, modelos de datos y reglas tributarias.
2. Construir autenticación, organizaciones, clientes, empresas y sucursales.
3. Construir calendario tributario, tareas, responsables, estados y alertas.
4. Habilitar carga/descarga de comprobantes y portal del cliente.
5. Añadir reportes, indicadores y automatizaciones priorizadas con datos reales.

