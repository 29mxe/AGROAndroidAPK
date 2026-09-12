import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Image } from "expo-image";
import * as Location from "expo-location";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import {
  Camera,
  Check,
  FileText,
  ImagePlus,
  MapPin,
  ShieldCheck,
  TriangleAlert,
  WifiOff,
  X,
} from "lucide-react-native";
import { VoiceRecorder, type RecordedAudio } from "@/components/VoiceRecorder";
import { pickImage, takePhoto, type PickedFile } from "@/lib/file-picker";
import { uploadFile } from "@/lib/upload";
import { useCreatePost } from "@/lib/queries";
import { colors } from "@/lib/theme";
import { cn } from "@/lib/cn";
import { lightTap, successTap } from "@/lib/utils";
import {
  CROPS,
  FIELD_STATUSES,
  coarsenCoordinate,
  composePostText,
  fieldStatusInfo,
  type FieldStatus,
  type LocationPrivacy,
} from "@/lib/field-meta";
import { draftHasContent, useFieldStore } from "@/lib/field-store";
import { isNetworkError, isOnline } from "@/lib/network";

type GeoTag = {
  latitude: number;
  longitude: number;
  /** city-level name (used for "Точная точка") */
  name: string | null;
  /** district/region-level name (used for "Только район") */
  areaName: string | null;
};

type DraftPrompt = "unchecked" | "pending" | "done";

