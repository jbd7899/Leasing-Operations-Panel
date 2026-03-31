import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
}

export function FeatureCard({ icon: Icon, title, description, className }: FeatureCardProps) {
  return (
    <motion.div
      className={cn(
        "card-glow rounded-2xl border border-border bg-surface p-6 md:p-8",
        className
      )}
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-teal/10">
        <Icon className="h-6 w-6 text-teal-light" />
      </div>
      <h3 className="mb-2 text-lg font-bold text-text-primary">{title}</h3>
      <p className="text-sm leading-relaxed text-text-secondary">{description}</p>
    </motion.div>
  );
}
