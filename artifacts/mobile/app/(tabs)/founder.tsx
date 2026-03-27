import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  TextInput,
  Modal,
  Alert,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";
import { api } from "@/lib/api";

const OBSERVATION_TYPES = [
  { value: "workflow_friction", label: "Workflow Friction" },
  { value: "product_idea", label: "Product Idea" },
  { value: "missed_lead_risk", label: "Missed Lead Risk" },
  { value: "ai_issue", label: "AI Issue" },
  { value: "ui_issue", label: "UI Issue" },
  { value: "customer_value_signal", label: "Customer Value Signal" },
  { value: "future_sales_claim", label: "Future Sales Claim" },
];

const WEEKLY_REFLECTION_PROMPTS = [
  "What friction did you encounter in the lead review workflow this week?",
  "Which leads felt most at risk of being lost or mishandled?",
  "Were there any AI extraction errors that surprised you?",
  "What would have made the product more useful this week?",
  "Did any lead outcomes confirm product value you can use in sales conversations?",
  "What did you learn about how renters communicate their needs?",
  "What is the single most important thing to fix or build next?",
];

interface Observation {
  id: string;
  observationType: string;
  title: string;
  body: string;
  createdAt: string;
  prospectId?: string | null;
  propertyId?: string | null;
  weekLabel?: string | null;
}

interface ObservationsData {
  observations: Observation[];
  recurringTypes: { type: string; count: number }[];
}

function ObservationTypeBadge({ type }: { type: string }) {
  const { theme } = useTheme();
  const colors: Record<string, string> = {
    workflow_friction: "#F59E0B",
    product_idea: Colors.brand.tealLight,
    missed_lead_risk: Colors.brand.danger,
    ai_issue: Colors.brand.blue,
    ui_issue: "#8B5CF6",
    customer_value_signal: Colors.brand.accent,
    future_sales_claim: "#10B981",
  };
  const color = colors[type] ?? theme.textMuted;
  const label = OBSERVATION_TYPES.find((t) => t.value === type)?.label ?? type;
  return (
    <View style={[styles.typeBadge, { borderColor: color }]}>
      <Text style={[styles.typeBadgeText, { color }]}>{label}</Text>
    </View>
  );
}

