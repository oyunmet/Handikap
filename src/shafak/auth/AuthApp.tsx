import { ClerkProvider, SignIn, SignUp, useAuth, useClerk, useUser } from "@clerk/react";
import { dark } from "@clerk/themes";
import { trTR } from "@clerk/localizations";
import { lazy, Suspense, useEffect, useState } from "react";
import { Route, Router, Switch, Redirect, useLocation, Link } from "wouter";
import "./auth.css";

const ShafakApp = lazy(() => import("../App"));
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY?.trim() ?? "";
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const CLERK_READY_TIMEOUT_MS = 8_000;

function stripBase(path: string) {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

function useClerkReadyTimeout(isLoaded: boolean) {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (isLoaded) {
      setTimedOut(false);
      return undefined;
    }

    const timer = window.setTimeout(() => setTimedOut(true), CLERK_READY_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [isLoaded]);

  return timedOut;
}

function ClerkLoadingError() {
  return (
    <main className="auth-loading auth-loading--error" role="alert">
      <section>
        <strong>Oturum bilgileri yüklenemedi</strong>
        <p>Clerk veya hesap bilgileri 8 saniye içinde hazır olmadı. Bağlantını kontrol edip yeniden deneyebilirsin.</p>
        <button type="button" onClick={() => window.location.reload()}>Yeniden dene</button>
      </section>
    </main>
  );
}

function SsoCallbackRedirect() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation(
      `/sign-in/sso-callback${window.location.search}${window.location.hash}`,
      { replace: true },
    );
  }, [setLocation]);

  return <div className="auth-loading" role="status">Oturum bağlantısı tamamlanıyor…</div>;
}

const clerkAppearance = {
  theme: dark,
  variables: {
    colorPrimary: "#d5a95d",
    colorForeground: "#f4ead8",
    colorMutedForeground: "#b3a895",
    colorDanger: "#e27f69",
    colorBackground: "#11131a",
    colorInput: "#090b11",
    colorInputForeground: "#f4ead8",
    colorNeutral: "#756348",
    fontFamily: "Manrope, sans-serif",
    borderRadius: "8px",
  },
  elements: {
    rootBox: { width: "100%", display: "flex", justifyContent: "center" },
    cardBox: {
      width: "min(440px, 100%)",
      overflow: "hidden",
      border: "1px solid rgba(212, 177, 111, 0.25)",
      borderRadius: "10px",
      background: "rgba(16, 18, 25, 0.96)",
      boxShadow: "0 24px 90px rgba(0, 0, 0, 0.55)",
    },
    card: { border: "none", background: "transparent", boxShadow: "none" },
    footer: { border: "none", background: "transparent", boxShadow: "none" },
    headerTitle: { color: "#f3e6cc", fontFamily: "Cinzel, serif", letterSpacing: "0.04em" },
    headerSubtitle: { color: "#b7ad9a" },
    socialButtonsBlockButtonText: { color: "#eee4d3" },
    formFieldLabel: { color: "#e5d7bd" },
    footerActionLink: { color: "#e3b965" },
    footerActionText: { color: "#c6baa4" },
    dividerText: { color: "#a99c85" },
    identityPreviewEditButton: { color: "#e3b965" },
    formFieldSuccessText: { color: "#a8cc9b" },
    alertText: { color: "#f2d3c9" },
    logoBox: { maxHeight: "42px" },
    logoImage: { maxHeight: "42px" },
    socialButtonsBlockButton: {
      border: "1px solid rgba(212, 177, 111, 0.3)",
      background: "rgba(255, 255, 255, 0.035)",
      borderRadius: "7px",
    },
    formButtonPrimary: {
      color: "#1b1711",
      background: "linear-gradient(120deg, #f0d08a, #ba7b36)",
      borderRadius: "7px",
      fontWeight: "800",
      boxShadow: "0 8px 20px rgba(176, 113, 48, 0.23)",
    },
    formFieldInput: {
      border: "1px solid rgba(212, 177, 111, 0.22)",
      background: "#090b11",
      color: "#f4ead8",
      borderRadius: "7px",
    },
    footerAction: { color: "#c6baa4" },
    dividerLine: { background: "rgba(212, 177, 111, 0.2)" },
    alert: { borderRadius: "7px" },
    otpCodeFieldInput: {
      border: "1px solid rgba(212, 177, 111, 0.35)",
      background: "#090b11",
      color: "#f4ead8",
    },
    formFieldRow: { gap: "8px" },
    main: { gap: "18px" },
  },
};

