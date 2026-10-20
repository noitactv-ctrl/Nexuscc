import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "./use-cart";
import { z } from "zod";

export function useOrders() {
  return useQuery({
    queryKey: [api.orders.list.path],
    queryFn: async () => {
      const res = await fetch(api.orders.list.path);
      if (!res.ok) throw new Error("Failed to fetch orders");
      return api.orders.list.responses[200].parse(await res.json());
    },
  });
}

export function useOrder(id: number) {
  return useQuery({
    queryKey: [api.orders.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.orders.get.path, { id });
      const res = await fetch(url);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch order");
      return api.orders.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { clearCart } = useCart();

  return useMutation({
    mutationFn: async (items: { variantId: number; quantity: number; cardId?: number }[]) => {
      const res = await fetch(api.orders.create.path, {
        method: api.orders.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, cardIds: items.filter(i => i.cardId).map(i => i.cardId) }),
      });

      if (!res.ok) {
        if (res.status === 400) {
           const err = await res.json();
           throw new Error(err.message || "Order failed");
        }
        throw new Error("Failed to create order");
      }
      return api.orders.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.orders.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.auth.me.path] }); // Balance update
      clearCart();
      toast({ title: "Order placed!", description: "Check your orders page for details." });
    },
    onError: (err) => {
      toast({ title: "Order failed", description: err.message, variant: "destructive" });
    },
  });
}
