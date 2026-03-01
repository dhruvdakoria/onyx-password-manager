'use client';
import { useState, useCallback } from 'react';
import { RefreshCw, Copy, Check, Sliders } from 'lucide-react';
import { generatePassword, getPasswordStrength, getStrengthScore } from '@/lib/utils';
import { copyToClipboard } from '@/lib/utils';
import { useStore } from '@/lib/store';
import styles from './PasswordGenerator.module.css';

export default function PasswordGenerator() {
    const { toast } = useStore();
    const [length, setLength] = useState(20);
    const [useUpper, setUseUpper] = useState(true);
    const [useLower, setUseLower] = useState(true);
    const [useDigits, setUseDigits] = useState(true);
    const [useSymbols, setUseSymbols] = useState(true);
    const [password, setPassword] = useState(() =>
        generatePassword(20, { upper: true, lower: true, digits: true, symbols: true })
    );
    const [copied, setCopied] = useState(false);

    const regen = useCallback(() => {
        setPassword(generatePassword(length, { upper: useUpper, lower: useLower, digits: useDigits, symbols: useSymbols }));
        setCopied(false);
    }, [length, useUpper, useLower, useDigits, useSymbols]);

    const handleCopy = useCallback(async () => {
        const ok = await copyToClipboard(password);
        if (ok) {
            setCopied(true);
            toast('Password copied!');
            setTimeout(() => setCopied(false), 2000);
        }
    }, [password, toast]);

    const strength = getPasswordStrength(password);
    const score = getStrengthScore(password);
    const strengthColor = score >= 75 ? 'var(--green)' : score >= 50 ? 'var(--yellow)' : 'var(--red)';

    return (
        <div className={styles.root}>
            {/* Password Display */}
            <div className={styles.display}>
                <div className={styles.displayInner}>
                    <span className={styles.passwordText}>{password}</span>
                    <div className={styles.displayActions}>
                        <button className={`${styles.actionBtn} ${copied ? styles.copiedBtn : ''}`} onClick={handleCopy}>
                            {copied ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                        <button className={`${styles.actionBtn} ${styles.regenBtn}`} onClick={regen}>
                            <RefreshCw size={16} />
                        </button>
                    </div>
                </div>
                <div className={styles.strengthRow}>
                    <div className={styles.strengthBar}>
                        <div className={styles.strengthFill} style={{ width: `${score}%`, background: strengthColor }} />
                    </div>
                    <span className={styles.strengthLabel} style={{ color: strengthColor }}>
                        {strength.charAt(0).toUpperCase() + strength.slice(1)}
                    </span>
                </div>
            </div>

            {/* Controls */}
            <div className={styles.controls}>
                <div className={styles.controlsHeader}>
                    <Sliders size={14} />
                    <span>Customize</span>
                </div>

                {/* Length Slider */}
                <div className={styles.sliderSection}>
                    <div className={styles.sliderHeader}>
                        <span className={styles.sliderLabel}>Length</span>
                        <span className={styles.sliderValue}>{length}</span>
                    </div>
                    <input
                        type="range"
                        min={8}
                        max={64}
                        value={length}
                        onChange={e => { setLength(+e.target.value); regen(); }}
                        className={styles.slider}
                    />
                    <div className={styles.sliderTicks}>
                        <span>8</span><span>24</span><span>40</span><span>64</span>
                    </div>
                </div>

                {/* Toggles */}
                <div className={styles.toggleGrid}>
                    <Toggle label="Uppercase" hint="A–Z" checked={useUpper} onChange={v => { setUseUpper(v); }} onPost={regen} />
                    <Toggle label="Lowercase" hint="a–z" checked={useLower} onChange={v => { setUseLower(v); }} onPost={regen} />
                    <Toggle label="Numbers" hint="0–9" checked={useDigits} onChange={v => { setUseDigits(v); }} onPost={regen} />
                    <Toggle label="Symbols" hint="!@#$%" checked={useSymbols} onChange={v => { setUseSymbols(v); }} onPost={regen} />
                </div>

                <button className={`btn btn-primary ${styles.bigRegen}`} onClick={regen}>
                    <RefreshCw size={16} />
                    Generate New Password
                </button>
            </div>

            {/* Tips */}
            <div className={styles.tips}>
                <p className={styles.tipsTitle}>Security Tips</p>
                <ul className={styles.tipsList}>
                    <li>Use at least 16 characters for maximum security</li>
                    <li>Include symbols and numbers to increase entropy</li>
                    <li>Never reuse passwords across different sites</li>
                    <li>Change passwords periodically for critical accounts</li>
                </ul>
            </div>
        </div>
    );
}

function Toggle({ label, hint, checked, onChange, onPost }: {
    label: string; hint: string; checked: boolean;
    onChange: (v: boolean) => void; onPost: () => void;
}) {
    return (
        <button
            className={`${styles.toggle} ${checked ? styles.toggleOn : ''}`}
            onClick={() => { onChange(!checked); setTimeout(onPost, 0); }}
        >
            <div className={styles.toggleInfo}>
                <span className={styles.toggleLabel}>{label}</span>
                <span className={styles.toggleHint}>{hint}</span>
            </div>
            <div className={`${styles.toggleSwitch} ${checked ? styles.toggleSwitchOn : ''}`}>
                <div className={styles.toggleThumb} />
            </div>
        </button>
    );
}
