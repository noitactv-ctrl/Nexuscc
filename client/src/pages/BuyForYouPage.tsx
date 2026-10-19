import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  Clock3,
  ExternalLink,
  Facebook,
  MessageCircle,
  Send,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  X,
} from "lucide-react";
import "./BuyForYouPage.css";

type RequestItem = { id: number; category: string; customerName: string; siteUrl: string; createdAt: string };
type ChatMessage = { id: number; senderRole: string; message: string; createdAt: string };
type Category = "food" | "weed" | "facebook";
type Destination = { name: string; mark: string; url?: string; detail?: string };

const destinations: Record<Category, Destination[]> = {
  food: [
    { name: "Buffalo Wild Wings", mark: "BWW", url: "https://www.buffalowildwings.com" },
    { name: "Chipotle", mark: "CHIPOTLE", url: "https://www.chipotle.com" },
    { name: "Cinnabon", mark: "CINNABON", url: "https://www.cinnabon.com" },
    { name: "Dairy Queen", mark: "DQ", url: "https://www.dairyqueen.com" },
    { name: "Domino’s", mark: "D", url: "https://www.dominos.com" },
    { name: "Five Guys", mark: "FIVE\nGUYS", url: "https://www.fiveguys.com" },
    { name: "IHOP", mark: "IHOP", url: "https://www.ihop.com" },
    { name: "Jersey Mike’s", mark: "JM", url: "https://www.jerseymikes.com" },
    { name: "McDonald’s", mark: "M", url: "https://www.mcdonalds.com" },
    { name: "Panda Express", mark: "PANDA", url: "https://www.pandaexpress.com" },
    { name: "Papa Johns", mark: "PAPA\nJOHNS", url: "https://www.papajohns.com" },
    { name: "Pizza Hut", mark: "PIZZA\nHUT", url: "https://www.pizzahut.com" },
    { name: "Raising Cane’s", mark: "CANE’S", url: "https://www.raisingcanes.com" },
    { name: "Taco Bell", mark: "TACO\nBELL", url: "https://www.tacobell.com" },
    { name: "Tropical Smoothie", mark: "TROPICAL", url: "https://www.tropicalsmoothiecafe.com" },
    { name: "Wingstop", mark: "WINGSTOP", url: "https://www.wingstop.com" },
  ],
  weed: [
    { name: "Dispensary", mark: "LOCAL", detail: "Your neighborhood shop" },
    { name: "Online menu", mark: "MENU", detail: "A specific menu or product" },
    { name: "Delivery service", mark: "DELIVERY", detail: "A delivery site you trust" },
    { name: "Something else", mark: "OTHER", detail: "Share any site URL below" },
  ],
  facebook: [
    { name: "Marketplace", mark: "FB", detail: "A Marketplace listing" },
    { name: "Facebook shop", mark: "SHOP", detail: "A shop or product page" },
    { name: "Group or post", mark: "GROUP", detail: "A post, group, or seller" },
    { name: "Something else", mark: "OTHER", detail: "Share any page URL below" },
  ],
};

const categoryNames: Record<Category, string> = {
  food: "Food",
  weed: "Weed",
  facebook: "Facebook",
};

function categoryLabel(value: string) {
  return categoryNames[value as Category] ?? "Food";
}

function formatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function BuyForYouPage() {
  const { toast } = useToast();
  const [form, setForm] = useState({ category: "food" as Category, name: "", email: "", phone: "", address: "", siteUrl: "" });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const confirmRef = useRef<HTMLDivElement>(null);
  const category = form.category;
  const selectedDestination = destinations[category].find((place) => place.url && place.url === form.siteUrl);

  const requests = useQuery<RequestItem[]>({ queryKey: ["/api/buy-for-you"], refetchInterval: 10000 });
  const activeId = selectedId ?? requests.data?.[0]?.id ?? null;
  const messages = useQuery<ChatMessage[]>({
    queryKey: ["/api/buy-for-you", activeId, "messages"],
    queryFn: async () => (await fetch(`/api/buy-for-you/${activeId}/messages`, { credentials: "include" })).json(),
    enabled: !!activeId,
    refetchInterval: 5000,
  });
  const create = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/buy-for-you", form)).json(),
    onSuccess: (request: RequestItem) => {
      queryClient.invalidateQueries({ queryKey: ["/api/buy-for-you"] });
      setSelectedId(request.id);
      setConfirmOpen(false);
      toast({ title: "Request submitted", description: "An admin will contact you here." });
      formRef.current?.reset();
      setForm({ category: "food", name: "", email: "", phone: "", address: "", siteUrl: "" });
    },
    onError: (error: Error) => toast({ title: "Could not submit request", description: error.message, variant: "destructive" }),
  });
  const send = useMutation({
    mutationFn: () => apiRequest("POST", `/api/buy-for-you/${activeId}/messages`, { message }),
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/buy-for-you", activeId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/buy-for-you"] });
    },
    onError: (error: Error) => toast({ title: "Message failed", description: error.message, variant: "destructive" }),
  });

  useEffect(() => {
    if (!confirmOpen) return;
    confirmRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setConfirmOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [confirmOpen]);

  const chooseDestination = (destination: Destination) => {
    setForm((current) => ({ ...current, siteUrl: destination.url ?? current.siteUrl }));
  };

  const submitForConfirmation = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    setConfirmOpen(true);
  };

  const sendMessage = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (message.trim() && activeId && !send.isPending) send.mutate();
  };

  return (
    <main className="bfy-page">
      <div className="bfy-scene" aria-hidden="true">
        <span className="bfy-cloud bfy-cloud-one" />
        <span className="bfy-cloud bfy-cloud-two" />
        <span className="bfy-sun" />
        <span className="bfy-hill bfy-hill-back" />
        <span className="bfy-hill bfy-hill-front" />
        <span className="bfy-ground" />
      </div>

      <div className="bfy-shell">
        <header className="bfy-hero">
          <div className="bfy-eyebrow"><span className="bfy-eyebrow-dot" /> PERSONAL SHOPPING / 01</div>
          <h1>BUY FOR<br className="bfy-mobile-break" /> YOU<span className="bfy-title-period">.</span></h1>
          <p>Found something you want? We’ll help you get it. Pick a category, share the details, and keep the conversation right here.</p>
          <div className="bfy-hero-note"><ShieldCheck size={16} aria-hidden="true" /> Private request chat, handled by our team</div>
        </header>

        <section className="bfy-order-panel" aria-labelledby="bfy-start-title">
          <div className="bfy-panel-heading">
            <div>
              <span className="bfy-kicker">01 / START A REQUEST</span>
              <h2 id="bfy-start-title">What are we<br className="bfy-mobile-break" /> getting?</h2>
            </div>
            <span className="bfy-heading-mark" aria-hidden="true"><ShoppingBag size={25} /></span>
          </div>

          <div className="bfy-category-picker" role="group" aria-label="Choose a request category">
            {(Object.keys(categoryNames) as Category[]).map((item, index) => (
              <button
                type="button"
                key={item}
                className={`bfy-category-button${category === item ? " is-selected" : ""}`}
                aria-pressed={category === item}
                onClick={() => setForm((current) => ({ ...current, category: item, siteUrl: "" }))}
              >
                <span className="bfy-category-number">0{index + 1}</span>
                <span>{categoryNames[item]}</span>
                {category === item && <Check size={16} aria-hidden="true" />}
              </button>
            ))}
          </div>

          {category === "food" && (
            <div className="bfy-food-offer">
              <strong>50% OFF</strong>
              <p>Choose a food listing and ask our Eats team to help with your order.</p>
            </div>
          )}

          <div className="bfy-destination-intro">
            <div>
              <span className="bfy-kicker">PICK A PLACE</span>
              <p>{category === "food" ? "Choose a restaurant or paste a different site below." : category === "weed" ? "Tell us which kind of source you have in mind." : "Choose what you found, then add its page link below."}</p>
            </div>
            <span className="bfy-count">{destinations[category].length.toString().padStart(2, "0")} OPTIONS</span>
          </div>

          <div className="bfy-destination-grid" role="group" aria-label={`${categoryLabel(category)} options`}>
            {destinations[category].map((place, index) => {
              const selected = place.url ? form.siteUrl === place.url : false;
              return (
                <button
                  type="button"
                  key={place.name}
                  className={`bfy-place-tile${selected ? " is-selected" : ""}`}
                  aria-pressed={selected}
                  onClick={() => chooseDestination(place)}
                >
                  <span className={`bfy-place-mark bfy-mark-${index % 5}`} aria-hidden="true">{place.mark.split("\n").map((line) => <span key={line}>{line}</span>)}</span>
                  <span className="bfy-place-copy">
                    <strong>{place.name}</strong>
                    {place.detail && <small>{place.detail}</small>}
                  </span>
                  {selected && <Check className="bfy-place-check" size={17} aria-hidden="true" />}
                </button>
              );
            })}
          </div>

          <form ref={formRef} className="bfy-request-form" onSubmit={submitForConfirmation}>
            <div className="bfy-form-heading">
              <span className="bfy-kicker">02 / YOUR DETAILS</span>
              <span className="bfy-required-note">All fields required</span>
            </div>
            <label className="bfy-field bfy-field-wide">
              <span>Website or listing URL <i aria-hidden="true">*</i></span>
              <div className="bfy-url-input">
                <ExternalLink size={17} aria-hidden="true" />
                <Input required type="url" maxLength={2048} placeholder="https://site.com/item" value={form.siteUrl} onChange={(event) => setForm({ ...form, siteUrl: event.target.value })} />
              </div>
            </label>
            <label className="bfy-field">
              <span>Full name <i aria-hidden="true">*</i></span>
              <Input required autoComplete="name" maxLength={100} placeholder="Name for your order" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </label>
            <label className="bfy-field">
              <span>Email address <i aria-hidden="true">*</i></span>
              <Input required type="email" autoComplete="email" maxLength={254} placeholder="you@example.com" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            </label>
            <label className="bfy-field">
              <span>Phone number <i aria-hidden="true">*</i></span>
              <Input required type="tel" autoComplete="tel" maxLength={40} placeholder="Best number to reach you" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
            </label>
            <label className="bfy-field">
              <span>Delivery address <i aria-hidden="true">*</i></span>
              <Textarea required autoComplete="street-address" maxLength={500} placeholder="Street, city, state, ZIP" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
            </label>
            <div className="bfy-submit-row">
              <p>Your information stays between you and the team handling your request.</p>
              <Button type="submit" className="bfy-submit-button">Review request <ArrowUpRight size={18} aria-hidden="true" /></Button>
            </div>
          </form>
        </section>

        <section className="bfy-conversation" aria-labelledby="bfy-chat-title">
          <div className="bfy-chat-sidebar">
            <span className="bfy-kicker">YOUR PRIVATE INBOX</span>
            <h2 id="bfy-chat-title">Your<br />requests<span className="bfy-title-period">.</span></h2>
            <p>Every request gets its own private conversation with our team.</p>
            <div className="bfy-chat-privacy"><ShieldCheck size={16} aria-hidden="true" /> Only you and our team can see these messages.</div>
            <div className="bfy-request-list" aria-label="Your requests">
              {requests.isLoading && <div className="bfy-list-skeleton" aria-label="Loading requests"><span /><span /><span /></div>}
              {requests.isError && <div className="bfy-inline-error" role="alert">Couldn’t load your requests.<button type="button" onClick={() => void requests.refetch()}>Try again</button></div>}
              {requests.data?.map((item) => (
                <button key={item.id} type="button" className={`bfy-request-row${activeId === item.id ? " is-active" : ""}`} onClick={() => setSelectedId(item.id)} aria-current={activeId === item.id ? "true" : undefined}>
                  <span className="bfy-request-row-icon">{item.category === "facebook" ? <Facebook size={17} /> : <ShoppingBag size={17} />}</span>
                  <span className="bfy-request-row-copy"><strong>{categoryLabel(item.category)} request</strong><small>Request #{item.id}</small></span>
                  <ArrowDownRight size={16} className="bfy-request-arrow" aria-hidden="true" />
                </button>
              ))}
              {!requests.isLoading && !requests.isError && !requests.data?.length && (
                <div className="bfy-empty-requests"><span className="bfy-empty-icon"><Sparkles size={20} /></span><strong>No requests yet</strong><span>Your first one starts above.</span></div>
              )}
            </div>
          </div>

          <div className="bfy-chat-panel">
            <div className="bfy-chat-header">
              <span className="bfy-chat-avatar"><MessageCircle size={20} aria-hidden="true" /></span>
              <div>
                <span className="bfy-kicker">PRIVATE REQUEST CHAT</span>
                <h3>{activeId ? `${categoryLabel(requests.data?.find((item) => item.id === activeId)?.category ?? "food")} request · #${activeId}` : "Your team is here"}</h3>
              </div>
              <span className="bfy-chat-status"><span /> PRIVATE</span>
            </div>
            <div className="bfy-messages" aria-live="polite" aria-label="Chat messages">
              {!activeId && <div className="bfy-chat-empty"><span className="bfy-empty-icon"><MessageCircle size={22} /></span><h4>Your request, your conversation.</h4><p>Once you send a request, you can message our team here.</p></div>}
              {activeId && messages.isLoading && <div className="bfy-message-skeleton" aria-label="Loading messages"><span /><span /><span /></div>}
              {activeId && messages.isError && <div className="bfy-inline-error" role="alert">Messages didn’t load.<button type="button" onClick={() => void messages.refetch()}>Try again</button></div>}
              {activeId && messages.data?.map((item) => (
                <div key={item.id} className={`bfy-message${item.senderRole === "admin" ? " is-team" : " is-customer"}`}>
                  <span className="bfy-message-author">{item.senderRole === "admin" ? "YOUR TEAM" : "YOU"}</span>
                  <p>{item.message}</p>
                  {item.createdAt && <time dateTime={item.createdAt}>{formatTime(item.createdAt)}</time>}
                </div>
              ))}
              {activeId && !messages.isLoading && !messages.isError && !messages.data?.length && <p className="bfy-no-messages"><Clock3 size={15} aria-hidden="true" /> Our team will reply in this private chat.</p>}
            </div>
            <form className="bfy-composer" onSubmit={sendMessage}>
              <Textarea aria-label="Write a message" disabled={!activeId} value={message} maxLength={2000} onChange={(event) => setMessage(event.target.value)} placeholder={activeId ? "Write a message…" : "Submit a request to start chatting"} />
              <Button type="submit" className="bfy-send-button" aria-label="Send message" disabled={!activeId || !message.trim() || send.isPending}>{send.isPending ? "Sending" : <><span>Send</span><Send size={16} aria-hidden="true" /></>}</Button>
            </form>
            <div className="bfy-chat-footer"><span>Messages are only visible to you and our team.</span><span>MAX 2,000 CHARACTERS</span></div>
          </div>
        </section>
        <footer className="bfy-page-footer"><span>BUY FOR YOU / OMNIMARKET</span><span>Good things, handled.</span></footer>
      </div>

      {confirmOpen && (
        <div className="bfy-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setConfirmOpen(false); }}>
          <div className="bfy-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="bfy-confirm-title" aria-describedby="bfy-confirm-copy" tabIndex={-1} ref={confirmRef}>
            <button type="button" className="bfy-modal-close" onClick={() => setConfirmOpen(false)} aria-label="Close confirmation"><X size={19} /></button>
            <span className="bfy-confirm-mark"><ShoppingBag size={27} aria-hidden="true" /></span>
            <span className="bfy-kicker">ONE LAST LOOK</span>
            <h2 id="bfy-confirm-title">Ready to<br />make it happen?</h2>
            <p id="bfy-confirm-copy">
              {category === "food" && selectedDestination
                ? <>Want 50% off <strong>{selectedDestination.name}</strong>? An Eats team member will join your chat to help place the order.</>
                : <>We’ll open a private chat for your <strong>{categoryLabel(category)}</strong> request. Check that your details are right before sending.</>}
            </p>
            <div className="bfy-confirm-summary">
              <span><small>REQUEST FOR</small><strong>{form.name}</strong></span>
              <span><small>WEBSITE</small><strong>{form.siteUrl}</strong></span>
            </div>
            <div className="bfy-modal-actions">
              <Button type="button" className="bfy-confirm-button" disabled={create.isPending} onClick={() => create.mutate()}>
                {create.isPending ? "Sending request…" : <><Check size={17} aria-hidden="true" /> Confirm request</>}
              </Button>
              <button type="button" className="bfy-cancel-button" onClick={() => setConfirmOpen(false)}>Go back and edit</button>
            </div>
            <span className="bfy-confirm-private"><ShieldCheck size={14} aria-hidden="true" /> Your personal details stay private</span>
          </div>
        </div>
      )}
    </main>
  );
}
