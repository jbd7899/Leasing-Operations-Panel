import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FooterCTA() {
  return (
    <section className="relative overflow-hidden bg-navy py-32 px-6">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/2 left-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal/10 blur-[120px]" />
      </div>

      <motion.div
        className="relative mx-auto max-w-4xl text-center"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.8 }}
      >
        <p className="mb-5 text-sm font-semibold uppercase tracking-[0.2em] text-teal-light">
          Ready to close more leases?
        </p>
        <h2 className="mb-6 text-5xl font-black tracking-tight text-text-primary md:text-6xl lg:text-7xl">
          Your leasing co-pilot<br />
          is waiting.
        </h2>
        <p className="mx-auto mb-10 max-w-xl text-xl text-text-secondary">
          Stop losing leads to slow responses and manual work. Join MyRentCard and let AI do the heavy lifting.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Button size="lg" asChild>
            <a href="#pricing">
              Get Early Access
              <ArrowRight className="h-5 w-5" />
            </a>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <a href="#features">See Features</a>
          </Button>
        </div>
      </motion.div>
    </section>
  );
}
