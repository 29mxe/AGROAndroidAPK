import React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { MapPin } from "lucide-react-native";
import { PostsMap } from "@/components/PostsMap";
import { useFeed } from "@/lib/queries";
import { colors } from "@/lib/theme";

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const { data: posts, isLoading } = useFeed();

  const geoCount = (posts ?? []).filter((p) => p.latitude != null && p.longitude != null).length;

  return (
    <View className="flex-1 bg-field" testID="map-screen">
      {isLoading ? (
        <View className="flex-1 items-center justify-center" testID="map-loading">
          <ActivityIndicator size="large" color={colors.forest} />
        </View>
      ) : (
        <PostsMap posts={posts ?? []} onOpenPost={(id) => router.push(`/post/${id}`)} />
      )}

      {/* Floating header */}
      <View
        className="absolute left-4 right-4 flex-row items-center gap-2.5 rounded-2xl border border-wheat bg-parchment px-4 py-3"
        style={{
          top: insets.top + 8,
          shadowColor: colors.bark,
          shadowOpacity: 0.12,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          elevation: 5,
        }}
      >
        <View className="h-8 w-8 items-center justify-center rounded-xl bg-forest">
          <MapPin size={16} color={colors.parchment} />
        </View>
        <View className="flex-1">
          <Text className="font-gsemibold text-base text-bark">Карта наблюдений</Text>
          <Text className="text-xs text-stone">
            {geoCount > 0
              ? `${geoCount} ${postsWord(geoCount)} с геометкой`
              : "Пока нет наблюдений с геометкой"}
          </Text>
        </View>
      </View>
    </View>
  );
}

function postsWord(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return "наблюдений";
  if (mod10 === 1) return "наблюдение";
  if (mod10 >= 2 && mod10 <= 4) return "наблюдения";
  return "наблюдений";
}
