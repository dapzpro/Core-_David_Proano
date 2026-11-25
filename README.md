# Plataforma de Gestión de Eventos con Aforo Limitado

Aplicación web full stack para gestionar eventos (conciertos, teatro, deportes, conferencias) con **aforo limitado por zonas de entrada**, control de acceso por roles y, como núcleo del proyecto, un **motor de valoración de eventos** que genera ofertas de patrocinio para stakeholders.

| | |
|---|---|
| **Autor** | David Proaño |
| **Universidad** | Universidad de las Américas (UDLA) — Ingeniería Web |
| **Docente** | _Escribe aquí el nombre del docente_ |
| **Repositorio** | https://github.com/dapzpro/Core-_David_Proano |

### Demo desplegada

| Servicio | URL |
|---|---|
| Frontend (Vercel) | _pega aquí la URL de Vercel_ |
| Backend / API (Render) | https://core-david-proano.onrender.com |
| Base de datos | PostgreSQL en Neon |

> El backend usa el plan gratuito de Render, que se duerme tras un rato sin uso: la **primera petición puede tardar 1 a 3 minutos** en responder.

---

## 1. Descripción y core del proyecto

La plataforma conecta cuatro tipos de usuarios:

- **Administrador:** gestiona categorías, eventos, zonas de entrada (aforo y precio) y artistas; modera reseñas; configura rangos de aforo y tarifas; publica ofertas de patrocinio.
- **Personal de puerta:** escanea el QR de cada entrada desde el navegador del celular.
- **Asistente:** se registra, se inscribe en una zona (con lista de espera si está llena), ve su QR y reseña los eventos a los que asistió.
- **Stakeholder (patrocinador):** ve el ranking de eventos recomendados con sus métricas y acepta o rechaza ofertas.

**Core: motor de valoración de eventos y oferta a stakeholders.** Cruza seis tablas (`eventos`, `zonas_entrada`, `inscripciones`, `resenas`, `artistas`, `eventos_artistas`) para calcular el valor de cada evento:

1. **Ocupación** = asistentes con ingreso validado por QR / aforo total × 100.
2. **Calificación** = promedio de reseñas aprobadas (escala 1-5) / 5 × 100.
3. **Popularidad media de artistas** (ocupación, calificación, rapidez de agotamiento y tendencia de sus eventos anteriores).
4. **Índice de valor** = 35 % ocupación + 25 % calificación + 40 % popularidad de artistas.
5. **Precio del paquete de patrocinio** = tarifa base de la categoría de aforo × (1 + índice de valor / 100).

Los datos son confiables porque la asistencia se mide con el check-in por QR y solo reseñan quienes realmente ingresaron (una reseña por inscripción). **Por eso el aforo es un dato sensible**: toda la ocupación se calcula a partir de él.

## 2. Estado del proyecto

Todo el alcance del core está implementado y probado (88 pruebas automatizadas de backend de punta a punta, más una prueba de interfaz en navegador real).

| Módulo | Estado |
|---|---|
| Registro, login con JWT y 4 roles (admin, asistente, personal de puerta, stakeholder) | Implementado |
| Categorías, eventos y zonas de entrada (aforo y precio) | Implementado |
| Inscripción con **bloqueo de fila** (nunca se supera el aforo), **lista de espera** y promoción automática al cancelar | Implementado |
| Entrada con **código QR** de un solo uso y **check-in** desde el navegador del celular (cámara o código manual) | Implementado |
| Reseñas (una por inscripción, solo quien ingresó) y moderación del admin (aprobar, rechazar, responder) | Implementado |
| Artistas, asignación a eventos y comparación con tendencia (en alza / en baja) | Implementado |
| **Motor de valoración**: índice de valor, categorías de aforo configurables, precio del paquete | Implementado |
| Stakeholders y ofertas de patrocinio (publicar, aceptar, rechazar) | Implementado |
| Datos de demostración (carga y borrado desde Ajustes) | Implementado |
| Despliegue (Neon + Render + Vercel) | Configurado, ver sección 9 |

