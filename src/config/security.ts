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

/**
 * Get the encryption key from environment variable or generate a secure default
 * This ensures all encryption/decryption uses the same key
 */
export function getEncryptionKey(): string {
  const envKey = process.env.ENCRYPTION_KEY;
  
  if (envKey && envKey.length >= 32) {
    return envKey;
  }
  
  // If no env key or too short, use a more complex default
  // In production, ENCRYPTION_KEY should always be set in environment variables
  if (!envKey) {
    console.warn('⚠️ WARNING: ENCRYPTION_KEY not set in environment variables. Using default key (not secure for production!)');
  } else {
    console.warn('⚠️ WARNING: ENCRYPTION_KEY is too short (minimum 32 characters). Using default key (not secure for production!)');
  }
  
  // Default fallback - should be replaced with env variable in production
  return process.env.ENCRYPTION_KEY || 'foxy-tg-trade-bot-secure-encryption-key-2024-production-use-env-var';
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
  const encryptionKey = password || getEncryptionKey();
  const data = Buffer.from(encryptedBase64, 'base64');
  const salt = data.slice(0, SALT_LENGTH);
  const iv = data.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const encrypted = data.slice(SALT_LENGTH + IV_LENGTH);

  const key = crypto.scryptSync(encryptionKey, salt, KEY_LENGTH);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}
