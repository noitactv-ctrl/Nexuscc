import "./_group.css";
import { useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  Copy,
  CreditCard,
  Gift,
  Link2,
  LockKeyhole,
  LogOut,
  Mail,
  Package,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Ticket,
  UserRound,
  Wallet,
  X,
} from "lucide-react";

type TabName = "Dashboard" | "Orders" | "Balance" | "Settings";

const orders = [
  { id: "OM-28419", item: "Premium account · 30 days", date: "Oct 18, 2026", amount: "$18.40", status: "Delivered", initials: "PA" },
  { id: "OM-28107", item: "Gift card · $25", date: "Oct 12, 2026", amount: "$25.00", status: "Delivered", initials: "GC" },
  { id: "OM-27652", item: "Streaming subscription · 1 month", date: "Oct 03, 2026", amount: "$12.99", status: "Processing", initials: "SS" },
  { id: "OM-27184", item: "Premium account · 7 days", date: "Sep 26, 2026", amount: "$6.50", status: "Delivered", initials: "PA" },
];

const transactions = [
  { title: "Balance top-up", detail: "Visa ending in 2048 · Oct 17", amount: "+$50.00", kind: "in" },
  { title: "Premium account · 30 days", detail: "Order OM-28419 · Oct 18", amount: "−$18.40", kind: "out" },
  { title: "Referral reward", detail: "Telegram reward · Oct 14", amount: "+$1.00", kind: "in" },
  { title: "Gift card · $25", detail: "Order OM-28107 · Oct 12", amount: "−$25.00", kind: "out" },
];

