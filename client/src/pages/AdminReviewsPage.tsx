import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminReviewsPage() {
  const { toast } = useToast();
  const { data: reviews = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/admin/reviews"] });
  const moderate = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: "approved" | "denied" }) => {
      const response = await apiRequest("PATCH", `/api/admin/reviews/${id}`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
    },
    onError: (error: Error) => toast({ title: "Could not update review", description: error.message, variant: "destructive" }),
  });
  return <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 text-foreground">
    <header><p className="text-xs font-bold uppercase tracking-[.25em] text-primary">Admin</p><h1 className="mt-2 text-3xl font-black">Review moderation</h1><p className="mt-2 text-sm text-muted-foreground">Approve reviews for public display or deny them.</p></header>
    {isLoading ? <p>Loading reviews…</p> : reviews.length === 0 ? <p className="text-sm text-muted-foreground">No submitted reviews.</p> : <div className="space-y-4">{reviews.map(review => <Card key={review.id}><CardContent className="grid gap-4 p-4 sm:grid-cols-[180px_1fr]">
      <img src={`/api/images/${review.image_id}`} alt={`Review photo: ${review.title}`} className="aspect-video w-full rounded-md object-cover sm:aspect-square" />
      <div className="space-y-2"><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold">{review.title}</h2><span className="rounded-full bg-muted px-2 py-1 text-xs uppercase">{review.status}</span></div><p className="text-xs text-muted-foreground">By {review.username} · Seller: {review.seller_name} · {review.item_type}</p><p className="whitespace-pre-wrap text-sm">{review.content}</p>
        {review.status === "pending" && <div className="flex gap-2 pt-2"><Button disabled={moderate.isPending} onClick={() => moderate.mutate({ id: review.id, status: "approved" })}>Approve</Button><Button variant="destructive" disabled={moderate.isPending} onClick={() => moderate.mutate({ id: review.id, status: "denied" })}>Deny</Button></div>}
      </div>
    </CardContent></Card>)}</div>}
  </main>;
}
