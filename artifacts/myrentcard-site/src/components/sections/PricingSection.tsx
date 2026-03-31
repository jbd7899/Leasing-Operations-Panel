import { useState } from "react";
import { motion } from "framer-motion";
import { Check, ArrowRight, Sparkles } from "lucide-react";
import { SectionWrapper } from "@/components/shared/SectionWrapper";
import { GradientText } from "@/components/shared/GradientText";
import { Button } from "@/components/ui/button";

const perks = [
  "Unified SMS, voice & voicemail inbox",
  "AI data extraction from every conversation",
  "AI-drafted reply suggestions",
  "Lead pipeline (New → Qualified)",
  "Real-time analytics dashboard",
  "Multi-property management",
  "CRM export (AppFolio, CSV)",
  "Team collaboration & roles",
  "Twilio integration wizard",
  "Priority early access support",
];

export function PricingSection() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitted(true);
  };

  return (
    <SectionWrapper id="pricing" background="navy" containerClassName="py-24 md:py-32 px-6">
      <div className="mb-14 text-center">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-text-muted">Early Access</p>
        <h2 className="mb-5 text-4xl font-black tracking-tight text-text-primary md:text-5xl lg:text-6xl">
          Be first in line.<br />
          <GradientText>Get founder pricing.</GradientText>
        </h2>
        <p className="mx-auto max-w-lg text-lg text-text-secondary">
          We're onboarding landlords one at a time. Join the waitlist and lock in early-adopter pricing before public launch.
        </p>
      </div>

      <div className="mx-auto max-w-2xl">
        <motion.div
          className="relative rounded-3xl border border-teal/20 bg-surface overflow-hidden"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          {/* Top glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-3/4 bg-gradient-to-r from-transparent via-teal-light to-transparent" />

          <div className="p-8 md:p-12">
            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-teal/10 border border-teal/20 px-4 py-1.5">
              <Sparkles className="h-3.5 w-3.5 text-teal-light" />
              <span className="text-xs font-semibold text-teal-light">Early Adopter — Limited Spots</span>
            </div>

            <div className="mb-8">
              <div className="flex items-end gap-2 mb-1">
                <span className="text-6xl font-black text-text-primary">$49</span>
                <span className="mb-3 text-xl text-text-muted line-through">$99</span>
              </div>
              <p className="text-sm text-text-muted">per month, first 3 months · then standard pricing</p>
            </div>

            {/* Perk list */}
            <ul className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {perks.map((perk) => (
                <li key={perk} className="flex items-start gap-2.5">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal/15">
                    <Check className="h-3 w-3 text-teal-light" />
                  </div>
                  <span className="text-sm text-text-secondary">{perk}</span>
                </li>
              ))}
            </ul>

            {/* Email form */}
            {submitted ? (
              <motion.div
                className="rounded-2xl bg-teal/10 border border-teal/20 p-6 text-center"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="mb-2 text-3xl">🎉</div>
                <h3 className="mb-1 text-lg font-bold text-text-primary">You're on the list!</h3>
                <p className="text-sm text-text-secondary">
                  We'll email you at <strong className="text-teal-light">{email}</strong> when your spot is ready.
                </p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="flex-1 rounded-xl border border-border bg-navy px-4 py-3.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-teal-light/50 focus:ring-2 focus:ring-teal-light/10 transition-all"
                />
                <Button type="submit" size="lg">
                  Join Waitlist
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
            )}

            <p className="mt-4 text-center text-xs text-text-muted">
              No credit card required. No spam. Cancel anytime.
            </p>
          </div>
        </motion.div>
      </div>
    </SectionWrapper>
  );
}
