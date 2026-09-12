import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Location from "expo-location";
import { LocateFixed, MapPin, Plus, Sprout, TriangleAlert, Wheat, WifiOff } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { PostCard } from "@/components/PostCard";
import { EmptyState } from "@/components/EmptyState";
import { FilterChips, type ChipOption } from "@/components/FilterChips";
import { useFeed, useMyProfile } from "@/lib/queries";
import { useSession } from "@/lib/auth/use-session";
import { colors } from "@/lib/theme";
import { lightTap } from "@/lib/utils";
import {
  DEMO_FEED_POSTS,
  derivePostInsight,
  findSimilarCases,
  haversineKm,
  type PostInsight,
} from "@/lib/field-meta";
import { useFieldStore } from "@/lib/field-store";
import type { FeedPost } from "@/lib/types";

type FeedFilter = "all" | "advice" | "seedling" | "harvest" | "nearby";

const FILTERS: ChipOption<FeedFilter>[] = [
  { key: "all", label: "Все" },
  { key: "advice", label: "Нужен совет", emoji: "⚠" },
  { key: "seedling", label: "Всходы", emoji: "🌱" },
  { key: "harvest", label: "Урожай", emoji: "🌾" },
  { key: "nearby", label: "Рядом", emoji: "📍" },
];

const NEARBY_RADIUS_KM = 300;

type UserPosition = { latitude: number; longitude: number };
type LocationState = "idle" | "loading" | "granted" | "denied" | "unavailable";