function HomeRoute() {
  const { isSignedIn } = useUser();
  if (isSignedIn) return <Redirect to="/user-portal" />;
  return import.meta.env.DEV ? <ClerkBackedGame allowOfflineGuest /> : <Redirect to="/sign-in" />;
}

function UserPortal() {
  const { isSignedIn } = useUser();
  if (!isSignedIn) return <Redirect to="/" />;
  return <ClerkBackedGame />;
}

function ClerkBackedGame({ allowOfflineGuest = false }: { allowOfflineGuest?: boolean }) {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const { signOut } = useClerk();
  return (
    <Suspense fallback={<div className="auth-loading" role="status">Oyun hazırlanıyor…</div>}>
      <ShafakApp
        user={user ? {
          id: user.id,
          firstName: user.firstName,
          primaryEmailAddress: user.primaryEmailAddress
            ? { emailAddress: user.primaryEmailAddress.emailAddress }
            : null,
        } : null}
        authLoaded={isLoaded}
        allowOfflineGuest={allowOfflineGuest}
        signOut={signOut}
        getToken={getToken}
      />
    </Suspense>
  );
}

function SignInPage() {
  return (
    <main className="auth-page">
      <div className="auth-page__backdrop" aria-hidden="true" />
      <Link className="auth-page__brand" href="/">
        <img src={`${basePath}/logo.svg`} alt="" />
        <span><strong>ŞAFAK</strong><small>SAVAŞÇILARI</small></span>
      </Link>
      {new URLSearchParams(window.location.search).get("auth_error") === "session" && (
        <p role="alert" style={{ color: "#e27f69", textAlign: "center" }}>
          Oturum doğrulanamadı. Lütfen yeniden giriş yap.
        </p>
      )}
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
        forceRedirectUrl={`${basePath}/user-portal`}
      />
    </main>
  );
}

function SignUpPage() {
  return (
    <main className="auth-page">
      <div className="auth-page__backdrop" aria-hidden="true" />
      <Link className="auth-page__brand" href="/">
        <img src={`${basePath}/logo.svg`} alt="" />
        <span><strong>ŞAFAK</strong><small>SAVAŞÇILARI</small></span>
      </Link>
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
        forceRedirectUrl={`${basePath}/user-portal`}
      />
    </main>
  );
}

function ClerkSessionRoutes() {
  const { isLoaded } = useUser();
  const timedOut = useClerkReadyTimeout(isLoaded);

  if (!isLoaded) {
    return timedOut
      ? <ClerkLoadingError />
      : <div className="auth-loading" role="status">Hesap bilgileri yükleniyor…</div>;
  }

  return (
    <Switch>
      <Route path="/" component={HomeRoute} />
      <Route path="/user-portal" component={UserPortal} />
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      <Route><Redirect to="/" /></Route>
    </Switch>
  );
}

function ClerkRoutes() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      appearance={clerkAppearance}
      localization={trTR}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <ClerkSessionRoutes />
    </ClerkProvider>
  );
}

export default function AuthApp() {
  if (!clerkPubKey) {
    return (
      <main className="auth-page" role="alert">
        <div className="auth-page__backdrop" aria-hidden="true" />
        <section className="auth-loading">
          <strong>Clerk yapılandırması eksik</strong>
          <span>Misafir oyunu yalnızca geliştirme ortamında kullanılabilir.</span>
        </section>
      </main>
    );
  }

  return (
    <Router base={basePath}>
      <Switch>
        <Route path="/sso-callback" component={SsoCallbackRedirect} />
        <Route><ClerkRoutes /></Route>
      </Switch>
    </Router>
  );
}
