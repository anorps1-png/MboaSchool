/**
 * Hachage des mots de passe pour le login hors-ligne (Electron uniquement).
 * PBKDF2-SHA256 via Web Crypto — aucun mot de passe ne doit être stocké en clair.
 */

const PBKDF2_ITERATIONS = 150_000;
const KEY_LENGTH_BITS = 256;

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

async function deriveHash(password: string, salt: Uint8Array): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    KEY_LENGTH_BITS
  );
  return toHex(bits);
}

/** Génère un couple { hash, salt } (hex) à stocker à la place du mot de passe. */
export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await deriveHash(password, salt);
  return { hash, salt: toHex(salt.buffer) };
}

/** Vérifie un mot de passe contre un hash/salt stockés. */
export async function verifyPassword(
  password: string,
  saltHex: string,
  expectedHashHex: string
): Promise<boolean> {
  try {
    const hash = await deriveHash(password, fromHex(saltHex));
    return hash === expectedHashHex;
  } catch {
    return false;
  }
}
