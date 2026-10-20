import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/use-auth";
import { useForebitPolling } from "@/hooks/use-forebit-polling";
import { useEffect } from "react";
import { Loader2, RefreshCw } from "lucide-react";

// Pages
import AuthPage from "@/pages/AuthPage";
import { LegalPage } from "@/pages/LegalPages";
import { ForgotPasswordPage, ResetPasswordPage } from "@/pages/PasswordRecoveryPage";
import LogsPage from "@/pages/LogsPage";
import ProductDetailPage from "@/pages/ProductDetailPage";
import OrderDetailPageNew from "@/pages/OrderDetailPageNew";
import AdminPage from "@/pages/AdminPage";
import NotFound from "@/pages/not-found";
import DepositPage from "@/pages/DepositPage";
import OrdersPage from "@/pages/OrdersPage";
import MyCodePage from "@/pages/MyCodePage";
import CartPage from "@/pages/CartPage";
import WorkerDashboardPage from "@/pages/WorkerDashboardPage";
import CardsPage from "@/pages/CardsPage";
import AchPage from "@/pages/AchPage";
import ProfilePage from "@/pages/ProfilePage";
import SupportPage from "@/pages/SupportPage";
import RedeemCodePage from "@/pages/RedeemCodePage";
import RanksPage from "@/pages/RanksPage";
import FreeCardPage from "@/pages/FreeCardPage";
import HomePage from "@/pages/HomePage";
import MyDepositsPage from "@/pages/MyDepositsPage";
import CryptoPaymentPage from "@/pages/CryptoPaymentPage";
import ReviewsPage from "@/pages/ReviewsPage";
import SubmitReviewPage from "@/pages/SubmitReviewPage";
import AdminReviewsPage from "@/pages/AdminReviewsPage";
import BuyForYouPage from "@/pages/BuyForYouPage";
import AdminEatsPage from "@/pages/AdminEatsPage";

function LoadingScreen() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background text-foreground">
      <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">Connecting to GorillaCC…</p>
    </main>
  );
}

function ConnectionErrorScreen({ retry }: { retry: () => void }) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-6 text-center text-foreground">
      <div className="space-y-2">
        <h1 className="text-xl font-bold">Unable to connect</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          The app server did not respond. Check the deployment configuration and try again.
        </p>
      </div>
      <button
        type="button"
        onClick={() => void retry()}
        className="inline-flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
      >
        <RefreshCw className="h-4 w-4" aria-hidden="true" />
        Try again
      </button>
    </main>
  );
}

function PageVisibilityGate({ page, children }: { page: string; children: React.ReactNode }) {
  const { user } = useAuth();
  const { data: features, isLoading } = useQuery<{ pages?: Record<string, boolean> }>({
    queryKey: ["/api/settings/features"],
    staleTime: 30000,
  });
  if (page === "banks" || page === "reviews") return <Redirect to="/" />;
  // VIP and Free CC were restored as member pages; stale feature flags from
  // when they were hidden must not redirect users away from them.
  if (page === "ranks" || page === "freeCard") return <>{children}</>;
  if (isLoading) return <LoadingScreen />;
  if (features?.pages?.[page] === false && user?.role !== "admin") {
    if (page !== "home") return <Redirect to="/" />;
    const fallback = [
      ["deposit", "/deposit"],
      ["myDeposits", "/my-deposits"],
      ["redeem", "/redeem"],
      ["myCode", "/my-code"],
      ["cards", "/cards"],
      ["ranks", "/ranks"],
      ["freeCard", "/free-card"],
      ["logs", "/shop"],
      ["cart", "/cart"],
      ["orders", "/orders"],
      ["buyForYou", "/buy-for-you"],
      ["support", "/support"],
      ["profile", "/profile"],
    ].find(([key]) => features?.pages?.[key] !== false)?.[1];
    if (fallback) return <Redirect to={fallback} />;
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-6 text-center">
        <div>
          <h1 className="text-xl font-semibold text-white">Pages are temporarily unavailable</h1>
          <p className="mt-2 text-sm text-white/60">Please check back later.</p>
        </div>
      </main>
    );
  }
  return <>{children}</>;
}

