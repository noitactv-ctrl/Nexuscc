import { useProducts } from "@/hooks/use-products";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ShieldX, Search, FileText, ChevronLeft, ChevronRight, ArrowUpRight } from "lucide-react";
import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";

const COUNTRY_OPTIONS = [
  { code: "US", label: "USA", flag: "🇺🇸", match: /\b(?:US|USA|UNITED STATES)\b/i },
  { code: "GB", label: "UK", flag: "🇬🇧", match: /\b(?:UK|GB|GREAT BRITAIN|UNITED KINGDOM)\b/i },
  { code: "CA", label: "CA", flag: "🇨🇦", match: /\b(?:CA|CANADA)\b/i },
  { code: "AU", label: "AUS", flag: "🇦🇺", match: /\b(?:AU|AUS|AUSTRALIA)\b/i },
] as const;

function getProductCountry(product: any) {
  const searchable = [
    product.name,
    product.description,
    ...(product.variants ?? []).map((variant: any) => variant.name),
  ].join(" ");
  return COUNTRY_OPTIONS.find((country) => country.match.test(searchable));
}

function LogProductCard({ product }: { product: any }) {
  const lowestVariant = product.variants?.length
    ? product.variants.reduce((lowest: any, variant: any) => lowest.price < variant.price ? lowest : variant)
    : null;
  const lowestPrice = lowestVariant?.price ?? 0;
  const country = getProductCountry(product);

  return (
    <Link href={`/product/${encodeURIComponent(product.name)}`}>
      <div
        className="group h-full cursor-pointer overflow-hidden rounded-2xl border border-white/15 bg-[#252525] p-2.5 transition-all hover:border-white/30 hover:bg-[#2b2b2b] active:scale-[0.99]"
        data-testid={`card-log-product-${product.id}`}
      >
        <div
          className="relative flex aspect-[16/9] w-full items-center justify-center overflow-hidden rounded-xl bg-black"
        >
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              onError={(event) => { (event.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <FileText className="h-10 w-10 text-white/20" aria-hidden="true" />
          )}
        </div>
        <div className="space-y-3 px-1 pb-1 pt-3">
          <p className="line-clamp-2 min-h-6 text-center text-base font-bold tracking-wide text-white">{product.name}</p>
          <div className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#999] px-3 text-center text-sm font-bold tracking-wide text-white transition-colors group-hover:bg-[#b0b0b0]">
            {country && <span aria-label={country.label}>{country.flag}</span>}
            <span>Purchase</span>
            <span aria-hidden="true">|</span>
            <span>{lowestPrice > 0 ? `$${(lowestPrice / 100).toFixed(2)}` : "Free"}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function LogsPage() {
  const { user } = useAuth();
  const { data: products, isLoading, isError } = useProducts();
  const { data: features } = useQuery<{ logs: boolean }>({
    queryKey: ["/api/settings/features"],
  });
  const [search, setSearch] = useState("");
  const [activeCountry, setActiveCountry] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 8;
  const countryOptions = useMemo(() => {
    const available = new Set((products ?? []).map((product: any) => getProductCountry(product)?.code));
    return COUNTRY_OPTIONS.filter((country) => available.has(country.code));
  }, [products]);

  const filteredProducts = useMemo(() => {
    let result = products ?? [];
    if (activeCountry !== "all") {
      result = result.filter((product: any) => getProductCountry(product)?.code === activeCountry);
    }
    const query = search.trim().toLowerCase();
    if (!query) return result;
    return result.filter((product: any) =>
      product.name.toLowerCase().includes(query) ||
      product.description?.toLowerCase().includes(query) ||
      product.variants?.some((variant: any) => variant.name.toLowerCase().includes(query)) ||
      getProductCountry(product)?.label.toLowerCase().includes(query),
    );
  }, [products, activeCountry, search]);
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const visibleProducts = filteredProducts.slice((page - 1) * pageSize, page * pageSize);

  const changeSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const changeCountry = (value: string) => {
    setActiveCountry(value);
    setPage(1);
  };

  if (isLoading) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-white/30" /></div>;
  }

  if (isError) {
    return <div className="flex h-[50vh] items-center justify-center text-sm text-red-400">Failed to load logs. Please refresh.</div>;
  }

  if (features?.logs === false) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <FileText className="mx-auto h-9 w-9 text-white/25" />
        <p className="mt-3 text-sm font-bold text-white/70">Logs are currently unavailable</p>
        <p className="mt-1 text-xs text-white/40">Please check back later.</p>
      </div>
    );
  }

  if (user?.isBanned) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <div className="space-y-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center">
          <ShieldX className="mx-auto h-8 w-8 text-red-400" />
          <p className="text-sm font-bold text-red-400">Account Restricted</p>
          <p className="text-xs leading-relaxed text-white/40">Your account has been restricted. Contact support if you believe this is an error.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-12 pt-5 sm:px-6">
      <section
        className="relative mb-7 overflow-hidden rounded-2xl border border-white/10 bg-[#101114] px-6 py-8 sm:px-9 sm:py-10"
        style={{
          backgroundImage:
            "radial-gradient(circle at 82% 24%, rgba(68, 122, 255, .18), transparent 25%), radial-gradient(circle at 14% 80%, rgba(40, 95, 220, .12), transparent 34%), linear-gradient(125deg, #0a0b0d, #17191e 58%, #090a0c)",
        }}
      >
        <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden="true">
          <div className="absolute inset-0 bg-[radial-gradient(1px_1px_at_12%_20%,white_50%,transparent),radial-gradient(1px_1px_at_80%_36%,white_50%,transparent),radial-gradient(1px_1px_at_62%_82%,white_50%,transparent),radial-gradient(1px_1px_at_34%_66%,white_50%,transparent)]" />
        </div>
        <div className="relative max-w-xl">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.28em] text-red-300">OmniMarket</p>
          <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">Logs shop</h1>
          <p className="mt-2 text-sm text-white/65 sm:text-base">Browse available log packages from the current inventory.</p>
          <a
            href="#log-products"
            className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground transition hover:brightness-110"
          >
            <FileText className="h-4 w-4" aria-hidden="true" />
            Browse logs
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </section>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/45" aria-hidden="true" />
        <input
          type="search"
          placeholder="Search for a product"
          value={search}
          onChange={(event) => changeSearch(event.target.value)}
          className="h-14 w-full rounded-xl border border-white/15 bg-[#111] pl-12 pr-4 text-base text-white outline-none transition placeholder:text-white/45 focus:border-primary/70"
          data-testid="input-search-logs"
          aria-label="Search logs"
        />
      </div>

      <div className="mb-8 flex flex-wrap justify-center gap-x-5 gap-y-4 sm:gap-x-9" aria-label="Filter logs by country">
        <button
          type="button"
          onClick={() => changeCountry("all")}
          className={`flex min-w-[76px] flex-col items-center gap-1.5 rounded-xl px-3 py-2 transition ${activeCountry === "all" ? "text-primary" : "text-white hover:bg-white/5"}`}
          aria-pressed={activeCountry === "all"}
        >
          <span className="text-4xl leading-none" aria-hidden="true">🌐</span>
          <span className="text-sm font-bold">All</span>
        </button>
        {countryOptions.map((country) => (
          <button
            key={country.code}
            type="button"
            onClick={() => changeCountry(country.code)}
            className={`flex min-w-[76px] flex-col items-center gap-1.5 rounded-xl px-3 py-2 transition ${activeCountry === country.code ? "text-primary" : "text-white hover:bg-white/5"}`}
            aria-pressed={activeCountry === country.code}
          >
            <span className="text-4xl leading-none" aria-hidden="true">{country.flag}</span>
            <span className="text-sm font-bold">{country.label}</span>
          </button>
        ))}
      </div>

      <section id="log-products" aria-live="polite">
        <h2 className="mb-8 text-center text-2xl font-bold text-white">Total found: {filteredProducts.length}</h2>
        {filteredProducts.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#111] px-6 py-16 text-center">
            <FileText className="mx-auto h-9 w-9 text-white/25" aria-hidden="true" />
            <p className="mt-3 text-base font-semibold text-white/75">No logs found</p>
            <p className="mt-1 text-sm text-white/45">Try another search or check back when inventory is available.</p>
          </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visibleProducts.map((product: any) => (
              <LogProductCard key={product.id} product={product} />
            ))}
          </div>
          {filteredProducts.length > 0 && (
            <nav className="mt-10 flex items-center justify-center gap-3" aria-label="Product pages">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page === 1}
                className="inline-flex h-11 items-center gap-1.5 rounded-lg border border-white/15 bg-[#222] px-4 text-sm font-semibold text-white transition hover:bg-[#333] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                Back
              </button>
              <span className="flex h-11 min-w-11 items-center justify-center rounded-lg bg-white px-3 text-sm font-bold text-black">
                {page}
              </span>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page === totalPages}
                className="inline-flex h-11 items-center gap-1.5 rounded-lg border border-white/15 bg-[#222] px-4 text-sm font-semibold text-white transition hover:bg-[#333] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </nav>
          )}
        </>
      )}
      </section>
    </div>
  );
}