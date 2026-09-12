import React from "react";
import { Text, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { colors } from "@/lib/theme";

interface Props {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  testID?: string;
}

export function EmptyState({ icon: Icon, title, subtitle, testID }: Props) {
  return (
    <View testID={testID} className="items-center gap-3 px-8 py-14">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-wheat">
        <Icon size={28} color={colors.moss} strokeWidth={1.8} />
      </View>
      <Text className="text-center font-gsemibold text-lg text-bark">{title}</Text>
      {subtitle ? <Text className="text-center text-sm leading-5 text-stone">{subtitle}</Text> : null}
    </View>
  );
}
