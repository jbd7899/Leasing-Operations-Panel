import { motion } from "framer-motion";

const messages = [
  {
    name: "Sarah Johnson",
    time: "2m ago",
    text: "Hi, I'm interested in the 2BR on Oak St. Is it still available?",
    type: "SMS" as const,
    status: "New",
  },
  {
    name: "Marcus Lee",
    time: "15m ago",
    text: "I can do a showing tomorrow at 3pm. Does that work?",
    type: "SMS" as const,
    status: "Contacted",
  },
  {
    name: "Emily Torres",
    time: "1h ago",
    text: "Voicemail: Looking for a pet-friendly unit, budget $1,800...",
    type: "Voicemail" as const,
    status: "New",
  },
  {
    name: "David Kim",
    time: "2h ago",
    text: "Just confirming move-in date for April 1st. Thanks!",
    type: "SMS" as const,
    status: "Qualified",
  },
];

const statusColors: Record<string, string> = {
  New: "bg-blue/20 text-blue-light",
  Contacted: "bg-teal/20 text-teal-light",
  Qualified: "bg-emerald-500/20 text-emerald-400",
};

const typeColors: Record<string, string> = {
  SMS: "bg-teal/10 text-teal-light",
  Voicemail: "bg-amber-500/10 text-amber-400",
};

export function InboxPreview() {
  return (
    <div className="flex h-full flex-col bg-navy px-3 pt-2">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-bold text-text-primary">Inbox</h3>
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-teal text-[10px] font-bold text-white">
          4
        </div>
      </div>

      {/* Search */}
      <div className="mb-3 rounded-lg bg-surface px-3 py-2">
        <span className="text-[10px] text-text-muted">Search conversations...</span>
      </div>

      {/* Filter chips */}
      <div className="mb-3 flex gap-1.5">
        <div className="rounded-full bg-teal/20 px-2.5 py-0.5 text-[9px] font-medium text-teal-light">All</div>
        <div className="rounded-full bg-surface px-2.5 py-0.5 text-[9px] font-medium text-text-muted">SMS</div>
        <div className="rounded-full bg-surface px-2.5 py-0.5 text-[9px] font-medium text-text-muted">Voice</div>
        <div className="rounded-full bg-surface px-2.5 py-0.5 text-[9px] font-medium text-text-muted">VM</div>
      </div>

      {/* Messages */}
      <div className="flex flex-col gap-2">
        {messages.map((msg, i) => (
          <motion.div
            key={msg.name}
            className="rounded-xl border border-border bg-surface p-2.5"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.15, duration: 0.4 }}
          >
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-text-primary">{msg.name}</span>
              <span className="text-[8px] text-text-muted">{msg.time}</span>
            </div>
            <p className="mb-1.5 text-[9px] leading-snug text-text-secondary line-clamp-2">
              {msg.text}
            </p>
            <div className="flex gap-1.5">
              <span className={`rounded-full px-1.5 py-0.5 text-[7px] font-medium ${typeColors[msg.type]}`}>
                {msg.type}
              </span>
              <span className={`rounded-full px-1.5 py-0.5 text-[7px] font-medium ${statusColors[msg.status]}`}>
                {msg.status}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
