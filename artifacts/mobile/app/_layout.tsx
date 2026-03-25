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
import React, { useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ImageBackground,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

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
  const { login, isLoading } = useAuth();
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
        <Text style={loginStyles.cardSubtitle}>
          Use your Replit account to access the leasing panel.
        </Text>

        <Pressable
          style={[loginStyles.loginBtn, isLoading && loginStyles.loginBtnDisabled]}
          onPress={login}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={loginStyles.loginBtnText}>Sign in with Replit</Text>
          )}
        </Pressable>
      </View>

      <Text style={loginStyles.footer}>MyRentCard · Powered by Replit</Text>
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
  loginBtn: {
    backgroundColor: Colors.brand.teal,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    minHeight: 52,
  },
  loginBtnDisabled: {
    opacity: 0.6,
  },
  loginBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  footer: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textMuted,
    marginTop: 40,
  },
});