## 3. Cumplimiento de los requisitos del curso

### Requisito 1: validación en el back-end de un dato sensible, antes de grabar en la BD

Las reglas se ejecutan siempre en el servidor, aunque alguien llame a la API directamente sin pasar por React.

**a) Aforo y precio de zonas** ([`events.service.ts`](backend/src/events/events.service.ts)): el aforo alimenta toda la ocupación del core, por eso es el dato sensible principal.

| Regla | Respuesta si se incumple |
|---|---|
| No se pueden crear, editar ni eliminar zonas ni modificar el evento si este ya inició (las métricas de ocupación dependen del aforo) | 400 |
| El aforo es un entero entre 1 y 100 000; el precio no puede ser negativo | 400 |
| El nombre de la zona es único dentro del evento | 409 |
| La fecha de fin es posterior a la de inicio, y un evento nuevo debe comenzar en el futuro | 400 |
| La categoría y el evento referenciados deben existir | 400 / 404 |
| Solo el administrador crea, edita o elimina (guard de roles) | 403 |

**b) Rangos de aforo y tarifas base** ([`valuation.service.ts`](backend/src/core/valuation.service.ts), `PUT /valuation/ranges`): definen el precio de los paquetes de patrocinio. El servidor rechaza con 400 si el primer rango no empieza en 0, si hay huecos o traslapes, si el último rango tiene límite superior, si hay nombres repetidos o si una tarifa es negativa.

**c) Precio de las ofertas**: el administrador solo elige evento y patrocinador; el **precio y el índice los calcula el servidor**, nunca se aceptan desde el navegador.

Ejemplo (Postman) con un evento que ya inició: `PATCH /zones/1` con `{"aforo": 9999}` responde **400** con *"El evento ya inició: no se pueden modificar sus datos ni sus zonas…"*.

### Requisito 2: referencias a otras tablas con dropdowns en cascada

En la pantalla principal ([`frontend/src/pages/Eventos.jsx`](frontend/src/pages/Eventos.jsx)):

1. **Categoría:** se carga al abrir la página (`GET /categories`).
2. **Evento:** el select está deshabilitado hasta elegir categoría y, al elegirla, se carga con **solo los eventos de esa categoría** (`GET /events?categoryId=`).
3. **Zona:** al elegir el evento se cargan **sus zonas** con cupos disponibles (`GET /registrations/availability?eventId=`); la zona elegida determina el precio y el botón de inscripción.

Al cambiar de categoría se reinician el evento y las zonas. Al crear un evento, la categoría se elige por dropdown (nunca se escribe el id), y el backend verifica que exista. Lo mismo ocurre al asignar artistas a un evento (lista de selección) y al ofrecer un paquete (dropdown de patrocinadores).

### Requisito 3: Git, README y despliegue

- Código versionado en este repositorio, con commits por etapa (base, backend de eventos, configuración para despliegue, frontend).
- Este README documenta instalación, variables de entorno, API y despliegue.
- Pasos de despliegue en la sección 9.

## 4. Tecnologías

| Capa | Tecnología |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS v4, React Router, Axios, `qrcode` (generar QR) y `jsqr` (leer QR con la cámara) |
| Backend | NestJS 11 (TypeScript), TypeORM, Passport + JWT, bcrypt, class-validator |
| Base de datos | PostgreSQL |
| Despliegue | Neon (BD), Render (API), Vercel (frontend) |

## 5. Arquitectura y modelo de datos

```
┌──────────────────┐    HTTP + JSON     ┌──────────────────┐     SQL     ┌──────────────┐
│     FRONTEND     │ ─────────────────► │     BACKEND      │ ──────────► │  PostgreSQL  │
│ React + Tailwind │ ◄───────────────── │   NestJS (API)   │ ◄────────── │              │
└──────────────────┘                    └──────────────────┘             └──────────────┘
```

**Modelo de datos**

