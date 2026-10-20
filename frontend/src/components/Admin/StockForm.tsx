import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdminStock, useProducts } from "@/hooks/use-products";
import { Loader2 } from "lucide-react";

const schema = z.object({
  productId: z.string().min(1, "Select a product"),
  variantId: z.string().min(1, "Select a variant"),
  rawContent: z.string().min(1, "Enter content"),
});

export function StockForm() {
  const { data: products } = useProducts();
  const { mutate: addStock, isPending } = useAdminStock();
  
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      productId: "",
      variantId: "",
      rawContent: "",
    },
  });

  const selectedProductId = form.watch("productId");
  const selectedProduct = products?.find(p => p.id.toString() === selectedProductId);

  function onSubmit(data: z.infer<typeof schema>) {
    addStock({
      variantId: parseInt(data.variantId),
      rawContent: data.rawContent,
    }, {
      onSuccess: () => form.reset({ ...data, rawContent: "" })
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 bg-card/50 p-6 rounded-lg border border-border">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="productId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Product</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {products?.map(p => (
                      <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="variantId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Variant</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!selectedProductId}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select variant" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {selectedProduct?.variants.map(v => (
                      <SelectItem key={v.id} value={v.id.toString()}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="rawContent"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Stock Content</FormLabel>
              <FormControl>
                <Textarea 
                  {...field} 
                  rows={8} 
                  placeholder={`Format:\nUser:pass:token\nUser2:pass2:token2\n\n(3 lines automatically grouped as 1 item if configured)`} 
                  className="font-mono text-sm"
                />
              </FormControl>
              <FormDescription>Paste bulk items here. The system will process them automatically.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Add Stock
        </Button>
      </form>
    </Form>
  );
}
