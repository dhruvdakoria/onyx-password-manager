'use client';
import { useState, useCallback } from 'react';
import { Copy, Eye, EyeOff, Star, Edit, Trash2, RefreshCw } from 'lucide-react';
import { Credential } from '@/lib/types';
import { useStore } from '@/lib/store';
import { copyToClipboard, getFaviconUrl, timeAgo, generatePassword, getPasswordStrength } from '@/lib/utils';
import CredentialModal from './CredentialModal';
import styles from './CredentialCard.module.css';

interface Props { credential: Credential; }

export default function CredentialCard({ credential }: Props) {
    const { dispatch, toast, editCredential, removeCredential, toggleFavorite } = useStore();
    const [showPassword, setShowPassword] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [copied, setCopied] = useState<'username' | 'password' | null>(null);
    const [imgError, setImgError] = useState(false);

    const faviconUrl = getFaviconUrl(credential.name, credential.url);

    const handleCopy = useCallback(async (field: 'username' | 'password') => {
        const value = field === 'username' ? credential.username : credential.password;
        const ok = await copyToClipboard(value);
        if (ok) {
            setCopied(field);
            dispatch({ type: 'MARK_COPIED', id: credential.id });
            toast(`${field === 'username' ? 'Username' : 'Password'} copied!`);
            setTimeout(() => setCopied(null), 2000);
        } else {
            toast('Failed to copy', 'error');
        }
    }, [credential, dispatch, toast]);

    const handleRegenPassword = useCallback(async () => {
        const newPwd = generatePassword(20);
        try {
            await editCredential(credential.id, { password: newPwd, passwordStrength: getPasswordStrength(newPwd) });
            toast('New password generated!', 'info');
        } catch {
            toast('Failed to regenerate. Try again.', 'error');
        }
    }, [credential.id, editCredential, toast]);

    const handleDelete = useCallback(async () => {
        if (confirm(`Delete "${credential.name}"? This cannot be undone.`)) {
            try {
                await removeCredential(credential.id);
                toast(`"${credential.name}" deleted`, 'info');
            } catch {
                toast('Failed to delete. Try again.', 'error');
            }
        }
    }, [credential, removeCredential, toast]);

    const strengthColors: Record<string, string> = {
        weak: 'var(--red)',
        medium: 'var(--yellow)',
        strong: 'var(--green)',
        excellent: 'var(--green)',
    };

    const strengthColor = strengthColors[credential.passwordStrength] ?? 'var(--text-tertiary)';

    return (
        <>
            <div className={styles.card}>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.identity}>
                        <div className={styles.favicon}>
                            {!imgError ? (
                                <img
                                    src={faviconUrl}
                                    alt={credential.name}
                                    onError={() => setImgError(true)}
                                    width={28}
                                    height={28}
                                />
                            ) : (
                                <span className={styles.faviconFallback}>{credential.name[0].toUpperCase()}</span>
                            )}
                        </div>
                        <div>
                            <p className={styles.name}>{credential.name}</p>
                            <p className={styles.url}>{credential.url || credential.category}</p>
                        </div>
                    </div>
                    <div className={styles.actions}>
                        <button
                            className={`${styles.actionBtn} ${credential.isFavorite ? styles.starred : ''}`}
                            onClick={() => toggleFavorite(credential.id)}
                            aria-label="Toggle favorite"
                        >
                            <Star size={14} fill={credential.isFavorite ? 'currentColor' : 'none'} />
                        </button>
                        <button className={styles.actionBtn} onClick={() => setIsEditing(true)} aria-label="Edit">
                            <Edit size={14} />
                        </button>
                        <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={handleDelete} aria-label="Delete">
                            <Trash2 size={14} />
                        </button>
                    </div>
                </div>

                {/* Fields */}
                <div className={styles.fields}>
                    {/* Username */}
                    <div className={styles.field}>
                        <span className={styles.fieldLabel}>Username</span>
                        <div className={styles.fieldRow}>
                            <span className={styles.fieldValue}>{credential.username}</span>
                            <button
                                className={`${styles.copyBtn} ${copied === 'username' ? styles.copyBtnDone : ''}`}
                                onClick={() => handleCopy('username')}
                                aria-label="Copy username"
                            >
                                {copied === 'username' ? '✓' : <Copy size={13} />}
                            </button>
                        </div>
                    </div>

                    {/* Password */}
                    <div className={styles.field}>
                        <span className={styles.fieldLabel}>Password</span>
                        <div className={styles.fieldRow}>
                            <span className={`${styles.fieldValue} ${styles.password}`}>
                                {showPassword ? credential.password : '••••••••••••'}
                            </span>
                            <div className={styles.fieldButtons}>
                                <button
                                    className={styles.copyBtn}
                                    onClick={() => setShowPassword(v => !v)}
                                    aria-label="Toggle password"
                                >
                                    {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                                </button>
                                <button
                                    className={`${styles.copyBtn} ${copied === 'password' ? styles.copyBtnDone : ''}`}
                                    onClick={() => handleCopy('password')}
                                    aria-label="Copy password"
                                >
                                    {copied === 'password' ? '✓' : <Copy size={13} />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className={styles.footer}>
                    <span className={styles.strength} style={{ color: strengthColor }}>
                        <span className={styles.strengthDot} style={{ background: strengthColor }} />
                        {credential.passwordStrength}
                    </span>
                    <span className={styles.updatedAt}>{timeAgo(credential.updatedAt)}</span>
                    <button className={styles.regenBtn} onClick={handleRegenPassword} title="Regenerate password">
                        <RefreshCw size={12} />
                    </button>
                </div>
            </div>

            {isEditing && <CredentialModal credential={credential} onClose={() => setIsEditing(false)} />}
        </>
    );
}
