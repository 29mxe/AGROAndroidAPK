import React, { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Award, Bookmark, LogOut, MapPin, Pencil, Sprout } from "lucide-react-native";
import { Avatar } from "@/components/Avatar";
import { SpecializationBadge } from "@/components/SpecializationBadge";
import { PostCard } from "@/components/PostCard";
import { EmptyState } from "@/components/EmptyState";
import { FieldProfileCard } from "@/components/FieldProfileCard";
import { authClient } from "@/lib/auth/auth-client";
import { useSession } from "@/lib/auth/use-session";
import { useFeed, useMyProfile } from "@/lib/queries";
import { colors } from "@/lib/theme";
import { lightTap } from "@/lib/utils";
import { cn } from "@/lib/cn";
import { DEMO_POSTS, cropById, derivePostInsight, type CropInfo } from "@/lib/field-meta";
import { useFieldStore } from "@/lib/field-store";
import type { FeedPost } from "@/lib/types";

type ProfileTab = "mine" | "saved";

export default function ProfileScreen() {
  const { data: session } = useSession();
  const { data: profile } = useMyProfile(!!session?.user);
  const { data: myPosts, isLoading: postsLoading } = useFeed(profile?.id);
  const { data: allPosts } = useFeed();
  const queryClient = useQueryClient();
  const [signingOut, setSigningOut] = useState(false);
  const [tab, setTab] = useState<ProfileTab>("mine");

  const bookmarks = useFieldStore((s) => s.bookmarks);
  const postMeta = useFieldStore((s) => s.postMeta);
  const experimentGroup = useFieldStore((s) => s.experimentGroup);
  const reactionClicks = useFieldStore((s) => s.reactionClicks);

  // Saved observations live only on this device (ids) — resolve them from cached posts.
  const savedPosts = useMemo(() => {
    const byId = new Map<string, FeedPost>();
    for (const p of [...DEMO_POSTS, ...(allPosts ?? []), ...(myPosts ?? [])]) byId.set(p.id, p);
    return bookmarks.map((id) => byId.get(id)).filter((p): p is FeedPost => !!p);
  }, [allPosts, myPosts, bookmarks]);

  const fieldStats = useMemo(() => {
    const cropCounts = new Map<string, number>();
    let resolved = 0;
    let useful = 0;
    for (const p of myPosts ?? []) {
      const insight = derivePostInsight(p, postMeta[p.id]);
      if (insight.crop) cropCounts.set(insight.crop.id, (cropCounts.get(insight.crop.id) ?? 0) + 1);
      if (insight.resolved) resolved += 1;
      useful += p.likeCount;
    }
    const topCrops = [...cropCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id]) => cropById(id))
      .filter((c): c is CropInfo => !!c);
    return { topCrops, resolved, useful };
  }, [myPosts, postMeta]);

  const signOut = async () => {
    setSigningOut(true);
    try {
      await authClient.signOut();
    } finally {
      queryClient.clear();
      await queryClient.invalidateQueries();
      setSigningOut(false);
    }
  };

  if (!profile) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-field" edges={["top"]}>
        <ActivityIndicator size="large" color={colors.forest} />
      </SafeAreaView>
    );
  }

  const experienceLabel =
    profile.experienceYears == null
      ? null
      : profile.experienceYears === 0
        ? "Меньше года опыта"
        : `Опыт ${profile.experienceYears} ${yearsWord(profile.experienceYears)}`;

  const listData = tab === "mine" ? (myPosts ?? []) : savedPosts;

  return (
    <SafeAreaView className="flex-1 bg-field" edges={["top"]} testID="profile-screen">
      <FlatList
        testID="profile-posts-list"
        data={listData}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PostCard post={item} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 14 }}
        ListHeaderComponent={
          <View className="mb-2 pt-2">
            {/* Header card */}
            <View className="items-center rounded-2xl border border-wheat bg-parchment px-5 pb-5 pt-6">
              <Avatar name={profile.name} uri={profile.image} size={92} testID="profile-avatar" />
              <Text className="mt-3 font-display text-2xl text-bark">{profile.name}</Text>
              <View className="mt-2 flex-row items-center gap-2">
                <SpecializationBadge specialization={profile.specialization} size="md" />
              </View>

              <View className="mt-3 flex-row flex-wrap items-center justify-center gap-x-4 gap-y-1">
                {profile.city ? (
                  <View className="flex-row items-center gap-1">
                    <MapPin size={13} color={colors.stone} />
                    <Text className="text-sm text-stone">{profile.city}</Text>
                  </View>
                ) : null}
                {experienceLabel ? (
                  <View className="flex-row items-center gap-1">
                    <Award size={13} color={colors.stone} />
                    <Text className="text-sm text-stone">{experienceLabel}</Text>
                  </View>
                ) : null}
              </View>

              {profile.bio ? (
                <Text className="mt-3 text-center text-sm leading-5 text-bark">{profile.bio}</Text>
              ) : null}

              <View className="mt-4 flex-row gap-2.5">
                <Pressable
                  testID="edit-profile-button"
                  onPress={() => {
                    lightTap();
                    router.push("/edit-profile");
                  }}
                  className="min-h-[44px] flex-row items-center gap-1.5 rounded-full bg-forest px-5 active:opacity-90"
                >
                  <Pencil size={14} color={colors.parchment} />
                  <Text className="font-gsemibold text-sm text-parchment">Редактировать</Text>
                </Pressable>
                <Pressable
                  testID="sign-out-button"
                  onPress={signOut}
                  disabled={signingOut}
                  className="min-h-[44px] flex-row items-center gap-1.5 rounded-full border border-wheat bg-field px-4 active:opacity-70"
                >
                  {signingOut ? (
                    <ActivityIndicator size="small" color={colors.soil} />
                  ) : (
                    <LogOut size={14} color={colors.soil} />
                  )}
                  <Text className="font-gsemibold text-sm text-soil">Выйти</Text>
                </Pressable>
              </View>
            </View>

            {/* Field profile */}
            <FieldProfileCard
              profile={profile}
              topCrops={fieldStats.topCrops}
              usefulMarks={fieldStats.useful}
              resolvedCases={fieldStats.resolved}
              experimentGroup={experimentGroup}
              reactionClicks={reactionClicks}
            />

            {/* My observations / Saved */}
            <View className="mt-5 flex-row gap-2 rounded-2xl bg-wheat/60 p-1" testID="profile-tabs">
              <TabButton
                testID="profile-tab-mine"
                active={tab === "mine"}
                label={`Мои наблюдения${profile.postCount > 0 ? ` · ${profile.postCount}` : ""}`}
                onPress={() => setTab("mine")}
              />
              <TabButton
                testID="profile-tab-saved"
                active={tab === "saved"}
                label={`Сохранённые${bookmarks.length > 0 ? ` · ${bookmarks.length}` : ""}`}
                onPress={() => setTab("saved")}
              />
            </View>
          </View>
        }
        ListEmptyComponent={
          tab === "mine" ? (
            postsLoading ? (
              <View className="items-center py-10">
                <ActivityIndicator color={colors.forest} />
              </View>
            ) : (
              <EmptyState
                icon={Sprout}
                title="Вы ещё ничего не публиковали"
                subtitle="Расскажите, что происходит на вашем поле — коллегам будет полезно"
                testID="profile-posts-empty"
              />
            )
          ) : (
            <EmptyState
              icon={Bookmark}
              title="Нет сохранённых наблюдений"
              subtitle="Нажмите на закладку на карточке — наблюдение появится здесь"
              testID="profile-saved-empty"
            />
          )
        }
      />
    </SafeAreaView>
  );
}

function TabButton({
  active,
  label,
  onPress,
  testID,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={() => {
        if (active) return;
        lightTap();
        onPress();
      }}
      className={cn(
        "min-h-[44px] flex-1 items-center justify-center rounded-xl px-2",
        active ? "bg-parchment" : "active:bg-wheat"
      )}
      style={active ? { borderWidth: 1, borderColor: colors.wheat } : undefined}
    >
      <Text
        className={cn(active ? "font-gsemibold text-forest" : "font-gmedium text-stone")}
        style={{ fontSize: 14 }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
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
