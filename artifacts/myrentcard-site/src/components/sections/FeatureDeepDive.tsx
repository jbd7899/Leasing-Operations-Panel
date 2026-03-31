import { motion } from "framer-motion";
import { Sparkles, MessageSquare, TrendingUp, Check } from "lucide-react";
import { PhoneMockup } from "@/components/shared/PhoneMockup";
import { AIExtractPreview } from "@/components/illustrations/AIExtractPreview";
import { AIDraftPreview } from "@/components/illustrations/AIDraftPreview";
import { PipelinePreview } from "@/components/illustrations/PipelinePreview";
import { GradientText } from "@/components/shared/GradientText";

const features = [
  {
    id: "ai-extract",
    overline: "AI Data Extraction",
    icon: Sparkles,
    iconColor: "text-teal-light",
    iconBg: "bg-teal/10",
    headline: "Zero manual data entry. Ever.",
    description:
      "The moment a prospect texts you, MyRentCard's AI reads the conversation and automatically fills in their move-in date, budget, bedroom count, pet info, income, and more. No forms. No spreadsheets.",
    bullets: [
      "Extracts 10+ data fields from every message",
      "Flags conflicts when data changes over time",
      "98% average extraction confidence",
      "Works on SMS, calls, and voicemail transcripts",
    ],
    illustration: <AIExtractPreview />,
    flip: false,
  },
  {
    id: "ai-drafts",
    overline: "AI Smart Replies",
    icon: MessageSquare,
    iconColor: "text-blue-light",
    iconBg: "bg-blue/10",
    headline: "Reply in seconds, not hours.",
    description:
      "Never stare at a blank text box again. MyRentCard generates a contextual, personalized response based on the full conversation history and prospect profile — ready for you to edit and send in one tap.",
    bullets: [
      "Drafts tailored to each prospect's situation",
      "Knows showing availability, unit details, and next steps",
      "Edit before sending — you're always in control",
      "Matches your communication tone",
    ],
    illustration: <AIDraftPreview />,
    flip: true,
  },
  {
    id: "pipeline",
    overline: "Lead Pipeline",
    icon: TrendingUp,
    iconColor: "text-emerald-400",
    iconBg: "bg-emerald-500/10",
    headline: "Know exactly where every lead stands.",
    description:
      "Track every prospect from first inquiry to signed lease. Visual funnel metrics show your conversion rates at every stage so you can see exactly where you're losing leads — and fix it.",
    bullets: [
      "New → Contacted → Qualified → Disqualified",
      "Qualification rate tracking with period-over-period delta",
      "Filter and search across all properties",
      "One-click export to AppFolio or CSV",
    ],
    illustration: <PipelinePreview />,
    flip: false,
  },
];

export function FeatureDeepDive() {
  return (
    <section id="features" className="bg-navy">
      {features.map((feature, idx) => (
        <div
          key={feature.id}
          className={`relative py-24 md:py-32 px-6 ${idx % 2 === 1 ? "bg-navy-light" : "bg-navy"}`}
        >
          {/* Subtle glow */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div
              className={`absolute h-[500px] w-[500px] rounded-full blur-[150px] opacity-30 ${
                idx % 2 === 0 ? "bg-teal/10 top-1/2 left-0 -translate-y-1/2 -translate-x-1/3" : "bg-blue/10 top-1/2 right-0 -translate-y-1/2 translate-x-1/3"
              }`}
            />
          </div>

          <div className="relative mx-auto max-w-7xl">
            <div
              className={`flex flex-col gap-16 items-center ${
                feature.flip ? "lg:flex-row-reverse" : "lg:flex-row"
              }`}
            >
              {/* Text side */}
              <motion.div
                className="flex-1 max-w-xl"
                initial={{ opacity: 0, x: feature.flip ? 40 : -40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.7 }}
              >
                <div className="mb-5 flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${feature.iconBg}`}>
                    <feature.icon className={`h-5 w-5 ${feature.iconColor}`} />
                  </div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-text-muted">
                    {feature.overline}
                  </p>
                </div>

                <h2 className="mb-5 text-3xl font-black tracking-tight text-text-primary md:text-4xl lg:text-5xl">
                  {feature.headline}
                </h2>

                <p className="mb-8 text-lg leading-relaxed text-text-secondary">
                  {feature.description}
                </p>

                <ul className="flex flex-col gap-3">
                  {feature.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal/15">
                        <Check className="h-3 w-3 text-teal-light" />
                      </div>
                      <span className="text-base text-text-secondary">{b}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>

              {/* Phone side */}
              <motion.div
                className="flex-1 flex justify-center"
                initial={{ opacity: 0, x: feature.flip ? -40 : 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.7, delay: 0.1 }}
              >
                <div className="relative">
                  <div className="absolute inset-0 scale-110 rounded-[50px] bg-teal/8 blur-3xl" />
                  <PhoneMockup>
                    {feature.illustration}
                  </PhoneMockup>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
