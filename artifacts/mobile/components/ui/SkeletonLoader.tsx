import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { useTheme } from "@/contexts/ThemeContext";

export function SkeletonLoader({ count = 5 }: { count?: number }) {
  const { theme } = useTheme();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    ).start();
  }, [opacity]);

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Animated.View key={i} style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border, opacity }]}>
          <View style={[styles.avatar, { backgroundColor: theme.bgElevated }]} />
          <View style={styles.lines}>
            <View style={[styles.line, { backgroundColor: theme.bgElevated, width: "60%", height: 14 }]} />
            <View style={[styles.line, { backgroundColor: theme.bgElevated, width: "40%", height: 12 }]} />
            <View style={[styles.line, { backgroundColor: theme.bgElevated, width: "80%", height: 11 }]} />
          </View>
        </Animated.View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    gap: 12,
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  lines: {
    flex: 1,
    gap: 6,
    justifyContent: "center",
  },
  line: {
    borderRadius: 6,
  },
});
