import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

const fields = [
  { label: "Move-in Date", value: "April 1, 2025", confidence: 98 },
  { label: "Budget", value: "$1,600 – $1,900/mo", confidence: 95 },
  { label: "Bedrooms", value: "2 BR preferred", confidence: 99 },
  { label: "Pets", value: "1 small dog", confidence: 92 },
  { label: "Income", value: "~$6,200/mo", confidence: 87 },
];

export function AIExtractPreview() {
  return (
    <div className="flex h-full flex-col bg-navy px-3 pt-2">
      {/* Header */}
      <div className="mb-2 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal/20">
          <Sparkles className="h-3.5 w-3.5 text-teal-light" />
        </div>
        <div>
          <h3 className="text-[11px] font-bold text-text-primary">AI Extraction</h3>
          <p className="text-[8px] text-text-muted">From SMS conversation</p>
        </div>
      </div>

      {/* Raw message snippet */}
      <div className="mb-3 rounded-xl bg-surface p-2.5 border border-border">
        <p className="text-[8px] leading-snug text-text-secondary italic">
          "Hi! I'm looking for a 2BR around $1,700. I have a small dog and need to move in April 1st. I make about $75k/year..."
        </p>
      </div>

      {/* Arrow */}
      <div className="mb-2 flex items-center justify-center">
        <div className="flex items-center gap-1.5 rounded-full bg-teal/10 px-3 py-1">
          <Sparkles className="h-2.5 w-2.5 text-teal-light" />
          <span className="text-[8px] font-semibold text-teal-light">AI Extracted</span>
        </div>
      </div>

      {/* Extracted fields */}
      <div className="flex flex-col gap-1.5">
        {fields.map((field, i) => (
          <motion.div
            key={field.label}
            className="flex items-center justify-between rounded-lg bg-surface p-2 border border-border"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + i * 0.1, duration: 0.35 }}
          >
            <div>
              <p className="text-[8px] text-text-muted">{field.label}</p>
              <p className="text-[10px] font-semibold text-text-primary">{field.value}</p>
            </div>
            <div className="text-right">
              <div className="text-[8px] font-bold text-teal-light">{field.confidence}%</div>
              <div className="text-[7px] text-text-muted">conf.</div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
