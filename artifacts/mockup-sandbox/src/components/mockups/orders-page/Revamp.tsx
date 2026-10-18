import "./_group.css";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Clock3,
  CreditCard,
  Headphones,
  PackageCheck,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";

type OrderTab = "all" | "cards" | "ach" | "logs";
type OrderStatus = "fulfilled" | "pending" | "waiting_payment" | "refunded" | "replaced";
type VouchStatus = "pending" | "approved" | "rejected" | null;

type Order = {
  id: number;
  orderId: string;
  status: OrderStatus;
  category: "card" | "ach" | "log";
  createdAt: string;
  total: number;
  items: string[];
  vouchStatus: VouchStatus;
};

const initialOrders: Order[] = [
  { id: 10482, orderId: "CARD-10482", status: "fulfilled", category: "card", createdAt: "2025-02-18T14:32:00", total: 3299, items: ["Cloud storage · 12 month account"], vouchStatus: null },
  { id: 10471, orderId: "ACH-10471", status: "pending", category: "ach", createdAt: "2025-02-17T09:16:00", total: 4850, items: ["Design suite · annual subscription"], vouchStatus: null },
  { id: 10456, orderId: "LOG-10456", status: "fulfilled", category: "log", createdAt: "2025-02-15T18:47:00", total: 1299, items: ["Streaming service · 6 month access"], vouchStatus: "approved" },
  { id: 10431, orderId: "CARD-10431", status: "fulfilled", category: "card", createdAt: "2025-02-12T11:05:00", total: 2199, items: ["Productivity pro · 1 year"], vouchStatus: "pending" },
  { id: 10406, orderId: "LOG-10406", status: "waiting_payment", category: "log", createdAt: "2025-02-10T16:23:00", total: 875, items: ["Language learning · 3 month plan"], vouchStatus: null },
  { id: 10388, orderId: "ACH-10388", status: "replaced", category: "ach", createdAt: "2025-02-08T08:41:00", total: 5490, items: ["Creative tools bundle · lifetime"], vouchStatus: "rejected" },
  { id: 10352, orderId: "LOG-10352", status: "refunded", category: "log", createdAt: "2025-02-03T13:52:00", total: 1699, items: ["Online course library · 1 year"], vouchStatus: null },
];

const tabOptions: { key: OrderTab; label: string }[] = [
  { key: "all", label: "All orders" },
  { key: "cards", label: "Cards" },
  { key: "ach", label: "ACH" },
  { key: "logs", label: "Logs" },
];

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatCreated(date: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(date));
}

