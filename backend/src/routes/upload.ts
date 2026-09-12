import { Hono } from "hono";
import type { AppVariables } from "../auth";

const uploadRouter = new Hono<{ Variables: AppVariables }>();

// Proxies file uploads (photos, voice messages, avatars) to Vibecode storage → CDN URL
uploadRouter.post("/", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: { message: "Не авторизован", code: "UNAUTHORIZED" } }, 401);

  const formData = await c.req.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return c.json({ error: { message: "Файл не передан", code: "NO_FILE" } }, 400);
  }

  const storageForm = new FormData();
  storageForm.append("file", file);

  const response = await fetch("https://storage.vibecodeapp.com/v1/files/upload", {
    method: "POST",
    body: storageForm,
  });

  if (!response.ok) {
    const err = (await response.json().catch(() => null)) as { error?: string } | null;
    return c.json({ error: { message: err?.error || "Не удалось загрузить файл", code: "UPLOAD_FAILED" } }, 500);
  }

  const result = (await response.json()) as {
    file: { id: string; url: string; originalFilename: string; contentType: string; sizeBytes: number };
  };

  return c.json({
    data: {
      id: result.file.id,
      url: result.file.url,
      filename: result.file.originalFilename,
      contentType: result.file.contentType,
      sizeBytes: result.file.sizeBytes,
    },
  });
});

export { uploadRouter };
