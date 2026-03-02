'use client';
import { useState, useCallback, useEffect, useRef } from 'react';
import { Delete, Fingerprint, Shield, RotateCcw, Loader, LockKeyhole } from 'lucide-react';
import { useStore } from '@/lib/store';
import { UserButton } from '@clerk/nextjs';
import { unlockWithRecoveryKey, changePinEncryption } from '@/lib/crypto';
import { getVaultConfig, updatePinEncryption } from '@/lib/vault-api';
import styles from './LockScreen.module.css';

const MAX_PIN_LENGTH = 6;
type LockMode = 'unlock' | 'setup-new' | 'setup-confirm' | 'recovery';

export default function LockScreen() {
    const { state, setupPin, unlockVault, dispatch, toast } = useStore();

    const [mode, setMode] = useState<LockMode>(() =>
        state.hasPinSetup ? 'unlock' : 'setup-new'
    );
    const [pin, setPin] = useState('');
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [recoveryInput, setRecoveryInput] = useState('');
    const [shake, setShake] = useState(false);
    const [wrongAttempts, setWrongAttempts] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
    const [lockoutRemaining, setLockoutRemaining] = useState(0);
    const lockoutTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const [recoveredMasterKey, setRecoveredMasterKey] = useState<CryptoKey | null>(null);

    // Keep mode in sync with vault config loading
    useEffect(() => {
        if (!state.hasPinSetup && mode === 'unlock') setMode('setup-new');
        if (state.hasPinSetup && mode === 'setup-new') setMode('unlock');
    }, [state.hasPinSetup]);

    // Lockout countdown timer
    useEffect(() => {
        if (!lockoutUntil) {
            setLockoutRemaining(0);
            return;
        }
        const tick = () => {
            const remaining = Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
            setLockoutRemaining(remaining);
            if (remaining <= 0) {
                setLockoutUntil(null);
                if (lockoutTimerRef.current) clearInterval(lockoutTimerRef.current);
            }
        };
        tick();
        lockoutTimerRef.current = setInterval(tick, 1000);
        return () => { if (lockoutTimerRef.current) clearInterval(lockoutTimerRef.current); };
    }, [lockoutUntil]);

    const isLockedOut = lockoutRemaining > 0;

    const triggerShake = () => {
        setShake(true);
        setTimeout(() => setShake(false), 600);
    };

    const handleDigit = useCallback(async (digit: string) => {
        if (isSubmitting || isLockedOut) return;

        const append = (current: string, setter: (v: string) => void): string => {
            if (current.length >= MAX_PIN_LENGTH) return current;
            return current + digit;
        };

        if (mode === 'setup-new') {
            const updated = append(newPin, setNewPin);
            setNewPin(updated);
            if (updated.length === MAX_PIN_LENGTH) {
                setTimeout(() => setMode('setup-confirm'), 300);
            }
        }

        else if (mode === 'setup-confirm') {
            const updated = append(confirmPin, setConfirmPin);
            setConfirmPin(updated);
            if (updated.length === MAX_PIN_LENGTH) {
                if (updated !== newPin) {
                    triggerShake();
                    toast("PINs don't match. Try again.", 'error');
                    setConfirmPin('');
                    setNewPin('');
                    setMode('setup-new');
                } else {
                    setIsSubmitting(true);
                    try {
                        if (recoveredMasterKey) {
                            const { pinSalt, encryptedMasterKeyWithPin } = await changePinEncryption(recoveredMasterKey, updated);
                            await updatePinEncryption({ pinSalt, encryptedMasterKeyWithPin });
                            toast('PIN reset successfully! Unlocking vault…', 'success');

                            // Load vault items
                            const { listVaultItems } = await import('@/lib/vault-api');
                            const { decryptCredentialData } = await import('@/lib/crypto');
                            const { getPasswordStrength } = await import('@/lib/utils');
                            const rows = await listVaultItems();
                            const credentials = await Promise.all(rows.map(async (row) => {
                                let dec: any = {};
                                try { dec = await decryptCredentialData(row.encrypted_data, recoveredMasterKey); } catch { }
                                return {
                                    id: row.id, name: dec.name ?? row.name, category: (dec.category ?? row.category) as import('@/lib/types').Category,
                                    isFavorite: dec.is_favorite ?? row.is_favorite, url: dec.url ?? (row as { url?: string }).url,
                                    username: dec.username, password: dec.password, notes: dec.notes,
                                    passwordStrength: getPasswordStrength(dec.password) as import('@/lib/types').PasswordStrength,
                                    tags: [], createdAt: new Date(row.created_at).getTime(), updatedAt: new Date(row.updated_at).getTime(),
                                };
                            }));
                            dispatch({ type: 'VAULT_UNLOCKED', masterKey: recoveredMasterKey, credentials });
                        } else {
                            await setupPin(updated);
                        }
                    } catch {
                        setIsSubmitting(false);
                        setConfirmPin('');
                        setMode('setup-new');
                    }
                }
            }
        }

        else if (mode === 'unlock') {
            const updated = append(pin, setPin);
            setPin(updated);
            if (updated.length === MAX_PIN_LENGTH) {
                setIsSubmitting(true);

                // Add lockout checking from server logic (HIGH-4)
                try {
                    const checkRes = await fetch('/api/vault/unlock', { method: 'POST', body: JSON.stringify({ success: false }) });
                    if (checkRes.status === 429) {
                        const { retryAfter } = await checkRes.json();
                        setLockoutUntil(Date.now() + retryAfter * 1000);
                        setPin('');
                        setIsSubmitting(false);
                        return;
                    }

                    try {
                        await unlockVault(updated);
                        setWrongAttempts(0); // Reset on success
                        await fetch('/api/vault/unlock', { method: 'POST', body: JSON.stringify({ success: true }) });
                    } catch (err: unknown) {
                        setPin('');
                        setIsSubmitting(false);
                        if (err instanceof Error && err.message === 'WRONG_PIN') {
                            const { failCount, locked, retryAfter } = await checkRes.json();
                            triggerShake();
                            if (locked) {
                                setLockoutUntil(Date.now() + retryAfter * 1000);
                            } else {
                                toast(`Incorrect PIN. ${5 - failCount} attempts remaining.`, 'error');
                            }
                        } else {
                            toast('Could not connect. Check network and try again.', 'error');
                        }
                    }
                } catch {
                    // Fallback to client-side logic if API is unreachable
                    setPin('');
                    setIsSubmitting(false);
                    triggerShake();
                    toast('Network error during unlock.', 'error');
                }
            }
        }
    }, [mode, newPin, confirmPin, pin, isSubmitting, wrongAttempts, setupPin, unlockVault, toast, recoveredMasterKey, dispatch]);

    const handleDelete = useCallback(() => {
        if (mode === 'setup-new') setNewPin(p => p.slice(0, -1));
        else if (mode === 'setup-confirm') setConfirmPin(p => p.slice(0, -1));
        else setPin(p => p.slice(0, -1));
    }, [mode]);

    const handleRecovery = useCallback(async () => {
        if (!recoveryInput.trim()) {
            toast('Please enter your recovery key', 'error');
            return;
        }
        setIsSubmitting(true);
        try {
            const config = await getVaultConfig();
            if (!config?.encryptedMasterKeyWithRecovery) throw new Error('No recovery data');

            // Recover the master key
            const masterKey = await unlockWithRecoveryKey(recoveryInput.trim(), config.encryptedMasterKeyWithRecovery);

            // Set state to re-prompt smoothly (FIX HIGH-2)
            setRecoveredMasterKey(masterKey);
            setMode('setup-new');
            toast('Recovery key verified. Set a new PIN.', 'success');
        } catch (err: unknown) {
            if (err instanceof Error && err.message === 'INVALID_RECOVERY_KEY') {
                triggerShake();
                toast('Invalid recovery key. Check and try again.', 'error');
            } else {
                toast('Recovery failed. Please try again.', 'error');
            }
        } finally {
            setIsSubmitting(false);
        }
    }, [recoveryInput, toast]);

    const currentLen = mode === 'setup-new' ? newPin.length : mode === 'setup-confirm' ? confirmPin.length : pin.length;

    const titles: Record<LockMode, string> = {
        'unlock': 'Welcome Back',
        'setup-new': 'Secure Your Vault',
        'setup-confirm': 'Confirm Your PIN',
        'recovery': 'Account Recovery',
    };

    const subtitles: Record<LockMode, string> = {
        'unlock': 'Enter your 6-digit PIN to unlock',
        'setup-new': 'Choose a 6-digit PIN for your vault',
        'setup-confirm': 'Re-enter the same PIN to confirm',
        'recovery': 'Enter the recovery key that was emailed to you on setup',
    };

    const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

    return (
        <div className={styles.container}>
            <div className={styles.bg} />
            <div className={styles.floatingOrb} />
            <div className={styles.floatingOrb2} />

            <div className={styles.panel}>
                {/* Logo + user avatar */}
                <div className={styles.logoRow}>
                    <div className={styles.logo}>
                        <div className={styles.logoIcon}><Shield size={22} strokeWidth={1.5} /></div>
                        <span className={styles.logoText}>Onyx</span>
                    </div>
                    <UserButton />
                </div>

                <h1 className={styles.title}>{titles[mode]}</h1>
                <p className={styles.subtitle}>{subtitles[mode]}</p>

                {mode === 'recovery' ? (
                    // Recovery mode: text input
                    <div className={styles.recoveryForm}>
                        <textarea
                            className={styles.recoveryInput}
                            placeholder="Paste your recovery key here…"
                            value={recoveryInput}
                            onChange={e => setRecoveryInput(e.target.value)}
                            rows={3}
                        />
                        <button
                            className={`btn btn-primary ${styles.recoveryBtn}`}
                            onClick={handleRecovery}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? <Loader size={16} className={styles.spinner} /> : null}
                            Recover Vault
                        </button>
                        <button className={styles.backLink} onClick={() => { setMode('unlock'); setRecoveryInput(''); }}>
                            ← Back to PIN
                        </button>
                    </div>
                ) : (
                    // PIN mode
                    <>
                        <div className={`${styles.dots} ${shake ? styles.shake : ''}`}>
                            {Array.from({ length: MAX_PIN_LENGTH }).map((_, i) => (
                                <div
                                    key={i}
                                    className={`${styles.dot} ${i < currentLen ? styles.dotFilled : ''} ${i === currentLen - 1 ? styles.dotLast : ''}`}
                                />
                            ))}
                        </div>

                        {/* Loading overlay on numpad */}
                        <div className={styles.numpad}>
                            {isLockedOut ? (
                                <div className={styles.lockoutOverlay}>
                                    <LockKeyhole size={48} className={styles.lockoutIcon} />
                                    <p className={styles.lockoutText}>Vault Locked</p>
                                    <p className={styles.lockoutTimer}>
                                        Try again in {Math.floor(lockoutRemaining / 60)}:{(lockoutRemaining % 60).toString().padStart(2, '0')}
                                    </p>
                                </div>
                            ) : (
                                digits.map((d, i) => {
                                    if (d === '') return <div key={i} className={styles.numpadEmpty} />;
                                    if (d === '⌫') return (
                                        <button key={i} className={styles.numpadDelete} onClick={handleDelete} disabled={isSubmitting}>
                                            <Delete size={20} />
                                        </button>
                                    );
                                    return (
                                        <button key={i} className={styles.numpadKey} onClick={() => handleDigit(d)} disabled={isSubmitting}>
                                            {isSubmitting && currentLen === MAX_PIN_LENGTH ? <Loader size={16} className={styles.spinner} /> : d}
                                        </button>
                                    );
                                })
                            )}
                        </div>

                        {mode === 'unlock' && (
                            <div className={styles.bottomLinks}>
                                <button className={styles.forgotBtn} onClick={() => setMode('recovery')}>
                                    <RotateCcw size={14} />
                                    <span>Forgot PIN</span>
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
