import { PrismaClient } from '../generated/prisma'

const prisma = new PrismaClient()

async function main() {
  // Always normalize email before inserting
  const email = 'kenny@example.com'
  const emailNormalized = email.trim().toLowerCase()

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      emailNormalized,
      displayName: 'Kenny Example',
      firstName: 'Kenny',
      lastName: 'Example',
      avatarKey: 'avatars/kenny-avatar.jpg', // optional R2 key
    },
  })

  console.log('Seeded user:', user)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
