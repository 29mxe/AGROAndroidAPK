import { formatDistanceToNowStrict } from "date-fns";
import { ru } from "date-fns/locale";
import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

export const timeAgo = (iso: string): string => {
  try {
    return formatDistanceToNowStrict(new Date(iso), { addSuffix: true, locale: ru });
  } catch {
    return "";
  }
};

export const formatSeconds = (total: number): string => {
  const s = Math.max(0, Math.floor(total));
  const m = Math.floor(s / 60);
  const rest = s % 60;
  return `${m}:${rest.toString().padStart(2, "0")}`;
};

export const lightTap = () => {
  if (Platform.OS === "web") return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
};

export const successTap = () => {
  if (Platform.OS === "web") return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
};
