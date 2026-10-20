import { Link } from "wouter";

export function SpiderBrand() {
  return (
    <Link href="/auth" className="nexus-brand" aria-label="GorillaCC home">
      <img src="/gorillacc-logo-transparent.png" alt="GorillaCC" />
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
