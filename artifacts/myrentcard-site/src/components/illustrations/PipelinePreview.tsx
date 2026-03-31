import { motion } from "framer-motion";

const stages = [
  { label: "New", count: 24, color: "bg-blue-light", width: "100%" },
  { label: "Contacted", count: 18, color: "bg-teal-light", width: "75%" },
  { label: "Qualified", count: 9, color: "bg-emerald-400", width: "38%" },
  { label: "Disqualified", count: 6, color: "bg-red-400", width: "25%" },
];

export function PipelinePreview() {
  return (
    <div className="flex h-full flex-col bg-navy px-3 pt-2">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-bold text-text-primary">Pipeline</h3>
        <span className="text-[10px] text-text-muted">Last 30 days</span>
      </div>

      {/* KPIs */}
      <div className="mb-4 grid grid-cols-2 gap-2">
        {[
          { label: "Total Leads", value: "57" },
          { label: "Qualify Rate", value: "38%" },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl bg-surface p-2.5 text-center">
            <div className="text-xl font-black text-teal-light">{kpi.value}</div>
            <div className="text-[8px] text-text-muted">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Funnel */}
      <div className="flex flex-col gap-2">
        {stages.map((stage, i) => (
          <div key={stage.label}>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[10px] font-medium text-text-secondary">{stage.label}</span>
              <span className="text-[10px] font-bold text-text-primary">{stage.count}</span>
            </div>
            <div className="h-2 rounded-full bg-surface overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${stage.color}`}
                initial={{ width: 0 }}
                animate={{ width: stage.width }}
                transition={{ delay: 0.4 + i * 0.15, duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Bottom note */}
      <div className="mt-4 rounded-xl bg-teal/10 border border-teal/20 p-2.5">
        <p className="text-[9px] leading-snug text-teal-light">
          ↑ 12% qualification rate vs. last period
        </p>
      </div>
    </div>
  );
}
