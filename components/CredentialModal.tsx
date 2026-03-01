'use client';
import { useState, useEffect, useCallback } from 'react';
import { X, RefreshCw, Eye, EyeOff, Globe } from 'lucide-react';
import { Credential, Category } from '@/lib/types';
import { useStore } from '@/lib/store';
import { generatePassword, getPasswordStrength, getStrengthScore, CATEGORIES, guessCategoryFromName } from '@/lib/utils';
import styles from './CredentialModal.module.css';

interface Props {
    credential?: Credential;
    onClose: () => void;
}

export default function CredentialModal({ credential, onClose }: Props) {
    const { addCredential, editCredential, toast } = useStore();
    const isEdit = !!credential;

    const [name, setName] = useState(credential?.name ?? '');
    const [username, setUsername] = useState(credential?.username ?? '');
    const [password, setPassword] = useState(credential?.password ?? '');
    const [url, setUrl] = useState(credential?.url ?? '');
    const [notes, setNotes] = useState(credential?.notes ?? '');
    const [category, setCategory] = useState<Category>(credential?.category ?? 'other');
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const strength = getPasswordStrength(password);
    const score = getStrengthScore(password);
    const strengthColor = score >= 75 ? 'var(--green)' : score >= 50 ? 'var(--yellow)' : 'var(--red)';

    // Auto-detect category from name
    useEffect(() => {
        if (!isEdit && name) {
            setCategory(guessCategoryFromName(name));
        }
    }, [name, isEdit]);

    const handleRegen = useCallback(() => {
        setPassword(generatePassword(20));
        setShowPassword(true);
    }, []);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !username.trim() || !password.trim()) {
            toast('Name, username and password are required', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            if (isEdit && credential) {
                await editCredential(credential.id, { name, username, password, url, notes, category });
                toast(`"${name}" updated`);
            } else {
                await addCredential({ name, username, password, url, notes, category });
                toast(`"${name}" added to vault`);
            }
            onClose();
        } catch {
            toast('Failed to save. Please try again.', 'error');
            setIsSubmitting(false);
        }
    }, [isEdit, credential, name, username, password, url, notes, category, addCredential, editCredential, toast, onClose]);

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    return (
        <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className={styles.panel}>
                {/* Header */}
                <div className={styles.header}>
                    <h2 className={styles.title}>{isEdit ? 'Edit Credential' : 'Add New Credential'}</h2>
                    <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    {/* Name */}
                    <div className="input-group">
                        <label className="input-label">App / Website Name *</label>
                        <input
                            className="input-field"
                            type="text"
                            placeholder="e.g. Gmail, Netflix, Notion…"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            autoFocus
                        />
                    </div>

                    {/* Category */}
                    <div className="input-group">
                        <label className="input-label">Category</label>
                        <div className={styles.categoryGrid}>
                            {CATEGORIES.filter(c => c.value !== 'all').map(cat => (
                                <button
                                    key={cat.value}
                                    type="button"
                                    className={`${styles.catBtn} ${category === cat.value ? styles.catBtnActive : ''}`}
                                    onClick={() => setCategory(cat.value as Category)}
                                >
                                    <span>{cat.emoji}</span>
                                    <span>{cat.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* URL */}
                    <div className="input-group">
                        <label className="input-label">
                            <Globe size={11} style={{ display: 'inline', marginRight: 4 }} />
                            URL (optional)
                        </label>
                        <input
                            className="input-field"
                            type="text"
                            placeholder="https://app.example.com"
                            value={url}
                            onChange={e => setUrl(e.target.value)}
                        />
                    </div>

                    {/* Username */}
                    <div className="input-group">
                        <label className="input-label">Username / Email *</label>
                        <input
                            className="input-field"
                            type="text"
                            placeholder="your@email.com"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            autoComplete="off"
                        />
                    </div>

                    {/* Password */}
                    <div className="input-group">
                        <label className="input-label">Password *</label>
                        <div className={styles.passwordWrapper}>
                            <input
                                className={`input-field ${styles.passwordInput}`}
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Enter or generate a password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                autoComplete="new-password"
                            />
                            <div className={styles.passwordActions}>
                                <button type="button" className={styles.pwdBtn} onClick={() => setShowPassword(v => !v)} aria-label="Toggle">
                                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                                <button type="button" className={`${styles.pwdBtn} ${styles.regenBtn}`} onClick={handleRegen} title="Generate secure password">
                                    <RefreshCw size={15} />
                                </button>
                            </div>
                        </div>
                        {/* Strength Bar */}
                        {password && (
                            <div className={styles.strengthBar}>
                                <div
                                    className={styles.strengthFill}
                                    style={{ width: `${score}%`, background: strengthColor }}
                                />
                            </div>
                        )}
                        {password && (
                            <span className={styles.strengthLabel} style={{ color: strengthColor }}>
                                {strength.charAt(0).toUpperCase() + strength.slice(1)} password
                            </span>
                        )}
                    </div>

                    {/* Notes */}
                    <div className="input-group">
                        <label className="input-label">Notes (optional)</label>
                        <textarea
                            className={`input-field ${styles.textarea}`}
                            placeholder="Any additional notes…"
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            rows={3}
                        />
                    </div>

                    {/* Actions */}
                    <div className={styles.formActions}>
                        <button type="button" className="btn btn-ghost" onClick={onClose} disabled={isSubmitting}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : (isEdit ? 'Save Changes' : 'Add to Vault')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
