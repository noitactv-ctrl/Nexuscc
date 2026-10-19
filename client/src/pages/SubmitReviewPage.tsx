import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Upload } from "lucide-react";

type EligiblePurchase = { orderItemId: number; itemType: string; title: string; sellerName: string; hasReview: boolean };

export default function SubmitReviewPage() {
  const { toast } = useToast();
  const [purchaseId, setPurchaseId] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const { data: eligible = [], isLoading } = useQuery<EligiblePurchase[]>({ queryKey: ["/api/reviews/eligible"] });
  const submit = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Choose a photo to upload.");
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Could not read the photo."));
        reader.readAsDataURL(file);
      });
      const upload = await apiRequest("POST", "/api/reviews/upload", { data });
      const { imageId } = await upload.json();
      const response = await apiRequest("POST", "/api/reviews", { orderItemId: Number(purchaseId), content, imageId });
      return response.json();
    },
    onSuccess: () => {
      setContent(""); setFile(null); setPurchaseId("");
      queryClient.invalidateQueries({ queryKey: ["/api/reviews/eligible"] });
      toast({ title: "Review submitted", description: "Your review is waiting for admin approval." });
    },
    onError: (error: Error) => toast({ title: "Could not submit review", description: error.message, variant: "destructive" }),
  });
  return <main className="mx-auto max-w-3xl space-y-7 px-4 py-8 text-foreground">
    <header><Button variant="ghost" size="sm" asChild><Link href="/reviews"><ArrowLeft className="mr-2 h-4 w-4" />Approved Reviews</Link></Button><p className="mt-4 text-xs font-bold uppercase tracking-[.25em] text-primary">Community</p><h1 className="mt-2 text-3xl font-black">Submit a Review</h1><p className="mt-2 text-sm text-muted-foreground">Choose a completed purchase, add a photo, and share feedback about the product and seller. Reviews are public after admin approval.</p></header>
    <Card><CardHeader><CardTitle>Your purchase</CardTitle></CardHeader><CardContent className="space-y-4">
      <select aria-label="Purchased product" value={purchaseId} onChange={e => setPurchaseId(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
        <option value="">{isLoading ? "Loading purchases…" : "Choose an eligible purchase"}</option>
        {eligible.filter(item => !item.hasReview).map(item => <option key={item.orderItemId} value={item.orderItemId}>{item.title} · Seller: {item.sellerName}</option>)}
      </select>
      <Textarea value={content} maxLength={2000} onChange={e => setContent(e.target.value)} placeholder="Tell other shoppers about the product and seller (up to 2,000 characters)" className="min-h-32" />
      <div className="flex flex-wrap items-center gap-3"><Input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => setFile(e.target.files?.[0] ?? null)} className="max-w-sm" /><span className="text-xs text-muted-foreground">PNG, JPEG, or WebP; up to 4 MB</span></div>
      <Button disabled={!purchaseId || !content.trim() || !file || submit.isPending} onClick={() => submit.mutate()}><Upload className="mr-2 h-4 w-4" />{submit.isPending ? "Submitting…" : "Submit review"}</Button>
      {!isLoading && eligible.filter(item => !item.hasReview).length === 0 && <p className="text-sm text-muted-foreground">No eligible purchases available to review.</p>}
    </CardContent></Card>
  </main>;
}
