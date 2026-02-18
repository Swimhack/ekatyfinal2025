const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
async function main() {
  const count = await p.restaurant.count()
  console.log('Restaurant count:', count)
  const featured = await p.restaurant.count({ where: { featured: true } })
  console.log('Featured count:', featured)
  await p.$disconnect()
}
main()
