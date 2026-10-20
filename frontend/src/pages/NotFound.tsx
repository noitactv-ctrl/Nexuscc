import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md mx-4 border-destructive/50 bg-destructive/5">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2 text-destructive font-bold text-xl items-center">
            <AlertCircle className="h-8 w-8" />
            404 Page Not Found
          </div>
          <p className="mt-4 text-muted-foreground mb-6">
            The page you are looking for does not exist.
          </p>
          <Link href="/">
            <Button variant="outline" className="w-full border-destructive/20 hover:bg-destructive/10 text-destructive">
              Return Home
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
