import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Copy, Check, ShieldCheck, AlertTriangle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function MyCodePage() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    if (!user?.loginCode) return;
    navigator.clipboard.writeText(user.loginCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Login code copied!" });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#111]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111] p-4">
      <div className="max-w-sm mx-auto py-10 space-y-6">

        <div className="text-center space-y-2">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 border border-primary/20 mx-auto">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-white">Your Login Code</h1>
          <p className="text-xs text-white/40">This is the only way to sign into your account</p>
        </div>

        <div className="bg-[#0d0d0d] border border-white/10 rounded-xl p-6 space-y-5">
          <div className="bg-black/70 border-2 border-primary/30 rounded-xl p-5 text-center space-y-3">
            <p className="text-[10px] uppercase tracking-widest text-white/40">Login Code</p>
            <p
              className="font-mono text-2xl font-black text-white tracking-[0.25em] select-all cursor-text"
              data-testid="text-login-code"
            >
              {user?.loginCode ?? "—"}
            </p>
            <button
              onClick={copyCode}
              className="flex items-center gap-1.5 mx-auto text-xs text-primary hover:text-primary/80 transition-colors"
              data-testid="btn-copy-login-code"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied!" : "Copy code"}
            </button>
          </div>

          <div className="flex items-start gap-2.5 bg-yellow-950/40 border border-yellow-600/30 rounded-lg p-3">
            <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-yellow-400">Keep this code safe!</p>
              <p className="text-[11px] text-yellow-400/70 leading-relaxed">
                This is the <span className="font-bold">only way</span> to log in. There is no password reset. Losing this code means losing access permanently.
              </p>
            </div>
          </div>

          <p className="text-[10px] text-white/30 text-center leading-relaxed">
            Save it in a password manager, screenshot it, or write it down somewhere safe.
          </p>
        </div>
      </div>
    </div>
  );
}
