import { motion } from "framer-motion";
import { useScrollProgress } from "@/hooks/useScrollProgress";

export function ScrollProgress() {
  const scaleX = useScrollProgress();
  return (
    <motion.div
      className="scroll-progress"
      style={{ scaleX, width: "100%" }}
    />
  );
}
