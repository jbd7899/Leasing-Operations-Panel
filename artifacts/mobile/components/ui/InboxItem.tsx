import React, { type ComponentProps } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";
import { Badge } from "./Badge";
import type { InboxItem as InboxItemType } from "@workspace/api-client-react";
import { useListTwilioNumbers, getListTwilioNumbersQueryKey } from "@workspace/api-client-react";
import { useTwilioCall } from "@/contexts/TwilioCallContext";

type FeatherIconName = ComponentProps<typeof Feather>["name"];

interface InboxItemProps {
  item: InboxItemType & { isStale?: boolean };
  onPress: () => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const SOURCE_ICONS: Record<string, FeatherIconName> = {
  sms: "message-square",
  voice: "phone",
  voicemail: "voicemail",
  call: "phone-call",
};

function formatBudget(min?: number | null, max?: number | null): string | null {
  if (!min && !max) return null;
  if (min && max) return `$${min}–$${max}`;
  if (max) return `up to $${max}`;
  return `$${min}+`;
}

export function InboxItem({ item, onPress }: InboxItemProps) {
  const { theme, isDark } = useTheme();
  const { interaction, prospect, property, messageCount } = item;
  const isStale = (item as any).isStale ?? false;
  const { startCall } = useTwilioCall();

  const { data: twilioNumbersData } = useListTwilioNumbers({
    query: {
      queryKey: getListTwilioNumbersQueryKey(),
      select: (d) => ({
        ...d,
        twilioNumbers: d.twilioNumbers.filter((n) => n.isActive),
      }),
      staleTime: 60_000,
    },
  });

  const primaryTwilioNumber = twilioNumbersData?.twilioNumbers[0]?.phoneNumber ?? null;

  const sourceIcon: FeatherIconName = SOURCE_ICONS[interaction.sourceType] ?? "activity";
  const phoneNumber = prospect?.phonePrimary ?? interaction.fromNumber;
  const canCall = !!phoneNumber;
  const showMessageBadge = typeof messageCount === "number" && messageCount > 1;

  // Extract suggested next action from AI extraction JSON
  const extraction = interaction.structuredExtractionJson as Record<string, unknown> | null;
  const suggestedNextAction = typeof extraction?.suggestedNextAction === "string"
    ? extraction.suggestedNextAction
    : null;

  // Build qualification chips from prospect data
  const qualChips: string[] = [];
  if (prospect?.desiredBedrooms) qualChips.push(`${prospect.desiredBedrooms}br`);
  const budgetStr = formatBudget(
    prospect?.budgetMin as number | null | undefined,
    prospect?.budgetMax as number | null | undefined,
  );
  if (budgetStr) qualChips.push(budgetStr);
  if (prospect?.desiredMoveInDate) qualChips.push(prospect.desiredMoveInDate);
  if (prospect?.pets && prospect.pets.toLowerCase() !== "none") qualChips.push(`pets: ${prospect.pets}`);
  if (prospect?.voucherType && prospect.voucherType.toLowerCase() !== "none") qualChips.push(prospect.voucherType);

  const handleCall = () => {
    if (!phoneNumber) return;
    const name = prospect?.fullName ?? phoneNumber;
    startCall(name, phoneNumber, primaryTwilioNumber);
  };

  const handleReply = () => {
    if (prospect?.id) {
      router.push({ pathname: "/prospect/[id]", params: { id: prospect.id } });
    } else {
      onPress();
    }
  };

  const handleFollowUp = () => {
    if (prospect?.id) {
      router.push({ pathname: "/prospect/[id]", params: { id: prospect.id } });
    } else {
      onPress();
    }
  };

  const handleQualify = () => {
    if (prospect?.id) {
      router.push({ pathname: "/prospect/[id]", params: { id: prospect.id } });
    } else {
      onPress();
    }
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.bgCard, borderColor: theme.border },
        isStale && styles.staleCard,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: theme.activeBg }]}>
        <Feather name={sourceIcon} size={18} color={Colors.brand.tealLight} />
      </View>

      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={styles.fromBlock}>
            <Text style={[styles.fromName, { color: theme.text }]} numberOfLines={1}>
              {prospect?.fullName ?? interaction.fromNumber}
            </Text>
            {property && (
              <Text style={[styles.propertyName, { color: theme.textMuted }]} numberOfLines={1}>{property.name}</Text>
            )}
          </View>
          <View style={styles.rightMeta}>
            <Text style={[styles.time, { color: theme.textMuted }]}>{timeAgo(interaction.occurredAt)}</Text>
            {isStale && (
              <View style={styles.staleBadge}>
                <Text style={styles.staleBadgeText}>Needs follow-up</Text>
              </View>
            )}
            {showMessageBadge && (
              <View style={styles.messageBadge}>
                <Text style={styles.messageBadgeText}>{messageCount}</Text>
              </View>
            )}
            {prospect?.status && (
              <Badge label={prospect.status} value={prospect.status} />
            )}
          </View>
        </View>

        {(interaction.summary ?? interaction.rawText ?? interaction.transcript) ? (
          <Text style={[styles.preview, { color: theme.textSecondary }]} numberOfLines={2}>
            {interaction.summary ?? interaction.rawText ?? interaction.transcript}
          </Text>
        ) : null}

        {/* Qualification chips */}
        {qualChips.length > 0 && (
          <View style={styles.qualChipsRow}>
            {qualChips.map((chip) => (
              <View key={chip} style={styles.qualChip}>
                <Text style={styles.qualChipText}>{chip}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Suggested next action */}
        {suggestedNextAction && (
          <View style={styles.nextActionRow}>
            <Feather name="zap" size={11} color={Colors.brand.tealLight} />
            <Text style={styles.nextActionText} numberOfLines={1}>{suggestedNextAction}</Text>
          </View>
        )}

        {/* Quick action row */}
        <View style={[styles.quickActions, { borderTopColor: theme.border }]}>
          <Pressable
            style={[styles.quickAction, { backgroundColor: theme.activeBg }]}
            onPress={(e) => { e.stopPropagation?.(); handleReply(); }}
            hitSlop={8}
          >
            <Feather name="message-square" size={13} color={Colors.brand.tealLight} />
            <Text style={styles.quickActionLabel}>Reply</Text>
          </Pressable>

          {canCall && (
            <Pressable
              style={[styles.quickAction, { backgroundColor: theme.activeBg }, !primaryTwilioNumber && styles.quickActionDisabled]}
              onPress={(e) => { e.stopPropagation?.(); handleCall(); }}
              hitSlop={8}
              disabled={!primaryTwilioNumber}
            >
              <Feather
                name="phone"
                size={13}
                color={primaryTwilioNumber ? Colors.brand.tealLight : theme.textMuted}
              />
              <Text style={[styles.quickActionLabel, !primaryTwilioNumber && { color: theme.textMuted }]}>
                Call
              </Text>
            </Pressable>
          )}

          <Pressable
            style={styles.quickAction}
            onPress={(e) => { e.stopPropagation?.(); handleFollowUp(); }}
            hitSlop={8}
          >
            <Feather name="clock" size={13} color={Colors.brand.tealLight} />
            <Text style={styles.quickActionLabel}>Follow-up</Text>
          </Pressable>

          {prospect?.status !== "qualified" && (
            <Pressable
              style={styles.quickAction}
              onPress={(e) => { e.stopPropagation?.(); handleQualify(); }}
              hitSlop={8}
            >
              <Feather name="check-circle" size={13} color={Colors.brand.tealLight} />
              <Text style={styles.quickActionLabel}>Qualify</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    gap: 12,
    borderRadius: 14,
    padding: 13,
    marginBottom: 8,
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.75,
  },
  staleCard: {
    borderLeftWidth: 3,
    borderLeftColor: "#F59E0B",
  },
  staleBadge: {
    backgroundColor: "#F59E0B20",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  staleBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: "#F59E0B",
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#164444",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  content: {
    flex: 1,
    gap: 5,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  fromBlock: {
    flex: 1,
  },
  fromName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  propertyName: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  rightMeta: {
    alignItems: "flex-end",
    gap: 4,
  },
  time: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  messageBadge: {
    backgroundColor: Colors.brand.tealLight,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  messageBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#0A1A1A",
  },
  preview: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  qualChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 1,
  },
  qualChip: {
    backgroundColor: "#0D1E2A",
    borderWidth: 1,
    borderColor: "#1A3344",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  qualChipText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.textSecondary,
  },
  nextActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#091E1E",
    borderWidth: 1,
    borderColor: "#0D3333",
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  nextActionText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.brand.tealLight,
    flex: 1,
  },
  quickActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  quickAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minHeight: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#164444",
  },
  quickActionDisabled: {
    opacity: 0.5,
  },
  quickActionLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.brand.tealLight,
  },
});
