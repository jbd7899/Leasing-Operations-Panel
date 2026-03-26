import React, { type ComponentProps } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { Badge } from "./Badge";
import type { Prospect } from "@workspace/api-client-react";

type FeatherIconName = ComponentProps<typeof Feather>["name"];

interface ProspectCardProps {
  prospect: Prospect;
  onPress: () => void;
  selected?: boolean;
  onLongPress?: () => void;
  hasConflicts?: boolean;
}

function formatPhone(phone: string) {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 11 && cleaned[0] === "1") {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

function needsFollowUp(prospect: Prospect): boolean {
  if (prospect.status !== "contacted") return false;
  const MS_48H = 48 * 60 * 60 * 1000;
  return Date.now() - new Date(prospect.updatedAt).getTime() > MS_48H;
}

function sentimentIcon(sentiment?: string | null): { name: FeatherIconName; color: string } {
  switch (sentiment) {
    case "positive": return { name: "trending-up", color: "#34D399" };
    case "negative": return { name: "trending-down", color: "#F87171" };
    case "mixed": return { name: "activity", color: "#FCD34D" };
    default: return { name: "minus", color: "#64748B" };
  }
}

export function ProspectCard({ prospect, onPress, selected, onLongPress, hasConflicts }: ProspectCardProps) {
  const sentiment = sentimentIcon(prospect.latestSentiment);
  const name = prospect.fullName || prospect.phonePrimary;
  const initials = prospect.fullName
    ? prospect.fullName.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : prospect.phonePrimary.slice(-2);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
        selected && styles.cardSelected,
      ]}
    >
      <View style={[styles.avatar, selected && styles.avatarSelected]}>
        {selected ? (
          <Feather name="check" size={18} color="#fff" />
        ) : (
          <Text style={styles.avatarText}>{initials}</Text>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.row}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          <View style={styles.badgeRow}>
            {needsFollowUp(prospect) && (
              <View style={styles.followUpBadge}>
                <Feather name="clock" size={10} color="#60A5FA" />
                <Text style={styles.followUpBadgeText}>Follow up</Text>
              </View>
            )}
            {hasConflicts && (
              <View style={styles.conflictBadge}>
                <Feather name="alert-circle" size={10} color="#FCA84A" />
                <Text style={styles.conflictBadgeText}>Review</Text>
              </View>
            )}
            <Badge label={prospect.status} value={prospect.status} />
          </View>
        </View>

        <Text style={styles.phone}>{formatPhone(prospect.phonePrimary)}</Text>

        {prospect.latestSummary && (
          <Text style={styles.summary} numberOfLines={2}>{prospect.latestSummary}</Text>
        )}

        <View style={styles.metaRow}>
          {prospect.desiredBedrooms && (
            <View style={styles.metaChip}>
              <Feather name="home" size={11} color={Colors.dark.textMuted} />
              <Text style={styles.metaText}>{prospect.desiredBedrooms}bd</Text>
            </View>
          )}
          {prospect.desiredMoveInDate && (
            <View style={styles.metaChip}>
              <Feather name="calendar" size={11} color={Colors.dark.textMuted} />
              <Text style={styles.metaText}>{prospect.desiredMoveInDate}</Text>
            </View>
          )}
          {(prospect.budgetMin || prospect.budgetMax) && (
            <View style={styles.metaChip}>
              <Feather name="dollar-sign" size={11} color={Colors.dark.textMuted} />
              <Text style={styles.metaText}>
                {prospect.budgetMin && prospect.budgetMax
                  ? `$${prospect.budgetMin}–$${prospect.budgetMax}`
                  : prospect.budgetMax
                  ? `≤$${prospect.budgetMax}`
                  : `≥$${prospect.budgetMin}`}
              </Text>
            </View>
          )}
          <View style={[styles.metaChip, styles.sentimentChip]}>
            <Feather name={sentiment.name} size={11} color={sentiment.color} />
          </View>
        </View>
      </View>

      <Feather name="chevron-right" size={16} color={Colors.dark.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.dark.bgCard,
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  cardPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.99 }],
  },
  cardSelected: {
    borderColor: Colors.brand.tealLight,
    backgroundColor: "#0D2A2A",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.brand.navy,
    borderWidth: 1,
    borderColor: Colors.dark.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarSelected: {
    backgroundColor: Colors.brand.teal,
    borderColor: Colors.brand.tealLight,
  },
  avatarText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.brand.tealLight,
  },
  content: {
    flex: 1,
    gap: 3,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  name: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.text,
    flex: 1,
  },
  phone: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary,
  },
  summary: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary,
    lineHeight: 17,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 4,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: Colors.dark.bgElevated,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  sentimentChip: {
    paddingHorizontal: 5,
  },
  metaText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  followUpBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#0A1A2A",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "#1E40AF",
  },
  followUpBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: "#60A5FA",
  },
  conflictBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#2A1A0A",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "#664400",
  },
  conflictBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: "#FCA84A",
  },
});
