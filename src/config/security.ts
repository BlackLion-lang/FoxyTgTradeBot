import * as crypto from 'crypto';

export function uint8ArrayToBase64(arr: Uint8Array): string {
  return Buffer.from(arr).toString('base64');
}

export function base64ToUint8Array(base64: string): Uint8Array {
  return new Uint8Array(Buffer.from(base64, 'base64'));
}

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;

const MIN_ENCRYPTION_KEY_LENGTH = 32;

/**
 * Returns `process.env.ENCRYPTION_KEY` after validation.
 * No in-repo or empty fallback — a missing/weak key must fail at runtime so secrets are never derived from guessable defaults.
 */
export function getEncryptionKey(): string {
  const envKey = process.env.ENCRYPTION_KEY;
  if (!envKey || envKey.length < MIN_ENCRYPTION_KEY_LENGTH) {
    throw new Error(
      `ENCRYPTION_KEY must be set to at least ${MIN_ENCRYPTION_KEY_LENGTH} characters (use a long random secret, never commit it).`,
    );
  }
  return envKey;
}

export function encryptSecretKey(secretKeyBase64: string, password?: string): string {
  const encryptionKey = password || getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = crypto.scryptSync(encryptionKey, salt, KEY_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(secretKeyBase64, 'utf8'),
    cipher.final(),
  ]);

  return Buffer.concat([salt, iv, encrypted]).toString('base64');
}

export function decryptSecretKey(encryptedBase64: string, password?: string): string {
  if (!encryptedBase64 || typeof encryptedBase64 !== 'string') {
    throw new Error('Invalid encrypted data: empty or not a string');
  }

  try {
    const encryptionKey = password || getEncryptionKey();
    const data = Buffer.from(encryptedBase64, 'base64');

    if (data.length < SALT_LENGTH + IV_LENGTH) {
      throw new Error(`Invalid encrypted data: too short (${data.length} bytes, expected at least ${SALT_LENGTH + IV_LENGTH} bytes)`);
    }

    const salt = data.slice(0, SALT_LENGTH);
    const iv = data.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const encrypted = data.slice(SALT_LENGTH + IV_LENGTH);

    if (iv.length !== IV_LENGTH) {
      throw new Error(`Invalid IV length: ${iv.length} bytes, expected ${IV_LENGTH} bytes`);
    }

    const key = crypto.scryptSync(encryptionKey, salt, KEY_LENGTH);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('ENCRYPTION_KEY must')) {
      throw error;
    }
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to decrypt secret key: ${msg}`);
  }
}

