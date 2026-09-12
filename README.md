# Агросеть — соцсеть для фермеров и агрономов

Мобильное приложение (Expo React Native + веб-превью) с бэкендом на Bun/Hono/Prisma (SQLite).

## Возможности

- **Вход по коду из письма (email OTP)** — аккаунт создаётся автоматически при первом входе (Better Auth).
- **Профиль**: имя, специализация (Фермер / Агроном), опыт работы (лет), город, фото аватарки, «о себе».
- **Лента постов**: текст + фото, автор с бейджем специализации, дата публикации («4 часа назад»), pull-to-refresh.
- **Голосовые сообщения**: запись через микрофон (expo-audio), загрузка в хранилище, встроенный плеер с прогресс-баром.
- **Геометки и карта**: при создании поста определяется геопозиция (можно убрать). Вкладка «Карта» показывает маркеры всех постов; тап по маркеру → карточка → открытие поста.
  - iOS: нативная карта через `react-native-maps` (`src/components/PostsMap.tsx`)
  - Android: Leaflet/OpenStreetMap в `WebView` без обязательного Google Maps API-ключа (`src/components/PostsMap.android.tsx`)
  - Веб: Leaflet/OpenStreetMap в iframe (`src/components/PostsMap.web.tsx`)
- **Комментарии** под постами с вводом с клавиатуры.
- **Лайки** с оптимистичным обновлением и анимацией.
- **Уведомления**: вкладка с бейджем непрочитанных (лайки и комментарии к вашим постам). Обновляется опросом каждые 15 секунд (in-app). Настоящие push-уведомления возможны после публикации приложения.
- Дизайн в природных тонах: зелёный/коричневый/бежевый, шрифты Alegreya + Golos Text.

## Структура

```
mobile/src/app/
  _layout.tsx           — гарды: sign-in → onboarding → приложение
  sign-in.tsx           — ввод почты
  verify-otp.tsx        — ввод кода
  onboarding.tsx        — анкета профиля после первого входа
  create-post.tsx       — новый пост (текст, фото, голос, геометка), модалка
  post/[id].tsx         — пост + комментарии, удаление своего поста
  user/[id].tsx         — чужой профиль
  edit-profile.tsx      — редактирование профиля, модалка
  (app)/                — вкладки: index (Лента), map (Карта), notifications, profile

mobile/src/components/  — PostCard, PostsMap(.web), AudioPlayer, VoiceRecorder,
                          ProfileForm, Avatar, SpecializationBadge, EmptyState
mobile/src/lib/         — queries.ts (React Query), types.ts (контракт API),
                          upload.ts, file-picker.ts, theme.ts, auth/

backend/src/
  auth.ts               — Better Auth (email OTP, письма через smtp.vibecodeapp.com, fromName «Агросеть»)
  types.ts              — контракт API (зеркало в mobile/src/lib/types.ts)
  routes/users.ts       — GET/PATCH /api/users/me, GET /api/users/:id
  routes/posts.ts       — лента (?authorId=), создание, детали, удаление,
                          /:id/comments, /:id/like (переключение + уведомление)
  routes/notifications.ts — список, unread-count, mark read
  routes/upload.ts      — загрузка фото/аудио в Vibecode Storage (CDN)
backend/prisma/schema.prisma — User, Session, Account, Verification, Post, Comment, Like, Notification
backend/scripts/seed.ts — демо-данные (3 пользователя, 5 постов с гео)
```

## Особенности

- Все ответы API в конверте `{ data }`, ошибки `{ error: { message, code } }` (тексты ошибок на русском).
- Cессия на мобильном: React Query-обёртка над `authClient.getSession()` (см. mobile/src/lib/auth/use-session.ts).
- Демо-контент создаётся сидом только в пустую базу (`bun run scripts/seed.ts` в backend/).
