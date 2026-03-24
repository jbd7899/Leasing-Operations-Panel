import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Property, TwilioNumber, AccountUser } from "@/constants/types";

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function SettingRow({
  icon,
  label,
  value,
  onPress,
  destructive,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
}) {
  return (
    <Pressable style={styles.settingRow} onPress={onPress} disabled={!onPress}>
      <View style={styles.settingIconWrap}>
        <Feather name={icon} size={16} color={destructive ? "#FF6B6B" : Colors.brand.tealLight} />
      </View>
      <Text style={[styles.settingLabel, destructive && styles.destructiveLabel]}>{label}</Text>
      {value ? (
        <Text style={styles.settingValue}>{value}</Text>
      ) : (
        onPress && <Feather name="chevron-right" size={16} color={Colors.dark.textMuted} />
      )}
    </Pressable>
  );
}

function AddPropertyModal({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");

  const createMutation = useMutation({
    mutationFn: () =>
      api.properties.create({ name: name.trim(), address1: address.trim() || undefined, city: city.trim() || undefined, state: state.trim() || undefined }),
    onSuccess: () => {
      onCreated();
      onClose();
      setName("");
      setAddress("");
      setCity("");
      setState("");
    },
    onError: (err) => Alert.alert("Error", String(err)),
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={modalStyles.container}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>Add Property</Text>
            <Pressable onPress={onClose}>
              <Feather name="x" size={22} color={Colors.dark.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={modalStyles.body} keyboardShouldPersistTaps="handled">
            <Text style={modalStyles.fieldLabel}>Property Name *</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Sunrise Apartments"
              placeholderTextColor={Colors.dark.textMuted}
              style={modalStyles.input}
            />
            <Text style={modalStyles.fieldLabel}>Address</Text>
            <TextInput
              value={address}
              onChangeText={setAddress}
              placeholder="e.g. 123 Main St"
              placeholderTextColor={Colors.dark.textMuted}
              style={modalStyles.input}
            />
            <Text style={modalStyles.fieldLabel}>City</Text>
            <TextInput
              value={city}
              onChangeText={setCity}
              placeholder="e.g. Austin"
              placeholderTextColor={Colors.dark.textMuted}
              style={modalStyles.input}
            />
            <Text style={modalStyles.fieldLabel}>State</Text>
            <TextInput
              value={state}
              onChangeText={setState}
              placeholder="e.g. TX"
              placeholderTextColor={Colors.dark.textMuted}
              style={modalStyles.input}
              maxLength={2}
              autoCapitalize="characters"
            />
          </ScrollView>

          <View style={modalStyles.footer}>
            <Pressable style={modalStyles.cancelBtn} onPress={onClose}>
              <Text style={modalStyles.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[modalStyles.saveBtn, (!name.trim() || createMutation.isPending) && modalStyles.saveBtnDisabled]}
              onPress={() => createMutation.mutate()}
              disabled={!name.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={modalStyles.saveBtnText}>Create Property</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function PropertyCard({ property }: { property: Property }) {
  return (
    <View style={styles.propertyCard}>
      <View style={styles.propertyIconWrap}>
        <Feather name="home" size={16} color={Colors.brand.tealLight} />
      </View>
      <View style={styles.propertyInfo}>
        <Text style={styles.propertyName}>{property.name}</Text>
        {(property.city || property.state) && (
          <Text style={styles.propertyLocation}>
            {[property.city, property.state].filter(Boolean).join(", ")}
          </Text>
        )}
        {property.address1 && (
          <Text style={styles.propertyAddress}>{property.address1}</Text>
        )}
      </View>
      <View
        style={[
          styles.propertyStatusDot,
          { backgroundColor: property.status === "active" ? Colors.brand.tealLight : Colors.dark.textMuted },
        ]}
      />
    </View>
  );
}

function TwilioNumberCard({ number }: { number: TwilioNumber }) {
  return (
    <View style={styles.twilioCard}>
      <View style={styles.twilioIconWrap}>
        <Feather name="phone" size={14} color={Colors.brand.tealLight} />
      </View>
      <View style={styles.twilioInfo}>
        <Text style={styles.twilioNumber}>{number.phoneNumber}</Text>
        {number.friendlyName && (
          <Text style={styles.twilioFriendly}>{number.friendlyName}</Text>
        )}
      </View>
      <View style={[styles.twilioStatus, number.status === "active" ? styles.twilioStatusActive : {}]}>
        <Text style={[styles.twilioStatusText, number.status === "active" ? styles.twilioStatusTextActive : {}]}>
          {number.status}
        </Text>
      </View>
    </View>
  );
}

function UserCard({ user }: { user: AccountUser }) {
  const initials = [user.firstName, user.lastName]
    .filter(Boolean)
    .map((s) => s![0])
    .join("")
    .toUpperCase() || (user.email?.[0]?.toUpperCase() ?? "?");

  return (
    <View style={styles.userCard}>
      <View style={styles.userAvatar}>
        <Text style={styles.userAvatarText}>{initials}</Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>
          {[user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Unknown"}
        </Text>
        {user.email && (
          <Text style={styles.userEmail}>{user.email}</Text>
        )}
      </View>
      {user.role && (
        <View style={styles.roleChip}>
          <Text style={styles.roleChipText}>{user.role}</Text>
        </View>
      )}
    </View>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [showAddProperty, setShowAddProperty] = useState(false);
  const [propertiesExpanded, setPropertiesExpanded] = useState(true);
  const [twilioExpanded, setTwilioExpanded] = useState(false);
  const [usersExpanded, setUsersExpanded] = useState(false);

  const { data: propertiesData, isLoading: propertiesLoading } = useQuery({
    queryKey: ["properties"],
    queryFn: () => api.properties.list(),
  });

  const { data: twilioData, isLoading: twilioLoading } = useQuery({
    queryKey: ["twilio-numbers"],
    queryFn: () => api.twilioNumbers.list(),
    enabled: twilioExpanded,
  });

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => api.users.list(),
    enabled: usersExpanded,
  });

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? Math.max(insets.top, 67) : insets.top;

  const properties = propertiesData?.properties ?? [];
  const twilioNumbers = twilioData?.twilioNumbers ?? [];
  const users = usersData?.users ?? [];

  const displayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "User"
    : "User";

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Settings</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Account */}
        <View style={styles.card}>
          <SectionHeader title="ACCOUNT" />
          <View style={styles.accountRow}>
            <View style={styles.accountAvatar}>
              <Text style={styles.accountAvatarText}>
                {displayName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
              </Text>
            </View>
            <View style={styles.accountInfo}>
              <Text style={styles.accountName}>{displayName}</Text>
              {user?.email && <Text style={styles.accountEmail}>{user.email}</Text>}
            </View>
          </View>
          <SettingRow
            icon="log-out"
            label="Sign Out"
            destructive
            onPress={() =>
              Alert.alert("Sign Out", "Are you sure you want to sign out?", [
                { text: "Cancel", style: "cancel" },
                { text: "Sign Out", style: "destructive", onPress: logout },
              ])
            }
          />
        </View>

        {/* Properties */}
        <View style={styles.card}>
          <Pressable
            style={styles.expandHeader}
            onPress={() => setPropertiesExpanded((v) => !v)}
          >
            <SectionHeader title={`PROPERTIES (${properties.length})`} />
            <Feather
              name={propertiesExpanded ? "chevron-up" : "chevron-down"}
              size={16}
              color={Colors.dark.textMuted}
            />
          </Pressable>

          {propertiesExpanded && (
            <>
              {propertiesLoading ? (
                <ActivityIndicator size="small" color={Colors.brand.tealLight} />
              ) : properties.length === 0 ? (
                <Text style={styles.emptyText}>No properties yet</Text>
              ) : (
                properties.map((p) => <PropertyCard key={p.id} property={p} />)
              )}
              <Pressable
                style={styles.addBtn}
                onPress={() => setShowAddProperty(true)}
              >
                <Feather name="plus" size={15} color={Colors.brand.tealLight} />
                <Text style={styles.addBtnText}>Add Property</Text>
              </Pressable>
            </>
          )}
        </View>

        {/* Twilio Numbers */}
        <View style={styles.card}>
          <Pressable
            style={styles.expandHeader}
            onPress={() => setTwilioExpanded((v) => !v)}
          >
            <SectionHeader title="TWILIO NUMBERS" />
            <Feather
              name={twilioExpanded ? "chevron-up" : "chevron-down"}
              size={16}
              color={Colors.dark.textMuted}
            />
          </Pressable>

          {twilioExpanded && (
            <>
              {twilioLoading ? (
                <ActivityIndicator size="small" color={Colors.brand.tealLight} />
              ) : twilioNumbers.length === 0 ? (
                <Text style={styles.emptyText}>No Twilio numbers configured</Text>
              ) : (
                twilioNumbers.map((n) => <TwilioNumberCard key={n.id} number={n} />)
              )}
            </>
          )}
        </View>

        {/* Users / Team */}
        <View style={styles.card}>
          <Pressable
            style={styles.expandHeader}
            onPress={() => setUsersExpanded((v) => !v)}
          >
            <SectionHeader title="TEAM MEMBERS" />
            <Feather
              name={usersExpanded ? "chevron-up" : "chevron-down"}
              size={16}
              color={Colors.dark.textMuted}
            />
          </Pressable>

          {usersExpanded && (
            <>
              {usersLoading ? (
                <ActivityIndicator size="small" color={Colors.brand.tealLight} />
              ) : users.length === 0 ? (
                <Text style={styles.emptyText}>No team members found</Text>
              ) : (
                users.map((u) => <UserCard key={u.id} user={u} />)
              )}
            </>
          )}
        </View>

        {/* App info */}
        <View style={styles.appInfoCard}>
          <Text style={styles.appInfoText}>MyRentCard Leasing Panel</Text>
          <Text style={styles.appInfoVersion}>v1.0.0 · Powered by Replit</Text>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      <AddPropertyModal
        visible={showAddProperty}
        onClose={() => setShowAddProperty(false)}
        onCreated={() => {
          queryClient.invalidateQueries({ queryKey: ["properties"] });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.bg,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 8,
  },
  screenTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.dark.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  sectionHeader: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.textMuted,
    letterSpacing: 0.8,
  },
  card: {
    backgroundColor: Colors.dark.bgCard,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  expandHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  accountAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#0D2A2A",
    borderWidth: 2,
    borderColor: Colors.brand.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  accountAvatarText: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.brand.tealLight,
  },
  accountInfo: {
    flex: 1,
    gap: 2,
  },
  accountName: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.text,
  },
  accountEmail: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  settingIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.dark.bgElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  settingLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.text,
  },
  destructiveLabel: {
    color: "#FF6B6B",
  },
  settingValue: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textMuted,
  },
  propertyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  propertyIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#0D2A2A",
    alignItems: "center",
    justifyContent: "center",
  },
  propertyInfo: {
    flex: 1,
    gap: 2,
  },
  propertyName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.text,
  },
  propertyLocation: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary,
  },
  propertyAddress: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textMuted,
  },
  propertyStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  twilioCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  twilioIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#0D2A2A",
    alignItems: "center",
    justifyContent: "center",
  },
  twilioInfo: {
    flex: 1,
    gap: 2,
  },
  twilioNumber: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.text,
  },
  twilioFriendly: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary,
  },
  twilioStatus: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: Colors.dark.bgElevated,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  twilioStatusActive: {
    backgroundColor: "#0D2A2A",
    borderColor: Colors.brand.teal + "44",
  },
  twilioStatusText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.textMuted,
    textTransform: "capitalize",
  },
  twilioStatusTextActive: {
    color: Colors.brand.tealLight,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.dark.bgElevated,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    alignItems: "center",
    justifyContent: "center",
  },
  userAvatarText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.textSecondary,
  },
  userInfo: {
    flex: 1,
    gap: 2,
  },
  userName: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.text,
  },
  userEmail: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textMuted,
  },
  roleChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: Colors.dark.bgElevated,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  roleChipText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.textSecondary,
    textTransform: "capitalize",
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.brand.teal + "66",
    backgroundColor: "#0D2A2A",
    alignSelf: "flex-start",
  },
  addBtnText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.brand.tealLight,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textMuted,
    textAlign: "center",
    paddingVertical: 8,
  },
  appInfoCard: {
    alignItems: "center",
    paddingVertical: 16,
    gap: 4,
  },
  appInfoText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.textMuted,
  },
  appInfoVersion: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textMuted,
  },
});

const modalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.bg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.text,
  },
  body: {
    flex: 1,
    padding: 20,
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.textSecondary,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: Colors.dark.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.text,
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.dark.bgCard,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.textSecondary,
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.brand.teal,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});
