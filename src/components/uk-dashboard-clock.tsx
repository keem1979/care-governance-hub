"use client";

import { useEffect, useState } from "react";
import { formatUkDateTime, ukGreeting } from "@/lib/dashboard";

export function UkDashboardClock({
  initialTime,
  firstName,
}: {
  initialTime: string;
  firstName: string;
}) {
  const [now, setNow] = useState(() => new Date(initialTime));

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold tracking-[0.16em] text-emerald-100/75 uppercase">
        <span>Governance overview</span>
        <span aria-hidden="true">•</span>
        <time dateTime={now.toISOString()}>{formatUkDateTime(now)}</time>
      </div>
      <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
        Good {ukGreeting(now)}, {firstName}
      </h1>
    </>
  );
}
