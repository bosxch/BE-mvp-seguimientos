// models/notificationModel.js
// ===========================
// Funciones para acceder y manipular datos en la tabla Notifications.
// Cada Notification está asociada a un User (Users.id).

const { promisePool } = require('../index');

/**
 * createNotification(data)
 *  - Inserta una nueva notificación para un usuario.
 *  - data: {
 *      userId,
 *      message             // Texto de la notificación
 *    }
 */
async function createNotification(data) {
  const { userId, message } = data;
  const [result] = await promisePool.query(
    `INSERT INTO Notifications
      (user_id, message, is_read, created_at)
     VALUES (?, ?, 0, NOW())`,
    [userId, message]
  );
  return result.insertId;
}

/**
 * getNotificationsByUser(userId)
 *  - Devuelve todas las notificaciones de un usuario ordenadas por fecha.
 */
async function getNotificationsByUser(userId) {
  const [rows] = await promisePool.query(
    `SELECT
       id               AS notificationId,
       message,
       is_read          AS isRead,
       created_at       AS createdAt
     FROM Notifications
     WHERE user_id = ?
     ORDER BY created_at DESC`,
    [userId]
  );
  return rows;
}

/**
 * markAsRead(notificationId)
 *  - Marca una notificación como leída.
 */
async function markAsRead(notificationId) {
  await promisePool.query(
    `UPDATE Notifications
     SET is_read = 1
     WHERE id = ?`,
    [notificationId]
  );
}

/**
 * deleteNotification(notificationId)
 *  - Elimina una notificación específica.
 */
async function deleteNotification(notificationId) {
  await promisePool.query(
    `DELETE FROM Notifications WHERE id = ?`,
    [notificationId]
  );
}

module.exports = {
  createNotification,
  getNotificationsByUser,
  markAsRead,
  deleteNotification
};
