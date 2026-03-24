import React, { useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";

const STATUS_OPTIONS = ["new", "contacted", "qualified", "disqualified", "archived"];

function SectionHeader({ title }: { title: string }) {
  return (
    <Text style={sectionStyles.header}>{title}</Text>
  );
}

type FeatherIconName = React.ComponentProps<typeof Feather>["name"];

function InfoRow({ icon, label, value }: { icon: FeatherIconName; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={infoStyles.row}>
      <Feather name={icon} size={14} color={Colors.dark.textMuted} style={infoStyles.icon} />
      <Text style={infoStyles.label}>{label}</Text>
      <Text style={infoStyles.value}>{value}</Text>
    </View>
  );
}

function StatusPicker({ currentStatus, onSelect, isUpdating }: {
  currentStatus: string;
  onSelect: (s: string) => void;
  isUpdating: boolean;
}) {
  return (
    <View style={statusStyles.container}>
      {STATUS_OPTIONS.map((s) => (
        <Pressable
          key={s}
          style={[statusStyles.chip, s === currentStatus && statusStyles.chipActive]}
          onPress={() => onSelect(s)}
          disabled={isUpdating || s === currentStatus}
        >
          {isUpdating && s === currentStatus ? (
            <ActivityIndicator size="small" color={Colors.brand.tealLight} />
          ) : (
            <Text
              style={[statusStyles.chipLabel, s === currentStatus && statusStyles.chipLabelActive]}
            >
              {s}
            </Text>
          )}
        </Pressable>
      ))}
    </View>
  );
}

export default function ProspectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [noteText, setNoteText] = useState("");
  const noteInputRef = useRef<TextInput>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["prospect", id],
    queryFn: () => api.prospects.get(id),
    enabled: !!id,
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => api.prospects.update(id, { status }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["prospect", id] });
      queryClient.invalidateQueries({ queryKey: ["prospects"] });
    },
    onError: (err) => Alert.alert("Error", String(err)),
  });

  const noteMutation = useMutation({
    mutationFn: (body: string) => api.prospects.addNote(id, body),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setNoteText("");
      queryClient.invalidateQueries({ queryKey: ["prospect", id] });
    },
    onError: (err) => Alert.alert("Error", String(err)),
  });

  const exportMutation = useMutation({
    mutationFn: () => api.exports.create([id], "csv"),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["exports"] });
      Alert.alert("Exported", "Prospect exported to CSV. View in Exports tab.");
    },
    onError: (err) => Alert.alert("Error", String(err)),
  });

  if (isLoading) {
    return (
      <View style={styles.loadingCenter}>
        <ActivityIndicator size="large" color={Colors.brand.tealLight} />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={styles.loadingCenter}>
        <Feather name="alert-circle" size={32} color={Colors.dark.textMuted} />
        <Text style={styles.errorText}>Failed to load prospect</Text>
        <Pressable style={styles.retryBtn} onPress={() => refetch()}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const { prospect, interactions, notes, tags } = data;
  const name = prospect.fullName ?? prospect.phonePrimary;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={88}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.avatarLg}>
            <Text style={styles.avatarLgText}>
              {name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()}
            </Text>
          </View>
          <Text style={styles.heroName}>{name}</Text>
          <Text style={styles.heroPhone}>{prospect.phonePrimary}</Text>
          {prospect.email && <Text style={styles.heroEmail}>{prospect.email}</Text>}
        </View>

        {/* Status */}
        <View style={styles.card}>
          <SectionHeader title="LEAD STATUS" />
          <StatusPicker
            currentStatus={prospect.status}
            onSelect={(s) => statusMutation.mutate(s)}
            isUpdating={statusMutation.isPending}
          />
        </View>

        {/* AI Summary */}
        {prospect.latestSummary && (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <SectionHeader title="AI SUMMARY" />
              {prospect.latestSentiment && (
                <Badge label={prospect.latestSentiment} value={prospect.latestSentiment} />
              )}
            </View>
            <Text style={styles.summaryText}>{prospect.latestSummary}</Text>
          </View>
        )}

        {/* Leasing Details */}
        <View style={styles.card}>
          <SectionHeader title="LEASING DETAILS" />
          <InfoRow icon="home" label="Bedrooms" value={prospect.desiredBedrooms} />
          <InfoRow icon="calendar" label="Move-in" value={prospect.desiredMoveInDate} />
          <InfoRow
            icon="dollar-sign"
            label="Budget"
            value={
              prospect.budgetMin || prospect.budgetMax
                ? `$${prospect.budgetMin ?? "?"} – $${prospect.budgetMax ?? "?"}`
                : null
            }
          />
          <InfoRow icon="heart" label="Pets" value={prospect.pets} />
          <InfoRow icon="shield" label="Voucher" value={prospect.voucherType} />
          <InfoRow icon="briefcase" label="Employment" value={prospect.employmentStatus} />
          <InfoRow
            icon="trending-up"
            label="Income"
            value={prospect.monthlyIncome ? `$${prospect.monthlyIncome}/mo` : null}
          />
          <InfoRow icon="globe" label="Language" value={prospect.languagePreference} />
        </View>

        {/* Export Status */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <SectionHeader title="EXPORT" />
            <Badge label={prospect.exportStatus} value={prospect.exportStatus} />
          </View>
          <Pressable
            style={[styles.actionButton, exportMutation.isPending && styles.actionButtonDisabled]}
            onPress={() => exportMutation.mutate()}
            disabled={exportMutation.isPending}
          >
            {exportMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Feather name="upload" size={16} color="#fff" />
                <Text style={styles.actionButtonText}>Export this Prospect</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Interactions */}
        {interactions.length > 0 && (
          <View style={styles.card}>
            <SectionHeader title={`INTERACTIONS (${interactions.length})`} />
            {interactions.map((interaction) => (
              <View key={interaction.id} style={styles.interactionRow}>
                <View style={styles.interactionIconWrap}>
                  <Feather
                    name={
                      interaction.sourceType === "sms"
                        ? "message-square"
                        : interaction.sourceType === "voicemail"
                        ? "mic"
                        : "phone"
                    }
                    size={14}
                    color={Colors.brand.tealLight}
                  />
                </View>
                <View style={styles.interactionContent}>
                  <View style={styles.interactionTopRow}>
                    <Badge label={interaction.sourceType} value={interaction.sourceType} />
                    <Text style={styles.interactionTime}>
                      {new Date(interaction.occurredAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                  {(interaction.summary ?? interaction.rawText ?? interaction.transcript) && (
                    <Text style={styles.interactionText}>
                      {interaction.summary ?? interaction.rawText ?? interaction.transcript}
                    </Text>
                  )}
                  {interaction.category && (
                    <Text style={styles.interactionCategory}>
                      {interaction.category.replace(/_/g, " ")}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <View style={styles.card}>
            <SectionHeader title="TAGS" />
            <View style={styles.tagsRow}>
              {tags.map((tag) => (
                <View
                  key={tag.id}
                  style={[styles.tagChip, tag.color ? { backgroundColor: `${tag.color}22`, borderColor: `${tag.color}66` } : {}]}
                >
                  <Text style={[styles.tagLabel, tag.color ? { color: tag.color } : {}]}>
                    {tag.name}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Notes */}
        <View style={styles.card}>
          <SectionHeader title={`NOTES (${notes.length})`} />
          {notes.map((note) => (
            <View key={note.id} style={styles.noteRow}>
              <Feather name="edit-3" size={13} color={Colors.dark.textMuted} />
              <View style={styles.noteContent}>
                <Text style={styles.noteBody}>{note.body}</Text>
                <Text style={styles.noteTime}>
                  {new Date(note.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
            </View>
          ))}

          <View style={styles.noteInputRow}>
            <TextInput
              ref={noteInputRef}
              value={noteText}
              onChangeText={setNoteText}
              placeholder="Add a note..."
              placeholderTextColor={Colors.dark.textMuted}
              style={styles.noteInput}
              multiline
              maxLength={1000}
            />
            <Pressable
              style={[
                styles.noteSendBtn,
                (!noteText.trim() || noteMutation.isPending) && styles.noteSendBtnDisabled,
              ]}
              onPress={() => {
                if (noteText.trim()) noteMutation.mutate(noteText.trim());
              }}
              disabled={!noteText.trim() || noteMutation.isPending}
            >
              {noteMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Feather name="send" size={16} color="#fff" />
              )}
            </Pressable>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
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
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.dark.bgCard,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  retryText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.brand.tealLight,
  },
  hero: {
    alignItems: "center",
    gap: 6,
    paddingVertical: 20,
  },
  avatarLg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#0D2A2A",
    borderWidth: 2,
    borderColor: Colors.brand.teal,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  avatarLgText: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.brand.tealLight,
  },
  heroName: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.dark.text,
    textAlign: "center",
  },
  heroPhone: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary,
  },
  heroEmail: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textMuted,
  },
  card: {
    backgroundColor: Colors.dark.bgCard,
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary,
    lineHeight: 21,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.brand.teal,
    borderRadius: 12,
    paddingVertical: 13,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  interactionRow: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  interactionIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#0D2A2A",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  interactionContent: {
    flex: 1,
    gap: 4,
  },
  interactionTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  interactionTime: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textMuted,
  },
  interactionText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary,
    lineHeight: 18,
  },
  interactionCategory: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textMuted,
    textTransform: "capitalize",
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: Colors.dark.bgElevated,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  tagLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.textSecondary,
  },
  noteRow: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  noteContent: {
    flex: 1,
    gap: 3,
  },
  noteBody: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary,
    lineHeight: 19,
  },
  noteTime: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textMuted,
  },
  noteInputRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-end",
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
    paddingTop: 12,
  },
  noteInput: {
    flex: 1,
    backgroundColor: Colors.dark.bgInput,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.text,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    minHeight: 44,
    maxHeight: 100,
  },
  noteSendBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.brand.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  noteSendBtnDisabled: {
    backgroundColor: Colors.dark.bgElevated,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
});

const sectionStyles = StyleSheet.create({
  header: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.textMuted,
    letterSpacing: 0.8,
  },
});

const statusStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.dark.bgElevated,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  chipActive: {
    backgroundColor: "#0D2A2A",
    borderColor: Colors.brand.tealLight,
  },
  chipLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.textSecondary,
    textTransform: "capitalize",
  },
  chipLabelActive: {
    color: Colors.brand.tealLight,
    fontFamily: "Inter_600SemiBold",
  },
});

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 5,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  icon: {
    width: 18,
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textMuted,
    width: 90,
  },
  value: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.text,
    textAlign: "right",
  },
});
