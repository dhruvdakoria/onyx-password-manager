# Onyx Password Manager: Product Specification

## 1. Executive Summary
**Onyx** is a next-generation password manager that bridges the gap between enterprise-grade security and consumer-level aesthetic elegance. Inspired by the design language of Apple and Wealthsimple, Onyx focuses on a minimalist, highly interactive, and emotionally engaging user experience. The goal is to create a product so seamless, intuitive, and seamlessly integrated into the user's daily digital life that moving to another platform feels like a massive step backward. 

Onyx will function across Web, iOS, Android, Desktop, and as a Browser Extension, providing a unified, localized, and contextually aware autofill experience.

---

## 2. Design Philosophy & Vision
The fundamental problem with existing password managers (1Password, Bitwarden, LastPass) is that they feel like *utilities*—often clunky, utilitarian, and purely functional. Onyx feels like a *premium financial or lifestyle product*.

*   **Aesthetics (The Wealthsimple/Apple Vibe):**
    *   **Typography-Driven:** Use of crisp, modern sans-serif fonts (e.g., Inter, SF Pro, or Geist). Large, clear headings.
    *   **Monochromatic & Accent Driven:** Deep dark modes (true OLED blacks), stark, clean light modes, and a single, vibrant accent color (e.g., a glowing electric blue or neon mint) for core actions.
    *   **Glassmorphism & Depth:** Soft blurs on modals, context menus, and bottom sheets to establish a visual hierarchy without relying on harsh borders.
    *   **Micro-interactions:** Haptic feedback on mobile for successful autofills, smooth spring-based animations for transitions, and satisfying sound design (optional but polished).
*   **Zero-Friction & "Invisible" UX:**
    *   The app should get out of the way. The best password manager is the one you rarely have to open because it proactively surfaces exactly what you need at the exact moment you need it.
    *   **The "Lite" Interface:** For users who just want quick, manual credential retrieval without complex vault management, a stripped-down, lightning-fast search-and-copy UI is prioritized.
*   **Gamified Security (The "Stickiness" Factor):**
    *   Instead of scolding users for bad passwords, we reward them. We use visual progress rings, dynamic "Security Health" scores, and rewarding animations (like closing rings in Apple Fitness) when users update a weak password.

---

## 3. Core Platforms & Technology Stack
*   **Mobile (iOS / Android):** React Native (Expo) or Native Swift/Kotlin. Must heavily leverage OS-level autofill APIs and Biometrics (Face ID/Touch ID/Fingerprint).
*   **Web Dashboard:** Next.js with React. Used exclusively for vault management, settings, and bulk operations.
*   **Browser Extensions (Chrome, Safari, Firefox):** Built on Manifest V3. This is the primary interaction point on desktop.
*   **Backend & Sync:** Rust/Go for high-performance, memory-safe API handling. WebSockets for instant, real-time vault syncing across devices.
*   **Database/Storage:** Local encrypted SQLite for offline-first support; cloud blob storage for encrypted payloads (Zero-Knowledge).

---

## 4. Feature Specification

### 4.1. The Ultimate Onboarding Experience
*   **The Hook:** Interactive, beautifully animated walk-through explaining Zero-Knowledge security without the jargon.
*   **Master Key Generation:** Instead of just typing a password, Onyx actively measures typing entropy and provides real-time, fluid visual feedback on strength. 
*   **Emergency Kit:** Generates a beautifully formatted PDF (Apple-level layout) containing the user's Secret Key (a secondary key required on new devices alongside the master password to prevent server-side cracking) and a place to write their Master Password.
*   **One-Click Migration:** "Magic Import" from Chrome, iCloud Keychain, 1Password, and Bitwarden. The UI shows a beautiful funnel animation as credentials securely transfer over.

### 4.2. Core Vault Management
*   **Smart Categorization:** Automatically categorize logins (Streaming, Banking, Productivity, Social) by fetching brand logos/favicons in the background. The vault should look like an app drawer, not a spreadsheet.
*   **Passkey-First Integration:** Full, native passkey support. Onyx acts as the passkey provider across mobile and desktop interfaces, completely replacing iCloud Keychain/Google Password Manager.
*   **Digital Wallet:** A dedicated section that mimics Apple Wallet. Renders credit cards as beautiful, highly detailed digital cards (fetching issuer colors/logos).
*   **Secure Notes & Identities:** Markdown support for secure notes. Granular identity management for one-click comprehensive form filling (shipping, billing, passport info).

### 4.3. Contextual Magic Autofill
*   **The "Never Miss" Heuristics:** The biggest frustration with current apps is when autofill fails to recognize a form. Onyx will use lightweight machine learning models mapped locally to identify custom username/password fields, addressing 99% of edge cases.
*   **Inline Extension UI:** On desktop browsers, the extension places a subtle, glowing Onyx icon *inside* the input field. Clicking it opens a beautifully transient popover (no harsh popups) to select the login.
*   **Keyboard Integration (Mobile):** Deeply integrated into the iOS/Android native keyboard autofill suggestion bar.

