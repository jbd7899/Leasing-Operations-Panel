import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { SectionWrapper } from "@/components/shared/SectionWrapper";
import { GradientText } from "@/components/shared/GradientText";
import { AnimatedCounter } from "@/components/shared/AnimatedCounter";

const data = [
  { week: "W1", leads: 12, qualified: 4 },
  { week: "W2", leads: 18, qualified: 7 },
  { week: "W3", leads: 14, qualified: 5 },
  { week: "W4", leads: 24, qualified: 10 },
  { week: "W5", leads: 20, qualified: 9 },
  { week: "W6", leads: 30, qualified: 13 },
  { week: "W7", leads: 27, qualified: 11 },
  { week: "W8", leads: 35, qualified: 16 },
];

const kpis = [
  { label: "Leads This Month", target: 186, suffix: "", color: "text-teal-light" },
  { label: "Qualification Rate", target: 42, suffix: "%", color: "text-blue-light" },
  { label: "Avg Response Time", target: 2, suffix: " min", color: "text-emerald-400" },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-border bg-navy-light px-4 py-3 shadow-xl">
        <p className="mb-1.5 text-xs font-semibold text-text-muted">{label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} className="text-sm font-bold" style={{ color: p.color }}>
            {p.name}: {p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function AnalyticsSection() {
  return (
    <SectionWrapper id="analytics" background="navy-light" containerClassName="py-24 md:py-32 px-6">
      <div className="mb-14 text-center">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-text-muted">Analytics</p>
        <h2 className="mb-5 text-4xl font-black tracking-tight text-text-primary md:text-5xl lg:text-6xl">
          Data that<br />
          <GradientText>drives decisions.</GradientText>
        </h2>
        <p className="mx-auto max-w-xl text-lg text-text-secondary">
          Real-time insights on every lead, property, and source. Know what's working before you waste another dollar.
        </p>
      </div>

      {/* KPI cards */}
      <div className="mb-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            className="rounded-2xl border border-border bg-surface p-6 text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.12, duration: 0.5 }}
          >
            <div className={`mb-1 text-5xl font-black ${kpi.color}`}>
              <AnimatedCounter target={kpi.target} suffix={kpi.suffix} duration={2} />
            </div>
            <p className="text-sm text-text-muted">{kpi.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Chart */}
      <motion.div
        className="rounded-2xl border border-border bg-surface p-6 md:p-8"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.7, delay: 0.2 }}
      >
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-text-primary">Lead Trend (8 Weeks)</h3>
            <p className="text-sm text-text-muted">Total leads vs. qualified</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-teal-light" />
              <span className="text-text-muted">Leads</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-blue-light" />
              <span className="text-text-muted">Qualified</span>
            </div>
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="gradLeads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14A0A0" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#14A0A0" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradQual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 12, fill: "#64748B" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#64748B" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="leads"
                name="Leads"
                stroke="#14A0A0"
                strokeWidth={2}
                fill="url(#gradLeads)"
                dot={false}
                activeDot={{ r: 5, fill: "#14A0A0" }}
              />
              <Area
                type="monotone"
                dataKey="qualified"
                name="Qualified"
                stroke="#3B82F6"
                strokeWidth={2}
                fill="url(#gradQual)"
                dot={false}
                activeDot={{ r: 5, fill: "#3B82F6" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </SectionWrapper>
  );
}
