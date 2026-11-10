const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Exclude confusing characters: 0, O, o, l, 1, I
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghijkmnopqrstuvwxyz';
const DIGITS = '23456789';
const SYMBOLS = '@#$%&*!?';
const ALL_CHARS = UPPER + LOWER + DIGITS + SYMBOLS;

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

  // Fisher-Yates shuffle with crypto.randomInt
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
};
