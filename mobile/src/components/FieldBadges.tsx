import React from "react";
import { Text, View } from "react-native";
import { CircleCheck, TriangleAlert } from "lucide-react-native";
import { colors } from "@/lib/theme";
import { fieldStatusInfo, type CropInfo, type FieldStatus, type StatusTone } from "@/lib/field-meta";

// Attention (yellow) tone is not part of the tailwind palette — inline styles keep config untouched.
const attention = { bg: "#F6E7B4", text: "#7A5A0F" };

const toneStyles: Record<StatusTone, { bg: string; text: string }> = {
  green: { bg: "rgba(143,174,107,0.28)", text: colors.forest },
  yellow: attention,
  red: { bg: "rgba(188,91,51,0.16)", text: colors.clay },
  neutral: { bg: colors.wheat, text: colors.bark },
};

interface AdviceBadgeProps {
  resolved: boolean;
  size?: "sm" | "md";
  testID?: string;
}

/** ⚠ Нужен совет / ✅ Решено — the most important signal on a field observation card. */
export function AdviceBadge({ resolved, size = "md", testID }: AdviceBadgeProps) {
  const Icon = resolved ? CircleCheck : TriangleAlert;
  const bg = resolved ? colors.forest : colors.clay;
  const iconSize = size === "md" ? 16 : 13;
  return (
    <View
      testID={testID}
      className="flex-row items-center gap-1.5 rounded-lg"
      style={{
        backgroundColor: bg,
        paddingHorizontal: size === "md" ? 10 : 8,
        paddingVertical: size === "md" ? 6 : 4,
      }}
    >
      <Icon size={iconSize} color={colors.parchment} strokeWidth={2.6} />
      <Text
        className="font-gsemibold text-parchment"
        style={{ fontSize: size === "md" ? 14 : 12 }}
      >
        {resolved ? "Решено" : "Нужен совет"}
      </Text>
    </View>
  );
}

interface StatusBadgeProps {
  status: FieldStatus;
  size?: "sm" | "md";
  testID?: string;
}

/** 🌾 Посев · 🌱 Всходы · 🌼 Цветение · ⚠ Проблема · 🚜 Урожай */
export function StatusBadge({ status, size = "md", testID }: StatusBadgeProps) {
  const info = fieldStatusInfo[status];
  const tone = toneStyles[info.tone];
  return (
    <View
      testID={testID}
      className="flex-row items-center gap-1 rounded-lg"
      style={{
        backgroundColor: tone.bg,
        paddingHorizontal: size === "md" ? 9 : 7,
        paddingVertical: size === "md" ? 5 : 3,
      }}
    >
      <Text style={{ fontSize: size === "md" ? 13 : 11 }}>{info.emoji}</Text>
      <Text
        className="font-gsemibold"
        style={{ color: tone.text, fontSize: size === "md" ? 13 : 11 }}
      >
        {info.label}
      </Text>
    </View>
  );
}

interface CropBadgeProps {
  crop: CropInfo;
  size?: "sm" | "md";
  testID?: string;
}

export function CropBadge({ crop, size = "md", testID }: CropBadgeProps) {
  return (
    <View
      testID={testID}
      className="flex-row items-center gap-1 rounded-lg bg-wheat/70"
      style={{
        paddingHorizontal: size === "md" ? 9 : 7,
        paddingVertical: size === "md" ? 5 : 3,
      }}
    >
      <Text style={{ fontSize: size === "md" ? 13 : 11 }}>{crop.emoji}</Text>
      <Text
        className="font-gsemibold text-bark"
        style={{ fontSize: size === "md" ? 13 : 11 }}
      >
        {crop.label}
      </Text>
    </View>
  );
}

/** Marks locally generated demo observations so they are never mistaken for real reports. */
export function DemoBadge() {
  return (
    <View className="rounded-lg border border-dashed border-stone/60 px-2 py-1">
      <Text className="font-gmedium text-xs text-stone">Пример</Text>
    </View>
  );
}
