import { Platform } from "react-native";
import { authClient } from "./auth/auth-client";

export type UploadResult = {
  id: string;
  url: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
};

/** Uploads a local file (photo / voice message / avatar) and returns its CDN URL. */
export async function uploadFile(
  uri: string,
  filename: string,
  mimeType: string
): Promise<UploadResult> {
  const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL!;

  const formData = new FormData();
  if (Platform.OS === "web") {
    // On web the uri is a blob: URL — convert to a real File
    const res = await fetch(uri);
    const blob = await res.blob();
    formData.append("file", new File([blob], filename, { type: mimeType || blob.type }));
  } else {
    formData.append("file", { uri, type: mimeType, name: filename } as any);
  }

  const headers: Record<string, string> = {};
  if (Platform.OS !== "web") {
    headers.Cookie = await authClient.getCookie();
  }

  const response = await fetch(`${baseUrl}/api/upload`, {
    method: "POST",
    body: formData,
    credentials: "include",
    headers,
  });

  const json = await response.json().catch(() => null);
  if (!response.ok || !json?.data) {
    throw new Error(json?.error?.message || "Не удалось загрузить файл");
  }
  return json.data as UploadResult;
}
