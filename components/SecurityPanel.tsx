'use client';
import { useMemo } from 'react';
import { AlertTriangle, CheckCircle, Shield, TrendingUp } from 'lucide-react';
import { useStore } from '@/lib/store';
import { computeSecurityScore, scoreLabel, CATEGORIES } from '@/lib/utils';
import { PasswordStrength } from '@/lib/types';
import styles from './SecurityPanel.module.css';

export default function SecurityPanel() {
    const { state } = useStore();
    const { credentials } = state;

    const score = useMemo(() => computeSecurityScore(credentials), [credentials]);

    const byStrength = useMemo(() => {
        const counts: Record<PasswordStrength, number> = { weak: 0, medium: 0, strong: 0, excellent: 0 };
        credentials.forEach(c => counts[c.passwordStrength]++);
        return counts;
    }, [credentials]);

    const byCategory = useMemo(() => {
        const map: Record<string, number> = {};
        credentials.forEach(c => {
            map[c.category] = (map[c.category] || 0) + 1;
        });
        return map;
    }, [credentials]);

    const weakCreds = credentials.filter(c => c.passwordStrength === 'weak');
    const mediumCreds = credentials.filter(c => c.passwordStrength === 'medium');

    const scoreColor = score >= 80 ? 'var(--green)' : score >= 50 ? 'var(--yellow)' : 'var(--red)';

    return (
        <div className={styles.root}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Security Health</h1>
                    <p className={styles.subtitle}>Your vault's security at a glance</p>
                </div>
            </div>

            {/* Score Big */}
            <div className={styles.scoreCard}>
                <LargeScoreRing score={score} color={scoreColor} />
                <div className={styles.scoreText}>
                    <span className={styles.scoreBig} style={{ color: scoreColor }}>{score}</span>
                    <span className={styles.scoreOf}>/100</span>
                    <p className={styles.scoreLabel}>{scoreLabel(score)}</p>
                    <p className={styles.scoreDesc}>Based on {credentials.length} passwords</p>
                </div>
            </div>

            {/* Breakdown Grid */}
            <div className={styles.grid}>
                <StatCard
                    label="Excellent"
                    count={byStrength.excellent}
                    total={credentials.length}
                    color="var(--green)"
                    icon={<CheckCircle size={16} />}
                />
                <StatCard
                    label="Strong"
                    count={byStrength.strong}
                    total={credentials.length}
                    color="var(--green)"
                    icon={<TrendingUp size={16} />}
                />
                <StatCard
                    label="Fair"
                    count={byStrength.medium}
                    total={credentials.length}
                    color="var(--yellow)"
                    icon={<Shield size={16} />}
                />
                <StatCard
                    label="At Risk"
                    count={byStrength.weak}
                    total={credentials.length}
                    color="var(--red)"
                    icon={<AlertTriangle size={16} />}
                />
            </div>

            {/* Weak Passwords - Action List */}
            {(weakCreds.length + mediumCreds.length) > 0 && (
                <div className={styles.actionSection}>
                    <h3 className={styles.sectionTitle}>
                        <AlertTriangle size={15} style={{ color: 'var(--yellow)' }} />
                        Passwords That Need Attention
                    </h3>
                    <div className={styles.actionList}>
                        {[...weakCreds, ...mediumCreds].map(c => (
                            <div key={c.id} className={styles.actionItem}>
                                <div className={styles.actionLeft}>
                                    <span className={styles.actionName}>{c.name}</span>
                                    <span className={styles.actionUser}>{c.username}</span>
                                </div>
                                <span
                                    className={styles.actionStrength}
                                    style={{ color: c.passwordStrength === 'weak' ? 'var(--red)' : 'var(--yellow)' }}
                                >
                                    {c.passwordStrength}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Category Breakdown */}
            <div className={styles.actionSection}>
                <h3 className={styles.sectionTitle}>
                    <Shield size={15} style={{ color: 'var(--text-accent)' }} />
                    Coverage by Category
                </h3>
                <div className={styles.categoryList}>
                    {CATEGORIES.filter(cat => cat.value !== 'all' && byCategory[cat.value]).map(cat => (
                        <div key={cat.value} className={styles.categoryItem}>
                            <span className={styles.catEmoji}>{cat.emoji}</span>
                            <span className={styles.catName}>{cat.label}</span>
                            <span className={styles.catCount}>{byCategory[cat.value] ?? 0}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, count, total, color, icon }: { label: string; count: number; total: number; color: string; icon: React.ReactNode }) {
    const pct = total > 0 ? (count / total) * 100 : 0;
    return (
        <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ color, background: `${color}18` }}>{icon}</div>
            <span className={styles.statCount} style={{ color }}>{count}</span>
            <span className={styles.statLabel}>{label}</span>
            <div className={styles.statBar}>
                <div className={styles.statBarFill} style={{ width: `${pct}%`, background: color }} />
            </div>
        </div>
    );
}

function LargeScoreRing({ score, color }: { score: number; color: string }) {
    const r = 54;
    const circ = 2 * Math.PI * r;
    const dash = circ * (score / 100);
    return (
        <svg width="140" height="140" viewBox="0 0 140 140">
            <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="8" />
            <circle
                cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${dash} ${circ}`}
                strokeDashoffset={circ * 0.25}
                style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.16,1,0.3,1)', filter: `drop-shadow(0 0 12px ${color})` }}
            />
        </svg>
    );
}
