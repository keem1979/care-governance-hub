"use client";

import { FormEvent } from "react";

export function AtomContactForm() {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const subject = `ATOM enquiry from ${String(data.get("name") ?? "Website visitor")}`;
    const body = [
      `Name: ${String(data.get("name") ?? "")}`,
      `Organisation: ${String(data.get("organisation") ?? "")}`,
      `Email: ${String(data.get("email") ?? "")}`,
      `Service interest: ${String(data.get("interest") ?? "")}`,
      "",
      String(data.get("message") ?? ""),
    ].join("\n");
    window.location.href = `mailto:info@atomcom.co.uk?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  return (
    <form className="contact-form" onSubmit={submit}>
      <label>Name<input name="name" autoComplete="name" required /></label>
      <label>Organisation<input name="organisation" autoComplete="organization" /></label>
      <label>Email<input name="email" type="email" autoComplete="email" required /></label>
      <label>What are you interested in?<select name="interest" defaultValue=""><option value="" disabled>Select an option</option><option>Compliance Foundation</option><option>Managed Governance</option><option>Complete Governance Department</option><option>Platform demonstration</option><option>General enquiry</option></select></label>
      <label className="full-field">How can we help?<textarea name="message" rows={6} required /></label>
      <button className="site-button full-field" type="submit">Prepare email enquiry</button>
      <p className="form-note full-field">Submitting opens your email application with the enquiry addressed to info@atomcom.co.uk. Nothing is stored on this website.</p>
    </form>
  );
}
