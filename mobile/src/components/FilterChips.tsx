import React from "react";
import { Pressable, ScrollView, Text } from "react-native";
import { cn } from "@/lib/cn";
import { lightTap } from "@/lib/utils";

export interface ChipOption<T extends string> {
  key: T;
  label: string;
  emoji?: string;
}

interface Props<T extends string> {
  options: ChipOption<T>[];
  value: T;
  onChange: (key: T) => void;
  testID?: string;
}

/** Large, high-contrast horizontal filter chips — sized for gloved thumbs and sunlight. */
export function FilterChips<T extends string>({ options, value, onChange, testID }: Props<T>) {
  return (
    <ScrollView
      testID={testID}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ flexGrow: 0 }}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
    >
      {options.map((option) => {
        const selected = option.key === value;
        return (
          <Pressable
            key={option.key}
            testID={`${testID ?? "chip"}-${option.key}`}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => {
              if (selected) return;
              lightTap();
              onChange(option.key);
            }}
            className={cn(
              "min-h-[44px] flex-row items-center justify-center rounded-full border px-4",
              selected
                ? "border-forest bg-forest"
                : "border-wheat bg-parchment active:bg-wheat/60"
            )}
          >
            <Text
              className={cn(
                selected ? "font-gsemibold text-parchment" : "font-gmedium text-bark"
              )}
              style={{ fontSize: 15 }}
            >
              {option.emoji ? `${option.emoji} ` : ""}
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
