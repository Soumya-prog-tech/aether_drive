// src/utils/crypto.js

// ============================
// 1. Helpers & Converters
// ============================
export function buff_to_b64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000; // 32KB chunks
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export function b64_to_buff(base64) {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Aliases to match previous naming conventions if needed
export const arrayBufferToBase64 = buff_to_b64;
export const base64ToArrayBuffer = b64_to_buff;


// ============================
// 2. Key Generation & Import
// ============================
export function generateSalt() {
  return window.crypto.getRandomValues(new Uint8Array(16));
}

export function generateMasterKey() {
  return window.crypto.getRandomValues(new Uint8Array(32));
}

// Imports a raw key (e.g., the decrypted Master Key bytes) back into a CryptoKey object
export async function importKeyFromRaw(rawKeyBuffer, usages = ["deriveKey"]) {
  return window.crypto.subtle.importKey(
    "raw",
    rawKeyBuffer,
    { name: "PBKDF2" }, // We import MK as PBKDF2 so it can be used to derive File Keys
    false,
    usages
  );
}

export async function exportKey(key) {
  const exported = await window.crypto.subtle.exportKey("raw", key);
  return buff_to_b64(exported);
}


// ============================
// 3. Key Derivation
// ============================

// Used for: Password + Salt -> PasswordKey (to lock/unlock the Master Key)
export async function deriveKey(secret, salt) {
  const enc = new TextEncoder();
  
  // Handle secret being string or bytes
  const secretBytes = typeof secret === "string" ? enc.encode(secret) : secret;
  
  // Handle salt being string or bytes
  // Note: For best security, salt should be a Uint8Array (random bytes), not a string.
  const saltBytes = typeof salt === "string" ? enc.encode(salt) : salt;

  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return window.crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: saltBytes, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
  );
}

// Used for: MasterKey + FileSalt -> FileKey
export async function deriveFileKey(masterKey, fileSalt) {
  // Ensure fileSalt is Uint8Array
  const saltBytes = fileSalt instanceof ArrayBuffer ? fileSalt : fileSalt;

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBytes,
      iterations: 100000,
      hash: "SHA-256"
    },
    masterKey, // This MUST be a CryptoKey object (PBKDF2 type)
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}


// ============================
// 4. Generic Encryption (For Master Key Wrapping)
// ============================
export async function encryptData(data, key) {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    data
  );

  return { encrypted, iv };
}

export async function decryptData(encryptedData, key, iv) {
  // Ensure inputs are correct types
  const ivBuff = iv instanceof ArrayBuffer || Array.isArray(iv) ? new Uint8Array(iv) : iv;
  
  return window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivBuff },
    key,
    encryptedData
  );
}


// ============================
// 5. Specific File/Metadata Encryption
// ============================
export async function encryptMetadata(metadata, key) {
  const enc = new TextEncoder();
  const encodedMetadata = enc.encode(JSON.stringify(metadata));

  // Use generic encrypt
  const { encrypted, iv } = await encryptData(encodedMetadata, key);

  return {
    encryptedMetadata: buff_to_b64(encrypted), // Return Base64 for API
    iv: buff_to_b64(iv), // Return Base64 for API (Consistent with your backend)
  };
}

export async function decryptMetadata(encryptedMetadataBase64, key, ivBase64) {
  try {
    const encryptedData = b64_to_buff(encryptedMetadataBase64);
    const iv = b64_to_buff(ivBase64);

    const decryptedData = await decryptData(encryptedData, key, iv);

    const dec = new TextDecoder();
    return JSON.parse(dec.decode(decryptedData));
  } catch (err) {
    console.error("decryptMetadata failed:", err);
    throw err; // Re-throw to handle in UI
  }
}

export async function encryptFile(file, key) {
  const fileBuffer = await file.arrayBuffer();
  
  // Use generic encrypt
  const { encrypted, iv } = await encryptData(fileBuffer, key);

  return {
    encryptedFileBlob: new Blob([encrypted]),
    iv: buff_to_b64(iv), // Return Base64 for API
  };
}

export async function decryptFile(encryptedBuffer, key, ivBase64) {
  try {
    const iv = b64_to_buff(ivBase64);

    const decryptedBuffer = await decryptData(encryptedBuffer, key, iv);

    return new Blob([decryptedBuffer]);
  } catch (err) {
    console.error("File Decryption failed:", err);
    throw err;
  }
}