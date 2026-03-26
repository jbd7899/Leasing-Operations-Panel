import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  SectionList,
  StyleSheet,
  Pressable,
  Platform,
  Linking,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import {
  useListProspects,
  useListExports,
  useCreateExport,
  getListExportsQueryKey,
  getListProspectsQueryKey,
  CreateExportBodyFormat,
} from "@workspace/api-client-react";
import type { Prospect, ExportBatch } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";

function getDownloadUrl(exportId: string): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  const base = domain ? `https://${domain}/api` : "";
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

function ProspectQueueRow({
  prospect,
  selected,
  onToggle,
}: {
  prospect: Prospect;
  selected: boolean;
  onToggle: () => void;
}) {
  const name = prospect.fullName || prospect.phonePrimary;
  const initials = prospect.fullName
    ? prospect.fullName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : prospect.phonePrimary.slice(-2);

  return (
    <Pressable
      onPress={onToggle}
      style={({ pressed }) => [
        styles.queueRow,
        selected && styles.queueRowSelected,
        pressed && styles.queueRowPressed,
      ]}
    >
      <View style={[styles.queueAvatar, selected && styles.queueAvatarSelected]}>
        {selected ? (
          <Feather name="check" size={16} color="#fff" />
        ) : (
          <Text style={styles.queueAvatarText}>{initials}</Text>
        )}
      </View>
      <View style={styles.queueInfo}>
        <Text style={styles.queueName} numberOfLines={1}>{name}</Text>
        <Text style={styles.queuePhone}>{prospect.phonePrimary}</Text>
        {prospect.latestSummary && (
          <Text style={styles.queueSummary} numberOfLines={1}>{prospect.latestSummary}</Text>
        )}
      </View>
      <Badge label={prospect.status} value={prospect.status} />
    </Pressable>
  );
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
          <Text style={styles.exportTitle}>{batch.format.toUpperCase()} Export</Text>
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
  const queryClient = useQueryClient();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: queueData, isLoading: queueLoading, refetch: refetchQueue, isFetching: queueFetching } =
    useListProspects({ exportStatus: "pending" });

  const { data: historyData, isLoading: historyLoading, refetch: refetchHistory, isFetching: historyFetching } =
    useListExports();

  const createExport = useCreateExport();

  const pendingProspects = queueData?.prospects ?? [];
  const exportHistory = (historyData?.exports ?? []).slice().reverse();

  const allSelected = pendingProspects.length > 0 && pendingProspects.every((p) => selectedIds.has(p.id));

  const toggleSelect = useCallback((id: string) => {
    Haptics.selectionAsync();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    Haptics.selectionAsync();
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingProspects.map((p) => p.id)));
    }
  }, [allSelected, pendingProspects]);

  const doExport = useCallback(
    async (format: "csv" | "json") => {
      setErrorMsg(null);
      setIsExporting(true);
      try {
        await createExport.mutateAsync({
          data: {
            prospectIds: Array.from(selectedIds),
            format:
              format === "csv"
                ? CreateExportBodyFormat.csv
                : CreateExportBodyFormat.json,
            targetSystem: "AppFolio",
          },
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setSelectedIds(new Set());
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: getListExportsQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getListProspectsQueryKey() }),
        ]);
      } catch (err: unknown) {
        setErrorMsg(String(err));
      } finally {
        setIsExporting(false);
      }
    },
    [selectedIds, createExport, queryClient],
  );

  const handleExport = useCallback(
    (format: "csv" | "json") => {
      if (selectedIds.size === 0) return;
      if (isWeb) {
        doExport(format);
        return;
      }
      Alert.alert(
        `Export as ${format.toUpperCase()}`,
        `Export ${selectedIds.size} prospect${selectedIds.size !== 1 ? "s" : ""} to ${format.toUpperCase()}?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Export", onPress: () => doExport(format) },
        ],
      );
    },
    [selectedIds, isWeb, doExport],
  );

  const handleRefresh = useCallback(() => {
    refetchQueue();
    refetchHistory();
  }, [refetchQueue, refetchHistory]);

  const isRefreshing = (queueFetching && !queueLoading) || (historyFetching && !historyLoading);

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.screenTitle}>Exports</Text>
          <Text style={styles.screenSubtitle}>AppFolio-ready CSV & JSON</Text>
        </View>
        <Pressable style={styles.refreshBtn} onPress={handleRefresh} disabled={isRefreshing}>
          <Feather
            name="refresh-cw"
            size={18}
            color={isRefreshing ? Colors.dark.textMuted : Colors.brand.tealLight}
          />
        </Pressable>
      </View>

      {errorMsg && (
        <View style={styles.errorBanner}>
          <Feather name="alert-circle" size={14} color="#FF6B6B" />
          <Text style={styles.errorBannerText}>{errorMsg}</Text>
          <Pressable onPress={() => setErrorMsg(null)} hitSlop={8}>
            <Feather name="x" size={14} color="#FF6B6B" />
          </Pressable>
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.brand.tealLight}
          />
        }
      >
        {/* Export Queue */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>EXPORT QUEUE</Text>
            {pendingProspects.length > 0 && (
              <Pressable onPress={toggleAll} style={styles.selectAllBtn}>
                <Text style={styles.selectAllText}>
                  {allSelected ? "Deselect All" : "Select All"}
                </Text>
              </Pressable>
            )}
          </View>

          {queueLoading ? (
            <ActivityIndicator size="small" color={Colors.brand.tealLight} style={{ marginVertical: 20 }} />
          ) : pendingProspects.length === 0 ? (
            <View style={styles.emptyQueue}>
              <Feather name="check-circle" size={32} color={Colors.brand.tealLight} />
              <Text style={styles.emptyQueueText}>No prospects pending export</Text>
              <Text style={styles.emptyQueueSub}>New SMS/voice prospects will appear here</Text>
            </View>
          ) : (
            <View style={styles.queueList}>
              {pendingProspects.map((p) => (
                <ProspectQueueRow
                  key={p.id}
                  prospect={p}
                  selected={selectedIds.has(p.id)}
                  onToggle={() => toggleSelect(p.id)}
                />
              ))}
            </View>
          )}

          {selectedIds.size > 0 && (
            <View style={styles.exportActions}>
              <Text style={styles.selectedCount}>
                {selectedIds.size} selected
              </Text>
              <View style={styles.exportBtns}>
                <Pressable
                  style={[styles.exportBtn, isExporting && styles.exportBtnDisabled]}
                  onPress={() => handleExport("csv")}
                  disabled={isExporting}
                >
                  {isExporting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Feather name="file-text" size={15} color="#fff" />
                      <Text style={styles.exportBtnText}>CSV</Text>
                    </>
                  )}
                </Pressable>
                <Pressable
                  style={[styles.exportBtn, styles.exportBtnJson, isExporting && styles.exportBtnDisabled]}
                  onPress={() => handleExport("json")}
                  disabled={isExporting}
                >
                  {isExporting ? (
                    <ActivityIndicator size="small" color={Colors.brand.tealLight} />
                  ) : (
                    <>
                      <Feather name="code" size={15} color={Colors.brand.tealLight} />
                      <Text style={[styles.exportBtnText, styles.exportBtnTextJson]}>JSON</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          )}
        </View>

        {/* Export History */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>EXPORT HISTORY</Text>
          </View>

          {historyLoading ? (
            <ActivityIndicator size="small" color={Colors.brand.tealLight} style={{ marginVertical: 20 }} />
          ) : exportHistory.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Text style={styles.emptyHistoryText}>No exports yet</Text>
            </View>
          ) : (
            <View style={styles.historyList}>
              {exportHistory.map((batch) => (
                <ExportRow key={batch.id} batch={batch} />
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.bg,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#2A0A0A",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FF6B6B44",
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    color: "#FF6B6B",
    fontFamily: "Inter_400Regular",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
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
  section: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.textMuted,
    letterSpacing: 1,
  },
  selectAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.brand.teal,
    backgroundColor: "#0A2020",
  },
  selectAllText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.brand.tealLight,
  },
  queueList: {
    gap: 8,
  },
  queueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.dark.bgCard,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  queueRowSelected: {
    borderColor: Colors.brand.tealLight,
    backgroundColor: "#0D2A2A",
  },
  queueRowPressed: {
    opacity: 0.8,
  },
  queueAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.brand.navy,
    borderWidth: 1,
    borderColor: Colors.dark.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  queueAvatarSelected: {
    backgroundColor: Colors.brand.teal,
    borderColor: Colors.brand.tealLight,
  },
  queueAvatarText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.brand.tealLight,
  },
  queueInfo: {
    flex: 1,
    gap: 2,
  },
  queueName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.text,
  },
  queuePhone: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary,
  },
  queueSummary: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textMuted,
    marginTop: 2,
  },
  emptyQueue: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 8,
    backgroundColor: Colors.dark.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  emptyQueueText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.text,
  },
  emptyQueueSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textMuted,
    textAlign: "center",
    paddingHorizontal: 24,
  },
  exportActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingHorizontal: 4,
  },
  selectedCount: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.textSecondary,
  },
  exportBtns: {
    flexDirection: "row",
    gap: 8,
  },
  exportBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.brand.teal,
  },
  exportBtnJson: {
    backgroundColor: "#0A2020",
    borderWidth: 1,
    borderColor: Colors.brand.teal,
  },
  exportBtnDisabled: {
    opacity: 0.6,
  },
  exportBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  exportBtnTextJson: {
    color: Colors.brand.tealLight,
  },
  historyList: {
    gap: 8,
  },
  emptyHistory: {
    paddingVertical: 16,
    alignItems: "center",
  },
  emptyHistoryText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textMuted,
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
