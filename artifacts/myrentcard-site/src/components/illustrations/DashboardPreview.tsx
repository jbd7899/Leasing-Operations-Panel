import { AreaChart, Area, XAxis, ResponsiveContainer, Tooltip } from "recharts";

const data = [
  { day: "Mon", leads: 4 },
  { day: "Tue", leads: 7 },
  { day: "Wed", leads: 5 },
  { day: "Thu", leads: 9 },
  { day: "Fri", leads: 12 },
  { day: "Sat", leads: 8 },
  { day: "Sun", leads: 6 },
];

export function DashboardPreview() {
  return (
    <div className="flex h-full flex-col bg-navy px-3 pt-2">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-bold text-text-primary">Activity</h3>
        <div className="flex gap-1">
          {["7D", "30D", "90D"].map((p, i) => (
            <span
              key={p}
              className={`rounded-md px-1.5 py-0.5 text-[8px] font-medium ${
                i === 0
                  ? "bg-teal/20 text-teal-light"
                  : "text-text-muted"
              }`}
            >
              {p}
            </span>
          ))}
        </div>
      </div>

      {/* KPI row */}
      <div className="mb-3 grid grid-cols-3 gap-1.5">
        {[
          { label: "Total", value: "51" },
          { label: "This Wk", value: "12" },
          { label: "Rate", value: "38%" },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-lg bg-surface p-2 text-center">
            <div className="text-base font-black text-text-primary">{kpi.value}</div>
            <div className="text-[7px] text-text-muted">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="rounded-xl bg-surface p-2 border border-border mb-3">
        <p className="mb-1.5 text-[8px] font-medium text-text-muted">Leads this week</p>
        <div className="h-16">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14A0A0" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#14A0A0" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fontSize: 6, fill: "#64748B" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ display: "none" }} />
              <Area
                type="monotone"
                dataKey="leads"
                stroke="#14A0A0"
                strokeWidth={1.5}
                fill="url(#tealGrad)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Source breakdown */}
      <div className="rounded-xl bg-surface p-2.5 border border-border">
        <p className="mb-2 text-[8px] font-medium text-text-muted">Lead Sources</p>
        {[
          { label: "SMS", pct: 58, color: "bg-teal-light" },
          { label: "Voice", pct: 28, color: "bg-blue-light" },
          { label: "Voicemail", pct: 14, color: "bg-amber-400" },
        ].map((s) => (
          <div key={s.label} className="mb-1.5 flex items-center gap-2">
            <span className="w-10 text-[8px] text-text-muted">{s.label}</span>
            <div className="h-1.5 flex-1 rounded-full bg-navy overflow-hidden">
              <div
                className={`h-full rounded-full ${s.color}`}
                style={{ width: `${s.pct}%` }}
              />
            </div>
            <span className="text-[8px] font-bold text-text-primary">{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
