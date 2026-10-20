import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquarePlus } from "lucide-react";

export default function ReviewsPage() {
  const { data: reviews = [], isLoading, isError } = useQuery<any[]>({ queryKey: ["/api/reviews"] });
  return <main className="mx-auto max-w-5xl space-y-7 px-4 py-8 text-foreground">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-xs font-bold uppercase tracking-[.25em] text-primary">Community</p><h1 className="mt-2 text-3xl font-black">Approved Reviews</h1><p className="mt-2 text-sm text-muted-foreground">Photos and feedback from customers about their purchases and sellers.</p></div>
      <Button asChild><Link href="/reviews/submit"><MessageSquarePlus className="mr-2 h-4 w-4" />Submit a Review</Link></Button>
    </header>
    {isLoading ? <p className="text-sm text-muted-foreground">Loading reviews…</p> : isError ? <p className="text-sm text-destructive">Could not load reviews right now.</p> : reviews.length === 0 ? <p className="text-sm text-muted-foreground">No approved reviews yet.</p> : <div className="grid gap-4 sm:grid-cols-2">{reviews.map(review => <Card key={review.id} className="overflow-hidden"><img src={`/api/images/${review.imageId}`} alt={`Review of ${review.title}`} className="aspect-video w-full object-cover" loading="lazy" /><CardContent className="space-y-2 p-4"><h2 className="font-semibold">{review.title}</h2><p className="text-xs text-muted-foreground">Seller: {review.sellerName} · {review.username}</p><p className="whitespace-pre-wrap text-sm">{review.content}</p></CardContent></Card>)}</div>}
  </main>;
}
