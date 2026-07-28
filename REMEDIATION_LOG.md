# Bitacora de correcciones de Trueka

Inicio: 2026-07-24

Base revisada: `d9f4913`

## Estados

- `Pendiente`: hallazgo confirmado, aun sin cambio aplicado.
- `En curso`: correccion en implementacion.
- `Corregido`: cambio implementado en codigo o migracion.
- `Verificado`: cambio implementado y cubierto por validaciones.
- `Pendiente externo`: requiere configuracion fuera del repositorio.

## Resumen

| ID | Prioridad | Tema | Estado |
| --- | --- | --- | --- |
| SEC-01 | Critica | Proteger campos de confianza y administracion del perfil | Corregido |
| SEC-02 | Critica | Impedir cambios directos de estado y moderacion de articulos | Corregido |
| SEC-03 | Critica | Impedir cambios directos del flujo de solicitudes | Corregido |
| SEC-04 | Alta | Restringir cargas y acceso de Storage | Corregido |
| SEC-05 | Alta | Evitar exposicion de codigo postal y datos telefonicos | Corregido |
| AUTH-01 | Alta | Corregir redireccion posterior al login | Verificado |
| AUTH-02 | Alta | Renovar sesiones con Proxy de Supabase | Verificado |
| DEP-01 | Alta | Actualizar dependencias de produccion con vulnerabilidades conocidas | Verificado |
| PERF-01 | Alta | Paginar publicaciones y eliminar consultas N+1 | Corregido |
| ABUSE-01 | Media | Hacer atomico el limite anti-spam y cerrar bypass directo | Corregido |
| OPS-01 | Media | Agregar encabezados de seguridad | Verificado |
| OPS-02 | Media | Vigilar disponibilidad real de Supabase | Corregido |
| QA-01 | Alta | Agregar pruebas de autorizacion, auth y regresion | Verificado |
| EXT-01 | Critica | Ejecutar migraciones 0024 y 0025 en Supabase | Verificado |
| REG-01 | Alta | Restaurar guardado de perfil tras ocultar columnas privadas | Verificado |
| REG-02 | Alta | Permitir cerrar una negociacion aceptada no realizada | Corregido |
| OPS-03 | Media | Verificar GitHub Actions y monitor de produccion | Verificado |
| EXT-02 | Baja | Proteger main cuando el flujo adopte ramas y PR | Pendiente externo |
| DEP-02 | Baja | Avisos de auditoria en herramientas de desarrollo de ESLint | Pendiente externo |
| QA-02 | Alta | Probar escritura autenticada despues del endurecimiento RLS | En curso |
| UX-01 | Media | Auditoria visual actual en escritorio y movil | Pendiente externo |

## Registro

### 2026-07-24 - Revision general

- Se confirmaron las reglas centrales del producto.
- `npm run lint`, `npm run test` y `npm run build` pasaron antes de iniciar cambios.
- La prueba de humo de produccion completo 328 solicitudes sin fallos bajo carga ligera.
- `npm audit` reporto tres vulnerabilidades altas en Next.js, PostCSS y Sharp.
- No se encontraron secretos versionados.
- La auditoria visual actual requiere autorizacion para usar Playwright porque el navegador integrado no esta disponible.

### 2026-07-24 - Correcciones implementadas

- Se agregaron las migraciones `0024_security_hardening.sql` y
  `0025_profile_privacy.sql`.
- Los perfiles ya no pueden modificar directamente reputacion, permisos,
  sanciones ni verificaciones sin respaldo de Auth.
- Los articulos intercambiados no se pueden reactivar y las transiciones de
  publicacion quedan validadas en la base de datos.
- Las solicitudes, mensajes, reportes y contraofertas quedan protegidos por
  reglas de participantes, bloqueos, sanciones y limites atomicos.
- Storage queda privado, con limites de tipo/tamano y rutas ligadas al
  propietario. Las fotos se sirven mediante `/api/media`.
