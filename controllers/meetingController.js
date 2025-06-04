// controllers/meetingController.js
// ================================
// Lógica de negocio para Meetings.
// Cada Meeting se asigna a un Closer y opcionalmente a un Client.

const {
  createMeeting,
  getMeetingById,
  getMeetingsByCloser,
  getMeetingsByClient,
  updateMeeting,
  deleteMeeting
} = require('../models/meetingModel');

/**
 * scheduleMeeting(req, res)
 *  - Crea una nueva reunión.
 *  - El cuerpo: { clientId? (int|null), meetingDate (ISO string), location?, notes? }
 *  - closerId se extrae de req.user.userId.
 */
exports.scheduleMeeting = async (req, res) => {
  try {
    const closerId = req.user.userId;
    const { clientId = null, meetingDate, location, notes } = req.body;
    const meetingId = await createMeeting({ closerId, clientId, meetingDate, location, notes });
    return res.status(201).json({ meetingId, message: 'Reunión creada correctamente' });
  } catch (error) {
    console.error('Error en scheduleMeeting:', error);
    return res.status(500).json({ message: 'Error interno en el servidor' });
  }
};

/**
 * getMeetingDetails(req, res)
 *  - Devuelve datos completos de una reunión.
 *  - Parámetro :id es meetingId.
 *  - El Closer solo puede ver sus propias reuniones; ADMIN puede ver cualquiera.
 */
exports.getMeetingDetails = async (req, res) => {
  try {
    const meetingId = parseInt(req.params.id, 10);
    const requesterId = req.user.userId;
    const requesterRole = req.user.role;

    const meeting = await getMeetingById(meetingId);
    if (!meeting) return res.status(404).json({ message: 'Reunión no encontrada' });

    if (requesterRole === 'CLOSER' && meeting.closerId !== requesterId) {
      return res.status(403).json({ message: 'No tienes permiso para ver esta reunión' });
    }
    return res.json(meeting);
  } catch (error) {
    console.error('Error en getMeetingDetails:', error);
    return res.status(500).json({ message: 'Error interno en el servidor' });
  }
};

/**
 * listMeetingsForCloser(req, res)
 *  - Lista todas las reuniones del Closer autenticado.
 */
exports.listMeetingsForCloser = async (req, res) => {
  try {
    const closerId = req.user.userId;
    const role = req.user.role;
    if (role !== 'CLOSER') {
      return res.status(403).json({ message: 'Solo los Closers pueden ver sus reuniones' });
    }
    const meetings = await getMeetingsByCloser(closerId);
    return res.json(meetings);
  } catch (error) {
    console.error('Error en listMeetingsForCloser:', error);
    return res.status(500).json({ message: 'Error interno en el servidor' });
  }
};

/**
 * listMeetingsForClient(req, res)
 *  - Lista todas las reuniones asociadas a un Cliente.
 *  - ADMIN o el Closer asignado al cliente pueden verlas.
 */
exports.listMeetingsForClient = async (req, res) => {
  try {
    const clientId = parseInt(req.params.clientId, 10);
    const requesterId = req.user.userId;
    const role = req.user.role;

    // getMeetingsByClient devuelve reuniones con info de closer
    const meetings = await getMeetingsByClient(clientId);
    if (role === 'CLOSER') {
      // Filtrar solo las reuniones donde closerId === requesterId
      const ownMeetings = meetings.filter(m => m.closerId === requesterId);
      return res.json(ownMeetings);
    }
    // ADMIN puede ver todas
    return res.json(meetings);
  } catch (error) {
    console.error('Error en listMeetingsForClient:', error);
    return res.status(500).json({ message: 'Error interno en el servidor' });
  }
};

/**
 * updateExistingMeeting(req, res)
 *  - Actualiza una reunión existente.
 *  - Parámetro :id es meetingId.
 *  - El cuerpo puede incluir: meetingDate, location, notes, clientId.
 *  - Solo el Closer dueño o ADMIN pueden actualizar.
 */
exports.updateExistingMeeting = async (req, res) => {
  try {
    const meetingId = parseInt(req.params.id, 10);
    const requesterId = req.user.userId;
    const requesterRole = req.user.role;
    const data = req.body; // puede contener meetingDate, location, notes, clientId

    const meeting = await getMeetingById(meetingId);
    if (!meeting) return res.status(404).json({ message: 'Reunión no encontrada' });

    if (requesterRole === 'CLOSER' && meeting.closerId !== requesterId) {
      return res.status(403).json({ message: 'No tienes permiso para modificar esta reunión' });
    }

    await updateMeeting(meetingId, data);
    return res.json({ message: 'Reunión actualizada correctamente' });
  } catch (error) {
    console.error('Error en updateExistingMeeting:', error);
    return res.status(500).json({ message: 'Error interno en el servidor' });
  }
};

/**
 * deleteExistingMeeting(req, res)
 *  - Elimina una reunión.
 *  - Parámetro :id es meetingId.
 *  - Solo el Closer dueño o ADMIN pueden eliminar.
 */
exports.deleteExistingMeeting = async (req, res) => {
  try {
    const meetingId = parseInt(req.params.id, 10);
    const requesterId = req.user.userId;
    const requesterRole = req.user.role;

    const meeting = await getMeetingById(meetingId);
    if (!meeting) return res.status(404).json({ message: 'Reunión no encontrada' });

    if (requesterRole === 'CLOSER' && meeting.closerId !== requesterId) {
      return res.status(403).json({ message: 'No tienes permiso para eliminar esta reunión' });
    }

    await deleteMeeting(meetingId);
    return res.json({ message: 'Reunión eliminada correctamente' });
  } catch (error) {
    console.error('Error en deleteExistingMeeting:', error);
    return res.status(500).json({ message: 'Error interno en el servidor' });
  }
};
