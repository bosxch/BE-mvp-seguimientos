## Documentación BackEnd MVP - Seguimientos

1. Visión general
Hemos construido una API REST en Node.js que funciona como backend de un CRM para gestión de Usuarios (Admins y Closers), Clientes, Reuniones, Comprobantes de Pago y Notificaciones.
Tecnologías principales:
- Node.js (JavaScript puro)
- Express (servidor HTTP y routing)
- mysql2 (pool de conexiones a MySQL)
- dotenv (gestión de variables de entorno)
- body-parser (parseo de bodies urlencoded)
- cors (habilitar CORS)
- multer (subida de archivos para comprobantes)

El enfoque de “modelo” se basa en archivos JS que contienen funciones que ejecutan consultas SQL directas usando promisePool. No usamos un ORM, sino queries manuales.
2. Estructura de carpetas y archivos
```
crm-backend/
├─ .env
├─ index.js
├─ package.json
│
├─ config/
│   └─ (vacío o futuro: pool separado si se quisiera)
│
├─ controllers/
│   ├─ userController.js
│   ├─ clientController.js
│   ├─ meetingController.js
│   ├─ paymentController.js
│   └─ notificationController.js
│
├─ models/
│   ├─ userModel.js
│   ├─ clientModel.js
│   ├─ meetingModel.js
│   ├─ paymentModel.js
│   └─ notificationModel.js
│
├─ routes/
│   ├─ users.js
│   ├─ clients.js
│   ├─ meetings.js
│   ├─ payments.js
│   └─ notifications.js
│
├─ uploads/
│   └─ (aquí guarda Multer los archivos subidos)
│
└─ middlewares/
    └─ auth.js  (middleware de autenticación JWT)
```
3. Base de datos y relaciones
3.1 Tablas principales


1. Users
   - id: INT PK AUTO_INCREMENT
   - email: VARCHAR(255) UNIQUE NOT NULL
   - password_hash: VARCHAR(255) NOT NULL
   - name: VARCHAR(100) NOT NULL
   - role: ENUM('ADMIN','CLOSER') NOT NULL
   - objective: DECIMAL(10,2) NOT NULL DEFAULT 0  (solo CLOSERS)
   - achieved: DECIMAL(10,2) NOT NULL DEFAULT 0   (solo CLOSERS)
   - percent_complete: DECIMAL(5,2) NOT NULL DEFAULT 0
   - group_objective, group_achieved, group_percent_complete (para métricas grupales de ADMIN)
   - created_at: DATETIME DEFAULT CURRENT_TIMESTAMP
   - updated_at: DATETIME ON UPDATE CURRENT_TIMESTAMP

   Relaciones:
     - Users(id) → Clients(closer_id) (1:N)
     - Users(id) → Meetings(closer_id) (1:N)
     - Users(id) → Notifications(user_id) (1:N)

2. Clients
   - id: INT PK AUTO_INCREMENT
   - name: VARCHAR(150) NOT NULL
   - company_name: VARCHAR(150) NULL
   - email: VARCHAR(255) NOT NULL
   - closer_id: INT NOT NULL (FK → Users.id)
   - status: ENUM(...) NOT NULL DEFAULT 'PAGO_PENDIENTE'
   - created_at: DATETIME DEFAULT CURRENT_TIMESTAMP
   - updated_at: DATETIME ON UPDATE CURRENT_TIMESTAMP

   Relaciones:
     - Clients(closer_id) → Users(id)
     - Clients(id) → PaymentProofs(client_id) (1:N)
     - Clients(id) → Meetings(client_id) (1:N opcional)

3. Meetings
   - id: INT PK AUTO_INCREMENT
   - closer_id: INT NOT NULL (FK → Users.id)
   - client_id: INT NULL (FK → Clients.id)
   - meeting_date: DATETIME NOT NULL
   - location: VARCHAR(255) NULL
   - notes: TEXT NULL
   - created_at: DATETIME DEFAULT CURRENT_TIMESTAMP
   - updated_at: DATETIME ON UPDATE CURRENT_TIMESTAMP

   Relaciones:
     - Meetings(closer_id) → Users(id)
     - Meetings(client_id) → Clients(id) (ON DELETE SET NULL)

4. PaymentProofs
   - id: INT PK AUTO_INCREMENT
   - client_id: INT NOT NULL (FK → Clients.id)
   - file_url: VARCHAR(500) NOT NULL
   - uploaded_at: DATETIME DEFAULT CURRENT_TIMESTAMP

   Relaciones:
     - PaymentProofs(client_id) → Clients(id) (ON DELETE CASCADE)

5. Notifications
   - id: INT PK AUTO_INCREMENT
   - user_id: INT NOT NULL (FK → Users.id)
   - message: TEXT NOT NULL
   - is_read: TINYINT(1) NOT NULL DEFAULT 0
   - created_at: DATETIME DEFAULT CURRENT_TIMESTAMP

   Relaciones:
     - Notifications(user_id) → Users(id) (ON DELETE CASCADE)


