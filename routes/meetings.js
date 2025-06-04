// routes/meetings.js
// =============================
// Rutas para Meetings (Reuniones)

const express = require('express');
const router = express.Router();
const meetingController = require('../controllers/meetingController');
const auth = require('../middlewares/auth');

/**
 * POST /api/meetings
 *  - Crea una nueva reunión.
 *  - Body: { clientId? (int|null), meetingDate (ISO string), location?, notes? }
 */
router.post('/', auth, meetingController.scheduleMeeting);

/**
 * GET /api/meetings/:id
 *  - Obtiene detalles de una reunión específica.
 */
router.get('/:id', auth, meetingController.getMeetingDetails);

/**
 * GET /api/meetings/closer
 *  - Lista todas las reuniones del Closer autenticado.
 */
router.get('/closer', auth, meetingController.listMeetingsForCloser);

/**
 * GET /api/meetings/client/:clientId
 *  - Lista todas las reuniones asociadas a un cliente.
 */
router.get('/client/:clientId', auth, meetingController.listMeetingsForClient);

/**
 * PUT /api/meetings/:id
 *  - Actualiza datos de una reunión.
 *  - Body puede incluir: { meetingDate, location, notes, clientId }
 */
router.put('/:id', auth, meetingController.updateExistingMeeting);

/**
 * DELETE /api/meetings/:id
 *  - Elimina una reunión.
 */
router.delete('/:id', auth, meetingController.deleteExistingMeeting);

module.exports = router;
