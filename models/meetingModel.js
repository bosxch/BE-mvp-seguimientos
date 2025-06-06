// models/meetingModel.js
// =======================
// Funciones para acceder y manipular datos en la tabla Meetings.
// Cada Meeting está vinculada a un Closer (Users.id) y opcionalmente a un Client (Clients.id).

const { promisePool } = require('../index');

/**
 * createMeeting(data)
 *  - Inserta una nueva reunión.
 *  - data: {
 *      closerId,
 *      clientId?,       // NULL si no hay cliente asignado
 *      meetingDate,     // DATETIME
 *      location?,       // Texto o URL
 *      notes?           // Texto libre
 *    }
 */
async function createMeeting(data) {
  const { closerId, clientId = null, meetingDate, location = null, notes = null } = data;
  const [result] = await promisePool.query(
    `INSERT INTO Meetings
      (closer_id, client_id, meeting_date, location, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
    [closerId, clientId, meetingDate, location, notes]
  );
  return result.insertId;
}

/**
 * getMeetingById(meetingId)
 *  - Devuelve datos de una reunión, incluyendo:
 *    • Closer (Users.id, name, email)
 *    • Cliente (Clients.id, name, email), si existe.
 */
async function getMeetingById(meetingId) {
  const [rows] = await promisePool.query(
    `SELECT
       M.id,
       M.meeting_date   AS meetingDate,
       M.location,
       M.notes,
       M.created_at     AS createdAt,
       M.updated_at     AS updatedAt,
       U.id             AS closerId,
       U.name           AS closerName,
       U.email          AS closerEmail,
       C.id             AS clientId,
       C.name           AS clientName,
       C.email          AS clientEmail
     FROM Meetings M
     JOIN Users U ON M.closer_id = U.id
     LEFT JOIN Clients C ON M.client_id = C.id
     WHERE M.id = ?`,
    [meetingId]
  );
  return rows[0] || null;
}

/**
 * getMeetingsByCloser(closerId)
 *  - Devuelve todas las reuniones de un Closer, con info básica del Cliente si existe.
 */
async function getMeetingsByCloser(closerId) {
  const [rows] = await promisePool.query(
    `SELECT
       M.id,
       M.meeting_date   AS meetingDate,
       M.location,
       M.notes,
       M.created_at     AS createdAt,
       M.updated_at     AS updatedAt,
       C.id             AS clientId,
       C.name           AS clientName
     FROM Meetings M
     LEFT JOIN Clients C ON M.client_id = C.id
     WHERE M.closer_id = ?
     ORDER BY M.meeting_date DESC`,
    [closerId]
  );
  return rows;
}

/**
 * getMeetingsByClient(clientId)
 *  - Devuelve todas las reuniones asociadas a un Cliente, con info del Closer.
 */
async function getMeetingsByClient(clientId) {
  const [rows] = await promisePool.query(
    `SELECT
       M.id,
       M.meeting_date   AS meetingDate,
       M.location,
       M.notes,
       M.created_at     AS createdAt,
       M.updated_at     AS updatedAt,
       U.id             AS closerId,
       U.name           AS closerName,
       U.email          AS closerEmail
     FROM Meetings M
     JOIN Users U ON M.closer_id = U.id
     WHERE M.client_id = ?
     ORDER BY M.meeting_date DESC`,
    [clientId]
  );
  return rows;
}

/**
 * updateMeeting(meetingId, data)
 *  - Actualiza campos de la reunión según data.
 *  - data puede incluir: meetingDate, location, notes, clientId
 */
async function updateMeeting(meetingId, data) {
  const fields = [];
  const values = [];

  if (data.meetingDate) {
    fields.push('meeting_date = ?');
    values.push(data.meetingDate);
  }
  if (Object.prototype.hasOwnProperty.call(data, 'clientId')) {
    fields.push('client_id = ?');
    values.push(data.clientId);
  }
  if (data.location) {
    fields.push('location = ?');
    values.push(data.location);
  }
  if (data.notes) {
    fields.push('notes = ?');
    values.push(data.notes);
  }

  if (fields.length === 0) return;

  const sql = `
    UPDATE Meetings
    SET ${fields.join(', ')}, updated_at = NOW()
    WHERE id = ?
  `;
  values.push(meetingId);
  await promisePool.query(sql, values);
}

/**
 * deleteMeeting(meetingId)
 *  - Elimina una reunión por su ID.
 */
async function deleteMeeting(meetingId) {
  await promisePool.query(
    `DELETE FROM Meetings WHERE id = ?`,
    [meetingId]
  );
}

module.exports = {
  createMeeting,
  getMeetingById,
  getMeetingsByCloser,
  getMeetingsByClient,
  updateMeeting,
  deleteMeeting
};
