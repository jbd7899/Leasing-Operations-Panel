import { motion } from "framer-motion";
import { Inbox, Sparkles, TrendingUp, Users } from "lucide-react";

const features = [
  {
    icon: Inbox,
    title: "Unified Inbox",
    desc: "SMS, calls, and voicemail from all your properties in one place. Never miss an inquiry again.",
    color: "bg-teal/10 text-teal-light",
  },
  {
    icon: Sparkles,
    title: "AI Auto-Extraction",
    desc: "Every message is read by AI. Move-in date, budget, pets, income — filled in automatically.",
    color: "bg-blue/10 text-blue-light",
  },
  {
    icon: TrendingUp,
    title: "Lead Pipeline",
    desc: "Track every prospect from New to Qualified. See your conversion rate and exactly where leads drop off.",
    color: "bg-emerald-500/10 text-emerald-400",
  },
  {
    icon: Users,
    title: "Team + Multi-Property",
    desc: "Add team members, manage multiple properties, export to AppFolio or CSV — all built in.",
    color: "bg-purple-500/10 text-purple-400",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="w-full bg-navy-light py-20 px-6">
      <div className="mx-auto max-w-6xl">
        <motion.div
          className="mb-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl font-black tracking-tight text-text-primary sm:text-4xl md:text-5xl">
            Everything you need.<br />
            <span className="gradient-text">Nothing you don't.</span>
          </h2>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              className="rounded-2xl border border-border bg-surface p-6"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              whileHover={{ y: -4, transition: { type: "spring", stiffness: 300 } }}
            >
              <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl ${f.color}`}>
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mb-2 text-base font-bold text-text-primary">{f.title}</h3>
              <p className="text-sm leading-relaxed text-text-secondary">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
