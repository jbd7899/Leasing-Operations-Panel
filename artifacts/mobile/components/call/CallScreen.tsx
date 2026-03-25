import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  StatusBar,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useTwilioCall } from "@/contexts/TwilioCallContext";
import type { CallState } from "@/contexts/TwilioCallContext";

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function callStateLabel(state: CallState): string {
  switch (state) {
    case "connecting": return "Connecting…";
    case "ringing": return "Ringing…";
    case "connected": return "In Call";
    case "disconnecting": return "Ending Call…";
    default: return "";
  }
}

export function CallScreen() {
  const { activeCall, hangUp, toggleMute, toggleSpeaker } = useTwilioCall();

  useEffect(() => {
    if (activeCall?.state === "connected") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [activeCall?.state]);

  if (!activeCall) return null;

  const isConnected = activeCall.state === "connected";
  const isConnecting = activeCall.state === "connecting" || activeCall.state === "ringing";

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
    >
      <StatusBar barStyle="light-content" backgroundColor={styles.container.backgroundColor} />
      <View style={styles.container}>
        <View style={styles.topSection}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {activeCall.prospectName
                .split(" ")
                .map((w) => w[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </Text>
          </View>

          <Text style={styles.name}>{activeCall.prospectName}</Text>
          <Text style={styles.phone}>{activeCall.prospectPhone}</Text>

          <View style={styles.statusRow}>
            {isConnecting && (
              <View style={styles.statusDot} />
            )}
            <Text style={styles.statusText}>{callStateLabel(activeCall.state)}</Text>
          </View>

          {isConnected && (
            <Text style={styles.timer}>{formatElapsed(activeCall.elapsedSeconds)}</Text>
          )}
        </View>

        <View style={styles.controlsSection}>
          <View style={styles.controlRow}>
            <Pressable
              style={[styles.controlBtn, activeCall.isMuted && styles.controlBtnActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                toggleMute();
              }}
              disabled={!isConnected}
            >
              <Feather
                name={activeCall.isMuted ? "mic-off" : "mic"}
                size={24}
                color={activeCall.isMuted ? Colors.dark.bg : Colors.dark.text}
              />
              <Text style={[styles.controlLabel, activeCall.isMuted && styles.controlLabelActive]}>
                {activeCall.isMuted ? "Unmute" : "Mute"}
              </Text>
            </Pressable>

            <Pressable
              style={[styles.controlBtn, activeCall.isSpeakerOn && styles.controlBtnActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                toggleSpeaker();
              }}
              disabled={!isConnected}
            >
              <Feather
                name="volume-2"
                size={24}
                color={activeCall.isSpeakerOn ? Colors.dark.bg : Colors.dark.text}
              />
              <Text style={[styles.controlLabel, activeCall.isSpeakerOn && styles.controlLabelActive]}>
                Speaker
              </Text>
            </Pressable>
          </View>

          <Pressable
            style={styles.hangupBtn}
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              hangUp();
            }}
          >
            <Feather name="phone-off" size={28} color="#fff" />
          </Pressable>

          {isConnected && (
            <Text style={styles.transcriptHint}>
              Call is being recorded. A transcript will be available after the call ends.
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#071A1A",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 80,
    paddingBottom: 60,
    paddingHorizontal: 32,
  },
  topSection: {
    alignItems: "center",
    gap: 12,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#0D2A2A",
    borderWidth: 2,
    borderColor: Colors.brand.teal,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  avatarText: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    color: Colors.brand.tealLight,
  },
  name: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.dark.text,
    textAlign: "center",
  },
  phone: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textMuted,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.brand.tealLight,
    opacity: 0.8,
  },
  statusText: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: Colors.brand.tealLight,
  },
  timer: {
    fontSize: 32,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.text,
    letterSpacing: 2,
    marginTop: 8,
  },
  controlsSection: {
    alignItems: "center",
    gap: 40,
    width: "100%",
  },
  controlRow: {
    flexDirection: "row",
    gap: 32,
    justifyContent: "center",
  },
  controlBtn: {
    alignItems: "center",
    gap: 8,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#0D2A2A",
    borderWidth: 1,
    borderColor: "#164444",
    justifyContent: "center",
  },
  controlBtnActive: {
    backgroundColor: Colors.brand.tealLight,
    borderColor: Colors.brand.tealLight,
  },
  controlLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.textMuted,
    position: "absolute",
    bottom: -22,
    width: 80,
    textAlign: "center",
  },
  controlLabelActive: {
    color: Colors.brand.tealLight,
  },
  hangupBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#D9534F",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#D9534F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  transcriptHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textMuted,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 16,
  },
});
