<stack>
  Bun runtime, Hono web framework, Zod validation.
</stack>

<structure>
  src/index.ts     — App entry, middleware, route mounting
  src/routes/      — Route modules (create as needed)
</structure>

<routes>
  Create routes in src/routes/ and mount them in src/index.ts.

  Example route file (src/routes/todos.ts):
  ```typescript
  import { Hono } from "hono";
  import { zValidator } from "@hono/zod-validator";
  import { z } from "zod";

  const todosRouter = new Hono();

  todosRouter.get("/", (c) => {
    return c.json({ todos: [] });
  });

  todosRouter.post(
    "/",
    zValidator("json", z.object({ title: z.string() })),
    (c) => {
      const { title } = c.req.valid("json");
      return c.json({ todo: { id: "1", title } });
    }
  );

  export { todosRouter };
  ```

  Mount in src/index.ts:
  ```typescript
  import { todosRouter } from "./routes/todos";
  app.route("/api/todos", todosRouter);
  ```

  IMPORTANT: Make sure all endpoints and routes are prefixed with `/api/`
</routes>

<database>
  Prisma v6 + SQLite (prisma/dev.db) + Better Auth (email OTP) are configured.
  - Schema: prisma/schema.prisma (User with profile fields, Session, Account, Verification, Post, Comment, Like, Notification)
  - Client: src/prisma.ts (WAL pragmas). Auth: src/auth.ts (expo plugin + emailOTP via smtp.vibecodeapp.com, fromName "Агросеть", lang ru).
  - Auth middleware in src/index.ts populates c.get("user") / c.get("session") for all routes; handler mounted at /api/auth/*.
  - After schema changes: bunx prisma generate && bunx prisma db push
  - API contract lives in src/types.ts and is mirrored in mobile/src/lib/types.ts — keep both in sync.
  - All app responses use { data } envelope; errors { error: { message, code } } with Russian messages.
  - Demo seed: bun run scripts/seed.ts (no-op if posts exist).
</database>

<package_management>
  CRITICAL: After using `bun add` to install any package, you MUST immediately commit the updated package.json:

  ```bash
  bun add some-package
  git add package.json bun.lock
  git commit -m "chore: add some-package dependency"
  ```

  Why: If package.json is not committed, the package will be lost when the sandbox restarts,
  causing "Cannot find package" errors on the next session.
</package_management>