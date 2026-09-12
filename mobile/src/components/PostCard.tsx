import React, { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from "react-native-reanimated";
import {
  Bookmark,
  BookmarkCheck,
  ChevronRight,
  CircleCheck,
  MapPin,
  MessageCircle,
  RotateCcw,
  Sprout,
  ThumbsUp,
} from "lucide-react-native";
import { colors } from "@/lib/theme";
import type { FeedPost } from "@/lib/types";
import { useToggleLike } from "@/lib/queries";
import { useSession } from "@/lib/auth/use-session";
import { lightTap, successTap, timeAgo } from "@/lib/utils";
import { adviceWord, derivePostInsight, formatDistance, isLocalDemoId } from "@/lib/field-meta";
import { selectIsBookmarked, selectPostMeta, useFieldStore } from "@/lib/field-store";
import { cn } from "@/lib/cn";
import { Avatar } from "./Avatar";
import { SpecializationBadge } from "./SpecializationBadge";
import { AudioPlayer } from "./AudioPlayer";
import { AdviceBadge, CropBadge, DemoBadge, StatusBadge } from "./FieldBadges";

interface Props {
  post: FeedPost;
  /** disables navigation on card tap (used on the post detail screen) */
  isDetail?: boolean;
  /** distance from the user's current position (km), when both coordinates are known */
  distanceKm?: number | null;
  /** feed hint: a similar (ideally resolved) case exists — tap opens the post */
  hasSimilar?: boolean;
}

/**
 * Field observation card. Information priority (top → bottom):
 * advice/resolved signal → status → location & crop → photo → text → author → reactions.
 */
export function PostCard({ post, isDetail, distanceKm, hasSimilar }: Props) {
  const toggleLike = useToggleLike();
  const { data: session } = useSession();

  const localMeta = useFieldStore(selectPostMeta(post.id));
  const bookmarked = useFieldStore(selectIsBookmarked(post.id));
  const toggleBookmark = useFieldStore((s) => s.toggleBookmark);
  const setResolved = useFieldStore((s) => s.setResolved);
  const experimentGroup = useFieldStore((s) => s.experimentGroup);
  const recordReactionClick = useFieldStore((s) => s.recordReactionClick);

  const insight = useMemo(() => derivePostInsight(post, localMeta), [post, localMeta]);
  const isDemo = isLocalDemoId(post.id);
  const isMine = !!session?.user?.id && session.user.id === post.author.id;

  // Demo observations never touch the backend — their reaction is purely local.
  const [demoLiked, setDemoLiked] = useState(false);
  const liked = isDemo ? demoLiked : post.likedByMe;
  const likeCount = isDemo ? post.likeCount + (demoLiked ? 1 : 0) : post.likeCount;

  const likeScale = useSharedValue(1);
  const likeStyle = useAnimatedStyle(() => ({ transform: [{ scale: likeScale.value }] }));

  const onUseful = () => {
    lightTap();
    likeScale.value = withSequence(withSpring(1.3, { damping: 9 }), withSpring(1));
    recordReactionClick();
    if (isDemo) {
      setDemoLiked((v) => !v);
      return;
    }
    // Same backend "like" endpoint as before — only the meaning shown to the user changed.
    toggleLike.mutate(post.id);
  };

  const onBookmark = () => {
    lightTap();
    toggleBookmark(post.id);
  };

  const onMarkResolved = () => {
    successTap();
    setResolved(post.id, true);
  };

  const onReopen = () => {
    lightTap();
    setResolved(post.id, false);
  };

  const openPost = () => {
    if (!isDetail) router.push(`/post/${post.id}`);
  };

  const openAuthor = () => {
    if (isDemo) return;
    router.push(`/user/${post.author.id}`);
  };

  const hasCoords = post.latitude != null && post.longitude != null;
  const locationLabel =
    distanceKm != null
      ? `${formatDistance(distanceKm)}${insight.region ? ` · ${insight.region}` : ""}`
      : insight.region ?? (hasCoords ? "На карте" : null);

  const showSignalRow = insight.needsAdvice || insight.resolved || !!insight.status || isDemo;
  const UsefulIcon = experimentGroup === "A" ? ThumbsUp : Sprout;
  const accentColor = insight.resolved
    ? colors.forest
    : insight.needsAdvice
      ? colors.clay
      : "transparent";

  return (
    <Pressable
      testID={`post-card-${post.id}`}
      onPress={openPost}
      disabled={isDetail}
      className="rounded-2xl border border-wheat bg-parchment p-4"
      style={{ borderLeftWidth: 4, borderLeftColor: accentColor === "transparent" ? colors.wheat : accentColor }}
    >
      {/* 1. Signal row: needs advice / resolved + field status */}
      {showSignalRow ? (
        <View className="mb-2.5 flex-row flex-wrap items-center gap-2">
          {insight.needsAdvice || insight.resolved ? (
            <AdviceBadge resolved={insight.resolved} testID={`advice-badge-${post.id}`} />
          ) : null}
          {insight.status ? <StatusBadge status={insight.status} testID={`status-badge-${post.id}`} /> : null}
          {isDemo ? <DemoBadge /> : null}
        </View>
      ) : null}

      {/* 2. Location + crop */}
      {locationLabel || insight.crop ? (
        <View className="flex-row items-center justify-between gap-3">
          {locationLabel ? (
            <View className="flex-1 flex-row items-center gap-1.5">
              <MapPin size={15} color={colors.moss} strokeWidth={2.4} />
              <Text className="flex-1 font-gmedium text-moss" style={{ fontSize: 14 }} numberOfLines={1}>
                {locationLabel}
              </Text>
            </View>
          ) : (
            <View className="flex-1" />
          )}
          {insight.crop ? <CropBadge crop={insight.crop} testID={`crop-badge-${post.id}`} /> : null}
        </View>
      ) : null}

      {/* 3. Photo — the main content in the field */}
      {post.imageUrl ? (
        <Image
          source={{ uri: post.imageUrl }}
          style={{
            width: "100%",
            height: 240,
            borderRadius: 14,
            marginTop: 12,
            backgroundColor: colors.wheat,
          }}
          contentFit="cover"
          transition={200}
        />
      ) : null}

      {/* 4. Short text */}
      <Text className="mt-3 text-bark" style={{ fontSize: 16, lineHeight: 23 }}>
        {insight.displayText}
      </Text>

      {/* Voice message */}
      {post.audioUrl ? (
        <View className="mt-3">
          <AudioPlayer uri={post.audioUrl} duration={post.audioDuration} testID="post-audio-player" />
        </View>
      ) : null}

      {/* 5. Author (compact) */}
      <Pressable
        onPress={openAuthor}
        disabled={isDemo}
        testID={`post-author-${post.id}`}
        className="mt-3 flex-row items-center gap-2.5"
        hitSlop={6}
      >
        <Avatar name={post.author.name} uri={post.author.image} size={30} />
        <View className="flex-1 flex-row flex-wrap items-center gap-x-2 gap-y-0.5">
          <Text className="font-gsemibold text-sm text-bark" numberOfLines={1}>
            {post.author.name}
          </Text>
          <SpecializationBadge specialization={post.author.specialization} />
          <Text className="text-xs text-stone">{timeAgo(post.createdAt)}</Text>
        </View>
      </Pressable>

      {/* 6. Reactions & advice */}
      <View className="mt-3 flex-row items-center gap-2 border-t border-wheat pt-3">
        <Pressable
          testID={`like-button-${post.id}`}
          accessibilityRole="button"
          accessibilityLabel="Полезно"
          onPress={onUseful}
          className={cn(
            "min-h-[44px] flex-row items-center gap-2 rounded-xl border px-3.5 active:opacity-80",
            liked ? "border-forest bg-forest" : "border-wheat bg-field"
          )}
        >
          <Animated.View style={likeStyle}>
            <UsefulIcon
              size={20}
              color={liked ? colors.parchment : colors.forest}
              fill={liked ? (experimentGroup === "A" ? colors.parchment : "transparent") : "transparent"}
              strokeWidth={2.2}
            />
          </Animated.View>
          <Text
            className={cn("font-gsemibold", liked ? "text-parchment" : "text-forest")}
            style={{ fontSize: 14 }}
          >
            Полезно
          </Text>
          {likeCount > 0 ? (
            <Text
              className={cn("font-gbold", liked ? "text-parchment" : "text-forest")}
              style={{ fontSize: 14 }}
              testID={`like-count-${post.id}`}
            >
              {likeCount}
            </Text>
          ) : null}
        </Pressable>

        <Pressable
          testID={`comment-button-${post.id}`}
          accessibilityRole="button"
          onPress={openPost}
          disabled={isDetail}
          className="min-h-[44px] flex-row items-center gap-2 rounded-xl border border-wheat bg-field px-3.5 active:opacity-80"
        >
          <MessageCircle size={20} color={colors.soil} strokeWidth={2.2} />
          <Text className="font-gsemibold text-soil" style={{ fontSize: 14 }}>
            {post.commentCount > 0
              ? `${post.commentCount} ${adviceWord(post.commentCount)}`
              : "Дать совет"}
          </Text>
        </Pressable>

        <View className="flex-1" />

        <Pressable
          testID={`bookmark-button-${post.id}`}
          accessibilityRole="button"
          accessibilityLabel={bookmarked ? "Убрать из сохранённых" : "Сохранить наблюдение"}
          onPress={onBookmark}
          hitSlop={6}
          className={cn(
            "h-11 w-11 items-center justify-center rounded-xl border active:opacity-80",
            bookmarked ? "border-forest bg-forest/10" : "border-wheat bg-field"
          )}
        >
          {bookmarked ? (
            <BookmarkCheck size={21} color={colors.forest} strokeWidth={2.3} />
          ) : (
            <Bookmark size={21} color={colors.stone} strokeWidth={2.2} />
          )}
        </Pressable>
      </View>

      {/* Owner control: move the question to "Решено" (stored on this device) */}
      {isMine && insight.needsAdvice && !insight.resolved ? (
        <Pressable
          testID={`mark-resolved-${post.id}`}
          onPress={onMarkResolved}
          className="mt-3 min-h-[48px] flex-row items-center justify-center gap-2 rounded-xl bg-leaf/30 active:opacity-80"
        >
          <CircleCheck size={20} color={colors.forest} strokeWidth={2.4} />
          <Text className="font-gsemibold text-forest" style={{ fontSize: 15 }}>
            Отметить как «Решено»
          </Text>
        </Pressable>
      ) : null}
      {isMine && insight.resolved ? (
        <Pressable
          testID={`reopen-advice-${post.id}`}
          onPress={onReopen}
          className="mt-2 min-h-[40px] flex-row items-center justify-center gap-1.5 active:opacity-70"
        >
          <RotateCcw size={14} color={colors.stone} />
          <Text className="font-gmedium text-sm text-stone">Снова нужен совет</Text>
        </Pressable>
      ) : null}

      {/* Feed hint: someone nearby has already been through this */}
      {hasSimilar && !isDetail ? (
        <View
          className="mt-3 flex-row items-center justify-between rounded-xl bg-forest/5 px-3 py-2.5"
          testID={`similar-hint-${post.id}`}
        >
          <Text className="font-gsemibold text-sm text-forest">Похожий случай был рядом</Text>
          <ChevronRight size={18} color={colors.forest} />
        </View>
      ) : null}
    </Pressable>
  );
}
