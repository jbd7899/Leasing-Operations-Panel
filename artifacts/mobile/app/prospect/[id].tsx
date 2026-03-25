import React, { useState, useRef, useEffect } from "react";
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
  Modal,
  Linking,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import {
  useGetProspect,
  useUpdateProspect,
  useAddProspectNote,
  useListTwilioNumbers,
  getGetProspectQueryKey,
  getListProspectsQueryKey,
  useSendSms,
  useGetProspectConflicts,
  useResolveProspectConflict,
  getProspectConflictsQueryKey,
  useGetAccountSettings,
  useGenerateAiDraft,
} from "@workspace/api-client-react";
import type { ProspectDetail, TwilioNumber, ProspectConflict } from "@workspace/api-client-react";
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

function ComposeModal({
  visible,
  onClose,
  prospectName,
  onSend,
  isSending,
  twilioNumbers,
  selectedNumberId,
  onSelectNumber,
  aiDraft,
  isLoadingDraft,
}: {
  visible: boolean;
  onClose: () => void;
  prospectName: string;
  onSend: (text: string) => void;
  isSending: boolean;
  twilioNumbers: TwilioNumber[];
  selectedNumberId: string | null;
  onSelectNumber: (id: string) => void;
  aiDraft?: string;
  isLoadingDraft?: boolean;
}) {
  const [messageText, setMessageText] = useState("");
  const [draftApplied, setDraftApplied] = useState(false);
  const multipleNumbers = twilioNumbers.length > 1;

  useEffect(() => {
    if (visible && aiDraft && !draftApplied) {
      setMessageText(aiDraft);
      setDraftApplied(true);
    }
    if (!visible) {
      setDraftApplied(false);
    }
  }, [visible, aiDraft, draftApplied]);

  const handleSend = () => {
    if (messageText.trim()) {
      onSend(messageText.trim());
    }
  };

  const handleClose = () => {
    setMessageText("");
    setDraftApplied(false);
    onClose();
  };

  const selectedNumber = twilioNumbers.find((n) => n.id === selectedNumberId) ?? twilioNumbers[0];

  return (
    <Modal
      visible={visible}
      animationType={Platform.OS === "web" ? "fade" : "slide"}
      presentationStyle={Platform.OS === "web" ? "overFullScreen" : "pageSheet"}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={composeStyles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={composeStyles.header}>
          <Pressable onPress={handleClose} style={composeStyles.cancelBtn}>
            <Text style={composeStyles.cancelText}>Cancel</Text>
          </Pressable>
          <Text style={composeStyles.title}>New Message</Text>
          <Pressable
            onPress={handleSend}
            style={[composeStyles.sendBtn, (!messageText.trim() || isSending || !selectedNumber) && composeStyles.sendBtnDisabled]}
            disabled={!messageText.trim() || isSending || !selectedNumber}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={composeStyles.sendText}>Send</Text>
            )}
          </Pressable>
        </View>

        <View style={composeStyles.toRow}>
          <Feather name="message-square" size={16} color={Colors.brand.tealLight} />
          <Text style={composeStyles.toLabel}>To:</Text>
          <Text style={composeStyles.toName}>{prospectName}</Text>
        </View>

        {twilioNumbers.length === 0 ? (
          <View style={composeStyles.noNumberWarn}>
            <Feather name="alert-triangle" size={16} color="#FCA84A" />
            <Text style={composeStyles.noNumberWarnText}>
              No Twilio numbers configured. Add one in Settings.
            </Text>
          </View>
        ) : multipleNumbers ? (
          <View style={composeStyles.fromRow}>
            <Feather name="phone-outgoing" size={15} color={Colors.dark.textMuted} />
            <Text style={composeStyles.fromLabel}>From:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={composeStyles.numberChips}>
              {twilioNumbers.map((n) => (
                <Pressable
                  key={n.id}
                  style={[composeStyles.numberChip, selectedNumberId === n.id && composeStyles.numberChipActive]}
                  onPress={() => onSelectNumber(n.id)}
                >
                  <Text style={[composeStyles.numberChipText, selectedNumberId === n.id && composeStyles.numberChipTextActive]}>
                    {n.friendlyName ?? n.phoneNumber}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : selectedNumber ? (
          <View style={composeStyles.fromRowSingle}>
            <Feather name="phone-outgoing" size={15} color={Colors.dark.textMuted} />
            <Text style={composeStyles.fromLabel}>From:</Text>
            <Text style={composeStyles.fromValue}>{selectedNumber.friendlyName ?? selectedNumber.phoneNumber}</Text>
          </View>
        ) : null}

        <View style={composeStyles.divider} />

        {isLoadingDraft ? (
          <View style={composeStyles.draftLoading}>
            <ActivityIndicator size="small" color={Colors.brand.tealLight} />
            <Text style={composeStyles.draftLoadingText}>Generating AI draft…</Text>
          </View>
        ) : null}

        {aiDraft && messageText === aiDraft && !isLoadingDraft ? (
          <View style={composeStyles.draftBadge}>
            <Feather name="cpu" size={11} color={Colors.brand.tealLight} />
            <Text style={composeStyles.draftBadgeText}>AI Draft</Text>
          </View>
        ) : null}

        <TextInput
          value={messageText}
          onChangeText={setMessageText}
          placeholder={isLoadingDraft ? "" : "Type your message..."}
          placeholderTextColor={Colors.dark.textMuted}
          style={composeStyles.input}
          multiline
          autoFocus={!isLoadingDraft}
          maxLength={1600}
          editable={!isLoadingDraft}
        />

        <Text style={composeStyles.charCount}>{messageText.length}/1600</Text>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function ProspectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [noteText, setNoteText] = useState("");
  const [composeVisible, setComposeVisible] = useState(false);
  const [selectedTwilioNumberId, setSelectedTwilioNumberId] = useState<string | null>(null);
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [editingField, setEditingField] = useState<string | null>(null);
  const [aiDraftText, setAiDraftText] = useState<string | undefined>(undefined);
  const noteInputRef = useRef<TextInput>(null);

  const { data, isLoading, isError, refetch } = useGetProspect(id, {
    query: { enabled: !!id, queryKey: getGetProspectQueryKey(id) },
  });

  const { data: twilioNumbersData } = useListTwilioNumbers({
    query: {
      select: (d) => ({
        ...d,
        twilioNumbers: d.twilioNumbers.filter((n) => n.isActive),
      }),
    },
  });

  const activeTwilioNumbers = twilioNumbersData?.twilioNumbers ?? [];

  const { data: accountSettingsData } = useGetAccountSettings();
  const aiAssistEnabled = accountSettingsData?.aiAssistEnabled ?? false;

  const aiDraftMutation = useGenerateAiDraft({
    mutation: {
      onSuccess: (data) => {
        setAiDraftText(data.draft || undefined);
      },
      onError: () => {
        setAiDraftText(undefined);
      },
    },
  });

  function openCompose() {
    setAiDraftText(undefined);
    setComposeVisible(true);
    if (aiAssistEnabled && id) {
      aiDraftMutation.mutate({ prospectId: id });
    }
  }

  const statusMutation = useUpdateProspect({
    mutation: {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        queryClient.invalidateQueries({ queryKey: getGetProspectQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getListProspectsQueryKey() });
      },
      onError: (err) => Alert.alert("Error", String(err)),
    },
  });

  const noteMutation = useAddProspectNote({
    mutation: {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setNoteText("");
        queryClient.invalidateQueries({ queryKey: getGetProspectQueryKey(id) });
      },
      onError: (err) => Alert.alert("Error", String(err)),
    },
  });

  const conflictsQuery = useGetProspectConflicts(id, {
    query: { enabled: !!id },
  });

  const conflicts: ProspectConflict[] = conflictsQuery.data?.conflicts ?? [];

  const resolveMutation = useResolveProspectConflict({
    mutation: {
      onSuccess: (result) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        queryClient.invalidateQueries({ queryKey: getProspectConflictsQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getGetProspectQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getListProspectsQueryKey() });
        setEditingField(null);
        setCustomValues((prev) => {
          const next = { ...prev };
          delete next[result.conflict.fieldName];
          return next;
        });
      },
      onError: (err) => Alert.alert("Error", String(err)),
    },
  });

  const smsMutation = useSendSms({
    mutation: {
      onMutate: async ({ body, fromTwilioNumberId }) => {
        await queryClient.cancelQueries({ queryKey: getGetProspectQueryKey(id) });
        const previous = queryClient.getQueryData<ProspectDetail>(getGetProspectQueryKey(id));

        const fromNumber = activeTwilioNumbers.find((n) => n.id === fromTwilioNumberId)?.phoneNumber
          ?? activeTwilioNumbers[0]?.phoneNumber
          ?? "";

        const now = new Date().toISOString();
        const optimisticInteraction = {
          id: `optimistic-${Date.now()}`,
          accountId: previous?.prospect.accountId ?? "",
          prospectId: id,
          propertyId: previous?.prospect.assignedPropertyId ?? null,
          sourceType: "sms",
          direction: "outbound",
          twilioMessageSid: null,
          twilioCallSid: null,
          parentThreadKey: null,
          fromNumber,
          toNumber: previous?.prospect.phonePrimary ?? "",
          rawText: body,
          transcript: null,
          summary: body,
          category: null,
          urgency: null,
          sentiment: null,
          extractionConfidence: null,
          structuredExtractionJson: null,
          extractionStatus: "skipped",
          occurredAt: now,
          createdAt: now,
          updatedAt: now,
        };

        if (previous) {
          queryClient.setQueryData<ProspectDetail>(getGetProspectQueryKey(id), {
            ...previous,
            interactions: [...(previous.interactions ?? []), optimisticInteraction],
          });
        }

        return { previous };
      },
      onError: (_err: unknown, _vars: unknown, context?: { previous?: ProspectDetail }) => {
        if (context?.previous) {
          queryClient.setQueryData(getGetProspectQueryKey(id), context.previous);
        }
        const msg = _err instanceof Error ? _err.message : String(_err);
        Alert.alert("Failed to Send", msg);
      },
      onSuccess: (interaction) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setComposeVisible(false);
        const previous = queryClient.getQueryData<ProspectDetail>(getGetProspectQueryKey(id));
        if (previous) {
          queryClient.setQueryData<ProspectDetail>(getGetProspectQueryKey(id), {
            ...previous,
            interactions: (previous.interactions ?? [])
              .filter((i) => !i.id.startsWith("optimistic-"))
              .concat(interaction),
          });
        } else {
          queryClient.invalidateQueries({ queryKey: getGetProspectQueryKey(id) });
        }
      },
    },
  });

  const handleCall = (phone: string) => {
    const url = `tel:${phone}`;
    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert("Cannot Open Phone", "Your device does not support phone calls.");
      }
    });
  };

  const handleSendMessage = (text: string) => {
    const fromId = selectedTwilioNumberId ?? activeTwilioNumbers[0]?.id;
    smsMutation.mutate({
      prospectId: id,
      body: text,
      ...(fromId ? { fromTwilioNumberId: fromId } : {}),
    });
  };

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
  const hasPhone = !!prospect.phonePrimary;

  return (
    <>
      <ComposeModal
        visible={composeVisible}
        onClose={() => setComposeVisible(false)}
        prospectName={name}
        onSend={handleSendMessage}
        isSending={smsMutation.isPending}
        twilioNumbers={activeTwilioNumbers}
        selectedNumberId={selectedTwilioNumberId ?? activeTwilioNumbers[0]?.id ?? null}
        onSelectNumber={setSelectedTwilioNumberId}
        aiDraft={aiDraftText}
        isLoadingDraft={aiAssistEnabled && aiDraftMutation.isPending}
      />

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

            {/* Call & Message action buttons */}
            {hasPhone && (
              <View style={styles.heroCtas}>
                <Pressable
                  style={styles.ctaBtn}
                  onPress={() => handleCall(prospect.phonePrimary)}
                >
                  <Feather name="phone" size={18} color="#fff" />
                  <Text style={styles.ctaBtnText}>Call</Text>
                </Pressable>
                <Pressable
                  style={[styles.ctaBtn, styles.ctaBtnOutline]}
                  onPress={openCompose}
                >
                  <Feather name="message-square" size={18} color={Colors.brand.tealLight} />
                  <Text style={[styles.ctaBtnText, styles.ctaBtnOutlineText]}>Message</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Status */}
          <View style={styles.card}>
            <SectionHeader title="LEAD STATUS" />
            <StatusPicker
              currentStatus={prospect.status}
              onSelect={(s) => statusMutation.mutate({ id, data: { status: s } })}
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

          {/* Data Conflicts */}
          {conflicts.length > 0 && (
            <View style={[styles.card, conflictStyles.conflictCard]}>
              <View style={styles.cardHeaderRow}>
                <View style={conflictStyles.headerLeft}>
                  <Feather name="alert-circle" size={14} color="#FCA84A" />
                  <SectionHeader title="DATA CONFLICTS" />
                </View>
                <View style={conflictStyles.countBadge}>
                  <Text style={conflictStyles.countText}>{conflicts.length}</Text>
                </View>
              </View>
              <Text style={conflictStyles.description}>
                The AI extracted values that differ from what's saved. Choose which is correct.
              </Text>
              {conflicts.map((conflict) => {
                const isEditing = editingField === conflict.fieldName;
                const isPending = resolveMutation.isPending &&
                  (resolveMutation.variables as { fieldName: string })?.fieldName === conflict.fieldName;
                return (
                  <View key={conflict.id} style={conflictStyles.conflictRow}>
                    <Text style={conflictStyles.fieldLabel}>
                      {conflict.fieldName.replace(/([A-Z])/g, " $1").trim()}
                    </Text>
                    <View style={conflictStyles.valuesRow}>
                      <Pressable
                        style={conflictStyles.valueOption}
                        onPress={() => {
                          if (!isPending) {
                            resolveMutation.mutate({
                              prospectId: id,
                              fieldName: conflict.fieldName,
                              chosenValue: conflict.existingValue ?? "",
                            });
                          }
                        }}
                        disabled={isPending}
                      >
                        <Text style={conflictStyles.valueOptionLabel}>Keep existing</Text>
                        <Text style={conflictStyles.valueOptionValue} numberOfLines={1}>
                          {conflict.existingValue ?? "(empty)"}
                        </Text>
                      </Pressable>
                      <Pressable
                        style={[conflictStyles.valueOption, conflictStyles.valueOptionNew]}
                        onPress={() => {
                          if (!isPending) {
                            resolveMutation.mutate({
                              prospectId: id,
                              fieldName: conflict.fieldName,
                              chosenValue: conflict.extractedValue,
                            });
                          }
                        }}
                        disabled={isPending}
                      >
                        <Text style={[conflictStyles.valueOptionLabel, conflictStyles.valueOptionLabelNew]}>
                          Use AI value
                        </Text>
                        <Text style={[conflictStyles.valueOptionValue, conflictStyles.valueOptionValueNew]} numberOfLines={1}>
                          {conflict.extractedValue}
                        </Text>
                      </Pressable>
                    </View>
                    {isEditing ? (
                      <View style={conflictStyles.customRow}>
                        <TextInput
                          value={customValues[conflict.fieldName] ?? ""}
                          onChangeText={(t) =>
                            setCustomValues((prev) => ({ ...prev, [conflict.fieldName]: t }))
                          }
                          placeholder="Enter custom value..."
                          placeholderTextColor={Colors.dark.textMuted}
                          style={conflictStyles.customInput}
                          autoFocus
                        />
                        <Pressable
                          style={conflictStyles.customSaveBtn}
                          onPress={() => {
                            const val = customValues[conflict.fieldName]?.trim();
                            if (val) {
                              resolveMutation.mutate({
                                prospectId: id,
                                fieldName: conflict.fieldName,
                                chosenValue: val,
                              });
                            }
                          }}
                          disabled={isPending || !customValues[conflict.fieldName]?.trim()}
                        >
                          {isPending ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Text style={conflictStyles.customSaveText}>Save</Text>
                          )}
                        </Pressable>
                        <Pressable
                          style={conflictStyles.customCancelBtn}
                          onPress={() => setEditingField(null)}
                        >
                          <Feather name="x" size={16} color={Colors.dark.textMuted} />
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable
                        style={conflictStyles.customEditBtn}
                        onPress={() => {
                          setEditingField(conflict.fieldName);
                          setCustomValues((prev) => ({ ...prev, [conflict.fieldName]: "" }));
                        }}
                      >
                        <Feather name="edit-2" size={12} color={Colors.dark.textMuted} />
                        <Text style={conflictStyles.customEditText}>Enter custom value</Text>
                      </Pressable>
                    )}
                    {isPending && !isEditing && (
                      <ActivityIndicator
                        size="small"
                        color={Colors.brand.tealLight}
                        style={conflictStyles.loadingIndicator}
                      />
                    )}
                  </View>
                );
              })}
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
            {prospect.exportStatus !== "pending" && (
              <Pressable
                style={[styles.actionButtonOutline, statusMutation.isPending && styles.actionButtonDisabled]}
                onPress={() =>
                  statusMutation.mutate({ id, data: { exportStatus: "pending" } })
                }
                disabled={statusMutation.isPending}
              >
                {statusMutation.isPending ? (
                  <ActivityIndicator size="small" color={Colors.brand.tealLight} />
                ) : (
                  <>
                    <Feather name="clock" size={16} color={Colors.brand.tealLight} />
                    <Text style={styles.actionButtonOutlineText}>Mark Export-Ready</Text>
                  </>
                )}
              </Pressable>
            )}
            {prospect.exportStatus === "pending" && (
              <View style={styles.pendingBadge}>
                <Feather name="check-circle" size={14} color={Colors.brand.tealLight} />
                <Text style={styles.pendingBadgeText}>In Export Queue — use the Exports tab to batch export</Text>
              </View>
            )}
          </View>

          {/* Interactions */}
          {(interactions ?? []).length > 0 && (
            <View style={styles.card}>
              <SectionHeader title={`INTERACTIONS (${interactions!.length})`} />
              {interactions!.map((interaction) => {
                const isOptimistic = interaction.id.startsWith("optimistic-");
                const isOutbound = interaction.direction === "outbound";
                return (
                  <Pressable
                    key={interaction.id}
                    style={styles.interactionRow}
                    onPress={() => {
                      if (isOptimistic) return;
                      router.push({
                        pathname: "/interaction/[id]",
                        params: { id: interaction.id, prospectId: id },
                      });
                    }}
                  >
                    <View style={[
                      styles.interactionIconWrap,
                      isOutbound && styles.interactionIconWrapOutbound,
                    ]}>
                      <Feather
                        name={
                          isOutbound
                            ? "send"
                            : interaction.sourceType === "sms"
                            ? "message-square"
                            : interaction.sourceType === "voicemail"
                            ? "mic"
                            : "phone"
                        }
                        size={14}
                        color={isOutbound ? "#A3E4D7" : Colors.brand.tealLight}
                      />
                    </View>
                    <View style={styles.interactionContent}>
                      <View style={styles.interactionTopRow}>
                        <View style={styles.interactionBadgeRow}>
                          <Badge label={interaction.sourceType} value={interaction.sourceType} />
                          {isOutbound && (
                            <View style={styles.outboundBadge}>
                              <Text style={styles.outboundBadgeText}>
                                {isOptimistic ? "Sending…" : "Sent"}
                              </Text>
                            </View>
                          )}
                        </View>
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
                        <Text style={[styles.interactionText, isOptimistic && styles.interactionTextOptimistic]}>
                          {interaction.summary ?? interaction.rawText ?? interaction.transcript}
                        </Text>
                      )}
                      {interaction.category && !isOutbound && (
                        <Text style={styles.interactionCategory}>
                          {interaction.category.replace(/_/g, " ")}
                        </Text>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* Tags */}
          {(tags ?? []).length > 0 && (
            <View style={styles.card}>
              <SectionHeader title="TAGS" />
              <View style={styles.tagsRow}>
                {tags!.map((tag) => (
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
            <SectionHeader title={`NOTES (${(notes ?? []).length})`} />
            {(notes ?? []).map((note) => (
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
                  if (noteText.trim()) noteMutation.mutate({ id, data: { body: noteText.trim() } });
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
    </>
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
  heroCtas: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.brand.teal,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 24,
    minWidth: 100,
    justifyContent: "center",
  },
  ctaBtnOutline: {
    backgroundColor: "#0A2020",
    borderWidth: 1,
    borderColor: Colors.brand.teal,
  },
  ctaBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  ctaBtnOutlineText: {
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
  summaryText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary,
    lineHeight: 21,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonOutline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0A2020",
    borderWidth: 1,
    borderColor: Colors.brand.teal,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 8,
  },
  actionButtonOutlineText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.brand.tealLight,
  },
  pendingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#0A2020",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.brand.teal,
  },
  pendingBadgeText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.brand.tealLight,
    lineHeight: 18,
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
  interactionIconWrapOutbound: {
    backgroundColor: "#0A2030",
  },
  interactionBadgeRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  outboundBadge: {
    backgroundColor: "#0A2030",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "#3A7BD5",
  },
  outboundBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: "#7AB8F5",
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
  interactionTextOptimistic: {
    opacity: 0.6,
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

const composeStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.bg,
    paddingTop: Platform.OS === "ios" ? 0 : 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  cancelBtn: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    minWidth: 60,
  },
  cancelText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary,
  },
  title: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.text,
  },
  sendBtn: {
    backgroundColor: Colors.brand.teal,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 7,
    minWidth: 60,
    alignItems: "center",
  },
  sendBtnDisabled: {
    backgroundColor: Colors.dark.bgElevated,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  sendText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  toRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  toLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textMuted,
  },
  toName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.text,
    flex: 1,
  },
  fromRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  fromRowSingle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  fromLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textMuted,
    marginRight: 2,
  },
  fromValue: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.textSecondary,
  },
  numberChips: {
    flexDirection: "row",
    gap: 8,
    paddingRight: 16,
  },
  numberChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: Colors.dark.bgCard,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  numberChipActive: {
    backgroundColor: "#0D2A2A",
    borderColor: Colors.brand.tealLight,
  },
  numberChipText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.textSecondary,
  },
  numberChipTextActive: {
    color: Colors.brand.tealLight,
  },
  noNumberWarn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#2A1A0A",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: "#664400",
  },
  noNumberWarnText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#FCA84A",
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.dark.border,
    marginHorizontal: 16,
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.text,
    textAlignVertical: "top",
  },
  charCount: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textMuted,
    textAlign: "right",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  draftLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  draftLoadingText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textMuted,
  },
  draftBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 2,
  },
  draftBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.brand.tealLight,
    letterSpacing: 0.3,
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

const conflictStyles = StyleSheet.create({
  conflictCard: {
    borderColor: "#664400",
    backgroundColor: "#1A0E00",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  countBadge: {
    backgroundColor: "#FCA84A22",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "#664400",
  },
  countText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#FCA84A",
  },
  description: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary,
    lineHeight: 17,
  },
  conflictRow: {
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#664400",
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#FCA84A",
    textTransform: "capitalize",
    letterSpacing: 0.3,
  },
  valuesRow: {
    flexDirection: "row",
    gap: 8,
  },
  valueOption: {
    flex: 1,
    backgroundColor: Colors.dark.bgElevated,
    borderRadius: 10,
    padding: 10,
    gap: 3,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  valueOptionNew: {
    backgroundColor: "#0D2A2A",
    borderColor: Colors.brand.teal,
  },
  valueOptionLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  valueOptionLabelNew: {
    color: Colors.brand.tealLight,
  },
  valueOptionValue: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.text,
  },
  valueOptionValueNew: {
    color: Colors.dark.text,
  },
  customEditBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: Colors.dark.bgElevated,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  customEditText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textMuted,
  },
  customRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  customInput: {
    flex: 1,
    backgroundColor: Colors.dark.bgInput,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.text,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  customSaveBtn: {
    backgroundColor: Colors.brand.teal,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 54,
  },
  customSaveText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  customCancelBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.dark.bgElevated,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingIndicator: {
    alignSelf: "center",
    marginTop: 4,
  },
});
