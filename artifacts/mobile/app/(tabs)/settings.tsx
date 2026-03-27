import React, { useState, useEffect } from "react";
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
  Switch,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/lib/auth";
import TwilioWizard from "@/components/settings/TwilioWizard";
import {
  useListProperties,
  useListTwilioNumbers,
  useListUsers,
  useGetCurrentAuthUser,
  useCreateProperty,
  useCreateTwilioNumber,
  useCreateUser,
  useGetAccountSettings,
  useUpdateAccountSettings,

  getListPropertiesQueryKey,
  getListTwilioNumbersQueryKey,
  getListUsersQueryKey,
  getGetAccountSettingsQueryKey,
} from "@workspace/api-client-react";
import type { Property, TwilioNumber, AccountUser, AccountSettings } from "@workspace/api-client-react";

function getWebhookBaseUrl(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  return domain ? `https://${domain}` : "";
}

function crossPlatformAlert(
  title: string,
  message: string,
  buttons?: { text: string; style?: string; onPress?: () => void }[],
) {
  if (Platform.OS === "web") {
    if (buttons && buttons.length > 1) {
      const action = buttons.find((b) => b.style === "destructive" || b.style !== "cancel");
      if (window.confirm(`${title}\n${message}`)) {
        action?.onPress?.();
      }
    } else {
      window.alert(`${title}: ${message}`);
    }
  } else {
    Alert.alert(title, message, buttons);
  }
}

function WebToggle({
  value,
  onValueChange,
  trackColor,
  thumbColor,
  disabled,
}: {
  value: boolean;
  onValueChange: (v: boolean) => void;
  trackColor?: { false: string; true: string };
  thumbColor?: string;
  disabled?: boolean;
}) {
  const track = value ? trackColor?.true ?? Colors.brand.teal : trackColor?.false ?? Colors.dark.bgElevated;
  const thumb = thumbColor ?? (value ? Colors.brand.tealLight : Colors.dark.textMuted);
  return (
    <Pressable
      onPress={() => !disabled && onValueChange(!value)}
      style={{
        width: 48,
        height: 28,
        borderRadius: 14,
        backgroundColor: track,
        justifyContent: "center",
        paddingHorizontal: 2,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: thumb,
          alignSelf: value ? "flex-end" : "flex-start",
        }}
      />
    </Pressable>
  );
}

function CrossPlatformSwitch(props: React.ComponentProps<typeof Switch>) {
  if (Platform.OS === "web") {
    return (
      <WebToggle
        value={props.value ?? false}
        onValueChange={props.onValueChange ?? (() => {})}
        trackColor={props.trackColor as { false: string; true: string } | undefined}
        thumbColor={props.thumbColor}
        disabled={props.disabled}
      />
    );
  }
  return <Switch {...props} />;
}

