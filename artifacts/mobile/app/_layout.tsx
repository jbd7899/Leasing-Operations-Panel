import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useSignIn } from "@clerk/clerk-expo";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { initApiClient } from "@/lib/api";
import { AuthProvider, useAuth } from "@/lib/auth";
import Colors from "@/constants/colors";
import { TwilioCallProvider } from "@/contexts/TwilioCallContext";
import { CallScreen } from "@/components/call/CallScreen";

SplashScreen.preventAutoHideAsync();

initApiClient();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

function LoadingScreen() {
  return (
    <View style={loginStyles.loadingWrap}>
      <ActivityIndicator size="large" color={Colors.brand.tealLight} />
    </View>
  );
}

function LoginScreen() {
  const { signIn, setActive: setSignInActive, isLoaded: signInLoaded } = useSignIn();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSendCode = async () => {
    if (!signInLoaded) return;
    setIsLoading(true);
    setErrorMsg("");
    try {
      await signIn!.create({ identifier: email, strategy: "email_code" });
      setStep("code");
    } catch (err: unknown) {
      const e = err as { errors?: { longMessage?: string }[] };
      setErrorMsg(e.errors?.[0]?.longMessage ?? "Something went wrong. Check your email address.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      const result = await signIn!.attemptFirstFactor({ strategy: "email_code", code: code.trim() });
      if (result.status === "complete") {
        await setSignInActive!({ session: result.createdSessionId });
      } else {
        setErrorMsg("Verification incomplete. Please try again.");
      }
    } catch (err: unknown) {
      const e = err as { errors?: { longMessage?: string }[] };
      setErrorMsg(e.errors?.[0]?.longMessage ?? "Invalid code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={loginStyles.container}>
      <View style={loginStyles.logoRow}>
        <View style={loginStyles.logoMark}>
          <Text style={loginStyles.logoMarkText}>MRC</Text>
        </View>
      </View>
      <Text style={loginStyles.brand}>MyRentCard</Text>
      <Text style={loginStyles.tagline}>Leasing Operations Panel</Text>

      <View style={loginStyles.card}>
        <Text style={loginStyles.cardTitle}>Sign in to continue</Text>

        {step === "email" ? (
          <>
            <TextInput
              style={loginStyles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="your@email.com"
              placeholderTextColor={Colors.dark.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
            <Pressable
              style={[loginStyles.loginBtn, (isLoading || !email) && loginStyles.loginBtnDisabled]}
              onPress={handleSendCode}
              disabled={isLoading || !email}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={loginStyles.loginBtnText}>Send verification code</Text>
              )}
            </Pressable>
          </>
        ) : (
          <>
            <Text style={loginStyles.cardSubtitle}>
              Enter the 6-digit code sent to {email}
            </Text>
            <TextInput
              style={[loginStyles.input, loginStyles.codeInput]}
              value={code}
              onChangeText={setCode}
              placeholder="000000"
              placeholderTextColor={Colors.dark.textMuted}
              keyboardType="number-pad"
              maxLength={6}
              editable={!isLoading}
            />
            <Pressable
              style={[loginStyles.loginBtn, (isLoading || code.length < 6) && loginStyles.loginBtnDisabled]}
              onPress={handleVerifyCode}
              disabled={isLoading || code.length < 6}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={loginStyles.loginBtnText}>Verify code</Text>
              )}
            </Pressable>
            <Pressable
              style={loginStyles.backBtn}
              onPress={() => { setStep("email"); setCode(""); setErrorMsg(""); }}
              disabled={isLoading}
            >
              <Text style={loginStyles.backBtnText}>← Use a different email</Text>
            </Pressable>
          </>
        )}

        {errorMsg ? <Text style={loginStyles.errorText}>{errorMsg}</Text> : null}
      </View>

      <Text style={loginStyles.footer}>MyRentCard · Secured by Clerk</Text>
    </View>
  );
}

function RootLayoutNav() {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <LoginScreen />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="prospect/[id]"
        options={{
          headerShown: true,
          headerTitle: "Prospect",
          headerBackTitle: "Back",
          headerStyle: { backgroundColor: "#080E1C" },
          headerTintColor: "#14A0A0",
          headerTitleStyle: { fontFamily: "Inter_600SemiBold", color: "#F1F5F9" },
          presentation: "card",
        }}
      />
      <Stack.Screen
        name="interaction/[id]"
        options={{
          headerShown: true,
          headerTitle: "Interaction",
          headerBackTitle: "Back",
          headerStyle: { backgroundColor: "#080E1C" },
          headerTintColor: "#14A0A0",
          headerTitleStyle: { fontFamily: "Inter_600SemiBold", color: "#F1F5F9" },
          presentation: "card",
        }}
      />
      <Stack.Screen
        name="export-modal"
        options={{
          presentation: "formSheet",
          sheetAllowedDetents: [0.5],
          sheetGrabberVisible: true,
          headerShown: false,
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <AuthProvider>
                <TwilioCallProvider>
                  <RootLayoutNav />
                  <CallScreen />
                </TwilioCallProvider>
              </AuthProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const loginStyles = StyleSheet.create({
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.dark.bg,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.dark.bg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 0,
  },
  logoRow: {
    marginBottom: 16,
  },
  logoMark: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: "#0D2A2A",
    borderWidth: 2,
    borderColor: Colors.brand.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  logoMarkText: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.brand.tealLight,
  },
  brand: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.dark.text,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary,
    marginBottom: 40,
  },
  card: {
    width: "100%",
    backgroundColor: Colors.dark.bgCard,
    borderRadius: 20,
    padding: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.text,
    textAlign: "center",
  },
  cardSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  input: {
    backgroundColor: Colors.dark.bgElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.text,
  },
  codeInput: {
    textAlign: "center",
    letterSpacing: 8,
    fontSize: 22,
    fontFamily: "Inter_600SemiBold",
  },
  loginBtn: {
    backgroundColor: Colors.brand.teal,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    minHeight: 52,
  },
  loginBtnDisabled: {
    opacity: 0.5,
  },
  loginBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  backBtn: {
    alignItems: "center",
    paddingVertical: 6,
  },
  backBtnText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textMuted,
  },
  errorText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#F87171",
    textAlign: "center",
  },
  footer: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textMuted,
    marginTop: 40,
  },
});
