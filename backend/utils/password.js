const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Exclude confusing characters: 0, O, o, l, 1, I
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghijkmnopqrstuvwxyz';
const DIGITS = '23456789';
const SYMBOLS = '@#$%&*!?';
const ALL_CHARS = UPPER + LOWER + DIGITS + SYMBOLS;

function getCipherKey() {
  const secret = process.env.JWT_SECRET || 'banoqabil_default_cipher_secret_key';
  return crypto.createHash('sha256').update(String(secret)).digest();
}

/**
 * Encrypts a student's plain password with AES-256-CBC so only the Admin Panel
 * can decrypt and view/manage it anytime.
 */
function encryptStudentPassword(plainPassword) {
  if (!plainPassword) return '';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', getCipherKey(), iv);
  let encrypted = cipher.update(String(plainPassword), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

function decryptStudentPassword(cipherText) {
  if (!cipherText || !String(cipherText).includes(':')) return '';
  try {
    const [ivHex, encryptedHex] = String(cipherText).split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', getCipherKey(), iv);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return '';
  }
}

/**
 * Generates a cryptographically random password of length 9-10
 * without confusing characters (0/O/l/1/I).
 */
function generateSecurePassword(length = 9) {
  const pick = (charset) => charset[crypto.randomInt(0, charset.length)];

  const required = [
    pick(UPPER),
    pick(LOWER),
    pick(DIGITS),
    pick(SYMBOLS),
  ];

  for (let i = required.length; i < length; i++) {
    required.push(pick(ALL_CHARS));
  }

  for (let i = required.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [required[i], required[j]] = [required[j], required[i]];
  }

  return required.join('');
}

async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, 10);
}

async function verifyPassword(plainPassword, hash) {
  if (!plainPassword || !hash) return false;
  return bcrypt.compare(plainPassword, hash);
}

module.exports = {
  generateSecurePassword,
  hashPassword,
  verifyPassword,
  encryptStudentPassword,
  decryptStudentPassword,
};
