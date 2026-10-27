# Nakecloud Eventos

Registro a eventos de la comunidad Nakecloud: link para historias, pago con Wompi, pase con QR y escáner en la puerta.

## Qué hay

| Ruta | Para quién | Qué hace |
| --- | --- | --- |
| `/` | Público | Lleva al próximo evento con inscripciones abiertas |
| `/e/<evento>` | Público | Portada, elegir entrada, datos y pago |
| `/pase/<código>` | Asistente | Pase con QR, guardar QR, calendario, compartir |
| `/admin` | Equipo | Eventos, registros, cobros manuales, resumen, CSV |
| `/admin/puerta` | Equipo | Escáner con la cámara del celular |
| `/api/wompi/webhook` | Wompi | Confirma pagos automáticamente |

## Publicar en Vercel

1. **Importar:** en Vercel, *Add New → Project* e importa este repositorio. Framework: Next.js (se detecta solo).
2. **Base de datos:** en el proyecto, pestaña *Storage → Create Database → Neon (Postgres)* y conéctala al proyecto. Esto crea `DATABASE_URL`. Las tablas se crean solas en la primera visita.
3. **Variables** (*Settings → Environment Variables*):

   | Variable | Valor |
   | --- | --- |
   | `ADMIN_PASSWORD` | La contraseña del panel para el equipo |
   | `SESSION_SECRET` | Una cadena larga al azar (40+ caracteres) |
   | `WOMPI_PUBLIC_KEY` | Llave pública de Wompi (`pub_test_…` para pruebas) |
   | `WOMPI_INTEGRITY_SECRET` | Secreto de *Integridad* |
   | `WOMPI_EVENTS_SECRET` | Secreto de *Eventos* |
   | `SITE_URL` | Opcional: tu dominio, ej. `https://eventos.nakecloud.co` |

   En Wompi están en *Desarrolladores → Secretos para integración técnica*.
4. **Redeploy** para que tome las variables.
5. **Webhook en Wompi:** en *Desarrolladores → URL de eventos* pon `https://TU-DOMINIO/api/wompi/webhook` (una para pruebas y otra para producción).

## Pasar a pagos reales

Cambia las tres variables de Wompi por las de producción (`pub_prod_…` y sus secretos), configura la URL de eventos de producción y haz redeploy. El panel avisa mientras estés en modo de pruebas.

## Cómo se confirma un pago

- Al volver de Wompi, el sitio consulta la transacción directamente en la API de Wompi.
- Además, Wompi avisa al webhook; la firma se valida con `WOMPI_EVENTS_SECRET`.
- Solo se marca **Pagado** si el estado es `APPROVED` y el monto y la moneda coinciden con la entrada.
