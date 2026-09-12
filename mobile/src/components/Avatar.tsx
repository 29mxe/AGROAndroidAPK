import React from "react";
import { Text, View } from "react-native";
import { Image } from "expo-image";
import { colors } from "@/lib/theme";

const bgPalette = [colors.moss, colors.soil, colors.forest, colors.clay, colors.leaf];

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  return (first + second).toUpperCase() || "?";
}

function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return Math.abs(h);
}

interface AvatarProps {
  name: string;
  uri?: string | null;
  size?: number;
  testID?: string;
}

export function Avatar({ name, uri, size = 44, testID }: AvatarProps) {
  const radius = size / 2;

  if (uri) {
    return (
      <Image
        testID={testID}
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: radius, backgroundColor: colors.wheat }}
        contentFit="cover"
        transition={150}
      />
    );
  }

  const bg = bgPalette[hashName(name || "?") % bgPalette.length];
  return (
    <View
      testID={testID}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          color: colors.parchment,
          fontSize: size * 0.38,
          fontFamily: "GolosText_600SemiBold",
        }}
      >
        {initialsOf(name)}
      </Text>
    </View>
  );
}
