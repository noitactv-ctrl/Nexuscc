import { useQuery } from "@tanstack/react-query";

export function useCryptoCurrencies() {
  return useQuery<string[]>({
    queryKey: ["/api/payments/crypto/currencies"],
    queryFn: async () => {
      const response = await fetch("/api/payments/crypto/currencies");
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || "Unable to load supported cryptocurrencies.");
      }
      return payload.currencies as string[];
    },
    staleTime: 5 * 60 * 1000,
  });
}
