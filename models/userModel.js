// models/userModel.js
// ====================
// Funciones para acceder y manipular datos en la tabla Users,
// considerándola como Admin o Closer. Un Closer puede tener múltiples Clients y Meetings.

const { promisePool } = require('../index');

/**
 * getUserById(id)
 *  - Devuelve un objeto con todos los campos del usuario (Admin o Closer) según su ID.
 */
async function getUserById(id) {
  const [rows] = await promisePool.query(
    `SELECT 
       id,
       email,
       name,
       role,
       objective,
       achieved,
       percent_complete AS percentComplete,
       group_objective    AS groupObjective,
       group_achieved     AS groupAchieved,
       group_percent_complete AS groupPercentComplete,
       created_at   AS createdAt,
       updated_at   AS updatedAt
     FROM Users
     WHERE id = ?`,
    [id]
  );
  return rows[0] || null;
}

/**
 * getUserByEmail(email)
 *  - Devuelve un objeto con todos los campos del usuario según su email.
 */
async function getUserByEmail(email) {
  const [rows] = await promisePool.query(
    `SELECT 
       id,
       email,
       name,
       role,
       password_hash AS passwordHash,
       objective,
       achieved,
       percent_complete AS percentComplete,
       created_at   AS createdAt,
       updated_at   AS updatedAt
     FROM Users
     WHERE email = ?`,
    [email]
  );
  return rows[0] || null;
}

/**
 * createUser(data)
 *  - Inserta un nuevo usuario(Admin o Closer). Devuelve el ID insertado.
 *  - data: {
 *      email,
 *      passwordHash,
 *      name,
 *      role,           // 'ADMIN' o 'CLOSER'
 *      objective?,     // solo para Closers
 *      groupObjective? // solo para Admins
 *    }
 */
async function createUser(data) {
  const {
    email,
    passwordHash,
    name,
    role,
    objective = 0,
    achieved = 0,
    percentComplete = 0,
    groupObjective = null,
    groupAchieved = 0,
    groupPercentComplete = 0
  } = data;

  const [result] = await promisePool.query(
    `INSERT INTO Users
      (email, password_hash, name, role, objective, achieved, percent_complete, group_objective, group_achieved, group_percent_complete, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      email,
      passwordHash,
      name,
      role,
      role === 'CLOSER' ? objective : 0,
      achieved,
      percentComplete,
      role === 'ADMIN' ? groupObjective : null,
      groupAchieved,
      groupPercentComplete
    ]
  );
  return result.insertId;
}

/**
 * updateUserPassword(userId, newPasswordHash)
 *  - Actualiza la contraseña hasheada de un usuario.
 */
async function updateUserPassword(userId, newPasswordHash) {
  await promisePool.query(
    `UPDATE Users
     SET password_hash = ?, updated_at = NOW()
     WHERE id = ?`,
    [newPasswordHash, userId]
  );
}

/**
 * updateObjective(userId, newObjective)
 *  - Solo para Closers: actualiza el objetivo y recalcula percent_complete.
 */
async function updateObjective(userId, newObjective) {
  await promisePool.query(
    `UPDATE Users
     SET objective = ?, 
         percent_complete = IF(newObjective = 0, 0, (achieved / ?) * 100),
         updated_at = NOW()
     WHERE id = ? AND role = 'CLOSER'`,
    [newObjective, newObjective, userId]
  );
}

/**
 * incrementAchieved(userId, amount)
 *  - Suma al campo 'achieved' de un Closer y recalcula percent_complete.
 */
async function incrementAchieved(userId, amount) {
  // Obtenemos el objetivo actual para recalcular porcentaje
  const [rows] = await promisePool.query(
    `SELECT objective, achieved FROM Users WHERE id = ? AND role = 'CLOSER'`,
    [userId]
  );
  if (rows.length === 0) return;

  const { objective, achieved } = rows[0];
  const newAchieved = parseFloat(achieved) + parseFloat(amount);
  const newPercent = objective > 0 ? (newAchieved / objective) * 100 : 0;

  await promisePool.query(
    `UPDATE Users 
     SET achieved = ?, percent_complete = ?, updated_at = NOW()
     WHERE id = ?`,
    [newAchieved, newPercent, userId]
  );
}

/**
 * getClientsByCloser(closerId)
 *  - Devuelve todos los clientes asignados a un Closer, ordenados por updated_at desc.
 */
async function getClientsByCloser(closerId) {
  const [rows] = await promisePool.query(
    `SELECT 
       id,
       name,
       company_name        AS companyName,
       email,
       status,
       created_at    AS createdAt,
       updated_at    AS updatedAt
     FROM Clients
     WHERE closer_id = ?
     ORDER BY updated_at DESC`,
    [closerId]
  );
  return rows;
}

/**
 * getMeetingsByCloser(closerId)
 *  - Devuelve todas las reuniones asociadas a un Closer.
 */
async function getMeetingsByCloser(closerId) {
  const [rows] = await promisePool.query(
    `SELECT 
       M.id,
       M.client_id       AS clientId,
       M.meeting_date    AS meetingDate,
       M.location,
       M.notes,
       M.created_at      AS createdAt,
       M.updated_at      AS updatedAt
     FROM Meetings M
     WHERE M.closer_id = ?
     ORDER BY M.meeting_date DESC`,
    [closerId]
  );
  return rows;
}

async function getAllClosers() {
  const [rows] = await promisePool.query(`
    SELECT 
      id,
      name,
      email,
      objective,
      achieved,
      percent_complete AS percentComplete
    FROM Users
    WHERE role = 'CLOSER'
  `);
  return rows;
}

module.exports = {
  getUserById,
  getUserByEmail,
  createUser,
  updateUserPassword,
  updateObjective,
  incrementAchieved,
  getClientsByCloser,
  getMeetingsByCloser,
  getAllClosers
};