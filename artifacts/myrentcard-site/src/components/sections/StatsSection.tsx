import { motion } from "framer-motion";
import { SectionWrapper } from "@/components/shared/SectionWrapper";
import { AnimatedCounter } from "@/components/shared/AnimatedCounter";
import { GradientText } from "@/components/shared/GradientText";

const stats = [
  { target: 90, suffix: "+", label: "Units Managed", sub: "By the founder alone, today" },
  { target: 95, suffix: "%", label: "Less Manual Entry", sub: "AI handles the data extraction" },
  { target: 2, suffix: "x", label: "Faster Replies", sub: "AI drafts ready in seconds" },
  { target: 38, suffix: "%", label: "Avg Qualify Rate", sub: "Track and optimize your funnel" },
];

export function StatsSection() {
  return (
    <SectionWrapper id="stats" background="navy-light" containerClassName="py-24 md:py-28 px-6">
      <div className="mb-14 text-center">
        <h2 className="text-4xl font-black tracking-tight text-text-primary md:text-5xl">
          Built by a landlord,<br />
          <GradientText>for landlords.</GradientText>
        </h2>
        <p className="mt-5 mx-auto max-w-lg text-lg text-text-secondary">
          MyRentCard is dogfooded daily on a real portfolio. These aren't made-up numbers.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            className="flex flex-col items-center text-center rounded-2xl border border-border bg-surface p-6 md:p-8"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
          >
            <div className="mb-2 text-4xl font-black text-teal-light md:text-5xl">
              <AnimatedCounter target={stat.target} suffix={stat.suffix} duration={2.5} />
            </div>
            <h3 className="mb-1 text-base font-bold text-text-primary">{stat.label}</h3>
            <p className="text-xs text-text-muted">{stat.sub}</p>
          </motion.div>
        ))}
      </div>
    </SectionWrapper>
  );
}
