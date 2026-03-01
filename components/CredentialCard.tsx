'use client';
import { useState, useCallback } from 'react';
import { Copy, Eye, EyeOff, Star, Edit, Trash2, RefreshCw, AlertTriangle, ExternalLink } from 'lucide-react';
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
        // We still have the native confirm here, but PM wanted a modal. Let's fix delete bug first.
        if (confirm(`Delete "${credential.name}"? This cannot be undone.`)) {
            try {
                await removeCredential(credential.id);
                toast(`"${credential.name}" deleted`, 'info');
            } catch {
                toast('Failed to delete. Try again.', 'error');
            }
        }
    }, [credential, removeCredential, toast]);

    const handleLaunchAndCopy = useCallback(async () => {
        if (!credential.url) return;
        const ok = await copyToClipboard(credential.password);
        if (ok) {
            setCopied('password');
            dispatch({ type: 'MARK_COPIED', id: credential.id });
            toast(`Password copied! Launching ${credential.name}…`);
            setTimeout(() => setCopied(null), 2000);

            // Launch URL
            let targetUrl = credential.url;
            if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
                targetUrl = 'https://' + targetUrl;
            }
            window.open(targetUrl, '_blank', 'noopener,noreferrer');
        } else {
            toast('Failed to copy password', 'error');
        }
    }, [credential.url, credential.password, credential.name, dispatch, toast]);

    const [isDeleting, setIsDeleting] = useState(false);

    // ... rest of the code is unchanged until the render ...
    const confirmDelete = useCallback(async () => {
        try {
            await removeCredential(credential.id);
            toast(`"${credential.name}" deleted`, 'info');
        } catch {
            toast('Failed to delete. Try again.', 'error');
            setIsDeleting(false);
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
                {isDeleting ? (
                    <div className={styles.deleteConfirmOverlay}>
                        <AlertTriangle size={32} color="var(--red)" style={{ marginBottom: 12 }} />
                        <h3 className={styles.deleteConfirmTitle}>Delete '{credential.name}'?</h3>
                        <p className={styles.deleteConfirmText}>This action cannot be undone.</p>
                        <div className={styles.deleteConfirmActions}>
                            <button className="btn" onClick={() => setIsDeleting(false)}>Cancel</button>
                            <button className="btn" style={{ background: 'var(--red)', color: 'white', borderColor: 'var(--red)' }} onClick={confirmDelete}>Delete</button>
                        </div>
                    </div>
                ) : (
                    <>
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
                                    {credential.url ? (
                                        <a
                                            href={credential.url.startsWith('http') ? credential.url : `https://${credential.url}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={`${styles.url} ${styles.urlLink}`}
                                        >
                                            {credential.url}
                                        </a>
                                    ) : (
                                        <p className={styles.url}>{credential.category}</p>
                                    )}
                                </div>
                            </div>
                            <div className={styles.actions}>
                                {credential.url && (
                                    <button
                                        className={styles.actionBtn}
                                        onClick={handleLaunchAndCopy}
                                        aria-label="Launch and Copy Password"
                                        title="Copy Password & Open URL"
                                    >
                                        <ExternalLink size={14} />
                                    </button>
                                )}
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
                                <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => setIsDeleting(true)} aria-label="Delete">
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
                            {credential.isBreached && (
                                <span className={styles.breachBadge}>
                                    <AlertTriangle size={11} />
                                    Breached
                                </span>
                            )}
                            <span className={styles.updatedAt}>{timeAgo(credential.updatedAt)}</span>
                            <button className={styles.regenBtn} onClick={handleRegenPassword} title="Regenerate password">
                                <RefreshCw size={12} />
                            </button>
                        </div>
                    </>
                )}
            </div>

            {isEditing && <CredentialModal credential={credential} onClose={() => setIsEditing(false)} />}
        </>
    );
}
