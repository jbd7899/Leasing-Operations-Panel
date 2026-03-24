import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  Platform,
  Pressable,
  Modal,
  ScrollView,
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

function PropertyBottomSheet({
  visible,
  onClose,
  properties,
  propertyFilter,
  onSelectProperty,
}: {
  visible: boolean;
  onClose: () => void;
  properties: { id: string; name: string }[];
  propertyFilter: string;
  onSelectProperty: (id: string) => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={sheetStyles.backdrop} onPress={onClose} />
      <View style={[sheetStyles.sheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        <View style={sheetStyles.handle} />
        <View style={sheetStyles.header}>
          <Text style={sheetStyles.title}>Filter by Property</Text>
          <Pressable onPress={onClose} style={sheetStyles.closeBtn}>
            <Feather name="x" size={18} color={Colors.dark.textMuted} />
          </Pressable>
        </View>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={sheetStyles.list}
        >
          <Pressable
            style={[sheetStyles.propertyRow, propertyFilter === "" && sheetStyles.propertyRowActive]}
            onPress={() => { onSelectProperty(""); onClose(); }}
          >
            <View style={sheetStyles.propertyCheck}>
              {propertyFilter === "" && (
                <Feather name="check" size={14} color={Colors.brand.tealLight} />
              )}
            </View>
            <Text style={[sheetStyles.propertyName, propertyFilter === "" && sheetStyles.propertyNameActive]}>
              All Properties
            </Text>
          </Pressable>
          {properties.map((p) => (
            <Pressable
              key={p.id}
              style={[sheetStyles.propertyRow, propertyFilter === p.id && sheetStyles.propertyRowActive]}
              onPress={() => { onSelectProperty(p.id); onClose(); }}
            >
              <View style={sheetStyles.propertyCheck}>
                {propertyFilter === p.id && (
                  <Feather name="check" size={14} color={Colors.brand.tealLight} />
                )}
              </View>
              <Text style={[sheetStyles.propertyName, propertyFilter === p.id && sheetStyles.propertyNameActive]}>
                {p.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function InboxScreen() {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("");
  const [propertySheetOpen, setPropertySheetOpen] = useState(false);

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

  const handleItemReply = useCallback((item: (typeof items)[0]) => {
    if (item.prospect?.id) {
      router.push({
        pathname: "/prospect/[id]",
        params: { id: item.prospect.id },
      });
    }
  }, []);

  const hasActiveFilters = !!(sourceFilter || statusFilter || propertyFilter || search);
  const secondaryFilterCount = (propertyFilter ? 1 : 0);

  const handleClearAll = useCallback(() => {
    setSourceFilter("");
    setStatusFilter("");
    setPropertyFilter("");
    setSearch("");
  }, []);

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <PropertyBottomSheet
        visible={propertySheetOpen}
        onClose={() => setPropertySheetOpen(false)}
        properties={properties}
        propertyFilter={propertyFilter}
        onSelectProperty={setPropertyFilter}
      />

      <View style={styles.stickyHeader}>
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.screenTitle}>Inbox</Text>
            <Text style={styles.screenSubtitle}>
              {data ? `${data.total} interaction${data.total !== 1 ? "s" : ""}` : "Loading..."}
            </Text>
          </View>
          <View style={styles.headerRight}>
            {hasActiveFilters && (
              <Pressable style={styles.clearBtn} onPress={handleClearAll}>
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

        <View style={styles.filterBarRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChips}
          >
            {SOURCE_FILTERS.filter((f) => f.value !== "").map((f) => (
              <FilterChip
                key={f.value}
                label={f.label}
                active={sourceFilter === f.value}
                onPress={() => setSourceFilter(sourceFilter === f.value ? "" : f.value)}
              />
            ))}
            <View style={styles.filterDivider} />
            {STATUS_FILTERS.filter((f) => f.value !== "").map((f) => (
              <FilterChip
                key={f.value}
                label={f.label}
                active={statusFilter === f.value}
                onPress={() => setStatusFilter(statusFilter === f.value ? "" : f.value)}
              />
            ))}
          </ScrollView>

          {properties.length > 0 && (
            <Pressable
              style={[styles.filterIconBtn, secondaryFilterCount > 0 && styles.filterIconBtnActive]}
              onPress={() => setPropertySheetOpen(true)}
            >
              <Feather
                name="sliders"
                size={15}
                color={secondaryFilterCount > 0 ? Colors.brand.tealLight : Colors.dark.textSecondary}
              />
              {secondaryFilterCount > 0 && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>{secondaryFilterCount}</Text>
                </View>
              )}
            </Pressable>
          )}
        </View>
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
            <InboxItem
              item={item}
              onPress={() => handleItemPress(item)}
              onReply={item.prospect?.id ? () => handleItemReply(item) : undefined}
            />
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
  stickyHeader: {
    backgroundColor: Colors.dark.bg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 10,
  },
  titleRow: {
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
    paddingBottom: 10,
  },
  filterBarRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 12,
    gap: 8,
  },
  filterChips: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  filterDivider: {
    width: 1,
    height: 20,
    backgroundColor: Colors.dark.border,
    marginHorizontal: 4,
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
    backgroundColor: Colors.brand.teal,
    borderColor: Colors.brand.teal,
  },
  filterLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.textSecondary,
  },
  filterLabelActive: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
  },
  filterIconBtn: {
    width: 36,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.dark.bgCard,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
    position: "relative",
  },
  filterIconBtnActive: {
    borderColor: Colors.brand.tealLight,
    backgroundColor: "#0D2A2A",
  },
  filterBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: Colors.brand.teal,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  filterBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 120,
  },
  listEmpty: {
    flex: 1,
  },
});

const sheetStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    backgroundColor: Colors.dark.bgCard,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: Colors.dark.border,
    maxHeight: "70%",
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.dark.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  title: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.text,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.dark.bgElevated,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 2,
  },
  propertyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  propertyRowActive: {
    backgroundColor: "#0D2A2A",
  },
  propertyCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.bgElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  propertyName: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary,
    flex: 1,
  },
  propertyNameActive: {
    color: Colors.brand.tealLight,
    fontFamily: "Inter_600SemiBold",
  },
});
