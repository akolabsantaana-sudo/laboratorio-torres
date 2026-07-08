// End-to-End Cryptography utilities based on the standard Web Crypto API.
// To ensure synchronization across multiple devices without sharing the master key, 
// the cryptokey is derived deterministically from the Lab ID and Sync Passcode.

const SALT_STRING = "clinical-lab-e2e-secure-salt-2026-v2";

/**
 * Derives a CryptoKey from a user passcode and Lab ID deterministically.
 */
async function deriveKey(passcode: string, labId: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  // Import raw passphrase material
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(passcode),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  // Salt is composed of Salt String and the unique lowercased Lab ID
  const saltBytes = enc.encode(`${SALT_STRING}:${labId.trim().toLowerCase()}`);

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBytes,
      iterations: 80000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts arbitrary JSON-serializable data using derived AES key
 */
export async function encryptData(data: any, passcode: string, labId: string): Promise<string> {
  try {
    const key = await deriveKey(passcode, labId);
    const enc = new TextEncoder();
    const dataBytes = enc.encode(JSON.stringify(data));

    // Generate random IV
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const encryptedBuffer = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv
      },
      key,
      dataBytes
    );

    // Convert bytes to hex string for easy transport
    const ivHex = Array.from(iv)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
      
    const encryptedHex = Array.from(new Uint8Array(encryptedBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return `${ivHex}:${encryptedHex}`;
  } catch (error: any) {
    console.warn("Encryption failed warning:", error?.message || error);
    throw new Error("Fallo al cifrar datos clínicamente sensibles.");
  }
}

/**
 * Decrypts a hex-formatted AES-GCM ciphertext
 */
export async function decryptData(encryptedString: string, passcode: string, labId: string): Promise<any> {
  try {
    const parts = encryptedString.split(":");
    if (parts.length !== 2) {
      throw new Error("Formato de datos cifrados inválido.");
    }

    const ivHex = parts[0];
    const encryptedHex = parts[1];

    const ivMatches = ivHex.match(/.{1,2}/g);
    const ciphertextMatches = encryptedHex.match(/.{1,2}/g);
    
    if (!ivMatches || !ciphertextMatches) {
      throw new Error("Formato hexadecimal inválido en datos cifrados.");
    }

    // Decode hex arrays
    const iv = new Uint8Array(ivMatches.map((byte) => parseInt(byte, 16)));
    const ciphertext = new Uint8Array(ciphertextMatches.map((byte) => parseInt(byte, 16)));

    const key = await deriveKey(passcode, labId);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv
      },
      key,
      ciphertext
    );

    const dec = new TextDecoder();
    return JSON.parse(dec.decode(decryptedBuffer));
  } catch (error: any) {
    // Standard decryption error due to key mismatch or malformed data.
    // Throwing error allows the caller to try fallbacks or report failure gracefully.
    throw new Error("Error de descifrado. Verifique que su Contraseña de Cifrado sea la correcta.");
  }
}

/**
 * Computes a secure SHA-256 hash of the Lab ID + password.
 * This is used for server authentication only, completely separate from the encryption key itself.
 */
export async function deriveAuthHash(labId: string, passcode: string): Promise<string> {
  const enc = new TextEncoder();
  const inputBytes = enc.encode(`${labId.trim().toLowerCase()}:${passcode}:authentication-hash-2026-v2`);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", inputBytes);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
