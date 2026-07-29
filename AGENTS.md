# Instrucciones del proyecto

Antes de diseñar o implementar funcionalidades, consulta `docs/CONTEXTO_DEL_PRODUCTO.md`.

- El producto se dirige a firmas contables que operan en Venezuela.
- La primera prioridad funcional es el cumplimiento tributario y su trazabilidad.
- Debe soportar empresas, sucursales, clientes, proveedores, compras, ventas, retenciones de IVA e ISLR y, posteriormente, sujetos pasivos especiales.
- Las reglas tributarias deben ser configurables, tener vigencia y conservar su fuente; no asumir ni codificar reglas fiscales venezolanas sin validarlas.
- Proteger la separación de datos por cliente/empresa y aplicar permisos por rol desde el diseño.
- Favorecer una interfaz minimalista, con decisiones y alertas claras antes que una gran cantidad de opciones visibles.