3.2 Esquema de Relaciones (Ilustración)
  Users (Admins/Closers)
  ┌────────────────────────────────────────────────────────────────┐
  │ id PK, email, password_hash, name, role, objective, achieved, │
  │ percent_complete, group_objective, group_achieved,             │
  │ group_percent_complete, created_at, updated_at                 │
  └────────────────────────────────────────────────────────────────┘
          ▲               ▲                      ▲
          │               │                      │
          │ 1:N           │ 1:N                  │ 1:N
          │               │                      │
   ┌──────┴──────┐    ┌───┴───┐              ┌───┴─────────┐
   │   Clients   │    │Meetings│              │Notifications│
   │(Clients.id) │    │(Meetings.id)          │(Notifications.id)
   │ id PK       │    │ id PK                 │ id PK
   │ name        │    │ closer_id ─────────┐  │ user_id FK ─────┐
   │ company_name│    │ client_id  ──────┐ │  │ message          │
   │ email       │    │ meeting_date    │ │  │ is_read          │
   │ closer_id FK│    │ location        │ │  │ created_at       │
   │ status      │    │ notes           │ │  └──────────────────┘
   │ created_at  │    │ created_at      │ │
   │ updated_at  │    │ updated_at      │ │
   └─────────────┘    └─────────────────┘ │
           │ 1:N                              │
           │                                 │
   ┌───────┴──────────┐                      │
   │ PaymentProofs    │                      │
   │(PaymentProofs.id)│                      │
   │ id  PK           │                      │
   │ client_id FK ────┘                      │
   │ file_url         │                      │
   │ uploaded_at      │                      │
   └──────────────────┘                      │
                                            │
                                            │
                                            │
                                            └─────── (Users.id)


4. Descripción de funcionamiento
1. Autenticación y autorización:
- Se utiliza JWT. El endpoint POST /api/users/login genera un token con payload { userId, role }.
- Middleware auth valida el token y setea req.user = { userId, role }.

2. Gestión de Usuarios:
- POST /api/users/register (ADMIN): crea Admin o Closer.
- GET /api/users/profile: datos del usuario autenticado.
- PUT /api/users/password: cambia contraseña.
- PUT /api/users/objective (CLOSER): cambia objetivo.
- POST /api/users/achievement (CLOSER): suma al campo achieved.
- GET /api/users/clients (CLOSER): lista clientes propios.
- GET /api/users/meetings (CLOSER): lista reuniones propias.

3. Gestión de Clientes:
- POST /api/clients (CLOSER): crea cliente.
- GET /api/clients/:id (CLOSER/ADMIN): detalles del cliente + comprobantes + reuniones.
- PUT /api/clients/:id/status: actualiza estado (CLOSER/ADMIN).
- PUT /api/clients/:id/reassign (ADMIN): reasigna cliente.
- DELETE /api/clients/:id (ADMIN): elimina cliente.
- POST /api/clients/:id/payment-proof (CLOSER/ADMIN): sube comprobante (multipart).
- GET /api/clients/:id/payment-proofs: lista comprobantes.
- DELETE /api/clients/:id/payment-proofs/:proofId: elimina comprobante.

4. Gestión de Reuniones:
- POST /api/meetings (CLOSER): crea reunión.
- GET /api/meetings/:id (CLOSER/ADMIN): detalles de reunión.
- GET /api/meetings/closer (CLOSER): lista reuniones propias.
- GET /api/meetings/client/:clientId (CLOSER/ADMIN): lista reuniones con ese cliente.
- PUT /api/meetings/:id (CLOSER/ADMIN): actualiza reunión.
- DELETE /api/meetings/:id (CLOSER/ADMIN): elimina reunión.

5. Gestión de Pagos:
- POST /api/payments/:clientId (CLOSER/ADMIN): sube comprobante.
- GET /api/payments/:clientId: lista comprobantes.
- DELETE /api/payments/:clientId/:proofId: elimina comprobante.

6. Gestión de Notificaciones:
- POST /api/notifications (ADMIN): envía notificación.
- GET /api/notifications: lista notificaciones propias.
- PUT /api/notifications/:id/read: marca como leída.
- DELETE /api/notifications/:id: elimina notificación.


5. Archivo de configuración (.env)
Ejemplo de .env:
```
DB_HOST=localhost
DB_USER=root
DB_PASS=
DB_NAME=crm_local
DB_PORT=3306
JWT_SECRET=mi_secreto_super_seguro
PORT=3000
TZ=America/Argentina/Buenos_Aires
NODE_ENV=development
```
- Este archivo no debe subirse a repositorios públicos.
- Se carga con require('dotenv').config() en index.js.


6. Cadena de ejecución al iniciar el servidor
1. Ejecutar en la terminal:
   npm install
   npm start
   (o npm run dev si se usa nodemon).

2. index.js carga las variables de entorno, configura middlewares, crea promisePool, monta routers y arranca el servidor.

3. Middleware auth valida JWT y setea req.user.

4. Requests a /api/... pasan por router → controller → modelo → BD → respuesta JSON.


7. Puntos de mejora / notas finales
1. Validación adicional (Joi, express-validator) para req.body y req.params.
2. Separar pool en config/db.js para mayor claridad.
3. Manejo de archivos físicos al eliminar comprobantes (fs.unlink).
4. Uso de transacciones para operaciones atómicas.
5. Documentación Swagger o Postman para la API.
6. Roles y permisos más granulados con middlewares específicos (isAdmin, isCloser).
