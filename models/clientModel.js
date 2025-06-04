// models/clientModel.js
// ======================
// Funciones para acceder y manipular datos en la tabla Clients.
// Cada Client está asignado a un Closer (Users.id) y puede tener un Formulario,
// múltiples PaymentProofs y múltiples Meetings (opcionalmente).

const { promisePool } = require('../index');

/**
 * createClient(data)
 *  - Inserta un nuevo cliente asignado a un Closer.
 *  - data: {
 *      name,
 *      companyName?,
 *      email,
 *      closerId,
 *      status?      // Uno de los ENUM definidos en la tabla Clients
 *    }
 */
async function createClient(data) {
  const { name, companyName = null, email, closerId, status = 'PAGO_PENDIENTE' } = data;
  const [result] = await promisePool.query(
    `INSERT INTO Clients
      (name, company_name, email, closer_id, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
    [name, companyName, email, closerId, status]
  );
  return result.insertId;
}

/**
 * getClientById(clientId)
 *  - Devuelve los datos de un cliente, incluyendo:
 *    • Su formulario asociado (ClientForms), si existe.
 *    • Sus comprobantes de pago (PaymentProofs), si existen.
 *    • Sus reuniones (Meetings), si existen.
 */
async function getClientById(clientId) {
  // 1) Obtener datos básicos del cliente
  const [clientRows] = await promisePool.query(
    `SELECT
       C.id,
       C.name,
       C.company_name       AS companyName,
       C.email,
       C.closer_id          AS closerId,
       C.status,
       C.created_at         AS createdAt,
       C.updated_at         AS updatedAt
     FROM Clients C
     WHERE C.id = ?`,
    [clientId]
  );
  if (clientRows.length === 0) return null;

  const client = clientRows[0];

  // 2) Obtener formulario (1:1)
  const [formRows] = await promisePool.query(
    `SELECT
       id,
       form_data         AS formData,
       submitted_at      AS submittedAt
     FROM ClientForms
     WHERE client_id = ?`,
    [clientId]
  );
  client.form = formRows[0] || null;

  // 3) Obtener comprobantes (1:N)
  const [proofRows] = await promisePool.query(
    `SELECT
       id              AS proofId,
       file_url        AS fileUrl,
       uploaded_at     AS uploadedAt
     FROM PaymentProofs
     WHERE client_id = ?
     ORDER BY uploaded_at DESC`,
    [clientId]
  );
  client.paymentProofs = proofRows;

  // 4) Obtener reuniones (0:N)
  const [meetingRows] = await promisePool.query(
    `SELECT
       id,
       meeting_date    AS meetingDate,
       location,
       notes,
       created_at      AS createdAt,
       updated_at      AS updatedAt
     FROM Meetings
     WHERE client_id = ?
     ORDER BY meeting_date DESC`,
    [clientId]
  );
  client.meetings = meetingRows;

  return client;
}

/**
 * updateClientStatus(clientId, newStatus)
 *  - Cambia el estado de un cliente y actualiza updated_at.
 */
async function updateClientStatus(clientId, newStatus) {
  await promisePool.query(
    `UPDATE Clients
     SET status = ?, updated_at = NOW()
     WHERE id = ?`,
    [newStatus, clientId]
  );
}

/**
 * reassignClient(clientId, newCloserId)
 *  - Permite reasignar un cliente a otro Closer (Users.id).
 */
async function reassignClient(clientId, newCloserId) {
  await promisePool.query(
    `UPDATE Clients
     SET closer_id = ?, updated_at = NOW()
     WHERE id = ?`,
    [newCloserId, clientId]
  );
}

/**
 * deleteClient(clientId)
 *  - Elimina un cliente (cascade en ClientForms y PaymentProofs, 
 *    y SET NULL en Meetings.client_id según FK).
 */
async function deleteClient(clientId) {
  await promisePool.query(
    `DELETE FROM Clients WHERE id = ?`,
    [clientId]
  );
}

module.exports = {
  createClient,
  getClientById,
  updateClientStatus,
  reassignClient,
  deleteClient
};
