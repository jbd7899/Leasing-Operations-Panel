import { motion } from "framer-motion";

const steps = [
  {
    num: "01",
    title: "Prospect texts or calls your Twilio number",
    desc: "Your existing phone number routes through MyRentCard. Every SMS, call, and voicemail lands in your inbox.",
  },
  {
    num: "02",
    title: "AI reads the message and fills in their profile",
    desc: "Move-in date, budget, bedrooms, pets, income — extracted automatically. No typing. No spreadsheets.",
  },
  {
    num: "03",
    title: "Reply with an AI draft in one tap",
    desc: "A contextual reply is generated in seconds. Edit if you want, send when ready. Close the lease.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="w-full bg-navy py-20 px-6">
      <div className="mx-auto max-w-6xl">
        <motion.div
          className="mb-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl font-black tracking-tight text-text-primary sm:text-4xl md:text-5xl">
            How it works.
          </h2>
        </motion.div>

        <div className="relative grid gap-8 md:grid-cols-3">
          {/* Connecting line (desktop) */}
          <div className="absolute top-7 left-[calc(16.67%+1.5rem)] right-[calc(16.67%+1.5rem)] hidden h-px bg-border md:block" />

          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              className="relative"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ delay: i * 0.12, duration: 0.5 }}
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-teal/20 bg-teal/10">
                <span className="text-base font-black text-teal-light">{step.num}</span>
              </div>
              <h3 className="mb-2 text-base font-bold text-text-primary">{step.title}</h3>
              <p className="text-sm leading-relaxed text-text-secondary">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
