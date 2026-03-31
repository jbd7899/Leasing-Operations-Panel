import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InboxPreview } from "@/components/illustrations/InboxPreview";

export function HeroSection() {
  return (
    <section className="relative w-full bg-navy">
      {/* Background glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-teal/10 blur-[130px]" />
        <div className="absolute top-1/2 right-0 h-[400px] w-[400px] translate-x-1/3 -translate-y-1/2 rounded-full bg-blue/8 blur-[110px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="flex min-h-screen flex-col justify-center gap-12 py-24 pt-28 md:flex-row md:items-center md:gap-16 md:py-20">

          {/* Left — copy */}
          <motion.div
            className="flex-1"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: "easeOut" }}
          >
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-teal/25 bg-teal/10 px-4 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-light" />
              <span className="text-xs font-semibold text-teal-light">AI-Powered Leasing Intelligence</span>
            </div>

            <h1 className="mb-5 text-5xl font-black leading-[0.93] tracking-tight sm:text-6xl xl:text-7xl text-text-primary">
              Stop losing<br />
              <span className="gradient-text">rental leads.</span>
            </h1>

            <p className="mb-8 max-w-md text-lg leading-relaxed text-text-secondary">
              One inbox for SMS, calls, and voicemail. AI extracts prospect data automatically and drafts replies in seconds.
            </p>

            <div className="flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <a href="#pricing">
                  Get Early Access <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="#features">See Features</a>
              </Button>
            </div>

            <div className="mt-8 flex items-center gap-3">
              <div className="flex -space-x-2">
                {["#0D6E6E","#1A56DB","#10B981","#F59E0B"].map((c, i) => (
                  <div key={i} className="h-8 w-8 rounded-full border-2 border-navy flex items-center justify-center text-[10px] font-bold text-white" style={{ background: c }}>
                    {["J","M","A","D"][i]}
                  </div>
                ))}
              </div>
              <p className="text-sm text-text-muted">
                <span className="font-semibold text-text-primary">90+ units</span> managed today
              </p>
            </div>
          </motion.div>

          {/* Right — phone mockup */}
          <motion.div
            className="flex-shrink-0 flex justify-center md:justify-end"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: "easeOut", delay: 0.15 }}
          >
            <div className="relative">
              {/* Glow behind phone */}
              <div className="absolute inset-[-20%] rounded-full bg-teal/10 blur-3xl" />

              {/* Phone */}
              <div className="relative phone-frame w-[240px] sm:w-[260px]">
                <div className="phone-screen" style={{ aspectRatio: "9/19.5" }}>
                  <div className="phone-notch" />
                  <div className="h-full w-full pt-10 overflow-hidden">
                    <InboxPreview />
                  </div>
                </div>
              </div>

              {/* Floating badge — AI */}
              <motion.div
                className="absolute -left-20 top-20 hidden rounded-xl border border-teal/20 bg-navy-light/95 backdrop-blur-sm px-3 py-2 shadow-xl sm:block"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.1, duration: 0.4 }}
              >
                <p className="text-[9px] text-text-muted">AI extracted</p>
                <p className="text-sm font-bold text-teal-light">6 fields</p>
                <p className="text-[9px] text-text-muted">instantly</p>
              </motion.div>

              {/* Floating badge — speed */}
              <motion.div
                className="absolute -right-16 bottom-24 hidden rounded-xl border border-border bg-navy-light/95 backdrop-blur-sm px-3 py-2 shadow-xl sm:block"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.4, duration: 0.4 }}
              >
                <p className="text-[9px] text-text-muted">Draft ready</p>
                <p className="text-sm font-bold text-text-primary">2 seconds</p>
              </motion.div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