### 4.4. The Security Engine (Gamification & Stickiness)
*   **Onyx Security Ring:** A visual dashboard (akin to Wealthsimple's portfolio performance) showing overall security health (e.g., "Score: 840 - Excellent").
*   **One-Click Password Redux:** For supported sites, Onyx automatically naviagtes to the password change page, generates a new secure password, and saves it in the background to raise the health score.
*   **Dark Web & Breach Monitoring:** Uses "haveibeenpwned" integration (via k-Anonymity) to silently monitor breaches. If breached, the user gets an urgent but sleek actionable notification to rotate the credential.

### 4.5. Collaborative & Family Sharing
*   **Onyx Circles:** Shared vaults designed around people, not folders. Drag and drop a streaming service login into "The Family Circle" with a smooth animation.
*   **One-Time Provisioning Links:** Securely share a Wi-Fi password or Netflix login via an encrypted, self-destructing web link. The recipient doesn't need an Onyx account. 
*   **Permission Granularity:** Allow sharing a credential *without* revealing the actual text (e.g., it only autofills on the recipient's machine).

### 4.6. Emergency Access (Legacy Planning)
*   **Digital Inheritance:** A "Dead Man's Switch." A trusted contact can request access. If the user doesn't deny the request within X days (configurable), the contact receives access to a specific "Legacy Vault."

### 4.7. The "Quick Access" Lite Interface
While the core vault is robust, a dedicated "lite" mode exists for users who just want immediate, manual access to credentials.
*   **Instant Search & Copy Workflow:** A spotlight-like global search bar front and center. Searching "Gmail" instantly surfaces the Gmail card. The card features large, satisfying "Copy Username" and "Copy Password" buttons for rapid manual authentication elsewhere.
*   **Frictionless Local Authentication:** Access to this app mode is secured via a simple 6-digit PIN code or Biometrics (Face ID on iOS / Fingerprint on Android), intentionally skipping the heavy Master Password requirement for rapid daily use.
*   **One-Tap Storage & Generation:** A simplified "Add Profile" screen with only three fields: Website/App Name, Username, and Password. Includes a prominent, haptic-enabled "Regenerate Random Password" button right next to the password input field to instantly cycle through secure passwords.

---

## 5. Security Architecture (Strict Zero-Knowledge)
To be the best, security must be mathematically undeniable.
*   **Encryption Standard:** XChaCha20-Poly1305 (faster on mobile, extremely secure, resistant to side-channel attacks) or AES-256-GCM.
*   **Key Derivation:** Argon2id with dynamically scaled difficulty parameters based on device hardware capabilities.
*   **Authentication:** SRP (Secure Remote Password protocol) to authenticate with the server without ever sending the master password over the network.
*   **Two-Key System:** Master Password + a 128-bit Secret Key locally generated upon signup (protects against weak master passwords).
*   **Biometric Enclaves & Local Unlock:** Master keys remain in the Secure Enclave (Apple) or Titan M (Android) when locked. A custom 6-digit PIN acts as a seamless local fallback to Face ID/Touch ID. The heavy Master Password is only needed on a fresh device or after a full system restart.

---

## 6. Retention Strategy: Why Users Won't Leave
1. **Passkey Entanglement:** Once users transition all their logins to Onyx-managed Passkeys, moving to a competitor becomes practically and psychologically daunting. 
2. **Emotional Investment:** The gamified security score creates a desire to maintain a "perfect run" or "perfect score."
3. **Impeccable Reliability:** If autofill works 100% of the time, the thought of switching to a clunkier alternative feels like an immediate downgrade in quality of life.
4. **Visual Superiority:** Once a user experiences the fluid animations, typography, and dark mode of Onyx, utilitarian apps will look archaic.

---

## 7. Roadmap & Phased Rollout
*   **Phase 1: The Foundation (MVP+)**
    *   Core Vault (Web + iOS + Browser Extension).
    *   Zero-Knowledge Auth + SQLite local cache.
    *   Basic Autofill & Password Generator.
*   **Phase 2: The Differentiators**
    *   Passkey Support Native integration.
    *   Gamified Security Health dashboard.
    *   Magic Importers from competitors.
*   **Phase 3: Ecosystem Expansion**
    *   Android Native App.
    *   Family Circles & Secure Sharing links.
    *   Emergency Access / Digital Legacy.
*   **Phase 4: Advanced Tooling**
    *   Automated Password rotation (One-Click reduxes).
    *   Developer tools / SSH Agent integration (competing with 1Password developer tools).

---
*End of Specification.*
