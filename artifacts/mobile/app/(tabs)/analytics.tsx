import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, G, Circle, Line, Polyline, Text as SvgText } from "react-native-svg";
import {
  useGetAnalyticsOverview,
  type AnalyticsOverview,
  type WeeklyTrendEntry,
} from "@workspace/api-client-react";
import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";

type Period = "7d" | "30d" | "90d" | "all";

const PERIODS: { label: string; value: Period }[] = [
  { label: "7D", value: "7d" },
  { label: "30D", value: "30d" },
  { label: "90D", value: "90d" },
  { label: "All", value: "all" },
];

const SOURCE_COLORS: Record<string, string> = {
  sms: Colors.brand.tealLight,
  voice: Colors.brand.blue,
  voicemail: Colors.brand.accentWarm,
};

const FUNNEL_COLORS: Record<string, string> = {
  new: Colors.brand.blueLight,
  contacted: Colors.brand.tealLight,
  qualified: Colors.brand.accent,
  disqualified: Colors.brand.danger,
};

function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const { theme } = useTheme();
  const total = data.reduce((s, d) => s + d.value, 0);
  const size = 140;
  const radius = 54;
  const cx = size / 2;
  const cy = size / 2;
  const strokeWidth = 22;

  if (total === 0) {
    return (
      <View style={styles.donutEmpty}>
        <Svg width={size} height={size}>
          <Circle cx={cx} cy={cy} r={radius} fill="none" stroke={theme.border} strokeWidth={strokeWidth} />
        </Svg>
        <View style={styles.donutCenterAbsolute}>
          <Text style={[styles.donutCenterLabel, { color: theme.textMuted }]}>No data</Text>
        </View>
      </View>
    );
  }

  let cumulativeAngle = -Math.PI / 2;
  const segments: React.ReactNode[] = [];

  for (const item of data) {
    if (item.value === 0) continue;
    const angle = (item.value / total) * 2 * Math.PI;
    const x1 = cx + radius * Math.cos(cumulativeAngle);
    const y1 = cy + radius * Math.sin(cumulativeAngle);
    const x2 = cx + radius * Math.cos(cumulativeAngle + angle);
    const y2 = cy + radius * Math.sin(cumulativeAngle + angle);
    const largeArc = angle > Math.PI ? 1 : 0;

    segments.push(
      <Path
        key={item.label}
        d={`M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`}
        fill={item.color}
        opacity={0.9}
      />,
    );
    cumulativeAngle += angle;
  }

  return (
    <View style={styles.donutContainer}>
      <View style={styles.donutWrapper}>
        <Svg width={size} height={size}>
          <Circle cx={cx} cy={cy} r={radius} fill="none" stroke={theme.bgCard} strokeWidth={strokeWidth + 4} />
          <G>{segments}</G>
          <Circle cx={cx} cy={cy} r={radius - strokeWidth / 2} fill={theme.bgCard} />
        </Svg>
        <View style={styles.donutCenterAbsolute}>
          <Text style={[styles.donutCenterNumber, { color: theme.text }]}>{total}</Text>
          <Text style={[styles.donutCenterLabel, { color: theme.textMuted }]}>total</Text>
        </View>
      </View>
      <View style={styles.donutLegend}>
        {data.map((d) => (
          <View key={d.label} style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: d.color }]} />
            <Text style={[styles.legendLabel, { color: theme.textSecondary }]}>{d.label}</Text>
            <Text style={[styles.legendValue, { color: theme.text }]}>{d.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function FunnelBars({ funnel }: { funnel: AnalyticsOverview["statusFunnel"] }) {
  const { theme } = useTheme();
  const stages = [
    { key: "new", label: "New" },
    { key: "contacted", label: "Contacted" },
    { key: "qualified", label: "Qualified" },
    { key: "disqualified", label: "Disqualified" },
  ];
  const max = Math.max(...stages.map((s) => funnel[s.key as keyof typeof funnel]), 1);

  return (
    <View style={styles.funnelContainer}>
      {stages.map((s) => {
        const count = funnel[s.key as keyof typeof funnel];
        const pct = count / max;
        const color = FUNNEL_COLORS[s.key];
        return (
          <View key={s.key} style={styles.funnelRow}>
            <Text style={[styles.funnelLabel, { color: theme.textSecondary }]}>{s.label}</Text>
            <View style={[styles.funnelBarBg, { backgroundColor: theme.bgElevated }]}>
              <View style={[styles.funnelBarFill, { width: `${Math.max(pct * 100, count > 0 ? 3 : 0)}%`, backgroundColor: color }]} />
            </View>
            <Text style={[styles.funnelCount, { color: theme.text }]}>{count}</Text>
          </View>
        );
      })}
    </View>
  );
}

function Sparkline({ trend }: { trend: WeeklyTrendEntry[] }) {
  const W = 280;
  const H = 64;
  const PAD = 8;
  const plotW = W - PAD * 2;
  const plotH = H - PAD * 2;

  if (trend.length < 2) {
    return (
      <View style={{ height: H, justifyContent: "center", alignItems: "center" }}>
        <Text style={styles.emptySubtext}>Not enough data for trend</Text>
      </View>
    );
  }

  const max = Math.max(...trend.map((t) => t.count), 1);
  const points = trend.map((t, i) => {
    const x = PAD + (i / (trend.length - 1)) * plotW;
    const y = PAD + plotH - (t.count / max) * plotH;
    return { x, y };
  });

  const pointsStr = points.map((p) => `${p.x},${p.y}`).join(" ");
  const areaPath = [
    `M ${points[0].x} ${H - PAD}`,
    ...points.map((p) => `L ${p.x} ${p.y}`),
    `L ${points[points.length - 1].x} ${H - PAD}`,
    "Z",
  ].join(" ");

  return (
    <Svg width={W} height={H}>
      <Path d={areaPath} fill={Colors.brand.teal} opacity={0.18} />
      <Polyline
        points={pointsStr}
        fill="none"
        stroke={Colors.brand.tealLight}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {points.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={3} fill={Colors.brand.tealLight} />
      ))}
    </Svg>
  );
}

function KpiCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.kpiCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
      <Text style={[styles.kpiValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>{label}</Text>
      {sub ? <Text style={[styles.kpiSub, { color: theme.textMuted }]}>{sub}</Text> : null}
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  const { theme } = useTheme();
  return <Text style={[styles.sectionHeader, { color: theme.textMuted }]}>{title}</Text>;
}

export default function AnalyticsScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<Period>("30d");
  const { data, isLoading, isError, refetch } = useGetAnalyticsOverview(period);

  const sourceData = useMemo(() => {
    if (!data) return [];
    return [
      { label: "SMS", value: data.sourceMix.sms, color: SOURCE_COLORS.sms },
      { label: "Voice", value: data.sourceMix.voice, color: SOURCE_COLORS.voice },
      { label: "Voicemail", value: data.sourceMix.voicemail, color: SOURCE_COLORS.voicemail },
    ].filter((d) => d.value > 0);
  }, [data]);

  const isEmptyState = !isLoading && !isError && data && data.leadVolume.total === 0;

  return (
    <View style={[styles.root, { paddingTop: insets.top, backgroundColor: theme.bg }]}>
      <View style={[styles.headerRow, { borderBottomColor: theme.border }]}>
        <Text style={[styles.screenTitle, { color: theme.text }]}>Activity</Text>
        <View style={styles.periodRow}>
          {PERIODS.map((p) => (
            <Pressable
              key={p.value}
              style={[styles.periodChip, { borderColor: theme.border, backgroundColor: theme.bgCard }, period === p.value && styles.periodChipActive]}
              onPress={() => setPeriod(p.value)}
            >
              <Text style={[styles.periodChipText, { color: theme.textSecondary }, period === p.value && styles.periodChipTextActive]}>
                {p.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {isLoading && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.brand.tealLight} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading analytics…</Text>
        </View>
      )}

      {isError && (
        <View style={styles.centered}>
          <Text style={styles.errorText}>Could not load analytics.</Text>
          <Pressable style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {isEmptyState && (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No leads yet</Text>
          <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
            Once your Twilio numbers receive SMS or calls, lead data will appear here. Add a property and link a Twilio number in Settings to get started.
          </Text>
        </View>
      )}

      {!isLoading && !isError && data && !isEmptyState && (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 100 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <SectionHeader title="Lead Volume" />
          <View style={styles.kpiRow}>
            <KpiCard label="Total Leads" value={data.leadVolume.total} />
            <KpiCard label="This Period" value={data.leadVolume.periodCount} />
          </View>
          <View style={styles.kpiRow}>
            <KpiCard label="Last 7 Days" value={data.leadVolume.last7d} />
            <KpiCard label="Last 30 Days" value={data.leadVolume.last30d} />
          </View>
          <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
            <Text style={[styles.cardLabel, { color: theme.textMuted }]}>4-Week Trend</Text>
            <Sparkline trend={data.leadVolume.weeklyTrend} />
          </View>

          <SectionHeader title="Source Breakdown" />
          <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
            {sourceData.length === 0 ? (
              <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>No interaction sources recorded for this period.</Text>
            ) : (
              <DonutChart data={sourceData} />
            )}
          </View>

          <SectionHeader title="Status Funnel" />
          <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
            <FunnelBars funnel={data.statusFunnel} />
          </View>

          <SectionHeader title="Qualification Rate" />
          <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
            <View style={styles.qualRow}>
              <View style={styles.qualRateRow}>
                <Text style={styles.qualRate}>{data.qualificationRate}%</Text>
                {data.qualificationRateDelta !== null && (
                  <View style={[
                    styles.deltaBadge,
                    data.qualificationRateDelta >= 0 ? styles.deltaBadgePositive : styles.deltaBadgeNegative,
                  ]}>
                    <Text style={[
                      styles.deltaText,
                      data.qualificationRateDelta >= 0 ? styles.deltaTextPositive : styles.deltaTextNegative,
                    ]}>
                      {data.qualificationRateDelta >= 0 ? "+" : ""}{data.qualificationRateDelta}% vs prev
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[styles.qualLabel, { color: theme.textSecondary }]}>of leads reached Qualified status</Text>
            </View>
          </View>

          {data.propertiesRanked.length > 0 && (
            <>
              <SectionHeader title="Properties by Leads" />
              <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                {data.propertiesRanked.map((p, idx) => {
                  const max = data.propertiesRanked[0].count;
                  const pct = max > 0 ? (p.count / max) * 100 : 0;
                  return (
                    <View key={p.propertyId || "unassigned"} style={styles.propRow}>
                      <Text style={[styles.propRank, { color: theme.textMuted }]}>#{idx + 1}</Text>
                      <View style={styles.propInfo}>
                        <Text style={[styles.propName, { color: theme.text }]} numberOfLines={1}>{p.propertyName}</Text>
                        <View style={[styles.propBarBg, { backgroundColor: theme.bgElevated }]}>
                          <View style={[styles.propBarFill, { width: `${pct}%` }]} />
                        </View>
                      </View>
                      <Text style={[styles.propCount, { color: theme.text }]}>{p.count}</Text>
                    </View>
                  );
                })}
              </View>
            </>
          )}

          <SectionHeader title="Export Pipeline" />
          <View style={styles.kpiRow}>
            <KpiCard
              label="Pending Export"
              value={data.exportPipeline.pending}
              sub="queued"
            />
            <KpiCard
              label="Exported (Last 30d)"
              value={data.exportPipeline.exportedLast30d}
              sub="sent to AppFolio"
            />
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.dark.bg,
  },
  headerRow: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.dark.text,
    letterSpacing: -0.3,
  },
  periodRow: {
    flexDirection: "row",
    gap: 4,
  },
  periodChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.bgCard,
  },
  periodChipActive: {
    backgroundColor: Colors.brand.teal,
    borderColor: Colors.brand.teal,
  },
  periodChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.dark.textSecondary,
  },
  periodChipTextActive: {
    color: "#FFFFFF",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
  },
  errorText: {
    color: Colors.brand.danger,
    fontSize: 15,
    fontWeight: "600",
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.brand.teal,
  },
  retryText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 14,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 36,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.dark.text,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    textAlign: "center",
    lineHeight: 19,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 0,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.dark.textMuted,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginTop: 20,
    marginBottom: 8,
  },
  card: {
    backgroundColor: Colors.dark.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 16,
    marginBottom: 4,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.dark.textMuted,
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  kpiRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: Colors.dark.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 16,
    alignItems: "flex-start",
  },
  kpiValue: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.dark.text,
    letterSpacing: -0.5,
  },
  kpiLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.dark.textSecondary,
    marginTop: 2,
  },
  kpiSub: {
    fontSize: 10,
    color: Colors.dark.textMuted,
    marginTop: 2,
  },
  donutContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  donutWrapper: {
    position: "relative",
    width: 140,
    height: 140,
    alignItems: "center",
    justifyContent: "center",
  },
  donutEmpty: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    width: 140,
    height: 140,
  },
  donutCenterAbsolute: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  donutCenterNumber: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.dark.text,
  },
  donutCenterLabel: {
    fontSize: 11,
    color: Colors.dark.textMuted,
    fontWeight: "500",
  },
  donutLegend: {
    flex: 1,
    gap: 10,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    flex: 1,
    fontSize: 13,
    color: Colors.dark.textSecondary,
    fontWeight: "500",
  },
  legendValue: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.dark.text,
  },
  funnelContainer: {
    gap: 10,
  },
  funnelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  funnelLabel: {
    width: 82,
    fontSize: 12,
    fontWeight: "600",
    color: Colors.dark.textSecondary,
  },
  funnelBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.dark.bgElevated,
    borderRadius: 4,
    overflow: "hidden",
  },
  funnelBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  funnelCount: {
    width: 30,
    fontSize: 12,
    fontWeight: "700",
    color: Colors.dark.text,
    textAlign: "right",
  },
  qualRow: {
    alignItems: "flex-start",
    gap: 4,
  },
  qualRateRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  qualRate: {
    fontSize: 42,
    fontWeight: "800",
    color: Colors.brand.tealLight,
    letterSpacing: -1,
  },
  qualLabel: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    fontWeight: "500",
  },
  deltaBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 6,
  },
  deltaBadgePositive: {
    backgroundColor: "rgba(16,185,129,0.15)",
  },
  deltaBadgeNegative: {
    backgroundColor: "rgba(239,68,68,0.15)",
  },
  deltaText: {
    fontSize: 12,
    fontWeight: "700",
  },
  deltaTextPositive: {
    color: Colors.brand.accent,
  },
  deltaTextNegative: {
    color: Colors.brand.danger,
  },
  propRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  propRank: {
    width: 28,
    fontSize: 11,
    fontWeight: "700",
    color: Colors.dark.textMuted,
  },
  propInfo: {
    flex: 1,
    gap: 4,
  },
  propName: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.dark.text,
  },
  propBarBg: {
    height: 5,
    backgroundColor: Colors.dark.bgElevated,
    borderRadius: 3,
    overflow: "hidden",
  },
  propBarFill: {
    height: "100%",
    backgroundColor: Colors.brand.teal,
    borderRadius: 3,
  },
  propCount: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.dark.text,
    width: 32,
    textAlign: "right",
  },
});