export function Revamp() {
  const [activeTab, setActiveTab] = useState<TabName>("Dashboard");
  const [orderFilter, setOrderFilter] = useState("All orders");
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [topUp, setTopUp] = useState("50");
  const [notice, setNotice] = useState("");
  const [telegramCode, setTelegramCode] = useState(false);
  const [showTelegram, setShowTelegram] = useState(false);
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [giftCode, setGiftCode] = useState("");

  const flash = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  };
  const nav = (tab: TabName) => {
    setActiveTab(tab);
    setSelectedOrder(null);
  };

  return (
    <main className="omni">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Manrope:wght@400;500;600;700;800&display=swap');
        .omni {
          --ink: #e8e3d9; --dim: #98958c; --subtle: #6d6b64; --line: #2b2a26;
          --panel: #171714; --panel2: #1d1c18; --base: #11110f; --amber: #e6ae4f;
          --amber-soft: #302719; --green: #8cbd9a; --red: #d28c7e;
          min-height: 100dvh; background: var(--base); color: var(--ink);
          font-family: 'Manrope', sans-serif; font-size: 13px; position: relative; overflow: hidden;
        }
        .omni * { box-sizing: border-box; }
        .omni button, .omni input { font: inherit; }
        .omni button { cursor: pointer; }
        .omni .grain { position: absolute; pointer-events: none; inset: 0; opacity: .035; z-index: 5;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.5'/%3E%3C/svg%3E"); }
        .omni .shell { display: grid; grid-template-columns: 232px minmax(0,1fr); min-height: 100dvh; max-width: 1600px; margin: 0 auto; }
        .omni .rail { border-right: 1px solid var(--line); padding: 28px 16px 20px; display: flex; flex-direction: column; background: #131310; }
        .omni .brand { display: flex; align-items: center; gap: 11px; padding: 0 10px 35px; }
        .omni .mark { width: 34px; height: 34px; display: grid; place-items: center; border: 1px solid #8a6937; color: var(--amber); border-radius: 9px; background: linear-gradient(145deg,#342b1c,#1c1913); }
        .omni .brand-name { font-size: 14px; font-weight: 800; letter-spacing: -.45px; }
        .omni .brand-sub { display: block; color: var(--subtle); font-size: 9px; letter-spacing: 1.1px; text-transform: uppercase; margin-top: 2px; }
        .omni .nav-label { color: #68665f; padding: 0 11px; margin: 0 0 9px; font: 10px 'DM Mono', monospace; letter-spacing: 1.1px; text-transform: uppercase; }
        .omni .nav-list { display: grid; gap: 4px; }
        .omni .nav-item { border: 0; background: transparent; color: #9c9990; height: 42px; border-radius: 7px; padding: 0 11px; display: flex; align-items: center; gap: 12px; text-align: left; transition: background .18s,color .18s,transform .18s; }
        .omni .nav-item:hover { background: #201f1a; color: var(--ink); transform: translateX(2px); }
        .omni .nav-item.active { background: #29251e; color: #f0c26f; box-shadow: inset 2px 0 #d99f41; }
        .omni .nav-item span { flex: 1; font-size: 12px; font-weight: 600; }
        .omni .nav-count { background: #343027; border-radius: 10px; color: #d7bd8c; font: 10px 'DM Mono', monospace; padding: 3px 6px; }
        .omni .rail-spacer { flex: 1; min-height: 48px; }
        .omni .help-box { background: #191915; border: 1px solid #302e28; padding: 14px; border-radius: 9px; margin: 0 2px 16px; }
        .omni .help-box strong { display: block; font-size: 11px; margin: 9px 0 4px; }
        .omni .help-box p { color: var(--dim); font-size: 10px; line-height: 1.6; margin: 0 0 10px; }
        .omni .help-box button { border: 0; color: var(--amber); padding: 0; background: transparent; font-size: 10px; font-weight: 700; }
        .omni .rail-user { display: flex; align-items: center; gap: 10px; padding: 14px 8px 0; border-top: 1px solid var(--line); }
        .omni .avatar { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 50%; border: 1px solid #68532e; background: #332b1d; color: #e9bd6e; font-weight: 800; font-size: 11px; }
        .omni .user-name { font-weight: 700; font-size: 11px; }
        .omni .user-email { color: var(--subtle); font-size: 10px; margin-top: 3px; }
        .omni .user-more { margin-left: auto; color: #77746d; }
        .omni .content { min-width: 0; padding: 0 48px 64px; }
        .omni .topbar { height: 73px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--line); }
        .omni .breadcrumbs { color: #77746d; font-size: 11px; display: flex; align-items: center; gap: 8px; }
        .omni .breadcrumbs strong { color: #d2cec4; font-weight: 600; }
        .omni .top-actions { display: flex; gap: 8px; align-items: center; }
        .omni .icon-btn { width: 34px; height: 34px; display: grid; place-items: center; background: transparent; color: #99968d; border: 1px solid transparent; border-radius: 7px; }
        .omni .icon-btn:hover { border-color: var(--line); color: var(--ink); background: #1b1a16; }
        .omni .secure { display: flex; align-items: center; gap: 6px; color: #96958a; font-size: 10px; border: 1px solid var(--line); border-radius: 20px; padding: 7px 10px; margin-left: 8px; }
        .omni .secure svg { color: var(--green); }
        .omni .page-head { display: flex; justify-content: space-between; align-items: end; padding: 35px 0 25px; }
        .omni .eyebrow { color: #a38a5d; font: 10px 'DM Mono', monospace; text-transform: uppercase; letter-spacing: 1.25px; margin: 0 0 9px; }
        .omni h1 { font-size: clamp(25px,3vw,32px); line-height: 1.1; letter-spacing: -1.15px; font-weight: 700; margin: 0; }
        .omni .subtitle { color: var(--dim); margin: 8px 0 0; font-size: 12px; }
        .omni .head-date { color: #79766e; font: 10px 'DM Mono', monospace; padding-bottom: 4px; }
        .omni .tabbar { display: flex; gap: 29px; border-bottom: 1px solid var(--line); overflow-x: auto; scrollbar-width: none; }
        .omni .tab { white-space: nowrap; background: transparent; border: 0; color: #87847b; padding: 0 0 14px; display: flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 700; position: relative; }
        .omni .tab:hover { color: var(--ink); }
        .omni .tab.active { color: var(--amber); }
        .omni .tab.active:after { content: ''; height: 2px; border-radius: 2px; background: var(--amber); position: absolute; bottom: -1px; left: 0; right: 0; }
        .omni .tab-icon { opacity: .75; }
        .omni .workspace { padding-top: 26px; }
        .omni .section-head { display: flex; align-items: end; justify-content: space-between; margin-bottom: 14px; }
        .omni h2 { font-size: 15px; letter-spacing: -.35px; margin: 0; font-weight: 700; }
        .omni .section-note { color: var(--subtle); font-size: 10px; margin-top: 5px; }
        .omni .text-button { border: 0; background: none; color: var(--amber); font-size: 10px; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; padding: 6px 0; }
        .omni .text-button:hover { color: #ffd27e; }
        .omni .grid-main { display: grid; grid-template-columns: minmax(0,1.55fr) minmax(260px,.9fr); gap: 15px; }
        .omni .balance-card { min-height: 224px; padding: 24px 26px; border: 1px solid #5b492c; border-radius: 10px; background: radial-gradient(ellipse at 92% 10%,rgba(177,129,55,.14),transparent 37%), linear-gradient(130deg,#262117 0%,#1b1914 66%,#201b12 100%); position: relative; overflow: hidden; }
        .omni .balance-card:after { content: ''; pointer-events: none; position: absolute; width: 240px; height: 240px; border: 1px solid rgba(230,174,79,.12); border-radius: 50%; right: -67px; top: 46px; box-shadow: 0 0 0 24px rgba(230,174,79,.025),0 0 0 49px rgba(230,174,79,.02); }
        .omni .balance-top { display: flex; align-items: center; gap: 8px; color: #c3bba9; font-size: 11px; position: relative; z-index: 1; }
        .omni .balance-top svg { color: var(--amber); }
        .omni .balance-amount { font-size: 43px; line-height: 1; font-weight: 700; letter-spacing: -2.2px; margin: 23px 0 8px; position: relative; z-index: 1; }
        .omni .balance-amount small { color: #a39b89; font-size: 23px; letter-spacing: -.5px; font-weight: 500; }
        .omni .balance-hint { color: #a8a091; font-size: 10px; position: relative; z-index: 1; }
        .omni .balance-foot { display: flex; justify-content: space-between; align-items: center; margin-top: 24px; position: relative; z-index: 1; }
        .omni .balance-change { color: #b4cba9; display: flex; gap: 5px; align-items: center; font-size: 10px; }
        .omni .button-primary { border: 0; background: var(--amber); color: #1d1810; border-radius: 6px; min-height: 36px; padding: 0 14px; font-size: 10px; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; gap: 7px; transition: background .16s,transform .16s; }
        .omni .button-primary:hover { background: #f2c46e; transform: translateY(-1px); }
        .omni .button-secondary { border: 1px solid #414038; background: #1b1a16; color: #d2cec4; border-radius: 6px; min-height: 36px; padding: 0 13px; font-size: 10px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; gap: 7px; transition: background .16s,border-color .16s; }
        .omni .button-secondary:hover { border-color: #71613f; background: #242119; }
        .omni .reward-card { border: 1px solid var(--line); border-radius: 10px; background: var(--panel); padding: 21px; display: flex; flex-direction: column; justify-content: space-between; }
        .omni .reward-head { display: flex; justify-content: space-between; align-items: center; }
        .omni .reward-icon { width: 34px; height: 34px; background: #2c261b; color: var(--amber); border-radius: 8px; display: grid; place-items: center; }
        .omni .reward-status { font: 9px 'DM Mono', monospace; color: var(--green); border: 1px solid #374536; border-radius: 20px; padding: 5px 8px; }
        .omni .reward-value { font-weight: 700; font-size: 28px; letter-spacing: -1px; margin: 12px 0 3px; }
        .omni .reward-copy { font-size: 10px; line-height: 1.6; color: #969187; max-width: 215px; }
        .omni .reward-link { color: var(--amber); border: 0; padding: 0; background: none; font-size: 10px; font-weight: 700; text-align: left; margin-top: 13px; }
        .omni .mini-metrics { display: grid; grid-template-columns: repeat(3,1fr); border: 1px solid var(--line); border-radius: 9px; background: #171714; margin-top: 15px; }
        .omni .metric { padding: 15px 18px; border-right: 1px solid var(--line); }
        .omni .metric:last-child { border-right: 0; }
        .omni .metric-label { color: #88857b; font-size: 10px; display: flex; align-items: center; gap: 7px; }
        .omni .metric-label svg { color: #b6955e; }
        .omni .metric-value { font-size: 18px; font-weight: 700; letter-spacing: -.4px; margin-top: 8px; }
        .omni .metric-caption { color: #77746b; font-size: 9px; margin-top: 3px; }
        .omni .lower-grid { display: grid; grid-template-columns: minmax(0,1.2fr) minmax(280px,.8fr); gap: 15px; margin-top: 25px; }
        .omni .panel { border: 1px solid var(--line); border-radius: 9px; background: var(--panel); overflow: hidden; }
        .omni .panel-head { display: flex; align-items: center; justify-content: space-between; padding: 17px 19px; border-bottom: 1px solid var(--line); }
        .omni .panel-title { font-size: 12px; font-weight: 700; }
        .omni .panel-sub { color: #7f7b72; font-size: 9px; margin-top: 4px; }
        .omni .order-line { display: grid; grid-template-columns: 34px minmax(0,1fr) auto auto; align-items: center; gap: 11px; padding: 13px 19px; border-bottom: 1px solid #282722; }
        .omni .order-line:last-child { border-bottom: 0; }
        .omni .item-icon { width: 32px; height: 32px; display: grid; place-items: center; color: #c6a665; background: #29251c; border-radius: 7px; }
        .omni .order-name { font-size: 10px; font-weight: 700; white-space: nowrap; text-overflow: ellipsis; overflow: hidden; }
        .omni .order-meta { color: #7f7c73; font: 9px 'DM Mono', monospace; margin-top: 4px; }
        .omni .order-total { font: 10px 'DM Mono', monospace; white-space: nowrap; }
        .omni .status { font-size: 9px; color: #a9c3a8; display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; }
        .omni .status:before { content: ''; width: 5px; height: 5px; border-radius: 50%; background: #83b188; }
        .omni .status.processing { color: #dbb466; }
        .omni .status.processing:before { background: #dcae50; }
        .omni .profile-panel { padding: 18px; }
        .omni .profile-row { display: flex; align-items: center; gap: 11px; padding: 10px 0; border-bottom: 1px solid #282722; }
        .omni .profile-row:last-child { border-bottom: 0; }
        .omni .profile-row > svg { color: #9a8763; }
        .omni .profile-data { flex: 1; min-width: 0; }
        .omni .profile-label { color: #7f7c73; font-size: 9px; margin-bottom: 4px; }
        .omni .profile-value { font-size: 10px; color: #dfdbd1; }
        .omni .verified { font-size: 9px; color: var(--green); display: flex; gap: 4px; align-items: center; }
        .omni .quick { margin-top: 25px; }
        .omni .quick-grid { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 11px; }
        .omni .quick-card { min-height: 95px; border: 1px solid var(--line); background: #171714; border-radius: 8px; color: var(--ink); text-align: left; padding: 14px; transition: border-color .18s,transform .18s,background .18s; }
        .omni .quick-card:hover { border-color: #6a5834; background: #1d1b16; transform: translateY(-2px); }
        .omni .quick-card svg { color: var(--amber); margin-bottom: 13px; }
        .omni .quick-card strong { display: block; font-size: 10px; }
        .omni .quick-card span { display: block; color: #79766e; font-size: 9px; margin-top: 4px; }
        .omni .filter-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 15px; }
        .omni .select-wrap { position: relative; }
        .omni select { color: #c9c5bb; background: #1a1915; border: 1px solid #34332d; border-radius: 6px; padding: 9px 30px 9px 11px; font-size: 10px; appearance: none; }
        .omni .select-wrap svg { position: absolute; right: 10px; top: 10px; color: #89867d; pointer-events: none; }
        .omni .searchbox { position: relative; }
        .omni .searchbox svg { position: absolute; left: 10px; top: 10px; color: #77746d; }
        .omni .searchbox input { height: 34px; width: 190px; border: 1px solid #34332d; border-radius: 6px; color: var(--ink); background: #1a1915; padding: 0 10px 0 31px; font-size: 10px; outline: none; }
        .omni .searchbox input:focus,.omni .field input:focus { border-color: #92703b; box-shadow: 0 0 0 2px rgba(230,174,79,.09); }
        .omni .order-table { width: 100%; border-collapse: collapse; }
        .omni .order-table th { text-align: left; color: #77746c; font: 9px 'DM Mono',monospace; letter-spacing: .65px; text-transform: uppercase; padding: 12px 16px; border-bottom: 1px solid var(--line); }
        .omni .order-table td { padding: 13px 16px; border-bottom: 1px solid #282722; font-size: 10px; }
        .omni .order-table tr:last-child td { border-bottom: 0; }
        .omni .order-table tbody tr { cursor: pointer; transition: background .15s; }
        .omni .order-table tbody tr:hover { background: #1e1d18; }
        .omni .mono { color: #a8a398; font: 9px 'DM Mono',monospace; }
        .omni .order-name-cell { display: flex; align-items: center; gap: 9px; }
        .omni .order-details { padding: 16px 20px; border-top: 1px solid #423724; background: #211e17; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .omni .order-details strong { font-size: 11px; }
        .omni .order-details p { color: #9e998e; margin: 5px 0 0; font-size: 10px; }
        .omni .balance-layout { display: grid; grid-template-columns: minmax(0,1.3fr) minmax(270px,.7fr); gap: 15px; }
        .omni .balance-large { border: 1px solid #5b492c; border-radius: 9px; background: radial-gradient(ellipse at 95% 0,rgba(177,129,55,.13),transparent 40%),#211e18; padding: 22px; }
        .omni .balance-large .balance-amount { margin-top: 20px; }
        .omni .balance-actions { display: flex; gap: 8px; margin-top: 19px; }
        .omni .form-panel { border: 1px solid var(--line); background: var(--panel); border-radius: 9px; padding: 20px; }
        .omni .form-panel h3 { font-size: 12px; margin: 0; }
        .omni .form-panel > p { color: #89867e; font-size: 10px; line-height: 1.6; margin: 7px 0 16px; }
        .omni .field { display: grid; gap: 7px; margin-bottom: 13px; }
        .omni .field label { color: #aaa69c; font-size: 10px; font-weight: 600; }
        .omni .field input { height: 36px; width: 100%; color: var(--ink); border: 1px solid #34332d; border-radius: 6px; outline: none; background: #11110f; padding: 0 11px; font-size: 10px; }
        .omni .field input::placeholder { color: #615f59; }
        .omni .amount-options { display: grid; grid-template-columns: repeat(4,1fr); gap: 7px; margin: 9px 0 14px; }
        .omni .amount-option { height: 32px; border-radius: 5px; border: 1px solid #39372f; background: #1b1a16; color: #aaa69c; font: 10px 'DM Mono',monospace; }
        .omni .amount-option.selected { border-color: #a37a39; color: #f1c56f; background: #302719; }
        .omni .full { width: 100%; }
        .omni .transaction-row { display: grid; grid-template-columns: 31px 1fr auto; gap: 11px; align-items: center; padding: 13px 18px; border-bottom: 1px solid #282722; }
        .omni .transaction-row:last-child { border-bottom: 0; }
        .omni .txn-icon { width: 30px; height: 30px; display: grid; place-items: center; background: #20251e; color: #97b594; border-radius: 7px; }
        .omni .txn-icon.out { color: #c5a66a; background: #29251c; }
        .omni .txn-title { font-size: 10px; font-weight: 700; }
        .omni .txn-meta { color: #79766e; font-size: 9px; margin-top: 4px; }
        .omni .txn-amount { font: 10px 'DM Mono',monospace; }
        .omni .txn-amount.in { color: #9bc19e; }
        .omni .settings-layout { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap: 14px; }
        .omni .settings-layout .wide { grid-column: 1 / -1; }
        .omni .identity { display: grid; grid-template-columns: 1fr 1fr; gap: 0 22px; }
        .omni .identity-row { display: flex; align-items: center; gap: 10px; padding: 12px 0; border-bottom: 1px solid #292822; }
        .omni .identity-row svg { color: #a38b5c; }
        .omni .identity-row div { min-width: 0; }
        .omni .identity-label { color: #77746d; font-size: 9px; margin-bottom: 4px; }
        .omni .identity-value { font-size: 10px; }
        .omni .settings-actions { margin-top: 15px; display: flex; align-items: center; gap: 9px; }
        .omni .security-note { color: #7d7a71; font-size: 9px; display: flex; align-items: center; gap: 6px; }
        .omni .telegram-banner { border: 1px solid #4f4129; background: linear-gradient(110deg,#211e17,#1a1915); border-radius: 8px; padding: 17px 19px; display: flex; align-items: center; gap: 14px; }
        .omni .telegram-mark { width: 38px; height: 38px; background: #24343a; color: #82b8c6; border-radius: 9px; display: grid; place-items: center; }
        .omni .telegram-copy { flex: 1; min-width: 0; }
        .omni .telegram-copy strong { font-size: 11px; }
        .omni .telegram-copy p { color: #8f8b81; font-size: 9px; margin: 4px 0 0; line-height: 1.5; }
        .omni .code-box { margin-top: 14px; padding: 15px; border: 1px dashed #66532f; background: #211e18; border-radius: 7px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .omni .code-label { color: #8b877d; font-size: 9px; }
        .omni .code-value { font: 17px 'DM Mono',monospace; letter-spacing: 2px; color: #ecc06b; margin-top: 5px; }
        .omni .toast { position: fixed; bottom: 22px; right: 22px; z-index: 10; background: #29271f; color: #e8e3d9; border: 1px solid #5c4c30; border-radius: 7px; padding: 12px 16px; box-shadow: 0 10px 35px #0007; font-size: 11px; display: flex; align-items: center; gap: 8px; animation: arrive .2s ease-out; }
        @keyframes arrive { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 900px) { .omni .shell { grid-template-columns: 70px minmax(0,1fr); } .omni .rail { padding: 22px 10px; } .omni .brand { justify-content: center; padding: 0 0 32px; } .omni .brand-copy,.omni .nav-label,.omni .nav-item span,.omni .nav-count,.omni .help-box,.omni .rail-user .user-copy,.omni .user-more { display: none; } .omni .nav-item { justify-content: center; padding: 0; } .omni .rail-user { justify-content: center; padding: 14px 0 0; } .omni .content { padding-left: 30px; padding-right: 30px; } }
        @media (max-width: 680px) { .omni .shell { display: block; padding-bottom: 63px; } .omni .rail { position: fixed; z-index: 8; bottom: 0; left: 0; right: 0; height: 62px; padding: 5px 8px; border: 0; border-top: 1px solid var(--line); background: #151512; display: block; } .omni .brand,.omni .nav-label,.omni .rail-spacer,.omni .help-box,.omni .rail-user { display: none; } .omni .nav-list { display: grid; grid-template-columns: repeat(4,1fr); gap: 3px; } .omni .nav-item { height: 49px; border-radius: 6px; display: flex; flex-direction: column; gap: 3px; justify-content: center; color: #858178; } .omni .nav-item span { display: block; font-size: 8px; } .omni .nav-item.active { box-shadow: inset 0 2px var(--amber); } .omni .nav-count { display: none; } .omni .content { padding: 0 17px 32px; } .omni .topbar { height: 55px; } .omni .secure { display: none; } .omni .page-head { padding: 25px 0 18px; } .omni .head-date { display: none; } .omni .tabbar { gap: 23px; } .omni .workspace { padding-top: 19px; } .omni .grid-main,.omni .lower-grid,.omni .balance-layout,.omni .settings-layout { grid-template-columns: 1fr; } .omni .settings-layout .wide { grid-column: auto; } .omni .balance-card { min-height: 210px; } .omni .reward-card { min-height: 175px; } .omni .mini-metrics { grid-template-columns: 1fr; } .omni .metric { border-right: 0; border-bottom: 1px solid var(--line); padding: 11px 14px; display: flex; align-items: center; justify-content: space-between; } .omni .metric:last-child { border-bottom: 0; } .omni .metric-value { font-size: 14px; margin: 0; } .omni .metric-caption { display: none; } .omni .quick-grid { grid-template-columns: 1fr; gap: 8px; } .omni .quick-card { min-height: 70px; display: grid; grid-template-columns: 28px 1fr; grid-template-rows: auto auto; align-items: center; column-gap: 10px; } .omni .quick-card svg { grid-row: 1 / 3; margin: 0; } .omni .order-line { grid-template-columns: 32px minmax(0,1fr) auto; gap: 9px; padding: 12px; } .omni .order-line .status { grid-column: 2; } .omni .order-line .order-total { grid-row: 1 / 3; grid-column: 3; } .omni .filter-row { align-items: stretch; flex-direction: column; } .omni .searchbox input { width: 100%; } .omni .filter-controls { display: flex; gap: 9px; } .omni .select-wrap { flex: 1; } .omni .select-wrap select { width: 100%; } .omni .order-table { min-width: 650px; } .omni .table-scroll { overflow-x: auto; } .omni .identity { grid-template-columns: 1fr; } .omni .telegram-banner { align-items: flex-start; flex-wrap: wrap; } .omni .telegram-banner .button-primary { width: 100%; } .omni .code-box { align-items: flex-start; flex-direction: column; } .omni .section-head { align-items: start; } }
      `}</style>
      <div className="grain" />
      <div className="shell">
        <aside className="rail">
          <div className="brand">
            <div className="mark"><ShoppingBag size={17} /></div>
            <div className="brand-copy"><div className="brand-name">OmniMarket</div><span className="brand-sub">Member account</span></div>
          </div>
          <p className="nav-label">Workspace</p>
          <nav className="nav-list" aria-label="Account sections">
            {([
              ["Dashboard", UserRound],
              ["Orders", Package],
              ["Balance", Wallet],
              ["Settings", Settings2],
            ] as const).map(([label, Icon]) => (
              <button key={label} className={`nav-item ${activeTab === label ? "active" : ""}`} onClick={() => nav(label)}>
                <Icon size={16} strokeWidth={1.8} /><span>{label}</span>
                {label === "Orders" && <b className="nav-count">4</b>}
              </button>
            ))}
          </nav>
          <div className="rail-spacer" />
          <div className="help-box">
            <CircleHelp size={17} color="#bda06b" />
            <strong>Need a hand?</strong>
            <p>Our team is here if you need help with an order or your account.</p>
            <button onClick={() => flash("Support details opened")}>Visit help center <ArrowRight size={11} /></button>
          </div>
          <div className="rail-user">
            <div className="avatar">MK</div>
            <div className="user-copy"><div className="user-name">marketmember</div><div className="user-email">member@example.com</div></div>
            <ChevronDown className="user-more" size={15} />
          </div>
        </aside>

        <section className="content">
          <header className="topbar">
            <div className="breadcrumbs"><span>Account</span><ChevronRight size={13} /><strong>{activeTab}</strong></div>
            <div className="top-actions">
              <button className="icon-btn" aria-label="Notifications" onClick={() => flash("You are all caught up")}><Bell size={16} /></button>
              <button className="icon-btn" aria-label="Help" onClick={() => flash("Help center opened")}><CircleHelp size={16} /></button>
              <div className="secure"><ShieldCheck size={13} /> Secure account</div>
            </div>
          </header>

          <div className="page-head">
            <div>
              <p className="eyebrow">Account overview / 01</p>
              <h1>{activeTab === "Dashboard" ? "Good afternoon, marketmember." : activeTab}</h1>
              <p className="subtitle">{activeTab === "Dashboard" ? "Your marketplace activity, all in one place." : pageSubtitle(activeTab)}</p>
            </div>
            <div className="head-date">MEMBER SINCE · OCT 2026</div>
          </div>

          <nav className="tabbar" aria-label="Account pages">
            {([
              ["Dashboard", UserRound],
              ["Orders", Package],
              ["Balance", Wallet],
              ["Settings", Settings2],
            ] as const).map(([label, Icon]) => (
              <button key={label} onClick={() => nav(label)} className={`tab ${activeTab === label ? "active" : ""}`}>
                <Icon size={14} className="tab-icon" />{label}
              </button>
            ))}
          </nav>

          <div className="workspace">
            {activeTab === "Dashboard" && (
              <>
                <div className="section-head">
                  <div><h2>Your account at a glance</h2><div className="section-note">A quick read on what’s happening with your account.</div></div>
                  <button className="text-button" onClick={() => nav("Settings")}>Account settings <ArrowRight size={13} /></button>
                </div>
                <div className="grid-main">
                  <div>
                    <div className="balance-card">
                      <div className="balance-top"><Wallet size={15} /> Available balance <span style={{ color: "#837a67", marginLeft: "auto", font: "9px 'DM Mono',monospace" }}>USD</span></div>
                      <div className="balance-amount"><small>$</small> 128.40</div>
                      <div className="balance-hint">Ready to use on your next marketplace order</div>
                      <div className="balance-foot"><span className="balance-change"><ArrowUpRight size={13} /> +$51.00 this month</span><button className="button-primary" onClick={() => nav("Balance")}><Plus size={14} /> Add funds</button></div>
                    </div>
                    <div className="mini-metrics">
                      <div className="metric"><div><div className="metric-label"><Package size={13} /> Total orders</div><div className="metric-value">12</div></div><div className="metric-caption">Since joining</div></div>
                      <div className="metric"><div><div className="metric-label"><Sparkles size={13} /> Rewards earned</div><div className="metric-value">$8.00</div></div><div className="metric-caption">From referrals</div></div>
                      <div className="metric"><div><div className="metric-label"><BadgeCheck size={13} /> Member status</div><div className="metric-value" style={{ fontSize: 15 }}>Verified</div></div><div className="metric-caption">Account protected</div></div>
                    </div>
                  </div>
                  <div className="reward-card">
                    <div className="reward-head"><div className="reward-icon"><Gift size={18} /></div><span className="reward-status">ACTIVE</span></div>
                    <div><div className="reward-value">$1.00 <span style={{ fontSize: 11, color: "#a19b8d", fontWeight: 500 }}>per referral</span></div><div className="reward-copy">Connect Telegram to receive eligible referral rewards directly in your OmniMarket balance.</div><button className="reward-link" onClick={() => { nav("Settings"); setShowTelegram(true); }}>Set up Telegram rewards <ArrowRight size={12} /></button></div>
                  </div>
                </div>

                <div className="lower-grid">
                  <section className="panel">
                    <div className="panel-head"><div><div className="panel-title">Recent orders</div><div className="panel-sub">Your latest marketplace activity</div></div><button className="text-button" onClick={() => nav("Orders")}>All orders <ArrowRight size={12} /></button></div>
                    {orders.slice(0, 3).map((order) => <OrderLine key={order.id} order={order} onClick={() => { nav("Orders"); setSelectedOrder(order.id); }} />)}
                  </section>
                  <section className="panel">
                    <div className="panel-head"><div><div className="panel-title">Account details</div><div className="panel-sub">Your profile information</div></div><button className="icon-btn" onClick={() => nav("Settings")} aria-label="Edit account"><Settings2 size={15} /></button></div>
                    <div className="profile-panel">
                      <ProfileDetail icon={<UserRound size={15} />} label="Username" value="marketmember" />
                      <ProfileDetail icon={<Mail size={15} />} label="Email address" value="member@example.com" verified />
                      <ProfileDetail icon={<Link2 size={15} />} label="Telegram" value="Not connected" />
                      <ProfileDetail icon={<Clock3 size={15} />} label="Member since" value="October 2026" />
                    </div>
                  </section>
                </div>
                <section className="quick">
                  <div className="section-head"><div><h2>Quick access</h2><div className="section-note">Common account actions, one step away.</div></div></div>
                  <div className="quick-grid">
                    <button className="quick-card" onClick={() => nav("Balance")}><CreditCard size={17} /><strong>Top up balance</strong><span>Add funds to your account</span></button>
                    <button className="quick-card" onClick={() => nav("Orders")}><Package size={17} /><strong>Track an order</strong><span>View status and order details</span></button>
                    <button className="quick-card" onClick={() => nav("Settings")}><LockKeyhole size={17} /><strong>Security settings</strong><span>Update email or password</span></button>
                  </div>
                </section>
              </>
            )}

            {activeTab === "Orders" && (
              <>
                <div className="section-head"><div><h2>Order history</h2><div className="section-note">Review purchases and delivery status.</div></div><button className="button-secondary" onClick={() => flash("Order list is up to date")}><Clock3 size={13} /> Refresh</button></div>
                <div className="filter-row">
                  <div className="filter-controls"><div className="select-wrap"><select value={orderFilter} onChange={(e) => setOrderFilter(e.target.value)} aria-label="Filter orders"><option>All orders</option><option>Delivered</option><option>Processing</option></select><ChevronDown size={13} /></div></div>
                  <label className="searchbox"><Search size={14} /><input placeholder="Search order ID or item" aria-label="Search orders" /></label>
                </div>
                <section className="panel">
                  <div className="table-scroll"><table className="order-table">
                    <thead><tr><th>Order</th><th>Item</th><th>Date</th><th>Total</th><th>Status</th><th></th></tr></thead>
                    <tbody>{orders.filter(o => orderFilter === "All orders" || o.status === orderFilter).map((order) => (
                      <tr key={order.id} onClick={() => setSelectedOrder(selectedOrder === order.id ? null : order.id)}>
                        <td className="mono">{order.id}</td><td><div className="order-name-cell"><span className="item-icon"><Package size={14} /></span>{order.item}</div></td><td style={{ color: "#98948a" }}>{order.date}</td><td className="mono" style={{ color: "#ded9ce" }}>{order.amount}</td><td><span className={`status ${order.status === "Processing" ? "processing" : ""}`}>{order.status}</span></td><td><ChevronRight size={14} color="#77746d" /></td>
                      </tr>
                    ))}</tbody>
                  </table></div>
                  {selectedOrder && <div className="order-details"><div><strong>Order {selectedOrder}</strong><p>Placed securely through OmniMarket. Your order details are available here.</p></div><button className="icon-btn" onClick={() => setSelectedOrder(null)} aria-label="Close order details"><X size={15} /></button></div>}
                  <div style={{ padding: "12px 16px", color: "#77746d", fontSize: 9, borderTop: "1px solid #2b2a26" }}>Showing {orders.filter(o => orderFilter === "All orders" || o.status === orderFilter).length} of 12 orders</div>
                </section>
              </>
            )}

            {activeTab === "Balance" && (
              <>
                <div className="section-head"><div><h2>Balance & payments</h2><div className="section-note">Manage funds and review your recent activity.</div></div></div>
                <div className="balance-layout">
                  <div>
                    <div className="balance-large">
                      <div className="balance-top"><Wallet size={15} /> Current balance</div>
                      <div className="balance-amount"><small>$</small> 128.40</div>
                      <div className="balance-hint">Your balance is available for eligible marketplace purchases.</div>
                      <div className="balance-actions"><button className="button-primary" onClick={() => flash("Choose an amount to continue")}><Plus size={14} /> Add balance</button><button className="button-secondary" onClick={() => flash("Gift card redemption is available below")}><Gift size={13} /> Redeem gift card</button></div>
                    </div>
                    <div className="panel" style={{ marginTop: 15 }}>
                      <div className="panel-head"><div><div className="panel-title">Recent transactions</div><div className="panel-sub">Activity from the last 30 days</div></div><button className="text-button" onClick={() => flash("Showing recent activity")}>View history <ArrowRight size={12} /></button></div>
                      {transactions.map((t) => <div className="transaction-row" key={t.title}><div className={`txn-icon ${t.kind === "out" ? "out" : ""}`}>{t.kind === "out" ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}</div><div><div className="txn-title">{t.title}</div><div className="txn-meta">{t.detail}</div></div><div className={`txn-amount ${t.kind}`}>{t.amount}</div></div>)}
                    </div>
                  </div>
                  <div style={{ display: "grid", alignContent: "start", gap: 14 }}>
                    <div className="form-panel">
                      <h3>Add balance</h3><p>Select an amount to add to your OmniMarket wallet.</p>
                      <div className="field"><label>Amount (USD)</label><input value={topUp} onChange={(e) => setTopUp(e.target.value)} inputMode="decimal" /></div>
                      <div className="amount-options">{["25", "50", "100", "200"].map(value => <button key={value} className={`amount-option ${topUp === value ? "selected" : ""}`} onClick={() => setTopUp(value)}>${value}</button>)}</div>
                      <button className="button-primary full" onClick={() => flash(`Top-up of $${topUp || "0"} is ready to continue`)}><CreditCard size={13} /> Continue to payment</button>
                      <div className="security-note" style={{ marginTop: 12 }}><ShieldCheck size={12} /> Secure checkout · Payment details protected</div>
                    </div>
                    <div className="form-panel">
                      <h3>Redeem a gift card</h3><p>Enter your OmniMarket gift-card code to add its value to your balance.</p>
                      <div className="field"><label>Gift-card code</label><input value={giftCode} onChange={(e) => setGiftCode(e.target.value.toUpperCase())} placeholder="OM-XXXX-XXXX" /></div>
                      <button className="button-secondary full" onClick={() => flash(giftCode ? "Gift-card code checked" : "Enter a gift-card code to continue")}><Ticket size={13} /> Redeem gift card</button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === "Settings" && (
              <>
                <div className="section-head"><div><h2>Profile & security</h2><div className="section-note">Keep your account details current and protected.</div></div><span className="secure"><ShieldCheck size={13} /> Protected</span></div>
                <div className="settings-layout">
                  <section className="panel wide">
                    <div className="panel-head"><div><div className="panel-title">Account information</div><div className="panel-sub">Details associated with your OmniMarket account</div></div></div>
                    <div className="profile-panel">
                      <div className="identity">
                        <IdentityRow icon={<UserRound size={15} />} label="Username" value="marketmember" />
                        <IdentityRow icon={<Mail size={15} />} label="Email address" value="member@example.com" />
                        <IdentityRow icon={<ShieldCheck size={15} />} label="Account ID" value="OM-098241" />
                        <IdentityRow icon={<Link2 size={15} />} label="Referred by" value="—" />
                        <IdentityRow icon={<Clock3 size={15} />} label="Member since" value="October 18, 2026" />
                      </div>
                      <div className="settings-actions"><button className="button-secondary" onClick={() => flash("Signed out of this mockup")}><LogOut size={13} /> Log out</button><span className="security-note"><ShieldCheck size={12} /> Your account stays yours.</span></div>
                    </div>
                  </section>
                  <section className="panel wide">
                    <div className="panel-head"><div><div className="panel-title">Telegram rewards</div><div className="panel-sub">Connect a Telegram account to receive eligible reward payouts.</div></div><span className="reward-status">NOT CONNECTED</span></div>
                    <div className="profile-panel">
                      <div className="telegram-banner">
                        <div className="telegram-mark"><Link2 size={18} /></div>
                        <div className="telegram-copy"><strong>Link your Telegram account</strong><p>Generate a one-time code, then send it to the OmniMarket bot to complete linking.</p></div>
                        <button className="button-primary" onClick={() => { setTelegramCode(true); setShowTelegram(true); }}><Link2 size={13} /> Generate link code</button>
                      </div>
                      {telegramCode && showTelegram && <div className="code-box"><div><div className="code-label">Your one-time code · expires in 15 minutes</div><div className="code-value">OM-7K2P-Q9D4</div></div><button className="button-secondary" onClick={() => flash("Link command copied")}><Copy size={13} /> Copy /link command</button></div>}
                      <div className="security-note" style={{ marginTop: 12 }}>In Telegram, join the OmniMarket rewards channel and send <span className="mono">/link CODE</span> to <strong style={{ color: "#d6c6a5" }}>@OmniMarketCCBot</strong>.</div>
                    </div>
                  </section>
                  <section className="panel">
                    <div className="panel-head"><div><div className="panel-title">Change email</div><div className="panel-sub">Update the address used for your account.</div></div><Mail size={15} color="#9d875e" /></div>
                    <div className="profile-panel">
                      <div className="field"><label>New email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" /></div>
                      <div className="field"><label>Confirm new email</label><input type="email" value={confirmEmail} onChange={e => setConfirmEmail(e.target.value)} placeholder="name@example.com" /></div>
                      <button className="button-secondary" onClick={() => flash(email && email === confirmEmail ? "Email change request saved" : "Please make sure both email addresses match")}><Check size={13} /> Update email</button>
                    </div>
                  </section>
                  <section className="panel">
                    <div className="panel-head"><div><div className="panel-title">Change password</div><div className="panel-sub">Choose a strong password you have not used before.</div></div><LockKeyhole size={15} color="#9d875e" /></div>
                    <div className="profile-panel">
                      <div className="field"><label>Current password</label><input type="password" placeholder="Enter current password" /></div>
                      <div className="field"><label>New password</label><input type="password" placeholder="At least 8 characters" /></div>
                      <div className="field"><label>Confirm new password</label><input type="password" placeholder="Repeat new password" /></div>
                      <button className="button-secondary" onClick={() => flash("Password update is ready to submit")}><LockKeyhole size={13} /> Update password</button>
                    </div>
                  </section>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
      {notice && <div role="status" className="toast"><Check size={14} color="#9bc19e" />{notice}</div>}
    </main>
  );
}

function pageSubtitle(tab: TabName) {
  if (tab === "Orders") return "Every purchase, with delivery status at a glance.";
  if (tab === "Balance") return "Funds in, purchases out — your money in context.";
  return "Your details, your preferences, your security.";
}

function OrderLine({ order, onClick }: { order: (typeof orders)[number]; onClick: () => void }) {
  return (
    <button className="order-line" style={{ width: "100%", background: "transparent", color: "inherit", textAlign: "left", border: 0 }} onClick={onClick}>
      <span className="item-icon"><Package size={14} /></span>
      <span style={{ minWidth: 0 }}><span className="order-name" style={{ display: "block" }}>{order.item}</span><span className="order-meta">{order.id} · {order.date}</span></span>
      <span className={`status ${order.status === "Processing" ? "processing" : ""}`}>{order.status}</span>
      <span className="order-total">{order.amount}</span>
    </button>
  );
}

function ProfileDetail({ icon, label, value, verified = false }: { icon: ReactNode; label: string; value: string; verified?: boolean }) {
  return <div className="profile-row">{icon}<div className="profile-data"><div className="profile-label">{label}</div><div className="profile-value">{value}</div></div>{verified && <span className="verified"><BadgeCheck size={12} /> Verified</span>}</div>;
}

function IdentityRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="identity-row">{icon}<div><div className="identity-label">{label}</div><div className="identity-value">{value}</div></div></div>;
}
