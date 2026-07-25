# Trueka: operacion e incidentes

Guia rapida para operar Trueka cuando ya hay usuarios reales.

La regla central no cambia durante incidentes: no agregar pagos, dinero en solicitudes, envios gestionados, entregas mediadas ni excepciones manuales que rompan bloqueos o moderacion.

## Chequeo diario

- Abrir `/api/health` y confirmar `ok: true`.
- Abrir `/api/ready` y confirmar `ok: true`.
- Revisar logs de Railway buscando `ready_database_error`, `ready_missing_supabase_config` o errores 5xx.
- Revisar Supabase para picos de Auth, Database, Storage y API.
- Revisar Admin de Trueka: reportes abiertos, publicaciones en revision y solicitudes de eliminacion de datos.

## Alertas minimas

Configura alertas o revisiones manuales para:

- `/api/health` no responde.
- `/api/ready` responde 503 o tarda demasiado.
- Railway reinicia el servicio mas de una vez en pocos minutos.
- Supabase muestra picos de CPU, conexiones, errores 4xx/5xx o limites de Auth.
- Fallan subidas al bucket `item-photos` o `profile-avatars`.
- Crecen reportes abiertos, publicaciones prohibidas en revision o solicitudes de eliminacion sin atender.

El workflow de GitHub Actions `Production uptime` consulta `/api/health` y
`/api/ready` cada 15 minutos. Si falla, GitHub marca la ejecucion en rojo y
envia las notificaciones configuradas para Actions en la cuenta o repositorio.
Tambien se puede ejecutar manualmente desde la pestana Actions.

El workflow `Quality checks` valida cada cambio enviado a `main` y cada pull
request con lint, pruebas, compilacion y auditoria de dependencias de produccion.

## Logs utiles

Los endpoints de salud devuelven y registran:

- `requestId`: id para cruzar una respuesta con un log.
- `deploymentId`: despliegue de Railway, si esta disponible.
- `commitSha`: commit del deploy, si Railway lo expone.
- `environment`: ambiente de Railway o `NODE_ENV`.
- `latencyMs`: tiempo de respuesta del chequeo.

Los logs se emiten como JSON y redactan campos sensibles como email, telefono, tokens, cookies, llaves y passwords.

## Respuesta por tipo de incidente

### La app no abre

1. Revisar `/api/health`.
2. Si falla, abrir Railway Deploy Logs y buscar errores de arranque.
3. Confirmar variables `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` y `NEXT_PUBLIC_SUPPORT_EMAIL`.
4. Si el ultimo deploy fallo, volver al deploy anterior desde Railway.

### La app abre pero login/datos fallan

1. Revisar `/api/ready`.
2. Si responde 503, buscar `ready_database_error` en Railway Logs.
3. Confirmar que Supabase este activo y que las migraciones esten corridas.
4. Revisar Auth URL Configuration si el problema pasa despues de login social.

### Explorar esta lento

1. Correr la prueba ligera:

```bash
TRUEKA_BASE_URL=https://trueka-production.up.railway.app npm run smoke:prod
```

2. Revisar Performance Advisor en Supabase.
3. Revisar filtros usados por usuarios: texto, categoria, ciudad, codigo postal y guardados.
4. Si la lentitud empezo despues de una migracion, revisar el ultimo commit y los indices.

### Fotos no suben o no aparecen

1. Confirmar buckets `item-photos` y `profile-avatars`.
2. Revisar politicas de Storage.
3. Confirmar que el archivo no exceda el limite de la app.
4. Revisar logs de acciones de publicacion o edicion.

### Reportes o prohibidos se acumulan

1. Entrar a Admin.
2. Priorizar articulos con senales de prohibidos.
3. Resolver reportes con nota interna clara.
4. No restaurar publicaciones prohibidas sin revision real.

## Despues de resolver

- Confirmar `/api/health` y `/api/ready`.
- Probar flujo basico: entrar, explorar, abrir publicacion, guardar, proponer trueque.
- Anotar causa, hora, commit/deploy y accion tomada.
- Si hubo datos afectados, revisar si hay que avisar a usuarios.
