# Trueka: verificacion telefonica

Trueka ya tiene el flujo base para verificar telefono con Supabase Phone Auth:

1. El usuario escribe su telefono en Perfil.
2. Supabase envia un codigo OTP por SMS.
3. El usuario captura el codigo.
4. Si Supabase confirma el OTP, Trueka marca `phone_verified = true`.

## Migracion requerida

Corre:

```sql
supabase/migrations/0013_phone_verification.sql
```

La migracion agrega:

- `phone_last4`
- `phone_verified_at`
- `phone_verification_started_at`

Trueka no guarda ni muestra el numero completo en `profiles`; solo los ultimos 4 digitos para que el usuario reconozca que telefono verifico.

## Configuracion necesaria en Supabase

En Supabase Auth hay que activar Phone/SMS y configurar un proveedor compatible.

Opciones razonables:

- Supabase Phone Auth con proveedor SMS configurado.
- Twilio Verify, si se decide migrar a proveedor propio mas adelante.
- WhatsApp Business API, cuando tenga sentido operativo.

Para fase 1, SMS con Supabase es lo mas directo.

## Interfaz

Perfil propio:

- Muestra estado pendiente/verificado.
- Permite enviar codigo.
- Permite confirmar codigo.
- Si el telefono esta verificado, muestra solo `termina en 1234`.

Perfil publico, cards y articulo:

- Muestran `Telefono verificado` solo si el codigo fue confirmado.
- No muestran telefono completo.

## Reglas de seguridad

- No mostrar telefono completo en perfiles, solicitudes ni chat.
- No usar telefono para pagos, envios gestionados ni entregas.
- Mantener bloqueo entre usuarios: si estan bloqueados, no hay interaccion aunque ambos esten verificados.
- Supabase controla caducidad, intentos y validacion del OTP; si se cambia a proveedor propio, se deben agregar limites de intentos por usuario/telefono.

## Prueba rapida

1. Corre migracion `0013`.
2. Activa SMS en Supabase Auth.
3. Entra a `/profile`.
4. Escribe telefono con lada, por ejemplo `+52 33 1234 5678`.
5. Da click en `Enviar codigo`.
6. Captura el codigo recibido.
7. Confirma que aparece `Telefono verificado`.
