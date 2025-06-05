// controllers/userController.js
// =============================
// Lógica de negocio para Users (Admins y Closers).
// Utiliza funciones de models/userModel.js.

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {
  getUserByEmail,
  getUserById,
  createUser,
  updateUserPassword,
  updateObjective,
  incrementAchieved,
  getClientsByCloser,
  getMeetingsByCloser
} = require('../models/userModel');

/**
 * login(req, res)
 *  - Autentica a un usuario verificando email y contraseña.
 *  - Devuelve un JWT que incluye userId y role.
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    // 1) Obtener usuario por email
    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }
    // 2) Verificar contraseña
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }
    // 3) Generar token JWT
    const payload = { userId: user.id, role: user.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });
    return res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({ message: 'Error interno en el servidor' });
  }
};

/**
 * registerUser(req, res)
 *  - Permite a un ADMIN crear otro ADMIN o un CLOSER.
 *  - El cuerpo debe incluir: email, password, name, role, objective? (solo CLOSER), groupObjective? (solo ADMIN).
 */
exports.registerUser = async (req, res) => {
  try {
    const { email, password, name, role, objective, groupObjective } = req.body;
    // 1) Validar que el rol sea ADMIN o CLOSER
    if (!['ADMIN', 'CLOSER'].includes(role)) {
      return res.status(400).json({ message: 'Role inválido' });
    }
    // 2) Verificar que no exista user con ese email
    const existing = await getUserByEmail(email);
    if (existing) {
      return res.status(409).json({ message: 'Email ya registrado' });
    }
    // 3) Hashear contraseña
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    // 4) Crear usuario
    const newUserId = await createUser({
      email,
      passwordHash,
      name,
      role,
      objective: role === 'CLOSER' ? objective || 0 : undefined,
      groupObjective: role === 'ADMIN' ? groupObjective || 0 : undefined
    });
    return res.status(201).json({ userId: newUserId, message: 'Usuario creado correctamente' });
  } catch (error) {
    console.error('Error en registerUser:', error);
    return res.status(500).json({ message: 'Error interno en el servidor' });
  }
};

/**
 * getProfile(req, res)
 *  - Devuelve la información del usuario autenticado.
 *  - Extrae userId del token (req.user.userId).
 */
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    return res.json(user);
  } catch (error) {
    console.error('Error en getProfile:', error);
    return res.status(500).json({ message: 'Error interno en el servidor' });
  }
};

/**
 * updatePassword(req, res)
 *  - Permite a un usuario cambiar su propia contraseña.
 *  - El cuerpo: { currentPassword, newPassword }
 */
exports.updatePassword = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;
    // 1) Obtener usuario
    const user = await getUserById(userId);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    // 2) Verificar contraseña actual
    const match = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!match) return res.status(401).json({ message: 'Contraseña actual incorrecta' });
    // 3) Hashear nueva contraseña y actualizar
    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);
    await updateUserPassword(userId, newHash);
    return res.json({ message: 'Contraseña actualizada exitosamente' });
  } catch (error) {
    console.error('Error en updatePassword:', error);
    return res.status(500).json({ message: 'Error interno en el servidor' });
  }
};

/**
 * updateCloserObjective(req, res)
 *  - Solo CLOSER: actualiza su objetivo.
 *  - El cuerpo: { objective }
 */
exports.updateCloserObjective = async (req, res) => {
  try {
    const userId = req.user.userId;
    const role = req.user.role;
    const { objective } = req.body;
    if (role !== 'CLOSER') {
      return res.status(403).json({ message: 'Solo los Closers pueden actualizar su objetivo' });
    }
    await updateObjective(userId, objective);
    return res.json({ message: 'Objetivo actualizado' });
  } catch (error) {
    console.error('Error en updateCloserObjective:', error);
    return res.status(500).json({ message: 'Error interno en el servidor' });
  }
};

/**
 * addAchievedAmount(req, res)
 *  - Solo CLOSER: incrementa el campo 'achieved' y recalcula porcentaje.
 *  - El cuerpo: { amount }
 */
exports.addAchievedAmount = async (req, res) => {
  try {
    const userId = req.user.userId;
    const role = req.user.role;
    const { amount } = req.body;
    if (role !== 'CLOSER') {
      return res.status(403).json({ message: 'Solo los Closers pueden actualizar su avance' });
    }
    await incrementAchieved(userId, amount);
    return res.json({ message: 'Avance actualizado' });
  } catch (error) {
    console.error('Error en addAchievedAmount:', error);
    return res.status(500).json({ message: 'Error interno en el servidor' });
  }
};

/**
 * listClientsOfCloser(req, res)
 *  - Devuelve todos los clientes asignados al Closer autenticado.
 */
exports.listClientsOfCloser = async (req, res) => {
  try {
    const userId = req.user.userId;
    const role = req.user.role;
    if (role !== 'CLOSER') {
      return res.status(403).json({ message: 'Solo los Closers pueden ver sus clientes' });
    }
    const clients = await getClientsByCloser(userId);
    return res.json(clients);
  } catch (error) {
    console.error('Error en listClientsOfCloser:', error);
    return res.status(500).json({ message: 'Error interno en el servidor' });
  }
};

/**
 * listMeetingsOfCloser(req, res)
 *  - Devuelve todas las reuniones del Closer autenticado.
 */
exports.listMeetingsOfCloser = async (req, res) => {
  try {
    const userId = req.user.userId;
    const role = req.user.role;
    if (role !== 'CLOSER') {
      return res.status(403).json({ message: 'Solo los Closers pueden ver sus reuniones' });
    }
    const meetings = await getMeetingsByCloser(userId);
    return res.json(meetings);
  } catch (error) {
    console.error('Error en listMeetingsOfCloser:', error);
    return res.status(500).json({ message: 'Error interno en el servidor' });
  }
};
