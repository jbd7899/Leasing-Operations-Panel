import React from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";

type FilterChipVariant = "filled" | "subtle";

export function FilterChip({
  label,
  active,
  onPress,
  variant = "filled",
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  variant?: FilterChipVariant;
}) {
  const { theme } = useTheme();

  const activeStyle =
    variant === "filled"
      ? styles.chipActiveFilled
      : { backgroundColor: theme.activeBg, borderColor: Colors.brand.tealLight };

  const activeLabelStyle =
    variant === "filled"
      ? styles.labelActiveFilled
      : styles.labelActiveSubtle;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        { backgroundColor: theme.bgCard, borderColor: theme.border },
        active && activeStyle,
      ]}
    >
      <Text
        style={[
          styles.label,
          { color: theme.textSecondary },
          active && activeLabelStyle,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 36,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: "center",
  },
  chipActiveFilled: {
    backgroundColor: Colors.brand.teal,
    borderColor: Colors.brand.teal,
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  labelActiveFilled: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
  },
  labelActiveSubtle: {
    color: Colors.brand.tealLight,
    fontFamily: "Inter_600SemiBold",
  },
});
