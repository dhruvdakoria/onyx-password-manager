/**
 * Client-side API wrapper — all vault operations go through Next.js API routes,
 * which validate the Clerk session server-side before touching Supabase.
 */

import { Credential } from './types';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(path, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Clerk session cookie
        ...options,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error ?? `API error ${res.status}`);
    }
    // Handle 204 No Content (e.g., DELETE responses)
    if (res.status === 204 || res.headers.get('content-length') === '0') {
        return undefined as T;
    }
    return res.json();
}

// ── Vault Config (master key management) ─────────────────────────────────────

export interface VaultConfig {
    hasPinSetup: boolean;
    pinSalt: string;
    encryptedMasterKeyWithPin: string;
    encryptedMasterKeyWithRecovery: string;
}

export async function getVaultConfig(): Promise<VaultConfig | null> {
    return apiFetch<VaultConfig | null>('/api/vault-config');
}

export async function saveVaultConfig(config: {
    pinSalt: string;
    encryptedMasterKeyWithPin: string;
    encryptedMasterKeyWithRecovery: string;
}): Promise<void> {
    return apiFetch('/api/vault-config', {
        method: 'POST',
        body: JSON.stringify(config),
    });
}

export async function updatePinEncryption(config: {
    pinSalt: string;
    encryptedMasterKeyWithPin: string;
}): Promise<void> {
    return apiFetch('/api/vault-config', {
        method: 'PATCH',
        body: JSON.stringify(config),
    });
}

// ── Vault Items ────────────────────────────────────────────────────────────────

export interface VaultItemRow {
    id: string;
    encrypted_data: string;  // ciphertext of { username, password, notes, name, category, is_favorite, url }
    created_at: string;
    updated_at: string;
}

export async function listVaultItems(): Promise<VaultItemRow[]> {
    return apiFetch<VaultItemRow[]>('/api/vault');
}

export async function createVaultItem(item: {
    encrypted_data: string;
}): Promise<VaultItemRow> {
    return apiFetch<VaultItemRow>('/api/vault', {
        method: 'POST',
        body: JSON.stringify(item),
    });
}

export async function updateVaultItem(
    id: string,
    item: { encrypted_data: string }
): Promise<VaultItemRow> {
    return apiFetch<VaultItemRow>(`/api/vault/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(item),
    });
}

export async function deleteVaultItem(id: string): Promise<void> {
    return apiFetch(`/api/vault/${id}`, { method: 'DELETE' });
}

// ── Breach Check ──────────────────────────────────────────────────────────────

export async function checkPasswordBreach(password: string): Promise<boolean> {
    const data = await apiFetch<{ breached: boolean }>('/api/breach-check', {
        method: 'POST',
        body: JSON.stringify({ password }),
    });
    return data.breached;
}
