'use client';

import { useEffect, useRef, useCallback } from 'react';

const AUTO_LOCK_MS = 5 * 60 * 1000; // 5 minutes of inactivity

/**
 * Auto-lock the vault after a period of inactivity.
 * Listens for mouse movement, keyboard, touch, and scroll events.
 * Resets the timer on any interaction.
 */
export function useAutoLock(isUnlocked: boolean, lockVault: () => void) {
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const resetTimer = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            lockVault();
        }, AUTO_LOCK_MS);
    }, [lockVault]);

    useEffect(() => {
        if (!isUnlocked) return;

        const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
        const handler = () => resetTimer();

        events.forEach(e => document.addEventListener(e, handler, { passive: true }));
        resetTimer(); // start the timer

        return () => {
            events.forEach(e => document.removeEventListener(e, handler));
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [isUnlocked, resetTimer]);
}
