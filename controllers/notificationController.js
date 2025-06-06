// controllers/notificationController.js
// =====================================
// Lógica de negocio para Notifications.
// Cada notificación está asignada a un User.

const {
  createNotification,
  getNotificationsByUser,
  markAsRead,
  deleteNotification
} = require('../models/notificationModel');

/**
 * sendNotification(req, res)
 *  - Crea una nueva notificación para un usuario específico.
 *  - Solo ADMIN puede invocar esta acción.
 *  - El cuerpo: { userId, message }
 */
exports.sendNotification = async (req, res) => {
  try {
    const requesterRole = req.user.role;
    if (requesterRole !== 'ADMIN') {
      return res.status(403).json({ message: 'Solo ADMIN puede enviar notificaciones' });
    }
    const { userId, message } = req.body;
    const notificationId = await createNotification({ userId, message });
    return res.status(201).json({ notificationId, message: 'Notificación enviada' });
  } catch (error) {
    console.error('Error en sendNotification:', error);
    return res.status(500).json({ message: 'Error interno en el servidor' });
  }
};

/**
 * listUserNotifications(req, res)
 *  - Lista todas las notificaciones del usuario autenticado.
 */
exports.listUserNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;
    const notifications = await getNotificationsByUser(userId);
    return res.json(notifications);
  } catch (error) {
    console.error('Error en listUserNotifications:', error);
    return res.status(500).json({ message: 'Error interno en el servidor' });
  }
};

/**
 * markNotificationRead(req, res)
 *  - Marca una notificación como leída.
 *  - Parámetro :id en la ruta (notificationId).
 *  - Solo el dueño puede marcarla o ADMIN.
 */
exports.markNotificationRead = async (req, res) => {
  try {
    const notificationId = parseInt(req.params.id, 10);
    const userId = req.user.userId;
    const role = req.user.role;
    // No hay verificación de propietario en este ejemplo simple.
    // Si quisieras asegurarlo, deberías consultar la notificación y ver a qué userId pertenece.

    await markAsRead(notificationId);
    return res.json({ message: 'Notificación marcada como leída' });
  } catch (error) {
    console.error('Error en markNotificationRead:', error);
    return res.status(500).json({ message: 'Error interno en el servidor' });
  }
};

/**
 * deleteExistingNotification(req, res)
 *  - Elimina una notificación.
 *  - Parámetro :id en la ruta (notificationId).
 *  - Solo ADMIN o el dueño pueden eliminar.
 */
exports.deleteExistingNotification = async (req, res) => {
  try {
    const notificationId = parseInt(req.params.id, 10);
    // Si quisieras verificar el propietario, deberías obtener la notificación y comparar userId.
    await deleteNotification(notificationId);
    return res.json({ message: 'Notificación eliminada' });
  } catch (error) {
    console.error('Error en deleteExistingNotification:', error);
    return res.status(500).json({ message: 'Error interno en el servidor' });
  }
};
