import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // ─── Education Tracks ─────────────────────────────────────
  const highSchool = await prisma.educationTrack.upsert({
    where: { slug: 'highschool' },
    update: {},
    create: {
      name: 'HighSchool',
      slug: 'highschool',
      description: 'Grades 5–12 curriculum',
      icon: '🏫',
    },
  })

  // ─── Subjects for each grade ──────────────────────────────
  const SUBJECTS = [
    { name: 'Математика',     icon: '📐', color: '#7F77DD' },
    { name: 'Английский язык', icon: '🇬🇧', color: '#2E9E75' },
    { name: 'Геометрия',      icon: '📏', color: '#D85A30' },
    { name: 'География',      icon: '🌍', color: '#BA7517' },
    { name: 'Кыргызский язык', icon: '🇰🇬', color: '#D4537E' },
  ]

  for (let grade = 5; grade <= 12; grade++) {
    for (const s of SUBJECTS) {
      const subject = await prisma.subject.create({
        data: {
          trackId: highSchool.id,
          grade,
          name: s.name,
          icon: s.icon,
          color: s.color,
        },
      })

      // Add one chapter + lesson for grade 5 Math (demo)
      if (grade === 5 && s.name === 'Математика') {
        const chapter = await prisma.chapter.create({
          data: {
            subjectId: subject.id,
            title: 'Глава 1: Особые числа',
            order: 1,
          },
        })

        const lesson = await prisma.lesson.create({
          data: {
            chapterId: chapter.id,
            title: 'Множества',
            content: `# Множества\n\nМножество — это совокупность различных объектов, рассматриваемая как единое целое.\n\n## Примеры\n- Множество натуральных чисел: {1, 2, 3, ...}\n- Множество букв: {А, Б, В}\n\n## Обозначения\nМножества обозначают заглавными буквами: A, B, C`,
            videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            duration: 15,
            isPublished: true,
            order: 1,
          },
        })

        // Add test questions
        await prisma.question.createMany({
          data: [
            {
              lessonId: lesson.id,
              text: 'Что такое множество?',
              type: 'SINGLE',
              options: [
                { id: 'a', text: 'Совокупность различных объектов', isCorrect: true },
                { id: 'b', text: 'Одиночный объект', isCorrect: false },
                { id: 'c', text: 'Пара чисел', isCorrect: false },
                { id: 'd', text: 'Последовательность', isCorrect: false },
              ],
              explanation: 'Множество — это совокупность различных объектов.',
              points: 1,
              order: 1,
            },
            {
              lessonId: lesson.id,
              text: 'Как обозначают множества?',
              type: 'SINGLE',
              options: [
                { id: 'a', text: 'Строчными буквами (a, b, c)', isCorrect: false },
                { id: 'b', text: 'Заглавными буквами (A, B, C)', isCorrect: true },
                { id: 'c', text: 'Цифрами (1, 2, 3)', isCorrect: false },
                { id: 'd', text: 'Символами (*, #, @)', isCorrect: false },
              ],
              points: 1,
              order: 2,
            },
          ],
        })
      }
    }
  }

  // ─── Global Categories ────────────────────────────────────
  const categories = [
    { name: 'Математика',  color: '#7F77DD', icon: '📐' },
    { name: 'Языки',       color: '#2E9E75', icon: '🗣️' },
    { name: 'Наука',       color: '#D85A30', icon: '🔬' },
    { name: 'История',     color: '#BA7517', icon: '📜' },
    { name: 'Программирование', color: '#185FA5', icon: '💻' },
    { name: 'Чтение',      color: '#D4537E', icon: '📖' },
    { name: 'Другое',      color: '#5F5E5A', icon: '📌' },
  ]

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { id: `global_${cat.name}` },
      update: {},
      create: { id: `global_${cat.name}`, ...cat, userId: null },
    }).catch(() => prisma.category.create({ data: { ...cat, userId: null } }))
  }

  console.log('✅ Seed complete!')
  console.log(`   • ${(12 - 5 + 1) * SUBJECTS.length} subjects across 8 grades`)
  console.log('   • 1 demo lesson with 2 test questions (Grade 5 Math)')
  console.log(`   • ${categories.length} global categories`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
