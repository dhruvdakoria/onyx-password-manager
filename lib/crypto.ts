'use client';

/**
 * Onyx Zero-Knowledge Cryptography Layer
 *
 * Key Hierarchy:
 * PIN ──→ PBKDF2(100k) ──→ pinDerivedKey ──→ AES-GCM decrypt ──→ masterKey
 * recoveryKey ──→ PBKDF2(100k) ──→ recoveryDerivedKey ──→ AES-GCM decrypt ──→ masterKey
 * masterKey ──→ AES-GCM encrypt/decrypt ──→ vault item ciphertext
 *
 * Server stores: pinSalt, AES-GCM(masterKey, pinDerivedKey), AES-GCM(masterKey, recoveryDerivedKey)
 * Server NEVER sees: masterKey, vault item plaintext, PIN, or recoveryKey
 */

const PBKDF2_ITERATIONS = 100_000;
const RECOVERY_SALT = 'onyx-recovery-v1';

// ── Internal helpers ──────────────────────────────────────────────────────────

function bufToBase64(buf: ArrayBuffer | Uint8Array): string {
    const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    return btoa(String.fromCharCode(...bytes));
}

function base64ToBuf(b64: string): Uint8Array {
    return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

async function derivePbkdf2(password: string, salt: string | Uint8Array): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const saltBytes = typeof salt === 'string' ? enc.encode(salt) : salt;
    const material = await crypto.subtle.importKey(
        'raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: saltBytes.buffer as ArrayBuffer, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
        material,
        { name: 'AES-GCM', length: 256 },
        false, ['encrypt', 'decrypt']
    );
}

async function aesEncrypt(data: Uint8Array, key: CryptoKey): Promise<string> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer }, key, data.buffer as ArrayBuffer
    );
    const result = new Uint8Array(12 + ciphertext.byteLength);
    result.set(iv, 0);
    result.set(new Uint8Array(ciphertext), 12);
    return bufToBase64(result);
}

async function aesDecrypt(b64: string, key: CryptoKey): Promise<Uint8Array> {
    const bytes = base64ToBuf(b64);
    const iv = bytes.slice(0, 12);
    const ct = bytes.slice(12);
    const plaintext = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer }, key, ct.buffer as ArrayBuffer
    );
    return new Uint8Array(plaintext);
}

function importAesKey(raw: Uint8Array): Promise<CryptoKey> {
    return crypto.subtle.importKey(
        'raw', raw.buffer as ArrayBuffer, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']
    );
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface VaultSetupResult {
    pinSalt: string;
    encryptedMasterKeyWithPin: string;
    encryptedMasterKeyWithRecovery: string;
    recoveryKey: string;
}

/** Setup vault on first PIN creation. */
export async function setupVault(pin: string): Promise<{
    result: VaultSetupResult;
    masterKey: CryptoKey;
}> {
    const masterKeyRaw = crypto.getRandomValues(new Uint8Array(32));
    const masterKey = await importAesKey(masterKeyRaw);

    const pinSaltBytes = crypto.getRandomValues(new Uint8Array(16));
    const pinSalt = bufToBase64(pinSaltBytes);
    const pinDerivedKey = await derivePbkdf2(pin, pinSaltBytes);
    const encryptedMasterKeyWithPin = await aesEncrypt(masterKeyRaw, pinDerivedKey);

    const recoveryKeyBytes = crypto.getRandomValues(new Uint8Array(32));
    const recoveryKey = bufToBase64(recoveryKeyBytes);
    const recoveryDerivedKey = await derivePbkdf2(recoveryKey, RECOVERY_SALT);
    const encryptedMasterKeyWithRecovery = await aesEncrypt(masterKeyRaw, recoveryDerivedKey);

    return {
        result: { pinSalt, encryptedMasterKeyWithPin, encryptedMasterKeyWithRecovery, recoveryKey },
        masterKey,
    };
}

/** Unlock vault with PIN. Throws 'WRONG_PIN' on failure. */
export async function unlockWithPin(
    pin: string,
    pinSalt: string,
    encryptedMasterKeyWithPin: string
): Promise<CryptoKey> {
    const pinSaltBytes = base64ToBuf(pinSalt);
    const pinDerivedKey = await derivePbkdf2(pin, pinSaltBytes);
    try {
        const masterKeyRaw = await aesDecrypt(encryptedMasterKeyWithPin, pinDerivedKey);
        return importAesKey(masterKeyRaw);
    } catch {
        throw new Error('WRONG_PIN');
    }
}

/** Recover vault using recovery key. Throws 'INVALID_RECOVERY_KEY' on failure. */
export async function unlockWithRecoveryKey(
    recoveryKey: string,
    encryptedMasterKeyWithRecovery: string
): Promise<CryptoKey> {
    const recoveryDerivedKey = await derivePbkdf2(recoveryKey, RECOVERY_SALT);
    try {
        const masterKeyRaw = await aesDecrypt(encryptedMasterKeyWithRecovery, recoveryDerivedKey);
        return importAesKey(masterKeyRaw);
    } catch {
        throw new Error('INVALID_RECOVERY_KEY');
    }
}

/** Re-encrypt master key with a new PIN after PIN change or recovery. */
export async function changePinEncryption(
    masterKey: CryptoKey,
    newPin: string
): Promise<{ pinSalt: string; encryptedMasterKeyWithPin: string }> {
    const masterKeyRaw = new Uint8Array(await crypto.subtle.exportKey('raw', masterKey));
    const pinSaltBytes = crypto.getRandomValues(new Uint8Array(16));
    const pinSalt = bufToBase64(pinSaltBytes);
    const pinDerivedKey = await derivePbkdf2(newPin, pinSaltBytes);
    const encryptedMasterKeyWithPin = await aesEncrypt(masterKeyRaw, pinDerivedKey);
    return { pinSalt, encryptedMasterKeyWithPin };
}

/** Encrypt credential sensitive fields before storing in Supabase. */
export async function encryptCredentialData(
    data: { username: string; password: string; notes?: string; name?: string; category?: string; is_favorite?: boolean; url?: string },
    masterKey: CryptoKey
): Promise<string> {
    const enc = new TextEncoder();
    return aesEncrypt(enc.encode(JSON.stringify(data)), masterKey);
}

/** Decrypt credential sensitive fields after fetching from Supabase. */
export async function decryptCredentialData(
    ciphertext: string,
    masterKey: CryptoKey
): Promise<{ username: string; password: string; notes?: string; name?: string; category?: string; is_favorite?: boolean; url?: string }> {
    const dec = new TextDecoder();
    const plaintext = await aesDecrypt(ciphertext, masterKey);
    return JSON.parse(dec.decode(plaintext));
}
