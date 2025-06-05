// routes/users.js
// =============================
// Rutas para Usuarios (Admins y Closers)

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
// Middleware de autenticación (se asume que setea req.user con { userId, role })
const auth = require('../middlewares/auth');

// 1) Autenticación (login)
router.post('/login', userController.login);

// 2) Registro de nuevos usuarios (solo ADMIN puede invocar)
//    Body esperado: { email, password, name, role, objective?, groupObjective? }
router.post('/register', auth, userController.registerUser);

// 3) Obtener perfil del usuario autenticado
router.get('/profile', auth, userController.getProfile);

// 4) Cambiar contraseña del usuario autenticado
//    Body: { currentPassword, newPassword }
router.put('/password', auth, userController.updatePassword);

// 5) Solo CLOSER: actualizar su objective
//    Body: { objective }
router.put('/objective', auth, userController.updateCloserObjective);

// 6) Solo CLOSER: agregar monto a 'achieved'
//    Body: { amount }
router.post('/achievement', auth, userController.addAchievedAmount);

// 7) Solo CLOSER: listar todos sus clientes
router.get('/clients', auth, userController.listClientsOfCloser);

// 8) Solo CLOSER: listar todas sus reuniones
router.get('/meetings', auth, userController.listMeetingsOfCloser);

module.exports = router;
