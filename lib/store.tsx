'use client';
import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Credential, Toast, Category, PasswordStrength } from '@/lib/types';
import { getPasswordStrength, guessCategoryFromName, computeSecurityScore } from '@/lib/utils';
import { encryptCredentialData, decryptCredentialData, setupVault, unlockWithPin } from '@/lib/crypto';
import {
    getVaultConfig, saveVaultConfig, listVaultItems,
    createVaultItem, updateVaultItem, deleteVaultItem,
    checkPasswordBreach, VaultConfig,
} from '@/lib/vault-api';

/* ================================================
   STATE & ACTIONS
   ================================================ */
export interface AppState {
    // Auth
    isClerkSignedIn: boolean;           // Clerk authenticated
    isVaultUnlocked: boolean;           // PIN entered, masterKey in memory
    hasPinSetup: boolean;               // Has user set up their PIN before

    // Vault
    credentials: Credential[];
    masterKey: CryptoKey | null;        // In-memory only, never persisted
    vaultConfig: VaultConfig | null;

    // UI
    searchQuery: string;
    activeCategory: Category;
    securityScore: number;
    isLoading: boolean;
    toasts: Toast[];
}

type Action =
    | { type: 'SET_CLERK_SIGNED_IN'; value: boolean }
    | { type: 'VAULT_UNLOCKED'; masterKey: CryptoKey; credentials: Credential[] }
    | { type: 'VAULT_LOCKED' }
    | { type: 'SET_HAS_PIN'; value: boolean }
    | { type: 'SET_VAULT_CONFIG'; config: VaultConfig | null }
    | { type: 'SET_CREDENTIALS'; credentials: Credential[] }
    | { type: 'ADD_CREDENTIAL'; credential: Credential }
    | { type: 'UPDATE_CREDENTIAL'; id: string; data: Partial<Credential> }
    | { type: 'DELETE_CREDENTIAL'; id: string }
    | { type: 'TOGGLE_FAVORITE'; id: string }
    | { type: 'MARK_COPIED'; id: string }
    | { type: 'SET_SEARCH'; query: string }
    | { type: 'SET_CATEGORY'; category: Category }
    | { type: 'SET_LOADING'; value: boolean }
    | { type: 'ADD_TOAST'; toast: Omit<Toast, 'id'> }
    | { type: 'REMOVE_TOAST'; id: string };

const initialState: AppState = {
    isClerkSignedIn: false,
    isVaultUnlocked: false,
    hasPinSetup: false,
    credentials: [],
    masterKey: null,
    vaultConfig: null,
    searchQuery: '',
    activeCategory: 'all',
    securityScore: -1,
    isLoading: false,
    toasts: [],
};

function reducer(state: AppState, action: Action): AppState {
    switch (action.type) {
        case 'SET_CLERK_SIGNED_IN':
            return { ...state, isClerkSignedIn: action.value };
        case 'VAULT_UNLOCKED':
            return {
                ...state,
                isVaultUnlocked: true,
                masterKey: action.masterKey,
                credentials: action.credentials,
                securityScore: computeSecurityScore(action.credentials),
                isLoading: false,
            };
        case 'VAULT_LOCKED':
            return { ...initialState, isClerkSignedIn: state.isClerkSignedIn, hasPinSetup: state.hasPinSetup, vaultConfig: state.vaultConfig };
        case 'SET_HAS_PIN':
            return { ...state, hasPinSetup: action.value };
        case 'SET_VAULT_CONFIG':
            return { ...state, vaultConfig: action.config, hasPinSetup: !!action.config?.hasPinSetup };
        case 'SET_CREDENTIALS': {
            const credentials = action.credentials;
            return { ...state, credentials, securityScore: computeSecurityScore(credentials) };
        }
        case 'ADD_CREDENTIAL': {
            const credentials = [...state.credentials, action.credential];
            return { ...state, credentials, securityScore: computeSecurityScore(credentials) };
        }
        case 'UPDATE_CREDENTIAL': {
            const credentials = state.credentials.map(c =>
                c.id === action.id ? { ...c, ...action.data, updatedAt: Date.now() } : c
            );
            return { ...state, credentials, securityScore: computeSecurityScore(credentials) };
        }
        case 'DELETE_CREDENTIAL': {
            const credentials = state.credentials.filter(c => c.id !== action.id);
            return { ...state, credentials, securityScore: computeSecurityScore(credentials) };
        }
        case 'TOGGLE_FAVORITE':
            return {
                ...state,
                credentials: state.credentials.map(c =>
                    c.id === action.id ? { ...c, isFavorite: !c.isFavorite } : c
                ),
            };
        case 'MARK_COPIED':
            return {
                ...state,
                credentials: state.credentials.map(c =>
                    c.id === action.id ? { ...c, lastCopied: Date.now() } : c
                ),
            };
        case 'SET_SEARCH':
            return { ...state, searchQuery: action.query };
        case 'SET_CATEGORY':
            return { ...state, activeCategory: action.category };
        case 'SET_LOADING':
            return { ...state, isLoading: action.value };
        case 'ADD_TOAST': {
            const toast: Toast = { id: uuidv4(), ...action.toast };
            return { ...state, toasts: [...state.toasts, toast] };
        }
        case 'REMOVE_TOAST':
            return { ...state, toasts: state.toasts.filter(t => t.id !== action.id) };
        default:
            return state;
    }
}

