import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useCryptoCurrencies } from "@/hooks/use-crypto-currencies";

interface CryptoPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  purpose?: "deposit" | "order";
  orderId?: number;
  onSuccess?: () => void;
}

export function CryptoPaymentModal({ open, onOpenChange, total, purpose = "deposit", orderId, onSuccess }: CryptoPaymentModalProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const currencies = useCryptoCurrencies();
  const [payCurrency, setPayCurrency] = useState("");

  useEffect(() => {
    if (currencies.data?.length && !currencies.data.includes(payCurrency)) {
      setPayCurrency(currencies.data[0]);
    }
  }, [currencies.data, payCurrency]);

  const createPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!payCurrency) throw new Error("Choose a supported cryptocurrency.");
      const res = await apiRequest("POST", "/api/payments/crypto/create", {
        amount: String(total), purpose, orderId, payCurrency,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Failed to create payment.");
      return body as { paymentId: string };
    },
    onSuccess: (data) => {
      sessionStorage.setItem("lastCryptoPaymentId", data.paymentId);
      sessionStorage.setItem("lastCryptoPurpose", purpose);
      if (onSuccess) onSuccess();
      onOpenChange(false);
      setLocation(`/crypto-payment/${encodeURIComponent(data.paymentId)}`);
    },
    onError: (error: Error) => toast({ title: "Payment Failed", description: error.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Choose cryptocurrency</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">Payment total: ${(total / 100).toFixed(2)} USD</p>
          <select
            value={payCurrency}
            onChange={event => setPayCurrency(event.target.value)}
            disabled={currencies.isLoading || currencies.isError}
            className="h-11 w-full rounded-lg border border-border bg-background px-3 text-foreground"
            data-testid="select-profile-crypto-currency"
          >
            <option value="">{currencies.isLoading ? "Loading supported currencies…" : "Select coin / network"}</option>
            {(currencies.data ?? []).map(currency => <option key={currency} value={currency}>{currency.toUpperCase()}</option>)}
          </select>
          {currencies.isError && <p className="text-sm text-destructive">{currencies.error.message}</p>}
          <Button
            className="w-full"
            disabled={!payCurrency || createPaymentMutation.isPending}
            onClick={() => createPaymentMutation.mutate()}
          >
            {createPaymentMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create payment
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
