export type PasswordStrength = 'weak' | 'medium' | 'strong' | 'excellent';

export interface Credential {
    id: string;
    name: string;           // Site / App name
    username: string;
    password: string;
    url?: string;
    category: Category;
    favicon?: string;
    notes?: string;
    createdAt: number;
    updatedAt: number;
    lastCopied?: number;
    isFavorite: boolean;
    passwordStrength: PasswordStrength;
    isBreached?: boolean;   // true if password found in HIBP database
    tags: string[];
}

export type Category =
    | 'all'
    | 'social'
    | 'banking'
    | 'streaming'
    | 'productivity'
    | 'shopping'
    | 'gaming'
    | 'other';

export interface AppState {
    isAuthenticated: boolean;
    hasSetupPin: boolean;
    pin: string;
    credentials: Credential[];
    theme: 'dark' | 'light';
}

export interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
}