function getStatusLabel(status: OrderStatus) {
  if (status === "fulfilled" || status === "replaced") return "Fulfilled";
  if (status === "waiting_payment") return "Unpaid";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function isFulfilled(order: Order) {
  return order.status === "fulfilled" || order.status === "replaced";
}

function categoryForTab(tab: OrderTab) {
  return tab === "cards" ? "card" : tab === "logs" ? "log" : tab;
}

export function Revamp() {
  const [orders, setOrders] = useState(initialOrders);
  const [tab, setTab] = useState<OrderTab>("all");
  const [search, setSearch] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notice, setNotice] = useState("");

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesTab = tab === "all" || order.category === categoryForTab(tab);
      const matchesSearch = !query || order.orderId.toLowerCase().includes(query) ||
        order.status.toLowerCase().includes(query) || order.items.some((item) => item.toLowerCase().includes(query));
      return matchesTab && matchesSearch;
    });
  }, [orders, search, tab]);

  const totalSpent = orders
    .filter((order) => order.status === "fulfilled" || order.status === "replaced")
    .reduce((total, order) => total + order.total, 0);
  const tabCount = (key: OrderTab) => orders.filter((order) => key === "all" || order.category === categoryForTab(key)).length;

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 2800);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const refresh = () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    window.setTimeout(() => setIsRefreshing(false), 650);
  };

  const exportOrders = () => {
    const contents = ["Order ID\tStatus\tType\tDate\tTotal", ...orders.map((order) =>
      `${order.orderId}\t${getStatusLabel(order.status)}\t${order.category}\t${formatCreated(order.createdAt)}\t${money(order.total)}`,
    )].join("\n");
    const file = new Blob([contents], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = "omnimarket-orders.txt";
    link.click();
    URL.revokeObjectURL(url);
    setNotice("Your order history is ready to download.");
  };

  const submitVouch = (orderId: number) => {
    setOrders((current) => current.map((order) => order.id === orderId ? { ...order, vouchStatus: "pending" } : order));
    setNotice("Vouch request submitted for review.");
  };

  return (
    <main className="om-orders">
      <div className="om-page">
        <header className="om-topline">
          <div className="om-brand"><span className="om-mark">o.</span><span>OmniMarket</span></div>
          <span className="om-crumb">Member space&nbsp; / &nbsp;Orders</span>
        </header>

        <section className="om-heading" aria-labelledby="orders-title">
          <div>
            <p className="om-kicker">Purchase history</p>
            <h1 className="om-title" id="orders-title">Your orders</h1>
            <p className="om-subtitle">A clear record of your digital purchases and delivery status.</p>
          </div>
          <div className="om-heading-actions">
            <button className="om-button" type="button" onClick={refresh} disabled={isRefreshing}>
              <RefreshCw size={13} className={isRefreshing ? "om-spin" : ""} />{isRefreshing ? "Refreshing" : "Refresh"}
            </button>
            <button className="om-button om-button-primary" type="button" onClick={exportOrders}>
              <ArrowDownToLine size={14} />Export
            </button>
          </div>
        </section>

        <section className="om-overview" aria-label="Account order summary">
          <div className="om-stat">
            <div className="om-stat-label"><CreditCard size={13} /> Total deposits</div>
            <div className="om-stat-value">{money(68450)}</div>
            <div className="om-stat-foot">Funds added to your account</div>
          </div>
          <div className="om-stat">
            <div className="om-stat-label"><PackageCheck size={13} /> Total spent</div>
            <div className="om-stat-value">{money(totalSpent)}</div>
            <div className="om-stat-foot">On fulfilled orders</div>
          </div>
          <div className="om-stat">
            <div className="om-stat-label"><ShieldCheck size={13} /> Member tier</div>
            <div className="om-tier-line"><span className="om-tier-name">Gold</span><span className="om-tier-discount">15% member savings</span></div>
            <div className="om-stat-foot">Based on your total deposits</div>
          </div>
        </section>

        <section aria-label="Order list">
          <div className="om-toolbar">
            <nav className="om-tabs" aria-label="Filter orders">
              {tabOptions.map((option) => (
                <button
                  type="button"
                  key={option.key}
                  className={`om-tab${tab === option.key ? " om-tab-active" : ""}`}
                  onClick={() => setTab(option.key)}
                  aria-pressed={tab === option.key}
                >
                  {option.label}<span className="om-count">{tabCount(option.key)}</span>
                </button>
              ))}
            </nav>
            <label className="om-search-wrap">
              <Search className="om-search-icon" size={14} />
              <input
                className="om-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search orders"
                aria-label="Search orders"
              />
            </label>
          </div>
          <div className="om-result-line">
            <span><strong>{filteredOrders.length} orders</strong> found</span>
            <span>Sorted by most recent</span>
          </div>
          {filteredOrders.length ? (
            <div className="om-order-list">
              {filteredOrders.map((order) => (
                <article className="om-order" key={order.id}>
                  <div className="om-order-identity">
                    <div className="om-order-top">
                      <span className="om-order-id">#{order.orderId}</span>
                      <span className={`om-type om-type-${order.category}`}>{order.category}</span>
                    </div>
                    <div className="om-items">{order.items.length} {order.items.length === 1 ? "item" : "items"}</div>
                    <div className="om-created">{formatCreated(order.createdAt)}</div>
                  </div>
                  <div className="om-product">
                    <span className="om-product-label">Purchased item</span>
                    {order.items[0]}
                  </div>
                  <div className="om-order-total">
                    <span className={`om-status om-status-${isFulfilled(order) ? "fulfilled" : order.status === "waiting_payment" ? "unpaid" : order.status}`}>
                      {isFulfilled(order) ? <Check size={11} /> : order.status === "pending" ? <Clock3 size={11} /> : null}
                      {getStatusLabel(order.status)}
                    </span>
                    <div className="om-price">{money(order.total)}</div>
                  </div>
                  <button className="om-view" type="button" aria-label={`View order ${order.orderId}`} onClick={() => setNotice(`Order ${order.orderId} selected.`)}>
                    <ChevronRight size={16} />
                  </button>
                  {order.vouchStatus === "approved" && (
                    <div className="om-vouch-row">
                      <span className="om-vouch-note om-vouch-approved"><CheckCircle2 size={14} /> Vouch approved · $0.50 account credit awarded</span>
                    </div>
                  )}
                  {order.vouchStatus === "pending" && (
                    <div className="om-vouch-row">
                      <span className="om-vouch-note om-vouch-pending"><Clock3 size={14} /> Vouch under review</span>
                    </div>
                  )}
                  {order.vouchStatus === "rejected" && (
                    <div className="om-vouch-row">
                      <span className="om-vouch-note om-vouch-rejected"><CircleHelp size={14} /> Vouch not approved</span>
                    </div>
                  )}
                  {isFulfilled(order) && !order.vouchStatus && (
                    <div className="om-vouch-row">
                      <span className="om-vouch-note"><ShieldCheck size={14} /> Share a genuine experience for $0.50 account credit.</span>
                      <button className="om-vouch-button" type="button" onClick={() => submitVouch(order.id)}>
                        Submit a vouch <ArrowRight size={13} />
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="om-empty">
              <span className="om-empty-mark"><Search size={18} /></span>
              <h3>No orders found</h3>
              <p>Try another order number or choose a different filter.</p>
            </div>
          )}
        </section>

        <footer className="om-foot">
          <span>Order records are updated as payment and delivery progress.</span>
          <a className="om-foot-support" href="https://t.me/+3-lMkt-idutkOTIx" target="_blank" rel="noreferrer">
            <Headphones size={13} /> Contact support <ArrowRight size={12} />
          </a>
        </footer>
      </div>
      {notice && <div className="om-toast" role="status"><CheckCircle2 size={15} />{notice}</div>}
    </main>
  );
}
