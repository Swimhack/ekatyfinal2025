import { cache } from 'react'
import { prisma } from '@/lib/prisma'
import { RESTAURANT_CATEGORIES } from '@/lib/categories'

const splitTags = (value?: string | null) =>
  value ? value.split(',').map((tag) => tag.trim().toLowerCase()).filter(Boolean) : []

/**
 * One pass over the tag columns rather than a count query per category. The
 * whole set is ~1,800 rows of two short strings, so this is cheaper than 30
 * round trips and matches tags exactly instead of by substring.
 */
export const getCategoryCounts = cache(async (): Promise<Record<string, number>> => {
  const rows = await prisma.restaurant.findMany({
    where: { active: true },
    select: { categories: true, cuisineTypes: true },
  })

  const tagged = rows.map((row) => new Set([...splitTags(row.categories), ...splitTags(row.cuisineTypes)]))

  const counts: Record<string, number> = {}
  for (const category of RESTAURANT_CATEGORIES) {
    const wanted = category.tags.map((tag) => tag.toLowerCase())
    counts[category.slug] = tagged.filter((tags) => wanted.some((tag) => tags.has(tag))).length
  }
  return counts
})