- El codigo postal publico se reduce a zona de tres digitos; el codigo exacto y
  los metadatos telefonicos quedan fuera de consultas publicas.
- Se corrigieron redirecciones de Auth y se agrego renovacion SSR de sesiones.
- Explorar, portada, perfiles y Admin usan consultas acotadas; Explorar cuenta
  con paginacion.
- Se agregaron encabezados web defensivos, CI y comprobacion de disponibilidad
  cada 15 minutos.
- Los errores de acciones ya no muestran detalles internos de SQL o Storage.
- Validacion final: lint aprobado, 54 pruebas aprobadas, build aprobado y
  `npm audit --omit=dev` con cero vulnerabilidades.
- El paquete standalone de Railway respondio `200` en portada y `/api/health`;
  tambien envio CSP, HSTS y proteccion contra iframes. `/api/ready` respondio
  `503` de forma esperada porque no existen variables locales de Supabase, sin
  exponer datos sensibles.

### Pendientes externos

- Confirmar que GitHub Actions esta habilitado y que llegan notificaciones de
  fallos del workflow `Production uptime`.
- Activar proteccion de la rama `main` para exigir `Quality checks` antes de
  integrar cambios, si el plan de GitHub lo permite.
- Ejecutar pruebas integradas de RLS contra una base de prueba o staging. Las
  pruebas actuales validan las reglas y la presencia de defensas en migraciones,
  pero no sustituyen una base aislada.
- Autorizar una sesion de Playwright para la auditoria visual final en movil y
  escritorio.
- El audit completo conserva avisos altos solo en dependencias transitivas de
  ESLint. La actualizacion automatica disponible rompe plugins de
  `eslint-config-next`; produccion no incluye esas dependencias y su audit esta
  limpio.

### 2026-07-24 - Verificacion posterior a migraciones

- El usuario confirmo la ejecucion de `0024_security_hardening.sql` y
  `0025_profile_privacy.sql` en Supabase.
- Railway desplego correctamente el commit `6dbf60d`; `/api/health` y
  `/api/ready` respondieron `200` con base de datos disponible.
- Portada, Explorar, perfil publico y detalle de publicacion respondieron sin
  errores. Explorar caliente respondio entre 0.4 y 1 segundo.
- La carga ligera completo 117 solicitudes con cero fallos: p50 293 ms,
  p95 4.393 s y maximo 15.574 s. Los picos de portada quedan bajo vigilancia.
- Una consulta anonima puede leer nombre publico, pero recibe `401` al pedir
  `postal_code` o `phone_last4` de perfiles.
- El bucket `item-photos` ya no acepta URLs publicas nuevas; la ruta protegida
  de Trueka entrego una foto real con estado `200`.
- Una URL publica antigua pudo responder desde cache CDN; una consulta con
  cache nuevo fue rechazada. La copia anterior debe expirar por su TTL.
- Falta probar con sesion iniciada: actualizar perfil, publicar/editar una
  publicacion, enviar una solicitud y abrir chat.

### 2026-07-27 - Regresion de guardado de perfil

- La prueba manual autenticada detecto que el perfil ya no se podia guardar
  despues de limitar las columnas privadas en `0025_profile_privacy.sql`.
- La migracion `0026_profile_write_rpcs.sql` reemplaza las escrituras directas
  del usuario por funciones cerradas para datos de perfil, onboarding, correo y
  telefono.
- Las nuevas funciones validan la sesion, bloqueos, longitudes, codigo postal y
  propiedad de la foto. No aceptan reputacion, permisos, sanciones ni otros
  campos de confianza como parametros.
- La aplicacion ya usa esas funciones y conserva la limpieza de una foto subida
  si el guardado falla.
- El usuario ejecuto `0026`; Railway desplego el commit `a79c2c9` y reporto
  estado exitoso. Portada, `/api/health` y `/api/ready` respondieron `200`.