export default function CreatePostScreen() {
  const insets = useSafeAreaInsets();
  const createPost = useCreatePost();

  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<PickedFile | null>(null);
  const [audio, setAudio] = useState<RecordedAudio | null>(null);
  const [geo, setGeo] = useState<GeoTag | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offlineNotice, setOfflineNotice] = useState(false);

  // Field-observation metadata (kept on the device + as hashtags in the text)
  const [status, setStatus] = useState<FieldStatus | null>(null);
  const [crop, setCrop] = useState<string | null>(null);
  const [needsAdvice, setNeedsAdvice] = useState(false);
  const [privacy, setPrivacy] = useState<LocationPrivacy>("area");

  // Offline draft
  const draft = useFieldStore((s) => s.draft);
  const hydrated = useFieldStore((s) => s.hydrated);
  const saveDraft = useFieldStore((s) => s.saveDraft);
  const clearDraft = useFieldStore((s) => s.clearDraft);
  const updatePostMeta = useFieldStore((s) => s.updatePostMeta);
  const [draftPrompt, setDraftPrompt] = useState<DraftPrompt>("unchecked");
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);
  const publishedRef = useRef(false);
  const inputRef = useRef<TextInput>(null);

  // Focus the text field once the draft question is settled (keeps the old auto-focus behaviour)
  useEffect(() => {
    if (draftPrompt !== "done") return;
    const timer = setTimeout(() => inputRef.current?.focus(), 150);
    return () => clearTimeout(timer);
  }, [draftPrompt]);

  useEffect(() => {
    if (!hydrated || draftPrompt !== "unchecked") return;
    setDraftPrompt(draftHasContent(draft) ? "pending" : "done");
  }, [hydrated, draft, draftPrompt]);

  const restoreDraft = () => {
    lightTap();
    if (draft) {
      setText(draft.text);
      setStatus(draft.status);
      setCrop(draft.crop);
      setNeedsAdvice(draft.needsAdvice);
      setPrivacy(draft.locationPrivacy);
      if (draft.photoUri) {
        setPhoto({
          uri: draft.photoUri,
          filename: draft.photoName ?? `photo-${Date.now()}.jpg`,
          mimeType: draft.photoMime ?? "image/jpeg",
        });
      }
    }
    setDraftPrompt("done");
  };

  const discardDraft = () => {
    lightTap();
    clearDraft();
    setDraftPrompt("done");
  };

  const persistDraftNow = () => {
    saveDraft({
      text,
      status,
      crop,
      needsAdvice,
      locationPrivacy: privacy,
      photoUri: photo?.uri ?? null,
      photoName: photo?.filename ?? null,
      photoMime: photo?.mimeType ?? null,
    });
    setDraftSavedAt(Date.now());
  };

  // Autosave (debounced) — the report survives app restarts and lost connectivity.
  useEffect(() => {
    if (draftPrompt !== "done" || publishing || publishedRef.current) return;
    const hasContent = text.trim().length > 0 || !!photo || !!status || !!crop || needsAdvice;
    const timer = setTimeout(() => {
      if (publishedRef.current) return;
      if (hasContent) {
        saveDraft({
          text,
          status,
          crop,
          needsAdvice,
          locationPrivacy: privacy,
          photoUri: photo?.uri ?? null,
          photoName: photo?.filename ?? null,
          photoMime: photo?.mimeType ?? null,
        });
        setDraftSavedAt(Date.now());
      } else {
        clearDraft();
        setDraftSavedAt(null);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [text, photo, status, crop, needsAdvice, privacy, draftPrompt, publishing, saveDraft, clearDraft]);

  const detectLocation = async () => {
    setGeoLoading(true);
    try {
      const { status: permission } = await Location.requestForegroundPermissionsAsync();
      if (permission !== "granted") {
        setGeo(null);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      let name: string | null = null;
      let areaName: string | null = null;
      try {
        const places = await Location.reverseGeocodeAsync({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        const place = places[0];
        name = place?.city || place?.subregion || place?.region || null;
        areaName = place?.region || place?.subregion || place?.city || null;
      } catch {
        // reverse geocoding is unavailable on web — keep coordinates without a name
      }
      setGeo({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, name, areaName });
    } catch {
      setGeo(null);
    } finally {
      setGeoLoading(false);
    }
  };

  // Try to attach the location right away — posts appear on the map
  useEffect(() => {
    detectLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addPhoto = async (fromCamera: boolean) => {
    lightTap();
    const file = fromCamera ? await takePhoto() : await pickImage();
    if (file) setPhoto(file);
  };

  const publish = async () => {
    if (!text.trim()) {
      setError("Напишите, что происходит на поле");
      return;
    }
    setError(null);
    setOfflineNotice(false);
    setPublishing(true);
    try {
      // No connection: keep everything on the device instead of failing the upload.
      if (!(await isOnline())) {
        persistDraftNow();
        setOfflineNotice(true);
        return;
      }

      let imageUrl: string | undefined;
      let audioUrl: string | undefined;

      if (photo) {
        const uploaded = await uploadFile(photo.uri, photo.filename, photo.mimeType);
        imageUrl = uploaded.url;
      }
      if (audio) {
        const uploaded = await uploadFile(
          audio.uri,
          `voice-${Date.now()}.m4a`,
          Platform.OS === "web" ? "audio/webm" : "audio/m4a"
        );
        audioUrl = uploaded.url;
      }

      // "Только район": the exact field position never leaves the device.
      const location = geo
        ? privacy === "area"
          ? {
              latitude: coarsenCoordinate(geo.latitude),
              longitude: coarsenCoordinate(geo.longitude),
              name: geo.areaName ?? geo.name,
            }
          : { latitude: geo.latitude, longitude: geo.longitude, name: geo.name ?? geo.areaName }
        : null;

      const created = await createPost.mutateAsync({
        text: composePostText(text, { needsAdvice, status, crop }),
        ...(imageUrl ? { imageUrl } : {}),
        ...(audioUrl ? { audioUrl, audioDuration: audio?.duration } : {}),
        ...(location
          ? {
              latitude: location.latitude,
              longitude: location.longitude,
              ...(location.name ? { locationName: location.name } : {}),
            }
          : {}),
      });

      if (created?.id) {
        updatePostMeta(created.id, {
          needsAdvice,
          resolved: false,
          status,
          crop,
          locationPrivacy: privacy,
        });
      }

      publishedRef.current = true;
      clearDraft();
      successTap();
      router.back();
    } catch (e) {
      if (isNetworkError(e)) {
        persistDraftNow();
        setOfflineNotice(true);
      } else {
        setError(e instanceof Error ? e.message : "Не удалось опубликовать наблюдение");
      }
    } finally {
      setPublishing(false);
    }
  };

  const topPadding = Platform.OS === "ios" ? 14 : insets.top + 10;
  const canPublish = !publishing && text.trim().length > 0 && draftPrompt !== "pending";

  return (
    <View className="flex-1 bg-field" testID="create-post-screen">
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        {/* Header */}
        <View
          className="flex-row items-center justify-between border-b border-wheat px-4 pb-3"
          style={{ paddingTop: topPadding }}
        >
          <Pressable
            testID="close-create-post"
            onPress={() => router.back()}
            className="h-11 w-11 items-center justify-center rounded-full bg-wheat/70 active:opacity-70"
          >
            <X size={20} color={colors.bark} />
          </Pressable>
          <Text className="font-gsemibold text-lg text-bark">Полевой отчёт</Text>
          <Pressable
            testID="publish-button"
            onPress={publish}
            disabled={!canPublish}
            className={cn(
              "min-h-[44px] justify-center rounded-full bg-forest px-5 active:opacity-90",
              !canPublish && "opacity-50"
            )}
          >
            {publishing ? (
              <ActivityIndicator size="small" color={colors.parchment} />
            ) : (
              <Text className="font-gsemibold text-parchment" style={{ fontSize: 14 }}>
                Опубликовать
              </Text>
            )}
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 16 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Unfinished report found on this device */}
          {draftPrompt === "pending" && draft ? (
            <View className="gap-3 rounded-2xl border border-wheat bg-parchment p-4" testID="draft-banner">
              <View className="flex-row items-center gap-2.5">
                <FileText size={20} color={colors.soil} />
                <Text className="flex-1 font-gsemibold text-bark" style={{ fontSize: 16 }}>
                  Найден незавершённый полевой отчёт
                </Text>
              </View>
              {draft.text.trim() ? (
                <Text className="text-sm leading-5 text-stone" numberOfLines={2}>
                  «{draft.text.trim()}»
                </Text>
              ) : null}
              <View className="flex-row gap-2.5">
                <Pressable
                  testID="draft-continue-button"
                  onPress={restoreDraft}
                  className="min-h-[48px] flex-1 items-center justify-center rounded-xl bg-forest active:opacity-90"
                >
                  <Text className="font-gsemibold text-parchment" style={{ fontSize: 15 }}>
                    Продолжить
                  </Text>
                </Pressable>
                <Pressable
                  testID="draft-discard-button"
                  onPress={discardDraft}
                  className="min-h-[48px] flex-1 items-center justify-center rounded-xl border border-wheat bg-field active:opacity-70"
                >
                  <Text className="font-gsemibold text-clay" style={{ fontSize: 15 }}>
                    Удалить
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {/* Field status */}
          <View className="gap-2">
            <SectionLabel>Что на поле?</SectionLabel>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flexGrow: 0, marginHorizontal: -20 }}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
              keyboardShouldPersistTaps="handled"
            >
              {FIELD_STATUSES.map((s) => {
                const info = fieldStatusInfo[s];
                const selected = status === s;
                return (
                  <Pressable
                    key={s}
                    testID={`status-option-${s}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      lightTap();
                      setStatus(selected ? null : s);
                    }}
                    className={cn(
                      "min-h-[48px] flex-row items-center gap-1.5 rounded-xl border px-4",
                      selected ? "border-forest bg-forest" : "border-wheat bg-parchment active:bg-wheat/60"
                    )}
                  >
                    <Text style={{ fontSize: 16 }}>{info.emoji}</Text>
                    <Text
                      className={cn(selected ? "font-gsemibold text-parchment" : "font-gmedium text-bark")}
                      style={{ fontSize: 15 }}
                    >
                      {info.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <TextInput
            ref={inputRef}
            testID="post-text-input"
            value={text}
            onChangeText={setText}
            placeholder="Что происходит на поле? Коротко и по делу"
            placeholderTextColor={colors.stone}
            multiline
            textAlignVertical="top"
            className="min-h-[110px] rounded-2xl border border-wheat bg-parchment px-4 py-3 text-bark"
            style={{ fontFamily: "GolosText_400Regular", fontSize: 17, lineHeight: 25 }}
          />

          {/* Photo — the most useful part of a field report */}
          {photo ? (
            <View>
              <Image
                source={{ uri: photo.uri }}
                style={{ width: "100%", height: 240, borderRadius: 14, backgroundColor: colors.wheat }}
                contentFit="cover"
              />
              <Pressable
                testID="remove-photo-button"
                onPress={() => setPhoto(null)}
                className="absolute right-2.5 top-2.5 h-10 w-10 items-center justify-center rounded-full active:opacity-80"
                style={{ backgroundColor: "rgba(51,41,30,0.65)" }}
              >
                <X size={18} color={colors.parchment} />
              </Pressable>
            </View>
          ) : (
            <View className="flex-row gap-3">
              {Platform.OS !== "web" ? (
                <AttachButton
                  testID="attach-camera-button"
                  icon={Camera}
                  label="Снять фото"
                  onPress={() => addPhoto(true)}
                />
              ) : null}
              <AttachButton
                testID="attach-gallery-button"
                icon={ImagePlus}
                label="Из галереи"
                onPress={() => addPhoto(false)}
              />
            </View>
          )}

          {/* Needs advice toggle */}
          <Pressable
            testID="needs-advice-toggle"
            accessibilityRole="switch"
            accessibilityState={{ checked: needsAdvice }}
            onPress={() => {
              lightTap();
              setNeedsAdvice((v) => !v);
            }}
            className={cn(
              "flex-row items-center gap-3 rounded-2xl border p-4 active:opacity-90",
              needsAdvice ? "border-clay bg-clay/10" : "border-wheat bg-parchment"
            )}
          >
            <View
              className={cn(
                "h-11 w-11 items-center justify-center rounded-xl",
                needsAdvice ? "bg-clay" : "bg-wheat"
              )}
            >
              <TriangleAlert size={22} color={needsAdvice ? colors.parchment : colors.soil} strokeWidth={2.4} />
            </View>
            <View className="flex-1 gap-0.5">
              <Text className="font-gsemibold text-bark" style={{ fontSize: 16 }}>
                Нужен совет
              </Text>
              <Text className="text-sm leading-5 text-stone">
                Коллеги увидят заметный бейдж и поймут, что вы ждёте помощи
              </Text>
            </View>
            <View
              className={cn(
                "h-7 w-7 items-center justify-center rounded-full border-2",
                needsAdvice ? "border-clay bg-clay" : "border-stone/50 bg-parchment"
              )}
            >
              {needsAdvice ? <Check size={16} color={colors.parchment} strokeWidth={3} /> : null}
            </View>
          </Pressable>

          {/* Crop */}
          <View className="gap-2">
            <SectionLabel>Культура</SectionLabel>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flexGrow: 0, marginHorizontal: -20 }}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
              keyboardShouldPersistTaps="handled"
            >
              {CROPS.map((c) => {
                const selected = crop === c.id;
                return (
                  <Pressable
                    key={c.id}
                    testID={`crop-option-${c.id}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      lightTap();
                      setCrop(selected ? null : c.id);
                    }}
                    className={cn(
                      "min-h-[44px] flex-row items-center gap-1.5 rounded-full border px-3.5",
                      selected ? "border-moss bg-moss" : "border-wheat bg-parchment active:bg-wheat/60"
                    )}
                  >
                    <Text style={{ fontSize: 14 }}>{c.emoji}</Text>
                    <Text
                      className={cn(selected ? "font-gsemibold text-parchment" : "font-gmedium text-bark")}
                      style={{ fontSize: 14 }}
                    >
                      {c.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Voice message (existing feature, unchanged) */}
          <VoiceRecorder value={audio} onChange={setAudio} />

          {/* Location */}
          <View className="gap-3">
            <View className="flex-row">
              {geoLoading ? (
                <View className="min-h-[44px] flex-row items-center gap-2 rounded-full bg-wheat/70 px-4">
                  <ActivityIndicator size="small" color={colors.moss} />
                  <Text className="font-gmedium text-sm text-stone">Определяем геопозицию…</Text>
                </View>
              ) : geo ? (
                <View className="min-h-[44px] flex-row items-center gap-1.5 rounded-full bg-moss/15 py-1.5 pl-3.5 pr-1.5">
                  <MapPin size={15} color={colors.moss} />
                  <Text className="font-gmedium text-sm text-moss">
                    {(privacy === "area" ? geo.areaName ?? geo.name : geo.name ?? geo.areaName) ||
                      "Геометка добавлена"}
                  </Text>
                  <Pressable
                    testID="remove-geo-button"
                    onPress={() => setGeo(null)}
                    className="h-8 w-8 items-center justify-center rounded-full bg-moss/20 active:opacity-70"
                  >
                    <X size={14} color={colors.moss} />
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  testID="add-geo-button"
                  onPress={detectLocation}
                  className="min-h-[44px] flex-row items-center gap-1.5 rounded-full border border-dashed border-stone/60 px-4 active:opacity-70"
                >
                  <MapPin size={15} color={colors.stone} />
                  <Text className="font-gmedium text-sm text-stone">Добавить геометку</Text>
                </Pressable>
              )}
            </View>

            {geo ? (
              <View className="gap-2 rounded-2xl border border-wheat bg-parchment p-4" testID="location-privacy">
                <View className="flex-row items-center gap-2">
                  <ShieldCheck size={18} color={colors.forest} strokeWidth={2.4} />
                  <Text className="font-gsemibold text-bark" style={{ fontSize: 15 }}>
                    Кто увидит местоположение?
                  </Text>
                </View>
                <RadioRow
                  testID="privacy-exact"
                  selected={privacy === "exact"}
                  label="Точная точка"
                  hint="Точка поля будет видна на карте"
                  onPress={() => setPrivacy("exact")}
                />
                <RadioRow
                  testID="privacy-area"
                  selected={privacy === "area"}
                  label="Только район"
                  hint="Точные координаты поля не будут показаны другим пользователям"
                  onPress={() => setPrivacy("area")}
                />
              </View>
            ) : null}
          </View>

          {error ? (
            <View className="rounded-2xl bg-clay/10 px-4 py-3" testID="create-post-error">
              <Text className="font-gmedium text-sm text-clay">{error}</Text>
            </View>
          ) : null}

          {offlineNotice ? (
            <View className="flex-row items-center gap-3 rounded-2xl bg-wheat px-4 py-3" testID="offline-notice">
              <WifiOff size={18} color={colors.soil} />
              <Text className="flex-1 font-gmedium text-sm leading-5 text-bark">
                Нет сети. Наблюдение сохранено как черновик.
              </Text>
            </View>
          ) : null}

          {draftSavedAt ? (
            <Text className="px-1 font-gmedium text-xs text-stone" testID="draft-saved-status">
              ✓ Черновик сохранён на устройстве
            </Text>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="px-1 font-gsemibold text-stone" style={{ fontSize: 13, letterSpacing: 0.3 }}>
      {children}
    </Text>
  );
}

function RadioRow({
  selected,
  label,
  hint,
  onPress,
  testID,
}: {
  selected: boolean;
  label: string;
  hint: string;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={() => {
        if (!selected) lightTap();
        onPress();
      }}
      className="min-h-[48px] flex-row items-center gap-3 active:opacity-80"
    >
      <View
        className={cn(
          "h-6 w-6 items-center justify-center rounded-full border-2",
          selected ? "border-forest" : "border-stone/50"
        )}
      >
        {selected ? <View className="h-3 w-3 rounded-full bg-forest" /> : null}
      </View>
      <View className="flex-1">
        <Text className="font-gsemibold text-bark" style={{ fontSize: 15 }}>
          {label}
        </Text>
        <Text className="text-xs leading-4 text-stone">{hint}</Text>
      </View>
    </Pressable>
  );
}

function AttachButton({
  icon: Icon,
  label,
  onPress,
  testID,
}: {
  icon: typeof Camera;
  label: string;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      className="min-h-[52px] flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-wheat bg-parchment px-4 active:bg-wheat/50"
    >
      <Icon size={20} color={colors.moss} strokeWidth={2.2} />
      <Text className="font-gsemibold text-bark" style={{ fontSize: 15 }}>
        {label}
      </Text>
    </Pressable>
  );
}
