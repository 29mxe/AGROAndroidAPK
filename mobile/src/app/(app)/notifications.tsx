import React, { useCallback } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Image } from "expo-image";
import { BellOff, Heart, MessageCircle } from "lucide-react-native";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { useMarkAllRead, useNotifications } from "@/lib/queries";
import { colors } from "@/lib/theme";
import type { AppNotification } from "@/lib/types";
import { timeAgo } from "@/lib/utils";
import { cn } from "@/lib/cn";

export default function NotificationsScreen() {
  const { data: notifications, isLoading, refetch, isRefetching } = useNotifications();
  const markAllRead = useMarkAllRead();
  const { mutate: markRead } = markAllRead;

  // Refresh the list when the tab opens; mark everything read shortly after viewing
  useFocusEffect(
    useCallback(() => {
      refetch();
      const timer = setTimeout(() => markRead(), 1500);
      return () => clearTimeout(timer);
    }, [refetch, markRead])
  );

  return (
    <SafeAreaView className="flex-1 bg-field" edges={["top"]} testID="notifications-screen">
      <View className="px-5 pb-3 pt-2">
        <Text className="font-display text-3xl text-forest">Уведомления</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center" testID="notifications-loading">
          <ActivityIndicator size="large" color={colors.forest} />
        </View>
      ) : (
        <FlatList
          testID="notifications-list"
          data={notifications ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <NotificationRow notification={item} />}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 10 }}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={isRefetching}
          ListEmptyComponent={
            <EmptyState
              icon={BellOff}
              title="Уведомлений пока нет"
              subtitle="Когда кто-то отметит ваше наблюдение как полезное или даст совет — вы увидите это здесь"
              testID="notifications-empty"
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

function NotificationRow({ notification }: { notification: AppNotification }) {
  const isLike = notification.type === "LIKE";

  return (
    <Pressable
      testID={`notification-${notification.id}`}
      onPress={() => router.push(`/post/${notification.post.id}`)}
      className={cn(
        "flex-row items-center gap-3 rounded-2xl border px-3.5 py-3",
        notification.read ? "border-wheat bg-parchment" : "border-leaf/50 bg-leaf/10"
      )}
    >
      <View>
        <Avatar name={notification.actor.name} uri={notification.actor.image} size={46} />
        <View
          className={cn(
            "absolute -bottom-1 -right-1 h-6 w-6 items-center justify-center rounded-full",
            isLike ? "bg-clay" : "bg-moss"
          )}
          style={{ borderWidth: 2, borderColor: colors.parchment }}
        >
          {isLike ? (
            <Heart size={11} color={colors.parchment} fill={colors.parchment} />
          ) : (
            <MessageCircle size={11} color={colors.parchment} fill={colors.parchment} />
          )}
        </View>
      </View>

      <View className="flex-1 gap-0.5">
        <Text className="text-sm leading-5 text-bark" numberOfLines={2}>
          <Text className="font-gsemibold">{notification.actor.name}</Text>
          {isLike ? " отметил(а) ваше наблюдение как полезное" : " дал(а) совет: "}
          {!isLike && notification.commentText ? (
            <Text className="text-stone">«{notification.commentText}»</Text>
          ) : null}
        </Text>
        <Text className="text-xs text-stone">{timeAgo(notification.createdAt)}</Text>
      </View>

      {notification.post.imageUrl ? (
        <Image
          source={{ uri: notification.post.imageUrl }}
          style={{ width: 46, height: 46, borderRadius: 10, backgroundColor: colors.wheat }}
          contentFit="cover"
        />
      ) : null}
    </Pressable>
  );
}
