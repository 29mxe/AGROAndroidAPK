import React, { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Mail, MapPin, Mic, Sprout, Users, Wheat } from "lucide-react-native";
import { authClient } from "@/lib/auth/auth-client";
import { colors } from "@/lib/theme";
import { cn } from "@/lib/cn";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const handleSendOTP = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(trimmed)) {
      setError("Введите корректный адрес почты");
      return;
    }
    setError(null);
    setSending(true);
    const result = await authClient.emailOtp.sendVerificationOtp({
      email: trimmed,
      type: "sign-in",
    });
    setSending(false);

    if (result.error) {
      setError(result.error.message || "Не удалось отправить код. Попробуйте ещё раз.");
    } else {
      router.push({ pathname: "/verify-otp", params: { email: trimmed } });
    }
  };

  return (
    <View className="flex-1 bg-field" testID="sign-in-screen">
      <KeyboardAwareScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <LinearGradient
          colors={[colors.forest, "#3C5E42", colors.moss]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingBottom: 36,
            borderBottomLeftRadius: 36,
            borderBottomRightRadius: 36,
          }}
        >
          <SafeAreaView edges={["top"]}>
            <View className="px-7 pt-14">
              <View
                className="h-16 w-16 items-center justify-center rounded-3xl bg-parchment/15"
                style={{ borderWidth: 1, borderColor: "rgba(253,250,242,0.3)" }}
              >
                <Wheat size={32} color={colors.parchment} />
              </View>
              <Text className="mt-5 font-display text-5xl text-parchment">Агросеть</Text>
              <Text className="mt-2 text-base leading-6 text-parchment/85">
                Социальная сеть для фермеров{"\n"}и агрономов
              </Text>

              <View className="mt-6 gap-2.5">
                <HeroPoint icon={Users} text="Делитесь опытом с коллегами" />
                <HeroPoint icon={MapPin} text="Смотрите посты на карте полей" />
                <HeroPoint icon={Mic} text="Записывайте голосовые заметки" />
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>

        {/* Form */}
        <View className="flex-1 justify-between px-7 pb-8 pt-8">
          <View className="gap-4">
            <Text className="font-gsemibold text-xl text-bark">Вход и регистрация</Text>
            <View className="flex-row items-center gap-3 rounded-2xl border border-wheat bg-parchment px-4">
              <Mail size={18} color={colors.stone} />
              <TextInput
                testID="email-input"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                placeholder="Ваша почта"
                placeholderTextColor={colors.stone}
                className="flex-1 py-4 text-base text-bark"
                style={{ fontFamily: "GolosText_400Regular" }}
                onSubmitEditing={handleSendOTP}
              />
            </View>

            {error ? (
              <View className="rounded-2xl bg-clay/10 px-4 py-3">
                <Text className="text-sm font-gmedium text-clay">{error}</Text>
              </View>
            ) : null}

            <Pressable
              testID="send-code-button"
              onPress={handleSendOTP}
              disabled={sending}
              className={cn(
                "items-center rounded-full bg-forest py-4 active:opacity-90",
                sending && "opacity-60"
              )}
            >
              {sending ? (
                <ActivityIndicator color={colors.parchment} />
              ) : (
                <Text className="font-gsemibold text-base text-parchment">Получить код</Text>
              )}
            </Pressable>
          </View>

          <View className="mt-6 flex-row items-start gap-2 px-1">
            <Sprout size={15} color={colors.moss} style={{ marginTop: 2 }} />
            <Text className="flex-1 text-xs leading-5 text-stone">
              Мы отправим код входа на почту. Если аккаунта ещё нет — он создастся автоматически.
            </Text>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

function HeroPoint({ icon: Icon, text }: { icon: typeof Users; text: string }) {
  return (
    <View className="flex-row items-center gap-2.5">
      <Icon size={15} color={colors.leaf} />
      <Text className="text-sm text-parchment/90">{text}</Text>
    </View>
  );
}
