import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { MessageCircle, RefreshCw, Send } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type ChatSession = { id: number; customerName: string };
type ChatMessage = { id: number; senderRole: string; message: string; createdAt: string };

const formatTime = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

export default function BuyForYouPage() {
  const { toast } = useToast();
  const [activeId, setActiveId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const initStarted = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const startChat = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/buy-for-you/chat", {});
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "Could not open your Eats chat.");
      return result as ChatSession;
    },
    onSuccess: (chat) => {
      setActiveId(chat.id);
      queryClient.invalidateQueries({ queryKey: ["/api/buy-for-you"] });
    },
    onError: (error: Error) => toast({
      title: "Chat unavailable",
      description: error.message,
      variant: "destructive",
    }),
  });

  useEffect(() => {
    if (!initStarted.current) {
      initStarted.current = true;
      startChat.mutate();
    }
  }, [startChat.mutate]);

  const messages = useQuery<ChatMessage[]>({
    queryKey: ["/api/buy-for-you", activeId, "messages"],
    queryFn: async () => {
      const response = await fetch(`/api/buy-for-you/${activeId}/messages`, { credentials: "include" });
      if (!response.ok) throw new Error("Could not load your chat.");
      return response.json();
    },
    enabled: !!activeId,
    refetchInterval: 5000,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.data?.length]);

  const send = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/buy-for-you/${activeId}/messages`, { message: message.trim() });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "Message could not be sent.");
      return result;
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/buy-for-you", activeId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/buy-for-you"] });
    },
    onError: (error: Error) => toast({
      title: "Message failed",
      description: error.message,
      variant: "destructive",
    }),
  });

  const submitMessage = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (activeId && message.trim() && !send.isPending) send.mutate();
  };

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-5rem)] max-w-4xl flex-col px-4 py-5 pb-12 text-foreground sm:px-6 sm:py-8">
      <header className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[.18em] text-primary">Private support</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Eats</h1>
        <p className="mt-2 text-sm text-muted-foreground">Chat directly with our Eats team.</p>
      </header>

      <section className="flex min-h-[min(680px,calc(100dvh-190px))] flex-1 flex-col overflow-hidden rounded-2xl border border-border/80 bg-card/60 shadow-xl" aria-label="Eats chat">
        <header className="flex items-center gap-3 border-b border-border/70 px-4 py-4 sm:px-5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary" aria-hidden="true">
            <MessageCircle className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-bold">Eats team</h2>
            <p className="text-xs text-muted-foreground">Send a message to start your conversation.</p>
          </div>
          {messages.isFetching && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Refreshing messages" />}
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-5 sm:px-6" aria-live="polite" aria-label="Chat messages">
          {startChat.isPending && <p className="text-center text-sm text-muted-foreground">Opening your private chat…</p>}
          {startChat.isError && (
            <div className="mx-auto max-w-sm rounded-xl border border-destructive/20 bg-destructive/[.05] p-4 text-center">
              <p className="text-sm font-medium">Could not open your chat.</p>
              <Button type="button" variant="outline" size="sm" className="mt-3 gap-2" onClick={() => startChat.mutate()}>
                <RefreshCw className="h-3.5 w-3.5" /> Try again
              </Button>
            </div>
          )}
          {messages.isLoading && activeId && <p className="text-center text-sm text-muted-foreground">Loading messages…</p>}
          {messages.isError && <p role="alert" className="text-center text-sm text-destructive">Messages could not be loaded. Refresh the page to try again.</p>}
          {!messages.isLoading && !messages.isError && !messages.data?.length && activeId && (
            <div className="grid min-h-64 place-items-center text-center">
              <div>
                <MessageCircle className="mx-auto h-8 w-8 text-primary/60" aria-hidden="true" />
                <p className="mt-3 font-semibold">Your private Eats chat is ready</p>
                <p className="mt-1 text-sm text-muted-foreground">Send a message and a team member will reply here.</p>
              </div>
            </div>
          )}
          {messages.data?.map((item) => (
            <div key={item.id} className={`max-w-[88%] rounded-2xl border px-4 py-3 text-sm ${item.senderRole === "admin" ? "border-border/80 bg-background/70" : "ml-auto border-primary/20 bg-primary/[.08]"}`}>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{item.senderRole === "admin" ? "Eats team" : "You"}</p>
              <p className="whitespace-pre-wrap break-words">{item.message}</p>
              {item.createdAt && <time className="mt-2 block text-right text-[10px] text-muted-foreground">{formatTime(item.createdAt)}</time>}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={submitMessage} className="flex items-end gap-2 border-t border-border/70 p-3 sm:p-4">
          <Textarea
            aria-label="Write a message to the Eats team"
            disabled={!activeId || startChat.isPending}
            maxLength={2000}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                if (activeId && message.trim() && !send.isPending) send.mutate();
              }
            }}
            placeholder="Write a message…"
            className="min-h-11 resize-y bg-background/70"
          />
          <Button type="submit" size="icon" aria-label="Send message" disabled={!activeId || !message.trim() || send.isPending} className="h-11 w-11 shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </section>
    </main>
  );
}