```
categorias_evento 1──N eventos 1──N zonas_entrada 1──N inscripciones N──1 usuarios
                          N──M artistas (eventos_artistas)         1──1 resenas
usuarios 1──1 stakeholders 1──N ofertas_patrocinio N──1 eventos
rangos_aforo (configurable por el admin)
```

| Tabla | Campos principales |
|---|---|
| `usuarios` | id, name, email (único), password (bcrypt), role (`admin`, `user`, `door`, `stakeholder`) |
| `categorias_evento` | id, nombre (único) |
| `eventos` | id, nombre, descripcion, ubicacion, fechaInicio, fechaFin, estado, accesibilidad, categoriaId |
| `zonas_entrada` | id, nombre, aforo, precio, eventoId (único por evento + nombre) |
| `artistas` / `eventos_artistas` | nombre, descripción / relación N:M |
| `inscripciones` | token QR único, estado (Confirmada, EnEspera, Ingresada, Cancelada), checkedInAt, usuarioId, zonaId, eventoId |
| `resenas` | calificación 1-5, comentario, estado (Pendiente, Aprobada, Rechazada), respuestaAdmin, inscripcionId (único), moderadaPorId |
| `stakeholders` | empresa, sector, contacto, usuarioId |
| `ofertas_patrocinio` | indiceValor, precio, estado (Publicada, Aceptada, Rechazada), eventoId, stakeholderId |
| `rangos_aforo` | nombre, minAforo, maxAforo (nulo = sin límite), tarifaBase |

**Concurrencia.** La inscripción y la cancelación corren en una transacción con `pessimistic_write` sobre la fila de la zona, y el check-in bloquea la fila de la inscripción. Así, 10 inscripciones simultáneas en una zona de aforo 3 dan exactamente 3 confirmadas y 7 en lista de espera, y 3 escaneos simultáneos del mismo QR dejan 1 ingreso válido y 2 «ya usada». Índices únicos parciales impiden duplicados (un usuario, una inscripción activa por evento).

### Motor de valoración (el core)

| Métrica | Fórmula |
|---|---|
| Ocupación | asistentes con check-in ÷ aforo total × 100 |
| Calificación | promedio de reseñas **aprobadas** ÷ 5 × 100 |
| Popularidad de un artista | 40 % ocupación promedio + 30 % calificación promedio + 20 % rapidez de agotamiento + 10 % tendencia, usando solo sus eventos finalizados anteriores |
| Índice de valor | 35 % ocupación + 25 % calificación + 40 % popularidad media de sus artistas |
| Precio del paquete | tarifa base del rango de aforo × (1 + índice ÷ 100) |

Interpretaciones elegidas donde el enunciado deja margen: la **rapidez** es `100 − % del tiempo de venta que tardó en llenarse` (0 si nunca se llenó); la **tendencia** es `50 + (promedio de los últimos 3 − promedio de los anteriores) ÷ 2`, acotada a 0-100 (50 = neutra); un artista sin eventos anteriores no cuenta en el promedio y figura «sin datos suficientes». Un evento sin asistentes o sin reseñas aprobadas es **«No disponible»**. Los rangos por defecto son Pequeño (0-200, $500), Mediano (201-1000, $1500) y Masivo (1001+, $4000) y el admin los edita en Ajustes.

### Datos de demostración

Como el motor necesita historial, **Ajustes → Datos de demostración** carga (y borra) un conjunto ficticio y determinista: 19 eventos finalizados, 7 artistas con trayectorias distintas (en alza, en baja, estable, sin datos), miles de asistentes con check-in y reseñas, y 2 eventos futuros (uno de aforo 5 para probar la lista de espera). Todo queda marcado como demo y no toca los datos reales.

## 6. Autenticación y roles

