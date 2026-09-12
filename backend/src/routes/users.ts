import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../prisma";
import type { AppVariables } from "../auth";
import type { UserProfile } from "../types";

const usersRouter = new Hono<{ Variables: AppVariables }>();

const profileSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
  specialization: true,
  experienceYears: true,
  city: true,
  bio: true,
  createdAt: true,
  _count: { select: { posts: true } },
} as const;

type ProfileRow = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  specialization: string | null;
  experienceYears: number | null;
  city: string | null;
  bio: string | null;
  createdAt: Date;
  _count: { posts: number };
};

const toProfile = (u: ProfileRow, includeEmail: boolean): UserProfile => ({
  id: u.id,
  name: u.name,
  ...(includeEmail ? { email: u.email } : {}),
  image: u.image,
  specialization: (u.specialization as UserProfile["specialization"]) ?? null,
  experienceYears: u.experienceYears,
  city: u.city,
  bio: u.bio,
  createdAt: u.createdAt.toISOString(),
  postCount: u._count.posts,
});

// Own profile
usersRouter.get("/me", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: { message: "Не авторизован", code: "UNAUTHORIZED" } }, 401);

  const me = await prisma.user.findUnique({ where: { id: user.id }, select: profileSelect });
  if (!me) return c.json({ error: { message: "Пользователь не найден", code: "NOT_FOUND" } }, 404);

  return c.json({ data: toProfile(me, true) });
});

const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  image: z.string().url().optional(),
  specialization: z.enum(["FARMER", "AGRONOMIST"]).optional(),
  experienceYears: z.number().int().min(0).max(80).optional(),
  city: z.string().trim().min(1).max(80).optional(),
  bio: z.string().trim().max(300).optional(),
});

usersRouter.patch("/me", zValidator("json", updateProfileSchema), async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: { message: "Не авторизован", code: "UNAUTHORIZED" } }, 401);

  const body = c.req.valid("json");
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: body,
    select: profileSelect,
  });

  return c.json({ data: toProfile(updated, true) });
});

// Public profile
usersRouter.get("/:id", async (c) => {
  const { id } = c.req.param();
  const found = await prisma.user.findUnique({ where: { id }, select: profileSelect });
  if (!found) return c.json({ error: { message: "Пользователь не найден", code: "NOT_FOUND" } }, 404);

  return c.json({ data: toProfile(found, false) });
});

export { usersRouter };
