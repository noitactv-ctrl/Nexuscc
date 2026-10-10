import { CheckCircle2, Circle, ShoppingCart, X } from "lucide-react";

export type CardDetails = {
  id: number;
  maskedNumber: string;
  bin: string;
  city: string;
  state: string;
  zip: string;
  brand: string;
  type: string;
  level: string;
  issuer: string;
  country: string;
  base: string;
  price: number;
  extras: string;
};

type CardDetailsDialogProps = {
  card: CardDetails;
  selected: boolean;
  onClose: () => void;
  onToggleSelection: () => void;
};

function featureAvailable(extras: string, feature: string) {
  const tokens = extras.split(/[|\t]/).map((token) => token.trim()).filter(Boolean);
  const joined = tokens.join(" ");
  switch (feature) {
    case "email":
      return /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(joined);
    case "phone":
      return /\b(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}\b/.test(joined);
    case "name":
      return /\b[A-Z][a-z]{1,}\s+[A-Z][a-z]{1,}\b/.test(joined);
    case "address":
      return tokens.length >= 5;
    default:
      return false;
  }
}

function Detail({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-white/50">{label}</dt>
      <dd className={`mt-1 break-words text-sm font-medium ${accent ? "text-sky-400 font-mono" : "text-white"}`}>
        {value || "—"}
      </dd>
    </div>
  );
}

export function CardDetailsDialog({
  card,
  selected,
  onClose,
  onToggleSelection,
}: CardDetailsDialogProps) {
  const features = [
    ["Email address", "email"],
    ["Full name", "name"],
    ["Phone number", "phone"],
    ["Billing address", "address"],
  ] as const;

  return (
    <div
      className="fixed inset-0 z-[95] flex items-start justify-center overflow-y-auto bg-black/75 p-3 pt-[max(20px,env(safe-area-inset-top))] sm:items-center sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="w-full max-w-xl overflow-y-auto rounded-2xl border border-white/15 bg-[#080808] p-5 shadow-2xl sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="card-details-title"
      >
        <header className="mb-6 flex items-center justify-between gap-4">
          <h2 id="card-details-title" className="text-xl font-semibold text-white">Card Details</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close card details"
            className="grid h-9 w-9 place-items-center rounded-lg text-white/60 hover:bg-white/8 hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <dl className="grid grid-cols-2 gap-x-5 gap-y-6 sm:gap-x-8">
          <Detail label="Card Number" value={card.maskedNumber} accent />
          <Detail label="BIN" value={card.bin} />
          <Detail label="City" value={card.city} />
          <Detail label="State" value={card.state} />
          <Detail label="ZIP" value={card.zip} />
          <Detail label="Brand" value={card.brand} />
          <Detail label="Type" value={card.type} />
          <Detail label="Level" value={card.level} />
          <Detail label="Issuer" value={card.issuer} />
          <Detail label="Country" value={card.country} />
          <Detail label="Base" value={card.base} />
          <Detail label="Price" value={`$${(card.price / 100).toFixed(2)}`} />
        </dl>

        <section className="mt-6 border-t border-white/10 pt-5">
          <h3 className="text-base font-semibold text-white">Available Features</h3>
          <ul className="mt-3 space-y-2.5">
            {features.map(([label, key]) => {
              const available = featureAvailable(card.extras, key);
              const Icon = available ? CheckCircle2 : Circle;
              return (
                <li key={key} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-white/85">{label}</span>
                  <span className={`inline-flex items-center gap-2 ${available ? "text-emerald-400" : "text-white/35"}`}>
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {available ? "Available" : "Not included"}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <button
          type="button"
          onClick={onToggleSelection}
          className={`mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors ${
            selected ? "bg-[#1d4ed8] text-white hover:bg-[#1e40af]" : "bg-[#2563eb] text-white hover:bg-[#1d4ed8]"
          }`}
        >
          <ShoppingCart className="h-4 w-4" aria-hidden="true" />
          {selected ? "Remove from selection" : "Add to purchase selection"}
        </button>
      </section>
    </div>
  );
}
