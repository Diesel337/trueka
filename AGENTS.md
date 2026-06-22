# AGENTS.md — Trueka

Lee primero `README.md` y `supabase/migrations/0001_trueka_mvp.sql`.

## Prompt de continuidad

Cuando se abra una nueva ventana de Codex para este proyecto, usar este contexto inicial:

```text
Estamos construyendo Trueka en:
C:\Users\aleja\Documents\Codex\2026-06-08\files-mentioned-by-the-user-agents

Lee AGENTS.md, README.md y supabase/migrations/0001_trueka_mvp.sql antes de tocar nada.

Estado actual:
- MVP de trueques sin pagos, sin dinero en solicitudes, sin envios gestionados y sin mediacion de entregas.
- Supabase Auth/Postgres/Storage conectado.
- Google y Facebook login activados; si el email coincide, Supabase une la identidad a la misma cuenta.
- Perfiles, publicaciones, fotos, solicitudes, chat, contraofertas, favoritos, notificaciones, admin, metricas, zonas Mexico/ZMG, codigo postal opcional para cercania, legal pages con solicitud de eliminacion de datos y onboarding ya avanzados.
- Verificacion telefonica real preparada con Supabase Phone Auth/Twilio; el perfil abre una ventana pop up para verificar telefono y arranca con lada +52.
- Etiquetas visibles de publicacion conectadas a crear/editar, detalle, matching y avisos de interes; etiquetas privadas siguen ocultas.
- Guardar borrador ya es flujo real; publicar sigue exigiendo foto y mantiene el articulo fuera de Explorar hasta activarlo.
- Perfil separa publicaciones propias por estado y muestra borradores sin foto con una accion clara para completarlos.
- Perfil muestra usuarios bloqueados y permite desbloquearlos; la regla de no interaccion entre bloqueados sigue intacta.
- Explorar, Home, perfiles publicos y solicitudes nuevas ya filtran publicaciones si existe bloqueo en cualquier sentido.
- Supabase RLS tambien oculta publicaciones, fotos y tags publicos cuando hay bloqueo en cualquier sentido.
- Admin registra historial de moderacion y permite restaurar publicaciones ocultas o desbanear usuarios.
- Publicaciones con señales de prohibidos quedan fuera de Explorar y entran a cola admin para aprobar/rechazar.
- Anti-spam basico limita solicitudes repetidas al mismo articulo, rafagas de mensajes y reportes duplicados del mismo caso.
- Las reseñas recibidas aparecen en Mi perfil, guardan criterios separados, señales positivas predeterminadas y generan notificación al usuario calificado.
- Migraciones recientes importantes: 0010 social profile sync, 0011 onboarding/interests/read tracking, 0012 interest catalog expansion, 0013 phone verification, 0014 public item tags matching, 0015 blocked item visibility, 0016 admin moderation actions, 0017 prohibited item review flow, 0018 basic rate limits, 0019 rating notifications, 0020 postal code proximity, 0021 data deletion requests, 0022 rating criteria/review tags.
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

## Reglas que no se deben romper

1. No agregar pagos entre usuarios.
2. No agregar campos de dinero en solicitudes de trueque.
3. No permitir dinero + artículo.
4. No gestionar envíos, paquetería ni entregas.
5. No permitir solicitudes sobre artículos propios.
6. No permitir interacción entre usuarios bloqueados.
7. No exponer públicamente las etiquetas privadas.
8. No completar dos trueques distintos con el mismo artículo.
9. No permitir artículos prohibidos sin moderación.

## Idioma

- Código, tablas y funciones: inglés.
- Interfaz y documentación de producto: español mexicano claro.

## Stack

- Next.js + TypeScript.
- Supabase Auth/Postgres/Storage.
- RLS para permisos.
- Tailwind CSS.

## Validaciones mínimas

Mantener checks o pruebas para:

- solicitud sin dinero;
- solicitud con al menos un artículo ofrecido;
- no solicitar artículo propio;
- no ofrecer artículos ajenos;
- no interactuar con bloqueados;
- no completar trueques si algún artículo ya no está disponible;
- ocultar tags privados al público.
