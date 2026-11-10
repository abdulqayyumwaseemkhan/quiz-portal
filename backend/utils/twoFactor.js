const crypto = require('crypto');

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buffer) {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

function base32Decode(str) {
  const cleaned = String(str || '')
    .toUpperCase()
    .replace(/=+$/, '')
    .replace(/[^A-Z2-7]/g, '');

  let bits = 0;
  let value = 0;
  const bytes = [];

  for (let i = 0; i < cleaned.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(cleaned[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

function generateBase32Secret(byteLength = 20) {
  return base32Encode(crypto.randomBytes(byteLength));
}

function buildOtpAuthUri({ secret, email, issuer = 'BanoQabil LMS' }) {
  const label = encodeURIComponent(`${issuer}:${email}`);
  const encodedIssuer = encodeURIComponent(issuer);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}

function generateHotp(secretBuffer, counter) {
  const buf = Buffer.alloc(8);
  let tmp = BigInt(counter);
  for (let i = 7; i >= 0; i--) {
    buf[i] = Number(tmp & 0xffn);
    tmp >>= 8n;
  }

  const hmac = crypto.createHmac('sha1', secretBuffer).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return String(code % 1000000).padStart(6, '0');
}

function verifyTotpToken(base32Secret, token, window = 1) {
  const cleanToken = String(token || '').trim().replace(/\s+/g, '');
  if (!/^\d{6}$/.test(cleanToken) || !base32Secret) return false;

  const secretBuffer = base32Decode(base32Secret);
  const currentCounter = Math.floor(Date.now() / 1000 / 30);

  for (let errorWindow = -window; errorWindow <= window; errorWindow++) {
    const expected = generateHotp(secretBuffer, currentCounter + errorWindow);
    if (expected === cleanToken) {
      return true;
    }
  }
  return false;
}

function generateWebAuthnChallenge() {
  return crypto.randomBytes(32).toString('base64url');
}

function verifyWebAuthnAssertion({
  publicKeySpkiBase64,
  alg = -7,
  expectedChallenge,
  authenticatorDataBase64,
  clientDataJSONBase64,
  signatureBase64,
}) {
  try {
    const clientDataBuffer = Buffer.from(clientDataJSONBase64, 'base64');
    const clientData = JSON.parse(clientDataBuffer.toString('utf8'));

    if (clientData.type !== 'webauthn.get') return false;

    // Only accept assertions created on our own frontend domains
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'https://bql.createxcore.com',
      'http://localhost:5173',
    ]
      .filter(Boolean)
      .map((u) => u.replace(/\/$/, ''));
    if (!allowedOrigins.includes(String(clientData.origin || '').replace(/\/$/, ''))) {
      return false;
    }

    // Normalize base64url challenge comparison
    const receivedChallenge = String(clientData.challenge || '').replace(/=+$/, '');
    const normalizedExpected = String(expectedChallenge || '').replace(/=+$/, '');
    if (receivedChallenge !== normalizedExpected) return false;

    const authDataBuffer = Buffer.from(authenticatorDataBase64, 'base64');
    const clientDataHash = crypto.createHash('sha256').update(clientDataBuffer).digest();
    const signedData = Buffer.concat([authDataBuffer, clientDataHash]);

    const spkiDer = Buffer.from(publicKeySpkiBase64, 'base64');
    const publicKey = crypto.createPublicKey({
      key: spkiDer,
      format: 'der',
      type: 'spki',
    });

    const signatureBuffer = Buffer.from(signatureBase64, 'base64');
    // alg -7 is ES256 (SHA256 with ECDSA DER signature), -257 is RS256
    const isVerified = crypto.verify(
      'sha256',
      signedData,
      publicKey,
      signatureBuffer
    );
    return Boolean(isVerified);
  } catch (err) {
    console.error('WebAuthn verification error:', err.message);
    return false;
  }
}

module.exports = {
  generateBase32Secret,
  buildOtpAuthUri,
  verifyTotpToken,
  generateWebAuthnChallenge,
  verifyWebAuthnAssertion,
};
