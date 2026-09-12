import React from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Wheat } from "lucide-react-native";
import { ProfileForm } from "@/components/ProfileForm";
import { useUpdateProfile } from "@/lib/queries";
import { colors } from "@/lib/theme";
import { successTap } from "@/lib/utils";

export default function Onboarding() {
  const updateProfile = useUpdateProfile();

  return (
    <SafeAreaView className="flex-1 bg-field" edges={["top", "bottom"]} testID="onboarding-screen">
      <KeyboardAwareScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="mt-6 flex-row items-center gap-2.5">
          <View className="h-10 w-10 items-center justify-center rounded-2xl bg-forest">
            <Wheat size={20} color={colors.parchment} />
          </View>
          <Text className="font-display text-2xl text-forest">Агросеть</Text>
        </View>

        <Text className="mt-6 font-display text-3xl text-bark">Расскажите о себе</Text>
        <Text className="mb-6 mt-2 text-base leading-6 text-stone">
          Эта информация будет видна другим участникам сообщества
        </Text>

        <ProfileForm
          submitLabel="Начать"
          submitting={updateProfile.isPending}
          onSubmit={(body) => {
            updateProfile.mutate(body, {
              onSuccess: () => successTap(),
              // Stack.Protected switches to the app once specialization is set
            });
          }}
        />
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
