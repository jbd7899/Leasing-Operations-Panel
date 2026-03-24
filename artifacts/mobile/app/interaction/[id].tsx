import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import type { Interaction } from "@/constants/types";

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function ExtractionField({ label, value }: { label: string; value: unknown }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{String(value)}</Text>
    </View>
  );
}

function sourceIcon(sourceType: string): React.ComponentProps<typeof Feather>["name"] {
  if (sourceType === "sms") return "message-square";
  if (sourceType === "voicemail") return "mic";
  return "phone";
}

export default function InteractionScreen() {
  const params = useLocalSearchParams<{ id: string; prospectId?: string }>();
  const interactionId = params.id;
  const queryClient = useQueryClient();

  const { data: prospect, isLoading: prospectLoading } = useQuery({
    queryKey: ["prospect", params.prospectId],
    queryFn: () => api.prospects.get(params.prospectId!),
    enabled: !!params.prospectId,
  });

  const interaction: Interaction | undefined = prospect?.interactions.find(
    (i) => i.id === interactionId,
  );

  const applyMutation = useMutation({
    mutationFn: async () => {
      if (!params.prospectId || !interaction?.structuredExtractionJson) return;
      const ext = interaction.structuredExtractionJson as Record<string, unknown>;
      const updates: Record<string, unknown> = {};
      if (ext.firstName) updates.firstName = ext.firstName;
      if (ext.lastName) updates.lastName = ext.lastName;
      if (ext.email) updates.email = ext.email;
      if (ext.desiredBedrooms) updates.desiredBedrooms = ext.desiredBedrooms;
      if (ext.desiredMoveInDate) updates.desiredMoveInDate = ext.desiredMoveInDate;
      if (ext.budgetMin) updates.budgetMin = ext.budgetMin;
      if (ext.budgetMax) updates.budgetMax = ext.budgetMax;
      if (ext.pets) updates.pets = ext.pets;
      if (ext.voucherType) updates.voucherType = ext.voucherType;
      if (ext.employmentStatus) updates.employmentStatus = ext.employmentStatus;
      if (ext.monthlyIncome) updates.monthlyIncome = ext.monthlyIncome;
      if (ext.languagePreference) updates.languagePreference = ext.languagePreference;
      if (ext.suggestedStatus) updates.status = ext.suggestedStatus;
      return api.prospects.update(params.prospectId!, updates as Parameters<typeof api.prospects.update>[1]);
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["prospect", params.prospectId] });
      queryClient.invalidateQueries({ queryKey: ["prospects"] });
      Alert.alert("Applied", "AI-extracted fields have been applied to the prospect.");
    },
    onError: (err) => Alert.alert("Error", String(err)),
  });

  if (prospectLoading) {
    return (
      <View style={styles.loadingCenter}>
        <ActivityIndicator size="large" color={Colors.brand.tealLight} />
      </View>
    );
  }

  if (!interaction) {
    return (
      <View style={styles.loadingCenter}>
        <Feather name="alert-circle" size={32} color={Colors.dark.textMuted} />
        <Text style={styles.errorText}>Interaction not found</Text>
      </View>
    );
  }

  const ext = interaction.structuredExtractionJson as Record<string, unknown> | null;
  const hasExtraction = ext && Object.keys(ext).length > 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Feather name={sourceIcon(interaction.sourceType)} size={22} color={Colors.brand.tealLight} />
        </View>
        <View style={styles.headerMeta}>
          <View style={styles.headerTopRow}>
            <Badge label={interaction.sourceType} value={interaction.sourceType} />
            <Badge label={interaction.direction} value={interaction.direction} />
            {interaction.sentiment && (
              <Badge label={interaction.sentiment} value={interaction.sentiment} />
            )}
          </View>
          <Text style={styles.headerTime}>
            {new Date(interaction.occurredAt).toLocaleString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
          <Text style={styles.headerPhone}>
            {interaction.fromNumber} → {interaction.toNumber}
          </Text>
        </View>
      </View>

      {/* Prospect link */}
      {params.prospectId && prospect && (
        <Pressable
          style={styles.prospectLink}
          onPress={() =>
            router.replace({ pathname: "/prospect/[id]", params: { id: params.prospectId! } })
          }
        >
          <Feather name="user" size={14} color={Colors.brand.tealLight} />
          <Text style={styles.prospectLinkText}>
            {prospect.prospect.fullName ?? prospect.prospect.phonePrimary}
          </Text>
          <Feather name="chevron-right" size={14} color={Colors.dark.textMuted} />
        </Pressable>
      )}

      {/* AI Summary */}
      {(interaction.summary || interaction.category || interaction.urgency) && (
        <View style={styles.card}>
          <SectionHeader title="AI SUMMARY" />
          {interaction.summary && (
            <Text style={styles.bodyText}>{interaction.summary}</Text>
          )}
          <View style={styles.metaRow}>
            {interaction.category && (
              <View style={styles.metaChip}>
                <Text style={styles.metaChipLabel}>
                  {interaction.category.replace(/_/g, " ")}
                </Text>
              </View>
            )}
            {interaction.urgency && (
              <View
                style={[
                  styles.metaChip,
                  interaction.urgency === "high" && styles.metaChipHigh,
                ]}
              >
                <Text style={styles.metaChipLabel}>{interaction.urgency} urgency</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* AI Extracted Fields */}
      {hasExtraction && (
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <SectionHeader title="AI EXTRACTION" />
            {interaction.extractionStatus && (
              <Badge label={interaction.extractionStatus} value={interaction.extractionStatus} />
            )}
          </View>
          <ExtractionField label="First Name" value={ext.firstName} />
          <ExtractionField label="Last Name" value={ext.lastName} />
          <ExtractionField label="Email" value={ext.email} />
          <ExtractionField label="Bedrooms" value={ext.desiredBedrooms} />
          <ExtractionField label="Move-in Date" value={ext.desiredMoveInDate} />
          <ExtractionField
            label="Budget"
            value={ext.budgetMin || ext.budgetMax ? `$${ext.budgetMin ?? "?"} – $${ext.budgetMax ?? "?"}` : null}
          />
          <ExtractionField label="Pets" value={ext.pets} />
          <ExtractionField label="Voucher" value={ext.voucherType} />
          <ExtractionField label="Employment" value={ext.employmentStatus} />
          <ExtractionField label="Income" value={ext.monthlyIncome ? `$${ext.monthlyIncome}/mo` : null} />
          <ExtractionField label="Language" value={ext.languagePreference} />
          <ExtractionField label="Suggested Status" value={ext.suggestedStatus} />
          <ExtractionField label="Next Action" value={ext.suggestedNextAction} />

          {params.prospectId && (
            <Pressable
              style={[styles.applyBtn, applyMutation.isPending && styles.applyBtnDisabled]}
              onPress={() => applyMutation.mutate()}
              disabled={applyMutation.isPending}
            >
              {applyMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Feather name="check-circle" size={15} color="#fff" />
                  <Text style={styles.applyBtnText}>Apply AI Fields to Prospect</Text>
                </>
              )}
            </Pressable>
          )}
        </View>
      )}

      {/* Raw Message / Transcript */}
      {(interaction.rawText || interaction.transcript) && (
        <View style={styles.card}>
          <SectionHeader title={interaction.transcript ? "TRANSCRIPT" : "MESSAGE"} />
          <Text style={styles.rawText}>
            {interaction.transcript ?? interaction.rawText}
          </Text>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.bg,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  loadingCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: Colors.dark.bg,
  },
  errorText: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.textSecondary,
  },
  header: {
    flexDirection: "row",
    gap: 14,
    backgroundColor: Colors.dark.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#0D2A2A",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  headerMeta: {
    flex: 1,
    gap: 5,
  },
  headerTopRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  headerTime: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.text,
  },
  headerPhone: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textMuted,
  },
  prospectLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.dark.bgCard,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  prospectLinkText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.text,
  },
  card: {
    backgroundColor: Colors.dark.bgCard,
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  cardTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionHeader: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.textMuted,
    letterSpacing: 0.8,
  },
  bodyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary,
    lineHeight: 20,
  },
  rawText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary,
    lineHeight: 20,
    backgroundColor: Colors.dark.bgElevated,
    borderRadius: 10,
    padding: 12,
  },
  metaRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  metaChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: Colors.dark.bgElevated,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  metaChipHigh: {
    backgroundColor: "#2A0D0D",
    borderColor: "#FF6B6B44",
  },
  metaChipLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.textSecondary,
    textTransform: "capitalize",
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
    gap: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textMuted,
    width: 110,
  },
  fieldValue: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.text,
    textAlign: "right",
  },
  applyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.brand.teal,
    borderRadius: 12,
    paddingVertical: 13,
    marginTop: 4,
  },
  applyBtnDisabled: { opacity: 0.6 },
  applyBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});
