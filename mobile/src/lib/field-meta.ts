// Field-observation metadata layer.
//
// The backend post model has no status / crop / "needs advice" fields and there is
// no "edit post" endpoint, so this module keeps all of that on the client:
//   1. compact hashtags appended to the post text (visible to every user, no API change);
//   2. a local per-post override stored on the device (see field-store.ts);
//   3. a keyword fallback for old posts that carry neither.
// Everything here is pure TypeScript — no new dependencies.

import type { FeedPost, PostComment, PostDetail } from "./types";

// ---------- Field status ----------

export type FieldStatus = "SOWING" | "SEEDLING" | "BLOOM" | "PROBLEM" | "HARVEST";

export type StatusTone = "green" | "yellow" | "red" | "neutral";

export interface FieldStatusInfo {
  label: string;
  emoji: string;
  tag: string;
  tone: StatusTone;
}

export const FIELD_STATUSES: FieldStatus[] = ["SOWING", "SEEDLING", "BLOOM", "PROBLEM", "HARVEST"];

export const fieldStatusInfo: Record<FieldStatus, FieldStatusInfo> = {
  SOWING: { label: "Посев", emoji: "🌾", tag: "посев", tone: "neutral" },
  SEEDLING: { label: "Всходы", emoji: "🌱", tag: "всходы", tone: "green" },
  BLOOM: { label: "Цветение", emoji: "🌼", tag: "цветение", tone: "yellow" },
  PROBLEM: { label: "Проблема", emoji: "⚠", tag: "проблема", tone: "red" },
  HARVEST: { label: "Урожай", emoji: "🚜", tag: "урожай", tone: "neutral" },
};

// ---------- Crops ----------

export interface CropInfo {
  id: string;
  label: string;
  emoji: string;
  tag: string;
  keywords: RegExp;
}

export const CROPS: CropInfo[] = [
  { id: "wheat", label: "Пшеница", emoji: "🌾", tag: "пшеница", keywords: /пшениц/i },
  { id: "sunflower", label: "Подсолнечник", emoji: "🌻", tag: "подсолнечник", keywords: /подсолн/i },
  { id: "corn", label: "Кукуруза", emoji: "🌽", tag: "кукуруза", keywords: /кукуруз/i },
  { id: "barley", label: "Ячмень", emoji: "🌾", tag: "ячмень", keywords: /ячмен/i },
  { id: "soy", label: "Соя", emoji: "🫘", tag: "соя", keywords: /\bсо[яию]\b|соев/i },
  { id: "rapeseed", label: "Рапс", emoji: "🌼", tag: "рапс", keywords: /\bрапс/i },
  { id: "potato", label: "Картофель", emoji: "🥔", tag: "картофель", keywords: /картофел|картошк/i },
  { id: "beet", label: "Свёкла", emoji: "🥬", tag: "свёкла", keywords: /свёкл|свекл/i },
  { id: "orchard", label: "Сад", emoji: "🍎", tag: "сад", keywords: /яблон|груш|садов|в сад\b|\bсад\b/i },
  { id: "vegetables", label: "Овощи", emoji: "🥕", tag: "овощи", keywords: /овощ|томат|помидор|огурц|капуст|морков|лук\b/i },
  { id: "grapes", label: "Виноград", emoji: "🍇", tag: "виноград", keywords: /виноград/i },
];

export const cropById = (id: string | null | undefined): CropInfo | null =>
  id ? (CROPS.find((c) => c.id === id) ?? null) : null;

// ---------- Location privacy ----------

export type LocationPrivacy = "exact" | "area";

/** Snap coordinates to a ~0.1° grid (≈ 8–11 km) so the exact field is never sent to the server. */
export const coarsenCoordinate = (value: number): number => Math.round(value * 10) / 10 || 0;

// ---------- Hashtag encoding ----------

const ADVICE_TAG = "нужен_совет";
const RESOLVED_TAG = "решено";

export interface PostTagMeta {
  needsAdvice: boolean;
  resolved?: boolean;
  status: FieldStatus | null;
  crop: string | null;
}

/** Builds the trailing hashtag line that carries metadata inside the plain post text. */
export const buildTagLine = (meta: PostTagMeta): string => {
  const tags: string[] = [];
  if (meta.needsAdvice) tags.push(`#${ADVICE_TAG}`);
  if (meta.status) tags.push(`#${fieldStatusInfo[meta.status].tag}`);
  const crop = cropById(meta.crop);
  if (crop) tags.push(`#${crop.tag}`);
  return tags.join(" ");
};

/** Appends the tag line to the text, but never exceeds the backend limit of 2000 chars. */
export const composePostText = (text: string, meta: PostTagMeta, maxLength = 2000): string => {
  const base = text.trim();
  const tagLine = buildTagLine(meta);
  if (!tagLine) return base;
  const combined = `${base}\n\n${tagLine}`;
  return combined.length <= maxLength ? combined : base;
};

