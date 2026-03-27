import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  Platform,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useQueryClient, useQueries } from "@tanstack/react-query";
import {
  useListProspects,
  useUpdateProspect,
  getListProspectsQueryKey,
  getProspectConflicts,
  getProspectConflictsQueryKey,
} from "@workspace/api-client-react";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";
import { ProspectCard } from "@/components/ui/ProspectCard";
import { SkeletonLoader } from "@/components/ui/SkeletonLoader";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchBar } from "@/components/ui/SearchBar";
import { FilterChip } from "@/components/ui/FilterChip";
import type { Prospect } from "@workspace/api-client-react";

const STATUS_FILTERS = [
  { label: "All", value: "" },
  { label: "New", value: "new" },
  { label: "Contacted", value: "contacted" },
  { label: "Qualified", value: "qualified" },
  { label: "Disqualified", value: "disqualified" },
];

export default function ProspectsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isQueuing, setIsQueuing] = useState(false);
  const [bannerMsg, setBannerMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const isSelecting = selectedIds.size > 0;

  const listParams = {
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(search ? { search } : {}),
  };

  const { data, isLoading, isError, refetch, isFetching } = useListProspects(listParams);
  const updateProspect = useUpdateProspect();

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? Math.max(insets.top, 67) : insets.top;

  const prospects: Prospect[] = data?.prospects ?? [];

  const conflictQueries = useQueries({
    queries: prospects.map((p) => ({
      queryKey: getProspectConflictsQueryKey(p.id),
      queryFn: () => getProspectConflicts(p.id),
      staleTime: 30_000,
    })),
  });

  const conflictsByProspectId = useMemo(() => {
    const map = new Map<string, boolean>();
    prospects.forEach((p, i) => {
      const result = conflictQueries[i];
      map.set(p.id, (result?.data?.conflicts?.length ?? 0) > 0);
    });
    return map;
  }, [prospects, conflictQueries]);

  const handleCardPress = useCallback(
    (prospect: Prospect) => {
      if (isSelecting) {
        toggleSelect(prospect.id);
        return;
      }
      router.push({ pathname: "/prospect/[id]", params: { id: prospect.id } });
    },
    [isSelecting],
  );

  const toggleSelect = useCallback((id: string) => {
    Haptics.selectionAsync();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleLongPress = useCallback((prospect: Prospect) => {
    if (!isSelecting) {
      Haptics.selectionAsync();
      setSelectedIds(new Set([prospect.id]));
    }
  }, [isSelecting]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleExport = useCallback(() => {
    if (selectedIds.size === 0) return;
    router.push({
      pathname: "/export-modal",
      params: { prospectIds: JSON.stringify([...selectedIds]) },
    });
  }, [selectedIds]);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === prospects.length) {
      clearSelection();
    } else {
      setSelectedIds(new Set(prospects.map((p) => p.id)));
    }
  }, [prospects, selectedIds, clearSelection]);

  const handleQueueExport = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setIsQueuing(true);
    setBannerMsg(null);
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          updateProspect.mutateAsync({ id, data: { exportStatus: "pending" } }),
        ),
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await queryClient.invalidateQueries({ queryKey: getListProspectsQueryKey() });
      clearSelection();
      if (isWeb) {
        setBannerMsg({ text: `${selectedIds.size} prospect${selectedIds.size !== 1 ? "s" : ""} added to Export Queue.`, type: "success" });
      } else {
        Alert.alert("Queued", `${selectedIds.size} prospect${selectedIds.size !== 1 ? "s" : ""} added to Export Queue.`);
      }
    } catch (err: unknown) {
      if (isWeb) {
        setBannerMsg({ text: String(err), type: "error" });
      } else {
        Alert.alert("Error", String(err));
      }
    } finally {
      setIsQueuing(false);
    }
  }, [selectedIds, updateProspect, queryClient, clearSelection, isWeb]);

  return (
    <View style={[styles.container, { paddingTop: topPad, backgroundColor: theme.bg }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.screenTitle, { color: theme.text }]}>Prospects</Text>
          <Text style={[styles.screenSubtitle, { color: theme.textMuted }]}>
            {data ? `${data.total} total` : "Loading..."}
          </Text>
        </View>

        {isSelecting ? (
          <View style={styles.selectionActions}>
            <Pressable style={[styles.actionBtn, { backgroundColor: theme.bgCard, borderColor: theme.border }]} onPress={handleSelectAll}>
              <Feather
                name={selectedIds.size === prospects.length ? "check-square" : "square"}
                size={18}
                color={Colors.brand.tealLight}
              />
            </Pressable>
            <Pressable
              style={[styles.actionBtn, { backgroundColor: theme.bgCard, borderColor: theme.border }, styles.queueBtn]}
              onPress={handleQueueExport}
              disabled={isQueuing}
            >
              {isQueuing ? (
                <ActivityIndicator size="small" color={Colors.brand.tealLight} />
              ) : (
                <Feather name="clock" size={16} color={Colors.brand.tealLight} />
              )}
            </Pressable>
            <Pressable style={[styles.actionBtn, styles.exportBtn]} onPress={handleExport}>
              <Feather name="upload" size={16} color="#fff" />
              <Text style={styles.exportBtnText}>{selectedIds.size}</Text>
            </Pressable>
            <Pressable style={[styles.actionBtn, { backgroundColor: theme.bgCard, borderColor: theme.border }]} onPress={clearSelection}>
              <Feather name="x" size={18} color={theme.textSecondary} />
            </Pressable>
          </View>
        ) : (
          <Pressable style={[styles.refreshBtn, { backgroundColor: theme.bgCard, borderColor: theme.border }]} onPress={() => refetch()} disabled={isFetching}>
            <Feather
              name="refresh-cw"
              size={18}
              color={isFetching ? theme.textMuted : Colors.brand.tealLight}
            />
          </Pressable>
        )}
      </View>

      {isSelecting && (
        <View style={styles.selectionBanner}>
          <Feather name="info" size={13} color={Colors.brand.tealLight} />
          <Text style={styles.selectionBannerText}>
            {selectedIds.size} selected — long-press to select, tap to export
          </Text>
        </View>
      )}

      {bannerMsg && (
        <View style={[
          styles.inlineBanner,
          bannerMsg.type === "error" ? styles.inlineBannerError : styles.inlineBannerSuccess,
        ]}>
          <Feather
            name={bannerMsg.type === "error" ? "alert-circle" : "check-circle"}
            size={14}
            color={bannerMsg.type === "error" ? "#FF6B6B" : Colors.brand.tealLight}
          />
          <Text style={[
            styles.inlineBannerText,
            bannerMsg.type === "error" ? styles.inlineBannerTextError : styles.inlineBannerTextSuccess,
          ]}>
            {bannerMsg.text}
          </Text>
          <Pressable onPress={() => setBannerMsg(null)} hitSlop={8}>
            <Feather
              name="x"
              size={14}
              color={bannerMsg.type === "error" ? "#FF6B6B" : Colors.brand.tealLight}
            />
          </Pressable>
        </View>
      )}

      <View style={styles.searchRow}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search prospects..."
        />
      </View>

      <View style={styles.filterRow}>
        {STATUS_FILTERS.map((f) => (
          <FilterChip
            key={f.value}
            label={f.label}
            active={statusFilter === f.value}
            onPress={() => setStatusFilter(f.value)}
            variant="subtle"
          />
        ))}
      </View>

      {isLoading ? (
        <View style={styles.listContent}>
          <SkeletonLoader count={6} />
        </View>
      ) : isError ? (
        <EmptyState icon="wifi-off" title="Failed to load" subtitle="Pull to refresh" />
      ) : (
        <FlatList
          data={prospects}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => (
            <ProspectCard
              prospect={item}
              onPress={() => handleCardPress(item)}
              onLongPress={() => handleLongPress(item)}
              selected={selectedIds.has(item.id)}
              hasConflicts={conflictsByProspectId.get(item.id) ?? false}
            />
          )}
          contentContainerStyle={[
            styles.listContent,
            prospects.length === 0 && styles.listEmpty,
          ]}
          ListEmptyComponent={
            <EmptyState
              icon="users"
              title="No prospects"
              subtitle="Prospects from incoming calls and SMS will appear here"
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
  selectionActions: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.dark.bgCard,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    alignItems: "center",
    justifyContent: "center",
  },
  queueBtn: {
    backgroundColor: "#0A2020",
    borderColor: Colors.brand.teal,
  },
  exportBtn: {
    flexDirection: "row",
    width: "auto",
    paddingHorizontal: 14,
    gap: 6,
    backgroundColor: Colors.brand.teal,
    borderColor: Colors.brand.teal,
  },
  exportBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  selectionBanner: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#0A2020",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.brand.teal + "44",
  },
  selectionBannerText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.brand.tealLight,
  },
  inlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  inlineBannerError: {
    backgroundColor: "#2A0A0A",
    borderColor: "#FF6B6B44",
  },
  inlineBannerSuccess: {
    backgroundColor: "#0A2020",
    borderColor: Colors.brand.teal + "44",
  },
  inlineBannerText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  inlineBannerTextError: {
    color: "#FF6B6B",
  },
  inlineBannerTextSuccess: {
    color: Colors.brand.tealLight,
  },
  searchRow: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  listEmpty: {
    flex: 1,
  },
});
