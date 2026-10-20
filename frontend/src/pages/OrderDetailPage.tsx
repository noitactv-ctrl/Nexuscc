import { useRoute, useLocation } from "wouter";
import { useOrder } from "@/hooks/use-orders";
import { useEffect } from "react";

export default function OrderDetailPage() {
  const [, params] = useRoute("/order/:id");
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    // Redirect to profile with the order ID to trigger the slide-in
    if (params?.id) {
      setLocation(`/profile?order=${params.id}`);
    } else {
      setLocation("/profile");
    }
  }, [params?.id, setLocation]);

  return null;
}