// Explicit Cyrillic + Latin ranges (no Unicode property escapes) — safe on every Hermes version.
const WORD_CHARS = "A-Za-z0-9_\\u0400-\\u04FF";
const HASHTAG_RE = new RegExp(`#([${WORD_CHARS}]+)`, "g");
const TAG_ONLY_LINE_RE = new RegExp(`^(#[${WORD_CHARS}]+\\s*)+$`);
const NON_LETTER_RE = /[^A-Za-z\u0400-\u04FF]+/;

const statusByTag = new Map<string, FieldStatus>(
  FIELD_STATUSES.map((s) => [fieldStatusInfo[s].tag, s] as const)
);
const cropByTag = new Map<string, string>(CROPS.map((c) => [c.tag, c.id] as const));

interface ParsedTags {
  needsAdvice: boolean;
  resolved: boolean;
  status: FieldStatus | null;
  crop: string | null;
  hasKnownTags: boolean;
}

const parseTags = (text: string): ParsedTags => {
  const result: ParsedTags = {
    needsAdvice: false,
    resolved: false,
    status: null,
    crop: null,
    hasKnownTags: false,
  };
  const re = new RegExp(HASHTAG_RE.source, "g");
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const tag = (match[1] ?? "").toLowerCase();
    if (tag === ADVICE_TAG || tag === "нуженсовет" || tag === "совет") {
      result.needsAdvice = true;
      result.hasKnownTags = true;
    } else if (tag === RESOLVED_TAG) {
      result.resolved = true;
      result.hasKnownTags = true;
    } else if (statusByTag.has(tag)) {
      result.status = statusByTag.get(tag) ?? null;
      result.hasKnownTags = true;
    } else if (cropByTag.has(tag)) {
      result.crop = cropByTag.get(tag) ?? null;
      result.hasKnownTags = true;
    }
  }
  return result;
};

/** Removes trailing lines that consist only of hashtags — keeps the card text clean. */
export const stripTagLines = (text: string): string => {
  const lines = text.split("\n");
  while (lines.length > 0) {
    const last = (lines[lines.length - 1] ?? "").trim();
    if (last === "" || TAG_ONLY_LINE_RE.test(last)) {
      lines.pop();
    } else {
      break;
    }
  }
  const cleaned = lines.join("\n").trim();
  return cleaned.length > 0 ? cleaned : text.trim();
};

// ---------- Keyword fallback for posts without tags ----------

const ADVICE_RE = /у кого был|подскаж|помогите|посоветуй|поделитесь опытом|что делать|как быть|кто сталкивал|\?/i;

const STATUS_RULES: { status: FieldStatus; re: RegExp }[] = [
  { status: "PROBLEM", re: /пятн|болезн|вредител|проблем|гниль|\bтля\b|саранч|повреж|погиб|засох|пожелте|жёлт|желт|сорняк|заболел|ожог/i },
  { status: "HARVEST", re: /урожа|уборк|убрали|намолот|ц\/га|обмолот/i },
  { status: "BLOOM", re: /цветени|цветёт|цветет|зацвел|бутон/i },
  { status: "SEEDLING", re: /всход|проросл|взошл|кущен/i },
  { status: "SOWING", re: /посев|сеем|сеять|посеял|высев|сеялк/i },
];

const guessStatus = (text: string): FieldStatus | null => {
  for (const rule of STATUS_RULES) {
    if (rule.re.test(text)) return rule.status;
  }
  return null;
};

const guessCrop = (text: string): string | null => {
  for (const crop of CROPS) {
    if (crop.keywords.test(text)) return crop.id;
  }
  return null;
};

// ---------- Derived insight used by the UI ----------

/** Local, device-only override for a post (stored by post id). */
export interface LocalPostMeta {
  needsAdvice?: boolean;
  resolved?: boolean;
  status?: FieldStatus | null;
  crop?: string | null;
  locationPrivacy?: LocationPrivacy;
  updatedAt: number;
}

export interface PostInsight {
  needsAdvice: boolean;
  resolved: boolean;
  status: FieldStatus | null;
  crop: CropInfo | null;
  region: string | null;
  displayText: string;
  /** true when metadata came from tags/local storage rather than keyword guessing */
  explicit: boolean;
}

