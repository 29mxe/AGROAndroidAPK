import React from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { X } from "lucide-react-native";
import { ProfileForm } from "@/components/ProfileForm";
import { useMyProfile, useUpdateProfile } from "@/lib/queries";
import { useSession } from "@/lib/auth/use-session";
import { colors } from "@/lib/theme";
import { successTap } from "@/lib/utils";

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const { data: session } = useSession();
  const { data: profile } = useMyProfile(!!session?.user);
  const updateProfile = useUpdateProfile();

  const topPadding = Platform.OS === "ios" ? 14 : insets.top + 10;

  return (
    <View className="flex-1 bg-field" testID="edit-profile-screen">
      <View
        className="flex-row items-center justify-between border-b border-wheat px-4 pb-3"
        style={{ paddingTop: topPadding }}
      >
        <Pressable
          testID="close-edit-profile"
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full bg-wheat/70 active:opacity-70"
        >
          <X size={19} color={colors.bark} />
        </Pressable>
        <Text className="font-gsemibold text-lg text-bark">Редактировать профиль</Text>
        <View className="h-10 w-10" />
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <ProfileForm
          initial={profile ?? null}
          submitLabel="Сохранить"
          submitting={updateProfile.isPending}
          onSubmit={(body) => {
            updateProfile.mutate(body, {
              onSuccess: () => {
                successTap();
                router.back();
              },
            });
          }}
        />
      </KeyboardAwareScrollView>
    </View>
  );
}
