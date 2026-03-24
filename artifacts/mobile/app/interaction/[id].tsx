import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
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
import type { Property } from "@/constants/types";

const STATUS_OPTIONS = ["new", "contacted", "qualified", "disqualified", "archived"];
const CATEGORY_OPTIONS = ["leasing_inquiry", "maintenance", "payment", "complaint", "general", "other"];

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function FieldInput({
  label,
  value,
  onChange,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "email-address" | "numeric" | "decimal-pad";
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder ?? `Enter ${label.toLowerCase()}...`}
        placeholderTextColor={Colors.dark.textMuted}
        style={styles.fieldInput}
        keyboardType={keyboardType}
      />
    </View>
  );
}

function PropertyPickerModal({
  visible,
  properties,
  selectedId,
  onSelect,
  onClose,
}: {
  visible: boolean;
  properties: Property[];
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={pickerStyles.container}>
        <View style={pickerStyles.header}>
          <Text style={pickerStyles.title}>Select Property</Text>
          <Pressable onPress={onClose}>
            <Feather name="x" size={22} color={Colors.dark.textSecondary} />
          </Pressable>
        </View>
        <ScrollView style={pickerStyles.list}>
          <Pressable
            style={[pickerStyles.item, !selectedId && pickerStyles.itemSelected]}
            onPress={() => { onSelect(""); onClose(); }}
          >
            <Text style={[pickerStyles.itemText, !selectedId && pickerStyles.itemTextSelected]}>
              No property assigned
            </Text>
            {!selectedId && <Feather name="check" size={16} color={Colors.brand.tealLight} />}
          </Pressable>
          {properties.map((p) => (
            <Pressable
              key={p.id}
              style={[pickerStyles.item, selectedId === p.id && pickerStyles.itemSelected]}
              onPress={() => { onSelect(p.id); onClose(); }}
            >
              <View style={pickerStyles.itemContent}>
                <Text style={[pickerStyles.itemText, selectedId === p.id && pickerStyles.itemTextSelected]}>
                  {p.name}
                </Text>
                {(p.city || p.state) && (
                  <Text style={pickerStyles.itemSub}>
                    {[p.city, p.state].filter(Boolean).join(", ")}
                  </Text>
                )}
              </View>
              {selectedId === p.id && <Feather name="check" size={16} color={Colors.brand.tealLight} />}
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

function TagPickerModal({
  visible,
  allTags,
  selectedIds,
  onToggle,
  onClose,
}: {
  visible: boolean;
  allTags: { id: string; name: string; color?: string | null }[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={pickerStyles.container}>
        <View style={pickerStyles.header}>
          <Text style={pickerStyles.title}>Select Tags</Text>
          <Pressable onPress={onClose}>
            <Feather name="x" size={22} color={Colors.dark.textSecondary} />
          </Pressable>
        </View>
        <ScrollView style={pickerStyles.list}>
          {allTags.length === 0 && (
            <Text style={pickerStyles.emptyText}>No tags available</Text>
          )}
          {allTags.map((tag) => {
            const selected = selectedIds.includes(tag.id);
            return (
              <Pressable
                key={tag.id}
                style={[pickerStyles.item, selected && pickerStyles.itemSelected]}
                onPress={() => onToggle(tag.id)}
              >
                <View style={[pickerStyles.tagDot, { backgroundColor: tag.color ?? Colors.dark.textMuted }]} />
                <Text style={[pickerStyles.itemText, selected && pickerStyles.itemTextSelected]}>
                  {tag.name}
                </Text>
                {selected && <Feather name="check" size={16} color={Colors.brand.tealLight} />}
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={pickerStyles.doneRow}>
          <Pressable style={pickerStyles.doneBtn} onPress={onClose}>
            <Text style={pickerStyles.doneBtnText}>Done ({selectedIds.length} selected)</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export default function InteractionScreen() {
  const params = useLocalSearchParams<{ id: string; prospectId?: string }>();
  const interactionId = params.id;
  const queryClient = useQueryClient();

  const [showPropertyPicker, setShowPropertyPicker] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [noteText, setNoteText] = useState("");

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    desiredBedrooms: "",
    desiredMoveInDate: "",
    budgetMin: "",
    budgetMax: "",
    pets: "",
    voucherType: "",
    employmentStatus: "",
    monthlyIncome: "",
    languagePreference: "",
    status: "new",
    propertyId: "",
    tagIds: [] as string[],
  });

  const { data: interactionData, isLoading: iLoading, isError: iError } = useQuery({
    queryKey: ["interaction", interactionId],
    queryFn: () => api.interactions.get(interactionId),
    enabled: !!interactionId,
  });

  const effectivePId = params.prospectId ?? interactionData?.prospectId ?? undefined;

  const { data: prospectData } = useQuery({
    queryKey: ["prospect", effectivePId],
    queryFn: () => api.prospects.get(effectivePId!),
    enabled: !!effectivePId,
  });

  const { data: propertiesData } = useQuery({
    queryKey: ["properties"],
    queryFn: () => api.properties.list(),
  });

  const { data: tagsData } = useQuery({
    queryKey: ["tags"],
    queryFn: () => api.tags.list(),
  });

  const interaction = interactionData;
  const prospect = prospectData?.prospect;
  const prospectTags = prospectData?.tags ?? [];
  const properties = propertiesData?.properties ?? [];
  const allTags = tagsData?.tags ?? [];

  useEffect(() => {
    if (prospect) {
      const ext = interaction?.structuredExtractionJson as Record<string, unknown> | null;
      setForm({
        firstName: (prospect.firstName ?? (ext?.firstName as string) ?? ""),
        lastName: (prospect.lastName ?? (ext?.lastName as string) ?? ""),
        email: (prospect.email ?? (ext?.email as string) ?? ""),
        desiredBedrooms: (prospect.desiredBedrooms ?? (ext?.desiredBedrooms as string) ?? ""),
        desiredMoveInDate: (prospect.desiredMoveInDate ?? (ext?.desiredMoveInDate as string) ?? ""),
        budgetMin: (prospect.budgetMin ?? (ext?.budgetMin as string) ?? ""),
        budgetMax: (prospect.budgetMax ?? (ext?.budgetMax as string) ?? ""),
        pets: (prospect.pets ?? (ext?.pets as string) ?? ""),
        voucherType: (prospect.voucherType ?? (ext?.voucherType as string) ?? ""),
        employmentStatus: (prospect.employmentStatus ?? (ext?.employmentStatus as string) ?? ""),
        monthlyIncome: (prospect.monthlyIncome ?? (ext?.monthlyIncome as string) ?? ""),
        languagePreference: (prospect.languagePreference ?? (ext?.languagePreference as string) ?? ""),
        status: prospect.status ?? "new",
        propertyId: interaction?.propertyId ?? prospect.assignedPropertyId ?? "",
        tagIds: prospectTags.map((t) => t.id),
      });
    } else if (interaction) {
      const ext = interaction.structuredExtractionJson as Record<string, unknown> | null;
      if (ext) {
        setForm((prev) => ({
          ...prev,
          firstName: (ext.firstName as string) ?? prev.firstName,
          lastName: (ext.lastName as string) ?? prev.lastName,
          email: (ext.email as string) ?? prev.email,
          desiredBedrooms: (ext.desiredBedrooms as string) ?? prev.desiredBedrooms,
          desiredMoveInDate: (ext.desiredMoveInDate as string) ?? prev.desiredMoveInDate,
          budgetMin: (ext.budgetMin as string) ?? prev.budgetMin,
          budgetMax: (ext.budgetMax as string) ?? prev.budgetMax,
          pets: (ext.pets as string) ?? prev.pets,
          voucherType: (ext.voucherType as string) ?? prev.voucherType,
          employmentStatus: (ext.employmentStatus as string) ?? prev.employmentStatus,
          monthlyIncome: (ext.monthlyIncome as string) ?? prev.monthlyIncome,
          languagePreference: (ext.languagePreference as string) ?? prev.languagePreference,
          propertyId: interaction.propertyId ?? "",
        }));
      }
    }
  }, [prospect, interaction, prospectTags]);

  const set = useCallback((field: keyof typeof form) => (val: string) => setForm((f) => ({ ...f, [field]: val })), []);
  const toggleTag = useCallback((id: string) => {
    setForm((f) => ({
      ...f,
      tagIds: f.tagIds.includes(id) ? f.tagIds.filter((t) => t !== id) : [...f.tagIds, id],
    }));
  }, []);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const updates: Parameters<typeof api.prospects.update>[1] = {
        firstName: form.firstName || undefined,
        lastName: form.lastName || undefined,
        email: form.email || undefined,
        desiredBedrooms: form.desiredBedrooms || undefined,
        desiredMoveInDate: form.desiredMoveInDate || undefined,
        budgetMin: form.budgetMin || undefined,
        budgetMax: form.budgetMax || undefined,
        pets: form.pets || undefined,
        voucherType: form.voucherType || undefined,
        employmentStatus: form.employmentStatus || undefined,
        monthlyIncome: form.monthlyIncome || undefined,
        languagePreference: form.languagePreference || undefined,
        status: form.status,
        assignedPropertyId: form.propertyId || undefined,
      };

      if (effectivePId) {
        await api.prospects.update(effectivePId, updates);
        await api.prospects.setTags(effectivePId, form.tagIds);
        await api.interactions.review(interactionId, {
          propertyId: form.propertyId || undefined,
        });
      }
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["prospect", effectivePId] });
      queryClient.invalidateQueries({ queryKey: ["prospects"] });
      queryClient.invalidateQueries({ queryKey: ["interaction", interactionId] });
      queryClient.invalidateQueries({ queryKey: ["inbox"] });
      Alert.alert("Saved", "Prospect details have been updated.");
    },
    onError: (err) => Alert.alert("Error", String(err)),
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      if (!effectivePId) throw new Error("No prospect to export");
      return api.exports.create([effectivePId], "csv");
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["exports"] });
      queryClient.invalidateQueries({ queryKey: ["prospect", effectivePId] });
      Alert.alert("Exported", "Prospect exported. View in Exports tab.");
    },
    onError: (err) => Alert.alert("Error", String(err)),
  });

  const noteMutation = useMutation({
    mutationFn: (body: string) => {
      if (!effectivePId) throw new Error("No prospect for note");
      return api.prospects.addNote(effectivePId, body);
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setNoteText("");
      queryClient.invalidateQueries({ queryKey: ["prospect", effectivePId] });
    },
    onError: (err) => Alert.alert("Error", String(err)),
  });

  if (iLoading) {
    return (
      <View style={styles.loadingCenter}>
        <ActivityIndicator size="large" color={Colors.brand.tealLight} />
      </View>
    );
  }

  if (iError || !interaction) {
    return (
      <View style={styles.loadingCenter}>
        <Feather name="alert-circle" size={32} color={Colors.dark.textMuted} />
        <Text style={styles.errorText}>Interaction not found</Text>
        <Pressable style={styles.retryBtn} onPress={() => router.back()}>
          <Text style={styles.retryText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const ext = interaction.structuredExtractionJson as Record<string, unknown> | null;
  const selectedProperty = properties.find((p) => p.id === form.propertyId);
  const selectedTagObjects = allTags.filter((t) => form.tagIds.includes(t.id));

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={88}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Interaction Header */}
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View style={[styles.iconWrap, { backgroundColor: "#0D2A2A" }]}>
              <Feather
                name={interaction.sourceType === "sms" ? "message-square" : interaction.sourceType === "voicemail" ? "mic" : "phone"}
                size={20}
                color={Colors.brand.tealLight}
              />
            </View>
            <View style={styles.headerMeta}>
              <View style={styles.badgeRow}>
                <Badge label={interaction.sourceType} value={interaction.sourceType} />
                <Badge label={interaction.direction} value={interaction.direction} />
                {interaction.sentiment && <Badge label={interaction.sentiment} value={interaction.sentiment} />}
              </View>
              <Text style={styles.headerTime}>
                {new Date(interaction.occurredAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </Text>
              <Text style={styles.headerPhone}>{interaction.fromNumber} → {interaction.toNumber}</Text>
            </View>
          </View>
        </View>

        {/* Prospect link */}
        {prospect && (
          <Pressable
            style={styles.prospectLink}
            onPress={() => router.push({ pathname: "/prospect/[id]", params: { id: effectivePId! } })}
          >
            <Feather name="user" size={14} color={Colors.brand.tealLight} />
            <Text style={styles.prospectLinkText}>{prospect.fullName ?? prospect.phonePrimary}</Text>
            <Feather name="chevron-right" size={14} color={Colors.dark.textMuted} />
          </Pressable>
        )}

        {/* AI Summary */}
        {(interaction.summary || interaction.category || interaction.urgency) && (
          <View style={styles.card}>
            <SectionHeader title="AI SUMMARY" />
            {interaction.summary && <Text style={styles.bodyText}>{interaction.summary}</Text>}
            {(interaction.category || interaction.urgency) && (
              <View style={styles.chipRow}>
                {interaction.category && (
                  <View style={styles.chip}><Text style={styles.chipText}>{interaction.category.replace(/_/g, " ")}</Text></View>
                )}
                {interaction.urgency && (
                  <View style={[styles.chip, interaction.urgency === "high" && styles.chipHigh]}>
                    <Text style={styles.chipText}>{interaction.urgency} urgency</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* Raw message */}
        {(interaction.rawText || interaction.transcript) && (
          <View style={styles.card}>
            <SectionHeader title={interaction.transcript ? "TRANSCRIPT" : "MESSAGE"} />
            <Text style={styles.rawText}>{interaction.transcript ?? interaction.rawText}</Text>
          </View>
        )}

        {/* Editable Prospect Fields */}
        <View style={styles.card}>
          <SectionHeader title="PROSPECT DETAILS" />

          <FieldInput label="First Name" value={form.firstName} onChange={set("firstName")} />
          <FieldInput label="Last Name" value={form.lastName} onChange={set("lastName")} />
          <FieldInput label="Email" value={form.email} onChange={set("email")} keyboardType="email-address" placeholder="email@example.com" />
          <FieldInput label="Desired Bedrooms" value={form.desiredBedrooms} onChange={set("desiredBedrooms")} placeholder="e.g. 2" />
          <FieldInput label="Move-in Date" value={form.desiredMoveInDate} onChange={set("desiredMoveInDate")} placeholder="e.g. 2025-06-01" />
          <FieldInput label="Budget Min ($)" value={form.budgetMin} onChange={set("budgetMin")} keyboardType="numeric" placeholder="e.g. 1200" />
          <FieldInput label="Budget Max ($)" value={form.budgetMax} onChange={set("budgetMax")} keyboardType="numeric" placeholder="e.g. 1800" />
          <FieldInput label="Pets" value={form.pets} onChange={set("pets")} placeholder="e.g. 1 small dog" />
          <FieldInput label="Voucher Type" value={form.voucherType} onChange={set("voucherType")} placeholder="e.g. Section 8" />
          <FieldInput label="Employment Status" value={form.employmentStatus} onChange={set("employmentStatus")} placeholder="e.g. Full-time" />
          <FieldInput label="Monthly Income ($)" value={form.monthlyIncome} onChange={set("monthlyIncome")} keyboardType="numeric" placeholder="e.g. 4000" />
          <FieldInput label="Language" value={form.languagePreference} onChange={set("languagePreference")} placeholder="e.g. English" />
        </View>

        {/* Status Picker */}
        {effectivePId && (
          <View style={styles.card}>
            <SectionHeader title="LEAD STATUS" />
            <View style={styles.statusRow}>
              {STATUS_OPTIONS.map((s) => (
                <Pressable
                  key={s}
                  style={[styles.statusChip, form.status === s && styles.statusChipActive]}
                  onPress={() => setForm((f) => ({ ...f, status: s }))}
                >
                  <Text style={[styles.statusChipLabel, form.status === s && styles.statusChipLabelActive]}>
                    {s}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Property Selector */}
        <View style={styles.card}>
          <SectionHeader title="PROPERTY" />
          <Pressable style={styles.selectorBtn} onPress={() => setShowPropertyPicker(true)}>
            <Feather name="home" size={15} color={Colors.brand.tealLight} />
            <Text style={styles.selectorBtnText}>
              {selectedProperty ? selectedProperty.name : "No property assigned"}
            </Text>
            <Feather name="chevron-down" size={15} color={Colors.dark.textMuted} />
          </Pressable>
        </View>

        {/* Tags */}
        {effectivePId && (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <SectionHeader title="TAGS" />
              <Pressable onPress={() => setShowTagPicker(true)}>
                <Text style={styles.editLink}>Edit</Text>
              </Pressable>
            </View>
            <Pressable style={styles.selectorBtn} onPress={() => setShowTagPicker(true)}>
              {selectedTagObjects.length === 0 ? (
                <Text style={styles.selectorPlaceholder}>Tap to add tags...</Text>
              ) : (
                <View style={styles.tagChips}>
                  {selectedTagObjects.map((t) => (
                    <View key={t.id} style={[styles.tagChip, { borderColor: (t.color ?? Colors.dark.textMuted) + "66", backgroundColor: (t.color ?? Colors.dark.textMuted) + "22" }]}>
                      <Text style={[styles.tagChipText, { color: t.color ?? Colors.dark.textSecondary }]}>{t.name}</Text>
                    </View>
                  ))}
                </View>
              )}
            </Pressable>
          </View>
        )}

        {/* Notes */}
        {effectivePId && (
          <View style={styles.card}>
            <SectionHeader title={`NOTES (${prospectData?.notes?.length ?? 0})`} />
            {(prospectData?.notes ?? []).map((note) => (
              <View key={note.id} style={styles.noteRow}>
                <Feather name="edit-3" size={13} color={Colors.dark.textMuted} />
                <View style={styles.noteContent}>
                  <Text style={styles.noteBody}>{note.body}</Text>
                  <Text style={styles.noteTime}>
                    {new Date(note.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </View>
              </View>
            ))}
            <View style={styles.noteInputRow}>
              <TextInput
                value={noteText}
                onChangeText={setNoteText}
                placeholder="Add a note..."
                placeholderTextColor={Colors.dark.textMuted}
                style={styles.noteInput}
                multiline
                maxLength={1000}
              />
              <Pressable
                style={[styles.noteSendBtn, (!noteText.trim() || noteMutation.isPending) && styles.noteSendBtnDisabled]}
                onPress={() => { if (noteText.trim()) noteMutation.mutate(noteText.trim()); }}
                disabled={!noteText.trim() || noteMutation.isPending}
              >
                {noteMutation.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="send" size={16} color="#fff" />}
              </Pressable>
            </View>
          </View>
        )}

        {/* AI Suggestion hint */}
        {ext && Object.keys(ext).length > 0 && (
          <View style={styles.aiHintCard}>
            <Feather name="zap" size={14} color={Colors.brand.tealLight} />
            <Text style={styles.aiHintText}>
              AI extracted fields are pre-filled above. Adjust as needed and tap Save.
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsCard}>
          <Pressable
            style={[styles.saveBtn, saveMutation.isPending && styles.actionDisabled]}
            onPress={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !effectivePId}
          >
            {saveMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Feather name="save" size={16} color="#fff" />
                <Text style={styles.saveBtnText}>Save Changes</Text>
              </>
            )}
          </Pressable>

          {effectivePId && (
            <Pressable
              style={[styles.exportBtn, exportMutation.isPending && styles.actionDisabled]}
              onPress={() => exportMutation.mutate()}
              disabled={exportMutation.isPending}
            >
              {exportMutation.isPending ? (
                <ActivityIndicator size="small" color={Colors.brand.tealLight} />
              ) : (
                <>
                  <Feather name="upload" size={16} color={Colors.brand.tealLight} />
                  <Text style={styles.exportBtnText}>Mark Export-Ready</Text>
                </>
              )}
            </Pressable>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <PropertyPickerModal
        visible={showPropertyPicker}
        properties={properties}
        selectedId={form.propertyId}
        onSelect={(id) => setForm((f) => ({ ...f, propertyId: id }))}
        onClose={() => setShowPropertyPicker(false)}
      />

      <TagPickerModal
        visible={showTagPicker}
        allTags={allTags}
        selectedIds={form.tagIds}
        onToggle={toggleTag}
        onClose={() => setShowTagPicker(false)}
      />
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
  sectionHeader: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.textMuted,
    letterSpacing: 0.8,
  },
  headerRow: {
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  headerMeta: {
    flex: 1,
    gap: 5,
  },
  badgeRow: {
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
  chipRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: Colors.dark.bgElevated,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  chipHigh: {
    backgroundColor: "#2A0D0D",
    borderColor: "#FF6B6B44",
  },
  chipText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.textSecondary,
    textTransform: "capitalize",
  },
  fieldGroup: {
    gap: 5,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.textMuted,
  },
  fieldInput: {
    backgroundColor: Colors.dark.bgElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.text,
    minHeight: 42,
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statusChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.dark.bgElevated,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  statusChipActive: {
    backgroundColor: "#0D2A2A",
    borderColor: Colors.brand.tealLight,
  },
  statusChipLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.textSecondary,
    textTransform: "capitalize",
  },
  statusChipLabelActive: {
    color: Colors.brand.tealLight,
    fontFamily: "Inter_600SemiBold",
  },
  selectorBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.dark.bgElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 42,
  },
  selectorBtnText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.text,
  },
  selectorPlaceholder: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textMuted,
  },
  editLink: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.brand.tealLight,
  },
  tagChips: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  tagChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  tagChipText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
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
    backgroundColor: Colors.dark.bgElevated,
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
  aiHintCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#0D2A2A",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.brand.teal + "44",
  },
  aiHintText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary,
    lineHeight: 18,
  },
  actionsCard: {
    gap: 10,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.brand.teal,
    borderRadius: 14,
    paddingVertical: 15,
    minHeight: 52,
  },
  saveBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  exportBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.dark.bgCard,
    borderRadius: 14,
    paddingVertical: 15,
    minHeight: 52,
    borderWidth: 1,
    borderColor: Colors.brand.teal + "66",
  },
  exportBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.brand.tealLight,
  },
  actionDisabled: {
    opacity: 0.6,
  },
});

const pickerStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.bg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.text,
  },
  list: {
    flex: 1,
    padding: 16,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.bgCard,
    marginBottom: 8,
  },
  itemSelected: {
    backgroundColor: "#0D2A2A",
    borderColor: Colors.brand.teal + "66",
  },
  itemContent: {
    flex: 1,
  },
  itemText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.text,
    flex: 1,
  },
  itemTextSelected: {
    color: Colors.brand.tealLight,
  },
  itemSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textMuted,
    marginTop: 2,
  },
  tagDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textMuted,
    textAlign: "center",
    paddingVertical: 20,
  },
  doneRow: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  doneBtn: {
    backgroundColor: Colors.brand.teal,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  doneBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});
