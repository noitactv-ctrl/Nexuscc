import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Check,
  ChevronDown,
  Columns3,
  Info,
  Loader2,
  Search,
  ShoppingCart,
  SlidersHorizontal,
} from "lucide-react";
import { Redirect, useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  CardFiltersSheet,
  createEmptyCardFilters,
  type CardFilterKey,
  type CardFilters,
} from "@/components/cards/CardFiltersSheet";
import { CardDetailsDialog, type CardDetails } from "@/components/cards/CardDetailsDialog";

type CatalogCard = any;

const COLUMNS = [
  { id: "number", label: "Number", width: 140 },
  { id: "bin", label: "BIN", width: 80 },
  { id: "brand", label: "Brand", width: 90 },
  { id: "type", label: "Type", width: 90 },
  { id: "level", label: "Level", width: 110 },
  { id: "issuer", label: "Issuer", width: 150 },
  { id: "country", label: "Country", width: 105 },
  { id: "city", label: "City", width: 125 },
  { id: "state", label: "State", width: 80 },
  { id: "zip", label: "ZIP", width: 80 },
  { id: "base", label: "Base / Uploader", width: 190 },
  { id: "price", label: "PricePerCard", width: 110 },
] as const;

type ColumnId = (typeof COLUMNS)[number]["id"];

const DATA_FILTERS = ["email", "phone", "name", "address", "dob", "ssn", "ip", "userAgent"] as const;

function countryFlag(code: string): string {
  if (!code || code.length !== 2) return "";
  return String.fromCodePoint(...code.toUpperCase().split("").map((c) => 0x1f1e6 - 65 + c.charCodeAt(0)));
}

const countryDisplayNames =
  typeof Intl !== "undefined" && (Intl as any).DisplayNames
    ? new (Intl as any).DisplayNames(["en"], { type: "region" })
    : null;

function countryName(code: string): string {
  if (!code) return "";
  if (code.length !== 2) return code;
  try {
    return countryDisplayNames?.of(code.toUpperCase()) || code.toUpperCase();
  } catch {
    return code.toUpperCase();
  }
}

function extractBin(cardNumber: string): string {
  return (cardNumber ?? "").replace(/\D/g, "").substring(0, 6);
}

function extractZip(extras: string): string {
  if (!extras) return "";
  const tokens = extras.split(/[|\t:;,\s]+/).map((token) => token.trim()).filter(Boolean);
  for (const token of tokens) {
    const match = token.match(/^(\d{5})(?:-\d{4})?$/);
    if (match) {
      const number = Number.parseInt(match[1], 10);
      if (number >= 501 && number <= 99950 && !(number >= 1900 && number <= 2100)) return match[1];
    }
  }
  return "";
}

const US_STATES = new Set([
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY",
  "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND",
  "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC",
]);

function extractCity(extras: string): string {
  const parts = (extras ?? "").split(/[|\t]/);
  const stateIndex = parts.findIndex((part) => US_STATES.has(part.trim()));
  if (stateIndex < 1) return "";
  for (let index = stateIndex - 1; index >= 0; index--) {
    const city = parts[index].trim();
    if (city && city.length > 1 && !/^\d/.test(city) && !city.includes("@") && !city.includes(".")) {
      return city.length > 22 ? `${city.slice(0, 20)}…` : city;
    }
  }
  return "";
}

function extractState(extras: string): string {
  if (!extras) return "";
  const states = new Set([
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA",
    "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
    "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT",
    "VA", "WA", "WV", "WI", "WY", "DC",
  ]);
  const tokens = extras.split(/[|\t:;,]+/).map(token => token.trim().toUpperCase()).filter(Boolean);
  return tokens.find(token => states.has(token)) ?? "";
}

function hasBilling(extras: string): boolean {
  return (extras ?? "").split(/[|\t]/).length >= 5;
}
function hasFeature(card: CatalogCard, feature: string): boolean {
  const extras = String(card.extras ?? "");
  const tokens = extras.split(/[|\t]/).map((part: string) => part.trim()).filter(Boolean);
  switch (feature) {
    case "email": return /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(extras);
    case "phone": return /\b(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}\b/.test(extras);
    case "name": return /\b[A-Z][a-z]{1,}\s+[A-Z][a-z]{1,}\b/.test(extras);
    case "address": return tokens.length >= 5;
    case "dob": return /\b(?:0?[1-9]|1[0-2])[/-](?:0?[1-9]|[12]\d|3[01])[/-](?:\d{2}|\d{4})\b/.test(extras);
    case "ssn": return /\b\d{3}-?\d{2}-?\d{4}\b/.test(extras);
    case "ip": return /\b(?:\d{1,3}\.){3}\d{1,3}\b/.test(extras);
    case "userAgent": return /\b(?:Mozilla|Chrome|Safari|Firefox|Android|iPhone|Windows)\b/i.test(extras);
    default: return false;
  }
}

