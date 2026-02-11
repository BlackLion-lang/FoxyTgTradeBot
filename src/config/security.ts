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
  if (!encryptedBase64 || typeof encryptedBase64 !== 'string') {
    throw new Error('Invalid encrypted data: empty or not a string');
  }

  try {
    const encryptionKey = password || getEncryptionKey();
    const data = Buffer.from(encryptedBase64, 'base64');
    
    // Validate minimum length: salt (32) + IV (16) = 48 bytes minimum
    // Base64 encoding adds ~33% overhead, so minimum string length should be ~64 chars
    if (data.length < SALT_LENGTH + IV_LENGTH) {
      throw new Error(`Invalid encrypted data: too short (${data.length} bytes, expected at least ${SALT_LENGTH + IV_LENGTH} bytes)`);
    }

    const salt = data.slice(0, SALT_LENGTH);
    const iv = data.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const encrypted = data.slice(SALT_LENGTH + IV_LENGTH);

    // Validate IV length
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
  } catch (error: any) {
    // If decryption fails, check if it might be plain text (legacy data)
    // This handles cases where old wallets might have unencrypted keys
    if (error.code === 'ERR_CRYPTO_INVALID_IV' || error.message?.includes('Invalid')) {
      // Try to detect if it's a plain base58 encoded key (Solana) or hex key (Ethereum)
      // Solana keys are typically 88 characters in base58
      // Ethereum keys are 66 characters (0x + 64 hex chars)
      const isBase58 = /^[1-9A-HJ-NP-Za-km-z]+$/.test(encryptedBase64);
      const isHex = /^0x?[0-9a-fA-F]{64}$/.test(encryptedBase64);
      
      if (isBase58 && encryptedBase64.length >= 80) {
        console.warn('⚠️ Detected unencrypted base58 key (legacy format), returning as-is');
        return encryptedBase64;
      }
      
      if (isHex) {
        console.warn('⚠️ Detected unencrypted hex key (legacy format), returning as-is');
        return encryptedBase64;
      }
    }
    
    throw new Error(`Failed to decrypt secret key: ${error.message}`);
  }
}
