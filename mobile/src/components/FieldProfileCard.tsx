import React from "react";
import { Text, View } from "react-native";
import { Award, MapPin, Sprout, Tractor } from "lucide-react-native";
import { colors } from "@/lib/theme";
import type { UserProfile } from "@/lib/types";
import { specializationLabel } from "@/lib/types";
import type { CropInfo } from "@/lib/field-meta";
import type { ExperimentGroup } from "@/lib/field-store";

export type CommunityLevel = "Новичок" | "Активный участник" | "Полевой эксперт";

const LEVEL_THRESHOLDS: { level: CommunityLevel; min: number }[] = [
  { level: "Новичок", min: 0 },
  { level: "Активный участник", min: 6 },
  { level: "Полевой эксперт", min: 20 },
];

/** Visual-only community level computed from existing activity (no server involvement). */
export const communityLevel = (
  observations: number,
  usefulMarks: number,
  resolvedCases: number
): { level: CommunityLevel; score: number; next: number | null } => {
  const score = observations * 2 + usefulMarks + resolvedCases * 3;
  let current = LEVEL_THRESHOLDS[0]!;
  let next: number | null = null;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    const t = LEVEL_THRESHOLDS[i]!;
    if (score >= t.min) {
      current = t;
      next = LEVEL_THRESHOLDS[i + 1]?.min ?? null;
    }
  }
  return { level: current.level, score, next };
};

interface Props {
  profile: UserProfile;
  topCrops: CropInfo[];
  usefulMarks: number;
  resolvedCases: number;
  experimentGroup: ExperimentGroup | null;
  reactionClicks: number;
}

/** "Полевой профиль" — a compact professional summary, not a game. Shows only data that exists. */
export function FieldProfileCard({
  profile,
  topCrops,
  usefulMarks,
  resolvedCases,
  experimentGroup,
  reactionClicks,
}: Props) {
  const { level, score, next } = communityLevel(profile.postCount, usefulMarks, resolvedCases);
  const progress = next ? Math.min(1, score / next) : 1;
  const SpecIcon = profile.specialization === "AGRONOMIST" ? Sprout : Tractor;

  return (
    <View className="mt-3 rounded-2xl border border-wheat bg-parchment p-4" testID="field-profile-card">
      <View className="flex-row items-center justify-between">
        <Text className="font-gsemibold text-bark" style={{ fontSize: 16 }}>
          Полевой профиль
        </Text>
        <View className="flex-row items-center gap-1.5 rounded-lg bg-leaf/30 px-2.5 py-1.5">
          <Award size={14} color={colors.forest} strokeWidth={2.4} />
          <Text className="font-gsemibold text-forest" style={{ fontSize: 12 }} testID="community-level">
            {level}
          </Text>
        </View>
      </View>

      {/* Key numbers — big and glanceable */}
      <View className="mt-3 flex-row gap-2">
        <Stat label="Наблюдений" value={profile.postCount} testID="stat-observations" />
        <Stat label="Полезно" value={usefulMarks} testID="stat-useful" />
        <Stat label="Решено" value={resolvedCases} testID="stat-resolved" />
      </View>

      {/* Facts that exist on the profile */}
      <View className="mt-3 gap-2">
        {profile.city ? (
          <Row icon={<MapPin size={16} color={colors.moss} />} label="Регион" value={profile.city} />
        ) : null}
        {profile.specialization ? (
          <Row
            icon={<SpecIcon size={16} color={colors.moss} />}
            label="Специализация"
            value={specializationLabel[profile.specialization]}
          />
        ) : null}
        {topCrops.length > 0 ? (
          <Row
            icon={<Sprout size={16} color={colors.moss} />}
            label="Основные культуры"
            value={topCrops.map((c) => `${c.emoji} ${c.label}`).join("  ")}
          />
        ) : null}
      </View>

      {/* Community level progress (visual only) */}
      <View className="mt-3 gap-1.5">
        <View className="h-2 overflow-hidden rounded-full bg-wheat">
          <View className="h-2 rounded-full bg-moss" style={{ width: `${Math.round(progress * 100)}%` }} />
        </View>
        <Text className="text-xs text-stone">
          {next
            ? `Уровень сообщества: ${level} · до следующего уровня ${Math.max(0, next - score)} баллов`
            : `Уровень сообщества: ${level}`}
        </Text>
      </View>

      {experimentGroup ? (
        <Text className="mt-2 text-xs text-stone/80" testID="reaction-experiment">
          Эксперимент реакций: группа {experimentGroup} · нажатий «Полезно»: {reactionClicks}
        </Text>
      ) : null}
    </View>
  );
}

function Stat({ label, value, testID }: { label: string; value: number; testID?: string }) {
  return (
    <View className="flex-1 items-center rounded-xl bg-field px-2 py-3" testID={testID}>
      <Text className="font-gbold text-forest" style={{ fontSize: 22 }}>
        {value}
      </Text>
      <Text className="mt-0.5 font-gmedium text-xs text-stone">{label}</Text>
    </View>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View className="flex-row items-center gap-2.5">
      {icon}
      <Text className="w-[130px] text-sm text-stone">{label}</Text>
      <Text className="flex-1 font-gsemibold text-sm text-bark" numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}
