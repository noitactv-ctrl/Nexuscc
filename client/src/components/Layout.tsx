import { useEffect, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  ChevronDown,
  CreditCard,
  FileText,
  Gift,
  House,
  Layers,
  LogOut,
  Menu,
  MessageSquare,
  MoreVertical,
  Package,
  Plus,
  Settings,
  ShoppingBag,
  Ticket,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

type NavEntry = {
  href: string;
  label: string;
  icon: LucideIcon;
  external?: boolean;
};

type NavGroup = {
  id: string;
  label: string;
  icon: LucideIcon;
  entries: NavEntry[];
};

type NavSection = {
  label: string;
  entries?: NavEntry[];
  groups?: NavGroup[];
};

function initials(value: string) {
  const normalized = value.trim();
  return (normalized.length > 1 ? normalized.slice(0, 2) : normalized || "U").toUpperCase();
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const search = useSearch();
  const [navOpen, setNavOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    deposit: true,
    shop: true,
    orders: true,
    checker: true,
    support: true,
  });

  useEffect(() => {
    setNavOpen(false);
    setAccountOpen(false);
  }, [location]);

  useEffect(() => {
    document.body.style.overflow = navOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [navOpen]);

  useEffect(() => {
    if (!navOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setNavOpen(false);
        setAccountOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navOpen]);

  const balanceDollars = user ? (user.balance / 100).toFixed(2) : "0.00";

  const { data: features } = useQuery<{
    checker: boolean;
    reseller: boolean;
    logs: boolean;
    cards: boolean;
  }>({
    queryKey: ["/api/settings/features"],
    staleTime: 30000,
  });

  const { data: announcements } = useQuery<{ id: number; content: string; link: string | null; active: boolean; bannerColor?: string }[]>({
    queryKey: ["/api/announcements"],
    staleTime: 60000,
  });
  const activeAnnouncements = announcements?.filter((announcement) => announcement.active) ?? [];

  const navSections: NavSection[] = [
    {
      label: "Navigation",
      entries: [{ href: "/", label: "Home", icon: House }],
    },
    {
      label: "Finance",
      groups: [
        {
          id: "deposit",
          label: "Deposit",
          icon: WalletCards,
          entries: [
            { href: "/deposit", label: "Deposit Money", icon: CreditCard },
            { href: "/my-deposits", label: "My Deposits", icon: FileText },
          ],
        },
      ],
      entries: [
        { href: "/redeem", label: "Redeem Code", icon: Gift },
      ],
    },
    {
      label: "Shopping",
      groups: [
        {
          id: "shop",
          label: "Shop",
          icon: ShoppingBag,
          entries: [
            ...(features?.cards !== false ? [{ href: "/cards", label: "Buy Cards", icon: CreditCard }] : []),
            ...(features?.logs !== false ? [{ href: "/shop", label: "Buy Logs", icon: FileText }] : []),
            ...(features?.reseller !== false ? [{ href: "/become-reseller", label: "Become a Seller", icon: BookOpen }] : []),
          ],
        },
      ],
    },
    {
      label: "My Orders",
      groups: [
        {
          id: "orders",
          label: "My Orders",
          icon: Package,
          entries: [
            { href: "/orders", label: "All Orders", icon: Package },
          ],
        },
      ],
    },
    {
      label: "Tools",
      groups: features?.checker !== false
        ? [{
            id: "checker",
            label: "Checker",
            icon: Layers,
            entries: [{ href: "/checker", label: "Card Checker", icon: CreditCard }],
          }]
        : [],
    },
    {
      label: "Support",
      groups: [
        {
          id: "support",
          label: "Support",
          icon: MessageSquare,
          entries: [
            { href: "/support", label: "My Tickets", icon: Ticket },
            { href: "/support/create", label: "Create Ticket", icon: MessageSquare },
          ],
        },
      ],
    },
    {
      label: "Settings",
      entries: [{ href: "/profile", label: "Account Management", icon: UserRound }],
    },
    ...((user?.role === "admin" || (user as any)?.isWorker)
      ? [{
          label: "Management",
          entries: [
            ...(user?.role === "admin" ? [{ href: "/admin", label: "Admin", icon: Settings }] : []),
            ...((user as any)?.isWorker && user?.role !== "admin" ? [{ href: "/worker", label: "Worker Dashboard", icon: Settings }] : []),
          ],
        }]
      : []),
  ];

  const publicPaths = new Set([
    "/auth",
    "/forgot-password",
    "/reset-password",
    "/terms",
    "/terms-of-service",
    "/privacy",
    "/privacy-policy",
  ]);
  if (publicPaths.has(location)) return <>{children}</>;

  function isActive(href: string) {
    const target = new URL(href, window.location.origin);
    if (location !== target.pathname) return false;
    if (target.hash) return window.location.hash === target.hash;
    const current = new URLSearchParams(search);
    if (target.searchParams.toString()) {
      let matches = true;
      target.searchParams.forEach((value, key) => {
        if (current.get(key) !== value) matches = false;
      });
      return matches;
    }
    if (target.pathname === "/orders" && current.has("tab")) return false;
    if (target.pathname === "/deposit" && window.location.hash) return false;
    return true;
  }

  function renderEntry(entry: NavEntry) {
    const Icon = entry.icon;
    const active = !entry.external && isActive(entry.href);
    const className = `nexus-nav-link${active ? " is-active" : ""}`;
    const onClick = () => {
      setNavOpen(false);
      setAccountOpen(false);
    };

    if (entry.external) {
      return (
        <a
          key={entry.href}
          href={entry.href}
          target="_blank"
          rel="noopener noreferrer"
          className={className}
          onClick={onClick}
        >
          <Icon aria-hidden="true" />
          <span>{entry.label}</span>
        </a>
      );
    }

    return (
      <Link key={entry.href} href={entry.href} className={className} onClick={onClick}>
        <Icon aria-hidden="true" />
        <span>{entry.label}</span>
      </Link>
    );
  }

  const userLabel = user?.username || user?.email || "Account";

  return (
    <div className="min-h-screen bg-background">
      {activeAnnouncements.length > 0 && (
        <div
          className="w-full overflow-hidden z-50"
          style={{ height: 32, backgroundColor: activeAnnouncements[0].bannerColor ?? "#5a0000" }}
        >
          <div className="flex items-center h-full whitespace-nowrap animate-[marquee_18s_linear_infinite]">
            {[...Array(4)].flatMap((_, repeat) => activeAnnouncements.map((announcement) => (
              announcement.link ? (
                <a
                  key={`${repeat}-${announcement.id}`}
                  href={announcement.link}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] font-bold tracking-widest text-white uppercase px-12 hover:text-white/80"
                >
                  {announcement.content}
                </a>
              ) : (
                <span key={`${repeat}-${announcement.id}`} className="text-[11px] font-bold tracking-widest text-white uppercase px-12">
                  {announcement.content}
                </span>
              )
            )))}
          </div>
        </div>
      )}

      <header className="nexus-topbar">
        <div className="nexus-topbar-leading">
          <button
            type="button"
            onClick={() => {
              setNavOpen(true);
              setAccountOpen(false);
            }}
            className="nexus-menu-trigger"
            data-testid="btn-menu"
            aria-label="Open navigation"
            aria-expanded={navOpen}
          >
            <Menu aria-hidden="true" />
          </button>

          <Link href="/" className="nexus-topbar-brand" aria-label="NexusCC home">
            <CreditCard aria-hidden="true" />
            <span>NexusCC</span>
          </Link>
        </div>

        <div className="nexus-topbar-trailing">
          {user && (
            <Link href="/deposit" className="nexus-topbar-balance" aria-label={`Balance $${balanceDollars}. Add funds`}>
              <span>${balanceDollars}</span>
              <Plus aria-hidden="true" />
            </Link>
          )}
          {user ? (
            <button
              type="button"
              className="nexus-topbar-avatar"
              aria-label="Open account menu"
              onClick={() => {
                setNavOpen(true);
                setAccountOpen(true);
              }}
            >
              {initials(userLabel)}
            </button>
          ) : (
            <span className="nexus-topbar-avatar-placeholder" />
          )}
        </div>
      </header>

      <button
        type="button"
        className={`nexus-drawer-backdrop${navOpen ? " is-open" : ""}`}
        aria-label="Close navigation"
        tabIndex={navOpen ? 0 : -1}
        onClick={() => {
          setNavOpen(false);
          setAccountOpen(false);
        }}
      />

      <aside
        className={`nexus-drawer${navOpen ? " is-open" : ""}`}
        aria-label="Main navigation"
        aria-hidden={!navOpen}
      >
        <div className="nexus-drawer-header">
          <div className="nexus-drawer-user-mark"><CreditCard aria-hidden="true" /></div>
          <div className="nexus-drawer-user-copy">
            <Link
              href="/"
              className="nexus-drawer-brand"
              aria-label="NexusCC home"
              onClick={() => {
                setNavOpen(false);
                setAccountOpen(false);
              }}
            >
              NexusCC
            </Link>
            <span className="nexus-drawer-greeting">{user?.username || "Welcome"} <span aria-hidden="true">👋</span></span>
          </div>
          <button
            type="button"
            className="nexus-drawer-close"
            aria-label="Close navigation"
            onClick={() => {
              setNavOpen(false);
              setAccountOpen(false);
            }}
          >
            <X aria-hidden="true" />
          </button>
        </div>

        <nav className="nexus-drawer-nav" aria-label="Dashboard sections">
          {navSections.map((section) => {
            const groups = section.groups?.filter((group) => group.entries.length > 0) ?? [];
            const entries = section.entries ?? [];
            if (groups.length === 0 && entries.length === 0) return null;

            return (
              <section className="nexus-nav-section" key={section.label}>
                <h2 className="nexus-nav-section-title">{section.label}</h2>

                {groups.map((group) => {
                  const GroupIcon = group.icon;
                  const expanded = expandedGroups[group.id] ?? false;
                  const groupActive = group.entries.some((entry) => !entry.external && isActive(entry.href));
                  return (
                    <div className="nexus-nav-group" key={group.id}>
                      <button
                        type="button"
                        className={`nexus-nav-group-trigger${groupActive ? " is-active" : ""}`}
                        aria-expanded={expanded}
                        aria-controls={`nexus-group-${group.id}`}
                        onClick={() => setExpandedGroups((current) => ({ ...current, [group.id]: !expanded }))}
                      >
                        <GroupIcon aria-hidden="true" />
                        <span>{group.label}</span>
                        <ChevronDown className={`nexus-nav-chevron${expanded ? " is-expanded" : ""}`} aria-hidden="true" />
                      </button>
                      {expanded && (
                        <div className="nexus-nav-children" id={`nexus-group-${group.id}`}>
                          {group.entries.map(renderEntry)}
                        </div>
                      )}
                    </div>
                  );
                })}

                {entries.length > 0 && (
                  <div className="nexus-nav-section-entries">
                    {entries.map(renderEntry)}
                  </div>
                )}
              </section>
            );
          })}
        </nav>

        {user && (
          <div className="nexus-account-dock">
            {accountOpen && (
              <div className="nexus-account-popover" role="menu">
                <Link
                  href="/profile"
                  className="nexus-account-popover-profile"
                  onClick={() => {
                    setAccountOpen(false);
                    setNavOpen(false);
                  }}
                >
                  <div className="nexus-account-mark"><CreditCard aria-hidden="true" /></div>
                  <div className="nexus-account-popover-copy">
                    <span>{user.username}</span>
                    <span>{user.email}</span>
                    <span className="nexus-account-balance">Balance · ${balanceDollars}</span>
                  </div>
                </Link>
                <button
                  type="button"
                  className="nexus-logout-button"
                  role="menuitem"
                  onClick={() => {
                    setNavOpen(false);
                    setAccountOpen(false);
                    void logout().catch(() => undefined);
                  }}
                >
                  <LogOut aria-hidden="true" />
                  <span>Log out</span>
                </button>
              </div>
            )}
            <button
              type="button"
              className="nexus-account-trigger"
              aria-expanded={accountOpen}
              aria-label="Open account actions"
              onClick={() => setAccountOpen((open) => !open)}
            >
              <div className="nexus-account-mark"><CreditCard aria-hidden="true" /></div>
              <div className="nexus-account-trigger-copy">
                <span>{user.username}</span>
                <span>{user.email}</span>
              </div>
              <MoreVertical className="nexus-account-more" aria-hidden="true" />
            </button>
          </div>
        )}
      </aside>

      <main className="min-h-[calc(100vh-52px)]">
        {children}
      </main>
    </div>
  );
}
