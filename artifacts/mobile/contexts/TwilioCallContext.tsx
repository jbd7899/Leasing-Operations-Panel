import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { Alert, Platform } from "react-native";
import { api } from "@/lib/api";

export type CallState = "idle" | "connecting" | "ringing" | "connected" | "disconnecting";

export interface ActiveCall {
  prospectName: string;
  prospectPhone: string;
  callerNumber: string | null;
  state: CallState;
  isMuted: boolean;
  isSpeakerOn: boolean;
  elapsedSeconds: number;
}

interface TwilioCallContextValue {
  activeCall: ActiveCall | null;
  startCall: (prospectName: string, prospectPhone: string, callerNumber?: string | null) => Promise<void>;
  hangUp: () => void;
  toggleMute: () => void;
  toggleSpeaker: () => void;
  dismissCall: () => void;
}

const TwilioCallContext = createContext<TwilioCallContextValue | null>(null);

async function fetchVoiceToken(): Promise<string> {
  const result = await api.post<{ token: string }>("/voice/token", {});
  return result.token;
}

function getVoiceSdk() {
  try {
    const sdk = require("@twilio/voice-react-native-sdk");
    return sdk;
  } catch {
    return null;
  }
}

function isTokenExpiredError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("AccessToken expired") ||
    msg.includes("JWT expired") ||
    msg.includes("token expired") ||
    msg.includes("20101") ||
    msg.includes("20104")
  );
}

