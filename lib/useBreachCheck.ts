'use client';

import { useEffect, useRef } from 'react';
import { useStore } from '@/lib/store';
import { checkPasswordBreach } from '@/lib/vault-api';

/**
 * Background breach checker — runs once after vault unlock.
 * Checks each credential's password against HIBP (k-anonymity API)
 * and dispatches UPDATE_CREDENTIAL with isBreached=true if compromised.
 * Throttles requests to 1 per 300ms to respect API rate limits.
 */
export function useBreachCheck() {
    const { state, dispatch } = useStore();
    const checkedRef = useRef(new Set<string>());

    useEffect(() => {
        if (!state.isVaultUnlocked || state.credentials.length === 0) return;

        const unchecked = state.credentials.filter(
            c => c.isBreached === undefined && !checkedRef.current.has(c.id)
        );

        if (unchecked.length === 0) return;

        let cancelled = false;
        const abortController = new AbortController();

        async function runChecks() {
            for (const cred of unchecked) {
                if (cancelled) break;
                checkedRef.current.add(cred.id);
                try {
                    const breached = await checkPasswordBreach(cred.password);
                    if (!cancelled) {
                        dispatch({
                            type: 'UPDATE_CREDENTIAL',
                            id: cred.id,
                            data: { isBreached: breached },
                        });
                    }
                } catch {
                    // Don't block on HIBP failures
                }
                // Throttle: 300ms between requests
                await new Promise(r => setTimeout(r, 300));
            }
        }

        runChecks();

        return () => {
            cancelled = true;
            abortController.abort();
        };
    }, [state.isVaultUnlocked, state.credentials.length]);
}
