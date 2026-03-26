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
  useListProperties,
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
import { useTwilioCall } from "@/contexts/TwilioCallContext";

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
  const { startCall } = useTwilioCall();
  const [noteText, setNoteText] = useState("");
  const [selectedTwilioNumberId, setSelectedTwilioNumberId] = useState<string | null>(null);
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [editingField, setEditingField] = useState<string | null>(null);
  const [aiDraftText, setAiDraftText] = useState<string | undefined>(undefined);
  const [composeText, setComposeText] = useState("");
  const scrollViewRef = useRef<ScrollView>(null);
  const noteInputRef = useRef<TextInput>(null);
  const composeInputRef = useRef<TextInput>(null);

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

  const { data: propertiesData } = useListProperties();

  const { data: accountSettingsData } = useGetAccountSettings();
  const aiAssistEnabled = accountSettingsData?.aiAssistEnabled ?? false;

  const aiDraftMutation = useGenerateAiDraft({
    mutation: {
      onSuccess: (result) => {
        const draft = result.draft || undefined;
        setAiDraftText(draft);
        if (draft) {
          setComposeText(draft);
        }
      },
      onError: () => {
        setAiDraftText(undefined);
      },
    },
  });


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
        setComposeText("");
        setAiDraftText(undefined);
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
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 200);
      },
    },
  });

  const handleCall = (phone: string) => {
    const prospectName = data?.prospect?.fullName ?? phone;
    const callerNumber = selectedNumber?.phoneNumber ?? activeTwilioNumbers[0]?.phoneNumber ?? null;
    startCall(prospectName, phone, callerNumber);
  };

  const handleSendMessage = () => {
    const text = composeText.trim();
    if (!text) return;
    const fromId = selectedTwilioNumberId ?? activeTwilioNumbers[0]?.id;
    smsMutation.mutate({
      prospectId: id,
      body: text,
      ...(fromId ? { fromTwilioNumberId: fromId } : {}),
    });
  };

  const selectedNumber = activeTwilioNumbers.find((n) => n.id === selectedTwilioNumberId) ?? activeTwilioNumbers[0];
  const isLoadingDraft = aiAssistEnabled && aiDraftMutation.isPending;
  const showAiDraftBadge = isLoadingDraft || (aiDraftText && composeText === aiDraftText);

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
  const assignedPropertyName = prospect.assignedPropertyId
    ? (propertiesData?.properties ?? []).find((p) => p.id === prospect.assignedPropertyId)?.name ?? null
    : null;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
    >
      {/* Compact Sticky Header */}
      <View style={styles.compactHeader}>
        <View style={styles.compactHeaderLeft}>
          <View style={styles.avatarSm}>
            <Text style={styles.avatarSmText}>
              {name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()}
            </Text>
          </View>
          <View style={styles.compactHeaderInfo}>
            <Text style={styles.compactName} numberOfLines={1}>{name}</Text>
            {assignedPropertyName && (
              <Text style={styles.compactProperty} numberOfLines={1}>{assignedPropertyName}</Text>
            )}
          </View>
        </View>
        <View style={styles.compactHeaderRight}>
          <Badge label={prospect.status} value={prospect.status} />
          {hasPhone && activeTwilioNumbers.length > 0 && (
            <Pressable
              style={styles.callIconBtn}
              onPress={() => handleCall(prospect.phonePrimary)}
            >
              <Feather name="phone" size={16} color={Colors.brand.tealLight} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => {
          scrollViewRef.current?.scrollToEnd({ animated: false });
        }}
      >
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

        {/* Conversation Thread */}
        {(interactions ?? []).length > 0 && (
          <View style={styles.card}>
            <SectionHeader title={`CONVERSATION (${interactions!.length})`} />
            <View style={chatStyles.thread}>
              {interactions!.map((interaction) => {
                const isOptimistic = interaction.id.startsWith("optimistic-");
                const isOutbound = interaction.direction === "outbound";
                const isCall = interaction.sourceType === "call" || interaction.sourceType === "voicemail";
                const messageText = interaction.summary ?? interaction.rawText ?? interaction.transcript;
                const timeLabel = new Date(interaction.occurredAt).toLocaleDateString("en-US", {
                  month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                });

                if (isCall) {
                  return (
                    <Pressable
                      key={interaction.id}
                      style={chatStyles.callRow}
                      onPress={() => {
                        if (!isOptimistic) router.push({ pathname: "/interaction/[id]", params: { id: interaction.id, prospectId: id } });
                      }}
                    >
                      <View style={chatStyles.callPill}>
                        <Feather
                          name={interaction.sourceType === "voicemail" ? "mic" : isOutbound ? "phone-outgoing" : "phone-incoming"}
                          size={11}
                          color={Colors.dark.textMuted}
                        />
                        <Text style={chatStyles.callText}>
                          {interaction.sourceType === "voicemail" ? "Voicemail" : isOutbound ? "Outgoing call" : "Incoming call"}
                          {" · "}{timeLabel}
                        </Text>
                      </View>
                      {messageText && <Text style={chatStyles.callSummary}>{messageText}</Text>}
                    </Pressable>
                  );
                }

                return (
                  <Pressable
                    key={interaction.id}
                    style={[chatStyles.bubbleRow, isOutbound ? chatStyles.bubbleRowOutbound : chatStyles.bubbleRowInbound]}
                    onPress={() => {
                      if (!isOptimistic) router.push({ pathname: "/interaction/[id]", params: { id: interaction.id, prospectId: id } });
                    }}
                  >
                    <View style={[chatStyles.bubble, isOutbound ? chatStyles.bubbleOutbound : chatStyles.bubbleInbound]}>
                      {messageText ? (
                        <Text style={[chatStyles.bubbleText, isOptimistic && chatStyles.bubbleTextOptimistic]}>
                          {messageText}
                        </Text>
                      ) : (
                        <Text style={chatStyles.bubbleTextEmpty}>
                          {isOptimistic ? "Sending…" : "(no content)"}
                        </Text>
                      )}
                      <Text style={[chatStyles.bubbleTime, isOutbound ? chatStyles.bubbleTimeOutbound : chatStyles.bubbleTimeInbound]}>
                        {timeLabel}{isOptimistic ? " · Sending…" : ""}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
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

        <View style={{ height: 16 }} />
      </ScrollView>

      {/* Pinned Compose Bar */}
      <View style={composeBarStyles.container}>
        {/* SMS Header Label */}
        <View style={composeBarStyles.smsHeader}>
          <Feather name="message-square" size={14} color={Colors.brand.tealLight} />
          <Text style={composeBarStyles.smsHeaderLabel}>
            {prospect.firstName ? `Text ${prospect.firstName}` : "Send SMS"}
          </Text>
        </View>

        {/* From number selector */}
        {activeTwilioNumbers.length === 0 ? (
          <View style={composeBarStyles.noNumberWarn}>
            <Feather name="alert-triangle" size={13} color="#FCA84A" />
            <Text style={composeBarStyles.noNumberWarnText}>No Twilio numbers configured</Text>
          </View>
        ) : activeTwilioNumbers.length > 1 ? (
          <View style={composeBarStyles.fromRow}>
            <Feather name="phone-outgoing" size={13} color={Colors.dark.textMuted} />
            <Text style={composeBarStyles.fromLabel}>From:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={composeBarStyles.numberChips}>
              {activeTwilioNumbers.map((n) => (
                <Pressable
                  key={n.id}
                  style={[composeBarStyles.numberChip, (selectedTwilioNumberId ?? activeTwilioNumbers[0]?.id) === n.id && composeBarStyles.numberChipActive]}
                  onPress={() => setSelectedTwilioNumberId(n.id)}
                >
                  <Text style={[composeBarStyles.numberChipText, (selectedTwilioNumberId ?? activeTwilioNumbers[0]?.id) === n.id && composeBarStyles.numberChipTextActive]}>
                    {n.friendlyName ?? n.phoneNumber}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : selectedNumber ? (
          <View style={composeBarStyles.fromRowSingle}>
            <Feather name="phone-outgoing" size={13} color={Colors.dark.textMuted} />
            <Text style={composeBarStyles.fromLabel}>From:</Text>
            <Text style={composeBarStyles.fromValue}>{selectedNumber.friendlyName ?? selectedNumber.phoneNumber}</Text>
          </View>
        ) : null}

        {/* AI Draft badge */}
        {showAiDraftBadge ? (
          <View style={composeBarStyles.aiBadgeRow}>
            {isLoadingDraft ? (
              <>
                <ActivityIndicator size="small" color={Colors.brand.tealLight} />
                <Text style={composeBarStyles.aiBadgeText}>Generating AI draft…</Text>
              </>
            ) : (
              <>
                <Feather name="cpu" size={11} color={Colors.brand.tealLight} />
                <Text style={composeBarStyles.aiBadgeText}>AI Draft</Text>
              </>
            )}
          </View>
        ) : null}

        {/* Input row */}
        <View style={composeBarStyles.inputRow}>
          <TextInput
            ref={composeInputRef}
            value={composeText}
            onChangeText={setComposeText}
            placeholder={isLoadingDraft ? "Generating AI draft…" : prospect.firstName ? `Message ${prospect.firstName}…` : "Send a text message…"}
            placeholderTextColor={Colors.dark.textMuted}
            style={composeBarStyles.input}
            multiline
            maxLength={1600}
            editable={!isLoadingDraft}
            autoFocus
          />
          {aiAssistEnabled && (
            <Pressable
              style={[
                composeBarStyles.aiGenerateBtn,
                (aiDraftMutation.isPending || smsMutation.isPending) && composeBarStyles.aiGenerateBtnDisabled,
              ]}
              onPress={() => aiDraftMutation.mutate({ prospectId: id })}
              disabled={aiDraftMutation.isPending || smsMutation.isPending}
            >
              {aiDraftMutation.isPending ? (
                <ActivityIndicator size="small" color={Colors.brand.tealLight} />
              ) : (
                <Feather name="zap" size={18} color={Colors.brand.tealLight} />
              )}
            </Pressable>
          )}
          <Pressable
            style={[
              composeBarStyles.sendBtn,
              (!composeText.trim() || smsMutation.isPending || !selectedNumber || activeTwilioNumbers.length === 0) && composeBarStyles.sendBtnDisabled,
            ]}
            onPress={handleSendMessage}
            disabled={!composeText.trim() || smsMutation.isPending || !selectedNumber || activeTwilioNumbers.length === 0}
          >
            {smsMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Feather name="send" size={18} color="#fff" />
            )}
          </Pressable>
        </View>

        <Text style={composeBarStyles.charCount}>{composeText.length}/1600</Text>

        {/* Status Picker Row — de-emphasized, below the input */}
        <View style={composeBarStyles.statusRow}>
          <Text style={composeBarStyles.statusLabel}>Status:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={composeBarStyles.statusChips}>
            {STATUS_OPTIONS.map((s) => (
              <Pressable
                key={s}
                style={[composeBarStyles.statusChip, s === prospect.status && composeBarStyles.statusChipActive]}
                onPress={() => statusMutation.mutate({ id, data: { status: s } })}
                disabled={statusMutation.isPending || s === prospect.status}
              >
                {statusMutation.isPending && s === prospect.status ? (
                  <ActivityIndicator size="small" color={Colors.brand.tealLight} />
                ) : (
                  <Text style={[composeBarStyles.statusChipLabel, s === prospect.status && composeBarStyles.statusChipLabelActive]}>
                    {s}
                  </Text>
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.dark.bg,
  },
  compactHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.dark.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  compactHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  avatarSm: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#0D2A2A",
    borderWidth: 1.5,
    borderColor: Colors.brand.teal,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarSmText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: Colors.brand.tealLight,
  },
  compactHeaderInfo: {
    flex: 1,
    minWidth: 0,
  },
  compactName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.text,
  },
  compactProperty: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textMuted,
  },
  compactHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  callIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#0A2020",
    borderWidth: 1,
    borderColor: Colors.brand.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
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
    opacity: 0.4,
  },
});

const composeBarStyles = StyleSheet.create({
  container: {
    backgroundColor: Colors.dark.bgCard,
    borderTopWidth: 2,
    borderTopColor: Colors.brand.teal,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 28 : 12,
    gap: 8,
  },
  smsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  smsHeaderLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.brand.tealLight,
    letterSpacing: 0.2,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    opacity: 0.75,
  },
  statusLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.textMuted,
    flexShrink: 0,
  },
  statusChips: {
    flexDirection: "row",
    gap: 5,
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: Colors.dark.bgElevated,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  statusChipActive: {
    backgroundColor: "#0A2020",
    borderColor: Colors.brand.teal,
  },
  statusChipLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.textMuted,
    textTransform: "capitalize",
  },
  statusChipLabelActive: {
    color: Colors.brand.tealLight,
  },
  noNumberWarn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 2,
  },
  noNumberWarnText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#FCA84A",
  },
  fromRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  fromLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.textMuted,
    flexShrink: 0,
  },
  numberChips: {
    flexDirection: "row",
    gap: 6,
  },
  numberChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: Colors.dark.bgElevated,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  numberChipActive: {
    backgroundColor: "#0A2020",
    borderColor: Colors.brand.teal,
  },
  numberChipText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.textMuted,
  },
  numberChipTextActive: {
    color: Colors.brand.tealLight,
  },
  fromRowSingle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  fromValue: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary,
  },
  aiBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 2,
  },
  aiBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.brand.tealLight,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.dark.bgInput,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.text,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    minHeight: 44,
    maxHeight: 120,
  },
  aiGenerateBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.dark.bgElevated,
    borderWidth: 1,
    borderColor: Colors.brand.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  aiGenerateBtnDisabled: {
    opacity: 0.4,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.brand.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  charCount: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textMuted,
    textAlign: "right",
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

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 3,
  },
  icon: {
    width: 16,
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.textMuted,
    width: 90,
  },
  value: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary,
  },
});

const statusStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: Colors.dark.bgElevated,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    minHeight: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  chipActive: {
    backgroundColor: "#0A2020",
    borderColor: Colors.brand.teal,
  },
  chipLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.textMuted,
    textTransform: "capitalize",
  },
  chipLabelActive: {
    color: Colors.brand.tealLight,
  },
});

const conflictStyles = StyleSheet.create({
  conflictCard: {
    borderColor: "#7A4A00",
    backgroundColor: "#1A1200",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  countBadge: {
    backgroundColor: "#7A4A00",
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    minWidth: 22,
    alignItems: "center",
  },
  countText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: "#FCD34D",
  },
  description: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textMuted,
    lineHeight: 17,
  },
  conflictRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
    paddingTop: 10,
    gap: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.textSecondary,
    textTransform: "capitalize",
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
    borderColor: Colors.brand.teal,
    backgroundColor: "#0A1A1A",
  },
  valueOptionLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  valueOptionLabelNew: {
    color: Colors.brand.tealLight,
  },
  valueOptionValue: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary,
  },
  valueOptionValueNew: {
    color: Colors.dark.text,
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
  loadingIndicator: {
    alignSelf: "center",
    marginTop: 4,
  },
});

const chatStyles = StyleSheet.create({
  thread: {
    gap: 6,
  },
  bubbleRow: {
    flexDirection: "row",
  },
  bubbleRowInbound: {
    justifyContent: "flex-start",
  },
  bubbleRowOutbound: {
    justifyContent: "flex-end",
  },
  bubble: {
    maxWidth: "80%",
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingVertical: 9,
    gap: 4,
  },
  bubbleInbound: {
    backgroundColor: "#0D2A2A",
    borderWidth: 1,
    borderColor: Colors.brand.teal + "66",
    borderBottomLeftRadius: 4,
  },
  bubbleOutbound: {
    backgroundColor: "#101828",
    borderWidth: 1,
    borderColor: "#334155",
    borderBottomRightRadius: 4,
  },
  bubbleText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.text,
    lineHeight: 20,
  },
  bubbleTextOptimistic: {
    opacity: 0.6,
  },
  bubbleTextEmpty: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textMuted,
    fontStyle: "italic",
  },
  bubbleTime: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
  bubbleTimeInbound: {
    color: Colors.dark.textMuted,
  },
  bubbleTimeOutbound: {
    color: Colors.dark.textMuted,
    textAlign: "right",
  },
  callRow: {
    alignItems: "center",
    gap: 4,
    paddingVertical: 2,
  },
  callPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.dark.bgElevated,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  callText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textMuted,
  },
  callSummary: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary,
    textAlign: "center",
    paddingHorizontal: 16,
    lineHeight: 17,
  },
});
