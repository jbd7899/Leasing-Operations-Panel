import { motion } from "framer-motion";
import { PhoneMockup } from "@/components/shared/PhoneMockup";
import { InboxPreview } from "@/components/illustrations/InboxPreview";
import { SectionWrapper } from "@/components/shared/SectionWrapper";
import { GradientText } from "@/components/shared/GradientText";

const features = [
  { label: "Unified Inbox", color: "bg-teal/10 text-teal-light border-teal/20" },
  { label: "AI Extraction", color: "bg-blue/10 text-blue-light border-blue/20" },
  { label: "Smart Replies", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  { label: "Lead Pipeline", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  { label: "Analytics", color: "bg-amber-400/10 text-amber-400 border-amber-400/20" },
  { label: "Multi-Property", color: "bg-pink-500/10 text-pink-400 border-pink-500/20" },
  { label: "CRM Export", color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
  { label: "Team Collab", color: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
];

export function ProductOverview() {
  return (
    <SectionWrapper id="overview" background="navy" containerClassName="py-24 md:py-32 px-6">
      <div className="mb-16 text-center">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-teal-light">The Solution</p>
        <h2 className="mb-5 text-4xl font-black tracking-tight text-text-primary md:text-5xl lg:text-6xl">
          Everything in<br />
          <GradientText>one place.</GradientText>
        </h2>
        <p className="mx-auto max-w-xl text-lg text-text-secondary">
          One app that handles your entire leasing pipeline — from first text to signed lease.
        </p>
      </div>

      <div className="flex flex-col items-center gap-10 md:flex-row md:items-center md:gap-16 lg:gap-24">
        {/* Left feature pills */}
        <div className="hidden md:flex flex-col gap-3 flex-1 items-end">
          {features.slice(0, 4).map((f, i) => (
            <motion.div
              key={f.label}
              className={`rounded-full border px-4 py-2 text-sm font-semibold ${f.color}`}
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
            >
              {f.label}
            </motion.div>
          ))}
        </div>

        {/* Center — phone */}
        <div className="relative flex justify-center">
          <div className="absolute inset-0 scale-125 rounded-full bg-teal/8 blur-3xl" />
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <PhoneMockup>
              <InboxPreview />
            </PhoneMockup>
          </motion.div>
        </div>

        {/* Right feature pills */}
        <div className="hidden md:flex flex-col gap-3 flex-1 items-start">
          {features.slice(4).map((f, i) => (
            <motion.div
              key={f.label}
              className={`rounded-full border px-4 py-2 text-sm font-semibold ${f.color}`}
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
            >
              {f.label}
            </motion.div>
          ))}
        </div>

        {/* Mobile grid of pills */}
        <div className="flex md:hidden flex-wrap justify-center gap-2">
          {features.map((f) => (
            <div key={f.label} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${f.color}`}>
              {f.label}
            </div>
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
}
