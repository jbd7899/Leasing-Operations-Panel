import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const perks = [
  "Unified SMS, voice & voicemail inbox",
  "AI data extraction — zero manual entry",
  "AI reply drafts in seconds",
  "Lead pipeline & analytics",
  "Multi-property & team support",
  "CRM export (AppFolio, CSV)",
];

export function PricingSection() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  return (
    <section id="pricing" className="w-full bg-navy-light py-20 px-6">
      <div className="mx-auto max-w-6xl">
        <motion.div
          className="grid gap-12 md:grid-cols-2 md:items-center"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
        >
          {/* Left */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-teal-light">Early Access</p>
            <h2 className="mb-4 text-3xl font-black tracking-tight text-text-primary sm:text-4xl md:text-5xl">
              Be first.<br />Get founder pricing.
            </h2>
            <p className="mb-8 text-base text-text-secondary leading-relaxed">
              We're onboarding landlords one at a time. Join the waitlist and lock in half-price for your first 3 months.
            </p>
            <ul className="space-y-3">
              {perks.map((p) => (
                <li key={p} className="flex items-center gap-3 text-sm text-text-secondary">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal/15">
                    <Check className="h-3 w-3 text-teal-light" />
                  </div>
                  {p}
                </li>
              ))}
            </ul>
          </div>

          {/* Right — card */}
          <div className="relative rounded-3xl border border-teal/20 bg-surface overflow-hidden p-8">
            {/* top glow line */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-2/3 bg-gradient-to-r from-transparent via-teal-light to-transparent" />

            <div className="mb-6">
              <div className="flex items-end gap-2 mb-1">
                <span className="text-5xl font-black text-text-primary">$49</span>
                <span className="mb-2 text-lg text-text-muted line-through">$99</span>
              </div>
              <p className="text-sm text-text-muted">/ month · first 3 months · then standard pricing</p>
            </div>

            {submitted ? (
              <motion.div
                className="rounded-2xl bg-teal/10 border border-teal/20 p-6 text-center"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="mb-2 text-2xl">🎉</div>
                <p className="font-bold text-text-primary">You're on the list!</p>
                <p className="mt-1 text-sm text-text-secondary">We'll email <span className="text-teal-light">{email}</span> when your spot opens.</p>
              </motion.div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); if (email) setSubmitted(true); }} className="flex flex-col gap-3">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full rounded-xl border border-border bg-navy px-4 py-3.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-teal-light/50 focus:ring-2 focus:ring-teal/10 transition-all"
                />
                <Button type="submit" size="lg" className="w-full">
                  Join Waitlist
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <p className="text-center text-xs text-text-muted">No credit card. No spam. Cancel anytime.</p>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
