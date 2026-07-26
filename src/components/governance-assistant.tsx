"use client";

import { ExternalLink, Send, X } from "lucide-react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Message = { id: number; role: "user" | "assistant"; text: string; links?: { label: string; href: string }[] };

export function GovernanceAssistant() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "assistant",
      text: "Hi, I’m Abi. I can show you around, explain how a page works or help you find the right place to complete a task. What would you like to do?",
    },
  ]);
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
      setMessages((current) => [...current, { id: nextMessageId.current++, role: "assistant", text: result.error ?? "Sorry, I couldn’t get that answer just now. Please try once more." }]);
    } else {
      setMessages((current) => [...current, { id: nextMessageId.current++, role: "assistant", text: result.answer, links: result.links }]);
      if (result.navigate && result.links?.[0]?.href) {
        setTimeout(() => { router.push(result.links[0].href); setOpen(false); }, 450);
      }
    }
    setBusy(false);
  }

  return <>
    {open ? <section role="dialog" aria-label="Chat with Abi" className="fixed bottom-4 right-4 z-50 flex h-[min(620px,calc(100vh-2rem))] w-[min(410px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-emerald-900/20 bg-white shadow-2xl">
      <header className="flex items-center justify-between bg-brand-dark px-4 py-3 text-white"><div className="flex items-center gap-3"><Image src="/abi-avatar.png" alt="" width={44} height={44} unoptimized className="size-11 rounded-full border-2 border-white/30 object-cover"/><div><h2 className="text-sm font-bold">Abi</h2><p className="text-xs text-emerald-100/80">Your guide to the Hub</p></div></div><button onClick={() => setOpen(false)} aria-label="Close Abi" className="rounded-lg p-2 hover:bg-white/10"><X size={18}/></button></header>
      <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4" aria-live="polite">{messages.map((message) => <div key={message.id} className={message.role === "user" ? "ml-10" : "mr-6"}><div className={`rounded-2xl px-4 py-3 text-sm ${message.role === "user" ? "bg-emerald-700 text-white" : "border border-slate-200 bg-white text-slate-800"}`}>{message.text}</div>{message.links?.length ? <div className="mt-2 flex flex-wrap gap-2">{message.links.map((item) => <button key={`${message.id}-${item.href}`} onClick={() => { router.push(item.href); setOpen(false); }} className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-left text-xs font-semibold text-emerald-800">{item.label}<ExternalLink size={12}/></button>)}</div> : null}</div>)}{busy ? <div className="mr-20 rounded-2xl border bg-white px-4 py-3 text-sm text-slate-500">Let me check that for you…</div> : null}<div ref={end}/></div>
      {messages.length === 1 ? <div className="flex flex-wrap gap-2 border-t bg-white px-4 pt-3">{["How does this page work?","How do I add evidence?","Open Reports"].map((prompt) => <button key={prompt} onClick={() => ask(prompt)} className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">{prompt}</button>)}</div> : null}
      <form onSubmit={(event) => { event.preventDefault(); const form = event.currentTarget; const input = form.elements.namedItem("question") as HTMLInputElement; ask(input.value); input.value = ""; }} className="flex gap-2 border-t bg-white p-4"><label className="sr-only" htmlFor="assistant-question">Ask Abi</label><input id="assistant-question" name="question" maxLength={500} autoComplete="off" placeholder="Ask Abi about this page…" className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-sm"/><button disabled={busy} aria-label="Send message to Abi" className="grid size-10 place-items-center rounded-xl bg-emerald-700 text-white disabled:opacity-50"><Send size={17}/></button></form>
      <p className="bg-white px-4 pb-3 text-[10px] leading-4 text-slate-500">Abi can help you use the Hub, but she cannot give clinical, legal or regulatory advice. This conversation is not saved.</p>
    </section> : null}
    <button onClick={() => setOpen((value) => !value)} aria-label={open ? "Close Abi" : "Chat with Abi"} className="fixed bottom-5 right-5 z-40 grid size-14 place-items-center overflow-hidden rounded-full bg-emerald-700 text-white shadow-xl transition hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-200">{open ? <X size={23}/> : <Image src="/abi-avatar.png" alt="" width={56} height={56} unoptimized className="size-14 object-cover"/>}</button>
  </>;
}
