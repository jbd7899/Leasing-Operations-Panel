import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";
import {
  useCreateExport,
  CreateExportBodyFormat,
  getListExportsQueryKey,
  getListProspectsQueryKey,
} from "@workspace/api-client-react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ExportModal() {
  const { theme, isDark } = useTheme();
  const { prospectIds: rawIds } = useLocalSearchParams<{ prospectIds: string }>();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const prospectIds: string[] = rawIds ? JSON.parse(rawIds) : [];
  const [format, setFormat] = useState<"csv" | "json">("csv");

  const mutation = useCreateExport({
    mutation: {
      onSuccess: async () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await queryClient.invalidateQueries({ queryKey: getListExportsQueryKey() });
        await queryClient.invalidateQueries({ queryKey: getListProspectsQueryKey() });
        router.dismissAll();
      },
      onError: (err) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Export failed", String(err));
      },
    },
  });

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 24, backgroundColor: theme.bgCard }]}>
      <View style={[styles.handle, { backgroundColor: theme.border }]} />

      <View style={styles.header}>
        <Feather name="upload" size={24} color={Colors.brand.tealLight} />
        <Text style={[styles.title, { color: theme.text }]}>Export Prospects</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {prospectIds.length} prospect{prospectIds.length !== 1 ? "s" : ""} selected
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>FORMAT</Text>
        <View style={styles.formatRow}>
          <Pressable
            style={[styles.formatBtn, { backgroundColor: theme.bgElevated, borderColor: theme.border }, format === "csv" && [styles.formatBtnActive, { backgroundColor: theme.activeBg }]]}
            onPress={() => setFormat("csv")}
          >
            <Feather
              name="file-text"
              size={20}
              color={format === "csv" ? Colors.brand.tealLight : theme.textMuted}
            />
            <Text style={[styles.formatLabel, { color: theme.textSecondary }, format === "csv" && styles.formatLabelActive]}>
              CSV
            </Text>
            <Text style={[styles.formatSub, { color: theme.textMuted }]}>AppFolio-compatible</Text>
          </Pressable>

          <Pressable
            style={[styles.formatBtn, { backgroundColor: theme.bgElevated, borderColor: theme.border }, format === "json" && [styles.formatBtnActive, { backgroundColor: theme.activeBg }]]}
            onPress={() => setFormat("json")}
          >
            <Feather
              name="code"
              size={20}
              color={format === "json" ? Colors.brand.tealLight : theme.textMuted}
            />
            <Text style={[styles.formatLabel, { color: theme.textSecondary }, format === "json" && styles.formatLabelActive]}>
              JSON
            </Text>
            <Text style={[styles.formatSub, { color: theme.textMuted }]}>API-ready format</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={[styles.cancelBtn, { backgroundColor: theme.bgElevated, borderColor: theme.border }]}
          onPress={() => router.back()}
          disabled={mutation.isPending}
        >
          <Text style={[styles.cancelText, { color: theme.textSecondary }]}>Cancel</Text>
        </Pressable>

        <Pressable
          style={[styles.exportBtn, mutation.isPending && styles.exportBtnDisabled]}
          onPress={() =>
            mutation.mutate({
              data: {
                prospectIds,
                format: format === "csv" ? CreateExportBodyFormat.csv : CreateExportBodyFormat.json,
              },
            })
          }
          disabled={mutation.isPending}
        >
          {mutation.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Feather name="download" size={16} color="#fff" />
              <Text style={styles.exportBtnText}>Export {format.toUpperCase()}</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.bgCard,
    padding: 24,
    gap: 24,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.dark.border,
    alignSelf: "center",
    marginTop: -8,
    marginBottom: -8,
  },
  header: {
    alignItems: "center",
    gap: 6,
  },
  title: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.dark.text,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary,
  },
  section: {
    gap: 10,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.textMuted,
    letterSpacing: 0.8,
  },
  formatRow: {
    flexDirection: "row",
    gap: 12,
  },
  formatBtn: {
    flex: 1,
    backgroundColor: Colors.dark.bgElevated,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 14,
    padding: 16,
    gap: 4,
    alignItems: "center",
  },
  formatBtnActive: {
    backgroundColor: "#0D2A2A",
    borderColor: Colors.brand.tealLight,
  },
  formatLabel: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.textSecondary,
  },
  formatLabelActive: {
    color: Colors.brand.tealLight,
  },
  formatSub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textMuted,
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: Colors.dark.bgElevated,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.textSecondary,
  },
  exportBtn: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: Colors.brand.teal,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  exportBtnDisabled: {
    opacity: 0.6,
  },
  exportBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});
