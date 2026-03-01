'use client';
import { useState, useMemo, useCallback } from 'react';
import type React from 'react';
import { Search, Plus, Shield, BarChart2, Lock, Zap, LogOut } from 'lucide-react';
import { UserButton } from '@clerk/nextjs';
import { useStore } from '@/lib/store';
import { CATEGORIES, scoreLabel } from '@/lib/utils';
import { Category } from '@/lib/types';
import CredentialCard from './CredentialCard';
import CredentialModal from './CredentialModal';
import SecurityPanel from './SecurityPanel';
import PasswordGenerator from './PasswordGenerator';
import styles from './Dashboard.module.css';
import { useAutoLock } from '@/lib/useAutoLock';
import { useBreachCheck } from '@/lib/useBreachCheck';

type Panel = 'vault' | 'security' | 'generator';

export default function Dashboard() {
    const { state, dispatch } = useStore();
    const [activePanel, setActivePanel] = useState<Panel>('vault');
    const [showAddModal, setShowAddModal] = useState(false);
    const [searchFocused, setSearchFocused] = useState(false);

    // Auto-lock after 5 minutes of inactivity
    const lockVault = useCallback(() => dispatch({ type: 'VAULT_LOCKED' }), [dispatch]);
    useAutoLock(state.isVaultUnlocked, lockVault);

    // Background breach check on vault unlock
    useBreachCheck();

    const filteredCreds = useMemo(() => {
        const q = state.searchQuery.toLowerCase().trim();
        return state.credentials
            .filter(c => {
                const matchesSearch = !q ||
                    c.name.toLowerCase().includes(q) ||
                    c.username.toLowerCase().includes(q) ||
                    (c.url?.toLowerCase().includes(q));
                const matchesCategory = state.activeCategory === 'all' || c.category === state.activeCategory;
                return matchesSearch && matchesCategory;
            })
            .sort((a, b) => {
                if (a.isFavorite && !b.isFavorite) return -1;
                if (!a.isFavorite && b.isFavorite) return 1;
                return b.updatedAt - a.updatedAt;
            });
    }, [state.credentials, state.searchQuery, state.activeCategory]);

    const score = state.securityScore;
    const weakCount = state.credentials.filter(c => c.passwordStrength === 'weak').length;
    const hasItems = score >= 0;
    const displayScore = hasItems ? score : 0;
    const scoreColor = !hasItems ? 'var(--text-tertiary)' : score >= 80 ? 'var(--green)' : score >= 50 ? 'var(--yellow)' : 'var(--red)';

    return (
        <div className={styles.root}>
            {/* ── Sidebar ── */}
            <aside className={styles.sidebar}>
                <div className={styles.sidebarLogo}>
                    <div className={styles.logoMark}><Shield size={16} strokeWidth={1.5} /></div>
                    <span className={styles.logoText}>Onyx</span>
                </div>

                <nav className={styles.nav}>
                    {([
                        { id: 'vault', icon: <Lock size={15} />, label: 'Vault', badge: undefined as number | undefined },
                        { id: 'security', icon: <BarChart2 size={15} />, label: 'Security', badge: weakCount > 0 ? weakCount : undefined as number | undefined },
                        { id: 'generator', icon: <Zap size={15} />, label: 'Generator', badge: undefined as number | undefined },
                    ]).map(item => (
                        <button
                            key={item.id}
                            className={`${styles.navItem} ${activePanel === item.id ? styles.navItemActive : ''}`}
                            onClick={() => setActivePanel(item.id as Panel)}
                        >
                            {item.icon}
                            <span>{item.label}</span>
                            {item.badge !== undefined && <span className={styles.badge}>{item.badge}</span>}
                        </button>
                    ))}
                </nav>

                {/* Security Score Ring */}
                <div className={styles.scoreWidget}>
                    <ScoreRing score={displayScore} color={scoreColor} />
                    <div className={styles.scoreInfo}>
                        <span className={styles.scoreLabel}>{scoreLabel(score)}</span>
                        <span className={styles.scoreValue}>{hasItems ? score : '—'}<span className={styles.scoreDenom}>/100</span></span>
                    </div>
                    <p className={styles.scoreHint}>Security Health</p>
                </div>

                <div className={styles.sidebarBottom}>
                    <button className={styles.navItem} onClick={() => dispatch({ type: 'VAULT_LOCKED' })}>
                        <LogOut size={15} />
                        <span>Lock Vault</span>
                    </button>
                    <div className={styles.userRow}>
                        <UserButton />
                        <span className={styles.userHint}>Account</span>
                    </div>
                </div>
            </aside>

            {/* ── Main ── */}
            <main className={styles.main}>
                {/* Mobile top bar (visible below 768px) */}
                <div className={styles.mobileHeader}>
                    <div className={styles.mobileLogoRow}>
                        <div className={styles.logoMark}><Shield size={16} strokeWidth={1.5} /></div>
                        <span className={styles.logoText}>Onyx</span>
                    </div>
                    <div className={styles.mobileActions}>
                        <button className={styles.mobileLockBtn} onClick={() => dispatch({ type: 'VAULT_LOCKED' })}>
                            <LogOut size={16} />
                        </button>
                        <UserButton />
                    </div>
                </div>

                {activePanel === 'vault' && (
                    <>
                        <div className={styles.header}>
                            <div className={styles.headerLeft}>
                                <h1 className={styles.pageTitle}>Your Vault</h1>
                                <span className={styles.credCount}>{state.credentials.length} items</span>
                            </div>
                            <button className={`btn btn-primary ${styles.addBtn}`} onClick={() => setShowAddModal(true)}>
                                <Plus size={15} />
                                Add New
                            </button>
                        </div>

                        <div className={`${styles.searchWrapper} ${searchFocused ? styles.searchFocused : ''}`}>
                            <Search size={15} className={styles.searchIcon} />
                            <input
                                type="text"
                                className={styles.searchInput}
                                placeholder="Search by name, username, or URL…"
                                value={state.searchQuery}
                                onChange={e => dispatch({ type: 'SET_SEARCH', query: e.target.value })}
                                onFocus={() => setSearchFocused(true)}
                                onBlur={() => setSearchFocused(false)}
                            />
                            {state.searchQuery && (
                                <button className={styles.searchClear} onClick={() => dispatch({ type: 'SET_SEARCH', query: '' })}>✕</button>
                            )}
                        </div>

                        <div className={styles.categories}>
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat.value}
                                    className={`${styles.catPill} ${state.activeCategory === cat.value ? styles.catPillActive : ''}`}
                                    onClick={() => dispatch({ type: 'SET_CATEGORY', category: cat.value as Category })}
                                >
                                    <span>{cat.emoji}</span>
                                    <span>{cat.label}</span>
                                </button>
                            ))}
                        </div>

                        {filteredCreds.length === 0 ? (
                            <div className={styles.empty}>
                                <div className={styles.emptyIcon}><Shield size={36} strokeWidth={1} /></div>
                                <p className={styles.emptyTitle}>
                                    {state.searchQuery ? 'No results found' : 'Your vault is empty'}
                                </p>
                                <p className={styles.emptySubtitle}>
                                    {state.searchQuery ? `No credentials match "${state.searchQuery}"` : 'Add your first credential to get started'}
                                </p>
                                {!state.searchQuery && (
                                    <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                                        <Plus size={15} /> Add Credential
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className={styles.grid}>
                                {filteredCreds.map(cred => <CredentialCard key={cred.id} credential={cred} />)}
                            </div>
                        )}
                    </>
                )}

                {activePanel === 'security' && <SecurityPanel />}
                {activePanel === 'generator' && (
                    <>
                        <div className={styles.header}>
                            <div className={styles.headerLeft}>
                                <h1 className={styles.pageTitle}>Password Generator</h1>
                                <span className={styles.credCount}>Cryptographically secure</span>
                            </div>
                        </div>
                        <PasswordGenerator />
                    </>
                )}
            </main>

            {showAddModal && <CredentialModal onClose={() => setShowAddModal(false)} />}
        </div>
    );
}

function ScoreRing({ score, color }: { score: number; color: string }) {
    const r = 28;
    const circ = 2 * Math.PI * r;
    const dash = circ * (score / 100);
    return (
        <svg width="72" height="72" viewBox="0 0 72 72" className={styles.scoreRing}>
            <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
            <circle
                cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={`${dash} ${circ}`}
                strokeDashoffset={circ * 0.25}
                style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.16,1,0.3,1)', filter: `drop-shadow(0 0 6px ${color})` }}
            />
        </svg>
    );
}
