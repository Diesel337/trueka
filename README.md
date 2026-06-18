# Trueka MVP

Trueka es una web app para intercambiar artículos entre personas. No es marketplace de compra/venta.

## Reglas de producto

- No hay pagos entre usuarios.
- No hay dinero en solicitudes de trueque.
- No hay dinero + artículo.
- No hay envíos gestionados, paquetería ni mediación de entregas.
- Las solicitudes ofrecen uno o varios artículos propios por un artículo publicado por otra persona.
- Las etiquetas privadas ayudan al matching y no se muestran completas públicamente.

## Stack

- Next.js 16
- TypeScript
- Tailwind CSS
- Supabase Auth/Postgres/Storage preparado
- RLS en migraciones
- Vitest para reglas críticas

## Correr localmente

```bash
npm install
npm run dev
```

Abre `http://localhost:3000`.

## Supabase

Configura estas variables para activar auth y persistencia real:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

La migración inicial vive en `supabase/migrations/0001_trueka_mvp.sql`.

Para probar cuentas reales:

1. Crea un proyecto en Supabase y corre la migración inicial.
2. En Auth, configura `Site URL` como `http://localhost:3000`.
3. En Auth, agrega `http://localhost:3000/auth/callback` a las URLs de redirección permitidas.
4. Activa Email, Google y Facebook como proveedores de inicio de sesión.
5. Para Instagram en este MVP, usa el flujo de Facebook/Meta con una cuenta vinculada.
6. Crea el bucket de Storage `item-photos` para las fotos de publicaciones.

Trueka sigue siendo trueque de artículos por artículos: no hay pagos entre usuarios, no hay dinero en solicitudes y la plataforma no gestiona envíos ni entregas.

## Verificación

```bash
npm run lint
npm run test
npm run build
```

## Deploy

El checklist para publicar Trueka y configurar Supabase, Google y Facebook vive en
`DEPLOYMENT.md`.

## Verificacion telefonica

El flujo base para telefono verificado con Supabase Phone Auth vive en `PHONE_VERIFICATION.md`.
No se muestra telefono como verificado hasta tener confirmacion real por codigo.

## Estado actual del MVP

- Auth real con Supabase, correo/contrasena, Google y Facebook.
- Perfiles con foto, intereses privados, metricas, reputacion y verificacion telefonica preparada.
- Publicaciones con fotos obligatorias, categorias, estado fisico del articulo, zonas de Mexico y favoritos.
- Etiquetas visibles en publicaciones para discovery/matching, separadas de etiquetas privadas.
- Borradores de publicaciones: no aparecen en Explorar y requieren foto real antes de publicarse.
- Perfil organiza tus publicaciones por estado: activas, borradores, pausadas, en negociacion e intercambiadas.
- Exploracion con filtros por texto, categoria, estado, municipio/zona, fecha, nombre, verificados y guardados.
- Solicitudes separadas entre recibidas/enviadas, chat, contraofertas, aceptacion y confirmacion final por ambas personas.
- Notificaciones con campana, panel, estados de visto/leido, reseñas recibidas y links a la accion correspondiente.
- Bloqueos gestionables desde Perfil: ver bloqueados y desbloquear sin reabrir historial.
- Explorar y detalle de publicaciones ocultan usuarios bloqueados en cualquier sentido.
- Supabase RLS tambien oculta publicaciones, fotos y tags publicos cuando hay bloqueo.
- Publicaciones con señales de articulos prohibidos quedan en revision antes de aparecer en Explorar.
- Anti-spam basico limita solicitudes repetidas al mismo articulo, rafagas de mensajes y reportes duplicados.
- Las reseñas recibidas aparecen en Mi perfil y generan notificación al usuario calificado.
- Admin para moderacion, reportes, usuarios, publicaciones, reversión de acciones e historial.
- Legal pages: privacidad, terminos y eliminacion de datos.
- Regla central intacta: Trueka no maneja pagos, no gestiona envios y no media entregas.

## Migraciones recientes importantes

