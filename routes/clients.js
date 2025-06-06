// routes/clients.js
// =============================
// Rutas para Clientes

const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
// Multer para subir archivos (comprobantes)
const multer = require('multer');
const path = require('path');
const auth = require('../middlewares/auth');

const upload = multer({ dest: path.join(__dirname, '../uploads') });

/**
 * POST /api/clients
 *  - Crea un cliente nuevo (Closer autenticado).
 *  - Body: { name, companyName?, email, status? }
 */
router.post('/', auth, clientController.createNewClient);

/**
 * GET /api/clients/:id
 *  - Obtiene detalles completos de un cliente (incluye formulario, comprobantes y reuniones).
 */
router.get('/:id', auth, clientController.getClientDetails);

/**
 * PUT /api/clients/:id/status
 *  - Actualiza el estado de un cliente.
 *  - Body: { status }
 */
router.put('/:id/status', auth, clientController.updateClientState);

/**
 * PUT /api/clients/:id/reassign
 *  - Reasigna un cliente a otro Closer (solo ADMIN).
 *  - Body: { newCloserId }
 */
router.put('/:id/reassign', auth, clientController.reassignExistingClient);

/**
 * DELETE /api/clients/:id
 *  - Elimina un cliente (solo ADMIN).
 */
router.delete('/:id', auth, clientController.deleteExistingClient);

/**
 * POST /api/clients/:id/payment-proof
 *  - Sube un comprobante de pago para el cliente.
 *  - Formato: multipart/form-data con campo 'file'
 */
router.post(
  '/:id/payment-proof',
  auth,
  upload.single('file'),
  clientController.uploadClientPaymentProof
);

/**
 * GET /api/clients/:id/payment-proofs
 *  - Lista todos los comprobantes de pago de un cliente.
 */
router.get('/:id/payment-proofs', auth, clientController.listClientPaymentProofs);

/**
 * DELETE /api/clients/:id/payment-proofs/:proofId
 *  - Elimina un comprobante específico de un cliente.
 */
router.delete(
  '/:id/payment-proofs/:proofId',
  auth,
  clientController.deleteClientPaymentProof
);

module.exports = router;
