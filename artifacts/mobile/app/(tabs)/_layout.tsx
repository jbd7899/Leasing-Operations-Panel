import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs, usePathname, router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React, { useState, useEffect } from "react";
import { Platform, StyleSheet, View, Text, Pressable, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { api } from "@/lib/api";

const WEB_SIDEBAR_BREAKPOINT = 768;

const BASE_NAV_ITEMS = [
  {
    name: "index",
    label: "Inbox",
    icon: "inbox" as const,
    sfDefault: "tray",
    sfSelected: "tray.fill",
  },
  {
    name: "prospects",
    label: "Prospects",
    icon: "users" as const,
    sfDefault: "person.2",
    sfSelected: "person.2.fill",
  },
  {
    name: "exports",
    label: "Exports",
    icon: "upload" as const,
    sfDefault: "arrow.up.doc",
    sfSelected: "arrow.up.doc.fill",
  },
  {
    name: "analytics",
    label: "Analytics",
    icon: "bar-chart-2" as const,
    sfDefault: "chart.bar",
    sfSelected: "chart.bar.fill",
  },
  {
    name: "settings",
    label: "Settings",
    icon: "settings" as const,
    sfDefault: "gearshape",
    sfSelected: "gearshape.fill",
  },
];

const FOUNDER_NAV_ITEM = {
  name: "founder",
  label: "Founder",
  icon: "activity" as const,
  sfDefault: "waveform.path",
  sfSelected: "waveform.path",
};

const ALL_TAB_NAMES = [...BASE_NAV_ITEMS.map((i) => i.name), "founder"];

function useIsOwner(): boolean {
  const [isOwner, setIsOwner] = useState(false);
  useEffect(() => {
    api.get<{ role: string }>("/users/me/role").then((data) => {
      setIsOwner(data?.role === "owner");
    }).catch(() => setIsOwner(false));
  }, []);
  return isOwner;
}

function WebSidebarLayout() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isOwner = useIsOwner();

  const isWide = width >= WEB_SIDEBAR_BREAKPOINT;
  const navItems = isOwner ? [...BASE_NAV_ITEMS, FOUNDER_NAV_ITEM] : BASE_NAV_ITEMS;

  if (!isWide) {
    return <ClassicTabLayout />;
  }

  const activeTab = navItems.find((item) => {
    if (item.name === "index") return pathname === "/" || pathname === "/index" || pathname === "/(tabs)" || pathname === "/(tabs)/index";
    return pathname.includes(item.name);
  });
  const activeKey = activeTab?.name ?? "index";

  return (
    <View style={sidebarStyles.root}>
      <View style={[sidebarStyles.sidebar, { paddingTop: Math.max(insets.top, 20) }]}>
        <View style={sidebarStyles.logoRow}>
          <View style={sidebarStyles.logoDot} />
          <Text style={sidebarStyles.logoText}>MyRentCard</Text>
        </View>

        <View style={sidebarStyles.navList}>
          {navItems.map((item) => {
            const isActive = activeKey === item.name;
            return (
              <Pressable
                key={item.name}
                style={[sidebarStyles.navItem, isActive && sidebarStyles.navItemActive]}
                onPress={() => {
                  if (item.name === "index") {
                    router.push("/(tabs)");
                  } else {
                    router.push(`/(tabs)/${item.name}` as Parameters<typeof router.push>[0]);
                  }
                }}
              >
                <Feather
                  name={item.icon}
                  size={18}
                  color={isActive ? Colors.brand.tealLight : Colors.dark.textSecondary}
                />
                <Text
                  style={[
                    sidebarStyles.navLabel,
                    isActive && sidebarStyles.navLabelActive,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={sidebarStyles.content}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: { display: "none" },
          }}
        >
          {ALL_TAB_NAMES.map((name) => (
            <Tabs.Screen key={name} name={name} />
          ))}
        </Tabs>
      </View>
    </View>
  );
}

function NativeTabLayout() {
  const isOwner = useIsOwner();
  const { NativeTabs, Icon, Label } = require("expo-router/unstable-native-tabs");
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "tray", selected: "tray.fill" }} />
        <Label>Inbox</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="prospects">
        <Icon sf={{ default: "person.2", selected: "person.2.fill" }} />
        <Label>Prospects</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="exports">
        <Icon sf={{ default: "arrow.up.doc", selected: "arrow.up.doc.fill" }} />
        <Label>Exports</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="analytics">
        <Icon sf={{ default: "chart.bar", selected: "chart.bar.fill" }} />
        <Label>Analytics</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <Icon sf={{ default: "gearshape", selected: "gearshape.fill" }} />
        <Label>Settings</Label>
      </NativeTabs.Trigger>
      {isOwner && (
        <NativeTabs.Trigger name="founder">
          <Icon sf={{ default: "waveform.path", selected: "waveform.path" }} />
          <Label>Founder</Label>
        </NativeTabs.Trigger>
      )}
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const safeAreaInsets = useSafeAreaInsets();
  const isOwner = useIsOwner();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.brand.tealLight,
        tabBarInactiveTintColor: Colors.dark.tabIconDefault,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : Colors.dark.bgCard,
          borderTopWidth: 1,
          borderTopColor: Colors.dark.border,
          elevation: 0,
          paddingBottom: safeAreaInsets.bottom,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={80}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.dark.bgCard }]} />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Inbox",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="tray" tintColor={color} size={22} />
            ) : (
              <Feather name="inbox" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="prospects"
        options={{
          title: "Prospects",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="person.2" tintColor={color} size={22} />
            ) : (
              <Feather name="users" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="exports"
        options={{
          title: "Exports",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="arrow.up.doc" tintColor={color} size={22} />
            ) : (
              <Feather name="upload" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: "Analytics",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="chart.bar" tintColor={color} size={22} />
            ) : (
              <Feather name="bar-chart-2" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="gearshape" tintColor={color} size={22} />
            ) : (
              <Feather name="settings" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="founder"
        options={{
          title: "Founder",
          href: isOwner ? undefined : null,
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="waveform.path" tintColor={color} size={22} />
            ) : (
              <Feather name="activity" size={22} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (Platform.OS === "web") {
    return <WebSidebarLayout />;
  }
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}

const sidebarStyles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: Colors.dark.bg,
  },
  sidebar: {
    width: 220,
    backgroundColor: Colors.dark.bgCard,
    borderRightWidth: 1,
    borderRightColor: Colors.dark.border,
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 8,
    paddingBottom: 28,
    paddingTop: 4,
  },
  logoDot: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.brand.teal,
  },
  logoText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.dark.text,
    letterSpacing: -0.3,
  },
  navList: {
    gap: 2,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  navItemActive: {
    backgroundColor: "#0D2A2A",
  },
  navLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.dark.textSecondary,
  },
  navLabelActive: {
    color: Colors.brand.tealLight,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    overflow: "hidden",
  },
});