1. `POST /auth/login` compara la contraseña con el hash **bcrypt** guardado (nunca se guarda en texto plano).
2. Si es correcta, el backend devuelve un **JWT** firmado (id, correo y rol; vence en 1 día).
3. React guarda el token y Axios lo envía en cada petición: `Authorization: Bearer <token>`.
4. `JwtAuthGuard` valida el token y `RolesGuard` revisa el rol. La seguridad real está en el backend: los botones ocultos en React son solo experiencia de usuario.

| Rol | Qué puede hacer | Pantallas |
|---|---|---|
| **Asistente** (se registra solo) | Ver eventos, inscribirse, ver su QR, cancelar, reseñar | Eventos, Mis entradas |
| **Personal de puerta** (lo crea el admin) | Escanear QR y ver el resultado | Control de acceso |
| **Stakeholder** (lo crea el admin) | Ver ranking, trayectoria de artistas, aceptar o rechazar ofertas | Recomendados, Artistas, Mis ofertas |
| **Administrador** | Todo lo de gestión: eventos, zonas, artistas, reseñas, rangos, personal, ofertas, datos demo | Eventos, Reseñas, Valoración, Ofertas, Artistas, Ajustes |

El administrador se crea solo en el primer arranque del backend. En local: `admin@admin.com` / `admin123`. **En producción se define con `ADMIN_EMAIL` y `ADMIN_PASSWORD`.**

## 7. API REST

| Método | Ruta | Acceso |
|---|---|---|
| POST | `/auth/register`, `/auth/login` | Público |
| GET | `/categories`, `/events?categoryId=`, `/zones?eventId=` | Sesión iniciada |
| POST / PATCH / DELETE | `/events`, `/events/:id`, `/zones`, `/zones/:id` | Admin |
| GET | `/artists` | Sesión iniciada |
| POST / PATCH / DELETE | `/artists`, `/artists/:id` | Admin |
| PUT | `/events/:id/artists` | Admin |
| GET | `/registrations/availability?eventId=` | Sesión iniciada |
| POST | `/registrations` | Asistente |
| GET | `/registrations/mine` | Asistente |
| PATCH | `/registrations/:id/cancel` | Asistente |
| POST | `/registrations/checkin` | Puerta, admin |
| GET | `/registrations/attendance?eventId=` | Puerta, admin |
| POST | `/reviews` | Asistente |
| GET | `/reviews/event/:id` | Sesión iniciada (solo aprobadas) |
| GET | `/reviews?estado=` | Admin |
| PATCH | `/reviews/:id/moderate` | Admin |
| GET | `/valuation/events?from=&to=` | Admin, stakeholder |
| GET | `/valuation/artists` | Admin, stakeholder |
| GET / PUT | `/valuation/ranges` | Admin, stakeholder (GET) / admin (PUT) |
| POST / GET | `/offers` | Admin |
| GET | `/offers/mine` | Stakeholder |
| PATCH | `/offers/:id/respond` | Stakeholder |
| GET / POST | `/staff`, `/staff/stakeholders` | Admin |
| GET / POST / DELETE | `/demo` | Admin |

Códigos usados: 200/201 correcto, 400 datos o reglas inválidas, 401 sin sesión, 403 sin permiso, 404 no encontrado, 409 conflicto (correo o zona repetidos).

## 8. Ejecución en local

**Requisitos:** Node.js 20 o superior y PostgreSQL con una base `crud_db` (usuario `postgres`, contraseña `postgres`, puerto 5432). Con Docker: `docker compose up -d`.

```bash
# Terminal 1: backend (puerto 3000)
cd backend
npm install
npm run start:dev

# Terminal 2: frontend (puerto 5173)
cd frontend
npm install
npm run dev
```

### Cómo probar el flujo completo (3 minutos)

