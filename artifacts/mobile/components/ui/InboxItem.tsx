import React, { type ComponentProps } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { Badge } from "./Badge";
import type { InboxItem as InboxItemType } from "@workspace/api-client-react";
import { useListTwilioNumbers, getListTwilioNumbersQueryKey } from "@workspace/api-client-react";
import { useTwilioCall } from "@/contexts/TwilioCallContext";

type FeatherIconName = ComponentProps<typeof Feather>["name"];

interface InboxItemProps {
  item: InboxItemType;
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

export function InboxItem({ item, onPress }: InboxItemProps) {
  const { interaction, prospect, property, messageCount } = item;
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

  const handleCall = () => {
    if (!phoneNumber) return;
    const name = prospect?.fullName ?? phoneNumber;
    startCall(name, phoneNumber, primaryTwilioNumber);
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.iconWrap}>
        <Feather name={sourceIcon} size={18} color={Colors.brand.tealLight} />
      </View>

      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={styles.fromBlock}>
            <Text style={styles.fromName} numberOfLines={1}>
              {prospect?.fullName ?? interaction.fromNumber}
            </Text>
            {property && (
              <Text style={styles.propertyName} numberOfLines={1}>{property.name}</Text>
            )}
          </View>
          <View style={styles.rightMeta}>
            <Text style={styles.time}>{timeAgo(interaction.occurredAt)}</Text>
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
          <Text style={styles.preview} numberOfLines={2}>
            {interaction.summary ?? interaction.rawText ?? interaction.transcript}
          </Text>
        ) : null}

        {/* Quick action row */}
        {canCall && (
          <View style={styles.quickActions}>
            <Pressable
              style={[styles.quickAction, !primaryTwilioNumber && styles.quickActionDisabled]}
              onPress={(e) => {
                e.stopPropagation?.();
                handleCall();
              }}
              hitSlop={8}
              disabled={!primaryTwilioNumber}
            >
              <Feather
                name="phone"
                size={14}
                color={primaryTwilioNumber ? Colors.brand.tealLight : Colors.dark.textMuted}
              />
              <Text style={[styles.quickActionLabel, !primaryTwilioNumber && styles.quickActionLabelDisabled]}>
                Call
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: Colors.dark.bgCard,
    borderRadius: 14,
    padding: 13,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  pressed: {
    opacity: 0.75,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#0D2A2A",
    borderWidth: 1,
    borderColor: "#164444",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  content: {
    flex: 1,
    gap: 4,
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
    color: Colors.dark.text,
  },
  propertyName: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textMuted,
    marginTop: 1,
  },
  rightMeta: {
    alignItems: "flex-end",
    gap: 4,
  },
  time: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textMuted,
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
    color: Colors.dark.textSecondary,
    lineHeight: 18,
  },
  quickActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  quickAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: "#0D2A2A",
    borderWidth: 1,
    borderColor: "#164444",
  },
  quickActionDisabled: {
    opacity: 0.5,
  },
  quickActionLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.brand.tealLight,
  },
  quickActionLabelDisabled: {
    color: Colors.dark.textMuted,
  },
});
