"use client";

import { Bot, ExternalLink, MessageCircle, Send, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Message = { id: number; role: "user" | "assistant"; text: string; links?: { label: string; href: string }[] };

export function GovernanceAssistant() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{ id: 1, role: "assistant", text: "Hello. I’m your Care Governance Assistant. Ask me how any module works, how to complete a task, or tell me which page to open." }]);
  const end = useRef<HTMLDivElement>(null);
  const nextMessageId = useRef(2);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);

  async function ask(query: string) {
    const text = query.trim();
    if (!text || busy) return;
    const userMessage: Message = { id: nextMessageId.current++, role: "user", text };
    setMessages((current) => [...current, userMessage]);
    setBusy(true);
    const response = await fetch("/api/assistant", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: text, currentPath: pathname }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessages((current) => [...current, { id: nextMessageId.current++, role: "assistant", text: result.error ?? "I could not answer that question. Please try again." }]);
    } else {
      setMessages((current) => [...current, { id: nextMessageId.current++, role: "assistant", text: result.answer, links: result.links }]);
      if (result.navigate && result.links?.[0]?.href) {
        setTimeout(() => { router.push(result.links[0].href); setOpen(false); }, 450);
      }
    }
    setBusy(false);
  }

  return <>
    {open ? <section role="dialog" aria-label="Care Governance Assistant" className="fixed bottom-4 right-4 z-50 flex h-[min(620px,calc(100vh-2rem))] w-[min(410px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-emerald-900/20 bg-white shadow-2xl">
      <header className="flex items-center justify-between bg-brand-dark px-4 py-3 text-white"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-white/10"><Bot size={20}/></span><div><h2 className="text-sm font-bold">Care Governance Assistant</h2><p className="text-xs text-emerald-100/70">System guidance and navigation</p></div></div><button onClick={() => setOpen(false)} aria-label="Close assistant" className="rounded-lg p-2 hover:bg-white/10"><X size={18}/></button></header>
      <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4" aria-live="polite">{messages.map((message) => <div key={message.id} className={message.role === "user" ? "ml-10" : "mr-6"}><div className={`rounded-2xl px-4 py-3 text-sm ${message.role === "user" ? "bg-emerald-700 text-white" : "border border-slate-200 bg-white text-slate-800"}`}>{message.text}</div>{message.links?.length ? <div className="mt-2 flex flex-wrap gap-2">{message.links.map((item) => <button key={`${message.id}-${item.href}`} onClick={() => { router.push(item.href); setOpen(false); }} className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-left text-xs font-semibold text-emerald-800">{item.label}<ExternalLink size={12}/></button>)}</div> : null}</div>)}{busy ? <div className="mr-20 rounded-2xl border bg-white px-4 py-3 text-sm text-slate-500">Finding the right guidance…</div> : null}<div ref={end}/></div>
      {messages.length === 1 ? <div className="flex flex-wrap gap-2 border-t bg-white px-4 pt-3">{["How does this page work?","How do I add evidence?","Open Reports"].map((prompt) => <button key={prompt} onClick={() => ask(prompt)} className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">{prompt}</button>)}</div> : null}
      <form onSubmit={(event) => { event.preventDefault(); const form = event.currentTarget; const input = form.elements.namedItem("question") as HTMLInputElement; ask(input.value); input.value = ""; }} className="flex gap-2 border-t bg-white p-4"><label className="sr-only" htmlFor="assistant-question">Ask the assistant</label><input id="assistant-question" name="question" maxLength={500} autoComplete="off" placeholder="Ask about any module…" className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-sm"/><button disabled={busy} aria-label="Send question" className="grid size-10 place-items-center rounded-xl bg-emerald-700 text-white disabled:opacity-50"><Send size={17}/></button></form>
      <p className="bg-white px-4 pb-3 text-[10px] text-slate-500">Provides system guidance, not clinical, legal or regulatory advice. Conversations are not stored.</p>
    </section> : null}
    <button onClick={() => setOpen((value) => !value)} aria-label={open ? "Close Care Governance Assistant" : "Open Care Governance Assistant"} className="fixed bottom-5 right-5 z-40 grid size-14 place-items-center rounded-full bg-emerald-700 text-white shadow-xl transition hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-200">{open ? <X size={23}/> : <MessageCircle size={24}/>}</button>
  </>;
}
