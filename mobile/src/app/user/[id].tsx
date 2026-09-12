import React from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Award, MapPin, Sprout } from "lucide-react-native";
import { Avatar } from "@/components/Avatar";
import { SpecializationBadge } from "@/components/SpecializationBadge";
import { PostCard } from "@/components/PostCard";
import { EmptyState } from "@/components/EmptyState";
import { useFeed, useUserProfile } from "@/lib/queries";
import { colors } from "@/lib/theme";

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: profile, isLoading } = useUserProfile(id ?? "");
  const { data: posts, isLoading: postsLoading } = useFeed(id ?? undefined);

  return (
    <SafeAreaView className="flex-1 bg-field" edges={["top"]} testID="user-profile-screen">
      {/* Header */}
      <View className="flex-row items-center gap-3 px-4 pb-2 pt-2">
        <Pressable
          testID="user-back-button"
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full border border-wheat bg-parchment active:opacity-70"
        >
          <ArrowLeft size={19} color={colors.bark} />
        </Pressable>
        <Text className="font-gsemibold text-lg text-bark">Профиль</Text>
      </View>

      {isLoading || !profile ? (
        <View className="flex-1 items-center justify-center" testID="user-profile-loading">
          <ActivityIndicator size="large" color={colors.forest} />
        </View>
      ) : (
        <FlatList
          testID="user-posts-list"
          data={posts ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <PostCard post={item} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 14 }}
          ListHeaderComponent={
            <View className="mb-2">
              <View className="items-center rounded-3xl border border-wheat bg-parchment px-5 pb-5 pt-6">
                <Avatar name={profile.name} uri={profile.image} size={92} />
                <Text className="mt-3 font-display text-2xl text-bark">{profile.name}</Text>
                <View className="mt-2">
                  <SpecializationBadge specialization={profile.specialization} size="md" />
                </View>

                <View className="mt-3 flex-row flex-wrap items-center justify-center gap-x-4 gap-y-1">
                  {profile.city ? (
                    <View className="flex-row items-center gap-1">
                      <MapPin size={13} color={colors.stone} />
                      <Text className="text-sm text-stone">{profile.city}</Text>
                    </View>
                  ) : null}
                  {profile.experienceYears != null ? (
                    <View className="flex-row items-center gap-1">
                      <Award size={13} color={colors.stone} />
                      <Text className="text-sm text-stone">
                        {profile.experienceYears === 0
                          ? "Меньше года опыта"
                          : `Опыт ${profile.experienceYears} ${yearsWord(profile.experienceYears)}`}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {profile.bio ? (
                  <Text className="mt-3 text-center text-sm leading-5 text-bark">{profile.bio}</Text>
                ) : null}
              </View>

              <Text className="mb-1 mt-6 px-1 font-gsemibold text-lg text-bark">
                Посты{profile.postCount > 0 ? ` · ${profile.postCount}` : ""}
              </Text>
            </View>
          }
          ListEmptyComponent={
            postsLoading ? (
              <View className="items-center py-10">
                <ActivityIndicator color={colors.forest} />
              </View>
            ) : (
              <EmptyState
                icon={Sprout}
                title="Постов пока нет"
                subtitle="Этот участник ещё ничего не публиковал"
                testID="user-posts-empty"
              />
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

function yearsWord(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return "лет";
  if (mod10 === 1) return "год";
  if (mod10 >= 2 && mod10 <= 4) return "года";
  return "лет";
}
