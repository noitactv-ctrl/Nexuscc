import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import type { InsertAnnouncement } from "@shared/schema";

export function useAdmin() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const dashboard = useQuery({
    queryKey: [api.admin.dashboard.path],
    queryFn: async () => {
      const res = await fetch(api.admin.dashboard.path);
      if (!res.ok) throw new Error("Failed to fetch dashboard");
      return api.admin.dashboard.responses[200].parse(await res.json());
    },
  });

  const generateCodes = useMutation({
    mutationFn: async (data: { amount: number; count: number }) => {
      const res = await fetch(api.admin.generateCodes.path, {
        method: api.admin.generateCodes.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to generate codes");
      return api.admin.generateCodes.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      toast({ title: "Codes Generated", description: `${data.codes.length} codes created.` });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateAnnouncement = useMutation({
    mutationFn: async (data: InsertAnnouncement) => {
      const res = await fetch(api.admin.announcements.create.path, {
        method: api.admin.announcements.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update announcement");
      return api.admin.announcements.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      toast({ title: "Announcement updated" });
    },
  });

  return { dashboard, generateCodes, updateAnnouncement };
}
