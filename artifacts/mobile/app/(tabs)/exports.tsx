import React from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  Platform,
  Linking,
  RefreshControl,
} from "react-native";
import { useListExports } from "@workspace/api-client-react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import type { ExportBatch } from "@workspace/api-client-react";

function getDownloadUrl(exportId: string): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  const base = domain ? `https://${domain}/api` : "http://localhost:8080/api";
  return `${base}/exports/${exportId}/download`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ExportRow({ batch }: { batch: ExportBatch }) {
  const handleDownload = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const url = getDownloadUrl(batch.id);
    await Linking.openURL(url);
  };

  return (
    <View style={styles.exportRow}>
      <View style={styles.exportIcon}>
        <Feather
          name={batch.format === "csv" ? "file-text" : "code"}
          size={20}
          color={Colors.brand.tealLight}
        />
      </View>

      <View style={styles.exportInfo}>
        <View style={styles.exportTopRow}>
          <Text style={styles.exportTitle}>
            {batch.format.toUpperCase()} Export
          </Text>
          <Badge label={batch.status} value={batch.status} />
        </View>
        <Text style={styles.exportMeta}>
          {batch.recordCount} prospect{batch.recordCount !== 1 ? "s" : ""} · {formatDate(batch.createdAt)}
        </Text>
        {batch.targetSystem && (
          <Text style={styles.exportTarget}>{batch.targetSystem}</Text>
        )}
      </View>

      <Pressable
        onPress={handleDownload}
        style={({ pressed }) => [styles.downloadBtn, pressed && styles.downloadBtnPressed]}
        hitSlop={8}
      >
        <Feather name="download" size={18} color={Colors.brand.tealLight} />
      </Pressable>
    </View>
  );
}

export default function ExportsScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? Math.max(insets.top, 67) : insets.top;

  const { data, isLoading, isError, refetch, isFetching } = useListExports();

  const exports: ExportBatch[] = (data?.exports ?? []).slice().reverse();

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.screenTitle}>Exports</Text>
          <Text style={styles.screenSubtitle}>AppFolio-ready CSV & JSON</Text>
        </View>
        <Pressable style={styles.refreshBtn} onPress={() => refetch()} disabled={isFetching}>
          <Feather
            name="refresh-cw"
            size={18}
            color={isFetching ? Colors.dark.textMuted : Colors.brand.tealLight}
          />
        </Pressable>
      </View>

      <View style={styles.infoCard}>
        <Feather name="info" size={14} color={Colors.brand.tealLight} />
        <Text style={styles.infoText}>
          Select prospects in the Prospects tab and tap the export button to create a new export batch.
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <Feather name="loader" size={24} color={Colors.dark.textMuted} />
        </View>
      ) : isError ? (
        <EmptyState icon="wifi-off" title="Failed to load" subtitle="Pull to refresh" />
      ) : (
        <FlatList
          data={exports}
          keyExtractor={(b) => b.id}
          renderItem={({ item }) => <ExportRow batch={item} />}
          contentContainerStyle={[
            styles.listContent,
            exports.length === 0 && styles.listEmpty,
          ]}
          ListEmptyComponent={
            <EmptyState
              icon="upload"
              title="No exports yet"
              subtitle="Create your first export from the Prospects tab by selecting prospects and tapping the export button"
            />
          }
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={refetch}
              tintColor={Colors.brand.tealLight}
            />
          }
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="automatic"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.bg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  screenTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.dark.text,
  },
  screenSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textMuted,
    marginTop: 2,
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.dark.bgCard,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  infoCard: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#0A2020",
    borderWidth: 1,
    borderColor: Colors.brand.teal,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    alignItems: "flex-start",
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.brand.tealLight,
    lineHeight: 19,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 120,
    gap: 8,
  },
  listEmpty: {
    flex: 1,
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  exportRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    backgroundColor: Colors.dark.bgCard,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  exportIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#0D2A2A",
    borderWidth: 1,
    borderColor: "#164444",
    alignItems: "center",
    justifyContent: "center",
  },
  exportInfo: {
    flex: 1,
    gap: 3,
  },
  exportTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  exportTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.text,
  },
  exportMeta: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary,
  },
  exportTarget: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textMuted,
  },
  downloadBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.dark.bgElevated,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    alignItems: "center",
    justifyContent: "center",
  },
  downloadBtnPressed: {
    opacity: 0.7,
  },
});
