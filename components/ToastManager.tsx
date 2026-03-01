'use client';
import { useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { useStore } from '@/lib/store';
import styles from './ToastManager.module.css';

const icons = {
    success: <CheckCircle size={16} />,
    error: <AlertCircle size={16} />,
    info: <Info size={16} />,
};

const colors = {
    success: '#34d399',
    error: '#f87171',
    info: '#818cf8',
};

export default function ToastManager() {
    const { state, dispatch } = useStore();

    useEffect(() => {
        const timers: ReturnType<typeof setTimeout>[] = [];
        state.toasts.forEach(t => {
            const timer = setTimeout(() => dispatch({ type: 'REMOVE_TOAST', id: t.id }), 3000);
            timers.push(timer);
        });
        return () => timers.forEach(clearTimeout);
    }, [state.toasts, dispatch]);

    return (
        <div className={styles.container}>
            {state.toasts.map(t => (
                <div key={t.id} className={styles.toast} style={{ borderLeftColor: colors[t.type] }}>
                    <span style={{ color: colors[t.type], flexShrink: 0 }}>{icons[t.type]}</span>
                    <span className={styles.message}>{t.message}</span>
                    <button className={styles.close} onClick={() => dispatch({ type: 'REMOVE_TOAST', id: t.id })}>
                        <X size={12} />
                    </button>
                </div>
            ))}
        </div>
    );
}
