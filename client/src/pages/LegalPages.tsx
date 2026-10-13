import { Link } from "wouter";
import { SpiderBrand, SpiderFooter } from "@/components/auth/AuthChrome";

type LegalSection = {
  heading: string;
  content: string;
};

const termsSections: LegalSection[] = [
  {
    heading: "Acceptance of Terms",
    content: "By accessing and using this service, you accept and agree to be bound by the terms and provisions of this agreement.",
  },
  {
    heading: "Use License",
    content: "Permission is granted to temporarily access the materials on our website for personal, non-commercial transitory viewing only.",
  },
  {
    heading: "User Account",
    content: "You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account.",
  },
  {
    heading: "Prohibited Uses",
    content: "You may not use our service in any way that causes, or may cause, damage to the service or impairment of the availability or accessibility of the service.",
  },
  {
    heading: "Limitation of Liability",
    content: "To the extent permitted by law, OmniMarket and its suppliers are not liable for damages arising out of the use of, or inability to use, the materials or services on this website.",
  },
  {
    heading: "Changes to Terms",
    content: "We may revise these terms of service at any time. By continuing to use this service, you agree to be bound by the version of the terms then in effect.",
  },
];

const privacySections: LegalSection[] = [
  {
    heading: "Information We Collect",
    content: "We collect information that you provide directly to us, such as when you create an account, make a purchase, or contact us for support.",
  },
  {
    heading: "How We Use Your Information",
    content: "We use the information we collect to provide, maintain, and improve our services, process transactions, protect accounts, and communicate with you.",
  },
  {
    heading: "Information Sharing",
    content: "We do not sell or rent your personal information. We may share information with service providers that help operate the site or process transactions, or when required by law.",
  },
  {
    heading: "Data Security",
    content: "We use technical and organizational measures designed to protect personal information against unauthorized access, alteration, disclosure, or destruction.",
  },
  {
    heading: "Your Rights",
    content: "You may request access to, correction of, or deletion of your personal information. You may also contact us with questions about how your information is used.",
  },
  {
    heading: "Cookies and Tracking",
    content: "We use cookies and similar technologies to keep you signed in, support site functionality, and understand activity on our service.",
  },
  {
    heading: "Changes to This Policy",
    content: "We may update this Privacy Policy from time to time. Any changes will be posted on this page with an updated revision date.",
  },
];

export function LegalPage({ kind }: { kind: "terms" | "privacy" }) {
  const isTerms = kind === "terms";
  const title = isTerms ? "Terms of Service" : "Privacy Policy";
  const sections = isTerms ? termsSections : privacySections;

  return (
    <main className="spider-legal-page">
      <div className="spider-legal-shell">
        <SpiderBrand />
        <header className="spider-legal-heading">
          <h1>{title}</h1>
          <p>Last updated: 10/2/2026</p>
        </header>

        <div className="spider-legal-sections">
          {sections.map((section, index) => (
            <section key={section.heading}>
              <h2>{index + 1}. {section.heading}</h2>
              <p>{section.content}</p>
            </section>
          ))}
        </div>

        <div className="spider-legal-actions">
          <Link href="/auth?mode=register" className="spider-primary-button">
            Back to Register
          </Link>
          <Link href="/auth" className="spider-secondary-button">
            Back to Login
          </Link>
        </div>
        <SpiderFooter className="spider-legal-footer" />
      </div>
    </main>
  );
}
