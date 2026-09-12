import React, { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { OtpInput } from "react-native-otp-entry";
import { ArrowLeft, MailOpen } from "lucide-react-native";
import { authClient } from "@/lib/auth/auth-client";
import { useInvalidateSession } from "@/lib/auth/use-session";
import { colors } from "@/lib/theme";

export default function VerifyOTP() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [resent, setResent] = useState(false);
  const invalidateSession = useInvalidateSession();

  const handleVerifyOTP = async (otp: string) => {
    if (!email) return;
    setError(null);
    setVerifying(true);
    const result = await authClient.signIn.emailOtp({ email: email.trim(), otp });

    if (result.error) {
      setVerifying(false);
      setError("Неверный код. Проверьте письмо и попробуйте ещё раз.");
    } else {
      await invalidateSession();
      // Stack.Protected handles navigation automatically
    }
  };

  const resend = async () => {
    if (!email) return;
    setResent(false);
    const result = await authClient.emailOtp.sendVerificationOtp({
      email: email.trim(),
      type: "sign-in",
    });
    if (result.error) {
      setError(result.error.message || "Не удалось отправить код повторно");
    } else {
      setResent(true);
      setError(null);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-field" edges={["top", "bottom"]} testID="verify-otp-screen">
      <View className="flex-1 px-7">
        <Pressable
          testID="back-button"
          onPress={() => router.back()}
          className="mt-4 h-11 w-11 items-center justify-center rounded-full border border-wheat bg-parchment active:opacity-70"
        >
          <ArrowLeft size={20} color={colors.bark} />
        </Pressable>

        <View className="mt-8 h-16 w-16 items-center justify-center rounded-3xl bg-leaf/25">
          <MailOpen size={28} color={colors.forest} />
        </View>

        <Text className="mt-5 font-display text-3xl text-bark">Проверьте почту</Text>
        <Text className="mt-2 text-base leading-6 text-stone">
          Мы отправили 6-значный код на{"\n"}
          <Text className="font-gsemibold text-bark">{email}</Text>
        </Text>

        <View className="mt-8">
          <OtpInput
            numberOfDigits={6}
            onFilled={handleVerifyOTP}
            type="numeric"
            focusColor={colors.forest}
            theme={{
              pinCodeContainerStyle: {
                backgroundColor: colors.parchment,
                borderColor: colors.wheat,
                borderWidth: 1.5,
                borderRadius: 14,
                width: 48,
                height: 56,
              },
              pinCodeTextStyle: {
                color: colors.bark,
                fontFamily: "GolosText_600SemiBold",
                fontSize: 22,
              },
            }}
          />
        </View>

        {verifying ? (
          <View className="mt-6 flex-row items-center justify-center gap-2">
            <ActivityIndicator color={colors.forest} />
            <Text className="text-sm text-stone">Проверяем код…</Text>
          </View>
        ) : null}

        {error ? (
          <View className="mt-6 rounded-2xl bg-clay/10 px-4 py-3">
            <Text className="text-sm font-gmedium text-clay">{error}</Text>
          </View>
        ) : null}

        {resent ? (
          <View className="mt-6 rounded-2xl bg-leaf/15 px-4 py-3">
            <Text className="text-sm font-gmedium text-forest">Код отправлен повторно</Text>
          </View>
        ) : null}

        <Pressable testID="resend-button" onPress={resend} className="mt-8 items-center py-2 active:opacity-70">
          <Text className="font-gmedium text-sm text-moss">Отправить код ещё раз</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
