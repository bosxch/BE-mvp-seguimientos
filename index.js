// index.js
// =============================
// Configuración inicial del servidor
// =============================

// Cargar variables de entorno desde .env
require('dotenv').config();

// Forzar zona horaria a Buenos Aires (si no está en el .env, tomará este valor)
process.env.TZ = process.env.TZ || 'America/Argentina/Buenos_Aires';

const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const cors = require('cors');

const app = express();

// =============================
// 1) Middlewares globales
// =============================
app.use(cors());                       // Habilita CORS en todas las rutas
app.use(express.json());               // Parsear JSON en el body
app.use(bodyParser.urlencoded({        // Parsear bodies urlencoded (formularios)
  extended: true
}));

// =============================
// 2) Configuración de Multer
// =============================
// Carpeta donde Multer guardará los archivos subidos
const uploadDir = path.join(__dirname, 'uploads');
const upload = multer({ dest: uploadDir });

// Servir archivos estáticos de la carpeta 'uploads'
app.use('/uploads', express.static(uploadDir));

// =============================
// 3) Conexión a MySQL usando Pool
// =============================
// Variables esperadas en .env:
//   DB_HOST, DB_USER, DB_PASS, DB_NAME, DB_PORT (opcional), 
//   JWT_SECRET, PORT (opcional)

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 3306,
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASS     || '',
  database: process.env.DB_NAME     || 'crm_local',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0
});

const promisePool = pool.promise();

// Exportamos promisePool para que los controllers puedan acceder sin repetir código
module.exports.promisePool = promisePool;

// =============================
// 4) Función auxiliar: Fecha actual
// =============================
/**
 * getCurrentDate()
 * Devuelve la fecha actual en formato 'YYYY-MM-DD' respetando TZ.
 */
const getCurrentDate = () => {
  const now = new Date();
  return now.toLocaleDateString('en-CA', { timeZone: process.env.TZ });
};

// =============================
// 5) Rutas modularizadas
// =============================
// Asegurate de crear los archivos en 'routes/' con el nombre correspondiente:
//   - routes/users.js
//   - routes/clients.js
//   - etc.

const usersRouter   = require('./routes/users');
const clientsRouter = require('./routes/clients');
// Si en el futuro agregás más módulos:
// const meetingsRouter      = require('./routes/meetings');
// const notificationsRouter = require('./routes/notifications');

app.use('/api/users',   usersRouter);
app.use('/api/clients', clientsRouter);
// app.use('/api/meetings',      meetingsRouter);
// app.use('/api/notifications', notificationsRouter);

// =============================
// 6) Ruta de verificación (ping)
// =============================
app.get('/ping', (req, res) => {
  res.json({
    message: `Pong! Fecha actual: ${getCurrentDate()}`,
    env: process.env.NODE_ENV || 'development'
  });
});

// =============================
// 7) Inicializar servidor
// =============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT} 🟢`);
  console.log(`Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Zona Horaria: ${process.env.TZ}`);
});
