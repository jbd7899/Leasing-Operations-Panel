import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  Platform,
  Pressable,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { api } from "@/lib/api";
import { InboxItem } from "@/components/ui/InboxItem";
import { SkeletonLoader } from "@/components/ui/SkeletonLoader";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchBar } from "@/components/ui/SearchBar";
import type { InboxItem as InboxItemType } from "@/constants/types";

const FILTERS = [
  { label: "All", value: "" },
  { label: "SMS", value: "sms" },
  { label: "Voice", value: "voice" },
  { label: "Voicemail", value: "voicemail" },
];

export default function InboxScreen() {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");

  const params: Record<string, string> = {};
  if (sourceFilter) params.sourceType = sourceFilter;
  if (search) params.search = search;

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["inbox", params],
    queryFn: () => api.inbox.list(params),
  });

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? Math.max(insets.top, 67) : insets.top;

  const items: InboxItemType[] = data?.items ?? [];

  const handleItemPress = useCallback((item: InboxItemType) => {
    router.push({
      pathname: "/interaction/[id]",
      params: {
        id: item.interaction.id,
        ...(item.prospect ? { prospectId: item.prospect.id } : {}),
      },
    });
  }, []);

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.screenTitle}>Inbox</Text>
          <Text style={styles.screenSubtitle}>
            {data ? `${data.total} interactions` : "Loading..."}
          </Text>
        </View>
        <Pressable style={styles.refreshBtn} onPress={() => refetch()} disabled={isFetching}>
          <Feather
            name="refresh-cw"
            size={18}
            color={isFetching ? Colors.dark.textMuted : Colors.brand.tealLight}
          />
        </Pressable>
      </View>

      <View style={styles.searchRow}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or number..."
        />
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.value}
            onPress={() => setSourceFilter(f.value)}
            style={[styles.filterChip, sourceFilter === f.value && styles.filterChipActive]}
          >
            <Text
              style={[
                styles.filterLabel,
                sourceFilter === f.value && styles.filterLabelActive,
              ]}
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
        <EmptyState icon="wifi-off" title="Failed to load" subtitle="Pull to refresh and try again" />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.interaction.id}
          renderItem={({ item }) => (
            <InboxItem item={item} onPress={() => handleItemPress(item)} />
          )}
          contentContainerStyle={[
            styles.listContent,
            items.length === 0 && styles.listEmpty,
          ]}
          ListEmptyComponent={
            <EmptyState
              icon="inbox"
              title="No interactions"
              subtitle="Incoming SMS and calls will appear here"
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