export function TwilioCallProvider({ children }: { children: ReactNode }) {
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const callRef = useRef<unknown>(null);
  const voiceRef = useRef<unknown>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tokenRef = useRef<string | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    timerRef.current = setInterval(() => {
      setActiveCall((prev) =>
        prev ? { ...prev, elapsedSeconds: prev.elapsedSeconds + 1 } : null,
      );
    }, 1000);
  }, [clearTimer]);

  const resetState = useCallback(() => {
    clearTimer();
    callRef.current = null;
    setActiveCall(null);
  }, [clearTimer]);

  const hangUp = useCallback(() => {
    if (callRef.current) {
      try {
        const call = callRef.current as { disconnect?: () => void };
        if (call.disconnect) {
          call.disconnect();
        }
      } catch (err) {
        console.warn("[TwilioCall] hangUp error:", err);
      }
    }
    resetState();
  }, [resetState]);

  const toggleMute = useCallback(() => {
    if (!activeCall || !callRef.current) return;
    try {
      const call = callRef.current as {
        mute?: (muted: boolean) => void;
      };
      const newMuted = !activeCall.isMuted;
      if (call.mute) {
        call.mute(newMuted);
      }
      setActiveCall((prev) => prev ? { ...prev, isMuted: newMuted } : null);
    } catch (err) {
      console.warn("[TwilioCall] toggleMute error:", err);
    }
  }, [activeCall]);

  const toggleSpeaker = useCallback(() => {
    if (!activeCall) return;
    const newSpeaker = !activeCall.isSpeakerOn;

    try {
      const sdk = getVoiceSdk();
      if (sdk && Platform.OS !== "web") {
        const { AudioDevice } = sdk;
        if (AudioDevice) {
          const voice = voiceRef.current as {
            getAudioDevices?: () => Promise<{ audioDevices: Array<{ type: string; select: () => Promise<void> }> }>;
          } | null;
          if (voice && voice.getAudioDevices) {
            voice.getAudioDevices().then(({ audioDevices }) => {
              const speakerDevice = audioDevices.find(
                (d) => d.type === (newSpeaker ? "speaker" : "earpiece"),
              );
              if (speakerDevice) {
                speakerDevice.select().catch((err: unknown) => {
                  console.warn("[TwilioCall] speaker select error:", err);
                });
              } else {
                console.warn("[TwilioCall] No audio device found for type:", newSpeaker ? "speaker" : "earpiece");
              }
            }).catch((err: unknown) => {
              console.warn("[TwilioCall] getAudioDevices error:", err);
            });
          }
        }
      }
    } catch (err) {
      console.warn("[TwilioCall] toggleSpeaker error:", err);
    }

    setActiveCall((prev) => prev ? { ...prev, isSpeakerOn: newSpeaker } : null);
  }, [activeCall]);

  const dismissCall = useCallback(() => {
    resetState();
  }, [resetState]);

  const connectWithToken = useCallback(
    async (
      token: string,
      prospectPhone: string,
      callerNumber: string | null,
      voice: { connect: (token: string, options: { params: Record<string, string> }) => Promise<unknown> },
    ) => {
      const connectParams: Record<string, string> = { To: prospectPhone };
      if (callerNumber) {
        connectParams.CallerId = callerNumber;
      }
      return voice.connect(token, { params: connectParams });
    },
    [],
  );

  const startCall = useCallback(
    async (prospectName: string, prospectPhone: string, callerNumber?: string | null) => {
      if (activeCall) {
        Alert.alert("Call in Progress", "Please end the current call before starting a new one.");
        return;
      }

      const sdk = getVoiceSdk();
      if (!sdk || Platform.OS === "web") {
        Alert.alert(
          "In-App Calling Unavailable",
          "In-app calling requires a native device build. Your call will be recorded and transcribed once Twilio processes it.",
        );
        return;
      }

      setActiveCall({
        prospectName,
        prospectPhone,
        callerNumber: callerNumber ?? null,
        state: "connecting",
        isMuted: false,
        isSpeakerOn: false,
        elapsedSeconds: 0,
      });

      try {
        let token = tokenRef.current;
        if (!token) {
          token = await fetchVoiceToken();
          tokenRef.current = token;
        }

        if (!voiceRef.current) {
          const { Voice } = sdk;
          voiceRef.current = new Voice();
        }

        const voice = voiceRef.current as {
          connect: (token: string, options: { params: Record<string, string> }) => Promise<unknown>;
        };

        let call: unknown;
        try {
          call = await connectWithToken(token, prospectPhone, callerNumber ?? null, voice);
        } catch (connectErr) {
          if (isTokenExpiredError(connectErr)) {
            console.log("[TwilioCall] Token expired, refreshing…");
            tokenRef.current = null;
            token = await fetchVoiceToken();
            tokenRef.current = token;
            call = await connectWithToken(token, prospectPhone, callerNumber ?? null, voice);
          } else {
            throw connectErr;
          }
        }

        callRef.current = call;

        const typedCall = call as {
          on: (event: string, cb: (...args: unknown[]) => void) => void;
          removeAllListeners?: () => void;
        };

        typedCall.on("ringing", () => {
          setActiveCall((prev) => prev ? { ...prev, state: "ringing" } : null);
        });

        typedCall.on("connected", () => {
          setActiveCall((prev) => prev ? { ...prev, state: "connected" } : null);
          startTimer();
        });

        typedCall.on("disconnected", () => {
          resetState();
        });

        typedCall.on("cancelled", () => {
          resetState();
        });

        typedCall.on("rejected", () => {
          setActiveCall(null);
          clearTimer();
          callRef.current = null;
          Alert.alert("Call Rejected", "The call was rejected by the recipient.");
        });

      } catch (err) {
        console.warn("[TwilioCall] startCall error:", err);
        resetState();
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("API Key") || msg.includes("token") || msg.includes("configured")) {
          Alert.alert(
            "Calling Not Available",
            "In-app calling requires Twilio API Key configuration. Contact your administrator.",
          );
        } else {
          Alert.alert("Call Failed", `Could not connect: ${msg}`);
        }
      }
    },
    [activeCall, startTimer, resetState, clearTimer, connectWithToken],
  );

  useEffect(() => {
    return () => {
      clearTimer();
      if (callRef.current) {
        try {
          const call = callRef.current as { disconnect?: () => void };
          if (call.disconnect) call.disconnect();
        } catch (err) {
          console.warn("[TwilioCall] cleanup disconnect error:", err);
        }
      }
    };
  }, [clearTimer]);

  return (
    <TwilioCallContext.Provider
      value={{ activeCall, startCall, hangUp, toggleMute, toggleSpeaker, dismissCall }}
    >
      {children}
    </TwilioCallContext.Provider>
  );
}

export function useTwilioCall(): TwilioCallContextValue {
  const ctx = useContext(TwilioCallContext);
  if (!ctx) {
    throw new Error("useTwilioCall must be used inside TwilioCallProvider");
  }
  return ctx;
}
