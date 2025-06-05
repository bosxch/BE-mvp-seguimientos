// models/paymentModel.js
// ======================
// Funciones para acceder y manipular datos en la tabla PaymentProofs.
// Cada PaymentProof está asociado a un Client (Clients.id).

const { promisePool } = require('../index');

/**
 * addPaymentProof(data)
 *  - Inserta un nuevo comprobante de pago.
 *  - data: {
 *      clientId,
 *      fileUrl              // Ruta al archivo subido (ej: '/uploads/archivo.png')
 *    }
 */
async function addPaymentProof(data) {
  const { clientId, fileUrl } = data;
  const [result] = await promisePool.query(
    `INSERT INTO PaymentProofs
      (client_id, file_url, uploaded_at)
     VALUES (?, ?, NOW())`,
    [clientId, fileUrl]
  );
  return result.insertId;
}

/**
 * getPaymentProofsByClient(clientId)
 *  - Devuelve un array con todos los comprobantes de un Client.
 */
async function getPaymentProofsByClient(clientId) {
  const [rows] = await promisePool.query(
    `SELECT
       id              AS proofId,
       file_url        AS fileUrl,
       uploaded_at     AS uploadedAt
     FROM PaymentProofs
     WHERE client_id = ?
     ORDER BY uploaded_at DESC`,
    [clientId]
  );
  return rows;
}

/**
 * deletePaymentProof(proofId)
 *  - Elimina un comprobante específico.
 */
async function deletePaymentProof(proofId) {
  await promisePool.query(
    `DELETE FROM PaymentProofs WHERE id = ?`,
    [proofId]
  );
}

/**
 * deleteProofsByClient(clientId)
 *  - Elimina todos los comprobantes de un cliente (opcional antes de borrar cliente).
 */
async function deleteProofsByClient(clientId) {
  await promisePool.query(
    `DELETE FROM PaymentProofs WHERE client_id = ?`,
    [clientId]
  );
}

module.exports = {
  addPaymentProof,
  getPaymentProofsByClient,
  deletePaymentProof,
  deleteProofsByClient
};
