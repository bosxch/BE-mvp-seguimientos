// controllers/clientController.js
// ===============================
// Lógica de negocio para Clients.
// Un Client está asignado a un Closer y puede tener Formulario, PaymentProofs y Meetings.

const {
  createClient,
  getClientById,
  updateClientStatus,
  reassignClient,
  deleteClient
} = require('../models/clientModel');

const { addPaymentProof, getPaymentProofsByClient, deletePaymentProof } = require('../models/paymentModel');
const { createMeeting, getMeetingsByClient } = require('../models/meetingModel');

/**
 * createNewClient(req, res)
 *  - Permite a un Closer crear un cliente manualmente.
 *  - El cuerpo: { name, companyName?, email, status? }
 *  - Asigna automáticamente closerId = req.user.userId.
 */
exports.createNewClient = async (req, res) => {
  try {
    const closerId = req.user.userId;
    const { name, companyName, email, status } = req.body;
    const newClientId = await createClient({ name, companyName, email, closerId, status });
    return res.status(201).json({ clientId: newClientId, message: 'Cliente creado correctamente' });
  } catch (error) {
    console.error('Error en createNewClient:', error);
    return res.status(500).json({ message: 'Error interno en el servidor' });
  }
};

/**
 * getClientDetails(req, res)
 *  - Devuelve todos los datos del cliente, incluyendo:
 *    • Su formulario (ClientForms) - NO implementado aquí (controller separado).
 *    • Sus comprobantes de pago (PaymentProofs).
 *    • Sus reuniones (Meetings).
 *  - El parámetro :id en la ruta es clientId.
 *  - El Closer solo puede ver su propio cliente, ADMIN puede ver cualquiera.
 */
exports.getClientDetails = async (req, res) => {
  try {
    const clientId = parseInt(req.params.id, 10);
    const requesterId = req.user.userId;
    const requesterRole = req.user.role;

    // 1) Obtener cliente con todos sus datos
    const client = await getClientById(clientId);
    if (!client) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }
    // 2) Verificar permisos: si es CLOSER, solo su propio
    if (requesterRole === 'CLOSER' && client.closerId !== requesterId) {
      return res.status(403).json({ message: 'No tienes permiso para ver este cliente' });
    }
    // 3) Recuperar comprobantes y reuniones
    const proofs = await getPaymentProofsByClient(clientId);
    const meetings = await getMeetingsByClient(clientId);

    return res.json({
      ...client,
      paymentProofs: proofs,
      meetings: meetings
    });
  } catch (error) {
    console.error('Error en getClientDetails:', error);
    return res.status(500).json({ message: 'Error interno en el servidor' });
  }
};

/**
 * updateClientState(req, res)
 *  - Permite cambiar el estado de un cliente.
 *  - El cuerpo: { status }
 *  - Solo el Closer dueño o ADMIN.
 */
exports.updateClientState = async (req, res) => {
  try {
    const clientId = parseInt(req.params.id, 10);
    const { status } = req.body;
    const requesterId = req.user.userId;
    const requesterRole = req.user.role;

    const client = await getClientById(clientId);
    if (!client) return res.status(404).json({ message: 'Cliente no encontrado' });

    if (requesterRole === 'CLOSER' && client.closerId !== requesterId) {
      return res.status(403).json({ message: 'No tienes permiso para actualizar este cliente' });
    }

    await updateClientStatus(clientId, status);
    return res.json({ message: 'Estado del cliente actualizado' });
  } catch (error) {
    console.error('Error en updateClientState:', error);
    return res.status(500).json({ message: 'Error interno en el servidor' });
  }
};

/**
 * reassignExistingClient(req, res)
 *  - Permite a un ADMIN reasignar un cliente a otro Closer.
 *  - El cuerpo: { newCloserId }
 */
