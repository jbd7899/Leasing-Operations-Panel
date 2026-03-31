import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SectionWrapperProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
  background?: "navy" | "navy-light" | "gradient" | "transparent";
  animation?: "fade-up" | "fade-in" | "none";
}

const bgMap = {
  navy: "bg-navy",
  "navy-light": "bg-navy-light",
  gradient: "bg-gradient-to-b from-navy via-navy-light to-navy",
  transparent: "",
};

const animationVariants = {
  "fade-up": {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" } },
  },
  "fade-in": {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.6 } },
  },
  none: {
    hidden: {},
    visible: {},
  },
};

export function SectionWrapper({
  id,
  children,
  className,
  containerClassName,
  background = "navy",
  animation = "fade-up",
}: SectionWrapperProps) {
  return (
    <section id={id} className={cn("relative", bgMap[background], className)}>
      <motion.div
        className={cn("mx-auto max-w-7xl px-6 py-24 md:py-32", containerClassName)}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        variants={animationVariants[animation]}
      >
        {children}
      </motion.div>
    </section>
  );
}
