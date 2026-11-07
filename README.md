# CRUD de productos con login y roles (NestJS + React + PostgreSQL)

## Qué necesitas instalar
1. **Node.js 20 o superior** (LTS): https://nodejs.org
2. **PostgreSQL** con una base llamada `crud_db`, usuario `postgres`, contraseña `postgres`, puerto 5432
   (o Docker Desktop y `docker compose up -d` en esta carpeta).

## Cómo correrlo (2 terminales)

**Backend** (puerto 3000)
```bash
cd backend
npm install
npm run start:dev
```

**Frontend** (puerto 5173)
```bash
cd frontend
npm install
npm run dev
```

Abre http://localhost:5173

## Roles
| Rol | Ver productos | Crear | Editar | Eliminar |
|---|---|---|---|---|
| Usuario (se registra desde la pantalla) | Sí | Sí | No | No |
| Admin | Sí | Sí | Sí | Sí |

**Admin por defecto** (se crea solo al arrancar el backend):
- Correo: `admin@admin.com`
- Contraseña: `admin123`

## Estructura
- `backend/src/auth` → registro, login (JWT), `roles.decorator.ts` y `roles.guard.ts`
- `backend/src/users` → entidad User (con `role`) y creación del admin por defecto
- `backend/src/products` → CRUD de productos (entity, DTOs, service, controller)
- `frontend/src/Login.jsx` → login y registro
- `frontend/src/Products.jsx` → CRUD de productos (botones Editar/Eliminar solo para admin)
- `frontend/src/api.js` → axios, manda el token en cada petición

## Endpoints
| Método | Ruta | Acceso |
|---|---|---|
| POST | /auth/register | Público |
| POST | /auth/login | Público |
| GET | /products | Logueado |
| GET | /products/:id | Logueado |
| POST | /products | Logueado |
| PATCH | /products/:id | Solo admin |
| DELETE | /products/:id | Solo admin |

Header para rutas protegidas: `Authorization: Bearer <access_token>`.

## Notas
- Conexión a la base: `backend/src/app.module.ts`.
- `synchronize: true` crea y actualiza las tablas solo (solo para desarrollo).
- Secreto del JWT: `backend/src/auth/constants.ts` (en producción va en una variable de entorno).
