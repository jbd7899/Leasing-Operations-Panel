import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  Platform,
  Pressable,
  Alert,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { api } from "@/lib/api";
import { ProspectCard } from "@/components/ui/ProspectCard";
import { SkeletonLoader } from "@/components/ui/SkeletonLoader";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchBar } from "@/components/ui/SearchBar";
import type { Prospect } from "@/constants/types";

const STATUS_FILTERS = [
  { label: "All", value: "" },
  { label: "New", value: "new" },
  { label: "Contacted", value: "contacted" },
  { label: "Qualified", value: "qualified" },
  { label: "Disqualified", value: "disqualified" },
];

export default function ProspectsScreen() {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const isSelecting = selectedIds.size > 0;

  const params: Record<string, string> = {};
  if (statusFilter) params.status = statusFilter;
  if (search) params.search = search;

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["prospects", params],
    queryFn: () => api.prospects.list(params),
  });

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? Math.max(insets.top, 67) : insets.top;

  const prospects: Prospect[] = data?.prospects ?? [];

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

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.screenTitle}>Prospects</Text>
          <Text style={styles.screenSubtitle}>
            {data ? `${data.total} total` : "Loading..."}
          </Text>
        </View>

        {isSelecting ? (
          <View style={styles.selectionActions}>
            <Pressable style={styles.actionBtn} onPress={handleSelectAll}>
              <Feather
                name={selectedIds.size === prospects.length ? "check-square" : "square"}
                size={18}
                color={Colors.brand.tealLight}
              />
            </Pressable>
            <Pressable style={[styles.actionBtn, styles.exportBtn]} onPress={handleExport}>
              <Feather name="upload" size={16} color="#fff" />
              <Text style={styles.exportBtnText}>{selectedIds.size}</Text>
            </Pressable>
            <Pressable style={styles.actionBtn} onPress={clearSelection}>
              <Feather name="x" size={18} color={Colors.dark.textSecondary} />
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.refreshBtn} onPress={() => refetch()} disabled={isFetching}>
            <Feather
              name="refresh-cw"
              size={18}
              color={isFetching ? Colors.dark.textMuted : Colors.brand.tealLight}
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

      <View style={styles.searchRow}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search prospects..."
        />
      </View>

      <View style={styles.filterRow}>
        {STATUS_FILTERS.map((f) => (
          <Pressable
            key={f.value}
            onPress={() => setStatusFilter(f.value)}
            style={[styles.filterChip, statusFilter === f.value && styles.filterChipActive]}
          >
            <Text
              style={[styles.filterLabel, statusFilter === f.value && styles.filterLabelActive]}
            >
              {f.label}
            </Text>
          </Pressable>
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
            />
          )}
          contentContainerStyle={[styles.listContent, prospects.length === 0 && styles.listEmpty]}
          ListEmptyComponent={
            <EmptyState
              icon="users"
              title="No prospects"
              subtitle="Prospects appear here after interactions are processed"
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
  selectionActions: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  actionBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.dark.bgCard,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    alignItems: "center",
    justifyContent: "center",
  },
  exportBtn: {
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 12,
    width: "auto",
    backgroundColor: Colors.brand.teal,
    borderColor: Colors.brand.tealLight,
  },
  exportBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
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
  selectionBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#0A2020",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.brand.teal,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 4,
  },
  selectionBannerText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.brand.tealLight,
  },
  searchRow: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  filterRow: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexWrap: "wrap",
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.dark.bgCard,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  filterChipActive: {
    backgroundColor: "#0D2A2A",
    borderColor: Colors.brand.tealLight,
  },
  filterLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.textSecondary,
  },
  filterLabelActive: {
    color: Colors.brand.tealLight,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  listEmpty: {
    flex: 1,
  },
});
