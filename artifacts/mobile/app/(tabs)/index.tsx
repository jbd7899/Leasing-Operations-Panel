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
  TextInput,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useGetInbox, useListProperties, useListTwilioNumbers, useInitiateNewSms, getListProspectsQueryKey, getGetInboxQueryKey } from "@workspace/api-client-react";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { InboxItem } from "@/components/ui/InboxItem";
import { SkeletonLoader } from "@/components/ui/SkeletonLoader";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchBar } from "@/components/ui/SearchBar";
import type { TwilioNumber } from "@workspace/api-client-react";

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

function NewMessageModal({
  visible,
  onClose,
  twilioNumbers,
}: {
  visible: boolean;
  onClose: () => void;
  twilioNumbers: TwilioNumber[];
}) {
  const queryClient = useQueryClient();
  const [toPhone, setToPhone] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [selectedNumberId, setSelectedNumberId] = useState<string | null>(null);

  const multipleNumbers = twilioNumbers.length > 1;
  const effectiveSelectedId = selectedNumberId ?? twilioNumbers[0]?.id ?? null;
  const selectedNumber = twilioNumbers.find((n) => n.id === effectiveSelectedId) ?? twilioNumbers[0];

  const initiateMutation = useInitiateNewSms({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getListProspectsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetInboxQueryKey() });
        handleClose();
        router.push({
          pathname: "/prospect/[id]",
          params: { id: data.prospect.id },
        });
      },
      onError: (err) => {
        const msg = err instanceof Error ? err.message : String(err);
        Alert.alert("Failed to Send", msg);
      },
    },
  });

  const handleClose = () => {
    setToPhone("");
    setMessageBody("");
    setSelectedNumberId(null);
    initiateMutation.reset();
    onClose();
  };

  const canSend = toPhone.trim().length >= 10 && messageBody.trim().length > 0 && !!selectedNumber && !initiateMutation.isPending;

  const handleSend = () => {
    if (!canSend) return;
    initiateMutation.mutate({
      toPhone: toPhone.trim(),
      body: messageBody.trim(),
      ...(effectiveSelectedId ? { fromTwilioNumberId: effectiveSelectedId } : {}),
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={newMsgStyles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={newMsgStyles.header}>
          <Pressable onPress={handleClose} style={newMsgStyles.cancelBtn}>
            <Text style={newMsgStyles.cancelText}>Cancel</Text>
          </Pressable>
          <Text style={newMsgStyles.title}>New Message</Text>
          <Pressable
            onPress={handleSend}
            style={[newMsgStyles.sendBtn, !canSend && newMsgStyles.sendBtnDisabled]}
            disabled={!canSend}
          >
            {initiateMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={newMsgStyles.sendText}>Send</Text>
            )}
          </Pressable>
        </View>

        <View style={newMsgStyles.toRow}>
          <Feather name="user" size={15} color={Colors.dark.textMuted} />
          <Text style={newMsgStyles.toLabel}>To:</Text>
          <TextInput
            value={toPhone}
            onChangeText={setToPhone}
            placeholder="Phone number (e.g. 5551234567)"
            placeholderTextColor={Colors.dark.textMuted}
            style={newMsgStyles.toInput}
            keyboardType="phone-pad"
            autoFocus
            maxLength={16}
          />
        </View>

        {twilioNumbers.length === 0 ? (
          <View style={newMsgStyles.noNumberWarn}>
            <Feather name="alert-triangle" size={16} color="#FCA84A" />
            <Text style={newMsgStyles.noNumberWarnText}>
              No Twilio numbers configured. Add one in Settings.
            </Text>
          </View>
        ) : multipleNumbers ? (
          <View style={newMsgStyles.fromRow}>
            <Feather name="phone-outgoing" size={15} color={Colors.dark.textMuted} />
            <Text style={newMsgStyles.fromLabel}>From:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={newMsgStyles.numberChips}>
              {twilioNumbers.map((n) => (
                <Pressable
                  key={n.id}
                  style={[newMsgStyles.numberChip, effectiveSelectedId === n.id && newMsgStyles.numberChipActive]}
                  onPress={() => setSelectedNumberId(n.id)}
                >
                  <Text style={[newMsgStyles.numberChipText, effectiveSelectedId === n.id && newMsgStyles.numberChipTextActive]}>
                    {n.friendlyName ?? n.phoneNumber}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : selectedNumber ? (
          <View style={newMsgStyles.fromRowSingle}>
            <Feather name="phone-outgoing" size={15} color={Colors.dark.textMuted} />
            <Text style={newMsgStyles.fromLabel}>From:</Text>
            <Text style={newMsgStyles.fromValue}>{selectedNumber.friendlyName ?? selectedNumber.phoneNumber}</Text>
          </View>
        ) : null}

        <View style={newMsgStyles.divider} />

        <TextInput
          value={messageBody}
          onChangeText={setMessageBody}
          placeholder="Type your message..."
          placeholderTextColor={Colors.dark.textMuted}
          style={newMsgStyles.bodyInput}
          multiline
          maxLength={1600}
        />

        <Text style={newMsgStyles.charCount}>{messageBody.length}/1600</Text>
      </KeyboardAvoidingView>
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
  const [newMessageOpen, setNewMessageOpen] = useState(false);

  const { data: propertiesData } = useListProperties();
  const properties = propertiesData?.properties ?? [];

  const { data: twilioNumbersData } = useListTwilioNumbers({
    query: {
      select: (d) => ({
        ...d,
        twilioNumbers: d.twilioNumbers.filter((n) => n.isActive),
      }),
    },
  });
  const activeTwilioNumbers = twilioNumbersData?.twilioNumbers ?? [];

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

      <NewMessageModal
        visible={newMessageOpen}
        onClose={() => setNewMessageOpen(false)}
        twilioNumbers={activeTwilioNumbers}
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
            <Pressable
              style={styles.composeBtn}
              onPress={() => setNewMessageOpen(true)}
            >
              <Feather name="edit" size={16} color={Colors.brand.tealLight} />
            </Pressable>
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
            {SOURCE_FILTERS.map((f) => (
              <FilterChip
                key={`src-${f.value}`}
                label={f.label}
                active={sourceFilter === f.value}
                onPress={() => setSourceFilter(f.value)}
              />
            ))}
            <View style={styles.filterDivider} />
            {STATUS_FILTERS.map((f) => (
              <FilterChip
                key={`st-${f.value}`}
                label={f.label}
                active={statusFilter === f.value}
                onPress={() => setStatusFilter(f.value)}
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
  composeBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.dark.bgCard,
    borderWidth: 1,
    borderColor: Colors.brand.teal,
    alignItems: "center",
    justifyContent: "center",
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

const newMsgStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  cancelBtn: {
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  cancelText: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary,
  },
  title: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.text,
  },
  sendBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.brand.teal,
    minWidth: 60,
    alignItems: "center",
  },
  sendBtnDisabled: {
    backgroundColor: Colors.dark.bgCard,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  sendText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  toRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
    gap: 8,
  },
  toLabel: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.textMuted,
    width: 28,
  },
  toInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.text,
  },
  fromRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
    gap: 8,
  },
  fromRowSingle: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
    gap: 8,
  },
  fromLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.textMuted,
    width: 36,
  },
  fromValue: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary,
  },
  numberChips: {
    flexDirection: "row",
    gap: 8,
    paddingRight: 16,
  },
  numberChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.dark.bgCard,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  numberChipActive: {
    backgroundColor: Colors.brand.teal,
    borderColor: Colors.brand.teal,
  },
  numberChipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.textSecondary,
  },
  numberChipTextActive: {
    color: "#fff",
  },
  noNumberWarn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  noNumberWarnText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#FCA84A",
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.dark.border,
  },
  bodyInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.text,
    textAlignVertical: "top",
  },
  charCount: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textMuted,
    textAlign: "right",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
});
