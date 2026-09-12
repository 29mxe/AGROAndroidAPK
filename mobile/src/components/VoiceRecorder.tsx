import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { Mic, Square, Trash2 } from "lucide-react-native";
import { colors } from "@/lib/theme";
import { formatSeconds, lightTap } from "@/lib/utils";
import { AudioPlayer } from "./AudioPlayer";

export type RecordedAudio = { uri: string; duration: number };

interface Props {
  value: RecordedAudio | null;
  onChange: (audio: RecordedAudio | null) => void;
}

export function VoiceRecorder({ value, onChange }: Props) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder, 500);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pulse = useSharedValue(1);
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  const start = async () => {
    setError(null);
    setBusy(true);
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        setError("Нет доступа к микрофону. Разрешите доступ в настройках.");
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      pulse.value = withRepeat(withTiming(0.35, { duration: 600 }), -1, true);
      lightTap();
    } catch {
      setError("Не удалось начать запись. Попробуйте в мобильном приложении.");
    } finally {
      setBusy(false);
    }
  };

  const stop = async () => {
    setBusy(true);
    try {
      const durationSec = Math.max(1, Math.round((state.durationMillis ?? 0) / 1000));
      await recorder.stop();
      pulse.value = withTiming(1);
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      if (recorder.uri) {
        onChange({ uri: recorder.uri, duration: durationSec });
        lightTap();
      } else {
        setError("Запись не сохранилась, попробуйте ещё раз.");
      }
    } catch {
      setError("Не удалось остановить запись.");
    } finally {
      setBusy(false);
    }
  };

  // Recorded — show preview with delete
  if (value) {
    return (
      <View className="flex-row items-center gap-2">
        <View className="flex-1">
          <AudioPlayer uri={value.uri} duration={value.duration} compact />
        </View>
        <Pressable
          testID="voice-delete-button"
          onPress={() => {
            lightTap();
            onChange(null);
          }}
          className="h-10 w-10 items-center justify-center rounded-full bg-clay/10 active:opacity-70"
        >
          <Trash2 size={17} color={colors.clay} />
        </Pressable>
      </View>
    );
  }

  if (state.isRecording) {
    return (
      <View className="flex-row items-center gap-3 rounded-2xl border border-clay/40 bg-clay/10 px-3 py-2">
        <Animated.View
          style={[pulseStyle, { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.clay }]}
        />
        <Text className="flex-1 font-gmedium text-clay">
          Идёт запись · {formatSeconds((state.durationMillis ?? 0) / 1000)}
        </Text>
        <Pressable
          testID="voice-stop-button"
          onPress={stop}
          disabled={busy}
          className="h-10 w-10 items-center justify-center rounded-full bg-clay active:opacity-80"
        >
          <Square size={14} color={colors.parchment} fill={colors.parchment} />
        </Pressable>
      </View>
    );
  }

  return (
    <View className="gap-1.5">
      <Pressable
        testID="voice-record-button"
        onPress={start}
        disabled={busy}
        className="flex-row items-center justify-center gap-2 rounded-2xl border border-dashed border-moss/50 bg-moss/5 px-3 py-3 active:bg-moss/10"
      >
        <Mic size={17} color={colors.moss} />
        <Text className="font-gmedium text-moss">Записать голосовое сообщение</Text>
      </Pressable>
      {error ? <Text className="text-xs text-clay">{error}</Text> : null}
    </View>
  );
}