export const derivePostInsight = (post: FeedPost, local?: LocalPostMeta | null): PostInsight => {
  const tags = parseTags(post.text);
  const text = post.text;

  const needsAdvice =
    local?.needsAdvice ?? (tags.hasKnownTags ? tags.needsAdvice : ADVICE_RE.test(text));
  const resolved = local?.resolved ?? tags.resolved;
  const status =
    local?.status !== undefined && local.status !== null
      ? local.status
      : tags.status ?? (tags.hasKnownTags ? null : guessStatus(text));
  const cropId =
    local?.crop !== undefined && local.crop !== null
      ? local.crop
      : tags.crop ?? (tags.hasKnownTags ? null : guessCrop(text));

  return {
    needsAdvice,
    resolved,
    status,
    crop: cropById(cropId),
    region: post.locationName || post.author.city || null,
    displayText: stripTagLines(text),
    explicit: tags.hasKnownTags || !!local,
  };
};

// ---------- Distance ----------

export const haversineKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
};

export const formatDistance = (km: number): string => {
  if (km < 1) return "рядом с вами";
  return `${Math.round(km)} км от вас`;
};

// ---------- Word forms ----------

const plural = (n: number, one: string, few: string, many: string): string => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
};

export const adviceWord = (n: number): string => plural(n, "совет", "совета", "советов");
export const observationWord = (n: number): string =>
  plural(n, "наблюдение", "наблюдения", "наблюдений");

// ---------- Demo content (used only when the backend feed is empty / offline) ----------

export const LOCAL_DEMO_PREFIX = "local-demo-";
export const isLocalDemoId = (id: string): boolean => id.startsWith(LOCAL_DEMO_PREFIX);

const hoursAgo = (h: number): string => new Date(Date.now() - h * 3600 * 1000).toISOString();

type DemoSeed = {
  id: string;
  text: string;
  imageUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  locationName: string;
  author: FeedPost["author"];
  likeCount: number;
  ageHours: number;
  comments: { author: FeedPost["author"]; text: string }[];
};

const demoAuthors = {
  igor: {
    id: "local-demo-user-1",
    name: "Игорь Савченко",
    image: null,
    specialization: "FARMER" as const,
    city: "Краснодарский край",
  },
  marina: {
    id: "local-demo-user-2",
    name: "Марина Ковалёва",
    image: null,
    specialization: "AGRONOMIST" as const,
    city: "Ростовская область",
  },
  timur: {
    id: "local-demo-user-3",
    name: "Тимур Гаджиев",
    image: null,
    specialization: "FARMER" as const,
    city: "Ставропольский край",
  },
  oleg: {
    id: "local-demo-user-4",
    name: "Олег Черных",
    image: null,
    specialization: "FARMER" as const,
    city: "Воронежская область",
  },
};

const DEMO_SEEDS: DemoSeed[] = [
  {
    id: `${LOCAL_DEMO_PREFIX}1`,
    text: "После дождей на листьях появились светлые пятна. У кого было похожее?\n\n#нужен_совет #проблема #пшеница",
    imageUrl: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=1200&q=80",
    latitude: 45.1,
    longitude: 39.0,
    locationName: "Краснодарский край",
    author: demoAuthors.igor,
    likeCount: 4,
    ageHours: 3,
    comments: [
      {
        author: demoAuthors.marina,
        text: "Похоже на грибковое поражение после влажной недели, но по фото точно не скажу. Лучше показать лист агроному очно или в лабораторию.",
      },
      {
        author: demoAuthors.oleg,
        text: "У нас было похожее два года назад. Помогло, что заметили рано — посмотрите похожий случай рядом.",
      },
    ],
  },
  {
    id: `${LOCAL_DEMO_PREFIX}2`,
    text: "Неделю назад спрашивал про повреждения листа. Спасибо всем за советы — проблему удалось локализовать.\n\n#решено #проблема #подсолнечник",
    imageUrl: "https://images.unsplash.com/photo-1470509037663-253afd7f0f51?w=1200&q=80",
    latitude: 47.2,
    longitude: 39.7,
    locationName: "Ростовская область",
    author: demoAuthors.marina,
    likeCount: 11,
    ageHours: 26,
    comments: [
      {
        author: demoAuthors.igor,
        text: "Отлично, что получилось! Главное — вовремя заметили и не тянули с осмотром.",
      },
    ],
  },
  {
    id: `${LOCAL_DEMO_PREFIX}3`,
    text: "Первые всходы после посева. Сравниваем динамику по участкам.\n\n#всходы #кукуруза",
    imageUrl: "https://images.unsplash.com/photo-1471193945509-9ad0617afabf?w=1200&q=80",
    latitude: 45.0,
    longitude: 41.9,
    locationName: "Ставропольский край",
    author: demoAuthors.timur,
    likeCount: 6,
    ageHours: 8,
    comments: [],
  },
  {
    id: `${LOCAL_DEMO_PREFIX}4`,
    text: "После дождей появились похожие пятна на флаговом листе. Разобрались вместе с агрономом — помогла обработка после консультации. Диагноз по фото не ставили, смотрели поле очно.\n\n#решено #проблема #пшеница",
    imageUrl: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80",
    latitude: 45.3,
    longitude: 38.6,
    locationName: "Краснодарский край",
    author: demoAuthors.oleg,
    likeCount: 9,
    ageHours: 120,
    comments: [
      {
        author: demoAuthors.marina,
        text: "Спасибо, что поделились итогом — такие «решённые» случаи экономят соседям неделю.",
      },
    ],
  },
  {
    id: `${LOCAL_DEMO_PREFIX}5`,
    text: "Неровные всходы на части поля — оказалось, дело в глубине заделки семян на одном из проходов сеялки. Пересеяли участок, дальше ровно.\n\n#решено #всходы #кукуруза",
    imageUrl: null,
    latitude: 51.7,
    longitude: 39.2,
    locationName: "Воронежская область",
    author: demoAuthors.oleg,
    likeCount: 7,
    ageHours: 200,
    comments: [],
  },
];

