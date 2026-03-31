import { motion } from "framer-motion";
import { Sparkles, Send } from "lucide-react";

export function AIDraftPreview() {
  return (
    <div className="flex h-full flex-col bg-navy px-3 pt-2">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h3 className="text-[11px] font-bold text-text-primary">Sarah Johnson</h3>
          <p className="text-[8px] text-text-muted">+1 (555) 234-5678</p>
        </div>
        <span className="rounded-full bg-teal/20 px-2 py-0.5 text-[7px] font-semibold text-teal-light">
          Qualified
        </span>
      </div>

      {/* Conversation */}
      <div className="mb-3 flex flex-col gap-2">
        {/* Inbound */}
        <div className="max-w-[75%] self-start rounded-2xl rounded-tl-sm bg-surface p-2 border border-border">
          <p className="text-[9px] leading-snug text-text-primary">
            Hi! Is the 2BR on Oak St still available? I'd love to schedule a showing.
          </p>
          <p className="mt-0.5 text-[7px] text-text-muted">10:32 AM</p>
        </div>

        {/* Outbound */}
        <div className="max-w-[75%] self-end rounded-2xl rounded-tr-sm bg-teal p-2">
          <p className="text-[9px] leading-snug text-white">
            Yes, it's still available! I'd love to show it to you. Are you free this weekend?
          </p>
          <p className="mt-0.5 text-[7px] text-teal-light/70">10:35 AM</p>
        </div>

        {/* New inbound */}
        <div className="max-w-[75%] self-start rounded-2xl rounded-tl-sm bg-surface p-2 border border-border">
          <p className="text-[9px] leading-snug text-text-primary">
            Saturday afternoon works! What time?
          </p>
          <p className="mt-0.5 text-[7px] text-text-muted">10:41 AM</p>
        </div>
      </div>

      {/* AI Draft */}
      <div className="rounded-xl border border-teal/30 bg-teal/5 p-2.5 mb-2">
        <div className="mb-1.5 flex items-center gap-1.5">
          <Sparkles className="h-2.5 w-2.5 text-teal-light" />
          <span className="text-[8px] font-semibold text-teal-light">AI Draft</span>
        </div>
        <motion.p
          className="text-[9px] leading-snug text-text-primary"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          "Saturday works great! How does 2:00 PM sound? The address is 142 Oak St. Looking forward to meeting you!"
        </motion.p>
      </div>

      {/* Send bar */}
      <div className="flex items-center gap-2 rounded-xl bg-surface px-2.5 py-2 border border-border">
        <p className="flex-1 text-[9px] text-text-muted">Edit or send as-is...</p>
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-teal">
          <Send className="h-3 w-3 text-white" />
        </div>
      </div>
    </div>
  );
}
