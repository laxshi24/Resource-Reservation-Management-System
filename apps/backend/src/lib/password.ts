import { randomBytes, scrypt as scryptCallback, timingSafeEqual, type ScryptOptions } from "node:crypto";

/**
 * Password hashing with Node's built-in scrypt (a memory-hard KDF), so no
 * native dependency is needed. Stored format: scrypt$N$r$p$saltHex$hashHex.
 */
const N = 16384;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;

function scrypt(password: string, salt: Buffer, keyLength: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keyLength, options, (error, derivedKey) => (error ? reject(error) : resolve(derivedKey)));
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, KEY_LENGTH, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, n, r, p, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !n || !r || !p || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scrypt(password, Buffer.from(saltHex, "hex"), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  });
  // Constant-time comparison so response timing does not leak how many bytes matched.
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** A valid hash of a random password, used to keep login timing equal for unknown emails. */
export const DUMMY_PASSWORD_HASH = hashPassword(randomBytes(16).toString("hex"));
