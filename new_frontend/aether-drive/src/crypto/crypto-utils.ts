// src/crypto/crypto-utils.ts

// ==========================================
// 1. Base64 Helpers (Binary <-> String)
// ==========================================

export const toB64 = (buffer: ArrayBuffer | Uint8Array): string => {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

export const fromB64 = (base64: string): Uint8Array => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

// ==========================================
// 2. Secure Random Bytes
// ==========================================

export const generateRandomBytes = (length: number): Uint8Array => {
  return crypto.getRandomValues(new Uint8Array(length));
};

// ==========================================
// 3. PBKDF2 — CORE (MATCHES test.py)
// ==========================================

/**
 * EXACT equivalent of Python:
 * PBKDF2HMAC(SHA256, 32, salt, 100_000).derive(secret)
 */
const pbkdf2Derive = async (
  secretBytes: Uint8Array,
  salt: Uint8Array
): Promise<Uint8Array> => {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: 100_000,
      hash: "SHA-256",
    },
    keyMaterial,
    256 // 32 bytes
  );

  return new Uint8Array(derivedBits);
};

// ==========================================
// 4. Password → AES Key (wrap master key)
// ==========================================

export const derivePasswordKey = async (
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> => {
  const secretBytes = new TextEncoder().encode(password);
  const keyBytes = await pbkdf2Derive(secretBytes, salt);

  return crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
};

// ==========================================
// 5. Master Key → File Key (RAW BYTES)
// ==========================================

/**
 * Used for:
 * - AI ingest
 * - AI chat
 *
 * Python equivalent:
 *   file_key = derive_key(master_key, file_salt)
 */
export const deriveFileKeyBytes = async (
  masterKey: Uint8Array,
  salt: Uint8Array
): Promise<Uint8Array> => {
  return pbkdf2Derive(masterKey, salt);
};

// ==========================================
// 6. AES-GCM Encrypt / Decrypt
// ==========================================

export const encryptData = async (
  key: CryptoKey,
  data: Uint8Array | string
) => {
  const iv = generateRandomBytes(12);

  const plaintext =
    typeof data === "string"
      ? new TextEncoder().encode(data)
      : data;

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plaintext
  );

  return {
    ciphertext: new Uint8Array(ciphertext),
    iv,
  };
};

export const decryptData = async (
  key: CryptoKey,
  ciphertext: Uint8Array,
  iv: Uint8Array
): Promise<Uint8Array> => {
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );
  return new Uint8Array(decrypted);
};

// ==========================================
// 7. Import Master Key (RAW bytes only)
// ==========================================

export const importMasterKey = async (
  rawKeyBytes: Uint8Array
): Promise<Uint8Array> => {
  // JS keeps master key as raw bytes (matches Python)
  return rawKeyBytes;
};
