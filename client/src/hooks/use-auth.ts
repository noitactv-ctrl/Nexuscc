import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";

async function getResponseMessage(res: Response, fallback: string) {
  const body = await res.text();
  if (!body) return `${fallback} (${res.status})`;
  try {
    const parsed = JSON.parse(body);
    if (typeof parsed?.message === "string" && parsed.message.trim()) return parsed.message;
  } catch {
    // Vercel may return an HTML error page before the request reaches Express.
  }
  return `${fallback} (${res.status})`;
}

export function useAuth() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const {
    data: user,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: [api.auth.me.path],
    queryFn: async ({ signal }) => {
      const controller = new AbortController();
      const abortFromQuery = () => controller.abort();
      signal?.addEventListener("abort", abortFromQuery, { once: true });
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const res = await fetch(api.auth.me.path, {
          signal: controller.signal,
          credentials: "include",
        });
        if (res.status === 401) return null;
        if (!res.ok) throw new Error("Failed to fetch user");
        return api.auth.me.responses[200].parse(await res.json());
      } finally {
        clearTimeout(timeout);
        signal?.removeEventListener("abort", abortFromQuery);
      }
    },
    retry: false,
    // Always re-fetch the current user on mount so role/ban changes
    // take effect without requiring a full logout/login cycle.
    staleTime: 0,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string; rememberMe?: boolean }) => {
      const res = await fetch(api.auth.login.path, {
        method: api.auth.login.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(await getResponseMessage(res, "Login failed"));
      }
      return res.json() as Promise<User>;
    },
    onSuccess: (data) => {
      queryClient.setQueryData([api.auth.me.path], data);
      toast({ title: "Welcome back!" });
    },
    onError: (error: Error) => {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: { email: string; password: string; agreedToTerms: true }) => {
      const res = await fetch(api.auth.register.path, {
        method: api.auth.register.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(await getResponseMessage(res, "Registration failed"));
      }
      return res.json() as Promise<User>;
    },
    onSuccess: (data) => {
      queryClient.setQueryData([api.auth.me.path], data);
    },
    onError: (error: Error) => {
      toast({ title: "Registration failed", description: error.message, variant: "destructive" });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(api.auth.logout.path, {
        method: api.auth.logout.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error(await getResponseMessage(res, "Logout failed"));
    },
    onSuccess: () => {
      queryClient.setQueryData([api.auth.me.path], null);
      queryClient.clear();
      toast({ title: "Logged out" });
    },
  });

  return {
    user,
    isLoading,
    isError,
    retryAuth: refetch,
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
  };
}
