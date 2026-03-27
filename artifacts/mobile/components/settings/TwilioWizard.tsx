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
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";
import {
  useUpdateAccountSettings,
  useTestTwilioCredentials,
  getGetAccountSettingsQueryKey,
} from "@workspace/api-client-react";
import type { AccountSettings } from "@workspace/api-client-react";

type WizardStep = 1 | 2 | 3;

const STEP_LABELS = ["Account", "Webhooks", "Voice"] as const;

function StepIndicator({ current, completed }: { current: WizardStep; completed: Set<number> }) {
  const { theme, isDark } = useTheme();
  return (
    <View style={stepStyles.container}>
      {STEP_LABELS.map((label, i) => {
        const stepNum = (i + 1) as WizardStep;
        const isActive = stepNum === current;
        const isDone = completed.has(stepNum);
        return (
          <React.Fragment key={label}>
            {i > 0 && (
              <View style={[stepStyles.line, { backgroundColor: isDone || isActive ? Colors.brand.tealLight : theme.border }]} />
            )}
            <View style={{ alignItems: "center", gap: 4 }}>
              <View
                style={[
                  stepStyles.circle,
                  {
                    backgroundColor: isDone ? Colors.brand.tealLight : isActive ? (theme.activeBg) : theme.bgElevated,
                    borderColor: isDone || isActive ? Colors.brand.tealLight : theme.border,
                  },
                ]}
              >
                {isDone ? (
                  <Feather name="check" size={12} color="#fff" />
                ) : (
                  <Text style={[stepStyles.circleText, { color: isActive ? Colors.brand.tealLight : theme.textMuted }]}>
                    {stepNum}
                  </Text>
                )}
              </View>
              <Text style={[stepStyles.label, { color: isActive ? Colors.brand.tealLight : theme.textMuted }]}>
                {label}
              </Text>
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
}

export default function TwilioWizard({
  visible,
  onClose,
  currentSettings,
}: {
  visible: boolean;
  onClose: () => void;
  currentSettings: AccountSettings | null;
}) {
  const { theme, isDark } = useTheme();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<WizardStep>(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  // Step 1 state
  const [accountSid, setAccountSid] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Step 3 state
  const [apiKeySid, setApiKeySid] = useState("");
  const [apiKeySecret, setApiKeySecret] = useState("");
  const [twimlAppSid, setTwimlAppSid] = useState("");

  // Webhook copy state
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);
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
      setCopiedLabel(null);
      setCopiedVoiceUrl(false);
      setStep(1);
      // Mark steps as complete if already configured
      const done = new Set<number>();
      if (currentSettings?.twilioConfigured) done.add(1);
      if (currentSettings?.twilioConfigured) done.add(2); // webhooks available once connected
      if (currentSettings?.twilioVoiceConfigured) done.add(3);
      setCompletedSteps(done);
    }
  }, [visible, currentSettings?.twilioAccountSid, currentSettings?.twilioApiKeySid, currentSettings?.twilioTwimlAppSid]);

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

  // ── Step 1: Account Connection ──

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

  function handleSaveAccountAndContinue() {
    const sid = accountSid.trim();
    const token = authToken.trim();
    if (!sid) { Alert.alert("Missing field", "Account SID is required."); return; }
    if (!token) { Alert.alert("Missing field", "Auth Token is required."); return; }
    updateMutation.mutate(
      { data: { twilioAccountSid: sid, twilioAuthToken: token } },
      {
        onSuccess: () => {
          setCompletedSteps((prev) => new Set([...prev, 1]));
          setStep(2);
        },
      },
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
      ],
    );
  }

  // ── Step 2: Webhooks ──

  const apiBase = (() => {
    const domain = process.env.EXPO_PUBLIC_DOMAIN;
    return domain ? `https://${domain}/api` : `http://localhost:8080/api`;
  })();
  const webhookUrls = [
    { label: "Incoming SMS", url: `${apiBase}/webhooks/twilio/sms` },
    { label: "Incoming Voice", url: `${apiBase}/webhooks/twilio/voice` },
  ];
  const outboundCallWebhook = `${apiBase}/webhooks/twilio/outbound-call`;

  function handleCopy(label: string, url: string) {
    Clipboard.setStringAsync(url).then(() => {
      setCopiedLabel(label);
      setTimeout(() => setCopiedLabel(null), 1800);
    });
  }

  // ── Step 3: Voice ──

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
      {
        onSuccess: () => {
          setCompletedSteps((prev) => new Set([...prev, 3]));
          Alert.alert("Saved", "Twilio Voice credentials saved.");
          handleClose();
        },
      },
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

  const canSaveAccount = accountSid.trim().length > 0 && authToken.trim().length > 0;
  const canSaveVoice = apiKeySid.trim().length > 0 && apiKeySecret.trim().length > 0 && twimlAppSid.trim().length > 0;

  // ── Render ──

  function renderStep1() {
    return (
      <>
        <View style={s.sectionHeader}>
          <Text style={[s.sectionTitle, { color: theme.text }]}>Connect Your Twilio Account</Text>
          <Text style={[s.sectionSubtitle, { color: theme.textMuted }]}>
            Enter your Account SID and Auth Token from console.twilio.com
          </Text>
        </View>

        {isConnected && currentSettings?.twilioAccountSid && (
          <View style={[s.maskedRow, { backgroundColor: theme.activeBg }]}>
            <Feather name="check-circle" size={14} color={Colors.brand.tealLight} />
            <Text style={s.maskedText}>SID: {currentSettings.twilioAccountSid}</Text>
          </View>
        )}
        {isConnected && currentSettings?.twilioAuthTokenMasked && (
          <View style={[s.maskedRow, { backgroundColor: theme.activeBg }]}>
            <Feather name="lock" size={14} color={Colors.brand.tealLight} />
            <Text style={s.maskedText}>Token: {currentSettings.twilioAuthTokenMasked}</Text>
          </View>
        )}

        <Text style={[s.fieldLabel, { color: theme.textSecondary }]}>Account SID</Text>
        <TextInput
          value={accountSid}
          onChangeText={setAccountSid}
          placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          placeholderTextColor={theme.textMuted}
          style={[s.input, { backgroundColor: theme.bgCard, borderColor: theme.border, color: theme.text }]}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={[s.fieldLabel, { color: theme.textSecondary }]}>Auth Token</Text>
        <TextInput
          value={authToken}
          onChangeText={(v) => { setAuthToken(v); setTestResult(null); }}
          placeholder={isConnected ? "Enter new token to update" : "Your Twilio Auth Token"}
          placeholderTextColor={theme.textMuted}
          style={[s.input, { backgroundColor: theme.bgCard, borderColor: theme.border, color: theme.text }]}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
        />

        {testResult && (
          <View style={[s.banner, testResult.ok ? { backgroundColor: theme.activeBg, borderColor: Colors.brand.teal + "44" } : {}]}>
            <Feather
              name={testResult.ok ? "check-circle" : "alert-circle"}
              size={14}
              color={testResult.ok ? Colors.brand.tealLight : "#FF6B6B"}
            />
            <Text style={[s.bannerText, testResult.ok && { color: Colors.brand.tealLight }]}>
              {testResult.message}
            </Text>
          </View>
        )}

        <Pressable
          style={[s.testBtn, { backgroundColor: theme.activeBg }, (isTesting || !canSaveAccount) && { opacity: 0.5 }]}
          onPress={handleTest}
          disabled={isTesting || !canSaveAccount}
        >
          {isTesting ? (
            <ActivityIndicator size="small" color={Colors.brand.tealLight} />
          ) : (
            <>
              <Feather name="zap" size={14} color={Colors.brand.tealLight} />
              <Text style={s.testBtnText}>Test Connection</Text>
            </>
          )}
        </Pressable>

        {isConnected && (
          <Pressable style={s.disconnectBtn} onPress={handleDisconnectAccount}>
            <Feather name="trash-2" size={14} color="#FF6B6B" />
            <Text style={s.disconnectText}>Disconnect Twilio</Text>
          </Pressable>
        )}
      </>
    );
  }

  function renderStep2() {
    return (
      <>
        <View style={s.sectionHeader}>
          <Text style={[s.sectionTitle, { color: theme.text }]}>Configure Webhooks</Text>
          <Text style={[s.sectionSubtitle, { color: theme.textMuted }]}>
            Copy these URLs into your Twilio phone number settings so MyRentCard can receive calls and messages.
          </Text>
        </View>

        {webhookUrls.map(({ label, url }) => (
          <Pressable
            key={label}
            style={[s.webhookRow, { backgroundColor: theme.bgElevated, borderColor: theme.border }]}
            onPress={() => handleCopy(label, url)}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[s.webhookLabel, { color: theme.textSecondary }]}>{label}</Text>
              <Text style={[s.webhookUrl, { color: theme.textMuted }]} numberOfLines={1} ellipsizeMode="middle">
                {url}
              </Text>
            </View>
            <View style={[s.copyBtn, { backgroundColor: theme.bg, borderColor: theme.border }]}>
              <Feather
                name={copiedLabel === label ? "check" : "copy"}
                size={14}
                color={copiedLabel === label ? Colors.brand.tealLight : theme.textSecondary}
              />
              <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: copiedLabel === label ? Colors.brand.tealLight : theme.textSecondary }}>
                {copiedLabel === label ? "Copied!" : "Copy"}
              </Text>
            </View>
          </Pressable>
        ))}

        <Text style={[s.fieldLabel, { color: theme.textSecondary, marginTop: 20 }]}>Outbound Call Webhook</Text>
        <Text style={[s.hint, { color: theme.textMuted }]}>
          Paste this as the Voice Request URL in your TwiML App.
        </Text>
        <Pressable
          style={[s.webhookRow, { backgroundColor: theme.bgElevated, borderColor: theme.border }]}
          onPress={() => {
            Clipboard.setStringAsync(outboundCallWebhook).then(() => {
              setCopiedVoiceUrl(true);
              setTimeout(() => setCopiedVoiceUrl(false), 1800);
            });
          }}
        >
          <Text style={{ flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.brand.tealLight }} numberOfLines={1} ellipsizeMode="middle">
            {outboundCallWebhook}
          </Text>
          <Feather name={copiedVoiceUrl ? "check" : "copy"} size={14} color={copiedVoiceUrl ? Colors.brand.tealLight : theme.textSecondary} />
        </Pressable>
        {copiedVoiceUrl && <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.brand.tealLight, marginTop: 4 }}>Copied!</Text>}
      </>
    );
  }

  function renderStep3() {
    return (
      <>
        <View style={s.sectionHeader}>
          <Text style={[s.sectionTitle, { color: theme.text }]}>Voice Calling (Optional)</Text>
          <Text style={[s.sectionSubtitle, { color: theme.textMuted }]}>
            Enable in-app calling by entering your Twilio Voice credentials. You can skip this step.
          </Text>
        </View>

        {isVoiceConfigured && currentSettings?.twilioApiKeySid && (
          <View style={[s.maskedRow, { backgroundColor: theme.activeBg }]}>
            <Feather name="key" size={14} color={Colors.brand.tealLight} />
            <Text style={s.maskedText}>API Key: {currentSettings.twilioApiKeySid}</Text>
          </View>
        )}

        <View style={[s.stepBox, { backgroundColor: theme.bgElevated, borderColor: theme.border }]}>
          <Text style={[s.stepBoxTitle, { color: theme.textSecondary }]}>How to set up in-app calling</Text>
          <Text style={[s.stepBoxItem, { color: theme.textMuted }]}>
            1. In Twilio Console, create a Standard API Key. Copy the SID (SK...) and Secret.
          </Text>
          <Text style={[s.stepBoxItem, { color: theme.textMuted }]}>
            2. Create a TwiML App with the outbound webhook URL from Step 2, then copy the App SID (AP...).
          </Text>
          <Text style={[s.stepBoxItem, { color: theme.textMuted }]}>
            3. Enter all three values below and tap Save.
          </Text>
        </View>

        <Text style={[s.fieldLabel, { color: theme.textSecondary }]}>API Key SID (starts with SK)</Text>
        <TextInput
          value={apiKeySid}
          onChangeText={setApiKeySid}
          placeholder="SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          placeholderTextColor={theme.textMuted}
          style={[s.input, { backgroundColor: theme.bgCard, borderColor: theme.border, color: theme.text }]}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={[s.fieldLabel, { color: theme.textSecondary }]}>API Key Secret</Text>
        <TextInput
          value={apiKeySecret}
          onChangeText={setApiKeySecret}
          placeholder={isVoiceConfigured ? "Enter new secret to update" : "Your API Key Secret"}
          placeholderTextColor={theme.textMuted}
          style={[s.input, { backgroundColor: theme.bgCard, borderColor: theme.border, color: theme.text }]}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
        />

        <Text style={[s.fieldLabel, { color: theme.textSecondary }]}>TwiML App SID (starts with AP)</Text>
        <TextInput
          value={twimlAppSid}
          onChangeText={setTwimlAppSid}
          placeholder="APxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          placeholderTextColor={theme.textMuted}
          style={[s.input, { backgroundColor: theme.bgCard, borderColor: theme.border, color: theme.text }]}
          autoCapitalize="none"
          autoCorrect={false}
        />

        {isVoiceConfigured && (
          <Pressable style={s.disconnectBtn} onPress={handleDisconnectVoice}>
            <Feather name="trash-2" size={14} color="#FF6B6B" />
            <Text style={s.disconnectText}>Disconnect Voice</Text>
          </Pressable>
        )}
      </>
    );
  }

  // Footer buttons per step
  function renderFooter() {
    return (
      <View style={[s.footer, { borderTopColor: theme.border }]}>
        {step > 1 ? (
          <Pressable
            style={[s.backBtn, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
            onPress={() => setStep((step - 1) as WizardStep)}
          >
            <Feather name="arrow-left" size={16} color={theme.textSecondary} />
            <Text style={[s.backBtnText, { color: theme.textSecondary }]}>Back</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[s.backBtn, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
            onPress={handleClose}
          >
            <Text style={[s.backBtnText, { color: theme.textSecondary }]}>Cancel</Text>
          </Pressable>
        )}

        {step === 1 && (
          <Pressable
            style={[s.nextBtn, (!canSaveAccount || updateMutation.isPending) && { opacity: 0.5 }]}
            onPress={handleSaveAccountAndContinue}
            disabled={!canSaveAccount || updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={s.nextBtnText}>Save & Continue</Text>
            )}
          </Pressable>
        )}

        {step === 2 && (
          <Pressable
            style={s.nextBtn}
            onPress={() => {
              setCompletedSteps((prev) => new Set([...prev, 2]));
              setStep(3);
            }}
          >
            <Text style={s.nextBtnText}>Continue</Text>
          </Pressable>
        )}

        {step === 3 && (
          <View style={{ flexDirection: "row", gap: 10, flex: 2 }}>
            <Pressable
              style={[s.backBtn, { flex: 1, backgroundColor: theme.bgCard, borderColor: theme.border }]}
              onPress={handleClose}
            >
              <Text style={[s.backBtnText, { color: theme.textSecondary }]}>Skip</Text>
            </Pressable>
            <Pressable
              style={[s.nextBtn, { flex: 1 }, (!canSaveVoice || updateMutation.isPending) && { opacity: 0.5 }]}
              onPress={handleSaveVoice}
              disabled={!canSaveVoice || updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={s.nextBtnText}>Save</Text>
              )}
            </Pressable>
          </View>
        )}
      </View>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType={Platform.OS === "web" ? "fade" : "slide"}
      presentationStyle={Platform.OS === "web" ? "overFullScreen" : "pageSheet"}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={[s.container, { backgroundColor: theme.bg }]}>
          <View style={[s.header, { borderBottomColor: theme.border }]}>
            <Text style={[s.headerTitle, { color: theme.text }]}>Twilio Integration</Text>
            <Pressable onPress={handleClose} hitSlop={8}>
              <Feather name="x" size={22} color={theme.textSecondary} />
            </Pressable>
          </View>

          <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
            <StepIndicator current={step} completed={completedSteps} />
          </View>

          <ScrollView style={{ flex: 1, padding: 20 }} keyboardShouldPersistTaps="handled">
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            <View style={{ height: 20 }} />
          </ScrollView>

          {renderFooter()}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const stepStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  circleText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  label: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  line: {
    height: 2,
    flex: 1,
    marginHorizontal: 8,
    marginBottom: 20,
    borderRadius: 1,
  },
});

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 24,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
  },
  sectionHeader: {
    gap: 6,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  sectionSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  hint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
    marginBottom: 8,
  },
  maskedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
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
  banner: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    backgroundColor: "#2A0D0D",
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#FF6B6B44",
  },
  bannerText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#FF6B6B",
    lineHeight: 18,
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
    alignSelf: "flex-start",
    marginTop: 14,
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
  webhookRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  webhookLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  webhookUrl: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  stepBox: {
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    marginBottom: 8,
  },
  stepBoxTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },
  stepBoxItem: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
  },
  backBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  backBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  nextBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.brand.teal,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  nextBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});
