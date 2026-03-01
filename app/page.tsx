'use client';
import { useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useStore } from '@/lib/store';
import LockScreen from '@/components/LockScreen';
import Dashboard from '@/components/Dashboard';
import ToastManager from '@/components/ToastManager';

export default function Home() {
  const { isSignedIn } = useUser();
  const { state, dispatch } = useStore();

  // Sync Clerk session into store
  useEffect(() => {
    dispatch({ type: 'SET_CLERK_SIGNED_IN', value: !!isSignedIn });
  }, [isSignedIn, dispatch]);

  if (!state.isClerkSignedIn) {
    // Clerk middleware will redirect to /sign-in automatically
    return null;
  }

  return (
    <>
      {state.isVaultUnlocked ? <Dashboard /> : <LockScreen />}
      <ToastManager />
    </>
  );
}
