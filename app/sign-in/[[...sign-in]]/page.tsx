import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#08080a',
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* Background radial glow */}
            <div style={{
                position: 'absolute',
                inset: 0,
                background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(99,102,241,0.1) 0%, transparent 60%)',
                pointerEvents: 'none',
            }} />
            <SignIn />
        </div>
    );
}
