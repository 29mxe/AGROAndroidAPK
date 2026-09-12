import { prisma } from "../src/prisma";

async function main() {
  const existing = await prisma.post.count();
  if (existing > 0) {
    console.log("Seed skipped: posts already exist");
    return;
  }

  const users = [
    {
      id: "demo-agronomist-1",
      name: "Елена Соколова",
      email: "elena.demo@agroset.app",
      emailVerified: true,
      image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80",
      specialization: "AGRONOMIST",
      experienceYears: 12,
      city: "Краснодар",
      bio: "Агроном-консультант по зерновым культурам. Помогаю хозяйствам юга России.",
    },
    {
      id: "demo-farmer-1",
      name: "Иван Крылов",
      email: "ivan.demo@agroset.app",
      emailVerified: true,
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80",
      specialization: "FARMER",
      experienceYears: 8,
      city: "Воронеж",
      bio: "Фермерское хозяйство: подсолнечник, кукуруза, 400 га.",
    },
    {
      id: "demo-farmer-2",
      name: "Пётр Мельников",
      email: "petr.demo@agroset.app",
      emailVerified: true,
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80",
      specialization: "FARMER",
      experienceYears: 20,
      city: "Ростов-на-Дону",
      bio: "Семейная ферма, озимая пшеница и ячмень.",
    },
  ];

  for (const u of users) {
    await prisma.user.upsert({ where: { id: u.id }, update: {}, create: u });
  }

  const now = Date.now();
  const hours = (h: number) => new Date(now - h * 3600 * 1000);

  const posts = [
    {
      id: "demo-post-1",
      authorId: "demo-farmer-2",
      text: "Озимая пшеница вышла из зимовки отлично. Кущение плотное, посевы ровные. В этом году попробовал новый сорт «Гром» — пока очень доволен.",
      imageUrl: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80",
      latitude: 47.2357,
      longitude: 39.7015,
      locationName: "Ростов-на-Дону",
      createdAt: hours(4),
    },
    {
      id: "demo-post-2",
      authorId: "demo-agronomist-1",
      text: "Коллеги, напоминаю: сейчас лучшее окно для листовой подкормки озимых карбамидом. Норма 10–15 кг/га, работать утром или вечером, чтобы не обжечь лист. Кто уже начал обработки?",
      latitude: 45.0355,
      longitude: 38.9753,
      locationName: "Краснодар",
      createdAt: hours(9),
    },
    {
      id: "demo-post-3",
      authorId: "demo-farmer-1",
      text: "Подсолнечник в прошлом сезоне дал 32 ц/га. Делюсь фото с поля — гибрид Пионер, капельного полива нет, только правильная агротехника.",
      imageUrl: "https://images.unsplash.com/photo-1470509037663-253afd7f0f51?w=1200&q=80",
      latitude: 51.6608,
      longitude: 39.2003,
      locationName: "Воронеж",
      createdAt: hours(26),
    },
    {
      id: "demo-post-4",
      authorId: "demo-farmer-1",
      text: "Готовим технику к посевной. Трактор прошёл ТО, сеялку перебрали. Кто чем сеет кукурузу — поделитесь опытом по нормам высева?",
      imageUrl: "https://images.unsplash.com/photo-1605000797499-95a51c5269ae?w=1200&q=80",
      latitude: 51.7218,
      longitude: 39.5,
      locationName: "Воронежская область",
      createdAt: hours(50),
    },
    {
      id: "demo-post-5",
      authorId: "demo-agronomist-1",
      text: "Выезжала сегодня в сад: яблони после обрезки чувствуют себя хорошо. Совет садоводам — не затягивайте с побелкой штамбов, солнечные ожоги коры уже актуальны.",
      imageUrl: "https://images.unsplash.com/photo-1444392061186-9fc38f84f726?w=1200&q=80",
      latitude: 45.0428,
      longitude: 41.9734,
      locationName: "Ставрополь",
      createdAt: hours(74),
    },
  ];

  for (const p of posts) {
    await prisma.post.create({ data: p });
  }

  await prisma.comment.createMany({
    data: [
      {
        postId: "demo-post-1",
        authorId: "demo-agronomist-1",
        text: "Отличное кущение! «Гром» хорошо показывает себя на юге, главное не пропустить обработку от септориоза в мае.",
        createdAt: hours(3),
      },
      {
        postId: "demo-post-2",
        authorId: "demo-farmer-2",
        text: "Начал вчера, работаю вечером после 18:00. Спасибо за напоминание про норму!",
        createdAt: hours(7),
      },
      {
        postId: "demo-post-4",
        authorId: "demo-farmer-2",
        text: "Сею 70–75 тысяч семян на гектар на богаре, больше смысла нет.",
        createdAt: hours(44),
      },
    ],
  });

  await prisma.like.createMany({
    data: [
      { postId: "demo-post-1", userId: "demo-agronomist-1" },
      { postId: "demo-post-1", userId: "demo-farmer-1" },
      { postId: "demo-post-2", userId: "demo-farmer-2" },
      { postId: "demo-post-3", userId: "demo-agronomist-1" },
      { postId: "demo-post-3", userId: "demo-farmer-2" },
      { postId: "demo-post-5", userId: "demo-farmer-1" },
    ],
  });

  console.log("Seed complete: 3 users, 5 posts, 3 comments, 6 likes");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
