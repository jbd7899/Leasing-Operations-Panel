import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Platform,
  Pressable,
} from "react-native";
import { useGetInbox, useListProperties } from "@workspace/api-client-react";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { InboxItem } from "@/components/ui/InboxItem";
import { SkeletonLoader } from "@/components/ui/SkeletonLoader";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchBar } from "@/components/ui/SearchBar";

const SOURCE_FILTERS = [
  { label: "All", value: "" },
  { label: "SMS", value: "sms" },
  { label: "Voice", value: "voice" },
  { label: "Voicemail", value: "voicemail" },
];

const STATUS_FILTERS = [
  { label: "Any Status", value: "" },
  { label: "New", value: "new" },
  { label: "Contacted", value: "contacted" },
  { label: "Qualified", value: "qualified" },
  { label: "Disqualified", value: "disqualified" },
];

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.filterChip, active && styles.filterChipActive]}
    >
      <Text style={[styles.filterLabel, active && styles.filterLabelActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function InboxScreen() {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("");

  const { data: propertiesData } = useListProperties();
  const properties = propertiesData?.properties ?? [];

  const inboxParams = {
    ...(sourceFilter ? { sourceType: sourceFilter } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(propertyFilter ? { propertyId: propertyFilter } : {}),
    ...(search ? { search } : {}),
  };

  const { data, isLoading, isError, refetch, isFetching } = useGetInbox(inboxParams);

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? Math.max(insets.top, 67) : insets.top;

  const items = data?.items ?? [];

  const handleItemPress = useCallback((item: (typeof items)[0]) => {
    router.push({
      pathname: "/interaction/[id]",
      params: {
        id: item.interaction.id,
        ...(item.prospect ? { prospectId: item.prospect.id } : {}),
      },
    });
  }, []);

  const hasActiveFilters = !!(sourceFilter || statusFilter || propertyFilter || search);

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.screenTitle}>Inbox</Text>
          <Text style={styles.screenSubtitle}>
            {data ? `${data.total} interaction${data.total !== 1 ? "s" : ""}` : "Loading..."}
          </Text>
        </View>
        <View style={styles.headerRight}>
          {hasActiveFilters && (
            <Pressable
              style={styles.clearBtn}
              onPress={() => {
                setSourceFilter("");
                setStatusFilter("");
                setPropertyFilter("");
                setSearch("");
              }}
            >
              <Text style={styles.clearBtnText}>Clear</Text>
            </Pressable>
          )}
          <Pressable style={styles.refreshBtn} onPress={() => refetch()} disabled={isFetching}>
            <Feather
              name="refresh-cw"
              size={18}
              color={isFetching ? Colors.dark.textMuted : Colors.brand.tealLight}
            />
          </Pressable>
        </View>
      </View>

      <View style={styles.searchRow}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or number..."
        />
      </View>

      {/* Source Type Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {SOURCE_FILTERS.map((f) => (
          <FilterChip
            key={f.value}
            label={f.label}
            active={sourceFilter === f.value}
            onPress={() => setSourceFilter(f.value)}
          />
        ))}
      </ScrollView>

      {/* Status Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {STATUS_FILTERS.map((f) => (
          <FilterChip
            key={f.value}
            label={f.label}
            active={statusFilter === f.value}
            onPress={() => setStatusFilter(f.value)}
          />
        ))}
      </ScrollView>

      {/* Property Filters */}
      {properties.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <FilterChip
            label="All Properties"
            active={propertyFilter === ""}
            onPress={() => setPropertyFilter("")}
          />
          {properties.map((p) => (
            <FilterChip
              key={p.id}
              label={p.name}
              active={propertyFilter === p.id}
              onPress={() => setPropertyFilter(p.id)}
            />
          ))}
        </ScrollView>
      )}

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
              title={hasActiveFilters ? "No matching interactions" : "No interactions"}
              subtitle={
                hasActiveFilters
                  ? "Try adjusting your filters"
                  : "Incoming SMS and calls will appear here"
              }
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
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  clearBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#2A1A0A",
    borderWidth: 1,
    borderColor: "#664400",
  },
  clearBtnText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "#FCA84A",
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
  },
  searchRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
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
