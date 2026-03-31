import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Star } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { GradientText } from "@/components/shared/GradientText";
import { PhoneMockup } from "@/components/shared/PhoneMockup";
import { InboxPreview } from "@/components/illustrations/InboxPreview";

export function HeroSection() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const phoneY = useTransform(scrollYProgress, [0, 1], [0, 50]);

  return (
    <section ref={ref} className="relative min-h-screen flex items-center overflow-hidden bg-navy dot-pattern">
      {/* Radial glow bg */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        style={{ y }}
      >
        <div className="absolute top-1/4 left-1/4 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal/8 blur-[120px]" />
        <div className="absolute top-1/3 right-1/4 h-[400px] w-[400px] translate-x-1/2 -translate-y-1/2 rounded-full bg-blue/8 blur-[100px]" />
      </motion.div>

      <div className="relative mx-auto max-w-7xl px-6 py-32 md:py-0 grid md:grid-cols-2 gap-16 items-center">
        {/* Left — copy */}
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          {/* Badge */}
          <motion.div
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal/20 bg-teal/10 px-4 py-1.5"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <Star className="h-3 w-3 fill-teal-light text-teal-light" />
            <span className="text-xs font-semibold text-teal-light">AI-Powered Leasing Intelligence</span>
          </motion.div>

          {/* Headline */}
          <h1 className="mb-6 text-5xl font-black leading-[0.95] tracking-tight sm:text-6xl md:text-7xl lg:text-8xl text-text-primary">
            Stop losing<br />
            <GradientText>rental leads.</GradientText>
          </h1>

          <p className="mb-10 max-w-md text-lg leading-relaxed text-text-secondary">
            MyRentCard unifies your SMS, calls, and voicemail into one AI-powered inbox. Automatically extract prospect data, draft perfect replies, and close more leases — all from your phone.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap gap-4">
            <Button size="lg" asChild>
              <a href="#pricing">
                Get Early Access
                <ArrowRight className="h-5 w-5" />
              </a>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="#features">See How It Works</a>
            </Button>
          </div>

          {/* Social proof */}
          <motion.div
            className="mt-10 flex items-center gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.5 }}
          >
            <div className="flex -space-x-2">
              {["#0D6E6E", "#1A56DB", "#10B981", "#F59E0B"].map((c, i) => (
                <div
                  key={i}
                  className="h-8 w-8 rounded-full border-2 border-navy flex items-center justify-center text-[10px] font-bold text-white"
                  style={{ background: c }}
                >
                  {["J", "M", "A", "D"][i]}
                </div>
              ))}
            </div>
            <p className="text-sm text-text-muted">
              <span className="font-semibold text-text-primary">90+ units</span> already managed
            </p>
          </motion.div>
        </motion.div>

        {/* Right — phone mockup */}
        <motion.div
          className="flex justify-center md:justify-end"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          style={{ y: phoneY }}
        >
          <div className="relative">
            {/* Glow behind phone */}
            <div className="absolute inset-0 scale-110 rounded-[50px] bg-teal/10 blur-3xl" />
            <PhoneMockup tilt>
              <InboxPreview />
            </PhoneMockup>

            {/* Floating badges */}
            <motion.div
              className="absolute -left-10 top-16 rounded-2xl border border-border bg-navy-light/90 backdrop-blur-sm px-3 py-2 shadow-xl"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.2, duration: 0.5 }}
            >
              <p className="text-[10px] text-text-muted">New Lead</p>
              <p className="text-sm font-bold text-text-primary">Sarah Johnson</p>
              <p className="text-[10px] text-teal-light">AI extracted 6 fields</p>
            </motion.div>

            <motion.div
              className="absolute -right-8 bottom-24 rounded-2xl border border-border bg-navy-light/90 backdrop-blur-sm px-3 py-2 shadow-xl"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.5, duration: 0.5 }}
            >
              <p className="text-[10px] text-text-muted">Response drafted</p>
              <p className="text-sm font-bold text-text-primary">In 2 seconds</p>
              <p className="text-[10px] text-emerald-400">AI suggested reply</p>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Scroll hint */}
      <motion.div
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
      >
        <motion.div
          className="h-10 w-6 rounded-full border border-border flex items-start justify-center p-1.5"
          animate={{ y: [0, 4, 0] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
        >
          <div className="h-1.5 w-1 rounded-full bg-teal-light" />
        </motion.div>
      </motion.div>
    </section>
  );
}
