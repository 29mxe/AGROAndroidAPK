import "@vibecodeapp/proxy"; // DO NOT REMOVE OTHERWISE VIBECODE PROXY WILL NOT WORK
import { Hono } from "hono";
import { cors } from "hono/cors";
import "./env";
import { logger } from "hono/logger";
import { auth, type AppVariables } from "./auth";
import { usersRouter } from "./routes/users";
import { postsRouter } from "./routes/posts";
import { notificationsRouter } from "./routes/notifications";
import { uploadRouter } from "./routes/upload";

const app = new Hono<{ Variables: AppVariables }>();

// CORS middleware - validates origin against allowlist
const allowed = [
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
  /^https:\/\/[a-z0-9-]+\.dev\.vibecode\.run$/,
  /^https:\/\/[a-z0-9-]+\.vibecode\.run$/,
  /^https:\/\/[a-z0-9-]+\.vibecodeapp\.com$/,
  /^https:\/\/[a-z0-9-]+\.vibecode\.dev$/,
  /^https:\/\/vibecode\.dev$/,
  // Freestyle sandbox provider preview domain (dynamically generated per sandbox+port).
  /^https:\/\/[a-z0-9-]+\.style\.dev$/,
  // Daytona sandbox provider preview domain (dynamically generated per sandbox+port; both shared regions).
  /^https:\/\/\d+-[a-z0-9-]+\.daytonaproxy01\.(net|eu)$/,
];

app.use(
  "*",
  cors({
    origin: (origin) => (origin && allowed.some((re) => re.test(origin)) ? origin : null),
    credentials: true,
  })
);

// Logging
app.use("*", logger());

// Auth middleware - populates user/session for all routes
app.use("*", async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    c.set("user", null);
    c.set("session", null);
    await next();
    return;
  }
  c.set("user", session.user);
  c.set("session", session.session);
  await next();
});

// Better Auth handler
app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

// Health check endpoint
app.get("/health", (c) => c.json({ status: "ok" }));

// Routes
app.route("/api/users", usersRouter);
app.route("/api/posts", postsRouter);
app.route("/api/notifications", notificationsRouter);
app.route("/api/upload", uploadRouter);

const port = Number(process.env.PORT) || 3000;

export default {
  port,
  fetch: app.fetch,
};