- La prueba manual autenticada guardo el perfil y mostro
  `Perfil actualizado.`. `REG-01` queda verificado; `QA-02` continua hasta
  comprobar publicacion, solicitud y chat.
- La prueba manual autenticada tambien edito una publicacion activa y guardo
  los cambios correctamente. El flujo de publicaciones queda comprobado.
- La segunda cuenta publico otro articulo activo; Explorar mostro las dos
  publicaciones y permitio enviar una propuesta entre cuentas ofreciendo el
  articulo propio.
- La primera cuenta acepto la solicitud y el chat funciono en ambas sesiones.
  La prueba revelo que una negociacion aceptada no tenia una salida si el
  intercambio no ocurria, por lo que los articulos podian quedar apartados.

### 2026-07-27 - Salida de negociaciones no realizadas

- La migracion `0027_accepted_negotiation_exit.sql` reserva atomicamente los
  articulos cuando una solicitud queda aceptada.
- Cualquiera de las dos personas puede terminar una negociacion aceptada
  mientras nadie haya confirmado que el intercambio si ocurrio.
- Al terminarla, la solicitud queda cancelada, el chat deja de aceptar mensajes
  y los articulos reservados vuelven a estar activos si ninguna otra
  negociacion aceptada aun los usa.
- La interfaz exige confirmar expresamente que el intercambio no se realizo y
  explica que el trueque no contara como completado.
- Validacion local aprobada: lint, 60 pruebas, build de produccion y respuestas
  `200` en portada y `/api/health` desde el paquete standalone.
- Falta ejecutar la migracion, desplegar y terminar la negociacion de prueba
  desde una de las dos cuentas para verificar `REG-02`.

### 2026-07-27 - Verificacion operativa de GitHub

- `Quality checks` se ejecuto por el push de `a79c2c9` y termino exitosamente:
  lint, pruebas, build y auditoria de dependencias de produccion.
- `Production uptime` registra 44 ejecuciones programadas; las diez mas
  recientes consultadas terminaron correctamente.
- Railway reporto exitoso el mismo commit y expone su identificador en los
  endpoints de salud.
- `main` acepta pushes directos. La proteccion con checks obligatorios se
  reserva para cuando el proyecto adopte ramas y pull requests, evitando
  complicar por ahora el flujo de una sola persona.

## Criterios de cierre

### SEC-01 / SEC-02 / SEC-03

- Un usuario no puede cambiar directamente verificaciones, reputacion, permisos o sanciones.
- Un usuario no puede reactivar un articulo intercambiado ni aprobar su propia moderacion.
- Una solicitud solo cambia de estado mediante las funciones y transiciones permitidas.
- La confirmacion doble sigue siendo obligatoria.

### SEC-04 / SEC-05

- Las cargas quedan ligadas al propietario y a rutas controladas.
- Se validan limites de tipo y tamano desde Storage, no solo desde la interfaz.
- Codigo postal y metadatos telefonicos no se pueden consultar publicamente.
- Las etiquetas ocultas siguen sin exponerse.

### AUTH-01 / AUTH-02

- Ningun valor de `next` puede redirigir a otro dominio.
- Las sesiones se renuevan de acuerdo con el flujo SSR recomendado por Supabase.

### PERF-01

- Explorar y portada consultan una cantidad acotada de registros.
- La cercania y los filtros no requieren cargar todo el catalogo.
- No se realiza una llamada de bloqueo por cada propietario.

### ABUSE-01

- El consumo del limite ocurre atomicamente.
- Mensajes, reportes y solicitudes no pueden evitar el limite usando la API directa.

### OPS-01 / OPS-02

- La aplicacion envia encabezados web defensivos.
- Existe una comprobacion y alerta externa sobre `/api/ready`.

### QA-01

- Las nuevas restricciones tienen pruebas automatizadas.
- `npm run lint`, `npm run test`, `npm run build` y la prueba de humo pasan.