const seedToPost = (seed: DemoSeed): FeedPost => ({
  id: seed.id,
  text: seed.text,
  imageUrl: seed.imageUrl,
  audioUrl: null,
  audioDuration: null,
  latitude: seed.latitude,
  longitude: seed.longitude,
  locationName: seed.locationName,
  createdAt: hoursAgo(seed.ageHours),
  author: seed.author,
  likeCount: seed.likeCount,
  commentCount: seed.comments.length,
  likedByMe: false,
});

/** All demo observations (feed fallback + "similar cases"). */
export const DEMO_POSTS: FeedPost[] = DEMO_SEEDS.map(seedToPost);

/** The three demo posts shown when the backend feed is empty. */
export const DEMO_FEED_POSTS: FeedPost[] = DEMO_POSTS.slice(0, 3);

export const getDemoPostDetail = (id: string): PostDetail | null => {
  const seed = DEMO_SEEDS.find((s) => s.id === id);
  if (!seed) return null;
  const post = seedToPost(seed);
  const comments: PostComment[] = seed.comments.map((c, i) => ({
    id: `${seed.id}-comment-${i + 1}`,
    text: c.text,
    createdAt: hoursAgo(Math.max(0, seed.ageHours - (i + 1))),
    author: c.author,
  }));
  return { ...post, comments };
};

// ---------- "Similar cases" heuristic ----------

const STOP_WORDS = new Set([
  "после",
  "появились",
  "которые",
  "который",
  "когда",
  "очень",
  "этого",
  "этом",
  "было",
  "были",
  "есть",
  "того",
  "чтобы",
  "коллеги",
  "сегодня",
  "спасибо",
  "всем",
]);

const significantWords = (text: string): Set<string> => {
  const words = new Set<string>();
  for (const raw of text.toLowerCase().split(NON_LETTER_RE)) {
    if (raw.length < 5 || raw.startsWith("#") || STOP_WORDS.has(raw)) continue;
    words.add(raw.slice(0, 6)); // crude stemming
  }
  return words;
};

const regionKey = (region: string | null): string | null => {
  if (!region) return null;
  const first = region.toLowerCase().split(/[\s,]+/)[0] ?? "";
  return first.length >= 4 ? first.slice(0, 6) : first || null;
};

export interface SimilarCase {
  post: FeedPost;
  insight: PostInsight;
  score: number;
}

/**
 * Ranks other posts by similarity: same crop, same status, same region and shared keywords.
 * Pure frontend heuristic — no AI. Demo cases fill the gaps when real matches are scarce.
 */
export const findSimilarCases = (
  target: FeedPost,
  candidates: FeedPost[],
  metaMap: Record<string, LocalPostMeta>,
  limit = 3
): SimilarCase[] => {
  const targetInsight = derivePostInsight(target, metaMap[target.id]);
  const targetWords = significantWords(targetInsight.displayText);
  const targetRegion = regionKey(targetInsight.region);

  const scored: SimilarCase[] = [];
  const seen = new Set<string>([target.id]);

  const consider = (post: FeedPost, isDemo: boolean) => {
    if (seen.has(post.id)) return;
    seen.add(post.id);
    const insight = derivePostInsight(post, metaMap[post.id]);
    let score = 0;
    if (targetInsight.crop && insight.crop && targetInsight.crop.id === insight.crop.id) score += 3;
    if (targetInsight.status && insight.status && targetInsight.status === insight.status) score += 2;
    if (targetRegion && regionKey(insight.region) === targetRegion) score += 1;
    let overlap = 0;
    for (const w of significantWords(insight.displayText)) {
      if (targetWords.has(w)) overlap += 1;
    }
    score += Math.min(3, overlap);
    if (insight.resolved) score += 1;
    if (isDemo) score -= 1; // real observations win ties
    if (score >= 3) scored.push({ post, insight, score });
  };

  candidates.forEach((p) => consider(p, isLocalDemoId(p.id)));
  DEMO_POSTS.forEach((p) => consider(p, true));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
};