function AddObservationModal({
  visible,
  onClose,
  onSaved,
}: {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { theme } = useTheme();
  const [type, setType] = useState("workflow_friction");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setType("workflow_friction");
    setTitle("");
    setBody("");
  };

  const handleSave = async () => {
    if (!title.trim() || !body.trim()) {
      Alert.alert("Missing fields", "Please fill in title and body.");
      return;
    }
    setSaving(true);
    try {
      await api.post("/founder/observations", { observationType: type, title: title.trim(), body: body.trim() });
      reset();
      onSaved();
      onClose();
    } catch (err) {
      Alert.alert("Error", "Failed to save observation. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.modalRoot, { backgroundColor: theme.bg }]}>
        <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
          <Text style={[styles.modalTitle, { color: theme.text }]}>Add Observation</Text>
          <Pressable onPress={onClose}>
            <Feather name="x" size={22} color={theme.textSecondary} />
          </Pressable>
        </View>

        <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
          <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeRow}>
            {OBSERVATION_TYPES.map((t) => (
              <Pressable
                key={t.value}
                style={[styles.typeChip, { borderColor: theme.border, backgroundColor: theme.bgCard }, type === t.value && styles.typeChipActive]}
                onPress={() => setType(t.value)}
              >
                <Text style={[styles.typeChipText, { color: theme.textSecondary }, type === t.value && styles.typeChipTextActive]}>
                  {t.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Title</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: theme.bgCard, borderColor: theme.border, color: theme.text }]}
            value={title}
            onChangeText={setTitle}
            placeholder="Brief title…"
            placeholderTextColor={theme.textMuted}
            maxLength={255}
          />

          <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Body</Text>
          <TextInput
            style={[styles.textInput, styles.textArea, { backgroundColor: theme.bgCard, borderColor: theme.border, color: theme.text }]}
            value={body}
            onChangeText={setBody}
            placeholder="Describe the observation in detail…"
            placeholderTextColor={theme.textMuted}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />

          <Pressable
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.saveBtnText}>Save Observation</Text>
            )}
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

function WeeklyReflectionModal({
  visible,
  onClose,
  onSaved,
}: {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { theme } = useTheme();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>(new Array(WEEKLY_REFLECTION_PROMPTS.length).fill(""));
  const [saving, setSaving] = useState(false);

  const weekLabel = (() => {
    const d = new Date();
    const year = d.getFullYear();
    const start = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil(((d.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
    return `${year}-W${String(week).padStart(2, "0")}`;
  })();

  const updateAnswer = (text: string) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[step] = text;
      return next;
    });
  };

  const handleNext = () => {
    if (step < WEEKLY_REFLECTION_PROMPTS.length - 1) {
      setStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      const saved: Promise<unknown>[] = [];
      for (let i = 0; i < WEEKLY_REFLECTION_PROMPTS.length; i++) {
        const answer = answers[i]?.trim();
        if (!answer) continue;
        saved.push(
          api.post("/founder/observations", {
            observationType: "workflow_friction",
            title: `Weekly Reflection — Q${i + 1}`,
            body: `Q: ${WEEKLY_REFLECTION_PROMPTS[i]}\nA: ${answer}`,
            weekLabel,
          }),
        );
      }
      await Promise.all(saved);
      setStep(0);
      setAnswers(new Array(WEEKLY_REFLECTION_PROMPTS.length).fill(""));
      onSaved();
      onClose();
    } catch {
      Alert.alert("Error", "Failed to save reflection. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const isLast = step === WEEKLY_REFLECTION_PROMPTS.length - 1;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.modalRoot, { backgroundColor: theme.bg }]}>
        <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
          <Text style={[styles.modalTitle, { color: theme.text }]}>Weekly Reflection</Text>
          <Pressable onPress={onClose}>
            <Feather name="x" size={22} color={theme.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.reflectionProgress}>
          {WEEKLY_REFLECTION_PROMPTS.map((_, i) => (
            <View
              key={i}
              style={[styles.progressDot, { backgroundColor: theme.border }, i <= step && styles.progressDotActive]}
            />
          ))}
        </View>

        <View style={styles.reflectionContent}>
          <Text style={[styles.reflectionStep, { color: theme.textMuted }]}>Question {step + 1} of {WEEKLY_REFLECTION_PROMPTS.length}</Text>
          <Text style={[styles.reflectionPrompt, { color: theme.text }]}>{WEEKLY_REFLECTION_PROMPTS[step]}</Text>
          <TextInput
            style={[styles.textInput, styles.textArea, { marginTop: 16, backgroundColor: theme.bgCard, borderColor: theme.border, color: theme.text }]}
            value={answers[step]}
            onChangeText={updateAnswer}
            placeholder="Write your answer here…"
            placeholderTextColor={theme.textMuted}
            multiline
            numberOfLines={8}
            textAlignVertical="top"
          />
        </View>

        <View style={[styles.reflectionFooter, { borderTopColor: theme.border }]}>
          <Pressable style={[styles.reflectionBtn, styles.reflectionBtnSecondary, { backgroundColor: theme.bgCard, borderColor: theme.border }]} onPress={handleBack} disabled={step === 0}>
            <Text style={[styles.reflectionBtnText, { color: theme.textSecondary }, step === 0 && { opacity: 0.3 }]}>Back</Text>
          </Pressable>
          {isLast ? (
            <Pressable style={[styles.reflectionBtn, styles.reflectionBtnPrimary, saving && styles.saveBtnDisabled]} onPress={handleFinish} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.reflectionBtnTextPrimary}>Finish & Save</Text>}
            </Pressable>
          ) : (
            <Pressable style={[styles.reflectionBtn, styles.reflectionBtnPrimary]} onPress={handleNext}>
              <Text style={styles.reflectionBtnTextPrimary}>Next</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

export default function FounderScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<ObservationsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReflectionModal, setShowReflectionModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"notes" | "analytics">("notes");

  const [dashboardData, setDashboardData] = useState<Record<string, unknown> | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState(false);
  const [aiPerfData, setAiPerfData] = useState<Record<string, unknown> | null>(null);

  const loadObservations = useCallback(async () => {
    try {
      const result = await api.get<ObservationsData>("/founder/observations");
      setData(result);
      setIsError(false);
    } catch {
      setIsError(true);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    setDashboardLoading(true);
    setDashboardError(false);
    try {
      const [dash, aiPerf] = await Promise.all([
        api.get<Record<string, unknown>>("/founder/dashboard"),
        api.get<Record<string, unknown>>("/founder/ai-performance"),
      ]);
      setDashboardData(dash);
      setAiPerfData(aiPerf);
    } catch {
      setDashboardError(true);
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadObservations();
      loadDashboard();
    }, [loadObservations, loadDashboard]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadObservations();
    loadDashboard();
  };

  const summary = dashboardData?.summary as Record<string, unknown> | undefined;
  const funnel = dashboardData?.funnel as Record<string, number> | undefined;
  const aiPerf = dashboardData?.aiPerformance as Record<string, unknown> | undefined;
  const friction = dashboardData?.workflowFriction as Record<string, unknown> | undefined;
  const exportPipeline = dashboardData?.exportPipeline as Record<string, unknown> | undefined;
  const propertyPerf = dashboardData?.propertyPerformance as Array<Record<string, unknown>> | undefined;
  const aiPerfDetail = aiPerfData as Record<string, unknown> | undefined;

  return (
    <View style={[styles.root, { paddingTop: insets.top, backgroundColor: theme.bg }]}>
      <View style={[styles.headerRow, { borderBottomColor: theme.border }]}>
        <View>
          <Text style={[styles.screenTitle, { color: theme.text }]}>Founder</Text>
          <Text style={[styles.screenSub, { color: theme.textMuted }]}>Internal analytics & notes</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable style={styles.actionBtn} onPress={() => setShowReflectionModal(true)}>
            <Feather name="edit-3" size={16} color={Colors.brand.tealLight} />
            <Text style={styles.actionBtnText}>Reflect</Text>
          </Pressable>
          <Pressable style={[styles.actionBtn, styles.actionBtnPrimary]} onPress={() => setShowAddModal(true)}>
            <Feather name="plus" size={16} color="#FFF" />
            <Text style={styles.actionBtnTextPrimary}>Note</Text>
          </Pressable>
        </View>
      </View>

      <View style={[styles.tabRow, { borderBottomColor: theme.border }]}>
        <Pressable
          style={[styles.tab, activeTab === "notes" && [styles.tabActive, { backgroundColor: theme.bgCard, borderColor: theme.border }]]}
          onPress={() => setActiveTab("notes")}
        >
          <Text style={[styles.tabText, { color: theme.textSecondary }, activeTab === "notes" && [styles.tabTextActive, { color: theme.text }]]}>Observations</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === "analytics" && [styles.tabActive, { backgroundColor: theme.bgCard, borderColor: theme.border }]]}
          onPress={() => setActiveTab("analytics")}
        >
          <Text style={[styles.tabText, { color: theme.textSecondary }, activeTab === "analytics" && [styles.tabTextActive, { color: theme.text }]]}>Analytics</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.brand.tealLight} />}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "notes" && (
          <>
            {isLoading && (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color={Colors.brand.tealLight} />
              </View>
            )}
            {isError && !isLoading && (
              <View style={styles.centered}>
                <Text style={styles.errorText}>Could not load observations.</Text>
                <Pressable style={styles.retryBtn} onPress={loadObservations}>
                  <Text style={styles.retryText}>Retry</Text>
                </Pressable>
              </View>
            )}
            {!isLoading && !isError && data && (
              <>
                {data.recurringTypes.length > 0 && (
                  <View style={styles.section}>
                    <Text style={[styles.sectionHeader, { color: theme.textMuted }]}>Recurring Issues</Text>
                    <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                      {data.recurringTypes.map((t) => (
                        <View key={t.type} style={styles.recurringRow}>
                          <ObservationTypeBadge type={t.type} />
                          <Text style={[styles.recurringCount, { color: theme.textSecondary }]}>{t.count}x</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                <Text style={[styles.sectionHeader, { color: theme.textMuted }]}>Latest Observations</Text>
                {data.observations.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Feather name="clipboard" size={32} color={theme.textMuted} />
                    <Text style={[styles.emptyTitle, { color: theme.text }]}>No observations yet</Text>
                    <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
                      Tap "Note" to capture friction, ideas, or product signals as you use the app.
                    </Text>
                  </View>
                ) : (
                  data.observations.map((obs) => (
                    <View key={obs.id} style={[styles.observationCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                      <View style={styles.observationHeader}>
                        <ObservationTypeBadge type={obs.observationType} />
                        <Text style={[styles.observationDate, { color: theme.textMuted }]}>
                          {new Date(obs.createdAt).toLocaleDateString()}
                        </Text>
                      </View>
                      <Text style={[styles.observationTitle, { color: theme.text }]}>{obs.title}</Text>
                      <Text style={[styles.observationBody, { color: theme.textSecondary }]}>{obs.body}</Text>
                    </View>
                  ))
                )}
              </>
            )}
          </>
        )}

        {activeTab === "analytics" && (
          <>
            {dashboardLoading && (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color={Colors.brand.tealLight} />
                <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading analytics…</Text>
              </View>
            )}
            {dashboardError && !dashboardLoading && (
              <View style={styles.centered}>
                <Text style={styles.errorText}>Could not load founder analytics.</Text>
                <Pressable style={styles.retryBtn} onPress={loadDashboard}>
                  <Text style={styles.retryText}>Retry</Text>
                </Pressable>
              </View>
            )}
            {!dashboardLoading && !dashboardError && dashboardData && (
              <>
                <Text style={[styles.sectionHeader, { color: theme.textMuted }]}>A. Summary</Text>
                <View style={styles.kpiGrid}>
                  <View style={[styles.kpiCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                    <Text style={[styles.kpiValue, { color: theme.text }]}>{String(summary?.leadsToday ?? 0)}</Text>
                    <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Leads Today</Text>
                  </View>
                  <View style={[styles.kpiCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                    <Text style={[styles.kpiValue, { color: theme.text }]}>{String(summary?.leadsThisWeek ?? 0)}</Text>
                    <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Leads This Week</Text>
                  </View>
                  <View style={[styles.kpiCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                    <Text style={[styles.kpiValue, { color: theme.text }]}>{String(summary?.backlog ?? 0)}</Text>
                    <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Backlog</Text>
                  </View>
                  <View style={[styles.kpiCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                    <Text style={[styles.kpiValue, { color: theme.text }]}>{String(summary?.exportReady ?? 0)}</Text>
                    <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Export Ready</Text>
                  </View>
                  <View style={[styles.kpiCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                    <Text style={[styles.kpiValue, { color: theme.text }]}>
                      {summary?.avgReviewSeconds != null ? `${Math.round(Number(summary.avgReviewSeconds))}s` : "—"}
                    </Text>
                    <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Avg Review Time</Text>
                  </View>
                  <View style={[styles.kpiCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                    <Text style={[styles.kpiValue, { color: theme.text }]}>
                      {summary?.aiAcceptanceRate != null ? `${summary.aiAcceptanceRate}%` : "—"}
                    </Text>
                    <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>AI Acceptance</Text>
                  </View>
                </View>

                <Text style={[styles.sectionHeader, { color: theme.textMuted }]}>B. Funnel Snapshot</Text>
                <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                  {funnel && Object.entries(funnel).map(([status, count]) => (
                    <View key={status} style={styles.funnelRow}>
                      <Text style={[styles.funnelLabel, { color: theme.textSecondary }]}>{status.charAt(0).toUpperCase() + status.slice(1)}</Text>
                      <View style={[styles.funnelBarBg, { backgroundColor: theme.bgElevated }]}>
                        <View style={[styles.funnelBarFill, {
                          width: `${Math.min((count / Math.max(...Object.values(funnel), 1)) * 100, 100)}%`,
                        }]} />
                      </View>
                      <Text style={[styles.funnelCount, { color: theme.text }]}>{count}</Text>
                    </View>
                  ))}
                </View>

                <Text style={[styles.sectionHeader, { color: theme.textMuted }]}>C. Property Performance</Text>
                <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                  {propertyPerf && propertyPerf.length > 0 ? (
                    propertyPerf.map((p, i) => (
                      <View key={String(p.propertyId)} style={styles.propRow}>
                        <Text style={[styles.propRank, { color: theme.textMuted }]}>#{i + 1}</Text>
                        <Text style={[styles.propName, { color: theme.text }]} numberOfLines={1}>{String(p.propertyName)}</Text>
                        <Text style={[styles.propCount, { color: theme.textSecondary }]}>{String(p.inboundLeads)} leads</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>No property data yet.</Text>
                  )}
                </View>

                <Text style={[styles.sectionHeader, { color: theme.textMuted }]}>D. AI Performance</Text>
                <View style={styles.kpiGrid}>
                  <View style={[styles.kpiCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                    <Text style={[styles.kpiValue, { color: theme.text }]}>{String(aiPerf?.extractionSuccessRate ?? 0)}%</Text>
                    <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Extraction Success</Text>
                  </View>
                  <View style={[styles.kpiCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                    <Text style={[styles.kpiValue, { color: theme.text }]}>
                      {aiPerfDetail?.avgConfidence != null ? String(aiPerfDetail.avgConfidence) : "—"}
                    </Text>
                    <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Avg Confidence</Text>
                  </View>
                </View>
                {aiPerfDetail?.topCorrectedFields && (
                  <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                    <Text style={[styles.cardLabel, { color: theme.textMuted }]}>Top Corrected Fields</Text>
                    {(aiPerfDetail.topCorrectedFields as Array<{ field: string; editCount: number }>).length === 0 ? (
                      <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>No field edits recorded yet.</Text>
                    ) : (
                      (aiPerfDetail.topCorrectedFields as Array<{ field: string; editCount: number }>).map((f) => (
                        <View key={f.field} style={styles.correctedRow}>
                          <Text style={[styles.correctedField, { color: theme.text }]}>{f.field}</Text>
                          <Text style={[styles.correctedCount, { color: theme.textSecondary }]}>{f.editCount} edits</Text>
                        </View>
                      ))
                    )}
                    {aiPerfDetail?.summaryEditRate != null && (
                      <Text style={[styles.metaText, { color: theme.textMuted }]}>Summary edit rate: {String(aiPerfDetail.summaryEditRate)}%</Text>
                    )}
                  </View>
                )}

                <Text style={[styles.sectionHeader, { color: theme.textMuted }]}>E. Workflow Friction</Text>
                <View style={styles.kpiGrid}>
                  <View style={[styles.kpiCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                    <Text style={[styles.kpiValue, { color: theme.text }]}>{String(friction?.editsPerLead ?? 0)}</Text>
                    <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Edits Per Lead</Text>
                  </View>
                  <View style={[styles.kpiCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                    <Text style={[styles.kpiValue, { color: theme.text }]}>{String(friction?.stuckLeads ?? 0)}</Text>
                    <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Stuck &gt;24h</Text>
                  </View>
                </View>

                <Text style={[styles.sectionHeader, { color: theme.textMuted }]}>F. Export Pipeline</Text>
                <View style={styles.kpiGrid}>
                  <View style={[styles.kpiCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                    <Text style={[styles.kpiValue, { color: theme.text }]}>{String(exportPipeline?.exportReady ?? 0)}</Text>
                    <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Export Ready</Text>
                  </View>
                  <View style={[styles.kpiCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                    <Text style={[styles.kpiValue, { color: theme.text }]}>{String(exportPipeline?.exported ?? 0)}</Text>
                    <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Exported</Text>
                  </View>
                  <View style={[styles.kpiCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                    <Text style={[styles.kpiValue, { color: theme.text }]}>{String(exportPipeline?.exportableRate ?? 0)}%</Text>
                    <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Exportable Rate</Text>
                  </View>
                </View>

                <Text style={[styles.sectionHeader, { color: theme.textMuted }]}>G. Founder Notes</Text>
                {data?.observations.slice(0, 3).map((obs) => (
                  <View key={obs.id} style={[styles.observationCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                    <View style={styles.observationHeader}>
                      <ObservationTypeBadge type={obs.observationType} />
                      <Text style={[styles.observationDate, { color: theme.textMuted }]}>
                        {new Date(obs.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                    <Text style={[styles.observationTitle, { color: theme.text }]}>{obs.title}</Text>
                    <Text style={[styles.observationBody, { color: theme.textSecondary }]} numberOfLines={2}>{obs.body}</Text>
                  </View>
                ))}
                {(!data || data.observations.length === 0) && (
                  <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                    <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>No founder notes yet. Switch to Observations tab to add one.</Text>
                  </View>
                )}
              </>
            )}
          </>
        )}
      </ScrollView>

      <AddObservationModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSaved={loadObservations}
      />
      <WeeklyReflectionModal
        visible={showReflectionModal}
        onClose={() => setShowReflectionModal(false)}
        onSaved={loadObservations}
      />
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
  screenSub: {
    fontSize: 11,
    color: Colors.dark.textMuted,
    marginTop: 1,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.brand.tealLight,
  },
  actionBtnPrimary: {
    backgroundColor: Colors.brand.teal,
    borderColor: Colors.brand.teal,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.brand.tealLight,
  },
  actionBtnTextPrimary: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFF",
  },
  tabRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  tabActive: {
    backgroundColor: Colors.dark.bgCard,
    borderColor: Colors.dark.border,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.dark.textSecondary,
  },
  tabTextActive: {
    color: Colors.dark.text,
    fontWeight: "700",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 0,
  },
  section: {
    marginBottom: 8,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.dark.textMuted,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginTop: 16,
    marginBottom: 8,
  },
  card: {
    backgroundColor: Colors.dark.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 14,
    marginBottom: 8,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.dark.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  kpiCard: {
    flex: 1,
    minWidth: "30%",
    backgroundColor: Colors.dark.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 12,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.dark.text,
    letterSpacing: -0.5,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.dark.textSecondary,
    marginTop: 2,
  },
  funnelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  funnelLabel: {
    width: 88,
    fontSize: 12,
    fontWeight: "600",
    color: Colors.dark.textSecondary,
  },
  funnelBarBg: {
    flex: 1,
    height: 7,
    backgroundColor: Colors.dark.bgElevated,
    borderRadius: 4,
    overflow: "hidden",
  },
  funnelBarFill: {
    height: "100%",
    backgroundColor: Colors.brand.tealLight,
    borderRadius: 4,
  },
  funnelCount: {
    width: 30,
    fontSize: 12,
    fontWeight: "700",
    color: Colors.dark.text,
    textAlign: "right",
  },
  propRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  propRank: {
    width: 28,
    fontSize: 11,
    fontWeight: "700",
    color: Colors.dark.textMuted,
  },
  propName: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: Colors.dark.text,
  },
  propCount: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.dark.textSecondary,
  },
  correctedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  correctedField: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.dark.text,
  },
  correctedCount: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
  metaText: {
    fontSize: 11,
    color: Colors.dark.textMuted,
    marginTop: 8,
  },
  recurringRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  recurringCount: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.dark.textSecondary,
  },
  observationCard: {
    backgroundColor: Colors.dark.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 14,
    marginBottom: 8,
    gap: 6,
  },
  observationHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  observationTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.dark.text,
  },
  observationBody: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    lineHeight: 19,
  },
  observationDate: {
    fontSize: 11,
    color: Colors.dark.textMuted,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
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
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
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
  modalRoot: {
    flex: 1,
    backgroundColor: Colors.dark.bg,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.dark.text,
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 20,
    gap: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.dark.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 12,
  },
  typeRow: {
    flexGrow: 0,
    marginBottom: 4,
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginRight: 6,
    backgroundColor: Colors.dark.bgCard,
  },
  typeChipActive: {
    backgroundColor: Colors.brand.teal,
    borderColor: Colors.brand.teal,
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.dark.textSecondary,
  },
  typeChipTextActive: {
    color: "#FFF",
  },
  textInput: {
    backgroundColor: Colors.dark.bgCard,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 10,
    padding: 12,
    color: Colors.dark.text,
    fontSize: 14,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: "top",
  },
  saveBtn: {
    backgroundColor: Colors.brand.teal,
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    marginTop: 20,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 15,
  },
  reflectionProgress: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 16,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.dark.border,
  },
  progressDotActive: {
    backgroundColor: Colors.brand.tealLight,
  },
  reflectionContent: {
    flex: 1,
    padding: 20,
  },
  reflectionStep: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.dark.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  reflectionPrompt: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.dark.text,
    lineHeight: 26,
  },
  reflectionFooter: {
    flexDirection: "row",
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  reflectionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  reflectionBtnSecondary: {
    backgroundColor: Colors.dark.bgCard,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  reflectionBtnPrimary: {
    backgroundColor: Colors.brand.teal,
  },
  reflectionBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.dark.textSecondary,
  },
  reflectionBtnTextPrimary: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFF",
  },
});