function SectionHeader({ title }: { title: string }) {
  const { theme, isDark } = useTheme();
  return <Text style={[styles.sectionHeader, { color: theme.textMuted }]}>{title}</Text>;
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
  const { theme, isDark } = useTheme();
  return (
    <Pressable style={[styles.settingRow, { borderTopColor: theme.border }]} onPress={onPress} disabled={!onPress}>
      <View style={[styles.settingIconWrap, { backgroundColor: theme.bgElevated }]}>
        <Feather name={icon} size={16} color={destructive ? "#FF6B6B" : Colors.brand.tealLight} />
      </View>
      <Text style={[styles.settingLabel, { color: theme.text }, destructive && styles.destructiveLabel]}>{label}</Text>
      {value ? (
        <Text style={[styles.settingValue, { color: theme.textMuted }]}>{value}</Text>
      ) : (
        onPress && <Feather name="chevron-right" size={16} color={theme.textMuted} />
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

  const { theme, isDark } = useTheme();

  const createMutation = useCreateProperty({
    mutation: {
      onSuccess: () => {
        onCreated();
        onClose();
        setName("");
        setAddress("");
        setCity("");
        setState("");
      },
      onError: (err: unknown) => crossPlatformAlert("Error", String(err)),
    },
  });

  return (
    <Modal
      visible={visible}
      animationType={Platform.OS === "web" ? "fade" : "slide"}
      presentationStyle={Platform.OS === "web" ? "overFullScreen" : "pageSheet"}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[modalStyles.container, { backgroundColor: theme.bg }]}>
          <View style={[modalStyles.header, { borderBottomColor: theme.border }]}>
            <Text style={[modalStyles.title, { color: theme.text }]}>Add Property</Text>
            <Pressable onPress={onClose}>
              <Feather name="x" size={22} color={theme.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={modalStyles.body} keyboardShouldPersistTaps="handled">
            <Text style={[modalStyles.fieldLabel, { color: theme.textSecondary }]}>Property Name *</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Sunrise Apartments"
              placeholderTextColor={theme.textMuted}
              style={[modalStyles.input, { backgroundColor: theme.bgCard, borderColor: theme.border, color: theme.text }]}
            />
            <Text style={[modalStyles.fieldLabel, { color: theme.textSecondary }]}>Address</Text>
            <TextInput
              value={address}
              onChangeText={setAddress}
              placeholder="e.g. 123 Main St"
              placeholderTextColor={theme.textMuted}
              style={[modalStyles.input, { backgroundColor: theme.bgCard, borderColor: theme.border, color: theme.text }]}
            />
            <Text style={[modalStyles.fieldLabel, { color: theme.textSecondary }]}>City</Text>
            <TextInput
              value={city}
              onChangeText={setCity}
              placeholder="e.g. Austin"
              placeholderTextColor={theme.textMuted}
              style={[modalStyles.input, { backgroundColor: theme.bgCard, borderColor: theme.border, color: theme.text }]}
            />
            <Text style={[modalStyles.fieldLabel, { color: theme.textSecondary }]}>State</Text>
            <TextInput
              value={state}
              onChangeText={setState}
              placeholder="e.g. TX"
              placeholderTextColor={theme.textMuted}
              style={[modalStyles.input, { backgroundColor: theme.bgCard, borderColor: theme.border, color: theme.text }]}
              maxLength={2}
              autoCapitalize="characters"
            />
          </ScrollView>

          <View style={[modalStyles.footer, { borderTopColor: theme.border }]}>
            <Pressable style={[modalStyles.cancelBtn, { backgroundColor: theme.bgCard, borderColor: theme.border }]} onPress={onClose}>
              <Text style={[modalStyles.cancelBtnText, { color: theme.textSecondary }]}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[modalStyles.saveBtn, (!name.trim() || createMutation.isPending) && modalStyles.saveBtnDisabled]}
              onPress={() =>
                createMutation.mutate({
                  data: {
                    name: name.trim(),
                    address1: address.trim() || undefined,
                    city: city.trim() || undefined,
                    state: state.trim() || undefined,
                  },
                })
              }
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

function AddTwilioNumberModal({
  visible,
  onClose,
  onCreated,
  properties,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
  properties: Property[];
}) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [friendlyName, setFriendlyName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [apiError, setApiError] = useState("");
  const [touched, setTouched] = useState(false);

  const E164_REGEX = /^\+[1-9]\d{7,14}$/;

  function validatePhone(val: string): string {
    if (!val.trim()) return "Phone number is required.";
    if (!E164_REGEX.test(val.trim())) return "Must be E.164 format, e.g. +15035551234";
    return "";
  }

  const phoneValidationError = validatePhone(phoneNumber);
  const isFormValid = !phoneValidationError;

  const createMutation = useCreateTwilioNumber({
    mutation: {
      onSuccess: () => {
        onCreated();
        handleClose();
      },
      onError: (err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        setApiError(msg.includes("403") ? "You need admin or owner role to add numbers." : msg);
      },
    },
  });

  function handleClose() {
    setPhoneNumber("");
    setPhoneError("");
    setFriendlyName("");
    setPurpose("");
    setSelectedPropertyId(null);
    setApiError("");
    setTouched(false);
    onClose();
  }

  const { theme, isDark } = useTheme();

  function handleSubmit() {
    setTouched(true);
    const err = validatePhone(phoneNumber);
    if (err) {
      setPhoneError(err);
      return;
    }
    setPhoneError("");
    setApiError("");
    createMutation.mutate({
      data: {
        phoneNumber: phoneNumber.trim(),
        friendlyName: friendlyName.trim() || undefined,
        purpose: purpose.trim() || undefined,
        propertyId: selectedPropertyId ?? undefined,
      },
    });
  }

  return (
    <Modal
      visible={visible}
      animationType={Platform.OS === "web" ? "fade" : "slide"}
      presentationStyle={Platform.OS === "web" ? "overFullScreen" : "pageSheet"}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={[modalStyles.container, { backgroundColor: theme.bg }]}>
          <View style={[modalStyles.header, { borderBottomColor: theme.border }]}>
            <Text style={[modalStyles.title, { color: theme.text }]}>Add Twilio Number</Text>
            <Pressable onPress={handleClose}>
              <Feather name="x" size={22} color={theme.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={modalStyles.body} keyboardShouldPersistTaps="handled">
            {apiError ? (
              <View style={webhookStyles.errorBanner}>
                <Feather name="alert-circle" size={14} color="#FF6B6B" />
                <Text style={webhookStyles.errorText}>{apiError}</Text>
              </View>
            ) : null}
            <Text style={[modalStyles.fieldLabel, { color: theme.textSecondary }]}>Phone Number * (E.164 format)</Text>
            <TextInput
              value={phoneNumber}
              onChangeText={(v) => {
                setPhoneNumber(v);
                if (touched) setPhoneError(validatePhone(v));
              }}
              onBlur={() => {
                setTouched(true);
                setPhoneError(validatePhone(phoneNumber));
              }}
              placeholder="+15035551234"
              placeholderTextColor={theme.textMuted}
              style={[modalStyles.input, { backgroundColor: theme.bgCard, borderColor: theme.border, color: theme.text }, (touched && phoneError) ? webhookStyles.inputError : null]}
              keyboardType="phone-pad"
              autoCorrect={false}
            />
            {touched && phoneError ? (
              <Text style={webhookStyles.fieldError}>{phoneError}</Text>
            ) : null}
            <Text style={[modalStyles.fieldLabel, { color: theme.textSecondary }]}>Friendly Name</Text>
            <TextInput
              value={friendlyName}
              onChangeText={setFriendlyName}
              placeholder="e.g. Leasing Office Line"
              placeholderTextColor={theme.textMuted}
              style={[modalStyles.input, { backgroundColor: theme.bgCard, borderColor: theme.border, color: theme.text }]}
            />
            <Text style={[modalStyles.fieldLabel, { color: theme.textSecondary }]}>Purpose</Text>
            <TextInput
              value={purpose}
              onChangeText={setPurpose}
              placeholder="e.g. Main leasing intake"
              placeholderTextColor={theme.textMuted}
              style={[modalStyles.input, { backgroundColor: theme.bgCard, borderColor: theme.border, color: theme.text }]}
            />
            {properties.length > 0 && (
              <>
                <Text style={[modalStyles.fieldLabel, { color: theme.textSecondary }]}>Assign to Property (optional)</Text>
                <View style={webhookStyles.propertyChips}>
                  <Pressable
                    style={[webhookStyles.propertyChip, { borderColor: theme.border, backgroundColor: theme.bgCard }, !selectedPropertyId && webhookStyles.propertyChipSelected]}
                    onPress={() => setSelectedPropertyId(null)}
                  >
                    <Text style={[webhookStyles.propertyChipText, { color: theme.textSecondary }, !selectedPropertyId && webhookStyles.propertyChipTextSelected]}>
                      None
                    </Text>
                  </Pressable>
                  {properties.map((p) => (
                    <Pressable
                      key={p.id}
                      style={[webhookStyles.propertyChip, { borderColor: theme.border, backgroundColor: theme.bgCard }, selectedPropertyId === p.id && webhookStyles.propertyChipSelected]}
                      onPress={() => setSelectedPropertyId(p.id)}
                    >
                      <Text style={[webhookStyles.propertyChipText, { color: theme.textSecondary }, selectedPropertyId === p.id && webhookStyles.propertyChipTextSelected]}>
                        {p.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}
            <Text style={[webhookStyles.hint, { color: theme.textMuted }]}>
              After adding, expand the Twilio Numbers section to copy webhook URLs for your Twilio console.
            </Text>
          </ScrollView>

          <View style={[modalStyles.footer, { borderTopColor: theme.border }]}>
            <Pressable style={[modalStyles.cancelBtn, { backgroundColor: theme.bgCard, borderColor: theme.border }]} onPress={handleClose}>
              <Text style={[modalStyles.cancelBtnText, { color: theme.textSecondary }]}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[
                modalStyles.saveBtn,
                (touched && !isFormValid || createMutation.isPending) && modalStyles.saveBtnDisabled,
              ]}
              onPress={handleSubmit}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={modalStyles.saveBtnText}>Add Number</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const ROLE_OPTIONS = [
  { label: "Agent", value: "agent" },
  { label: "Admin", value: "admin" },
];

function AddTeamMemberModal({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [role, setRole] = useState<"agent" | "admin">("agent");
  const [apiError, setApiError] = useState("");
  const [touched, setTouched] = useState(false);

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function validateEmail(val: string): string {
    if (!val.trim()) return "Email is required.";
    if (!EMAIL_REGEX.test(val.trim())) return "Enter a valid email address.";
    return "";
  }

  const emailValidationError = validateEmail(email);
  const isFormValid = !emailValidationError;

  const createMutation = useCreateUser({
    mutation: {
      onSuccess: () => {
        onCreated();
        handleClose();
      },
      onError: (err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        setApiError(msg.includes("403") ? "You need admin or owner role to invite members." : msg);
      },
    },
  });

  function handleClose() {
    setName("");
    setEmail("");
    setEmailError("");
    setRole("agent");
    setApiError("");
    setTouched(false);
    onClose();
  }

  const { theme, isDark } = useTheme();

  function handleSubmit() {
    setTouched(true);
    const err = validateEmail(email);
    if (err) {
      setEmailError(err);
      return;
    }
    setEmailError("");
    setApiError("");
    createMutation.mutate({
      data: {
        email: email.trim(),
        name: name.trim() || undefined,
        role,
      },
    });
  }

  return (
    <Modal
      visible={visible}
      animationType={Platform.OS === "web" ? "fade" : "slide"}
      presentationStyle={Platform.OS === "web" ? "overFullScreen" : "pageSheet"}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={[modalStyles.container, { backgroundColor: theme.bg }]}>
          <View style={[modalStyles.header, { borderBottomColor: theme.border }]}>
            <Text style={[modalStyles.title, { color: theme.text }]}>Invite Team Member</Text>
            <Pressable onPress={handleClose}>
              <Feather name="x" size={22} color={theme.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={modalStyles.body} keyboardShouldPersistTaps="handled">
            {apiError ? (
              <View style={webhookStyles.errorBanner}>
                <Feather name="alert-circle" size={14} color="#FF6B6B" />
                <Text style={webhookStyles.errorText}>{apiError}</Text>
              </View>
            ) : null}
            <Text style={[modalStyles.fieldLabel, { color: theme.textSecondary }]}>Full Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Jordan Rivera"
              placeholderTextColor={theme.textMuted}
              style={[modalStyles.input, { backgroundColor: theme.bgCard, borderColor: theme.border, color: theme.text }]}
            />
            <Text style={[modalStyles.fieldLabel, { color: theme.textSecondary }]}>Email *</Text>
            <TextInput
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                if (touched) setEmailError(validateEmail(v));
              }}
              onBlur={() => {
                setTouched(true);
                setEmailError(validateEmail(email));
              }}
              placeholder="e.g. jordan@yourcompany.com"
              placeholderTextColor={theme.textMuted}
              style={[modalStyles.input, { backgroundColor: theme.bgCard, borderColor: theme.border, color: theme.text }, (touched && emailError) ? webhookStyles.inputError : null]}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {touched && emailError ? (
              <Text style={webhookStyles.fieldError}>{emailError}</Text>
            ) : null}
            <Text style={[modalStyles.fieldLabel, { color: theme.textSecondary }]}>Role</Text>
            <View style={webhookStyles.propertyChips}>
              {ROLE_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  style={[webhookStyles.propertyChip, { borderColor: theme.border, backgroundColor: theme.bgCard }, role === opt.value && webhookStyles.propertyChipSelected]}
                  onPress={() => setRole(opt.value as "agent" | "admin")}
                >
                  <Text style={[webhookStyles.propertyChipText, { color: theme.textSecondary }, role === opt.value && webhookStyles.propertyChipTextSelected]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={[webhookStyles.hint, { color: theme.textMuted }]}>
              This member will be able to sign in with their Replit account using {email || "the email above"} and access your leasing panel.
            </Text>
          </ScrollView>

          <View style={[modalStyles.footer, { borderTopColor: theme.border }]}>
            <Pressable style={[modalStyles.cancelBtn, { backgroundColor: theme.bgCard, borderColor: theme.border }]} onPress={handleClose}>
              <Text style={[modalStyles.cancelBtnText, { color: theme.textSecondary }]}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[modalStyles.saveBtn, ((touched && !isFormValid) || createMutation.isPending) && modalStyles.saveBtnDisabled]}
              onPress={handleSubmit}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={modalStyles.saveBtnText}>Send Invite</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function PropertyCard({ property }: { property: Property }) {
  const { theme, isDark } = useTheme();
  return (
    <View style={[styles.propertyCard, { borderTopColor: theme.border }]}>
      <View style={[styles.propertyIconWrap, { backgroundColor: theme.activeBg }]}>
        <Feather name="home" size={16} color={Colors.brand.tealLight} />
      </View>
      <View style={styles.propertyInfo}>
        <Text style={[styles.propertyName, { color: theme.text }]}>{property.name}</Text>
        {(property.city || property.state) && (
          <Text style={[styles.propertyLocation, { color: theme.textSecondary }]}>
            {[property.city, property.state].filter(Boolean).join(", ")}
          </Text>
        )}
        {property.address1 && (
          <Text style={[styles.propertyAddress, { color: theme.textMuted }]}>{property.address1}</Text>
        )}
      </View>
      <View
        style={[
          styles.propertyStatusDot,
          { backgroundColor: property.status === "active" ? Colors.brand.tealLight : theme.textMuted },
        ]}
      />
    </View>
  );
}

function TwilioNumberCard({ number }: { number: TwilioNumber }) {
  const { theme, isDark } = useTheme();
  return (
    <View style={[styles.twilioCard, { borderTopColor: theme.border }]}>
      <View style={[styles.twilioIconWrap, { backgroundColor: theme.activeBg }]}>
        <Feather name="phone" size={14} color={Colors.brand.tealLight} />
      </View>
      <View style={styles.twilioInfo}>
        <Text style={[styles.twilioNumber, { color: theme.text }]}>{number.phoneNumber}</Text>
        {number.friendlyName && (
          <Text style={[styles.twilioFriendly, { color: theme.textSecondary }]}>{number.friendlyName}</Text>
        )}
      </View>
      <View style={[styles.twilioStatus, { backgroundColor: theme.bgElevated, borderColor: theme.border }, number.isActive ? [styles.twilioStatusActive, { backgroundColor: theme.activeBg }] : {}]}>
        <Text style={[styles.twilioStatusText, { color: theme.textMuted }, number.isActive ? styles.twilioStatusTextActive : {}]}>
          {number.isActive ? "active" : "inactive"}
        </Text>
      </View>
    </View>
  );
}

function UserCard({ user }: { user: AccountUser }) {
  const { theme, isDark } = useTheme();
  const displayName = user.name || user.email || "Unknown";
  const initials = displayName[0]?.toUpperCase() ?? "?";

  return (
    <View style={[styles.userCard, { borderTopColor: theme.border }]}>
      <View style={[styles.userAvatar, { backgroundColor: theme.bgElevated, borderColor: theme.border }]}>
        <Text style={[styles.userAvatarText, { color: theme.textSecondary }]}>{initials}</Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={[styles.userName, { color: theme.text }]}>{displayName}</Text>
        {user.email && (
          <Text style={[styles.userEmail, { color: theme.textMuted }]}>{user.email}</Text>
        )}
      </View>
      {user.role && (
        <View style={[styles.roleChip, { backgroundColor: theme.bgElevated, borderColor: theme.border }]}>
          <Text style={[styles.roleChipText, { color: theme.textSecondary }]}>{user.role}</Text>
        </View>
      )}
    </View>
  );
}

export default function SettingsScreen() {
  const { theme, isDark, mode, setMode } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [showAddProperty, setShowAddProperty] = useState(false);
  const [showAddTwilioNumber, setShowAddTwilioNumber] = useState(false);
  const [showAddTeamMember, setShowAddTeamMember] = useState(false);
  const [showTwilioIntegration, setShowTwilioIntegration] = useState(false);
  const [propertiesExpanded, setPropertiesExpanded] = useState(true);
  const [twilioExpanded, setTwilioExpanded] = useState(false);
  const [usersExpanded, setUsersExpanded] = useState(false);
  const [aiAssistToggle, setAiAssistToggle] = useState<boolean | null>(null);
  const [autoReplyEnabled, setAutoReplyEnabled] = useState<boolean | null>(null);
  const [autoReplyAfterHoursOnly, setAutoReplyAfterHoursOnly] = useState(true);
  const [autoReplyMessage, setAutoReplyMessage] = useState("");
  const [businessHoursStart, setBusinessHoursStart] = useState("09:00");
  const [businessHoursEnd, setBusinessHoursEnd] = useState("18:00");

  const { data: authUserData } = useGetCurrentAuthUser();
  const currentRole = authUserData?.user?.role ?? null;
  const isAdminOrOwner = currentRole === "owner" || currentRole === "admin";

  const { data: accountSettingsRaw } = useGetAccountSettings();
  // Cast to include auto-reply fields (API returns them, Orval types not yet regenerated)
  const accountSettingsData = accountSettingsRaw as (typeof accountSettingsRaw & {
    autoReplyEnabled?: boolean;
    autoReplyMessage?: string | null;
    autoReplyAfterHoursOnly?: boolean;
    businessHoursStart?: string;
    businessHoursEnd?: string;
    businessTimezone?: string;
  }) | undefined;

  useEffect(() => {
    if (accountSettingsData?.aiAssistEnabled !== undefined && aiAssistToggle === null) {
      setAiAssistToggle(accountSettingsData.aiAssistEnabled ?? false);
    }
    if (accountSettingsData && autoReplyEnabled === null) {
      setAutoReplyEnabled(accountSettingsData.autoReplyEnabled ?? false);
      setAutoReplyAfterHoursOnly(accountSettingsData.autoReplyAfterHoursOnly ?? true);
      setAutoReplyMessage(accountSettingsData.autoReplyMessage ?? "");
      setBusinessHoursStart(accountSettingsData.businessHoursStart ?? "09:00");
      setBusinessHoursEnd(accountSettingsData.businessHoursEnd ?? "18:00");
    }
  }, [accountSettingsData?.aiAssistEnabled, accountSettingsData?.autoReplyEnabled]);

  const updateSettingsMutation = useUpdateAccountSettings({
    mutation: {
      onSuccess: (data) => {
        queryClient.setQueryData(getGetAccountSettingsQueryKey(), data);
      },
      onError: (_err, _vars) => {
        setAiAssistToggle(accountSettingsData?.aiAssistEnabled ?? false);
        crossPlatformAlert("Error", "Failed to update AI Assist setting.");
      },
    },
  });

  function handleAiAssistToggle(value: boolean) {
    setAiAssistToggle(value);
    updateSettingsMutation.mutate({ data: { aiAssistEnabled: value } });
  }

  function handleAutoReplyToggle(value: boolean) {
    setAutoReplyEnabled(value);
    updateSettingsMutation.mutate({ data: { autoReplyEnabled: value } as any });
  }

  function handleAutoReplyAfterHoursToggle(value: boolean) {
    setAutoReplyAfterHoursOnly(value);
    updateSettingsMutation.mutate({ data: { autoReplyAfterHoursOnly: value } as any });
  }

  function handleAutoReplyMessageSave() {
    updateSettingsMutation.mutate({ data: { autoReplyMessage: autoReplyMessage } as any });
  }

  function handleBusinessHoursSave() {
    updateSettingsMutation.mutate({ data: { businessHoursStart, businessHoursEnd } as any });
  }

  const { data: propertiesData, isLoading: propertiesLoading } = useListProperties();

  const { data: twilioData, isLoading: twilioLoading } = useListTwilioNumbers({
    query: { enabled: twilioExpanded, queryKey: getListTwilioNumbersQueryKey() },
  });

  const { data: usersData, isLoading: usersLoading, isError: usersError } = useListUsers({
    query: { enabled: usersExpanded, queryKey: getListUsersQueryKey() },
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
    <View style={[styles.container, { paddingTop: topPad, backgroundColor: theme.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.screenTitle, { color: theme.text }]}>Settings</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Account */}
        <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
          <SectionHeader title="ACCOUNT" />
          <View style={styles.accountRow}>
            <View style={[styles.accountAvatar, { backgroundColor: theme.activeBg }]}>
              <Text style={styles.accountAvatarText}>
                {displayName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
              </Text>
            </View>
            <View style={styles.accountInfo}>
              <Text style={[styles.accountName, { color: theme.text }]}>{displayName}</Text>
              {user?.email && <Text style={[styles.accountEmail, { color: theme.textSecondary }]}>{user.email}</Text>}
            </View>
          </View>
          <SettingRow
            icon="log-out"
            label="Sign Out"
            destructive
            onPress={() =>
              crossPlatformAlert("Sign Out", "Are you sure you want to sign out?", [
                { text: "Cancel", style: "cancel" },
                { text: "Sign Out", style: "destructive", onPress: logout },
              ])
            }
          />
        </View>

        {/* Properties */}
        <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
          <Pressable
            style={styles.expandHeader}
            onPress={() => setPropertiesExpanded((v) => !v)}
          >
            <SectionHeader title={`PROPERTIES (${properties.length})`} />
            <Feather
              name={propertiesExpanded ? "chevron-up" : "chevron-down"}
              size={16}
              color={theme.textMuted}
            />
          </Pressable>

          {propertiesExpanded && (
            <>
              {propertiesLoading ? (
                <ActivityIndicator size="small" color={Colors.brand.tealLight} />
              ) : properties.length === 0 ? (
                <Text style={[styles.emptyText, { color: theme.textMuted }]}>No properties yet</Text>
              ) : (
                properties.map((p) => <PropertyCard key={p.id} property={p} />)
              )}
              <Pressable
                style={[styles.addBtn, { backgroundColor: theme.activeBg }]}
                onPress={() => setShowAddProperty(true)}
              >
                <Feather name="plus" size={15} color={Colors.brand.tealLight} />
                <Text style={styles.addBtnText}>Add Property</Text>
              </Pressable>
            </>
          )}
        </View>

        {/* Integrations */}
        <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
          <SectionHeader title="INTEGRATIONS" />
          <Pressable style={[integrationStyles.integrationCard, { borderTopColor: theme.border }]} onPress={() => setShowTwilioIntegration(true)}>
            <View style={[integrationStyles.integrationIconWrap, { backgroundColor: theme.activeBg }]}>
              <Feather name="phone-call" size={16} color={Colors.brand.tealLight} />
            </View>
            <View style={integrationStyles.integrationInfo}>
              <Text style={[integrationStyles.integrationName, { color: theme.text }]}>Twilio</Text>
              <Text style={[integrationStyles.integrationDesc, { color: theme.textSecondary }]}>SMS & Voice — account credentials</Text>
            </View>
            <View style={[
              integrationStyles.integrationBadge,
              { backgroundColor: theme.bgElevated, borderColor: theme.border },
              accountSettingsData?.twilioConfigured && [integrationStyles.integrationBadgeActive, { backgroundColor: theme.activeBg }],
            ]}>
              <Text style={[
                integrationStyles.integrationBadgeText,
                { color: theme.textMuted },
                accountSettingsData?.twilioConfigured && integrationStyles.integrationBadgeTextActive,
              ]}>
                {accountSettingsData?.twilioConfigured && accountSettingsData?.twilioVoiceConfigured
                  ? "SMS + Voice"
                  : accountSettingsData?.twilioConfigured
                    ? "SMS only"
                    : "Not set"}
              </Text>
            </View>
            <Feather name="chevron-right" size={16} color={theme.textMuted} />
          </Pressable>
        </View>

        {/* Twilio Numbers */}
        <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
          <Pressable
            style={styles.expandHeader}
            onPress={() => setTwilioExpanded((v) => !v)}
          >
            <SectionHeader title="TWILIO NUMBERS" />
            <Feather
              name={twilioExpanded ? "chevron-up" : "chevron-down"}
              size={16}
              color={theme.textMuted}
            />
          </Pressable>

          {twilioExpanded && (
            <>
              {twilioLoading ? (
                <ActivityIndicator size="small" color={Colors.brand.tealLight} />
              ) : twilioNumbers.length === 0 ? (
                <Text style={[styles.emptyText, { color: theme.textMuted }]}>No Twilio numbers configured</Text>
              ) : (
                twilioNumbers.map((n) => <TwilioNumberCard key={n.id} number={n} />)
              )}

              {isAdminOrOwner && (
                <>
                  <Pressable
                    style={[styles.addBtn, { marginTop: 8, backgroundColor: theme.activeBg }]}
                    onPress={() => setShowAddTwilioNumber(true)}
                  >
                    <Feather name="plus" size={14} color={Colors.brand.tealLight} />
                    <Text style={styles.addBtnText}>Add Number</Text>
                  </Pressable>

                  <View style={[webhookStyles.hintSection, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                    <Text style={[webhookStyles.hintLabel, { color: theme.textMuted }]}>WEBHOOK URLS</Text>
                    <Text style={[webhookStyles.hintSubtitle, { color: theme.textSecondary }]}>
                      Paste these into each Twilio number's settings (HTTP POST):
                    </Text>
                    <Pressable
                      style={[webhookStyles.urlBox, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
                      onPress={() => {
                        const url = `${getWebhookBaseUrl()}/api/webhooks/twilio/sms`;
                        Clipboard.setStringAsync(url).then(() => {
                          crossPlatformAlert("Copied", "SMS webhook URL copied.");
                        });
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[webhookStyles.urlLabel, { color: theme.textMuted }]}>SMS</Text>
                        <Text style={webhookStyles.urlText} numberOfLines={1}>
                          {`${getWebhookBaseUrl()}/api/webhooks/twilio/sms`}
                        </Text>
                      </View>
                      <Feather name="copy" size={14} color={Colors.brand.tealLight} />
                    </Pressable>
                    <Pressable
                      style={[webhookStyles.urlBox, { marginTop: 8, backgroundColor: theme.bgCard, borderColor: theme.border }]}
                      onPress={() => {
                        const url = `${getWebhookBaseUrl()}/api/webhooks/twilio/voice`;
                        Clipboard.setStringAsync(url).then(() => {
                          crossPlatformAlert("Copied", "Voice webhook URL copied.");
                        });
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[webhookStyles.urlLabel, { color: theme.textMuted }]}>Voice</Text>
                        <Text style={webhookStyles.urlText} numberOfLines={1}>
                          {`${getWebhookBaseUrl()}/api/webhooks/twilio/voice`}
                        </Text>
                      </View>
                      <Feather name="copy" size={14} color={Colors.brand.tealLight} />
                    </Pressable>
                  </View>
                </>
              )}
            </>
          )}
        </View>

        {/* Users / Team */}
        <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
          <Pressable
            style={styles.expandHeader}
            onPress={() => setUsersExpanded((v) => !v)}
          >
            <SectionHeader title="TEAM MEMBERS" />
            <Feather
              name={usersExpanded ? "chevron-up" : "chevron-down"}
              size={16}
              color={theme.textMuted}
            />
          </Pressable>

          {usersExpanded && (
            <>
              {usersLoading ? (
                <ActivityIndicator size="small" color={Colors.brand.tealLight} />
              ) : usersError ? (
                <Text style={[styles.emptyText, { color: theme.textMuted }]}>Unable to load team members</Text>
              ) : users.length === 0 ? (
                <Text style={[styles.emptyText, { color: theme.textMuted }]}>No team members found</Text>
              ) : (
                users.map((u) => <UserCard key={u.id} user={u} />)
              )}
              {isAdminOrOwner && (
                <Pressable
                  style={[styles.addBtn, { marginTop: 8, backgroundColor: theme.activeBg }]}
                  onPress={() => setShowAddTeamMember(true)}
                >
                  <Feather name="user-plus" size={14} color={Colors.brand.tealLight} />
                  <Text style={styles.addBtnText}>Invite Member</Text>
                </Pressable>
              )}
            </>
          )}
        </View>

        {/* AI Assist */}
        <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
          <SectionHeader title="AI ASSIST" />
          <View style={aiAssistStyles.row}>
            <View style={[aiAssistStyles.iconWrap, { backgroundColor: theme.activeBg }]}>
              <Feather name="cpu" size={16} color={Colors.brand.tealLight} />
            </View>
            <View style={aiAssistStyles.info}>
              <Text style={[aiAssistStyles.label, { color: theme.text }]}>Draft Reply Suggestions</Text>
              <Text style={[aiAssistStyles.desc, { color: theme.textSecondary }]}>
                AI pre-fills a suggested reply when you open the compose window
              </Text>
            </View>
            <CrossPlatformSwitch
              value={aiAssistToggle ?? false}
              onValueChange={handleAiAssistToggle}
              trackColor={{ false: theme.bgElevated, true: Colors.brand.teal }}
              thumbColor={aiAssistToggle ? Colors.brand.tealLight : theme.textMuted}
              disabled={updateSettingsMutation.isPending || aiAssistToggle === null}
            />
          </View>
          {aiAssistToggle && (
            <View style={[aiAssistStyles.hint, { borderTopColor: theme.border }]}>
              <Feather name="info" size={12} color={theme.textMuted} />
              <Text style={[aiAssistStyles.hintText, { color: theme.textMuted }]}>
                AI drafts are suggestions only — you always review and send manually.
              </Text>
            </View>
          )}
        </View>

        {/* Auto-Reply */}
        <View style={styles.card}>
          <SectionHeader title="AUTO-REPLY" />
          <View style={aiAssistStyles.row}>
            <View style={aiAssistStyles.iconWrap}>
              <Feather name="message-circle" size={16} color={Colors.brand.tealLight} />
            </View>
            <View style={aiAssistStyles.info}>
              <Text style={aiAssistStyles.label}>Smart Auto-Reply</Text>
              <Text style={aiAssistStyles.desc}>
                Auto-send an acknowledgment when prospects text you
              </Text>
            </View>
            <CrossPlatformSwitch
              value={autoReplyEnabled ?? false}
              onValueChange={handleAutoReplyToggle}
              trackColor={{ false: Colors.dark.bgElevated, true: Colors.brand.teal }}
              thumbColor={autoReplyEnabled ? Colors.brand.tealLight : Colors.dark.textMuted}
              disabled={updateSettingsMutation.isPending || autoReplyEnabled === null}
            />
          </View>

          {autoReplyEnabled && (
            <>
              <View style={[aiAssistStyles.row, { marginTop: 12 }]}>
                <View style={aiAssistStyles.iconWrap}>
                  <Feather name="clock" size={16} color={Colors.brand.tealLight} />
                </View>
                <View style={aiAssistStyles.info}>
                  <Text style={aiAssistStyles.label}>After Hours Only</Text>
                  <Text style={aiAssistStyles.desc}>
                    Only auto-reply outside business hours
                  </Text>
                </View>
                <CrossPlatformSwitch
                  value={autoReplyAfterHoursOnly}
                  onValueChange={handleAutoReplyAfterHoursToggle}
                  trackColor={{ false: Colors.dark.bgElevated, true: Colors.brand.teal }}
                  thumbColor={autoReplyAfterHoursOnly ? Colors.brand.tealLight : Colors.dark.textMuted}
                  disabled={updateSettingsMutation.isPending}
                />
              </View>

              {autoReplyAfterHoursOnly && (
                <View style={{ flexDirection: "row", gap: 12, marginTop: 12, paddingHorizontal: 4 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={aiAssistStyles.desc}>Start</Text>
                    <TextInput
                      style={[modalStyles.input, { marginTop: 4 }]}
                      value={businessHoursStart}
                      onChangeText={setBusinessHoursStart}
                      onBlur={handleBusinessHoursSave}
                      placeholder="09:00"
                      placeholderTextColor={Colors.dark.textMuted}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={aiAssistStyles.desc}>End</Text>
                    <TextInput
                      style={[modalStyles.input, { marginTop: 4 }]}
                      value={businessHoursEnd}
                      onChangeText={setBusinessHoursEnd}
                      onBlur={handleBusinessHoursSave}
                      placeholder="18:00"
                      placeholderTextColor={Colors.dark.textMuted}
                    />
                  </View>
                </View>
              )}

              <View style={{ marginTop: 12, paddingHorizontal: 4 }}>
                <Text style={aiAssistStyles.desc}>Reply Message</Text>
                <TextInput
                  style={[modalStyles.input, { marginTop: 4, minHeight: 60, textAlignVertical: "top" }]}
                  value={autoReplyMessage}
                  onChangeText={setAutoReplyMessage}
                  onBlur={handleAutoReplyMessageSave}
                  multiline
                  placeholder="Hi {firstName}! Thanks for reaching out about {propertyName}..."
                  placeholderTextColor={Colors.dark.textMuted}
                />
                <View style={[aiAssistStyles.hint, { marginTop: 6 }]}>
                  <Feather name="info" size={12} color={Colors.dark.textMuted} />
                  <Text style={aiAssistStyles.hintText}>
                    Use {"{firstName}"} and {"{propertyName}"} as placeholders
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Appearance */}
        <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
          <SectionHeader title="APPEARANCE" />
          <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
            {(["dark", "light", "system"] as const).map((m) => (
              <Pressable
                key={m}
                onPress={() => setMode(m)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: mode === m ? Colors.brand.teal : theme.border,
                  backgroundColor: mode === m ? (theme.activeBg) : theme.bgCard,
                  alignItems: "center",
                }}
              >
                <Feather
                  name={m === "dark" ? "moon" : m === "light" ? "sun" : "smartphone"}
                  size={16}
                  color={mode === m ? Colors.brand.tealLight : theme.textMuted}
                  style={{ marginBottom: 4 }}
                />
                <Text style={{
                  fontSize: 13,
                  fontFamily: "Inter_500Medium",
                  color: mode === m ? Colors.brand.tealLight : theme.textSecondary,
                  textTransform: "capitalize",
                }}>
                  {m}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* App info */}
        <View style={styles.appInfoCard}>
          <Text style={[styles.appInfoText, { color: theme.textMuted }]}>MyRentCard Leasing Panel</Text>
          <Text style={[styles.appInfoVersion, { color: theme.textMuted }]}>v1.0.0 · MyRentCard</Text>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      <AddPropertyModal
        visible={showAddProperty}
        onClose={() => setShowAddProperty(false)}
        onCreated={() => {
          queryClient.invalidateQueries({ queryKey: getListPropertiesQueryKey() });
        }}
      />

      <AddTwilioNumberModal
        visible={showAddTwilioNumber}
        onClose={() => setShowAddTwilioNumber(false)}
        onCreated={() => {
          queryClient.invalidateQueries({ queryKey: getListTwilioNumbersQueryKey() });
        }}
        properties={properties}
      />

      <AddTeamMemberModal
        visible={showAddTeamMember}
        onClose={() => setShowAddTeamMember(false)}
        onCreated={() => {
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        }}
      />

      <TwilioWizard
        visible={showTwilioIntegration}
        onClose={() => setShowTwilioIntegration(false)}
        currentSettings={accountSettingsData ?? null}
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

const webhookStyles = StyleSheet.create({
  hintSection: {
    marginTop: 14,
    padding: 14,
    backgroundColor: Colors.dark.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    gap: 8,
  },
  hintLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.textMuted,
    letterSpacing: 0.8,
  },
  hintSubtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary,
    lineHeight: 17,
    marginBottom: 2,
  },
  urlLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  errorBanner: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    backgroundColor: "#2A0D0D",
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#FF6B6B44",
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#FF6B6B",
    lineHeight: 18,
  },
  urlBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.dark.bgCard,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  urlText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.brand.tealLight,
  },
  hint: {
    marginTop: 14,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textMuted,
    lineHeight: 18,
  },
  propertyChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  propertyChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.bgCard,
  },
  propertyChipSelected: {
    borderColor: Colors.brand.teal,
    backgroundColor: "#0D2A2A",
  },
  propertyChipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.textSecondary,
  },
  propertyChipTextSelected: {
    color: Colors.brand.tealLight,
  },
  inputError: {
    borderColor: "#FF6B6B",
  },
  fieldError: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#FF6B6B",
    marginTop: 4,
    marginLeft: 2,
  },
});

const integrationStyles = StyleSheet.create({
  integrationCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  integrationIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#0D2A2A",
    alignItems: "center",
    justifyContent: "center",
  },
  integrationInfo: {
    flex: 1,
    gap: 2,
  },
  integrationName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.text,
  },
  integrationDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary,
  },
  integrationBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: Colors.dark.bgElevated,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  integrationBadgeActive: {
    backgroundColor: "#0D2A2A",
    borderColor: Colors.brand.teal + "44",
  },
  integrationBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.textMuted,
  },
  integrationBadgeTextActive: {
    color: Colors.brand.tealLight,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.dark.textMuted,
  },
  statusDotActive: {
    backgroundColor: Colors.brand.tealLight,
  },
  statusText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.textSecondary,
  },
  maskedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#0D2A2A",
    borderRadius: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: Colors.brand.teal + "44",
  },
  maskedText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.brand.tealLight,
    flex: 1,
  },
  hint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textMuted,
    marginBottom: 8,
    marginTop: 2,
    lineHeight: 17,
  },
  testBtn: {
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
    marginTop: 14,
  },
  testBtnDisabled: {
    opacity: 0.5,
  },
  testBtnText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.brand.tealLight,
  },
  disconnectBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FF6B6B44",
    backgroundColor: "#2A0D0D",
    alignSelf: "flex-start",
    marginTop: 12,
  },
  disconnectText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#FF6B6B",
  },
  successBanner: {
    backgroundColor: "#0D2A2A",
    borderColor: Colors.brand.teal + "44",
  },
  successText: {
    color: Colors.brand.tealLight,
  },
  webhookSection: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  webhookSectionTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  webhookSectionHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textMuted,
    lineHeight: 17,
    marginBottom: 12,
  },
  webhookRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: Colors.dark.bgElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginBottom: 8,
  },
  webhookRowLeft: {
    flex: 1,
    gap: 2,
  },
  webhookRowLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.textSecondary,
  },
  webhookRowUrl: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textMuted,
  },
  webhookCopyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.dark.bg,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  webhookCopyText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.textSecondary,
  },
  webhookCopiedText: {
    color: Colors.brand.tealLight,
  },
});

const aiAssistStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: 8,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#0D2A2A",
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
    gap: 3,
  },
  label: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.text,
  },
  desc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary,
    lineHeight: 17,
  },
  hint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  hintText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textMuted,
    lineHeight: 17,
  },
});
