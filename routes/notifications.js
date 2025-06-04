// routes/notifications.js
// =============================
// Rutas para Notifications (Notificaciones)

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const auth = require('../middlewares/auth');

/**
 * POST /api/notifications
 *  - Crea una nueva notificación para un usuario (solo ADMIN).
 *  - Body: { userId, message }
 */
router.post('/', auth, notificationController.sendNotification);

/**
 * GET /api/notifications
 *  - Lista todas las notificaciones del usuario autenticado.
 */
router.get('/', auth, notificationController.listUserNotifications);

/**
 * PUT /api/notifications/:id/read
 *  - Marca una notificación como leída (solo dueño o ADMIN).
 */
router.put('/:id/read', auth, notificationController.markNotificationRead);

/**
 * DELETE /api/notifications/:id
 *  - Elimina una notificación (solo dueño o ADMIN).
 */
router.delete('/:id', auth, notificationController.deleteExistingNotification);

module.exports = router;
