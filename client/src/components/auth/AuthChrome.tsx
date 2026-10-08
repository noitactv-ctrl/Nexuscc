import { Link } from "wouter";

export function SpiderBrand() {
  return (
    <Link href="/auth" className="spider-brand" aria-label="SpiderCC home">
      <img src="/spidercc-logo.png" alt="spidercc.at" />
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
