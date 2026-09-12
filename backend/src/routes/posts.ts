import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../prisma";
import type { AppVariables } from "../auth";
import type { FeedPost, PostComment, PostDetail } from "../types";

const postsRouter = new Hono<{ Variables: AppVariables }>();

const authorSelect = {
  id: true,
  name: true,
  image: true,
  specialization: true,
  city: true,
} as const;

const postInclude = (userId: string | null) =>
  ({
    author: { select: authorSelect },
    _count: { select: { comments: true, likes: true } },
    likes: userId ? { where: { userId }, select: { id: true } } : undefined,
  }) as const;

type PostRow = {
  id: string;
  text: string;
  imageUrl: string | null;
  audioUrl: string | null;
  audioDuration: number | null;
  latitude: number | null;
  longitude: number | null;
  locationName: string | null;
  createdAt: Date;
  author: {
    id: string;
    name: string;
    image: string | null;
    specialization: string | null;
    city: string | null;
  };
  _count: { comments: number; likes: number };
  likes?: { id: string }[];
};

const toFeedPost = (p: PostRow): FeedPost => ({
  id: p.id,
  text: p.text,
  imageUrl: p.imageUrl,
  audioUrl: p.audioUrl,
  audioDuration: p.audioDuration,
  latitude: p.latitude,
  longitude: p.longitude,
  locationName: p.locationName,
  createdAt: p.createdAt.toISOString(),
  author: {
    ...p.author,
    specialization: (p.author.specialization as FeedPost["author"]["specialization"]) ?? null,
  },
  likeCount: p._count.likes,
  commentCount: p._count.comments,
  likedByMe: (p.likes?.length ?? 0) > 0,
});

// Feed (optionally filtered by author)
postsRouter.get("/", async (c) => {
  const user = c.get("user");
  const authorId = c.req.query("authorId");

  const posts = await prisma.post.findMany({
    where: authorId ? { authorId } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: postInclude(user?.id ?? null),
  });

  return c.json({ data: posts.map(toFeedPost) });
});

const createPostSchema = z.object({
  text: z.string().trim().min(1, "Текст обязателен").max(2000),
  imageUrl: z.string().url().optional(),
  audioUrl: z.string().url().optional(),
  audioDuration: z.number().int().min(0).max(600).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  locationName: z.string().trim().max(120).optional(),
});

postsRouter.post("/", zValidator("json", createPostSchema), async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: { message: "Не авторизован", code: "UNAUTHORIZED" } }, 401);

  const body = c.req.valid("json");
  const post = await prisma.post.create({
    data: { ...body, authorId: user.id },
    include: postInclude(user.id),
  });

  return c.json({ data: toFeedPost(post) });
});

// Post detail with comments
postsRouter.get("/:id", async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();

  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      ...postInclude(user?.id ?? null),
      comments: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: authorSelect } },
      },
    },
  });
  if (!post) return c.json({ error: { message: "Пост не найден", code: "NOT_FOUND" } }, 404);

  const detail: PostDetail = {
    ...toFeedPost(post),
    comments: post.comments.map(
      (cm): PostComment => ({
        id: cm.id,
        text: cm.text,
        createdAt: cm.createdAt.toISOString(),
        author: {
          ...cm.author,
          specialization:
            (cm.author.specialization as PostComment["author"]["specialization"]) ?? null,
        },
      })
    ),
  };

  return c.json({ data: detail });
});

postsRouter.delete("/:id", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: { message: "Не авторизован", code: "UNAUTHORIZED" } }, 401);

  const { id } = c.req.param();
  const post = await prisma.post.findUnique({ where: { id }, select: { authorId: true } });
  if (!post) return c.json({ error: { message: "Пост не найден", code: "NOT_FOUND" } }, 404);
  if (post.authorId !== user.id)
    return c.json({ error: { message: "Можно удалять только свои посты", code: "FORBIDDEN" } }, 403);

  await prisma.post.delete({ where: { id } });
  return c.json({ data: { success: true } });
});

// Comments
const createCommentSchema = z.object({
  text: z.string().trim().min(1, "Комментарий не может быть пустым").max(1000),
});

postsRouter.post("/:id/comments", zValidator("json", createCommentSchema), async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: { message: "Не авторизован", code: "UNAUTHORIZED" } }, 401);

  const { id } = c.req.param();
  const post = await prisma.post.findUnique({ where: { id }, select: { authorId: true } });
  if (!post) return c.json({ error: { message: "Пост не найден", code: "NOT_FOUND" } }, 404);

  const { text } = c.req.valid("json");
  const comment = await prisma.comment.create({
    data: { text, postId: id, authorId: user.id },
    include: { author: { select: authorSelect } },
  });

  // Notify the post author (unless commenting on own post)
  if (post.authorId !== user.id) {
    await prisma.notification.create({
      data: {
        type: "COMMENT",
        userId: post.authorId,
        actorId: user.id,
        postId: id,
        commentId: comment.id,
      },
    });
  }

  const data: PostComment = {
    id: comment.id,
    text: comment.text,
    createdAt: comment.createdAt.toISOString(),
    author: {
      ...comment.author,
      specialization:
        (comment.author.specialization as PostComment["author"]["specialization"]) ?? null,
    },
  };

  return c.json({ data });
});

// Toggle like
postsRouter.post("/:id/like", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: { message: "Не авторизован", code: "UNAUTHORIZED" } }, 401);

  const { id } = c.req.param();
  const post = await prisma.post.findUnique({ where: { id }, select: { authorId: true } });
  if (!post) return c.json({ error: { message: "Пост не найден", code: "NOT_FOUND" } }, 404);

  const existing = await prisma.like.findUnique({
    where: { postId_userId: { postId: id, userId: user.id } },
  });

  if (existing) {
    await prisma.like.delete({ where: { id: existing.id } });
    // Remove the stale like notification
    await prisma.notification.deleteMany({
      where: { type: "LIKE", postId: id, actorId: user.id },
    });
    const likeCount = await prisma.like.count({ where: { postId: id } });
    return c.json({ data: { liked: false, likeCount } });
  }

  await prisma.like.create({ data: { postId: id, userId: user.id } });
  if (post.authorId !== user.id) {
    await prisma.notification.create({
      data: { type: "LIKE", userId: post.authorId, actorId: user.id, postId: id },
    });
  }
  const likeCount = await prisma.like.count({ where: { postId: id } });
  return c.json({ data: { liked: true, likeCount } });
});

export { postsRouter };