function formatCardNumber(card: CatalogCard): string {
  const digits = String(card.maskedCard ?? card.cardNumber ?? "").replace(/\D/g, "");
  return `•••• ${digits.slice(-4) || "••••"}`;
}

function toCardDetails(card: CatalogCard): CardDetails {
  const countryCode = String(card.binData?.countryCode ?? "");
  return {
    id: card.id,
    maskedNumber: formatCardNumber(card),
    bin: extractBin(card.cardNumber),
    city: extractCity(card.extras ?? ""),
    state: extractState(card.extras ?? ""),
    zip: extractZip(card.extras ?? ""),
    brand: card.binData?.brand || card.binData?.scheme || "",
    type: card.binData?.type || "",
    level: card.binData?.level || card.level || "",
    issuer: card.binData?.bank || "",
    country: countryName(card.binData?.country || countryCode),
    base: card.baseName || "",
    price: Number(card.price) || 0,
    extras: String(card.extras ?? ""),
  };
}

function matchesAvailability(card: CatalogCard, key: string, value: string): boolean {
  if (!value) return true;
  const available = hasFeature(card, key);
  return value === "available" ? available : !available;
}

export default function CardsPage() {
  const [search, setSearch] = useState("");
  const [selectedBase, setSelectedBase] = useState<number | null>(null);
  const [showBaseDropdown, setShowBaseDropdown] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<CardFilters>(createEmptyCardFilters);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<ColumnId[]>(COLUMNS.map((column) => column.id));
  const [details, setDetails] = useState<CardDetails | null>(null);
  const [purchasing, setPurchasing] = useState<{ current: number; total: number } | null>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: features } = useQuery<{ cards: boolean }>({
    queryKey: ["/api/settings/features"],
    staleTime: 30000,
  });
  const { data: bases } = useQuery<any[]>({
    queryKey: ["/api/card-bases"],
    refetchInterval: 30000,
  });
