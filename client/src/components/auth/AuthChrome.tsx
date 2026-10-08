import { Link } from "wouter";

export function SpiderBrand() {
  return (
    <Link href="/auth">
      <a className="spider-brand" aria-label="SpiderCC home">
        <img src="/spidercc-logo.png" alt="spidercc.at" />
      </a>
    </Link>
  );
}

export function SpiderFooter({ className = "" }: { className?: string }) {
  return (
    <footer className={`spider-footer ${className}`}>
      <Link href="/privacy"><a>Privacy Policy</a></Link>
      <span aria-hidden="true">•</span>
      <Link href="/terms"><a>Terms of Service</a></Link>
    </footer>
  );
}
