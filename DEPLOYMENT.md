# Trueka: salida a publico

Checklist para pasar de `localhost` a una URL publica.

## 1. Antes de publicar

- Corre todas las migraciones de Supabase hasta `0023_production_readiness_indexes.sql`.
- Confirma que existen los buckets de Storage `item-photos` y `profile-avatars`.
- Confirma que Email, Google y Facebook estan activos en Supabase Auth.
- Mantener la regla central: Trueka no maneja pagos, no gestiona envios y no media entregas.

## 2. Variables de entorno

En el proveedor donde publiques la app, configura:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=TU_LLAVE_PUBLICABLE
NEXT_PUBLIC_SITE_URL=https://TU-DOMINIO
NEXT_PUBLIC_SUPPORT_EMAIL=correo-real-de-soporte@dominio.com
```

`NEXT_PUBLIC_SITE_URL` no debe terminar con diagonal.

## 3. Railway

Trueka puede publicarse en Railway como app Next.js conectada a Supabase.

1. Sube el repo a GitHub.
2. En Railway, crea un proyecto nuevo y elige Deploy from GitHub repo.
3. Selecciona el repo de Trueka.
4. Railway leera `railway.json` para build, start, healthcheck y politica de reinicio.
5. En Variables, agrega las variables de entorno del punto anterior.
6. En Networking, genera el dominio publico de Railway.
7. Actualiza `NEXT_PUBLIC_SITE_URL` con ese dominio y redeploy.
8. En Supabase Auth, agrega el dominio final en Site URL y Redirect URLs.

El proyecto ya usa `output: "standalone"` y `npm run start` ejecuta el servidor standalone que Railway usa en produccion.
El healthcheck configurado apunta a `/api/health`.
Usa `/api/ready` despues del deploy para confirmar que la app tambien puede consultar Supabase.

## 4. URLs importantes de Trueka

Cuando tengas dominio, estas URLs ya seran publicas:

- Politica de privacidad: `https://TU-DOMINIO/legal/privacidad`
- Terminos: `https://TU-DOMINIO/legal/terminos`
- Eliminacion de datos: `https://TU-DOMINIO/legal/eliminacion-datos`
- Callback de la app: `https://TU-DOMINIO/auth/callback`
- Health check para Railway: `https://TU-DOMINIO/api/health`
- Readiness check con Supabase: `https://TU-DOMINIO/api/ready`

## 5. Supabase Auth

En Supabase > Authentication > URL Configuration:

- Site URL: `https://TU-DOMINIO`
- Redirect URLs:
  - `https://TU-DOMINIO/auth/callback`
  - `http://localhost:3000/auth/callback`

Deja `localhost` mientras sigamos probando localmente.

## 6. Google

En Google Cloud, el cliente OAuth debe apuntar al callback de Supabase:

```text
https://TU-PROYECTO.supabase.co/auth/v1/callback
```

En Supabase, el proveedor Google usa el Client ID y Client Secret de ese cliente.

## 7. Facebook / Meta

En Meta Developers, configura:

- Valid OAuth Redirect URI:
  - `https://TU-PROYECTO.supabase.co/auth/v1/callback`
- App Domains:
  - `TU-DOMINIO`
- Privacy Policy URL:
  - `https://TU-DOMINIO/legal/privacidad`
- Terms URL:
  - `https://TU-DOMINIO/legal/terminos`
- User Data Deletion URL:
  - `https://TU-DOMINIO/legal/eliminacion-datos`

Mientras la app este en modo prueba, solo admins, developers, testers o usuarios de prueba pueden entrar con Facebook.

## 8. Prueba rapida despues del deploy

1. Abrir `https://TU-DOMINIO`.
2. Entrar con correo.
3. Entrar con Google.
4. Entrar con Facebook desde una cuenta con rol de prueba.
5. Publicar un articulo con foto real.
6. Proponer trueque desde otra cuenta.
7. Aceptar solicitud, mandar chat y confirmar intercambio desde ambas cuentas.
8. Revisar que no exista ningun flujo de pago, envio gestionado o entrega mediada por Trueka.
9. Abrir `https://TU-DOMINIO/api/ready` y confirmar que `ok` sea `true`.
10. Para medir una carga ligera, usar `PRODUCTION_READINESS.md`.

## 9. Verificacion tecnica

Antes de publicar cambios:

```bash
npm run lint
npm run test
npm run build
```
