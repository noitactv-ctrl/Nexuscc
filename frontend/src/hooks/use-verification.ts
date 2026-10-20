import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function useVerification(enabled = true) {
  const { data: verification, isLoading } = useQuery({
    queryKey: ["/api/verification/me"],
    queryFn: async () => {
      const res = await fetch("/api/verification/me");
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
    enabled,
    staleTime: 15000,
  });

  const isApproved = verification?.status === "approved";
  const isDenied = verification?.status === "denied";
  const isPending = verification?.status === "pending";
  const isTermed = verification?.status === "termed";
  const hasApplied = !!verification;

  return { verification, isLoading: enabled ? isLoading : true, isApproved, isDenied, isPending, isTermed, hasApplied };
}

export function useSubmitVerification() {
  return useMutation({
    mutationFn: async (data: {
      telegramUsername: string;
      channelLink: string;
      channelName: string;
      agreedToTerms: boolean;
    }) => {
      const res = await apiRequest("POST", "/api/verification/submit", data);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to submit");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/verification/me"] });
    },
  });
}
