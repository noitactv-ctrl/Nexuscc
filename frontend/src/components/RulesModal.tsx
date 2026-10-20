import { useState } from "react";
import { X, ShieldAlert } from "lucide-react";

export const RULES = [
  {
    title: "NO SHARING OF ACCOUNT",
    body: "3 DIFFERENT IPs LOGGED IN WILL RESULT IN AN IMMEDIATE TERMINATION. Your account is for your use only.",
  },
  {
    title: "DON'T FAKE OWNING A CHANNEL",
    body: "Do not submit a Telegram channel that is not yours. Fraud will result in permanent termination.",
  },
  {
    title: "ALWAYS UPDATE YOUR TELEGRAM NAME",
    body: "If you change your Telegram username, update it in your account Settings immediately.",
  },
  {
    title: "DON'T TEXT ADMIN TO CHECK YOUR ORDER",
    body: "Orders are delivered within 4 hours. Do not contact admin to check your order status.",
  },
];

export function RulesButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-sm font-bold text-primary hover:text-primary/80 transition-colors uppercase tracking-wider"
      >
        Rules
      </button>
      {open && <RulesModal onClose={() => setOpen(false)} />}
    </>
  );
}

export function RulesLink({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-primary underline underline-offset-2 font-bold hover:text-primary/80 transition-colors">
      RULES
    </button>
  );
}

export function RulesModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-[#111] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            <h2 className="font-semibold text-lg text-foreground">Store Rules</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/5 text-muted-foreground hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {RULES.map((rule, i) => (
            <div key={i} className="bg-white/[0.03] border border-white/10 rounded-xl p-4 space-y-1.5">
              <p className="text-xs font-black text-primary uppercase tracking-widest">{String(i + 1).padStart(2, "0")}. {rule.title}</p>
              <p className="text-sm text-white/70 leading-relaxed">{rule.body}</p>
            </div>
          ))}
          <p className="text-[10px] text-muted-foreground text-center pt-2">
            Violation of any rule may result in immediate termination without refund.
          </p>
        </div>
      </div>
    </div>
  );
}
