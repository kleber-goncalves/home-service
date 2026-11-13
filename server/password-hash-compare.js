import { timingSafeEqual } from "node:crypto";

const ARGON2_HASH_BYTES = 32;
const ARGON2_HASH_HEX_PATTERN = /^[0-9a-f]{64}$/;

/**
 * Compares two lowercase hexadecimal encodings of a 32-byte Argon2id hash.
 *
 * Malformed inputs are rejected before decoding. Valid inputs are decoded to
 * fixed-size byte buffers and compared with Node.js' native timingSafeEqual.
 * This helper is server-only and must never receive values from browser code.
 */
export function compareArgon2HashHex(candidateHashHex, storedHashHex) {
    if (
        typeof candidateHashHex !== "string"
        || typeof storedHashHex !== "string"
        || !ARGON2_HASH_HEX_PATTERN.test(candidateHashHex)
        || !ARGON2_HASH_HEX_PATTERN.test(storedHashHex)
    ) {
        return false;
    }

    const candidateBytes = Buffer.from(candidateHashHex, "hex");
    const storedBytes = Buffer.from(storedHashHex, "hex");

    if (
        candidateBytes.length !== ARGON2_HASH_BYTES
        || storedBytes.length !== ARGON2_HASH_BYTES
    ) {
        return false;
    }

    return timingSafeEqual(candidateBytes, storedBytes);
}
