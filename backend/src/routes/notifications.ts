import { Hono } from "hono";
import { prisma } from "../prisma";
import type { AppVariables } from "../auth";
import type { AppNotification } from "../types";

const notificationsRouter = new Hono<{ Variables: AppVariables }>();

notificationsRouter.get("/", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: { message: "Не авторизован", code: "UNAUTHORIZED" } }, 401);

  const rows = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      actor: { select: { id: true, name: true, image: true, specialization: true, city: true } },
      post: { select: { id: true, text: true, imageUrl: true } },
    },
  });

  // Fetch comment texts for comment notifications
  const commentIds = rows.map((r) => r.commentId).filter((v): v is string => !!v);
  const comments = commentIds.length
    ? await prisma.comment.findMany({ where: { id: { in: commentIds } }, select: { id: true, text: true } })
    : [];
  const commentTextById = new Map(comments.map((cm) => [cm.id, cm.text]));

  const data: AppNotification[] = rows.map((r) => ({
    id: r.id,
    type: r.type as AppNotification["type"],
    read: r.read,
    createdAt: r.createdAt.toISOString(),
    actor: {
      ...r.actor,
      specialization: (r.actor.specialization as AppNotification["actor"]["specialization"]) ?? null,
    },
    post: r.post,
    commentText: r.commentId ? (commentTextById.get(r.commentId) ?? null) : null,
  }));

  return c.json({ data });
});

notificationsRouter.get("/unread-count", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ data: { count: 0 } });

  const count = await prisma.notification.count({ where: { userId: user.id, read: false } });
  return c.json({ data: { count } });
});

notificationsRouter.post("/read", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: { message: "Не авторизован", code: "UNAUTHORIZED" } }, 401);

  await prisma.notification.updateMany({
    where: { userId: user.id, read: false },
    data: { read: true },
  });
  return c.json({ data: { success: true } });
});

export { notificationsRouter };
