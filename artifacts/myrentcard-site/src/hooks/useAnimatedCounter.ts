import { useEffect, useRef, useState } from "react";
import { useInView, useMotionValue, animate } from "framer-motion";

export function useAnimatedCounter(
  target: number,
  duration: number = 2,
  decimals: number = 0
) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const [display, setDisplay] = useState("0");
  const motionValue = useMotionValue(0);

  useEffect(() => {
    if (!isInView) return;

    const controls = animate(motionValue, target, {
      duration,
      ease: "easeOut",
      onUpdate: (v) => {
        setDisplay(v.toFixed(decimals));
      },
    });

    return () => controls.stop();
  }, [isInView, target, duration, decimals, motionValue]);

  return { ref, display };
}
