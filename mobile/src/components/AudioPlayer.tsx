import React from "react";
import { Pressable, Text, View } from "react-native";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { AudioLines, Pause, Play } from "lucide-react-native";
import { colors } from "@/lib/theme";
import { formatSeconds, lightTap } from "@/lib/utils";

interface Props {
  uri: string;
  /** known duration in seconds (from the post), fallback while metadata loads */
  duration?: number | null;
  compact?: boolean;
  testID?: string;
}

export function AudioPlayer({ uri, duration, compact, testID }: Props) {
  const player = useAudioPlayer({ uri });
  const status = useAudioPlayerStatus(player);

  const total = status.duration > 0 ? status.duration : (duration ?? 0);
  const progress = total > 0 ? Math.min(1, status.currentTime / total) : 0;
  const finished = total > 0 && status.currentTime >= total - 0.05 && !status.playing;

  const toggle = () => {
    lightTap();
    if (status.playing) {
      player.pause();
      return;
    }
    if (finished) {
      player.seekTo(0);
    }
    player.play();
  };

  return (
    <View
      testID={testID}
      className="flex-row items-center gap-3 rounded-2xl bg-forest/5 border border-wheat px-3"
      style={{ paddingVertical: compact ? 8 : 10 }}
    >
      <Pressable
        testID="audio-play-button"
        onPress={toggle}
        className="items-center justify-center rounded-full bg-forest active:opacity-80"
        style={{ width: compact ? 34 : 40, height: compact ? 34 : 40 }}
      >
        {status.playing ? (
          <Pause size={compact ? 15 : 18} color={colors.parchment} fill={colors.parchment} />
        ) : (
          <Play
            size={compact ? 15 : 18}
            color={colors.parchment}
            fill={colors.parchment}
            style={{ marginLeft: 2 }}
          />
        )}
      </Pressable>

      <View className="flex-1 gap-1.5">
        <View className="flex-row items-center gap-1.5">
          <AudioLines size={13} color={colors.moss} />
          <Text className="text-xs font-gmedium text-moss">Голосовое сообщение</Text>
        </View>
        <View className="h-1.5 overflow-hidden rounded-full bg-wheat">
          <View
            className="h-full rounded-full bg-moss"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </View>
      </View>

      <Text className="text-xs font-gmedium text-stone" style={{ minWidth: 34, textAlign: "right" }}>
        {status.playing || status.currentTime > 0
          ? formatSeconds(status.currentTime)
          : formatSeconds(total)}
      </Text>
    </View>
  );
}