1. Entra como administrador (`admin@admin.com` / `admin123`) → **Ajustes → Datos de demostración → Cargar**.
2. **Valoración** muestra los eventos finalizados agrupados por rango de aforo, con índice, precio y el detalle de la fórmula. **Artistas** muestra quiénes están en alza o en baja.
3. En **Ajustes → Personal** crea un usuario de puerta y un patrocinador. En **Valoración** pulsa «Ofrecer a un patrocinador».
4. Regístrate como asistente (pantalla de login) → inscríbete en «Taller Cerrado de Actuación» (aforo 5, queda en lista de espera) o en «Festival de Música Andina» → en **Mis entradas** aparece tu QR.
5. Con el usuario de puerta, elige el evento y escanea el QR con la cámara (o pega el código): ingreso válido; el segundo escaneo muestra «ya usada» con la hora del primero.
6. Inicia sesión como patrocinador y acepta o rechaza la oferta.

### Pruebas

El backend se probó de punta a punta con 88 comprobaciones (`node backend/test/e2e.mjs` con la API corriendo en `localhost:3000`) (roles, fórmulas del motor, validación de rangos, concurrencia de inscripciones y check-in, lista de espera, reseñas, ofertas). La interfaz se recorrió con un navegador automatizado (Chromium) por cada rol, en escritorio y móvil.

## Diseño de la interfaz

Diseño minimalista con un solo color de marca, tipografía serif (Fraunces) para títulos e Inter para el texto, y componentes propios en `frontend/src/components/ui.jsx`. Decisiones de UX: navegación distinta por rol, estados de carga, vacíos y error en cada pantalla, confirmación antes de acciones destructivas, mensajes del servidor traducidos a lenguaje claro, formularios con etiquetas, foco visible y navegación con teclado, modales accesibles (Esc, foco atrapado), y diseño responsive pensado para que el personal de puerta use el celular.

Abre http://localhost:5173. Las tablas y las 4 categorías se crean solas al arrancar. Para probar los permisos, entra con el admin y luego con una cuenta nueva.

## 9. Despliegue (todo gratuito)

Orden recomendado: base de datos → backend → frontend → ajustar CORS.

### Variables de entorno

**Backend** (ver `backend/.env.example`):

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Cadena de conexión de PostgreSQL (Neon). Si no existe, se usa el PostgreSQL local |
| `JWT_SECRET` | Secreto para firmar los tokens (cadena larga y aleatoria) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Administrador que se crea al primer arranque |
| `FRONTEND_URL` | URL del frontend, **sin `/` al final** (limita el CORS) |
| `DB_SSL` | Poner `false` solo si el PostgreSQL remoto no usa SSL |

**Frontend** (ver `frontend/.env.example`): `VITE_API_URL` = URL del backend, sin `/` al final.

### Pasos

1. **Neon (base de datos):** crea un proyecto en [neon.tech](https://neon.tech) y copia la cadena de conexión; será el `DATABASE_URL`.
2. **Render (backend):** *New → Web Service*, conecta este repositorio y configura:
   - Root Directory: `backend`
   - Build Command: `npm install --include=dev && npm run build`
   - Start Command: `npm run start:prod`
   - Variables: `DATABASE_URL`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`
3. **Vercel (frontend):** *Add New Project*, importa este repositorio y configura:
   - Root Directory: `frontend` (framework Vite, se detecta solo)
   - Variable: `VITE_API_URL` con la URL de Render
4. **CORS:** vuelve a Render, agrega `FRONTEND_URL` con la URL de Vercel y reinicia el servicio.

`synchronize: true` crea las tablas en Neon automáticamente la primera vez.

## 10. Seguridad y limitaciones

- Contraseñas con bcrypt; secretos y credenciales del administrador por variables de entorno en producción.
- El token se guarda en `localStorage`; lo más seguro sería una cookie `httpOnly`.
- `synchronize: true` es adecuado para desarrollo; en producción real se usan migraciones.
- Los eventos ya iniciados no admiten cambios en sus datos ni zonas (regla de negocio, para que las métricas no se alteren).
- La lectura de QR con la cámara requiere HTTPS (Vercel lo da) o `localhost`; en otro caso se usa el ingreso manual del código.
- Mejoras futuras: migraciones en lugar de `synchronize`, cookie `httpOnly`, paginación de listados, pruebas automatizadas dentro del repositorio.
