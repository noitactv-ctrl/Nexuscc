import { useState } from "react";
import { AlertTriangle, ChevronRight, X, CheckSquare, Square, Loader2, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useVerification, useSubmitVerification } from "@/hooks/use-verification";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { RulesModal, RulesLink } from "@/components/RulesModal";
const TERMS = `By purchasing from this store, you automatically agree to the following terms:

1. Channel Promotion
Resellers must provide their Telegram channel name and link when ordering. You agree that your channel name may be mentioned or promoted in our channel.

2. No Account Sharing
Your account is for personal use only. Sharing your account with others is strictly prohibited and will result in immediate termination without refund.

3. Reseller Purpose
Products are sold at low reseller pricing so buyers can resell them in their own channels or stores.

4. Responsibility
You are responsible for how you resell the products and managing your own customers.

5. Agreement
By using this store or purchasing any product, you confirm that you accept and agree to these terms and all RULES.`;

export function VerificationBanner() {
  const { user, isLoading: isUserLoading } = useAuth();
  const { verification, isLoading, isApproved, isDenied, isPending, isTermed } = useVerification(!!user && !isUserLoading);
  const [showForm, setShowForm] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [telegramUsername, setTelegramUsername] = useState("");
  const [channelLink, setChannelLink] = useState("");
  const [channelName, setChannelName] = useState("");
  const { toast } = useToast();
  const submitMutation = useSubmitVerification();

  if (isUserLoading || isLoading) return null;
  if (user?.role === "admin") return null;
  if (isApproved) return null;

  const handleSubmit = async () => {
    if (!agreed) {
      toast({ title: "Required", description: "You must agree to the terms", variant: "destructive" });
      return;
    }
    if (!telegramUsername || !channelLink || !channelName) {
      toast({ title: "Required", description: "Please fill in all fields", variant: "destructive" });
      return;
    }
    try {
      await submitMutation.mutateAsync({ telegramUsername, channelLink, channelName, agreedToTerms: true });
      setShowForm(false);
      toast({ title: "Application submitted!", description: "Wait for admin approval" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  if (isTermed) {
    return (
      <div className="w-full bg-destructive/10 border-b-2 border-destructive text-foreground px-4 py-4 space-y-2">
        <div className="flex items-center gap-3">
          <ShieldX className="h-6 w-6 text-destructive shrink-0" />
          <div>
            <p className="font-black text-sm uppercase tracking-wide text-destructive">YOU ARE TERMED</p>
            {verification?.termMessage && (
              <p className="text-xs text-white/70 mt-0.5">{verification.termMessage}</p>
            )}
          </div>
        </div>
        <p className="text-[10px] text-white/40 pl-9">Your account has been terminated. You may reapply but approval is not guaranteed.</p>
        <div className="pl-9">
          <Button
            size="sm"
            variant="outline"
            className="border-white/20 text-foreground hover:bg-white/10 text-xs h-7"
            onClick={() => setShowForm(true)}
          >
            Reapply
          </Button>
        </div>
      </div>
    );
  }

  if (isDenied) {
    return (
      <div className="w-full bg-destructive/90 border-b border-destructive text-white px-4 py-3 flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 shrink-0" />
        <div className="flex-1">
          <p className="font-bold text-sm uppercase tracking-wide">Verification Denied</p>
          <p className="text-xs text-white/80">Your application was denied{verification?.adminNote ? `: ${verification.adminNote}` : ""}. You may reapply.</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="border-white/30 text-white hover:bg-white/10 text-xs h-7"
          onClick={() => setShowForm(true)}
        >
          Reapply
        </Button>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="w-full bg-yellow-600/90 border-b border-yellow-500 text-white px-4 py-3 flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 shrink-0" />
        <div className="flex-1">
          <p className="font-bold text-sm uppercase tracking-wide">Verification Pending</p>
          <p className="text-xs text-white/80">Your application is being reviewed by an admin. Purchasing is locked until approved.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className="w-full bg-destructive/90 border-b border-destructive text-white px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-destructive transition-colors"
        onClick={() => setShowForm(true)}
      >
        <AlertTriangle className="h-5 w-5 shrink-0" />
        <div className="flex-1">
          <p className="font-bold text-sm uppercase tracking-wide">VERIFY NOW</p>
          <p className="text-xs text-white/80">You need to verify before you can purchase products.</p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0" />
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[#111] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <h2 className="font-semibold text-lg text-foreground">Account Verification</h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-white/5 text-muted-foreground hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Terms of Service</p>
                <pre className="text-xs text-white/70 leading-relaxed whitespace-pre-wrap font-sans">{TERMS}</pre>
                <div className="mt-3 pt-3 border-t border-white/10 text-xs text-white/60">
                  You agree to follow all{" "}
                  <RulesLink onClick={() => setShowRules(true)} />
                  {" "}of this store.
                </div>
              </div>

              <button
                onClick={() => setAgreed(!agreed)}
                className="flex items-start gap-3 w-full text-left group"
              >
                <div className="mt-0.5 shrink-0">
                  {agreed
                    ? <CheckSquare className="h-5 w-5 text-primary" />
                    : <Square className="h-5 w-5 text-muted-foreground group-hover:text-white transition-colors" />
                  }
                </div>
                <p className="text-sm text-white/80 group-hover:text-white transition-colors">
                  I have read and agree to the Terms of Service and all Rules above
                </p>
              </button>

              <div className="space-y-3 border-t border-white/10 pt-4">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Your Information</p>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5">Your Telegram @username</label>
                  <Input
                    placeholder="@yourusername"
                    value={telegramUsername}
                    onChange={e => setTelegramUsername(e.target.value)}
                    className="bg-black/50 border-white/10"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5">Your Telegram channel link</label>
                  <Input
                    placeholder="https://t.me/+uh_mmVGlIZFjM2Ux"
                    value={channelLink}
                    onChange={e => setChannelLink(e.target.value)}
                    className="bg-black/50 border-white/10"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5">Name of your channel</label>
                  <Input
                    placeholder="My Resell Channel"
                    value={channelName}
                    onChange={e => setChannelName(e.target.value)}
                    className="bg-black/50 border-white/10"
                  />
                </div>
              </div>

              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={submitMutation.isPending || !agreed}
              >
                {submitMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Application
              </Button>
            </div>
          </div>
        </div>
      )}

      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
    </>
  );
}