exports.reassignExistingClient = async (req, res) => {
  try {
    const clientId = parseInt(req.params.id, 10);
    const { newCloserId } = req.body;
    const requesterRole = req.user.role;

    if (requesterRole !== 'ADMIN') {
      return res.status(403).json({ message: 'Solo ADMIN puede reasignar clientes' });
    }

    const client = await getClientById(clientId);
    if (!client) return res.status(404).json({ message: 'Cliente no encontrado' });

    await reassignClient(clientId, newCloserId);
    return res.json({ message: 'Cliente reasignado correctamente' });
  } catch (error) {
    console.error('Error en reassignExistingClient:', error);
    return res.status(500).json({ message: 'Error interno en el servidor' });
  }
};

/**
 * deleteExistingClient(req, res)
 *  - Permite a un ADMIN eliminar un cliente (cascada en formularios y comprobantes, reuniones solo set-null).
 */
exports.deleteExistingClient = async (req, res) => {
  try {
    const clientId = parseInt(req.params.id, 10);
    const requesterRole = req.user.role;

    if (requesterRole !== 'ADMIN') {
      return res.status(403).json({ message: 'Solo ADMIN puede eliminar clientes' });
    }

    const client = await getClientById(clientId);
    if (!client) return res.status(404).json({ message: 'Cliente no encontrado' });

    await deleteClient(clientId);
    return res.json({ message: 'Cliente eliminado correctamente' });
  } catch (error) {
    console.error('Error en deleteExistingClient:', error);
    return res.status(500).json({ message: 'Error interno en el servidor' });
  }
};

/**
 * uploadClientPaymentProof(req, res)
 *  - Asigna un comprobante de pago a un cliente.
 *  - El formulario debe enviarse como 'multipart/form-data' con campo 'file'.
 */
exports.uploadClientPaymentProof = async (req, res) => {
  try {
    const clientId = parseInt(req.params.id, 10);
    const requesterId = req.user.userId;
    const requesterRole = req.user.role;

    const client = await getClientById(clientId);
    if (!client) return res.status(404).json({ message: 'Cliente no encontrado' });

    if (requesterRole === 'CLOSER' && client.closerId !== requesterId) {
      return res.status(403).json({ message: 'No tienes permiso para subir comprobantes a este cliente' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No se recibió archivo' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    const proofId = await addPaymentProof({ clientId, fileUrl });
    return res.status(201).json({ proofId, message: 'Comprobante subido correctamente' });
  } catch (error) {
    console.error('Error en uploadClientPaymentProof:', error);
    return res.status(500).json({ message: 'Error interno en el servidor' });
  }
};

/**
 * listClientPaymentProofs(req, res)
 *  - Lista todos los comprobantes de un cliente.
 */
exports.listClientPaymentProofs = async (req, res) => {
  try {
    const clientId = parseInt(req.params.id, 10);
    const requesterId = req.user.userId;
    const requesterRole = req.user.role;

    const client = await getClientById(clientId);
    if (!client) return res.status(404).json({ message: 'Cliente no encontrado' });

    if (requesterRole === 'CLOSER' && client.closerId !== requesterId) {
      return res.status(403).json({ message: 'No tienes permiso para ver comprobantes de este cliente' });
    }

    const proofs = await getPaymentProofsByClient(clientId);
    return res.json(proofs);
  } catch (error) {
    console.error('Error en listClientPaymentProofs:', error);
    return res.status(500).json({ message: 'Error interno en el servidor' });
  }
};

/**
 * deleteClientPaymentProof(req, res)
 *  - Elimina un comprobante específico de un cliente.
 */
exports.deleteClientPaymentProof = async (req, res) => {
  try {
    const clientId = parseInt(req.params.id, 10);
    const proofId = parseInt(req.params.proofId, 10);
    const requesterId = req.user.userId;
    const requesterRole = req.user.role;

    const client = await getClientById(clientId);
    if (!client) return res.status(404).json({ message: 'Cliente no encontrado' });

    if (requesterRole === 'CLOSER' && client.closerId !== requesterId) {
      return res.status(403).json({ message: 'No tienes permiso para eliminar comprobantes de este cliente' });
    }

    await deletePaymentProof(proofId);
    return res.json({ message: 'Comprobante eliminado correctamente' });
  } catch (error) {
    console.error('Error en deleteClientPaymentProof:', error);
    return res.status(500).json({ message: 'Error interno en el servidor' });
  }
};
