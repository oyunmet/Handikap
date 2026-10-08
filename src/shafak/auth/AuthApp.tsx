import { ClerkProvider, Show, SignIn, SignUp, useUser } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { dark } from "@clerk/themes";
import { trTR } from "@clerk/localizations";
import { Route, Router, Switch, Redirect, useLocation, Link } from "wouter";
import ShafakApp from "../App";
import "./auth.css";

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string) {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in the app environment.");
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
  return (
    <>
      <Show when="signed-in"><Redirect to="/user-portal" /></Show>
      <Show when="signed-out"><ShafakApp /></Show>
    </>
  );
}

function UserPortal() {
  const { isLoaded, isSignedIn } = useUser();
  if (!isLoaded) {
    return <div className="auth-loading" role="status">Hesap bilgileri yükleniyor…</div>;
  }
  if (!isSignedIn) return <Redirect to="/" />;
  return <ShafakApp />;
}

function SignInPage() {
  return (
    <main className="auth-page">
      <div className="auth-page__backdrop" aria-hidden="true" />
      <Link className="auth-page__brand" href="/">
        <img src={`${basePath}/logo.svg`} alt="" />
        <span><strong>ŞAFAK</strong><small>SAVAŞÇILARI</small></span>
      </Link>
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

function ClerkRoutes() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      localization={trTR}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <Switch>
        <Route path="/" component={HomeRoute} />
        <Route path="/user-portal" component={UserPortal} />
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?" component={SignUpPage} />
        <Route><Redirect to="/" /></Route>
      </Switch>
    </ClerkProvider>
  );
}

export default function AuthApp() {
  return (
    <Router base={basePath}>
      <ClerkRoutes />
    </Router>
  );
}
