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
import { useAuth } from "@/lib/auth";
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
  useTestTwilioCredentials,
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
      onError: (err: unknown) => Alert.alert("Error", String(err)),
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
        <View style={modalStyles.container}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>Add Twilio Number</Text>
            <Pressable onPress={handleClose}>
              <Feather name="x" size={22} color={Colors.dark.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={modalStyles.body} keyboardShouldPersistTaps="handled">
            {apiError ? (
              <View style={webhookStyles.errorBanner}>
                <Feather name="alert-circle" size={14} color="#FF6B6B" />
                <Text style={webhookStyles.errorText}>{apiError}</Text>
              </View>
            ) : null}
            <Text style={modalStyles.fieldLabel}>Phone Number * (E.164 format)</Text>
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
              placeholderTextColor={Colors.dark.textMuted}
              style={[modalStyles.input, (touched && phoneError) ? webhookStyles.inputError : null]}
              keyboardType="phone-pad"
              autoCorrect={false}
            />
            {touched && phoneError ? (
              <Text style={webhookStyles.fieldError}>{phoneError}</Text>
            ) : null}
            <Text style={modalStyles.fieldLabel}>Friendly Name</Text>
            <TextInput
              value={friendlyName}
              onChangeText={setFriendlyName}
              placeholder="e.g. Leasing Office Line"
              placeholderTextColor={Colors.dark.textMuted}
              style={modalStyles.input}
            />
            <Text style={modalStyles.fieldLabel}>Purpose</Text>
            <TextInput
              value={purpose}
              onChangeText={setPurpose}
              placeholder="e.g. Main leasing intake"
              placeholderTextColor={Colors.dark.textMuted}
              style={modalStyles.input}
            />
            {properties.length > 0 && (
              <>
                <Text style={modalStyles.fieldLabel}>Assign to Property (optional)</Text>
                <View style={webhookStyles.propertyChips}>
                  <Pressable
                    style={[webhookStyles.propertyChip, !selectedPropertyId && webhookStyles.propertyChipSelected]}
                    onPress={() => setSelectedPropertyId(null)}
                  >
                    <Text style={[webhookStyles.propertyChipText, !selectedPropertyId && webhookStyles.propertyChipTextSelected]}>
                      None
                    </Text>
                  </Pressable>
                  {properties.map((p) => (
                    <Pressable
                      key={p.id}
                      style={[webhookStyles.propertyChip, selectedPropertyId === p.id && webhookStyles.propertyChipSelected]}
                      onPress={() => setSelectedPropertyId(p.id)}
                    >
                      <Text style={[webhookStyles.propertyChipText, selectedPropertyId === p.id && webhookStyles.propertyChipTextSelected]}>
                        {p.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}
            <Text style={webhookStyles.hint}>
              After adding, expand the Twilio Numbers section to copy webhook URLs for your Twilio console.
            </Text>
          </ScrollView>

          <View style={modalStyles.footer}>
            <Pressable style={modalStyles.cancelBtn} onPress={handleClose}>
              <Text style={modalStyles.cancelBtnText}>Cancel</Text>
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
        <View style={modalStyles.container}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>Invite Team Member</Text>
            <Pressable onPress={handleClose}>
              <Feather name="x" size={22} color={Colors.dark.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={modalStyles.body} keyboardShouldPersistTaps="handled">
            {apiError ? (
              <View style={webhookStyles.errorBanner}>
                <Feather name="alert-circle" size={14} color="#FF6B6B" />
                <Text style={webhookStyles.errorText}>{apiError}</Text>
              </View>
            ) : null}
            <Text style={modalStyles.fieldLabel}>Full Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Jordan Rivera"
              placeholderTextColor={Colors.dark.textMuted}
              style={modalStyles.input}
            />
            <Text style={modalStyles.fieldLabel}>Email *</Text>
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
              placeholderTextColor={Colors.dark.textMuted}
              style={[modalStyles.input, (touched && emailError) ? webhookStyles.inputError : null]}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {touched && emailError ? (
              <Text style={webhookStyles.fieldError}>{emailError}</Text>
            ) : null}
            <Text style={modalStyles.fieldLabel}>Role</Text>
            <View style={webhookStyles.propertyChips}>
              {ROLE_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  style={[webhookStyles.propertyChip, role === opt.value && webhookStyles.propertyChipSelected]}
                  onPress={() => setRole(opt.value as "agent" | "admin")}
                >
                  <Text style={[webhookStyles.propertyChipText, role === opt.value && webhookStyles.propertyChipTextSelected]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={webhookStyles.hint}>
              This member will be able to sign in with their Replit account using {email || "the email above"} and access your leasing panel.
            </Text>
          </ScrollView>

          <View style={modalStyles.footer}>
            <Pressable style={modalStyles.cancelBtn} onPress={handleClose}>
              <Text style={modalStyles.cancelBtnText}>Cancel</Text>
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

function TwilioIntegrationModal({
  visible,
  onClose,
  currentSettings,
}: {
  visible: boolean;
  onClose: () => void;
  currentSettings: AccountSettings | null;
}) {
  const queryClient = useQueryClient();

  const [accountSid, setAccountSid] = useState(currentSettings?.twilioAccountSid ?? "");
  const [authToken, setAuthToken] = useState("");
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const [apiKeySid, setApiKeySid] = useState(currentSettings?.twilioApiKeySid ?? "");
  const [apiKeySecret, setApiKeySecret] = useState("");
  const [twimlAppSid, setTwimlAppSid] = useState(currentSettings?.twilioTwimlAppSid ?? "");
  const [copiedVoiceUrl, setCopiedVoiceUrl] = useState(false);

  const isConnected = currentSettings?.twilioConfigured ?? false;
  const isVoiceConfigured = currentSettings?.twilioVoiceConfigured ?? false;

  useEffect(() => {
    if (visible) {
      setAccountSid(currentSettings?.twilioAccountSid ?? "");
      setAuthToken("");
      setTestResult(null);
      setApiKeySid(currentSettings?.twilioApiKeySid ?? "");
      setApiKeySecret("");
      setTwimlAppSid(currentSettings?.twilioTwimlAppSid ?? "");
      setCopiedVoiceUrl(false);
    }
  }, [
    visible,
    currentSettings?.twilioAccountSid,
    currentSettings?.twilioApiKeySid,
    currentSettings?.twilioTwimlAppSid,
  ]);

  const updateMutation = useUpdateAccountSettings({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAccountSettingsQueryKey() });
      },
      onError: (err: unknown) => Alert.alert("Error", String(err)),
    },
  });

  const testMutation = useTestTwilioCredentials();

  function handleClose() {
    setTestResult(null);
    setIsTesting(false);
    onClose();
  }

  async function handleTest() {
    const sid = accountSid.trim();
    const token = authToken.trim();
    if (!sid || !token) {
      Alert.alert("Missing fields", "Enter both Account SID and Auth Token to test.");
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await testMutation.mutateAsync({ data: { twilioAccountSid: sid, twilioAuthToken: token } });
      if (result.ok) {
        setTestResult({ ok: true, message: result.accountFriendlyName ? `Connected: ${result.accountFriendlyName}` : "Connected successfully!" });
      } else {
        setTestResult({ ok: false, message: result.error ?? "Connection failed." });
      }
    } catch (err) {
      setTestResult({ ok: false, message: String(err) });
    } finally {
      setIsTesting(false);
    }
  }

  function handleSaveAccount() {
    const sid = accountSid.trim();
    const token = authToken.trim();
    if (!sid) { Alert.alert("Missing field", "Account SID is required."); return; }
    if (!token) { Alert.alert("Missing field", "Auth Token is required."); return; }
    updateMutation.mutate(
      { data: { twilioAccountSid: sid, twilioAuthToken: token } },
      { onSuccess: () => Alert.alert("Saved", "Your Twilio credentials have been saved.") }
    );
  }

  function handleDisconnectAccount() {
    Alert.alert(
      "Disconnect Twilio",
      "This will remove your Twilio credentials. Outbound SMS will stop working until you reconnect.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: () => {
            updateMutation.mutate({ data: { twilioAccountSid: null, twilioAuthToken: null } });
          },
        },
      ]
    );
  }

  function handleSaveVoice() {
    const sid = apiKeySid.trim();
    const secret = apiKeySecret.trim();
    const appSid = twimlAppSid.trim();
    if (!sid) { Alert.alert("Missing field", "API Key SID is required."); return; }
    if (!sid.startsWith("SK")) { Alert.alert("Invalid", "API Key SID must start with 'SK'."); return; }
    if (!secret) { Alert.alert("Missing field", "API Key Secret is required."); return; }
    if (!appSid) { Alert.alert("Missing field", "TwiML App SID is required."); return; }
    if (!appSid.startsWith("AP")) { Alert.alert("Invalid", "TwiML App SID must start with 'AP'."); return; }
    updateMutation.mutate(
      { data: { twilioApiKeySid: sid, twilioApiKeySecret: secret, twilioTwimlAppSid: appSid } },
      { onSuccess: () => Alert.alert("Saved", "Twilio Voice credentials saved.") }
    );
  }

  function handleDisconnectVoice() {
    Alert.alert(
      "Remove Voice Credentials",
      "This will disable in-app calling for all agents until you re-enter credentials.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            updateMutation.mutate({ data: { twilioApiKeySid: null, twilioApiKeySecret: null, twilioTwimlAppSid: null } });
          },
        },
      ],
    );
  }

  const apiBase = (() => {
    const domain = process.env.EXPO_PUBLIC_DOMAIN;
    return domain ? `https://${domain}/api` : "";
  })();
  const webhookUrls = [
    { label: "Incoming SMS", url: `${apiBase}/webhooks/twilio/sms` },
    { label: "SMS Status Callback", url: `${apiBase}/webhooks/twilio/sms-status` },
    { label: "Incoming Voice", url: `${apiBase}/webhooks/twilio/voice` },
  ];
  const outboundCallWebhook = `${apiBase}/webhooks/twilio/outbound-call`;
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);

  function handleCopy(label: string, url: string) {
    Clipboard.setStringAsync(url).then(() => {
      setCopiedLabel(label);
      setTimeout(() => setCopiedLabel(null), 1800);
    });
  }

  function handleCopyVoiceWebhook() {
    Clipboard.setStringAsync(outboundCallWebhook).then(() => {
      setCopiedVoiceUrl(true);
      setTimeout(() => setCopiedVoiceUrl(false), 1800);
    });
  }

  const canSaveAccount = accountSid.trim().length > 0 && authToken.trim().length > 0;
  const canSaveVoice = apiKeySid.trim().length > 0 && apiKeySecret.trim().length > 0 && twimlAppSid.trim().length > 0;

  return (
    <Modal
      visible={visible}
      animationType={Platform.OS === "web" ? "fade" : "slide"}
      presentationStyle={Platform.OS === "web" ? "overFullScreen" : "pageSheet"}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={modalStyles.container}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>Twilio Integration</Text>
            <Pressable onPress={handleClose}>
              <Feather name="x" size={22} color={Colors.dark.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={modalStyles.body} keyboardShouldPersistTaps="handled">

            {/* ── Section 1: Account Connection ── */}
            <View style={voiceSetupStyles.sectionHeader}>
              <Text style={voiceSetupStyles.sectionTitle}>Account Connection</Text>
              <View style={integrationStyles.statusRow}>
                <View style={[integrationStyles.statusDot, isConnected && integrationStyles.statusDotActive]} />
                <Text style={integrationStyles.statusText}>
                  {isConnected ? "Connected" : "Not connected"}
                </Text>
              </View>
            </View>

            {isConnected && currentSettings?.twilioAccountSid && (
              <View style={integrationStyles.maskedRow}>
                <Feather name="check-circle" size={14} color={Colors.brand.tealLight} />
                <Text style={integrationStyles.maskedText}>
                  SID: {currentSettings.twilioAccountSid}
                </Text>
              </View>
            )}
            {isConnected && currentSettings?.twilioAuthTokenMasked && (
              <View style={integrationStyles.maskedRow}>
                <Feather name="lock" size={14} color={Colors.brand.tealLight} />
                <Text style={integrationStyles.maskedText}>
                  Token: {currentSettings.twilioAuthTokenMasked}
                </Text>
              </View>
            )}

            <Text style={[modalStyles.fieldLabel, { marginTop: 16 }]}>
              {isConnected ? "Update" : "Enter"} Credentials
            </Text>
            <Text style={integrationStyles.hint}>
              Find these in your Twilio Console at console.twilio.com
            </Text>

            <Text style={modalStyles.fieldLabel}>Account SID</Text>
            <TextInput
              value={accountSid}
              onChangeText={setAccountSid}
              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              placeholderTextColor={Colors.dark.textMuted}
              style={modalStyles.input}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={modalStyles.fieldLabel}>Auth Token</Text>
            <TextInput
              value={authToken}
              onChangeText={(v) => { setAuthToken(v); setTestResult(null); }}
              placeholder={isConnected ? "Enter new token to update" : "Your Twilio Auth Token"}
              placeholderTextColor={Colors.dark.textMuted}
              style={modalStyles.input}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />

            {testResult && (
              <View style={[webhookStyles.errorBanner, testResult.ok && integrationStyles.successBanner]}>
                <Feather
                  name={testResult.ok ? "check-circle" : "alert-circle"}
                  size={14}
                  color={testResult.ok ? Colors.brand.tealLight : "#FF6B6B"}
                />
                <Text style={[webhookStyles.errorText, testResult.ok && integrationStyles.successText]}>
                  {testResult.message}
                </Text>
              </View>
            )}

            <View style={voiceSetupStyles.accountBtnRow}>
              <Pressable
                style={[integrationStyles.testBtn, (isTesting || !canSaveAccount) && integrationStyles.testBtnDisabled]}
                onPress={handleTest}
                disabled={isTesting || !canSaveAccount}
              >
                {isTesting ? (
                  <ActivityIndicator size="small" color={Colors.brand.tealLight} />
                ) : (
                  <>
                    <Feather name="zap" size={14} color={Colors.brand.tealLight} />
                    <Text style={integrationStyles.testBtnText}>Test Connection</Text>
                  </>
                )}
              </Pressable>

              <Pressable
                style={[modalStyles.saveBtn, (!canSaveAccount || updateMutation.isPending) && modalStyles.saveBtnDisabled, voiceSetupStyles.inlineBtn]}
                onPress={handleSaveAccount}
                disabled={!canSaveAccount || updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={modalStyles.saveBtnText}>Save</Text>
                )}
              </Pressable>
            </View>

            {isConnected && (
              <Pressable style={integrationStyles.disconnectBtn} onPress={handleDisconnectAccount}>
                <Feather name="trash-2" size={14} color="#FF6B6B" />
                <Text style={integrationStyles.disconnectText}>Disconnect Twilio</Text>
              </Pressable>
            )}

            <View style={integrationStyles.webhookSection}>
              <Text style={integrationStyles.webhookSectionTitle}>Webhook URLs</Text>
              <Text style={integrationStyles.webhookSectionHint}>
                Paste these into your Twilio phone number settings under "A call comes in" and "A message comes in".
              </Text>
              {webhookUrls.map(({ label, url }) => (
                <View key={label} style={integrationStyles.webhookRow}>
                  <View style={integrationStyles.webhookRowLeft}>
                    <Text style={integrationStyles.webhookRowLabel}>{label}</Text>
                    <Text style={integrationStyles.webhookRowUrl} numberOfLines={1} ellipsizeMode="middle">
                      {url}
                    </Text>
                  </View>
                  <Pressable
                    style={integrationStyles.webhookCopyBtn}
                    onPress={() => handleCopy(label, url)}
                  >
                    <Feather
                      name={copiedLabel === label ? "check" : "copy"}
                      size={14}
                      color={copiedLabel === label ? Colors.brand.tealLight : Colors.dark.textSecondary}
                    />
                    <Text style={[
                      integrationStyles.webhookCopyText,
                      copiedLabel === label && integrationStyles.webhookCopiedText,
                    ]}>
                      {copiedLabel === label ? "Copied!" : "Copy"}
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>

            {/* ── Section 2: Voice Calling ── */}
            <View style={voiceSetupStyles.divider} />

            <View style={voiceSetupStyles.sectionHeader}>
              <Text style={voiceSetupStyles.sectionTitle}>Voice Calling</Text>
              <View style={integrationStyles.statusRow}>
                <View style={[integrationStyles.statusDot, isVoiceConfigured && integrationStyles.statusDotActive]} />
                <Text style={integrationStyles.statusText}>
                  {isVoiceConfigured ? "Enabled" : "Not configured"}
                </Text>
              </View>
            </View>

            {isVoiceConfigured && currentSettings?.twilioApiKeySid && (
              <View style={integrationStyles.maskedRow}>
                <Feather name="key" size={14} color={Colors.brand.tealLight} />
                <Text style={integrationStyles.maskedText}>
                  API Key: {currentSettings.twilioApiKeySid}
                </Text>
              </View>
            )}
            {isVoiceConfigured && currentSettings?.twilioApiKeySecretMasked && (
              <View style={integrationStyles.maskedRow}>
                <Feather name="lock" size={14} color={Colors.brand.tealLight} />
                <Text style={integrationStyles.maskedText}>
                  Secret: {currentSettings.twilioApiKeySecretMasked}
                </Text>
              </View>
            )}
            {isVoiceConfigured && currentSettings?.twilioTwimlAppSid && (
              <View style={integrationStyles.maskedRow}>
                <Feather name="layers" size={14} color={Colors.brand.tealLight} />
                <Text style={integrationStyles.maskedText}>
                  TwiML App: {currentSettings.twilioTwimlAppSid}
                </Text>
              </View>
            )}

            <View style={voiceSetupStyles.stepBox}>
              <Text style={voiceSetupStyles.stepTitle}>How to set up in-app calling</Text>
              <Text style={voiceSetupStyles.stepItem}>
                {"1."} In Twilio Console → Account → API keys & tokens, create a Standard API Key. Copy the SID (SK...) and Secret below.
              </Text>
              <Text style={voiceSetupStyles.stepItem}>
                {"2."} In Twilio Console → Voice → TwiML Apps, create a TwiML App. Set the Voice Request URL to the outbound webhook below, then copy the App SID (AP...).
              </Text>
              <Text style={voiceSetupStyles.stepItem}>
                {"3."} Enter all three values below and tap Save Voice Settings.
              </Text>
            </View>

            <Text style={[modalStyles.fieldLabel, { marginTop: 16 }]}>Outbound Call Webhook URL</Text>
            <Text style={integrationStyles.hint}>
              Paste this as the Voice Request URL in your TwiML App (Step 2 above).
            </Text>
            <Pressable style={voiceSetupStyles.webhookBox} onPress={handleCopyVoiceWebhook}>
              <Text style={voiceSetupStyles.webhookUrl} numberOfLines={1} ellipsizeMode="middle">
                {outboundCallWebhook}
              </Text>
              <Feather
                name={copiedVoiceUrl ? "check" : "copy"}
                size={14}
                color={copiedVoiceUrl ? Colors.brand.tealLight : Colors.dark.textSecondary}
              />
            </Pressable>
            {copiedVoiceUrl && <Text style={voiceSetupStyles.copiedHint}>Copied!</Text>}

            <Text style={[modalStyles.fieldLabel, { marginTop: 20 }]}>
              {isVoiceConfigured ? "Update" : "Enter"} Voice Credentials
            </Text>

            <Text style={modalStyles.fieldLabel}>API Key SID (starts with SK)</Text>
            <TextInput
              value={apiKeySid}
              onChangeText={setApiKeySid}
              placeholder="SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              placeholderTextColor={Colors.dark.textMuted}
              style={modalStyles.input}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={modalStyles.fieldLabel}>API Key Secret</Text>
            <TextInput
              value={apiKeySecret}
              onChangeText={setApiKeySecret}
              placeholder={isVoiceConfigured ? "Enter new secret to update" : "Your API Key Secret"}
              placeholderTextColor={Colors.dark.textMuted}
              style={modalStyles.input}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />

            <Text style={modalStyles.fieldLabel}>TwiML App SID (starts with AP)</Text>
            <TextInput
              value={twimlAppSid}
              onChangeText={setTwimlAppSid}
              placeholder="APxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              placeholderTextColor={Colors.dark.textMuted}
              style={modalStyles.input}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Pressable
              style={[modalStyles.saveBtn, (!canSaveVoice || updateMutation.isPending) && modalStyles.saveBtnDisabled, voiceSetupStyles.saveVoiceBtn]}
              onPress={handleSaveVoice}
              disabled={!canSaveVoice || updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={modalStyles.saveBtnText}>Save Voice Settings</Text>
              )}
            </Pressable>

            {isVoiceConfigured && (
              <Pressable style={integrationStyles.disconnectBtn} onPress={handleDisconnectVoice}>
                <Feather name="trash-2" size={14} color="#FF6B6B" />
                <Text style={integrationStyles.disconnectText}>Disconnect Voice</Text>
              </Pressable>
            )}

            <View style={{ height: 8 }} />
          </ScrollView>

          <View style={modalStyles.footer}>
            <Pressable style={[modalStyles.cancelBtn, { flex: 1 }]} onPress={handleClose}>
              <Text style={modalStyles.cancelBtnText}>Done</Text>
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
      <View style={[styles.twilioStatus, number.isActive ? styles.twilioStatusActive : {}]}>
        <Text style={[styles.twilioStatusText, number.isActive ? styles.twilioStatusTextActive : {}]}>
          {number.isActive ? "active" : "inactive"}
        </Text>
      </View>
    </View>
  );
}

function UserCard({ user }: { user: AccountUser }) {
  const displayName = user.name || user.email || "Unknown";
  const initials = displayName[0]?.toUpperCase() ?? "?";

  return (
    <View style={styles.userCard}>
      <View style={styles.userAvatar}>
        <Text style={styles.userAvatarText}>{initials}</Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{displayName}</Text>
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
        Alert.alert("Error", "Failed to update AI Assist setting.");
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

        {/* Integrations */}
        <View style={styles.card}>
          <SectionHeader title="INTEGRATIONS" />
          <Pressable style={integrationStyles.integrationCard} onPress={() => setShowTwilioIntegration(true)}>
            <View style={integrationStyles.integrationIconWrap}>
              <Feather name="phone-call" size={16} color={Colors.brand.tealLight} />
            </View>
            <View style={integrationStyles.integrationInfo}>
              <Text style={integrationStyles.integrationName}>Twilio</Text>
              <Text style={integrationStyles.integrationDesc}>SMS & Voice — account credentials</Text>
            </View>
            <View style={[
              integrationStyles.integrationBadge,
              accountSettingsData?.twilioConfigured && integrationStyles.integrationBadgeActive,
            ]}>
              <Text style={[
                integrationStyles.integrationBadgeText,
                accountSettingsData?.twilioConfigured && integrationStyles.integrationBadgeTextActive,
              ]}>
                {accountSettingsData?.twilioConfigured && accountSettingsData?.twilioVoiceConfigured
                  ? "SMS + Voice"
                  : accountSettingsData?.twilioConfigured
                    ? "SMS only"
                    : "Not set"}
              </Text>
            </View>
            <Feather name="chevron-right" size={16} color={Colors.dark.textMuted} />
          </Pressable>
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

              {isAdminOrOwner && (
                <>
                  <Pressable
                    style={[styles.addBtn, { marginTop: 8 }]}
                    onPress={() => setShowAddTwilioNumber(true)}
                  >
                    <Feather name="plus" size={14} color={Colors.brand.tealLight} />
                    <Text style={styles.addBtnText}>Add Number</Text>
                  </Pressable>

                  <View style={webhookStyles.hintSection}>
                    <Text style={webhookStyles.hintLabel}>WEBHOOK URLS</Text>
                    <Text style={webhookStyles.hintSubtitle}>
                      Paste these into each Twilio number's settings (HTTP POST):
                    </Text>
                    <Pressable
                      style={webhookStyles.urlBox}
                      onPress={() => {
                        const url = `${getWebhookBaseUrl()}/api/webhooks/twilio/sms`;
                        Clipboard.setStringAsync(url).then(() => {
                          Alert.alert("Copied", "SMS webhook URL copied.");
                        });
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={webhookStyles.urlLabel}>SMS</Text>
                        <Text style={webhookStyles.urlText} numberOfLines={1}>
                          {`${getWebhookBaseUrl()}/api/webhooks/twilio/sms`}
                        </Text>
                      </View>
                      <Feather name="copy" size={14} color={Colors.brand.tealLight} />
                    </Pressable>
                    <Pressable
                      style={[webhookStyles.urlBox, { marginTop: 8 }]}
                      onPress={() => {
                        const url = `${getWebhookBaseUrl()}/api/webhooks/twilio/voice`;
                        Clipboard.setStringAsync(url).then(() => {
                          Alert.alert("Copied", "Voice webhook URL copied.");
                        });
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={webhookStyles.urlLabel}>Voice</Text>
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
              ) : usersError ? (
                <Text style={styles.emptyText}>Unable to load team members</Text>
              ) : users.length === 0 ? (
                <Text style={styles.emptyText}>No team members found</Text>
              ) : (
                users.map((u) => <UserCard key={u.id} user={u} />)
              )}
              {isAdminOrOwner && (
                <Pressable
                  style={[styles.addBtn, { marginTop: 8 }]}
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
        <View style={styles.card}>
          <SectionHeader title="AI ASSIST" />
          <View style={aiAssistStyles.row}>
            <View style={aiAssistStyles.iconWrap}>
              <Feather name="cpu" size={16} color={Colors.brand.tealLight} />
            </View>
            <View style={aiAssistStyles.info}>
              <Text style={aiAssistStyles.label}>Draft Reply Suggestions</Text>
              <Text style={aiAssistStyles.desc}>
                AI pre-fills a suggested reply when you open the compose window
              </Text>
            </View>
            <Switch
              value={aiAssistToggle ?? false}
              onValueChange={handleAiAssistToggle}
              trackColor={{ false: Colors.dark.bgElevated, true: Colors.brand.teal }}
              thumbColor={aiAssistToggle ? Colors.brand.tealLight : Colors.dark.textMuted}
              disabled={updateSettingsMutation.isPending || aiAssistToggle === null}
            />
          </View>
          {aiAssistToggle && (
            <View style={aiAssistStyles.hint}>
              <Feather name="info" size={12} color={Colors.dark.textMuted} />
              <Text style={aiAssistStyles.hintText}>
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
            <Switch
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
                <Switch
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

        {/* App info */}
        <View style={styles.appInfoCard}>
          <Text style={styles.appInfoText}>MyRentCard Leasing Panel</Text>
          <Text style={styles.appInfoVersion}>v1.0.0 · MyRentCard</Text>
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

      <TwilioIntegrationModal
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

const voiceSetupStyles = StyleSheet.create({
  divider: {
    height: 1,
    backgroundColor: Colors.dark.border,
    marginVertical: 24,
  },
  sectionHeader: {
    gap: 6,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: Colors.dark.text,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  accountBtnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
    flexWrap: "wrap",
  },
  inlineBtn: {
    flex: 0,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  saveVoiceBtn: {
    alignSelf: "flex-start",
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  stepBox: {
    marginTop: 12,
    padding: 14,
    backgroundColor: Colors.dark.bgElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    gap: 8,
  },
  stepTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.textSecondary,
    marginBottom: 2,
  },
  stepItem: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textMuted,
    lineHeight: 18,
  },
  webhookBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.dark.bgCard,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 4,
  },
  webhookUrl: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.brand.tealLight,
  },
  copiedHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.brand.tealLight,
    marginTop: 4,
    marginLeft: 2,
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
