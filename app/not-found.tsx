import Link from 'next/link';
import { Shield, Home } from 'lucide-react';
import styles from './not-found.module.css';

export default function NotFound() {
    return (
        <div className={styles.container}>
            <div className={styles.bg} />
            <div className={styles.floatingOrb} />

            <div className={styles.panel}>
                <div className={styles.logo}>
                    <Shield size={48} strokeWidth={1} />
                </div>
                <h1 className={styles.title}>404 — Not Found</h1>
                <p className={styles.subtitle}>
                    The page you're looking for doesn't exist, has been moved, or is locked away in the vault.
                </p>

                <Link href="/" className={styles.homeBtn}>
                    <Home size={18} />
                    Return Home
                </Link>
            </div>
        </div>
    );
}
