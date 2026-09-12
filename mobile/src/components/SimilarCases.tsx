import React, { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { ChevronRight, MessageCircle } from "lucide-react-native";
import { colors } from "@/lib/theme";
import type { FeedPost } from "@/lib/types";
import { useFeed } from "@/lib/queries";
import { useFieldStore } from "@/lib/field-store";
import { adviceWord, findSimilarCases, isLocalDemoId } from "@/lib/field-meta";
import { lightTap } from "@/lib/utils";
import { AdviceBadge, CropBadge, DemoBadge, StatusBadge } from "./FieldBadges";

interface Props {
  post: FeedPost;
}

/**
 * "Похожие случаи": up to three compact cards ranked by a plain frontend heuristic
 * (same crop / status / region / keywords). Uses the cached feed; demo cases fill gaps.
 */
export function SimilarCases({ post }: Props) {
  const { data: feed } = useFeed();
  const postMeta = useFieldStore((s) => s.postMeta);

  const cases = useMemo(
    () => findSimilarCases(post, feed ?? [], postMeta, 3),
    [post, feed, postMeta]
  );

  if (cases.length === 0) return null;

  return (
    <View className="gap-2.5" testID="similar-cases">
      <Text className="px-1 font-gsemibold text-bark" style={{ fontSize: 16 }}>
        Похожие случаи
      </Text>
      {cases.map(({ post: item, insight }) => {
        const accent = insight.resolved
          ? colors.forest
          : insight.needsAdvice
            ? colors.clay
            : colors.wheat;
        return (
          <Pressable
            key={item.id}
            testID={`similar-case-${item.id}`}
            onPress={() => {
              lightTap();
              router.push(`/post/${item.id}`);
            }}
            className="rounded-xl border border-wheat bg-parchment p-3 active:opacity-80"
            style={{ borderLeftWidth: 4, borderLeftColor: accent }}
          >
            <View className="flex-row flex-wrap items-center gap-1.5">
              {insight.needsAdvice || insight.resolved ? (
                <AdviceBadge resolved={insight.resolved} size="sm" />
              ) : null}
              {insight.status ? <StatusBadge status={insight.status} size="sm" /> : null}
              {insight.crop ? <CropBadge crop={insight.crop} size="sm" /> : null}
              {isLocalDemoId(item.id) ? <DemoBadge /> : null}
            </View>

            <View className="mt-2 flex-row items-center gap-3">
              {item.imageUrl ? (
                <Image
                  source={{ uri: item.imageUrl }}
                  style={{ width: 64, height: 64, borderRadius: 10, backgroundColor: colors.wheat }}
                  contentFit="cover"
                />
              ) : null}
              <View className="flex-1 gap-0.5">
                {insight.region ? (
                  <Text className="font-gmedium text-xs text-moss" numberOfLines={1}>
                    {insight.region}
                  </Text>
                ) : null}
                <Text className="text-sm leading-5 text-bark" numberOfLines={3}>
                  «{insight.displayText}»
                </Text>
                <View className="mt-0.5 flex-row items-center gap-1">
                  <MessageCircle size={12} color={colors.stone} />
                  <Text className="text-xs text-stone">
                    {item.commentCount} {adviceWord(item.commentCount)}
                  </Text>
                </View>
              </View>
              <ChevronRight size={18} color={colors.stone} />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