/*

  if (features && features.cards === false) return <Redirect to="/" />;

  const { data: cards, isLoading, isError, error } = useQuery<any[]>({
    queryKey: ["/api/cards", selectedBase],
    queryFn: async () => {
      const url = selectedBase ? `/api/cards?baseId=${selectedBase}` : "/api/cards";
      const res = await fetch(url, { credentials: "include" });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(payload?.message || `Cards request failed (${res.status})`);
      }
      if (!Array.isArray(payload)) {
        throw new Error("Cards request returned an invalid response.");
      }
      return payload;
*/
  const { data: cards, isLoading } = useQuery<CatalogCard[]>({
    queryKey: ["/api/cards", selectedBase],
    queryFn: async () => {
      const response = await fetch(selectedBase ? `/api/cards?baseId=${selectedBase}` : "/api/cards", { credentials: "include" });
      if (!response.ok) throw new Error("Could not load prepaid cards");
      return response.json();
    },
    enabled: features?.cards !== false,
    refetchInterval: 20000,
  });

  const filterOptions = useMemo(() => {
    const list = cards ?? [];
    const countryCodes = Array.from(new Set(list.map((card) => String(card.binData?.countryCode ?? "").toUpperCase()).filter(Boolean))).sort();
    const states = Array.from(new Set(list.map((card) => extractState(card.extras ?? "")).filter(Boolean))).sort();
    const brands = Array.from(new Set(list.map((card) => String(card.binData?.brand || card.binData?.scheme || "")).filter(Boolean))).sort();
    const banks = Array.from(new Set(list.map((card) => String(card.binData?.bank ?? "")).filter((bank) => bank && bank !== "Unknown"))).sort();
    return {
      countries: countryCodes.map((code) => ({ value: code, label: countryName(code) })),
      states,
      brands,
      banks,
    };
  }, [cards]);

  const filteredCards = useMemo(() => {
    const list = cards ?? [];
    const q = search.trim().toLowerCase();
    return list.filter((card) => {
      const bin = extractBin(card.cardNumber);
      const brand = String(card.binData?.brand || card.binData?.scheme || "");
      const bank = String(card.binData?.bank ?? "");
      const countryCode = String(card.binData?.countryCode ?? "").toUpperCase();
      const zip = extractZip(card.extras ?? "");
      const state = extractState(card.extras ?? "");
      const price = Number(card.price ?? 0) / 100;
      const matchesSearch = !q || [bin, card.baseName, brand, card.binData?.type, bank, countryName(countryCode)]
        .some((value) => String(value ?? "").toLowerCase().includes(q));
      const matchesFields =
        (!filters.country || countryCode === filters.country) &&
        (!filters.state || state === filters.state) &&
        (!filters.zip || zip.startsWith(filters.zip.trim())) &&
        (!filters.bin || bin.includes(filters.bin.replace(/\D/g, ""))) &&
        (!filters.brand || brand === filters.brand) &&
        (!filters.bank || bank === filters.bank) &&
        (!filters.minPrice || price >= Number(filters.minPrice)) &&
        (!filters.maxPrice || price <= Number(filters.maxPrice)) &&
        DATA_FILTERS.every((key) => matchesAvailability(card, key, filters[key]));
      return matchesSearch && matchesFields;
    });
  }, [cards, search, filters]);

  const selectedCards = useMemo(
    () => (cards ?? []).filter((card) => selectedIds.has(card.id)),
    [cards, selectedIds],
  );
  const selectedTotal = selectedCards.reduce((sum, card) => sum + Number(card.price ?? 0), 0);
  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const allVisibleSelected = filteredCards.length > 0 && filteredCards.every((card) => selectedIds.has(card.id));

  useEffect(() => {
    if (!showFilters && !details) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowFilters(false);
        setDetails(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showFilters, details]);

  const toggleSelection = (card: CatalogCard) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(card.id)) next.delete(card.id);
      else next.add(card.id);
      return next;
    });
  };

  const toggleAllVisible = () => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (allVisibleSelected) filteredCards.forEach((card) => next.delete(card.id));
      else filteredCards.forEach((card) => next.add(card.id));
      return next;
    });
  };

  const updateFilter = (key: CardFilterKey, value: string) => {
    setFilters((previous) => ({ ...previous, [key]: value }));
  };

  const purchaseSelected = async () => {
    if (!selectedCards.length || purchasing) return;
    setPurchasing({ current: 0, total: selectedCards.length });
    let successful = 0;
    for (let index = 0; index < selectedCards.length; index++) {
      setPurchasing({ current: index + 1, total: selectedCards.length });
      try {
        const response = await apiRequest("POST", `/api/cards/${selectedCards[index].id}/purchase`, {});
        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          toast({ title: `Card ${index + 1} failed`, description: error.message, variant: "destructive" });
        } else successful++;
      } catch {
        toast({ title: `Card ${index + 1} failed`, variant: "destructive" });
      }
    }
    queryClient.invalidateQueries({ queryKey: ["/api/cards"] });
    queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    setSelectedIds(new Set());
    setPurchasing(null);
    if (successful) {
      toast({ title: `${successful} prepaid card${successful === 1 ? "" : "s"} purchased` });
      setLocation("/orders");
    }
  };

  const toggleColumn = (id: ColumnId) => {
    setVisibleColumns((previous) => {
      if (previous.includes(id)) return previous.length > 1 ? previous.filter((column) => column !== id) : previous;
      return [...previous, id];
    });
  };

  const getColumnValue = (card: CatalogCard, id: ColumnId) => {
    const countryCode = String(card.binData?.countryCode ?? "");
    switch (id) {
      case "number": return formatCardNumber(card);
      case "bin": return extractBin(card.cardNumber) || "—";
      case "brand": return card.binData?.brand || card.binData?.scheme || "—";
      case "type": return card.binData?.type || "—";
      case "level": return card.binData?.level || card.level || "—";
      case "issuer": return card.binData?.bank || "—";
      case "country": return `${countryFlag(countryCode)} ${countryName(card.binData?.country || countryCode)}`.trim() || "—";
      case "city": return extractCity(card.extras ?? "") || "—";
      case "state": return extractState(card.extras ?? "") || "—";
      case "zip": return extractZip(card.extras ?? "") || "—";
      case "base": return card.baseName || "—";
      case "price": return `$${(Number(card.price ?? 0) / 100).toFixed(2)}`;
    }
  };

  if (features && features.cards === false) return <Redirect to="/" />;

  const visibleColumnDefinitions = COLUMNS.filter((column) => visibleColumns.includes(column.id));
  const cardTableMinWidth =
    48 + 128 + visibleColumnDefinitions.reduce((width, column) => width + column.width, 0);

  return (
    <main className="mx-auto w-full max-w-[1280px] px-3 pb-12 sm:px-5">
      <section className="pb-4 pt-5 sm:pt-7">
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Buy Cards</h1>
        <p className="mt-2 text-sm text-white/55 sm:text-base">Purchase cards from available bases</p>
      </section>

      <section className="space-y-3 pb-4">
        <label className="relative block">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/45" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search cards, base name, BIN, brand..."
            className="h-12 w-full rounded-xl border border-white/15 bg-[#141414] pl-12 pr-4 text-sm text-white outline-none placeholder:text-white/45 focus:border-white/30 sm:text-base"
            data-testid="input-search"
          />
        </label>

        <div className="grid grid-cols-[1fr_auto] gap-2">
          <div className="relative min-w-0">
            <button
              type="button"
              onClick={() => setShowBaseDropdown((open) => !open)}
              className="flex h-12 w-full items-center justify-between rounded-xl border border-white/15 bg-[#141414] px-4 text-left text-sm text-white/90 sm:text-base"
              data-testid="btn-base-dropdown"
            >
              <span className="truncate">
                {selectedBase === null
                  ? `All Bases${bases ? ` (${bases.reduce((sum: number, base: any) => sum + (base.count ?? 0), 0)})` : ""}`
                  : (bases ?? []).find((base: any) => base.id === selectedBase)?.name ?? "Selected base"}
              </span>
              <ChevronDown className={`ml-3 h-4 w-4 shrink-0 text-white/55 transition-transform ${showBaseDropdown ? "rotate-180" : ""}`} />
            </button>
            {showBaseDropdown && (
              <div className="absolute left-0 right-0 top-full z-40 mt-2 max-h-72 overflow-y-auto rounded-xl border border-white/15 bg-[#171717] p-1 shadow-2xl">
                <button
                  type="button"
                  onClick={() => { setSelectedBase(null); setShowBaseDropdown(false); }}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-left text-sm text-white hover:bg-white/8"
                >
                  <span>All Bases</span>
                  {selectedBase === null && <Check className="h-4 w-4" />}
                </button>
                {(bases ?? []).map((base: any) => (
                  <button
                    key={base.id}
                    type="button"
                    onClick={() => { setSelectedBase(base.id); setShowBaseDropdown(false); }}
                    className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-3 text-left text-sm text-white hover:bg-white/8"
                  >
                    <span className="truncate">{base.name} ({base.count ?? 0} cards)</span>
                    {selectedBase === base.id && <Check className="h-4 w-4 shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(true)}
            className={`inline-flex h-12 items-center gap-2 rounded-xl border px-3 text-sm font-medium transition-colors sm:px-4 ${
              activeFilterCount ? "border-white/30 bg-white/10 text-white" : "border-white/15 bg-[#141414] text-white/80"
            }`}
            data-testid="btn-toggle-filters"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </button>
        </div>
      </section>

      <section className="sticky top-[43px] z-30 space-y-4 border-b border-white/10 bg-background pb-4 pt-2">
        <button
          type="button"
          onClick={purchaseSelected}
          disabled={selectedCards.length === 0 || !!purchasing}
          className="flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-amber-400 text-base font-semibold text-black transition-colors hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-60 sm:text-lg"
          data-testid="btn-add-selected"
        >
          {purchasing ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShoppingCart className="h-5 w-5" />}
          {purchasing ? `Purchasing ${purchasing.current}/${purchasing.total}…` : `Buy Selected (${selectedCards.length})`}
          {selectedCards.length > 0 && <span className="text-sm">${(selectedTotal / 100).toFixed(2)}</span>}
        </button>

        <div className="relative">
          <p className="mb-2 text-sm font-medium text-white/90">Column Visibility</p>
          <button
            type="button"
            onClick={() => setColumnsOpen((open) => !open)}
            className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-white/20 bg-[#141414] text-sm text-white sm:text-base"
            aria-expanded={columnsOpen}
          >
            <Columns3 className="h-4 w-4 text-white/60" aria-hidden="true" />
            Columns
            <ChevronDown className={`h-4 w-4 text-white/65 transition-transform ${columnsOpen ? "rotate-180" : ""}`} />
          </button>
          {columnsOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 max-h-[65vh] w-64 overflow-y-auto rounded-xl border border-white/15 bg-[#171717] p-2 shadow-2xl">
              {COLUMNS.map((column) => (
                <label key={column.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white hover:bg-white/8">
                  <input
                    type="checkbox"
                    checked={visibleColumns.includes(column.id)}
                    onChange={() => toggleColumn(column.id)}
                    className="h-4 w-4 accent-white"
                  />
                  {column.label}
                </label>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="mt-2 overflow-x-auto rounded-xl border border-white/15 bg-[#090909]">
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-white/40" /></div>
        ) : filteredCards.length === 0 ? (
          <div className="px-5 py-16 text-center text-sm text-white/50">No prepaid cards match these filters.</div>
        ) : (
          <table className="w-full table-fixed border-collapse text-sm" style={{ minWidth: `${cardTableMinWidth}px` }}>
            <colgroup>
              <col style={{ width: "48px" }} />
              {visibleColumnDefinitions.map((column) => (
                <col key={column.id} style={{ width: `${column.width}px` }} />
              ))}
              <col style={{ width: "128px" }} />
            </colgroup>
            <thead>
              <tr className="border-b border-white/15 text-white/80">
                <th className="w-12 px-3 py-4 text-left">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleAllVisible}
                    aria-label="Select all visible cards"
                    className="h-4 w-4 accent-amber-400"
                    data-testid="checkbox-all"
                  />
                </th>
                {visibleColumnDefinitions.map((column) => (
                  <th key={column.id} className="whitespace-nowrap px-4 py-4 text-left font-medium">{column.label}</th>
                ))}
                <th className="whitespace-nowrap px-3 py-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCards.map((card) => (
                <tr
                  key={card.id}
                  className={`border-b border-white/15 transition-colors ${selectedIds.has(card.id) ? "bg-white/[0.06]" : "hover:bg-white/[0.025]"}`}
                  data-testid={`card-row-${card.id}`}
                >
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(card.id)}
                      onChange={() => toggleSelection(card)}
                      aria-label={`Select prepaid card ending ${formatCardNumber(card).slice(-4)}`}
                      className="h-4 w-4 accent-amber-400"
                      data-testid={`checkbox-card-${card.id}`}
                    />
                  </td>
                  {visibleColumnDefinitions.map((column) => {
                    const value = getColumnValue(card, column.id);
                    return (
                      <td key={column.id} className="overflow-hidden px-3 py-3.5 text-white/85">
                        {column.id === "base" ? (
                          <div className="min-w-0">
                            <span title={String(value)} className="block truncate text-white/85">
                              {value}
                            </span>
                            <span className="block truncate text-[10px] text-white/45">
                              {card.baseUploaderType === "seller"
                                ? `Uploaded by ${card.baseUploaderName || "Seller"}`
                                : card.baseUploaderType === "admin"
                                  ? `Uploaded by ${card.baseUploaderName || "Admin"}`
                                  : "Uploader unavailable"}
                            </span>
                          </div>
                        ) : (
                          <span
                            title={String(value)}
                            className={`block truncate ${column.id === "number" || column.id === "bin" ? "font-mono text-sky-400" : ""}`}
                          >
                            {value}
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2.5">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setDetails(toCardDetails(card))}
                        aria-label="View card details"
                        className="grid h-10 w-10 place-items-center rounded-xl border border-white/15 bg-[#141414] text-white/80 hover:bg-white/10"
                      >
                        <Info className="h-5 w-5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleSelection(card)}
                        aria-label={selectedIds.has(card.id) ? "Remove from selection" : "Add to selection"}
                        className={`grid h-10 w-10 place-items-center rounded-xl transition-colors ${
                          selectedIds.has(card.id) ? "bg-amber-500 text-black" : "bg-amber-400 text-black hover:bg-amber-500"
                        }`}
                      >
                        <ShoppingCart className="h-5 w-5" aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
{/* 
function CardTableRow({ card, inCart, onToggleCart }: { card: any; inCart: boolean; onToggleCart: (c: any) => void }) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const bin = extractBin(card.cardNumber);
  const zip = extractZip(card.extras ?? "");
  const state = extractState(card.extras ?? "");
  const flag = countryFlag(card.binData?.countryCode ?? "");
  const countryCode = card.binData?.countryCode ?? "";
  const ccCountry = countryName(countryCode) || card.country || "Unknown";
  const cardType = formatType(card.binData);
  const bank = formatBank(card.binData);
  const brand = card.binData?.brand || "—";

  const purchaseMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/cards/${card.id}/purchase`, {});
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || "Purchase failed"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: "Purchase complete", description: "Card delivered to your orders" });
      setLocation("/orders");
    },
    onError: (e: Error) => toast({ title: "Purchase failed", description: e.message, variant: "destructive" }),
  });

  return (
    <tr
      className={`border-b border-white/[0.06] transition-colors ${inCart ? "bg-primary/[0.04]" : "hover:bg-white/[0.02]"}`}
      data-testid={`card-row-${card.id}`}
    >
      <td className="px-2.5 py-2">
        <input
          type="checkbox"
          checked={inCart}
          onChange={() => onToggleCart(card)}
          className="w-3.5 h-3.5 rounded border-white/15 cursor-pointer accent-red-500"
          data-testid={`checkbox-card-${card.id}`}
        />
      </td>
      <td className="px-2.5 py-2">
        <span className="font-bold font-mono text-xs text-white">{bin || "—"}</span>
      </td>
       <td className="px-2.5 py-2 max-w-[110px]">
         <span className="text-[10px] text-white/60 truncate block">{brand}</span>
      </td>
      <td className="px-2.5 py-2">
        <span className="text-[11px] font-mono text-white/55">{cardType || "—"}</span>
      </td>
       <td className="px-2.5 py-2 max-w-[140px]">
        <span className="text-[11px] text-white/55 truncate block">{bank || "—"}</span>
      </td>
       <td className="px-2.5 py-2">
         <span className="text-[11px] font-mono text-white/55">{state || "—"}</span>
       </td>
      <td className="px-2.5 py-2">
        <span className="text-[11px] font-mono text-white/55">{zip || "—"}</span>
      </td>
      <td className="px-2.5 py-2">
         <span className="text-base leading-none" title={ccCountry}>{flag || countryCode || "—"}</span>
       </td>
       <td className="px-2.5 py-2 max-w-[110px]">
         <span className="text-[10px] text-white/50 truncate block">{card.baseName || "—"}</span>
       </td>
       <td className="px-2.5 py-2">
         <span className="text-[11px] font-mono font-bold text-white/65">{card.hrPercent ?? 80}%</span>
       </td>
       <td className="px-2.5 py-2">
         <span className={card.baseRefundable ? "text-green-400 text-lg leading-none" : "text-white/25"} title={card.baseRefundable ? "Refundable" : "Not refundable"}>
           {card.baseRefundable ? "✓" : "—"}
         </span>
      </td>
      <td className="px-2.5 py-2 text-right">
        <span className="font-bold text-xs text-white">${(card.price / 100).toFixed(2)}</span>
      </td>
      <td className="px-2.5 py-2 text-right">
        <button
          onClick={() => purchaseMutation.mutate()}
          disabled={purchaseMutation.isPending}
          className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-white/50 transition-colors disabled:opacity-50"
          data-testid={`btn-buy-card-${card.id}`}
        >
          {purchaseMutation.isPending
            ? <Loader2 className="h-3 w-3 animate-spin" />
            : <ShoppingCart className="h-3 w-3" />
          }
        </button>
      </td>
    </tr>
*/}
      {showFilters && (
        <CardFiltersSheet
          filters={filters}
          options={filterOptions}
          resultCount={filteredCards.length}
          activeFilterCount={activeFilterCount}
          onChange={updateFilter}
          onClear={() => setFilters(createEmptyCardFilters())}
          onClose={() => setShowFilters(false)}
        />
      )}
      {details && (
        <CardDetailsDialog
          card={details}
          selected={selectedIds.has(details.id)}
          onClose={() => setDetails(null)}
          onToggleSelection={() => {
            const card = (cards ?? []).find((item) => item.id === details.id);
            if (card) toggleSelection(card);
          }}
        />
      )}
    </main>
  );
}
