import { useAuth } from "@/hooks/use-auth";
import { useOrders } from "@/hooks/use-orders";
import { useWallet } from "@/hooks/use-wallet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Loader2, Package, Clock, Gift, Mail, Key, User, Calendar, Link2, LogOut, Copy, ExternalLink, Wallet, ArrowUpRight, Settings2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { SiBitcoin } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";
import { CryptoPaymentModal } from "@/components/CryptoPaymentModal";
import { queryClient } from "@/lib/queryClient";
import { formatDate, formatDateTime, formatTime } from "@/lib/date-utils";

export default function ProfilePage() {
  const { user, isLoading, logout } = useAuth();
  const searchParams = new URLSearchParams(window.location.search);
  const orderId = searchParams.get("order");
  const tabParam = searchParams.get("tab");  
  const { data: orders } = useOrders();
  
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [activeTab, setActiveTab] = useState(() => {
    if (tabParam === "orders") return "orders";
    if (tabParam === "balance") return "balance";
    return "dashboard";
  });

  const { toast } = useToast();

  useEffect(() => {
    if (tabParam === "orders") setActiveTab("orders");
    else if (tabParam === "balance") setActiveTab("balance");
  }, [tabParam]);

  useEffect(() => {
    if (orderId && orders) {
      const order = orders.find((o: any) => o.orderId === orderId || o.id.toString() === orderId);
      if (order) {
        setSelectedOrder(order);
        setActiveTab("orders");
      }
    }
  }, [orderId, orders]);

  if (isLoading || !user) return <div className="flex h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-20">
      <div className="flex flex-col gap-4 border-b border-border/70 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Member workspace</p>
          <h1 className="break-words text-2xl font-bold tracking-tight [overflow-wrap:anywhere] sm:text-4xl">
            {activeTab === "dashboard" ? `Welcome back, ${user.username}` : activeTab === "orders" ? "Your orders" : activeTab === "balance" ? "Wallet & payments" : "Account settings"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {activeTab === "dashboard" ? "Manage your orders, balance, and account details." : activeTab === "orders" ? "Review purchases and access fulfilled order details." : activeTab === "balance" ? "Top up your balance or redeem a gift card." : "Manage your profile, Telegram link, and sign-in details."}
          </p>
        </div>
        <div className="flex w-fit shrink-0 items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-2 text-xs text-muted-foreground">
          <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
          Account active
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-xl border border-border/80 bg-card/60 p-1 md:grid-cols-4">
          <TabsTrigger value="dashboard" className="h-11 gap-2 rounded-lg text-sm data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none">
            <User className="h-4 w-4" /> Overview
          </TabsTrigger>
          <TabsTrigger value="orders" className="h-11 gap-2 rounded-lg text-sm data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none">
            <Package className="h-4 w-4" /> Orders
          </TabsTrigger>
          <TabsTrigger value="balance" className="h-11 gap-2 rounded-lg text-sm data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none">
            <Wallet className="h-4 w-4" /> Balance
          </TabsTrigger>
          <TabsTrigger value="settings" className="h-11 gap-2 rounded-lg text-sm data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none">
            <Settings2 className="h-4 w-4" /> Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="pt-5 sm:pt-6">
          <DashboardTab
            user={user}
            logout={logout}
            orderCount={orders?.length || 0}
            openOrders={() => setActiveTab("orders")}
            openBalance={() => setActiveTab("balance")}
            openSettings={() => setActiveTab("settings")}
          />
        </TabsContent>

        <TabsContent value="orders" className="pt-5 sm:pt-6">
          <OrdersTab />
        </TabsContent>

        <TabsContent value="balance" className="pt-5 sm:pt-6">
          <BalanceTab user={user} />
        </TabsContent>

        <TabsContent value="settings" className="pt-5 sm:pt-6">
          <SettingsTab user={user} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DashboardTab({
  user,
  logout,
  orderCount,
  openOrders,
  openBalance,
  openSettings,
}: {
  user: any;
  logout: () => void;
  orderCount: number;
  openOrders: () => void;
  openBalance: () => void;
  openSettings: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="relative overflow-hidden border-primary/25 bg-gradient-to-br from-primary/10 via-card to-card">
          <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full border border-primary/10 shadow-[0_0_0_24px_hsl(var(--primary)/0.025),0_0_0_52px_hsl(var(--primary)/0.02)]" />
          <CardContent className="relative space-y-7 p-5 sm:p-7">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Wallet className="h-4 w-4 text-primary" />
              Available balance
            </div>
            <div>
              <p className="text-4xl font-bold tracking-tight sm:text-5xl">${((user.balance || 0) / 100).toFixed(2)}</p>
              <p className="mt-2 text-sm text-muted-foreground">Ready to use on your next order</p>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4">
              <span className="text-xs text-muted-foreground">Current account balance</span>
              <Button onClick={openBalance} className="gap-2">
                <ArrowUpRight className="h-4 w-4" /> Manage balance
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/70">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="text-base">Account details</CardTitle>
              <CardDescription className="mt-1">Your profile information</CardDescription>
            </div>
            <Button variant="ghost" size="icon" aria-label="Account settings" onClick={openSettings} className="text-muted-foreground">
              <Settings2 className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="grid gap-x-5 sm:grid-cols-2">
            {[
              { label: "Username", value: user.username || "—", icon: User },
              { label: "Email", value: user.email || "Not added", icon: Mail },
              { label: "Telegram", value: user.telegramUsername || "Not linked", icon: Link2 },
              { label: "Member since", value: formatDate(user.createdAt), icon: Calendar },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex min-w-0 items-center gap-3 border-t border-border/70 py-3.5 first:border-t-0 sm:[&:nth-child(2)]:border-t-0">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="h-4 w-4" /></div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="truncate text-sm font-medium">{value}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button onClick={openOrders} className="group flex items-center justify-between rounded-xl border border-border/80 bg-card/50 p-4 text-left transition-colors hover:border-primary/35 hover:bg-card">
          <span className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><Package className="h-4 w-4" /></span>
            <span><span className="block text-sm font-semibold">Order history</span><span className="mt-1 block text-xs text-muted-foreground">{orderCount} {orderCount === 1 ? "order" : "orders"} on your account</span></span>
          </span>
          <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
        </button>
        <button onClick={openSettings} className="group flex items-center justify-between rounded-xl border border-border/80 bg-card/50 p-4 text-left transition-colors hover:border-primary/35 hover:bg-card">
          <span className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><Settings2 className="h-4 w-4" /></span>
            <span><span className="block text-sm font-semibold">Security & preferences</span><span className="mt-1 block text-xs text-muted-foreground">Update your email, password, or Telegram link</span></span>
          </span>
          <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
        </button>
      </div>

      <div className="flex justify-end">
        <Button variant="outline" onClick={logout} className="gap-2 border-destructive/25 text-destructive hover:bg-destructive/10" data-testid="button-logout">
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </div>
    </div>
  );
}

function TelegramLinkSettings() {
  const [dailyRewardCode, setDailyRewardCode] = useState("");
  const [dailyRewardCodeLoading, setDailyRewardCodeLoading] = useState(false);
  const { toast } = useToast();

  const createDailyRewardCode = async () => {
    setDailyRewardCodeLoading(true);
    try {
      const response = await fetch("/api/telegram/daily-rewards/link-code", {
        method: "POST",
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not create a link code");
      setDailyRewardCode(data.code);
      toast({ title: "One-time code created", description: "Send /link followed by this code to the GorillaCC Telegram bot." });
    } catch (error: any) {
      toast({ title: "Could not create code", description: error.message, variant: "destructive" });
    } finally {
      setDailyRewardCodeLoading(false);
    }
  };

  const copyLinkCommand = async () => {
    try {
      await navigator.clipboard.writeText(`/link ${dailyRewardCode}`);
      toast({ title: "Telegram command copied", description: "Paste it into your private chat with the GorillaCC bot." });
    } catch {
      toast({ title: "Could not copy command", description: "Select the code and copy it manually.", variant: "destructive" });
    }
  };

  return (
      <div className="w-full max-w-3xl space-y-4 sm:space-y-5">
      <Card className="border-primary/30 bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Link2 className="h-5 w-5 text-primary" />
            Link Telegram Account
          </CardTitle>
          <CardDescription>
            Connect your Telegram account to receive eligible reward payouts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 p-4 sm:p-6">
          <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
            <li>In Telegram, join the GorillaCC rewards channel.</li>
            <li>Put <span className="font-semibold text-foreground">omnimarket.cc</span> in your Telegram first or last name.</li>
            <li>Generate a code below, then open the bot in a private chat and send <span className="font-mono text-foreground">/link CODE</span>.</li>
          </ol>
          <p className="text-sm text-muted-foreground">
            Link here to receive your $1 referral bonuses in your GorillaCC balance. You can share your referral link before linking.
          </p>
          <Button size="lg" onClick={createDailyRewardCode} disabled={dailyRewardCodeLoading} className="w-full sm:w-auto">
            {dailyRewardCodeLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}
            {dailyRewardCodeLoading ? "Creating code..." : "Generate Telegram link code"}
          </Button>
          {dailyRewardCode && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your one-time code</p>
              <p className="mt-2 break-all font-mono text-2xl font-bold tracking-[0.12em] text-foreground sm:text-3xl sm:tracking-[0.2em]">{dailyRewardCode}</p>
              <p className="mt-2 text-sm text-muted-foreground">Open the bot below within 15 minutes. Your one-time code will be sent securely to finish linking.</p>
              <Button asChild size="lg" className="mt-4 w-full sm:w-auto">
                <a
                  href={`https://t.me/OmniMarketCCBot?start=link_${dailyRewardCode}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open @OmniMarketCCBot
                </a>
              </Button>
              <Button variant="outline" className="mt-3 w-full sm:ml-3 sm:mt-4 sm:w-auto" onClick={copyLinkCommand}>
                <Copy className="mr-2 h-4 w-4" />
                Copy /link command instead
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      <p className="text-sm text-muted-foreground">
        Already linked? You don’t need to generate another code. Daily rewards are sent automatically when your account meets the eligibility requirements.
      </p>
    </div>
  );
}

function SettingsTab({ user }: { user: any }) {
  const { logout } = useAuth();
  const [newTelegram, setNewTelegram] = useState(user.telegramUsername || "");
  const [newEmail, setNewEmail] = useState(user.email || "");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const { toast } = useToast();

  const handleUpdateTelegram = async () => {
    try {
      const res = await fetch("/api/user/telegram", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramUsername: newTelegram }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update");
      toast({ title: "Telegram Updated" });
    } catch {
      toast({ title: "Error", description: "Failed to update telegram", variant: "destructive" });
    }
  };

  const handleUpdateEmail = async () => {
    if (!newEmail.trim()) return toast({ title: "Error", description: "Email is required", variant: "destructive" });
    if (newEmail !== confirmEmail) return toast({ title: "Error", description: "Emails do not match", variant: "destructive" });
    try {
      const res = await fetch("/api/user/email", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed");
      toast({ title: "Email Updated" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to update email", variant: "destructive" });
    }
  };

  const handleUpdatePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
      return;
    }
    try {
      const res = await fetch("/api/user/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed");
      toast({ title: "Password Updated" });
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to update password", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <TelegramLinkSettings />

      <Card className="bg-card border-border">
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <Key className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">ID:</span>
            <span className="break-all font-mono text-xs">{user.id}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Username:</span>
            <span className="text-foreground">{user.username}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Email:</span>
            <span className="text-foreground">{user.email || user.username}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <Link2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Referer:</span>
            <span className="text-foreground">N/A</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Joined:</span>
            <span className="text-foreground">{formatDate(user.createdAt)} {formatTime(user.createdAt)}</span>
          </div>
          
          <div className="flex items-center gap-3 pt-4">
            <Button variant="outline" className="w-full border-destructive/30 text-destructive sm:w-auto" onClick={() => logout()} data-testid="button-logout">
              <LogOut className="h-4 w-4 mr-2" /> Logout
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground text-lg">Change Email</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">New Email</label>
            <Input 
              placeholder="name@example.com" 
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              data-testid="input-new-email"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Confirm Email</label>
            <Input 
              placeholder="name@example.com" 
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              data-testid="input-confirm-email"
            />
          </div>
          <Button variant="outline" className="w-full border-primary/30 text-primary hover:bg-primary/10 sm:w-auto" onClick={handleUpdateEmail} data-testid="button-update-email">
            <Mail className="h-4 w-4 mr-2" /> Update Email
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground text-lg">Change Password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Current Password</label>
            <Input 
              type="password"
              placeholder="Current password" 
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              data-testid="input-current-password"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">New Password</label>
            <Input 
              type="password"
              placeholder="********" 
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              data-testid="input-new-password"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Confirm Password</label>
            <Input 
              type="password"
              placeholder="********" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              data-testid="input-confirm-password"
            />
          </div>
          <Button variant="outline" className="w-full border-primary/30 text-primary hover:bg-primary/10 sm:w-auto" onClick={handleUpdatePassword} data-testid="button-update-password">
            <Key className="h-4 w-4 mr-2" /> Update Password
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function OrdersTab() {
  const { data: orders, isLoading, refetch } = useOrders();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  
  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>;
  
  return (
    <div className="space-y-4">
      {!orders || orders.length === 0 ? (
        <div className="text-center py-20 opacity-50">
          <Package className="h-12 w-12 mx-auto mb-4" />
          <h3 className="text-sm font-bold mb-2">No orders found</h3>
          <Link href="/">
            <Button size="sm" className="text-primary">Browse Marketplace</Button>
          </Link>
        </div>
      ) : (
        <Card className="bg-card border-border">
          <CardContent className="p-0">
            <div className="space-y-3 p-3 lg:hidden">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs text-muted-foreground">{orders.length} {orders.length === 1 ? "order" : "orders"}</span>
                <Button variant="outline" size="sm" className="h-9 gap-2" onClick={() => refetch()} data-testid="button-refresh-orders-mobile">
                  <Clock className="h-4 w-4" /> Refresh
                </Button>
              </div>
              {orders.map((order, index) => {
                const productItems = order.items.filter((i: any) => i.itemType !== "card");
                const cardItems = order.items.filter((i: any) => i.itemType === "card");
                const titleParts: string[] = [];
                if (productItems.length > 0) titleParts.push(productItems.map((i: any) => i.variant?.name || "Product").join(", "));
                if (cardItems.length > 0) titleParts.push(`${cardItems.length} Card${cardItems.length > 1 ? "s" : ""}`);
                const hasCards = cardItems.length > 0;
                const hasProducts = productItems.length > 0;
                const typeLabel = hasCards && hasProducts ? "Mixed" : hasCards ? "Cards" : "Order";
                const status = order.status as string;
                const statusColor =
                  status === "fulfilled" || status === "paid" || status === "delivering" || status === "replaced"
                    ? "text-emerald-400"
                    : status === "refunded"
                      ? "text-orange-400"
                      : status === "unpaid" || status === "waiting_payment"
                        ? "text-red-400"
                        : "text-primary";
                const statusLabel =
                  status === "fulfilled" || status === "delivering" ? "Fulfilled"
                    : status === "paid" ? "Paid"
                      : status === "replaced" ? "Replaced"
                        : status === "refunded" ? "Refunded"
                          : status === "pending" ? "Pending"
                            : status === "unpaid" || status === "waiting_payment" ? "Unpaid"
                              : status;

                return (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => setSelectedOrder(order)}
                    aria-label={`View order ${index + 1}: ${titleParts.join(" + ")}`}
                    className="w-full rounded-xl border border-border/80 bg-background/60 p-4 text-left transition-colors hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:bg-white/5"
                  >
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Badge variant="outline" className={cn("mb-2", hasCards && !hasProducts ? "border-yellow-500/30 text-yellow-500" : hasCards && hasProducts ? "border-purple-500/30 text-purple-400" : "border-border text-muted-foreground")}>
                          {typeLabel}
                        </Badge>
                        <p className="break-words text-sm font-semibold leading-5">{titleParts.join(" + ")}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Order {index + 1} · {formatDate(order.createdAt)}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold">${(order.total / 100).toFixed(2)}</p>
                        <p className={cn("mt-2 text-xs font-medium", statusColor)}>{statusLabel}</p>
                      </div>
                    </div>
                    <p className="mt-3 border-t border-border/70 pt-3 text-xs font-medium text-primary">View order details <span aria-hidden="true">→</span></p>
                  </button>
                );
              })}
            </div>

            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-sm">
                <thead className="border-b border-border">
                  <tr>
                    <th className="text-left p-4 font-medium">#</th>
                    <th className="text-left p-4 font-medium">Type</th>
                    <th className="text-left p-4 font-medium">Title</th>
                    <th className="text-left p-4 font-medium">Total</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-right p-4">
                      <Button variant="ghost" size="icon" onClick={() => refetch()} data-testid="button-refresh-orders">
                        <Clock className="h-4 w-4" />
                      </Button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order, index) => {
                    const productItems = order.items.filter((i: any) => i.itemType !== 'card');
                    const cardItems = order.items.filter((i: any) => i.itemType === 'card');
                    const titleParts: string[] = [];
                    if (productItems.length > 0) titleParts.push(productItems.map((i: any) => i.variant?.name || 'Product').join(', '));
                    if (cardItems.length > 0) titleParts.push(`${cardItems.length} Card${cardItems.length > 1 ? 's' : ''}`);
                    const hasCards = cardItems.length > 0;
                    const hasProducts = productItems.length > 0;
                    const typeLabel = hasCards && hasProducts ? 'Mixed' : hasCards ? 'Cards' : 'Order';

                    return (
                    <tr key={order.id} className="border-b border-border last:border-0 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => setSelectedOrder(order)}>
                      <td className="p-4">{index + 1}</td>
                      <td className="p-4">
                        <Badge variant="outline" className={hasCards && !hasProducts ? 'border-yellow-500/30 text-yellow-500' : hasCards && hasProducts ? 'border-purple-500/30 text-purple-400' : 'border-destructive/30 text-destructive'}>
                          {typeLabel}
                        </Badge>
                      </td>
                      <td className="p-4 truncate max-w-[200px]">
                        {titleParts.join(' + ')}
                      </td>
                      <td className="p-4 text-red-500">${(order.total / 100).toFixed(2)}</td>
                      <td className="p-4">
                        <span className={`flex items-center gap-2 ${
                          (order.status as string) === 'fulfilled' || (order.status as string) === 'paid' || (order.status as string) === 'delivering' || (order.status as string) === 'replaced' ? 'text-red-500'
                          : (order.status as string) === 'unpaid' || (order.status as string) === 'waiting_payment' ? 'text-red-500'
                          : (order.status as string) === 'refunded' ? 'text-orange-400'
                          : 'text-primary'
                        }`}>
                          <span className={`w-2 h-2 rounded-full ${
                            (order.status as string) === 'fulfilled' || (order.status as string) === 'paid' || (order.status as string) === 'delivering' || (order.status as string) === 'replaced' ? 'bg-red-500'
                            : (order.status as string) === 'unpaid' || (order.status as string) === 'waiting_payment' ? 'bg-red-500'
                            : (order.status as string) === 'refunded' ? 'bg-orange-400'
                            : 'bg-primary'
                          }`} />
                          {(order.status as string) === 'fulfilled' || (order.status as string) === 'delivering' ? 'Fulfilled' : (order.status as string) === 'paid' ? 'Paid' : (order.status as string) === 'replaced' ? 'Replaced' : (order.status as string) === 'refunded' ? 'Refunded' : (order.status as string) === 'pending' ? 'Pending' : (order.status as string) === 'unpaid' || (order.status as string) === 'waiting_payment' ? 'Unpaid' : order.status}
                          <br />
                          <span className="text-xs text-muted-foreground">on {formatDate(order.createdAt)}</span>
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <Button size="icon" variant="ghost" className="text-primary" data-testid={`button-view-order-${order.id}`}>
                          <Package className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-center gap-2 p-4 border-t border-border">
              <span className="text-muted-foreground">«</span>
              <span className="text-sm">1 of 1</span>
              <span className="text-muted-foreground">»</span>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedOrder && (
        <OrderDetailsSheet 
          order={selectedOrder} 
          open={!!selectedOrder} 
          onOpenChange={(open) => !open && setSelectedOrder(null)} 
        />
      )}
    </div>
  );
}

function OrderDetailsSheet({ order, open, onOpenChange }: { order: any; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [activeTab, setActiveTab] = useState("info");
  const [viewingStockIdx, setViewingStockIdx] = useState<number | null>(null);
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!" });
  };

  const viewingItem = viewingStockIdx !== null ? order.items?.[viewingStockIdx] : null;

  if (viewingItem) {
    const content = viewingItem.itemType === 'card' && viewingItem.card
      ? `${viewingItem.card.cardNumber} | ${viewingItem.card.expiry} | ${viewingItem.card.cvv}`
      : viewingItem.stockItem?.content || '';

    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-md bg-[#0e0e0e] border-l border-white/10 text-foreground p-0">
          <div className="flex h-full flex-col space-y-6 p-4 sm:p-6">
            <h2 className="text-lg font-semibold">Order info</h2>

            <div className="flex-1 flex flex-col gap-4">
              <div
                className="bg-black border border-white/10 text-foreground rounded-lg p-4 text-sm font-mono break-all cursor-pointer min-h-[120px] space-y-3"
                onClick={() => copyToClipboard(content)}
                data-testid="stock-content-box"
              >
                {content.split(/\n\n+/).filter(Boolean).map((chunk: string, ci: number, arr: string[]) => (
                  <div key={ci}>
                    <span className="whitespace-pre-wrap">{chunk.trim()}</span>
                    {ci < arr.length - 1 && <div className="mt-3 border-t border-white/10" />}
                  </div>
                ))}
              </div>
              <Button
                className="w-full bg-amber-400 hover:bg-amber-500 text-black font-black uppercase italic tracking-tighter text-xs h-10"
                onClick={() => setViewingStockIdx(null)}
                data-testid="button-stock-back"
              >
                Back
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md bg-[#0e0e0e] border-l border-white/10 text-foreground p-0">
        <div className="flex h-full flex-col space-y-6 p-4 sm:p-6">
          <h2 className="text-lg font-semibold">Order info</h2>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1">
            <TabsList className="w-full bg-transparent border-b border-white/10 rounded-none p-0 h-auto gap-8">
              <TabsTrigger 
                value="info" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground data-[state=active]:text-primary"
              >
                Info
              </TabsTrigger>
              <TabsTrigger 
                value="products" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground data-[state=active]:text-primary"
              >
                Products
              </TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="pt-6 space-y-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">ID</p>
                <p className="text-xs font-mono break-all">{order.orderId}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Creation date</p>
                <p className="text-xs">{formatDateTime(order.createdAt)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Reason</p>
                <p className="text-xs">cart</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Expected amount</p>
                <p className="text-xs">${(order.total / 100).toFixed(2)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Paid amount</p>
                <p className="text-xs">${(order.total / 100).toFixed(2)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Status</p>
                <p className={`text-xs font-bold ${
                  order.status === 'fulfilled' || order.status === 'paid' || order.status === 'delivering' || order.status === 'replaced' ? 'text-red-500'
                  : order.status === 'unpaid' || order.status === 'waiting_payment' ? 'text-red-500'
                  : order.status === 'refunded' ? 'text-orange-400'
                  : 'text-primary'
                }`}>
                  {order.status === 'fulfilled' || order.status === 'delivering' ? 'Fulfilled' : order.status === 'paid' ? 'Paid' : order.status === 'replaced' ? 'Replaced' : order.status === 'refunded' ? 'Refunded' : order.status === 'pending' ? 'Pending' : order.status === 'unpaid' || order.status === 'waiting_payment' ? 'Unpaid' : order.status}
                </p>
              </div>
            </TabsContent>

            <TabsContent value="products" className="pt-6 space-y-6 overflow-y-auto max-h-[60vh]">
              {order.items?.map((item: any, idx: number) => (
                <div key={idx} className="space-y-4 border-b border-white/10 pb-6 last:border-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={item.itemType === 'card' ? 'border-yellow-500/30 text-yellow-500 text-[9px]' : 'border-primary/30 text-primary text-[9px]'}>
                      {item.itemType === 'card' ? '💳 Credit Card' : '📦 Product'}
                    </Badge>
                  </div>

                  {item.itemType === 'card' ? (
                    <>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Card</p>
                        <p className="text-xs font-bold font-mono">{item.card?.maskedCard || 'N/A'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Country</p>
                        <p className="text-xs font-bold">{item.card?.country || 'N/A'}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Product</p>
                        <p className="text-xs font-bold">{item.variant?.product?.name || item.variant?.name || 'N/A'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Option</p>
                        <p className="text-xs font-bold">{item.variant?.name}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Quantity</p>
                        <p className="text-xs font-bold">{item.quantity}</p>
                      </div>
                    </>
                  )}

                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Unit price</p>
                    <p className="text-xs font-bold">${(item.price / 100).toFixed(2)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Total</p>
                    <p className="text-xs font-bold">${((item.price * item.quantity) / 100).toFixed(2)}</p>
                  </div>

                  {(order.status === 'fulfilled' || order.status === 'paid' || order.status === 'delivering' || order.status === 'replaced') && (item.stockItem || (item.itemType === 'card' && item.card)) && (
                    <Button 
                      className="w-full bg-amber-400 hover:bg-amber-500 text-black font-black uppercase italic tracking-tighter text-xs h-10"
                      onClick={() => setViewingStockIdx(idx)}
                      data-testid={`button-view-stock-${idx}`}
                    >
                      View stock
                    </Button>
                  )}
                  {order.status === 'pending' && (
                    <p className="text-xs text-primary text-center font-medium">Awaiting payment confirmation</p>
                  )}
                  {order.status === 'unpaid' && (
                    <p className="text-xs text-red-500 text-center font-medium">Order cancelled</p>
                  )}
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function BalanceTab({ user }: { user: any }) {
  const { redeemCode } = useWallet();
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [giftCardCode, setGiftCardCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCryptoModal, setShowCryptoModal] = useState(false);

  const handleRedeem = () => {
    if (!giftCardCode.trim()) return;
    setLoading(true);
    redeemCode.mutate(giftCardCode, {
      onSuccess: () => { setGiftCardCode(""); setLoading(false); },
      onError: () => setLoading(false)
    });
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-muted-foreground font-medium">Current Balance</span>
            <span className="text-red-500 font-bold text-xl">${(user.balance / 100).toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-red-900/20 border-red-500/20">
        <CardContent className="p-4">
          <p className="text-sm text-red-300">
            Balance decays at 0.7% per hour of your current balance to keep purchasing fair for everyone.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardContent className="space-y-5 p-4 sm:space-y-6 sm:p-6">
          <div>
            <h3 className="text-sm font-medium mb-3">Amount to charge</h3>
            <Input 
              placeholder="amount to charge in $" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              data-testid="input-charge-amount"
            />
          </div>

          <Button 
            className="w-full h-12"
            onClick={() => {
              if (!amount || parseFloat(amount) < 0.50) {
                toast({ title: "Error", description: "Minimum top-up is $0.50", variant: "destructive" });
                return;
              }
              setShowCryptoModal(true);
            }}
            data-testid="button-charge"
          >
            <SiBitcoin className="h-4 w-4 mr-2" />
            Top Up with Crypto
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground text-lg">Redeem Gift Card</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Gift Card Code</label>
            <Input 
              placeholder="XXXX-XXXX-XXXX-XXXX" 
              value={giftCardCode}
              onChange={(e) => setGiftCardCode(e.target.value.toUpperCase())}
              className="font-mono"
              data-testid="input-gift-card"
            />
          </div>
          <Button 
            className="w-full h-12 bg-amber-400 hover:bg-amber-500 text-black font-bold"
            onClick={handleRedeem}
            disabled={loading || !giftCardCode.trim()}
            data-testid="button-redeem-gift-card"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Gift className="h-4 w-4 mr-2" />}
            Redeem
          </Button>
        </CardContent>
      </Card>

      <CryptoPaymentModal
        open={showCryptoModal}
        onOpenChange={setShowCryptoModal}
        total={Math.round(parseFloat(amount || "0") * 100)}
        purpose="deposit"
        onSuccess={() => {
          setShowCryptoModal(false);
          setAmount("");
          queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        }}
      />
    </div>
  );
}
