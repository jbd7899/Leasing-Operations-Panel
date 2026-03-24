import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Colors from "@/constants/colors";

interface BadgeProps {
  label: string;
  variant?: "status" | "export" | "sentiment" | "source" | "category";
  value?: string;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  new: { bg: "#1A3A6B", text: "#93C5FD" },
  contacted: { bg: "#1C3A5E", text: "#60A5FA" },
  qualified: { bg: "#064E3B", text: "#6EE7B7" },
  disqualified: { bg: "#450A0A", text: "#FCA5A5" },
  archived: { bg: "#1F2937", text: "#9CA3AF" },
  pending: { bg: "#1E3A5F", text: "#93C5FD" },
  exported: { bg: "#064E3B", text: "#6EE7B7" },
  excluded: { bg: "#450A0A", text: "#FCA5A5" },
  positive: { bg: "#064E3B", text: "#34D399" },
  neutral: { bg: "#1E293B", text: "#94A3B8" },
  negative: { bg: "#450A0A", text: "#F87171" },
  mixed: { bg: "#3D2A00", text: "#FCD34D" },
  sms: { bg: "#1D2B64", text: "#818CF8" },
  voice: { bg: "#1A3A4A", text: "#38BDF8" },
  voicemail: { bg: "#2D1B69", text: "#A78BFA" },
  done: { bg: "#064E3B", text: "#6EE7B7" },
  failed: { bg: "#450A0A", text: "#FCA5A5" },
  processing: { bg: "#1C3A5E", text: "#60A5FA" },
  skipped: { bg: "#1F2937", text: "#9CA3AF" },
};

export function Badge({ label, value }: BadgeProps) {
  const key = (value ?? label).toLowerCase();
  const colors = STATUS_COLORS[key] ?? { bg: "#1F2937", text: "#9CA3AF" };

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  label: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
