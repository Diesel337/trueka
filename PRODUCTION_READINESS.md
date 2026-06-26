# Trueka: preparacion para trafico

Este checklist es para pasar de "la app funciona" a "la app puede recibir campanas, usuarios nuevos y picos controlados".

Trueka mantiene su regla central: articulos por articulos, sin pagos, sin dinero en solicitudes, sin envios gestionados y sin mediacion de entregas.

## Antes de meter trafico fuerte

- Corre todas las migraciones hasta `0023_production_readiness_indexes.sql`.
- Confirma que Railway este en un plan con recursos suficientes para no dormir ni reiniciar por falta de memoria.
- Confirma que Supabase este en un plan con backups, recursos suficientes y alertas visibles.
- Revisa Supabase Performance Advisor despues de tener datos reales; los indices de `0023` cubren rutas calientes iniciales, pero el trafico real manda.
- Activa correo propio en Supabase Auth para no depender de limites bajos del SMTP compartido.
- Revisa limites de Auth: correo, OTP, SMS y proveedores sociales.
- Mantener RLS activo en tablas publicas y probar que usuarios bloqueados no se vean ni interactuen.
- Confirma que Storage tenga los buckets `item-photos` y `profile-avatars`.
- Ten lista una cuenta admin para moderacion, reportes y solicitudes de eliminacion de datos.

## Checks despues de cada deploy

Abre:

- `/api/health`: confirma que el servidor Next.js responde.
- `/api/ready`: confirma que el servidor responde y puede consultar Supabase.

En Railway, el healthcheck puede seguir usando `/api/health`. Si `/api/ready` falla, la app puede prender pero no esta lista para usuarios reales.

Para respuesta a incidentes, alertas y revision diaria usa `OPERATIONS.md`.

## Prueba de humo con trafico ligero

Antes de una publicacion fuerte, corre una medicion corta contra la URL publica:

```bash
TRUEKA_BASE_URL=https://trueka-production.up.railway.app npm run smoke:prod
```

Para subir un poco la presion:

```bash
TRUEKA_BASE_URL=https://trueka-production.up.railway.app TRUEKA_SMOKE_CONCURRENCY=12 TRUEKA_SMOKE_DURATION_SECONDS=60 npm run smoke:prod
```

Que buscamos:

- Cero errores 5xx.
- `/api/ready` respondiendo en verde.
- p95 estable. Si p95 sube mucho con poca concurrencia, hay que revisar logs y consultas antes de traer mas gente.

## Senales de que hay que escalar

- Railway reinicia el servicio o se queda sin memoria.
- Supabase muestra CPU, conexiones o tiempos altos.
- La pagina Explorar tarda mucho al buscar texto o filtrar.
- Subir fotos se vuelve lento o falla.
- Auth empieza a limitar correos, OTP o SMS.
- Moderacion/reportes crecen mas rapido que la capacidad de responderlos.

## Prioridad operativa

1. Estabilidad: deploy, health, ready, logs y backups.
2. Base de datos: indices, Performance Advisor y consultas lentas.
3. Auth: correo propio, limites y proveedores.
4. Moderacion: reportes, prohibidos, bloqueos y eliminacion de datos.
5. Crecimiento: campanas pequenas primero; medir, ajustar y subir.