function Router() {
  const { user, isLoading, isError, retryAuth } = useAuth();
  const [location, setLocation] = useLocation();
  useForebitPolling();
  const publicPages = new Set([
    "/auth",
    "/forgot-password",
    "/reset-password",
    "/terms",
    "/terms-of-service",
    "/privacy",
    "/privacy-policy",
  ]);

  useEffect(() => {
    if (!isLoading && !isError && !user && !publicPages.has(location)) {
      setLocation("/auth");
    }
  }, [user, isLoading, isError, location, setLocation]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isError) {
    return <ConnectionErrorScreen retry={retryAuth} />;
  }

  return (
    <Layout>
      <Switch>
        <Route path="/auth" component={AuthPage} />
        <Route path="/forgot-password" component={ForgotPasswordPage} />
        <Route path="/reset-password" component={ResetPasswordPage} />
        <Route path="/terms">{() => <LegalPage kind="terms" />}</Route>
        <Route path="/terms-of-service">{() => <LegalPage kind="terms" />}</Route>
        <Route path="/privacy">{() => <LegalPage kind="privacy" />}</Route>
        <Route path="/privacy-policy">{() => <LegalPage kind="privacy" />}</Route>
        <Route path="/">{() => <PageVisibilityGate page="home"><HomePage /></PageVisibilityGate>}</Route>
        <Route path="/deposit">{() => <PageVisibilityGate page="deposit"><DepositPage /></PageVisibilityGate>}</Route>
        <Route path="/my-deposits">{() => <PageVisibilityGate page="myDeposits"><MyDepositsPage /></PageVisibilityGate>}</Route>
        <Route path="/crypto-payment/:paymentId">{() => <PageVisibilityGate page="deposit"><CryptoPaymentPage /></PageVisibilityGate>}</Route>
        <Route path="/shop">{() => <PageVisibilityGate page="logs"><LogsPage /></PageVisibilityGate>}</Route>
        <Route path="/redeem">{() => <PageVisibilityGate page="redeem"><RedeemCodePage /></PageVisibilityGate>}</Route>
        <Route path="/product/:name">{() => <PageVisibilityGate page="logs"><ProductDetailPage /></PageVisibilityGate>}</Route>
        <Route path="/order/:id">{() => <PageVisibilityGate page="orders"><OrderDetailPageNew /></PageVisibilityGate>}</Route>
        <Route path="/orders">{() => <PageVisibilityGate page="orders"><OrdersPage /></PageVisibilityGate>}</Route>
        <Route path="/reviews/submit">{() => <PageVisibilityGate page="reviews"><SubmitReviewPage /></PageVisibilityGate>}</Route>
        <Route path="/reviews">{() => <PageVisibilityGate page="reviews"><ReviewsPage /></PageVisibilityGate>}</Route>
        <Route path="/buy-for-you">{() => <PageVisibilityGate page="buyForYou"><BuyForYouPage /></PageVisibilityGate>}</Route>
        <Route path="/admin/eats" component={AdminEatsPage} />
        <Route path="/admin/reviews" component={AdminReviewsPage} />
        <Route path="/my-code">{() => <PageVisibilityGate page="myCode"><MyCodePage /></PageVisibilityGate>}</Route>
        <Route path="/cart">{() => <PageVisibilityGate page="cart"><CartPage /></PageVisibilityGate>}</Route>
        <Route path="/worker" component={WorkerDashboardPage} />
        <Route path="/cards">{() => <PageVisibilityGate page="cards"><CardsPage /></PageVisibilityGate>}</Route>
        <Route path="/banks">{() => <PageVisibilityGate page="banks"><AchPage /></PageVisibilityGate>}</Route>
        <Route path="/ach">{() => <PageVisibilityGate page="banks"><AchPage /></PageVisibilityGate>}</Route>
        <Route path="/profile">{() => <PageVisibilityGate page="profile"><ProfilePage /></PageVisibilityGate>}</Route>
        <Route path="/ranks">{() => <PageVisibilityGate page="ranks"><RanksPage /></PageVisibilityGate>}</Route>
        <Route path="/free-card">{() => <PageVisibilityGate page="freeCard"><FreeCardPage /></PageVisibilityGate>}</Route>
        <Route path="/support/create">{() => <PageVisibilityGate page="support"><SupportPage initialView="create" /></PageVisibilityGate>}</Route>
        <Route path="/support">{() => <PageVisibilityGate page="support"><SupportPage /></PageVisibilityGate>}</Route>
        <Route path="/admin">
          {() => <AdminPage />}
        </Route>
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
