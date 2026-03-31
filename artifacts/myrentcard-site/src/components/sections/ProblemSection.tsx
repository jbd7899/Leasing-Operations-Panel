import { motion } from "framer-motion";
import { MessageCircle, Database, AlertTriangle } from "lucide-react";
import { SectionWrapper } from "@/components/shared/SectionWrapper";

const problems = [
  {
    icon: MessageCircle,
    title: "Leads scattered everywhere",
    description:
      "Your inquiries come in via text, voicemail, and phone calls — spread across your personal phone, email, and sticky notes. You miss leads. You lose revenue.",
    color: "text-blue-light",
    bg: "bg-blue/10",
  },
  {
    icon: Database,
    title: "Hours wasted on data entry",
    description:
      "Every time a prospect calls, you're manually typing their move-in date, budget, pet situation, and income into a spreadsheet. It's 2025 — this shouldn't exist.",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
  },
  {
    icon: AlertTriangle,
    title: "Slow responses kill deals",
    description:
      "The best prospects are texting multiple landlords at once. If you take 4 hours to reply, they've already toured the competition. Speed closes leases.",
    color: "text-red-400",
    bg: "bg-red-400/10",
  },
];

export function ProblemSection() {
  return (
    <SectionWrapper id="problem" background="navy-light" containerClassName="py-24 md:py-28 px-6">
      <div className="mb-14 text-center">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-text-muted">The Problem</p>
        <h2 className="text-4xl font-black tracking-tight text-text-primary md:text-5xl lg:text-6xl">
          Managing rental leads<br className="hidden md:block" />{" "}
          <span className="text-text-muted">is a mess.</span>
        </h2>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {problems.map((p, i) => (
          <motion.div
            key={p.title}
            className="rounded-2xl border border-border bg-surface p-8"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: i * 0.15, duration: 0.6 }}
            whileHover={{ y: -6, transition: { type: "spring", stiffness: 300 } }}
          >
            <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl ${p.bg}`}>
              <p.icon className={`h-6 w-6 ${p.color}`} />
            </div>
            <h3 className="mb-3 text-xl font-bold text-text-primary">{p.title}</h3>
            <p className="text-sm leading-relaxed text-text-secondary">{p.description}</p>
          </motion.div>
        ))}
      </div>
    </SectionWrapper>
  );
}
