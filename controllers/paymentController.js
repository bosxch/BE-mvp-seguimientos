// controllers/paymentController.js
// ===============================
// Lógica de negocio para PaymentProofs.
// Cada comprobante está asociado a un Client.

const {
  addPaymentProof,
  getPaymentProofsByClient,
  deletePaymentProof
} = require('../models/paymentModel');
const { getClientById } = require('../models/clientModel');

/**
 * uploadProof(req, res)
 *  - Sube un comprobante de pago para un cliente.
 *  - Parámetro :clientId en la ruta.
 *  - Formato: multipart/form-data con campo 'file'.
 */
exports.uploadProof = async (req, res) => {
  try {
    const clientId = parseInt(req.params.clientId, 10);
    const requesterId = req.user.userId;
    const requesterRole = req.user.role;

    const client = await getClientById(clientId);
    if (!client) return res.status(404).json({ message: 'Cliente no encontrado' });

    if (requesterRole === 'CLOSER' && client.closerId !== requesterId) {
      return res.status(403).json({ message: 'No tienes permiso para subir comprobantes' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No se recibió archivo' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    const proofId = await addPaymentProof({ clientId, fileUrl });
    return res.status(201).json({ proofId, message: 'Comprobante subido correctamente' });
  } catch (error) {
    console.error('Error en uploadProof:', error);
    return res.status(500).json({ message: 'Error interno en el servidor' });
  }
};

/**
 * listProofs(req, res)
 *  - Lista todos los comprobantes de un cliente.
 *  - Parámetro :clientId en la ruta.
 */
exports.listProofs = async (req, res) => {
  try {
    const clientId = parseInt(req.params.clientId, 10);
    const requesterId = req.user.userId;
    const requesterRole = req.user.role;

    const client = await getClientById(clientId);
    if (!client) return res.status(404).json({ message: 'Cliente no encontrado' });

    if (requesterRole === 'CLOSER' && client.closerId !== requesterId) {
      return res.status(403).json({ message: 'No tienes permiso para ver comprobantes' });
    }

    const proofs = await getPaymentProofsByClient(clientId);
    return res.json(proofs);
  } catch (error) {
    console.error('Error en listProofs:', error);
    return res.status(500).json({ message: 'Error interno en el servidor' });
  }
};

/**
 * deleteProof(req, res)
 *  - Elimina un comprobante específico.
 *  - Parámetros :clientId y :proofId en la ruta.
 */
exports.deleteProof = async (req, res) => {
  try {
    const clientId = parseInt(req.params.clientId, 10);
    const proofId = parseInt(req.params.proofId, 10);
    const requesterId = req.user.userId;
    const requesterRole = req.user.role;

    const client = await getClientById(clientId);
    if (!client) return res.status(404).json({ message: 'Cliente no encontrado' });

    if (requesterRole === 'CLOSER' && client.closerId !== requesterId) {
      return res.status(403).json({ message: 'No tienes permiso para eliminar comprobantes' });
    }

    await deletePaymentProof(proofId);
    return res.json({ message: 'Comprobante eliminado correctamente' });
  } catch (error) {
    console.error('Error en deleteProof:', error);
    return res.status(500).json({ message: 'Error interno en el servidor' });
  }
};
