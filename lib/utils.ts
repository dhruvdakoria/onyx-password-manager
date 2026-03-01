import { PasswordStrength, Category } from './types';

/* ================================================
   PASSWORD GENERATOR
   ================================================ */
const CHARS = {
    upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lower: 'abcdefghijklmnopqrstuvwxyz',
    digits: '0123456789',
    symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
};

export function generatePassword(length = 20, opts = { upper: true, lower: true, digits: true, symbols: true }): string {
    let charset = '';
    if (opts.upper) charset += CHARS.upper;
    if (opts.lower) charset += CHARS.lower;
    if (opts.digits) charset += CHARS.digits;
    if (opts.symbols) charset += CHARS.symbols;
    if (!charset) charset = CHARS.lower + CHARS.digits;

    const arr = new Uint32Array(length);
    crypto.getRandomValues(arr);
    return Array.from(arr).map(n => charset[n % charset.length]).join('');
}

/* ================================================
   PASSWORD STRENGTH
   ================================================ */
export function getPasswordStrength(password: string): PasswordStrength {
    if (!password) return 'weak';
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 14) score++;
    if (password.length >= 20) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (score <= 3) return 'weak';
    if (score <= 4) return 'medium';
    if (score <= 5) return 'strong';
    return 'excellent';
}

export function getStrengthScore(password: string): number {
    const s = getPasswordStrength(password);
    return s === 'weak' ? 25 : s === 'medium' ? 50 : s === 'strong' ? 75 : 100;
}

/* ================================================
   CATEGORY HELPERS
   ================================================ */
export const CATEGORIES: { value: Category; label: string; emoji: string }[] = [
    { value: 'all', label: 'All', emoji: '✦' },
    { value: 'social', label: 'Social', emoji: '💬' },
    { value: 'banking', label: 'Banking', emoji: '🏦' },
    { value: 'streaming', label: 'Streaming', emoji: '🎬' },
    { value: 'productivity', label: 'Work', emoji: '💼' },
    { value: 'shopping', label: 'Shopping', emoji: '🛍' },
    { value: 'gaming', label: 'Gaming', emoji: '🎮' },
    { value: 'other', label: 'Other', emoji: '📦' },
];

export function guessCategoryFromName(name: string): Category {
    const n = name.toLowerCase();
    if (/twitter|instagram|facebook|linkedin|tiktok|reddit|discord|slack|snapchat/.test(n)) return 'social';
    if (/bank|chase|wells|citi|amex|paypal|venmo|stripe|plaid|fidelity|schwab/.test(n)) return 'banking';
    if (/netflix|spotify|hulu|disney|prime|youtube|apple tv|hbo|paramount/.test(n)) return 'streaming';
    if (/gmail|google|outlook|notion|jira|github|figma|linear|asana|zoom|slack/.test(n)) return 'productivity';
    if (/amazon|shopify|etsy|ebay|walmart|target/.test(n)) return 'shopping';
    if (/steam|epic|blizzard|ea|riot|playstation|xbox|nintendo/.test(n)) return 'gaming';
    return 'other';
}

/* ================================================
   FAVICON
   ================================================ */
export function getFaviconUrl(name: string, url?: string): string {
    if (url) {
        try {
            const domain = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
            return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
        } catch { }
    }
    // Guess domain from name
    const domain = `${name.toLowerCase().replace(/\s+/g, '')}.com`;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
}

/* ================================================
   TIME HELPERS
   ================================================ */
export function timeAgo(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
}

/* ================================================
   CLIPBOARD
   ================================================ */
let clipboardTimeout: NodeJS.Timeout | null = null;

export async function copyToClipboard(text: string, autoClearMs: number = 30000): Promise<boolean> {
    let success = false;
    try {
        await navigator.clipboard.writeText(text);
        success = true;
    } catch {
        // fallback
        const el = document.createElement('textarea');
        el.value = text;
        el.style.position = 'fixed';
        el.style.opacity = '0';
        document.body.appendChild(el);
        el.select();
        success = document.execCommand('copy');
        document.body.removeChild(el);
    }

    if (success && text !== '') {
        if (clipboardTimeout) clearTimeout(clipboardTimeout);
        clipboardTimeout = setTimeout(async () => {
            try {
                // Read current clipboard to check if it's still our text
                // Browsers often restrict reading clipboard without permission,
                // so we just blindly clear it for security.
                await navigator.clipboard.writeText('');
            } catch {
                // Fallback clear
                const el = document.createElement('textarea');
                el.value = '';
                document.body.appendChild(el);
                el.select();
                document.execCommand('copy');
                document.body.removeChild(el);
            }
        }, autoClearMs);
    }

    return success;
}

/* ================================================
   SECURITY SCORE
   ================================================ */
export function computeSecurityScore(credentials: { passwordStrength: PasswordStrength }[]): number {
    if (!credentials.length) return -1; // sentinel for "no items"
    const pts: Record<PasswordStrength, number> = { weak: 0, medium: 40, strong: 75, excellent: 100 };
    const total = credentials.reduce((s, c) => s + pts[c.passwordStrength], 0);
    return Math.round(total / credentials.length);
}

export function scoreLabel(score: number): string {
    if (score < 0) return 'No Items';
    if (score >= 90) return 'Excellent';
    if (score >= 70) return 'Strong';
    if (score >= 45) return 'Fair';
    return 'At Risk';
}