export default function FeedScreen() {
  const { data: posts, isLoading, isError, refetch, isRefetching } = useFeed();
  const { data: session } = useSession();
  const { data: profile } = useMyProfile(!!session?.user);

  const postMeta = useFieldStore((s) => s.postMeta);
  const hydrated = useFieldStore((s) => s.hydrated);
  const ensureExperiment = useFieldStore((s) => s.ensureExperiment);

  const [filter, setFilter] = useState<FeedFilter>("all");
  const [position, setPosition] = useState<UserPosition | null>(null);
  const [locationState, setLocationState] = useState<LocationState>("idle");

  // First launch: assign the reaction experiment group (A / B) and keep it on the device.
  useEffect(() => {
    if (hydrated) ensureExperiment();
  }, [hydrated, ensureExperiment]);

  // Distances: reuse an already granted permission silently — the feed never prompts by itself.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const perm = await Location.getForegroundPermissionsAsync();
        if (!perm.granted) return;
        const last = await Location.getLastKnownPositionAsync();
        if (!cancelled && last) {
          setPosition({ latitude: last.coords.latitude, longitude: last.coords.longitude });
          setLocationState("granted");
        }
      } catch {
        // location is optional on this screen
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const requestPosition = useCallback(async () => {
    setLocationState("loading");
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        setLocationState("denied");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setPosition({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      setLocationState("granted");
    } catch {
      setLocationState("unavailable");
    }
  }, []);

  const onChangeFilter = (next: FeedFilter) => {
    setFilter(next);
    if (next === "nearby" && !position && locationState !== "loading") {
      requestPosition();
    }
  };

  // Real posts always win; demo observations appear only for an empty or unreachable feed.
  const hasRealPosts = !!posts && posts.length > 0;
  const basePosts: FeedPost[] = hasRealPosts ? posts : DEMO_FEED_POSTS;

  const insights = useMemo(() => {
    const map: Record<string, PostInsight> = {};
    for (const p of basePosts) map[p.id] = derivePostInsight(p, postMeta[p.id]);
    return map;
  }, [basePosts, postMeta]);

  const distances = useMemo(() => {
    const map: Record<string, number | null> = {};
    for (const p of basePosts) {
      map[p.id] =
        position && p.latitude != null && p.longitude != null
          ? haversineKm(position.latitude, position.longitude, p.latitude, p.longitude)
          : null;
    }
    return map;
  }, [basePosts, position]);

  const similarHints = useMemo(() => {
    const set = new Set<string>();
    for (const p of basePosts) {
      const insight = insights[p.id];
      if (!insight || !insight.needsAdvice || insight.resolved) continue;
      if (findSimilarCases(p, basePosts, postMeta, 1).length > 0) set.add(p.id);
    }
    return set;
  }, [basePosts, insights, postMeta]);

  const { visiblePosts, nearbyFallback } = useMemo(() => {
    const byInsight = (pred: (i: PostInsight) => boolean) =>
      basePosts.filter((p) => {
        const i = insights[p.id];
        return i ? pred(i) : false;
      });

    switch (filter) {
      case "advice":
        return { visiblePosts: byInsight((i) => i.needsAdvice && !i.resolved), nearbyFallback: false };
      case "seedling":
        return { visiblePosts: byInsight((i) => i.status === "SEEDLING"), nearbyFallback: false };
      case "harvest":
        return { visiblePosts: byInsight((i) => i.status === "HARVEST"), nearbyFallback: false };
      case "nearby": {
        if (!position) return { visiblePosts: [], nearbyFallback: false };
        const withDistance = basePosts
          .filter((p) => distances[p.id] != null)
          .sort((a, b) => (distances[a.id] ?? 0) - (distances[b.id] ?? 0));
        const close = withDistance.filter((p) => (distances[p.id] ?? Infinity) <= NEARBY_RADIUS_KM);
        if (close.length > 0) return { visiblePosts: close, nearbyFallback: false };
        return { visiblePosts: withDistance, nearbyFallback: withDistance.length > 0 };
      }
      default:
        return { visiblePosts: basePosts, nearbyFallback: false };
    }
  }, [basePosts, distances, filter, insights, position]);

  const regionLabel = profile?.city?.trim() ? profile.city : "Ваш регион";

  const renderEmpty = () => {
    if (filter === "nearby") {
      if (locationState === "loading") {
        return (
          <View className="items-center gap-3 py-14" testID="feed-nearby-loading">
            <ActivityIndicator color={colors.forest} />
            <Text className="font-gmedium text-sm text-stone">Определяем геопозицию…</Text>
          </View>
        );
      }
      if (locationState === "denied" || locationState === "unavailable") {
        return (
          <View className="items-center gap-4 px-8 py-12" testID="feed-nearby-denied">
            <EmptyState
              icon={LocateFixed}
              title={
                locationState === "denied"
                  ? "Нет доступа к геопозиции"
                  : "Не удалось определить местоположение"
              }
              subtitle="Разрешите доступ, чтобы видеть наблюдения с полей рядом с вами"
            />
            <BigButton label="Определить местоположение" onPress={requestPosition} />
          </View>
        );
      }
      return (
        <EmptyState
          icon={MapPin}
          title="Рядом пока нет наблюдений"
          subtitle="Публикации с геометкой появятся здесь"
          testID="feed-empty"
        />
      );
    }
    const copy: Record<Exclude<FeedFilter, "nearby">, { icon: LucideIcon; title: string; subtitle: string }> = {
      all: {
        icon: Sprout,
        title: "Пока тишина в полях",
        subtitle: "Станьте первым — расскажите, что происходит в вашем хозяйстве",
      },
      advice: {
        icon: TriangleAlert,
        title: "Сейчас никому не нужен совет",
        subtitle: "Все вопросы закрыты. Загляните позже или поделитесь своим наблюдением",
      },
      seedling: {
        icon: Sprout,
        title: "Нет наблюдений о всходах",
        subtitle: "Отметьте статус «Всходы» в своей публикации — она появится здесь",
      },
      harvest: {
        icon: Wheat,
        title: "Нет наблюдений об урожае",
        subtitle: "Отметьте статус «Урожай» в своей публикации — она появится здесь",
      },
    };
    const c = copy[filter];
    return <EmptyState icon={c.icon} title={c.title} subtitle={c.subtitle} testID="feed-empty" />;
  };

  const listHeader =
    !hasRealPosts || nearbyFallback ? (
      <View className="gap-2 pb-1">
        {!hasRealPosts ? (
          <View
            className="flex-row items-center gap-3 rounded-xl border border-wheat bg-parchment px-4 py-3"
            testID={isError ? "feed-offline-banner" : "feed-demo-banner"}
          >
            <WifiOff size={18} color={colors.stone} />
            <Text className="flex-1 font-gmedium text-sm text-stone">
              {isError
                ? "Нет сети. Показаны примеры наблюдений."
                : "Пока нет реальных наблюдений — показаны примеры."}
            </Text>
            {isError ? (
              <Pressable
                onPress={() => refetch()}
                className="min-h-[36px] justify-center rounded-lg bg-forest px-3 active:opacity-80"
              >
                <Text className="font-gsemibold text-sm text-parchment">Повторить</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        {nearbyFallback ? (
          <Text className="px-1 font-gmedium text-sm text-stone">
            В радиусе {NEARBY_RADIUS_KM} км наблюдений нет — показаны ближайшие
          </Text>
        ) : null}
      </View>
    ) : null;

  return (
    <SafeAreaView className="flex-1 bg-field" edges={["top"]} testID="feed-screen">
      {/* Header */}
      <View className="px-5 pb-2 pt-2">
        <View className="flex-row items-center justify-between">
          <Text className="font-display text-3xl text-forest">Поля рядом</Text>
          <View className="h-9 w-9 items-center justify-center rounded-xl bg-forest">
            <Wheat size={18} color={colors.parchment} />
          </View>
        </View>
        <View className="mt-0.5 flex-row items-center gap-1.5" testID="feed-region">
          <MapPin size={15} color={colors.moss} strokeWidth={2.4} />
          <Text className="font-gmedium text-moss" style={{ fontSize: 14 }} numberOfLines={1}>
            {regionLabel}
          </Text>
        </View>
      </View>

      <View className="pb-3">
        <FilterChips options={FILTERS} value={filter} onChange={onChangeFilter} testID="feed-filter" />
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center" testID="loading-indicator">
          <ActivityIndicator size="large" color={colors.forest} />
        </View>
      ) : (
        <FlatList
          testID="feed-list"
          data={visiblePosts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              distanceKm={distances[item.id] ?? null}
              hasSimilar={similarHints.has(item.id)}
            />
          )}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 110, gap: 14 }}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={isRefetching}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={renderEmpty()}
        />
      )}

      {/* FAB — new field observation */}
      <Pressable
        testID="create-post-fab"
        accessibilityRole="button"
        accessibilityLabel="Новое наблюдение"
        onPress={() => {
          lightTap();
          router.push("/create-post");
        }}
        className="absolute bottom-6 right-5 h-16 w-16 items-center justify-center rounded-full bg-forest active:opacity-90"
        style={{
          shadowColor: colors.forest,
          shadowOpacity: 0.3,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: 5,
        }}
      >
        <Plus size={30} color={colors.parchment} strokeWidth={2.4} />
      </Pressable>
    </SafeAreaView>
  );
}

function BigButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="min-h-[48px] items-center justify-center rounded-xl bg-forest px-6 active:opacity-90"
    >
      <Text className="font-gsemibold text-parchment" style={{ fontSize: 15 }}>
        {label}
      </Text>
    </Pressable>
  );
}
