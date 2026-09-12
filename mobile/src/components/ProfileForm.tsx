import React, { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { Camera, Minus, Plus, Sprout, Tractor } from "lucide-react-native";
import { colors } from "@/lib/theme";
import type { Specialization, UpdateProfileBody, UserProfile } from "@/lib/types";
import { pickAvatar } from "@/lib/file-picker";
import { uploadFile } from "@/lib/upload";
import { cn } from "@/lib/cn";
import { lightTap } from "@/lib/utils";
import { Avatar } from "./Avatar";

interface Props {
  initial?: UserProfile | null;
  submitLabel: string;
  submitting: boolean;
  onSubmit: (body: UpdateProfileBody) => void;
}

export function ProfileForm({ initial, submitLabel, submitting, onSubmit }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [specialization, setSpecialization] = useState<Specialization | null>(
    initial?.specialization ?? null
  );
  const [experienceYears, setExperienceYears] = useState<number>(initial?.experienceYears ?? 0);
  const [city, setCity] = useState(initial?.city ?? "");
  const [bio, setBio] = useState(initial?.bio ?? "");
  const [image, setImage] = useState<string | null>(initial?.image ?? null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changeAvatar = async () => {
    try {
      const file = await pickAvatar();
      if (!file) return;
      setUploadingAvatar(true);
      const result = await uploadFile(file.uri, file.filename, file.mimeType);
      setImage(result.url);
    } catch {
      setError("Не удалось загрузить фото. Попробуйте ещё раз.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const submit = () => {
    setError(null);
    if (!name.trim()) {
      setError("Укажите ваше имя");
      return;
    }
    if (!specialization) {
      setError("Выберите специализацию");
      return;
    }
    if (!city.trim()) {
      setError("Укажите город");
      return;
    }
    onSubmit({
      name: name.trim(),
      specialization,
      experienceYears,
      city: city.trim(),
      ...(bio.trim() ? { bio: bio.trim() } : {}),
      ...(image ? { image } : {}),
    });
  };

  const roleCard = (role: Specialization, label: string, hint: string) => {
    const selected = specialization === role;
    const Icon = role === "AGRONOMIST" ? Sprout : Tractor;
    return (
      <Pressable
        testID={`role-${role.toLowerCase()}`}
        onPress={() => {
          lightTap();
          setSpecialization(role);
        }}
        className={cn(
          "flex-1 items-center gap-2 rounded-2xl border-2 px-3 py-4",
          selected ? "border-forest bg-forest" : "border-wheat bg-parchment"
        )}
      >
        <Icon size={26} color={selected ? colors.parchment : colors.moss} strokeWidth={2} />
        <Text className={cn("font-gsemibold text-base", selected ? "text-parchment" : "text-bark")}>
          {label}
        </Text>
        <Text
          className={cn("text-center text-xs", selected ? "text-parchment/80" : "text-stone")}
          numberOfLines={2}
        >
          {hint}
        </Text>
      </Pressable>
    );
  };

  return (
    <View className="gap-5">
      {/* Avatar */}
      <View className="items-center gap-2">
        <Pressable testID="avatar-picker" onPress={changeAvatar} className="active:opacity-80">
          <Avatar name={name || "?"} uri={image} size={96} />
          <View
            className="absolute -bottom-1 -right-1 h-9 w-9 items-center justify-center rounded-full bg-forest"
            style={{ borderWidth: 3, borderColor: colors.field }}
          >
            {uploadingAvatar ? (
              <ActivityIndicator size="small" color={colors.parchment} />
            ) : (
              <Camera size={16} color={colors.parchment} />
            )}
          </View>
        </Pressable>
        <Text className="text-xs text-stone">Фото профиля</Text>
      </View>

      {/* Name */}
      <View className="gap-1.5">
        <Text className="font-gmedium text-sm text-bark">Имя и фамилия</Text>
        <TextInput
          testID="name-input"
          value={name}
          onChangeText={setName}
          placeholder="Например, Иван Крылов"
          placeholderTextColor={colors.stone}
          className="rounded-2xl border border-wheat bg-parchment px-4 py-3.5 text-base text-bark"
          style={{ fontFamily: "GolosText_400Regular" }}
        />
      </View>

      {/* Role */}
      <View className="gap-1.5">
        <Text className="font-gmedium text-sm text-bark">Кто вы?</Text>
        <View className="flex-row gap-3">
          {roleCard("FARMER", "Фермер", "Веду своё хозяйство")}
          {roleCard("AGRONOMIST", "Агроном", "Консультирую и помогаю")}
        </View>
      </View>

      {/* Experience */}
      <View className="gap-1.5">
        <Text className="font-gmedium text-sm text-bark">Опыт работы</Text>
        <View className="flex-row items-center justify-between rounded-2xl border border-wheat bg-parchment px-4 py-2.5">
          <Text className="text-base text-bark">
            {experienceYears === 0 ? "Меньше года" : `${experienceYears} ${yearsWord(experienceYears)}`}
          </Text>
          <View className="flex-row items-center gap-3">
            <Pressable
              testID="experience-minus"
              onPress={() => {
                lightTap();
                setExperienceYears((v) => Math.max(0, v - 1));
              }}
              className="h-9 w-9 items-center justify-center rounded-full bg-wheat active:opacity-70"
            >
              <Minus size={16} color={colors.bark} />
            </Pressable>
            <Pressable
              testID="experience-plus"
              onPress={() => {
                lightTap();
                setExperienceYears((v) => Math.min(70, v + 1));
              }}
              className="h-9 w-9 items-center justify-center rounded-full bg-forest active:opacity-80"
            >
              <Plus size={16} color={colors.parchment} />
            </Pressable>
          </View>
        </View>
      </View>

      {/* City */}
      <View className="gap-1.5">
        <Text className="font-gmedium text-sm text-bark">Город</Text>
        <TextInput
          testID="city-input"
          value={city}
          onChangeText={setCity}
          placeholder="Например, Краснодар"
          placeholderTextColor={colors.stone}
          className="rounded-2xl border border-wheat bg-parchment px-4 py-3.5 text-base text-bark"
          style={{ fontFamily: "GolosText_400Regular" }}
        />
      </View>

      {/* Bio */}
      <View className="gap-1.5">
        <Text className="font-gmedium text-sm text-bark">
          О себе <Text className="text-stone">(необязательно)</Text>
        </Text>
        <TextInput
          testID="bio-input"
          value={bio}
          onChangeText={setBio}
          placeholder="Чем занимаетесь, какие культуры выращиваете…"
          placeholderTextColor={colors.stone}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          className="min-h-[84px] rounded-2xl border border-wheat bg-parchment px-4 py-3.5 text-base text-bark"
          style={{ fontFamily: "GolosText_400Regular" }}
        />
      </View>

      {error ? (
        <View className="rounded-2xl bg-clay/10 px-4 py-3">
          <Text className="text-sm font-gmedium text-clay">{error}</Text>
        </View>
      ) : null}

      <Pressable
        testID="profile-submit-button"
        onPress={submit}
        disabled={submitting || uploadingAvatar}
        className={cn(
          "items-center rounded-full bg-forest py-4 active:opacity-90",
          (submitting || uploadingAvatar) && "opacity-60"
        )}
      >
        {submitting ? (
          <ActivityIndicator color={colors.parchment} />
        ) : (
          <Text className="font-gsemibold text-base text-parchment">{submitLabel}</Text>
        )}
      </Pressable>
    </View>
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
