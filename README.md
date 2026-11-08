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
| Backend / API (Render) | _pega aquí la URL de Render_ |
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

## 2. Estado actual del proyecto

| Módulo | Estado |
|---|---|
| Registro, login con JWT y roles (admin / usuario) | Implementado |
| Categorías de evento (se cargan al primer arranque) | Implementado |
| Eventos y zonas de entrada (CRUD solo admin) | Implementado |
| Validaciones de negocio en el backend | Implementado |
| Dropdowns en cascada categoría → evento → zona | Implementado |
| Despliegue (Neon + Render + Vercel) | Configurado, ver sección 9 |
| Inscripciones con QR, lista de espera y check-in | Pendiente |
| Reseñas y moderación | Pendiente |
| Artistas, stakeholders y ofertas de patrocinio | Pendiente |
| Motor de valoración (cálculo del índice de valor) | Pendiente |

Además, el repositorio conserva un módulo `products` (CRUD de demostración usado para aprender el login y los roles); queda disponible en la ruta `/productos` del frontend y no forma parte del core.

## 3. Cumplimiento de los requisitos del curso

### Requisito 1: validación en el back-end de un dato sensible, antes de grabar en la BD

Las reglas viven en [`backend/src/events/events.service.ts`](backend/src/events/events.service.ts) y se ejecutan siempre en el servidor, aunque alguien llame a la API directamente sin pasar por React:

| Regla | Respuesta si se incumple |
|---|---|
| **Aforo y precio de zonas (dato sensible del core):** no se pueden crear, editar ni eliminar zonas ni modificar el evento si este ya inició, porque las métricas de ocupación dependen del aforo | 400 |
| El aforo de una zona es un entero entre 1 y 100 000; el precio no puede ser negativo | 400 |
| El nombre de la zona es único dentro del evento | 409 |
| La fecha de fin es posterior a la de inicio, y un evento nuevo debe comenzar en el futuro | 400 |
| La categoría y el evento referenciados deben existir | 400 / 404 |
| Solo el administrador crea, edita o elimina (guard de roles) | 403 |

Ejemplo de prueba (Postman) con un evento que ya inició: `PATCH /zones/1` con `{"aforo": 9999}` responde **400** con el mensaje *"El evento ya inició: no se pueden modificar sus datos ni sus zonas…"*.

### Requisito 2: referencias a otras tablas con dropdowns en cascada

En la pantalla principal ([`frontend/src/Eventos.jsx`](frontend/src/Eventos.jsx)):

1. **Categoría:** se carga al abrir la página (`GET /categories`).
2. **Evento:** el select está deshabilitado hasta elegir categoría y, al elegirla, se carga con **solo los eventos de esa categoría** (`GET /events?categoryId=`).
3. **Zona:** al elegir el evento se cargan **sus zonas** (`GET /zones?eventId=`).

Al cambiar de categoría se reinician el evento y las zonas. Al crear un evento, la categoría se elige por dropdown (nunca se escribe el id), y el backend verifica que exista.

### Requisito 3: Git, README y despliegue

- Código versionado en este repositorio, con commits por etapa (base, backend de eventos, configuración para despliegue, frontend).
- Este README documenta instalación, variables de entorno, API y despliegue.
- Pasos de despliegue en la sección 9.

## 4. Tecnologías

| Capa | Tecnología |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS, React Router, Axios |
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

**Tablas implementadas**

```
categorias_evento 1──N eventos 1──N zonas_entrada
usuarios (rol: admin / user)
```

| Tabla | Campos principales |
|---|---|
| `usuarios` | id, name, email (único), password (hash bcrypt), role |
| `categorias_evento` | id, nombre (único) |
| `eventos` | id, nombre, descripcion, ubicacion, fechaInicio, fechaFin, estado, accesibilidad, categoriaId |
| `zonas_entrada` | id, nombre, aforo, precio, eventoId (único por evento + nombre) |

**Tablas planificadas para el core:** `artistas`, `eventos_artistas` (N:M), `inscripciones` (token QR único, estado Confirmada / EnEspera / Ingresada / Cancelada), `resenas`, `stakeholders`, `ofertas_patrocinio`.

## 6. Autenticación y roles

1. `POST /auth/login` compara la contraseña con el hash **bcrypt** guardado (nunca se guarda en texto plano).
2. Si es correcta, el backend devuelve un **JWT** firmado (id, correo y rol; vence en 1 día).
3. React guarda el token y Axios lo envía en cada petición: `Authorization: Bearer <token>`.
4. `JwtAuthGuard` valida el token y `RolesGuard` revisa el rol. La seguridad real está en el backend: los botones ocultos en React son solo experiencia de usuario.

| Rol | Ver eventos y zonas | Crear / editar / eliminar |
|---|:---:|:---:|
| Usuario (se registra desde la pantalla) | Sí | No |
| Administrador | Sí | Sí |

El administrador se crea solo en el primer arranque del backend. En local: `admin@admin.com` / `admin123`. **En producción se define con `ADMIN_EMAIL` y `ADMIN_PASSWORD`.**

## 7. API REST

| Método | Ruta | Acceso |
|---|---|---|
| POST | `/auth/register` | Público |
| POST | `/auth/login` | Público |
| GET | `/categories` | Sesión iniciada |
| GET | `/events?categoryId=` | Sesión iniciada |
| POST / PATCH / DELETE | `/events`, `/events/:id` | Solo admin |
| GET | `/zones?eventId=` | Sesión iniciada |
| POST / PATCH / DELETE | `/zones`, `/zones/:id` | Solo admin |

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
- Pendiente: inscripciones con control de concurrencia (transacción con bloqueo de fila para no superar nunca el aforo), QR de un solo uso, reseñas y el motor de valoración.
