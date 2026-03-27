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
import { useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";
import {
  useGetInteraction,
  useGetProspect,
  useListProperties,
  useListTags,
  useUpdateProspect,
  useSetProspectTags,
  useReviewInteraction,
  useAddProspectNote,
  useCreateExport,
  getGetProspectQueryKey,
  getGetInteractionQueryKey,
  getGetInboxQueryKey,
  getListProspectsQueryKey,
  getListExportsQueryKey,
  CreateExportBodyFormat,
} from "@workspace/api-client-react";
import type { Property } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/Badge";

const STATUS_OPTIONS = ["new", "contacted", "qualified", "disqualified", "archived"];

function SectionHeader({ title }: { title: string }) {
  const { theme } = useTheme();
  return <Text style={[styles.sectionHeader, { color: theme.textMuted }]}>{title}</Text>;
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
  const { theme } = useTheme();
  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder ?? `Enter ${label.toLowerCase()}...`}
        placeholderTextColor={theme.textMuted}
        style={[styles.fieldInput, { backgroundColor: theme.bgElevated, borderColor: theme.border, color: theme.text }]}
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
  const { theme, isDark } = useTheme();
  return (
    <Modal
      visible={visible}
      animationType={Platform.OS === "web" ? "fade" : "slide"}
      presentationStyle={Platform.OS === "web" ? "overFullScreen" : "pageSheet"}
      onRequestClose={onClose}
    >
      <View style={[pickerStyles.container, { backgroundColor: theme.bg }]}>
        <View style={[pickerStyles.header, { borderBottomColor: theme.border }]}>
          <Text style={[pickerStyles.title, { color: theme.text }]}>Select Property</Text>
          <Pressable onPress={onClose}>
            <Feather name="x" size={22} color={theme.textSecondary} />
          </Pressable>
        </View>
        <ScrollView style={pickerStyles.list}>
          <Pressable
            style={[pickerStyles.item, { borderColor: theme.border, backgroundColor: theme.bgCard }, !selectedId && [pickerStyles.itemSelected, { backgroundColor: theme.activeBg }]]}
            onPress={() => { onSelect(""); onClose(); }}
          >
            <Text style={[pickerStyles.itemText, { color: theme.text }, !selectedId && pickerStyles.itemTextSelected]}>
              No property assigned
            </Text>
            {!selectedId && <Feather name="check" size={16} color={Colors.brand.tealLight} />}
          </Pressable>
          {properties.map((p) => (
            <Pressable
              key={p.id}
              style={[pickerStyles.item, { borderColor: theme.border, backgroundColor: theme.bgCard }, selectedId === p.id && [pickerStyles.itemSelected, { backgroundColor: theme.activeBg }]]}
              onPress={() => { onSelect(p.id); onClose(); }}
            >
              <View style={pickerStyles.itemContent}>
                <Text style={[pickerStyles.itemText, { color: theme.text }, selectedId === p.id && pickerStyles.itemTextSelected]}>
                  {p.name}
                </Text>
                {(p.city || p.state) && (
                  <Text style={[pickerStyles.itemSub, { color: theme.textMuted }]}>
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
  const { theme, isDark } = useTheme();
  return (
    <Modal
      visible={visible}
      animationType={Platform.OS === "web" ? "fade" : "slide"}
      presentationStyle={Platform.OS === "web" ? "overFullScreen" : "pageSheet"}
      onRequestClose={onClose}
    >
      <View style={[pickerStyles.container, { backgroundColor: theme.bg }]}>
        <View style={[pickerStyles.header, { borderBottomColor: theme.border }]}>
          <Text style={[pickerStyles.title, { color: theme.text }]}>Select Tags</Text>
          <Pressable onPress={onClose}>
            <Feather name="x" size={22} color={theme.textSecondary} />
          </Pressable>
        </View>
        <ScrollView style={pickerStyles.list}>
          {allTags.length === 0 && (
            <Text style={[pickerStyles.emptyText, { color: theme.textMuted }]}>No tags available</Text>
          )}
          {allTags.map((tag) => {
            const selected = selectedIds.includes(tag.id);
            return (
              <Pressable
                key={tag.id}
                style={[pickerStyles.item, { borderColor: theme.border, backgroundColor: theme.bgCard }, selected && [pickerStyles.itemSelected, { backgroundColor: theme.activeBg }]]}
                onPress={() => onToggle(tag.id)}
              >
                <View style={[pickerStyles.tagDot, { backgroundColor: tag.color ?? theme.textMuted }]} />
                <Text style={[pickerStyles.itemText, { color: theme.text }, selected && pickerStyles.itemTextSelected]}>
                  {tag.name}
                </Text>
                {selected && <Feather name="check" size={16} color={Colors.brand.tealLight} />}
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={[pickerStyles.doneRow, { borderTopColor: theme.border }]}>
          <Pressable style={pickerStyles.doneBtn} onPress={onClose}>
            <Text style={pickerStyles.doneBtnText}>Done ({selectedIds.length} selected)</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export default function InteractionScreen() {
  const { theme, isDark } = useTheme();
  const params = useLocalSearchParams<{ id: string; prospectId?: string }>();
  const interactionId = params.id;
  const queryClient = useQueryClient();

  const [showPropertyPicker, setShowPropertyPicker] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [isSaving, setIsSaving] = useState(false);

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

  const { data: interactionData, isLoading: iLoading, isError: iError } = useGetInteraction(
    interactionId,
    { query: { enabled: !!interactionId, queryKey: getGetInteractionQueryKey(interactionId) } },
  );

  const effectivePId = params.prospectId ?? interactionData?.prospectId ?? undefined;

  const { data: prospectData } = useGetProspect(
    effectivePId!,
    { query: { enabled: !!effectivePId, queryKey: getGetProspectQueryKey(effectivePId ?? "") } },
  );

  const { data: propertiesData } = useListProperties();
  const { data: tagsData } = useListTags();

  const interaction = interactionData;
  const prospect = prospectData?.prospect;
  const prospectTags = prospectData?.tags ?? [];
  const prospectTagIdStr = prospectTags.map((t) => t.id).join(",");
  const properties = propertiesData?.properties ?? [];
  const allTags = tagsData?.tags ?? [];

  useEffect(() => {
    if (prospect) {
      const ext = interaction?.structuredExtractionJson as Record<string, unknown> | null;
      setForm({
        firstName: prospect.firstName ?? (ext?.firstName as string) ?? "",
        lastName: prospect.lastName ?? (ext?.lastName as string) ?? "",
        email: prospect.email ?? (ext?.email as string) ?? "",
        desiredBedrooms: prospect.desiredBedrooms ?? (ext?.desiredBedrooms as string) ?? "",
        desiredMoveInDate: prospect.desiredMoveInDate ?? (ext?.desiredMoveInDate as string) ?? "",
        budgetMin: prospect.budgetMin != null ? String(prospect.budgetMin) : ((ext?.budgetMin as string) ?? ""),
        budgetMax: prospect.budgetMax != null ? String(prospect.budgetMax) : ((ext?.budgetMax as string) ?? ""),
        pets: prospect.pets ?? (ext?.pets as string) ?? "",
        voucherType: prospect.voucherType ?? (ext?.voucherType as string) ?? "",
        employmentStatus: prospect.employmentStatus ?? (ext?.employmentStatus as string) ?? "",
        monthlyIncome: prospect.monthlyIncome != null ? String(prospect.monthlyIncome) : ((ext?.monthlyIncome as string) ?? ""),
        languagePreference: prospect.languagePreference ?? (ext?.languagePreference as string) ?? "",
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
          budgetMin: ext.budgetMin != null ? String(ext.budgetMin) : prev.budgetMin,
          budgetMax: ext.budgetMax != null ? String(ext.budgetMax) : prev.budgetMax,
          pets: (ext.pets as string) ?? prev.pets,
          voucherType: (ext.voucherType as string) ?? prev.voucherType,
          employmentStatus: (ext.employmentStatus as string) ?? prev.employmentStatus,
          monthlyIncome: ext.monthlyIncome != null ? String(ext.monthlyIncome) : prev.monthlyIncome,
          languagePreference: (ext.languagePreference as string) ?? prev.languagePreference,
          propertyId: interaction.propertyId ?? "",
        }));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prospect?.id, interaction?.id, prospectTagIdStr]);

  const set = useCallback((field: keyof typeof form) => (val: string) => setForm((f) => ({ ...f, [field]: val })), []);
  const toggleTag = useCallback((id: string) => {
    setForm((f) => ({
      ...f,
      tagIds: f.tagIds.includes(id) ? f.tagIds.filter((t) => t !== id) : [...f.tagIds, id],
    }));
  }, []);

  const updateProspect = useUpdateProspect();
  const setProspectTags = useSetProspectTags();
  const reviewInteraction = useReviewInteraction();

  const handleSave = useCallback(async () => {
    if (!effectivePId || isSaving) return;
    setIsSaving(true);
    try {
      await updateProspect.mutateAsync({
        id: effectivePId,
        data: {
          firstName: form.firstName || undefined,
          lastName: form.lastName || undefined,
          email: form.email || undefined,
          desiredBedrooms: form.desiredBedrooms || undefined,
          desiredMoveInDate: form.desiredMoveInDate || undefined,
          budgetMin: form.budgetMin ? Number(form.budgetMin) : undefined,
          budgetMax: form.budgetMax ? Number(form.budgetMax) : undefined,
          pets: form.pets || undefined,
          voucherType: form.voucherType || undefined,
          employmentStatus: form.employmentStatus || undefined,
          monthlyIncome: form.monthlyIncome ? Number(form.monthlyIncome) : undefined,
          languagePreference: form.languagePreference || undefined,
          status: form.status,
          assignedPropertyId: form.propertyId || undefined,
        },
      });
      await setProspectTags.mutateAsync({
        id: effectivePId,
        data: { tagIds: form.tagIds },
      });
      await reviewInteraction.mutateAsync({
        id: interactionId,
        data: { propertyId: form.propertyId || undefined },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: getGetProspectQueryKey(effectivePId) });
      queryClient.invalidateQueries({ queryKey: getListProspectsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetInteractionQueryKey(interactionId) });
      queryClient.invalidateQueries({ queryKey: getGetInboxQueryKey() });
      Alert.alert("Saved", "Prospect details have been updated.");
    } catch (err) {
      Alert.alert("Error", String(err));
    } finally {
      setIsSaving(false);
    }
  }, [effectivePId, isSaving, form, interactionId, updateProspect, setProspectTags, reviewInteraction, queryClient]);

  const exportMutation = useCreateExport({
    mutation: {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        queryClient.invalidateQueries({ queryKey: getListExportsQueryKey() });
        if (effectivePId) {
          queryClient.invalidateQueries({ queryKey: getGetProspectQueryKey(effectivePId) });
        }
        Alert.alert("Exported", "Prospect exported. View in Exports tab.");
      },
      onError: (err) => Alert.alert("Error", String(err)),
    },
  });

  const noteMutation = useAddProspectNote({
    mutation: {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setNoteText("");
        if (effectivePId) {
          queryClient.invalidateQueries({ queryKey: getGetProspectQueryKey(effectivePId) });
        }
      },
      onError: (err) => Alert.alert("Error", String(err)),
    },
  });

  if (iLoading) {
    return (
      <View style={[styles.loadingCenter, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={Colors.brand.tealLight} />
      </View>
    );
  }

  if (iError || !interaction) {
    return (
      <View style={[styles.loadingCenter, { backgroundColor: theme.bg }]}>
        <Feather name="alert-circle" size={32} color={theme.textMuted} />
        <Text style={[styles.errorText, { color: theme.textSecondary }]}>Interaction not found</Text>
        <Pressable style={[styles.retryBtn, { backgroundColor: theme.bgCard, borderColor: theme.border }]} onPress={() => router.back()}>
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
        style={[styles.container, { backgroundColor: theme.bg }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Interaction Header */}
        <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
          <View style={styles.headerRow}>
            <View style={[styles.iconWrap, { backgroundColor: theme.activeBg }]}>
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
              <Text style={[styles.headerTime, { color: theme.text }]}>
                {new Date(interaction.occurredAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </Text>
              <Text style={[styles.headerPhone, { color: theme.textMuted }]}>{interaction.fromNumber} → {interaction.toNumber}</Text>
            </View>
          </View>
        </View>

        {/* Prospect link */}
        {prospect && (
          <Pressable
            style={[styles.prospectLink, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
            onPress={() => router.push({ pathname: "/prospect/[id]", params: { id: effectivePId! } })}
          >
            <Feather name="user" size={14} color={Colors.brand.tealLight} />
            <Text style={[styles.prospectLinkText, { color: theme.text }]}>{prospect.fullName ?? prospect.phonePrimary}</Text>
            <Feather name="chevron-right" size={14} color={theme.textMuted} />
          </Pressable>
        )}

        {/* AI Summary */}
        {(interaction.summary || interaction.category || interaction.urgency) && (
          <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
            <SectionHeader title="AI SUMMARY" />
            {interaction.summary && <Text style={[styles.bodyText, { color: theme.textSecondary }]}>{interaction.summary}</Text>}
            {(interaction.category || interaction.urgency) && (
              <View style={styles.chipRow}>
                {interaction.category && (
                  <View style={[styles.chip, { backgroundColor: theme.bgElevated, borderColor: theme.border }]}><Text style={[styles.chipText, { color: theme.textSecondary }]}>{interaction.category.replace(/_/g, " ")}</Text></View>
                )}
                {interaction.urgency && (
                  <View style={[styles.chip, { backgroundColor: theme.bgElevated, borderColor: theme.border }, interaction.urgency === "high" && styles.chipHigh]}>
                    <Text style={[styles.chipText, { color: theme.textSecondary }]}>{interaction.urgency} urgency</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* Raw message */}
        {(interaction.rawText || interaction.transcript) && (
          <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
            <SectionHeader title={interaction.transcript ? "TRANSCRIPT" : "MESSAGE"} />
            <Text style={[styles.rawText, { color: theme.textSecondary, backgroundColor: theme.bgElevated }]}>{interaction.transcript ?? interaction.rawText}</Text>
          </View>
        )}

        {/* Editable Prospect Fields */}
        <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
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
          <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
            <SectionHeader title="LEAD STATUS" />
            <View style={styles.statusRow}>
              {STATUS_OPTIONS.map((s) => (
                <Pressable
                  key={s}
                  style={[styles.statusChip, { backgroundColor: theme.bgElevated, borderColor: theme.border }, form.status === s && [styles.statusChipActive, { backgroundColor: theme.activeBg }]]}
                  onPress={() => setForm((f) => ({ ...f, status: s }))}
                >
                  <Text style={[styles.statusChipLabel, { color: theme.textSecondary }, form.status === s && styles.statusChipLabelActive]}>
                    {s}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Property Selector */}
        <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
          <SectionHeader title="PROPERTY" />
          <Pressable style={[styles.selectorBtn, { backgroundColor: theme.bgElevated, borderColor: theme.border }]} onPress={() => setShowPropertyPicker(true)}>
            <Feather name="home" size={15} color={Colors.brand.tealLight} />
            <Text style={[styles.selectorBtnText, { color: theme.text }]}>
              {selectedProperty ? selectedProperty.name : "No property assigned"}
            </Text>
            <Feather name="chevron-down" size={15} color={theme.textMuted} />
          </Pressable>
        </View>

        {/* Tags */}
        {effectivePId && (
          <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
            <View style={styles.cardHeaderRow}>
              <SectionHeader title="TAGS" />
              <Pressable onPress={() => setShowTagPicker(true)}>
                <Text style={styles.editLink}>Edit</Text>
              </Pressable>
            </View>
            <Pressable style={[styles.selectorBtn, { backgroundColor: theme.bgElevated, borderColor: theme.border }]} onPress={() => setShowTagPicker(true)}>
              {selectedTagObjects.length === 0 ? (
                <Text style={[styles.selectorPlaceholder, { color: theme.textMuted }]}>Tap to add tags...</Text>
              ) : (
                <View style={styles.tagChips}>
                  {selectedTagObjects.map((t) => (
                    <View key={t.id} style={[styles.tagChip, { borderColor: (t.color ?? theme.textMuted) + "66", backgroundColor: (t.color ?? theme.textMuted) + "22" }]}>
                      <Text style={[styles.tagChipText, { color: t.color ?? theme.textSecondary }]}>{t.name}</Text>
                    </View>
                  ))}
                </View>
              )}
            </Pressable>
          </View>
        )}

        {/* Notes */}
        {effectivePId && (
          <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
            <SectionHeader title={`NOTES (${prospectData?.notes?.length ?? 0})`} />
            {(prospectData?.notes ?? []).map((note) => (
              <View key={note.id} style={[styles.noteRow, { borderTopColor: theme.border }]}>
                <Feather name="edit-3" size={13} color={theme.textMuted} />
                <View style={styles.noteContent}>
                  <Text style={[styles.noteBody, { color: theme.textSecondary }]}>{note.body}</Text>
                  <Text style={[styles.noteTime, { color: theme.textMuted }]}>
                    {new Date(note.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </View>
              </View>
            ))}
            <View style={[styles.noteInputRow, { borderTopColor: theme.border }]}>
              <TextInput
                value={noteText}
                onChangeText={setNoteText}
                placeholder="Add a note..."
                placeholderTextColor={theme.textMuted}
                style={[styles.noteInput, { backgroundColor: theme.bgElevated, borderColor: theme.border, color: theme.text }]}
                multiline
                maxLength={1000}
              />
              <Pressable
                style={[styles.noteSendBtn, (!noteText.trim() || noteMutation.isPending) && [styles.noteSendBtnDisabled, { backgroundColor: theme.bgElevated, borderColor: theme.border }]]}
                onPress={() => {
                  if (noteText.trim() && effectivePId) {
                    noteMutation.mutate({ id: effectivePId, data: { body: noteText.trim() } });
                  }
                }}
                disabled={!noteText.trim() || noteMutation.isPending}
              >
                {noteMutation.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="send" size={16} color="#fff" />}
              </Pressable>
            </View>
          </View>
        )}

        {/* AI Suggestion hint */}
        {ext && Object.keys(ext).length > 0 && (
          <View style={[styles.aiHintCard, { backgroundColor: theme.activeBg }]}>
            <Feather name="zap" size={14} color={Colors.brand.tealLight} />
            <Text style={[styles.aiHintText, { color: theme.textSecondary }]}>
              AI extracted fields are pre-filled above. Adjust as needed and tap Save.
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsCard}>
          <Pressable
            style={[styles.saveBtn, isSaving && styles.actionDisabled]}
            onPress={handleSave}
            disabled={isSaving || !effectivePId}
          >
            {isSaving ? (
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
              style={[styles.exportBtn, { backgroundColor: theme.bgCard }, exportMutation.isPending && styles.actionDisabled]}
              onPress={() =>
                exportMutation.mutate({
                  data: { prospectIds: [effectivePId], format: CreateExportBodyFormat.csv },
                })
              }
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
