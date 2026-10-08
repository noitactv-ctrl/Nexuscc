import { X } from "lucide-react";

export type CardFilterKey =
  | "country"
  | "state"
  | "zip"
  | "bin"
  | "brand"
  | "bank"
  | "minPrice"
  | "maxPrice"
  | "email"
  | "phone"
  | "name"
  | "address"
  | "dob"
  | "ssn"
  | "ip"
  | "userAgent";

export type CardFilters = Record<CardFilterKey, string>;

export type CardFilterOptions = {
  countries: Array<{ value: string; label: string }>;
  states: string[];
  brands: string[];
  banks: string[];
};

export function createEmptyCardFilters(): CardFilters {
  return {
    country: "",
    state: "",
    zip: "",
    bin: "",
    brand: "",
    bank: "",
    minPrice: "",
    maxPrice: "",
    email: "",
    phone: "",
    name: "",
    address: "",
    dob: "",
    ssn: "",
    ip: "",
    userAgent: "",
  };
}

type CardFiltersSheetProps = {
  filters: CardFilters;
  options: CardFilterOptions;
  resultCount: number;
  activeFilterCount: number;
  onChange: (key: CardFilterKey, value: string) => void;
  onClear: () => void;
  onClose: () => void;
};

const fieldClass =
  "mt-2 h-12 w-full rounded-xl border border-white/15 bg-[#151515] px-4 text-[15px] text-white outline-none transition-colors focus:border-white/35";

function SelectField({
  label,
  value,
  onChange,
  options,
  firstOption = "All",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options?: Array<{ value: string; label: string }>;
  firstOption?: string;
}) {
  return (
    <label className="block min-w-0 text-sm font-medium text-white/90">
      {label}
      <select className={fieldClass} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{firstOption}</option>
        {options?.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block min-w-0 text-sm font-medium text-white/90">
      {label}
      <input
        className={fieldClass}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

export function CardFiltersSheet({
  filters,
  options,
  resultCount,
  activeFilterCount,
  onChange,
  onClear,
  onClose,
}: CardFiltersSheetProps) {
  const set = (key: CardFilterKey) => (value: string) => onChange(key, value);
  const availabilityOptions = [
    { value: "available", label: "Available" },
    { value: "unavailable", label: "Not available" },
  ];

  return (
    <div
      className="fixed inset-0 z-[90] flex justify-center bg-black/75 sm:items-center sm:p-5"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="flex h-full w-full max-w-2xl flex-col border-x border-white/10 bg-[#080808] sm:max-h-[92svh] sm:rounded-2xl sm:border"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cards-filter-title"
      >
        <header
          className="flex h-[64px] shrink-0 items-center justify-between border-b border-white/10 px-6"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <div className="flex items-center gap-3">
            <h2 id="cards-filter-title" className="text-lg font-semibold text-white">Filters</h2>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={onClear}
                className="text-xs font-medium text-white/45 underline underline-offset-4 hover:text-white"
              >
                Clear all
              </button>
            )}
          </div>
          <button
            type="button"
            aria-label="Close filters"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-lg text-white/65 hover:bg-white/8 hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-8 overflow-y-auto px-6 py-6">
          <section className="space-y-5">
            <h3 className="border-b border-white/15 pb-3 text-base font-semibold text-white">Location &amp; identifiers</h3>
            <SelectField
              label="Country"
              value={filters.country}
              onChange={set("country")}
              options={options.countries}
              firstOption="All countries"
            />
            <SelectField
              label="State"
              value={filters.state}
              onChange={set("state")}
              options={options.states.map((state) => ({ value: state, label: state }))}
              firstOption="All states"
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField label="ZIP" value={filters.zip} onChange={set("zip")} placeholder="ZIP code" />
              <TextField label="BIN" value={filters.bin} onChange={set("bin")} placeholder="BIN or digits" />
            </div>
          </section>

          <section className="space-y-5">
            <h3 className="border-b border-white/15 pb-3 text-base font-semibold text-white">Card attributes</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SelectField
                label="Brand"
                value={filters.brand}
                onChange={set("brand")}
                options={options.brands.map((brand) => ({ value: brand, label: brand }))}
                firstOption="All brands"
              />
              <SelectField
                label="Bank"
                value={filters.bank}
                onChange={set("bank")}
                options={options.banks.map((bank) => ({ value: bank, label: bank }))}
                firstOption="All banks"
              />
            </div>
            <div>
              <p className="text-sm font-medium text-white/90">Price per card</p>
              <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <input
                  className={`${fieldClass} mt-0`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={filters.minPrice}
                  onChange={(event) => onChange("minPrice", event.target.value)}
                  placeholder="Min price"
                  aria-label="Minimum price"
                />
                <span className="text-white/40">to</span>
                <input
                  className={`${fieldClass} mt-0`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={filters.maxPrice}
                  onChange={(event) => onChange("maxPrice", event.target.value)}
                  placeholder="Max price"
                  aria-label="Maximum price"
                />
              </div>
            </div>
          </section>

          <section className="space-y-5 pb-2">
            <h3 className="border-b border-white/15 pb-3 text-base font-semibold text-white">Data attributes</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {([
                ["email", "Email"],
                ["phone", "Phone"],
                ["name", "Name"],
                ["address", "Full address"],
                ["dob", "DOB"],
                ["ssn", "SSN"],
                ["ip", "IP address"],
                ["userAgent", "User agent"],
              ] as const).map(([key, label]) => (
                <SelectField
                  key={key}
                  label={label}
                  value={filters[key]}
                  onChange={set(key)}
                  options={availabilityOptions}
                  firstOption="All"
                />
              ))}
            </div>
          </section>
        </div>

        <footer
          className="shrink-0 border-t border-white/10 bg-[#080808] px-6 pt-4"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
        >
          <button
            type="button"
            onClick={onClose}
            className="h-12 w-full rounded-xl bg-[#f32936] text-base font-semibold text-black transition-colors hover:bg-[#ff3c48]"
          >
            Show {resultCount.toLocaleString()} results
          </button>
        </footer>
      </section>
    </div>
  );
}