/* ================================================
   CONTEXT
   ================================================ */
interface StoreContextValue {
    state: AppState;
    dispatch: React.Dispatch<Action>;
    toast: (message: string, type?: Toast['type']) => void;
    // Vault operations (return void, update state internally)
    unlockVault: (pin: string) => Promise<void>;
    setupPin: (pin: string) => Promise<void>;
    addCredential: (data: { name: string; username: string; password: string; url?: string; notes?: string; category?: Category }) => Promise<void>;
    editCredential: (id: string, data: Partial<Credential>) => Promise<void>;
    removeCredential: (id: string) => Promise<void>;
    toggleFavorite: (id: string) => Promise<void>;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children, initialSignedIn = false }: { children: React.ReactNode; initialSignedIn?: boolean }) {
    const [state, dispatch] = useReducer(reducer, { ...initialState, isClerkSignedIn: initialSignedIn });

    const toast = useCallback((message: string, type: Toast['type'] = 'success') => {
        dispatch({ type: 'ADD_TOAST', toast: { message, type } });
    }, []);

    // Load vault config when signed in
    useEffect(() => {
        if (!state.isClerkSignedIn) return;
        getVaultConfig()
            .then(config => dispatch({ type: 'SET_VAULT_CONFIG', config }))
            .catch(() => dispatch({ type: 'SET_VAULT_CONFIG', config: null }));
    }, [state.isClerkSignedIn]);

    // First-time PIN + vault setup
    const setupPin = useCallback(async (pin: string) => {
        dispatch({ type: 'SET_LOADING', value: true });
        try {
            const { result, masterKey } = await setupVault(pin);

            await saveVaultConfig({
                pinSalt: result.pinSalt,
                encryptedMasterKeyWithPin: result.encryptedMasterKeyWithPin,
                encryptedMasterKeyWithRecovery: result.encryptedMasterKeyWithRecovery,
            });

            // Email the recovery key (fire and forget)
            fetch('/api/email/recovery', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ recoveryKey: result.recoveryKey }),
            }).catch(console.error);

            dispatch({
                type: 'VAULT_UNLOCKED',
                masterKey,
                credentials: [],
            });
            dispatch({ type: 'SET_HAS_PIN', value: true });
            toast('Vault secured! Check your email for your recovery key.', 'success');
        } catch (err) {
            toast('Failed to set up vault. Please try again.', 'error');
            throw err;
        } finally {
            dispatch({ type: 'SET_LOADING', value: false });
        }
    }, [toast]);

    // Unlock vault with PIN
    const unlockVault = useCallback(async (pin: string) => {
        if (!state.vaultConfig) throw new Error('No vault config found');
        dispatch({ type: 'SET_LOADING', value: true });

        try {
            const masterKey = await unlockWithPin(
                pin,
                state.vaultConfig.pinSalt,
                state.vaultConfig.encryptedMasterKeyWithPin,
            );

            // Fetch encrypted vault items from Supabase
            const rows = await listVaultItems();

            // Decrypt all items client-side using the masterKey
            const credentials: Credential[] = await Promise.all(
                rows.map(async (row) => {
                    let decrypted: any = {};
                    try {
                        decrypted = await decryptCredentialData(row.encrypted_data, masterKey);
                    } catch {
                        console.warn('Failed to decrypt item:', row.id);
                    }
                    return {
                        id: row.id,
                        name: decrypted.name ?? row.name,
                        category: (decrypted.category ?? row.category) as Category,
                        isFavorite: decrypted.is_favorite ?? row.is_favorite,
                        url: decrypted.url ?? (row as { url?: string }).url,
                        username: decrypted.username ?? '',
                        password: decrypted.password ?? '',
                        notes: decrypted.notes ?? '',
                        passwordStrength: getPasswordStrength(decrypted.password ?? '') as PasswordStrength,
                        tags: [],
                        createdAt: new Date(row.created_at).getTime(),
                        updatedAt: new Date(row.updated_at).getTime(),
                    };
                })
            );

            dispatch({ type: 'VAULT_UNLOCKED', masterKey, credentials });
        } catch (err: unknown) {
            if (err instanceof Error && err.message === 'WRONG_PIN') {
                throw new Error('WRONG_PIN');
            }
            toast('Failed to unlock vault. Please try again.', 'error');
            throw err;
        } finally {
            dispatch({ type: 'SET_LOADING', value: false });
        }
    }, [state.vaultConfig, toast]);

    // Add a credential
    const addCredential = useCallback(async (data: {
        name: string; username: string; password: string;
        url?: string; notes?: string; category?: Category;
    }) => {
        if (!state.masterKey) throw new Error('Vault not unlocked');

        // Encrypt sensitive fields before sending to server
        const encrypted_data = await encryptCredentialData(
            {
                username: data.username,
                password: data.password,
                notes: data.notes,
                name: data.name,
                category: data.category ?? guessCategoryFromName(data.name),
                url: data.url,
                is_favorite: false
            },
            state.masterKey
        );

        const row = await createVaultItem({
            name: "encrypted",
            category: "other",
            is_favorite: false,
            url: "",
            encrypted_data,
        });

        const cred: Credential = {
            id: row.id,
            name: row.name,
            category: row.category as Category,
            isFavorite: row.is_favorite,
            url: (row as { url?: string }).url,
            username: data.username,
            password: data.password,
            notes: data.notes,
            passwordStrength: getPasswordStrength(data.password) as PasswordStrength,
            tags: [],
            createdAt: new Date(row.created_at).getTime(),
            updatedAt: new Date(row.updated_at).getTime(),
        };

        dispatch({ type: 'ADD_CREDENTIAL', credential: cred });

        // Async breach check (real-time)
        checkPasswordBreach(data.password).then(async (breached) => {
            if (breached) {
                dispatch({
                    type: 'ADD_TOAST',
                    toast: { message: `⚠️ ${data.name} password found in a data breach!`, type: 'error' }
                });
                // Send breach alert email
                fetch('/api/email/breach-alert', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ credentialName: data.name }),
                }).catch(console.error);
            }
        }).catch(console.error);
    }, [state.masterKey]);

    // Edit a credential
    const editCredential = useCallback(async (id: string, data: Partial<Credential>) => {
        if (!state.masterKey) throw new Error('Vault not unlocked');

        const existing = state.credentials.find(c => c.id === id);
        if (!existing) throw new Error('Credential not found');

        const merged = { ...existing, ...data };
        const encrypted_data = await encryptCredentialData(
            {
                username: merged.username,
                password: merged.password,
                notes: merged.notes,
                name: merged.name,
                category: merged.category,
                url: merged.url,
                is_favorite: merged.isFavorite
            },
            state.masterKey
        );

        await updateVaultItem(id, {
            name: "encrypted",
            category: "other",
            is_favorite: false,
            url: "",
            encrypted_data,
        });

        const updated = {
            ...data,
            passwordStrength: data.password ? getPasswordStrength(data.password) as PasswordStrength : existing.passwordStrength,
        };

        dispatch({ type: 'UPDATE_CREDENTIAL', id, data: updated });

        // Breach check if password changed
        if (data.password && data.password !== existing.password) {
            checkPasswordBreach(data.password).then(async (breached) => {
                if (breached) {
                    dispatch({
                        type: 'ADD_TOAST',
                        toast: { message: `⚠️ New ${existing.name} password found in a data breach!`, type: 'error' }
                    });
                    fetch('/api/email/breach-alert', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ credentialName: existing.name }),
                    }).catch(console.error);
                }
            }).catch(console.error);
        }
    }, [state.masterKey, state.credentials]);

    // Delete a credential
    const removeCredential = useCallback(async (id: string) => {
        await deleteVaultItem(id);
        dispatch({ type: 'DELETE_CREDENTIAL', id });
    }, []);

    // Toggle favorite (optimistic update)
    const toggleFavorite = useCallback(async (id: string) => {
        if (!state.masterKey) return;
        const cred = state.credentials.find(c => c.id === id);
        if (!cred) return;

        const newFav = !cred.isFavorite;
        dispatch({ type: 'TOGGLE_FAVORITE', id });

        const encrypted_data = await encryptCredentialData(
            {
                username: cred.username,
                password: cred.password,
                notes: cred.notes,
                name: cred.name,
                category: cred.category,
                url: cred.url,
                is_favorite: newFav
            },
            state.masterKey
        );

        await updateVaultItem(id, { encrypted_data, is_favorite: false });
    }, [state.credentials, state.masterKey]);

    return (
        <StoreContext.Provider value={{
            state, dispatch, toast,
            unlockVault, setupPin, addCredential, editCredential, removeCredential, toggleFavorite,
        }}>
            {children}
        </StoreContext.Provider>
    );
}

export function useStore() {
    const ctx = useContext(StoreContext);
    if (!ctx) throw new Error('useStore must be used within StoreProvider');
    return ctx;
}
