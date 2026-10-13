import { Link } from "wouter";
import { CreditCard } from "lucide-react";

export function SpiderBrand() {
  return (
    <Link href="/auth" className="nexus-brand" aria-label="OmniMarket home">
      <CreditCard aria-hidden="true" />
      <span>OmniMarket</span>
    </Link>
  );
}

export function SpiderFooter({ className = "" }: { className?: string }) {
  return (
    <footer className={`spider-footer ${className}`}>
      <Link href="/privacy">Privacy Policy</Link>
      <span aria-hidden="true">•</span>
      <Link href="/terms">Terms of Service</Link>
    </footer>
  );
}