- `0010_social_profile_sync.sql`: sincroniza nombre, avatar y correo verificado desde Auth.
- `0011_onboarding_interests_and_trade_read_tracking.sql`: onboarding, intereses privados y lectura de trueques.
- `0012_interest_catalog_expansion.sql`: catalogo ampliado de intereses/categorias.
- `0013_phone_verification.sql`: columnas para verificacion telefonica real por OTP.
- `0014_public_item_tags_matching.sql`: etiquetas visibles de publicacion para matching y avisos de interes.
- `0015_blocked_item_visibility.sql`: RLS para ocultar publicaciones, fotos y tags publicos si hay bloqueo.
- `0016_admin_moderation_actions.sql`: historial admin para ocultar/restaurar publicaciones y banear/desbanear usuarios.
- `0017_prohibited_item_review_flow.sql`: cola admin para aprobar/rechazar publicaciones con señales de prohibidos.
- `0018_basic_rate_limits.sql`: contadores anti-spam para solicitudes, mensajes y reportes repetitivos.
- `0019_rating_notifications.sql`: avisa cuando una persona recibe una reseña de un trueque completado.

## Prompt para continuar en nueva ventana

```text
Estamos construyendo Trueka en:
C:\Users\aleja\Documents\Codex\2026-06-08\files-mentioned-by-the-user-agents

Lee AGENTS.md, README.md y supabase/migrations/0001_trueka_mvp.sql antes de tocar nada.

Estado actual:
- MVP de trueques sin pagos, sin dinero en solicitudes, sin envios gestionados y sin mediacion de entregas.
- Supabase Auth/Postgres/Storage conectado.
- Google y Facebook login activados; si el email coincide, Supabase une la identidad a la misma cuenta.
- Perfiles, publicaciones, fotos, solicitudes, chat, contraofertas, favoritos, notificaciones, admin, metricas, zonas Mexico/ZMG, legal pages y onboarding ya avanzados.
- Verificacion telefonica real preparada con Supabase Phone Auth/Twilio; el perfil abre una ventana pop up para verificar telefono y arranca con lada +52.
- Etiquetas visibles de publicacion conectadas a crear/editar, detalle, matching y avisos de interes; etiquetas privadas siguen ocultas.
- Guardar borrador ya es flujo real; publicar sigue exigiendo foto y mantiene el articulo fuera de Explorar hasta activarlo.
- Perfil separa publicaciones propias por estado y muestra borradores sin foto con una accion clara para completarlos.
- Perfil muestra usuarios bloqueados y permite desbloquearlos; la regla de no interaccion entre bloqueados sigue intacta.
- Explorar, Home, perfiles publicos y solicitudes nuevas ya filtran publicaciones si existe bloqueo en cualquier sentido.
- Supabase RLS tambien oculta publicaciones, fotos y tags publicos cuando hay bloqueo en cualquier sentido.
- Admin registra historial de moderacion y permite restaurar publicaciones ocultas o desbanear usuarios.
- Publicaciones con señales de prohibidos quedan fuera de Explorar y entran a cola admin para aprobar/rechazar.
- Anti-spam basico limita solicitudes repetidas al mismo articulo, rafagas de mensajes en la misma solicitud y reportes duplicados del mismo caso.
- Las reseñas recibidas aparecen en Mi perfil y generan notificación al usuario calificado.
- Migraciones recientes importantes: 0010 social profile sync, 0011 onboarding/interests/read tracking, 0012 interest catalog expansion, 0013 phone verification, 0014 public item tags matching, 0015 blocked item visibility, 0016 admin moderation actions, 0017 prohibited item review flow, 0018 basic rate limits, 0019 rating notifications.
- Ultimas validaciones conocidas: npm run lint, npm run test y npm run build pasaron.

Reglas centrales:
- No agregar pagos.
- No dinero en solicitudes.
- No dinero + articulo.
- No gestionar envios, paqueteria ni entregas.
- No solicitar articulos propios.
- No interactuar con bloqueados.
- No exponer tags privados.
- No completar dos trueques con el mismo articulo.
- Prohibidos solo con moderacion.

Quiero seguir desde el estado actual, revisar que falta y continuar con el siguiente bloque del producto.
```
