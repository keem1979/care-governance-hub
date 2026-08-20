"use client";

import {
  Bell,
  BookOpenCheck,
  ChevronRight,
  ExternalLink,
  Flag,
  Send,
  ShieldAlert,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  PendingActionNotification,
  WorkforceNotification,
} from "@/lib/assistant-notifications";

type Message = {
  id: number;
  role: "user" | "assistant";
  text: string;
  links?: { label: string; href: string }[];
  interactionId?: string;
  responseClass?: string;
  confidence?: string;
  sources?: { kind: string; label: string; href: string; authority: string; versionLabel?: string; checkedAt?: string }[];
  escalationReference?: string | null;
  feedback?: string;
};

type AtomUpdate = {
  id: string;
  title: string;
  summary: string;
  href: string;
};

type NotificationResponse = {
  pendingCount: number;
  actions: PendingActionNotification[];
  workforceAlertCount: number;
  workforceAlerts: WorkforceNotification[];
  updates: AtomUpdate[];
};

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Europe/London",
});

function readable(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function priorityStyle(priority: PendingActionNotification["priority"]) {
  if (priority === "CRITICAL") return "bg-red-100 text-red-800";
  if (priority === "HIGH") return "bg-orange-100 text-orange-800";
  if (priority === "MEDIUM") return "bg-amber-100 text-amber-800";
  return "bg-slate-100 text-slate-700";
}

export function GovernanceAssistant() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [notifications, setNotifications] =
    useState<NotificationResponse | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "assistant",
      text: "Hi, I’m Abi. I can explain every Hub module, why it matters in health and social care, how it may support CQC evidence, or help you find the right page. What would you like to know?",
    },
  ]);
  const end = useRef<HTMLDivElement>(null);
  const nextMessageId = useRef(2);

  const refreshNotifications = useCallback(async () => {
    setLoadingNotifications(true);
    try {
      const response = await fetch("/api/assistant/notifications", {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Notification request failed.");
      setNotifications((await response.json()) as NotificationResponse);
    } catch {
      setNotifications(null);
    } finally {
      setLoadingNotifications(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/assistant/notifications", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("Notification request failed.");
        return response.json() as Promise<NotificationResponse>;
      })
      .then((result) => {
        if (active) setNotifications(result);
      })
      .catch(() => {
        if (active) setNotifications(null);
      })
      .finally(() => {
        if (active) setLoadingNotifications(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  async function ask(query: string) {
    const text = query.trim();
    if (!text || busy) return;
    setMessages((current) => [
      ...current,
      { id: nextMessageId.current++, role: "user", text },
    ]);
    setBusy(true);
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: text, currentPath: pathname }),
      });
      const result = await response.json().catch(() => ({}));
      setMessages((current) => [
        ...current,
        {
          id: nextMessageId.current++,
          role: "assistant",
          text: response.ok
            ? result.answer
            : (result.error ??
              "Sorry, I couldn’t get that answer just now. Please try once more."),
          links: response.ok ? result.links : undefined,
          interactionId: response.ok ? result.interactionId : undefined,
          responseClass: response.ok ? result.responseClass : undefined,
          confidence: response.ok ? result.confidence : undefined,
          sources: response.ok ? result.sources : undefined,
          escalationReference: response.ok ? result.escalationReference : undefined,
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: nextMessageId.current++,
          role: "assistant",
          text: "I couldn’t connect just now. Please try once more.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function openPage(href: string) {
    router.push(href);
    setOpen(false);
  }

  async function sendFeedback(messageId: number, interactionId: string, rating: "HELPFUL" | "NOT_HELPFUL" | "UNSAFE") {
    const response = await fetch(`/api/assistant/interactions/${interactionId}/feedback`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ rating }) }), result = await response.json().catch(() => ({}));
    if (!response.ok) return;
    setMessages((current) => current.map((message) => message.id === messageId ? { ...message, feedback: rating, escalationReference: result.escalationReference ?? message.escalationReference } : message));
  }

  const pendingCount = notifications?.pendingCount ?? 0;

  return (
    <>
      {open ? (
        <section
          role="dialog"
          aria-label="Chat with Abi"
          className="fixed bottom-4 right-4 z-50 flex h-[min(720px,calc(100vh-2rem))] w-[min(430px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-emerald-900/20 bg-white shadow-2xl"
        >
          <header className="flex items-center justify-between bg-brand-dark px-4 py-3 text-white">
            <div className="flex items-center gap-3">
              <Image
                src="/abi-avatar.png"
                alt=""
                width={44}
                height={44}
                unoptimized
                className="size-11 rounded-full border-2 border-white/30 object-cover"
              />
              <div>
                <h2 className="text-sm font-bold">Abi</h2>
                <p className="text-xs text-emerald-100/80">
                  Your guide to the Hub
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close Abi"
              className="rounded-lg p-2 hover:bg-white/10"
            >
              <X size={18} />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto bg-slate-50">
            <section className="space-y-3 border-b border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <Bell size={17} className="text-emerald-700" />
                <h3 className="text-sm font-bold text-slate-900">
                  Your reminders
                </h3>
              </div>
              {loadingNotifications ? (
                <p className="text-sm text-slate-500">
                  I’m checking your assigned actions…
                </p>
              ) : notifications ? (
                pendingCount ? (
                  <>
                    <p className="text-sm leading-5 text-slate-700">
                      You have{" "}
                      <strong>
                        {pendingCount} pending{" "}
                        {pendingCount === 1 ? "action" : "actions"}
                      </strong>
                      . I’ve listed the most urgent first. Would you like to open
                      one?
                    </p>
                    <div className="space-y-2">
                      {notifications.actions.map((action) => (
                        <article
                          key={action.id}
                          className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                        >
                          <div className="flex flex-wrap items-center gap-1.5">
                            {action.isOverdue ? (
                              <span className="rounded-full bg-red-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                                Overdue
                              </span>
                            ) : null}
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${priorityStyle(action.priority)}`}
                            >
                              {action.priority} priority
                            </span>
                          </div>
                          <p className="mt-2 text-xs font-semibold text-emerald-800">
                            {action.reference}
                          </p>
                          <p className="mt-0.5 text-sm font-semibold text-slate-900">
                            {action.title}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Due {dateFormatter.format(new Date(action.dueDate))}{" "}
                            · {readable(action.status)}
                          </p>
                          <button
                            onClick={() => openPage(action.href)}
                            className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-900"
                          >
                            Open this action <ChevronRight size={13} />
                          </button>
                        </article>
                      ))}
                    </div>
                    {pendingCount > notifications.actions.length ? (
                      <button
                        onClick={() => openPage("/actions")}
                        className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700"
                      >
                        View all {pendingCount} pending actions{" "}
                        <ChevronRight size={13} />
                      </button>
                    ) : null}
                  </>
                ) : (
                  <p className="text-sm text-slate-600">
                    You have no pending actions assigned to you.
                  </p>
                )
              ) : (
                <button
                  onClick={() => void refreshNotifications()}
                  className="text-left text-sm font-semibold text-emerald-700"
                >
                  I couldn’t load your reminders. Try again.
                </button>
              )}

              {notifications?.updates.length ? (
                <details className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
                  <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-bold text-emerald-900">
                    <Sparkles size={15} />
                    What’s new from ATOM
                  </summary>
                  <div className="mt-3 space-y-3">
                    {notifications.updates.map((update) => (
                      <article key={update.id}>
                        <p className="text-sm font-semibold text-slate-900">
                          {update.title}
                        </p>
                        <p className="mt-0.5 text-xs leading-5 text-slate-600">
                          {update.summary}
                        </p>
                        <button
                          onClick={() => openPage(update.href)}
                          className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-emerald-700"
                        >
                          Find out more <ChevronRight size={12} />
                        </button>
                      </article>
                    ))}
                  </div>
                </details>
              ) : null}
              {notifications?.workforceAlertCount ? (
                <details className="rounded-xl border border-amber-200 bg-amber-50/70 p-3">
                  <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-bold text-amber-950">
                    <Bell size={15} />
                    {notifications.workforceAlertCount} workforce{" "}
                    {notifications.workforceAlertCount === 1 ? "alert" : "alerts"}
                  </summary>
                  <p className="mt-2 text-xs leading-5 text-amber-950/75">
                    Expired and upcoming checks, training, competencies,
                    supervision or appraisal.
                  </p>
                  <div className="mt-3 space-y-2">
                    {notifications.workforceAlerts.map((alert) => (
                      <article
                        key={alert.id}
                        className="rounded-lg border border-amber-200 bg-white p-3"
                      >
                        <div className="flex flex-wrap items-center gap-1.5">
                          {alert.isOverdue ? (
                            <span className="rounded-full bg-red-700 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                              Overdue
                            </span>
                          ) : (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-900">
                              Due soon
                            </span>
                          )}
                          <span className="text-[10px] font-bold uppercase text-slate-500">
                            {readable(alert.type)}
                          </span>
                        </div>
                        <p className="mt-2 text-sm font-semibold">{alert.title}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {alert.staffName} · {alert.employeeReference} · due{" "}
                          {dateFormatter.format(new Date(alert.dueDate))}
                        </p>
                        <button
                          onClick={() => openPage(alert.href)}
                          className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-emerald-700"
                        >
                          Open staff record <ChevronRight size={12} />
                        </button>
                      </article>
                    ))}
                  </div>
                </details>
              ) : null}
            </section>

            <div
              className="space-y-3 p-4"
              aria-live="polite"
              aria-relevant="additions"
            >
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={message.role === "user" ? "ml-10" : "mr-6"}
                >
                  <div
                    className={`whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 ${
                      message.role === "user"
                        ? "bg-emerald-700 text-white"
                        : "border border-slate-200 bg-white text-slate-800"
                    }`}
                  >
                    {message.text}
                  </div>
                  {message.links?.length ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {message.links.map((item) => (
                        <button
                          key={`${message.id}-${item.href}`}
                          onClick={() => openPage(item.href)}
                          className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-left text-xs font-semibold text-emerald-800"
                        >
                          {item.label}
                          <ExternalLink size={12} />
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {message.role === "assistant" && message.responseClass ? (
                    <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3">
                      <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-wide">
                        <span className={`rounded-full px-2 py-1 ${message.responseClass === "KNOWN" || message.responseClass === "NAVIGATION" ? "bg-emerald-100 text-emerald-800" : message.responseClass === "UNCERTAIN" ? "bg-amber-100 text-amber-900" : message.responseClass === "PROHIBITED" ? "bg-red-100 text-red-800" : "bg-slate-100 text-slate-700"}`}>{readable(message.responseClass)}</span>
                        <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-800">{readable(message.confidence ?? "NONE")} confidence</span>
                      </div>
                      {message.escalationReference ? <p className="mt-2 flex items-start gap-1.5 text-xs font-bold text-amber-900"><ShieldAlert size={14} className="mt-0.5 shrink-0" />Management escalation {message.escalationReference} was created.</p> : null}
                      {message.sources?.length ? <details className="mt-2"><summary className="flex cursor-pointer items-center gap-1.5 text-xs font-bold text-emerald-800"><BookOpenCheck size={14} />Sources used ({message.sources.length})</summary><div className="mt-2 space-y-2">{message.sources.map((source) => source.href.startsWith("http") ? <a key={`${message.id}-${source.href}`} href={source.href} target="_blank" rel="noreferrer" className="block rounded-lg bg-slate-50 p-2 text-xs"><strong className="text-emerald-800">{source.label} ↗</strong><span className="mt-0.5 block text-slate-500">{source.authority}{source.versionLabel ? ` · ${source.versionLabel}` : ""}{source.checkedAt ? ` · checked ${source.checkedAt}` : ""}</span></a> : <button key={`${message.id}-${source.href}`} onClick={() => openPage(source.href)} className="block w-full rounded-lg bg-slate-50 p-2 text-left text-xs"><strong className="text-emerald-800">{source.label}</strong><span className="mt-0.5 block text-slate-500">{source.authority}{source.versionLabel ? ` · ${source.versionLabel}` : ""}</span></button>)}</div></details> : null}
                      {message.interactionId ? <div className="mt-3 flex items-center gap-1.5 border-t border-slate-100 pt-2"><span className="mr-1 text-[10px] font-bold text-slate-500">Was this safe and useful?</span><button disabled={Boolean(message.feedback)} onClick={() => void sendFeedback(message.id, message.interactionId!, "HELPFUL")} aria-label="Helpful answer" className={`rounded-lg p-1.5 ${message.feedback === "HELPFUL" ? "bg-emerald-100 text-emerald-800" : "text-slate-500 hover:bg-slate-100"}`}><ThumbsUp size={14} /></button><button disabled={Boolean(message.feedback)} onClick={() => void sendFeedback(message.id, message.interactionId!, "NOT_HELPFUL")} aria-label="Not helpful" className={`rounded-lg p-1.5 ${message.feedback === "NOT_HELPFUL" ? "bg-amber-100 text-amber-900" : "text-slate-500 hover:bg-slate-100"}`}><ThumbsDown size={14} /></button><button disabled={Boolean(message.feedback)} onClick={() => void sendFeedback(message.id, message.interactionId!, "UNSAFE")} aria-label="Flag unsafe answer" className={`rounded-lg p-1.5 ${message.feedback === "UNSAFE" ? "bg-red-100 text-red-800" : "text-slate-500 hover:bg-slate-100"}`}><Flag size={14} /></button></div> : null}
                    </div>
                  ) : null}
                </div>
              ))}
              {busy ? (
                <div className="mr-20 rounded-2xl border bg-white px-4 py-3 text-sm text-slate-500">
                  Let me check that for you…
                </div>
              ) : null}
              <div ref={end} />
            </div>
          </div>

          {messages.length === 1 ? (
            <div className="flex flex-wrap gap-2 border-t bg-white px-4 pt-3">
              {[
                "How does this page work?",
                "Why does this matter for CQC?",
                "What are the five CQC questions?",
              ].map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => ask(prompt)}
                  className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800"
                >
                  {prompt}
                </button>
              ))}
            </div>
          ) : null}

          <form
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const input = form.elements.namedItem(
                "question",
              ) as HTMLInputElement;
              void ask(input.value);
              input.value = "";
            }}
            className="flex gap-2 border-t bg-white p-4"
          >
            <label className="sr-only" htmlFor="assistant-question">
              Ask Abi
            </label>
            <input
              id="assistant-question"
              name="question"
              maxLength={500}
              autoComplete="off"
              placeholder="Ask Abi about this page…"
              className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
            />
            <button
              disabled={busy}
              aria-label="Send message to Abi"
              className="grid size-10 place-items-center rounded-xl bg-emerald-700 text-white disabled:opacity-50"
            >
              <Send size={17} />
            </button>
          </form>
          <p className="bg-white px-4 pb-3 text-[10px] leading-4 text-slate-500">
            Abi uses controlled QCGMS guidance and named official sources. She
            cannot give clinical or legal advice, certify compliance or predict
            a CQC rating. Each question, answer class, source and feedback decision
            is audited; contact details and identifiers are redacted before storage.
          </p>
        </section>
      ) : null}

      <button
        onClick={() => {
          const nextOpen = !open;
          setOpen(nextOpen);
          if (nextOpen) void refreshNotifications();
        }}
        aria-label={
          open
            ? "Close Abi"
            : pendingCount
              ? `Chat with Abi. ${pendingCount} pending actions.`
              : "Chat with Abi"
        }
        className="fixed bottom-5 right-5 z-40 grid size-14 place-items-center rounded-full bg-emerald-700 text-white shadow-xl transition hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-200"
      >
        <span className="size-14 overflow-hidden rounded-full">
          {open ? (
            <span className="grid size-14 place-items-center">
              <X size={23} />
            </span>
          ) : (
            <Image
              src="/abi-avatar.png"
              alt=""
              width={56}
              height={56}
              unoptimized
              className="size-14 object-cover"
            />
          )}
        </span>
        {!open && pendingCount ? (
          <span className="absolute -right-1 -top-1 grid min-w-6 place-items-center rounded-full border-2 border-white bg-red-700 px-1.5 py-0.5 text-xs font-bold text-white">
            {pendingCount > 99 ? "99+" : pendingCount}
          </span>
        ) : null}
      </button>
    </>
  );
}
