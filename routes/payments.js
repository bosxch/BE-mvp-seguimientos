// routes/payments.js
// =============================
// Rutas para PaymentProofs (Comprobantes de Pago)

const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const auth = require('../middlewares/auth');
const multer = require('multer');
const path = require('path');

const upload = multer({ dest: path.join(__dirname, '../uploads') });

/**
 * POST /api/payments/:clientId
 *  - Sube un comprobante para el cliente.
 *  - Formato: multipart/form-data con campo 'file'
 */
router.post(
  '/:clientId',
  auth,
  upload.single('file'),
  paymentController.uploadProof
);

/**
 * GET /api/payments/:clientId
 *  - Lista todos los comprobantes de un cliente.
 */
router.get('/:clientId', auth, paymentController.listProofs);

/**
 * DELETE /api/payments/:clientId/:proofId
 *  - Elimina un comprobante específico de un cliente.
 */
router.delete('/:clientId/:proofId', auth, paymentController.deleteProof);

module.exports = router;
