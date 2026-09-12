import React from "react";
import { Text, View } from "react-native";
import { Sprout, Tractor } from "lucide-react-native";
import { colors } from "@/lib/theme";
import type { Specialization } from "@/lib/types";
import { specializationLabel } from "@/lib/types";
import { cn } from "@/lib/cn";

interface Props {
  specialization: Specialization | null;
  size?: "sm" | "md";
}

export function SpecializationBadge({ specialization, size = "sm" }: Props) {
  if (!specialization) return null;

  const isAgronomist = specialization === "AGRONOMIST";
  const Icon = isAgronomist ? Sprout : Tractor;
  const iconColor = isAgronomist ? colors.forest : colors.soil;

  return (
    <View
      className={cn(
        "flex-row items-center rounded-full",
        isAgronomist ? "bg-leaf/25" : "bg-soil/15",
        size === "sm" ? "px-2 py-0.5 gap-1" : "px-3 py-1 gap-1.5"
      )}
    >
      <Icon size={size === "sm" ? 12 : 15} color={iconColor} strokeWidth={2.4} />
      <Text
        className={cn(
          "font-gmedium",
          isAgronomist ? "text-forest" : "text-soil",
          size === "sm" ? "text-xs" : "text-sm"
        )}
      >
        {specializationLabel[specialization]}
      </Text>
    </View>
  );
}
