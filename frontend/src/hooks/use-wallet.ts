import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useWallet() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const transactions = useQuery({
    queryKey: [api.wallet.transactions.path],
    queryFn: async () => {
      const res = await fetch(api.wallet.transactions.path);
      if (!res.ok) throw new Error("Failed to fetch transactions");
      return api.wallet.transactions.responses[200].parse(await res.json());
    },
  });

  const redeemCode = useMutation({
    mutationFn: async (code: string) => {
      const res = await fetch(api.wallet.redeem.path, {
        method: api.wallet.redeem.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Redemption failed");
      }
      return api.wallet.redeem.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.auth.me.path] });
      queryClient.invalidateQueries({ queryKey: [api.wallet.transactions.path] });
      toast({ title: "Redeemed!", description: `Added $${(data.amountAdded / 100).toFixed(2)} to your wallet.` });
    },
    onError: (err) => {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    },
  });

  return { transactions, redeemCode };
}
