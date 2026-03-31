import { motion } from "framer-motion";
import { SectionWrapper } from "@/components/shared/SectionWrapper";

const integrations = [
  { name: "Twilio", desc: "SMS & Voice", color: "#F22F46", letter: "T" },
  { name: "AppFolio", desc: "CRM Export", color: "#1652F0", letter: "A" },
  { name: "Supabase", desc: "Auth & Data", color: "#3ECF8E", letter: "S" },
  { name: "OpenAI", desc: "AI Engine", color: "#10A37F", letter: "O" },
];

export function IntegrationStrip() {
  return (
    <SectionWrapper id="integrations" background="navy" containerClassName="py-20 px-6">
      <div className="text-center mb-10">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-text-muted mb-3">Integrations</p>
        <h2 className="text-3xl md:text-4xl font-black text-text-primary">Connects to your tools.</h2>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {integrations.map((intg, i) => (
          <motion.div
            key={intg.name}
            className="flex flex-col items-center rounded-2xl border border-border bg-surface p-6 text-center card-glow"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
            whileHover={{ y: -4 }}
          >
            <div
              className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl font-black text-white"
              style={{ background: intg.color }}
            >
              {intg.letter}
            </div>
            <h3 className="mb-1 text-base font-bold text-text-primary">{intg.name}</h3>
            <p className="text-xs text-text-muted">{intg.desc}</p>
          </motion.div>
        ))}
      </div>
    </SectionWrapper>
  );
}
