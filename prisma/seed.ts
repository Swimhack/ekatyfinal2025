import { PrismaClient } from '@prisma/client'
import { parse } from 'csv-parse/sync'
import * as fs from 'fs'
import * as path from 'path'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

// Helper function to convert hours string to JSON string
function parseHours(hoursString?: string) {
  // Default hours if not provided
  const defaultHours = {
    monday: { open: "11:00", close: "22:00" },
    tuesday: { open: "11:00", close: "22:00" },
    wednesday: { open: "11:00", close: "22:00" },
    thursday: { open: "11:00", close: "22:00" },
    friday: { open: "11:00", close: "23:00" },
    saturday: { open: "11:00", close: "23:00" },
    sunday: { open: "12:00", close: "21:00" }
  }
  
  return JSON.stringify(hoursString ? JSON.parse(hoursString) : defaultHours)
}

// Helper to parse boolean from CSV
function parseBoolean(value: string): boolean {
  return value?.toLowerCase() === 'true'
}

// Helper to parse arrays from CSV (keep as comma-separated string for SQLite)
function parseArrayAsString(value: string): string {
  return value || ''
}

async function seedUsers() {
  console.log('🌱 Seeding users...')
  
  const users = [
    {
      email: 'admin@ekaty.com',
      name: 'Admin User',
      passwordHash: await bcrypt.hash('admin123!', 10),
      role: 'ADMIN' as const
    },
    {
      email: 'editor@ekaty.com',
      name: 'Editor User',
      passwordHash: await bcrypt.hash('editor123!', 10),
      role: 'EDITOR' as const
    },
    {
      email: 'john.doe@example.com',
      name: 'John Doe',
      passwordHash: await bcrypt.hash('user123!', 10),
      role: 'USER' as const
    },
    {
      email: 'jane.smith@example.com',
      name: 'Jane Smith',
      passwordHash: await bcrypt.hash('user123!', 10),
      role: 'USER' as const
    },
    {
      email: 'advertiser@restaurant.com',
      name: 'Restaurant Owner',
      passwordHash: await bcrypt.hash('advertiser123!', 10),
      role: 'ADVERTISER' as const
    },
    {
      id: 'clq2G1x7q0000v9d8b3e4c5f6',
      email: 'johndoe@gmail.com',
      name: 'John Doe',
      passwordHash: await bcrypt.hash('johndoe123!', 10),
      role: 'USER' as const
    }
  ]
  
  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: user
    })
  }
  
  console.log('✅ Users seeded')
}

async function seedRestaurants() {
  console.log('🌱 Seeding restaurants...')
  
  // Read the CSV file
  const csvFilePath = path.join(__dirname, 'seed-data', 'restaurants.csv')
  const csvContent = fs.readFileSync(csvFilePath, 'utf-8')
  
  // Parse CSV
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true
  })
  
  for (const record of records) {
    const restaurant = {
      name: record.name,
      slug: record.slug,
      description: record.description || null,
      address: record.address,
      city: record.city || 'Katy',
      state: record.state || 'TX',
      zipCode: record.zipCode,
      latitude: parseFloat(record.latitude),
      longitude: parseFloat(record.longitude),
      phone: record.phone || null,
      website: record.website || null,
      email: record.email || null,
      categories: parseArrayAsString(record.categories),
      cuisineTypes: parseArrayAsString(record.cuisineTypes),
      hours: parseHours(record.hours),
      priceLevel: record.priceLevel || 'MODERATE',
      photos: parseArrayAsString(record.photos || ''),
      logoUrl: record.logoUrl || null,
      featured: parseBoolean(record.featured),
      verified: parseBoolean(record.verified),
      active: record.active !== undefined ? parseBoolean(record.active) : true,
      rating: record.rating ? parseFloat(record.rating) : null,
      reviewCount: record.reviewCount ? parseInt(record.reviewCount) : 0,
      source: record.source || 'manual',
      sourceId: record.sourceId || null,
      metadata: record.metadata || null
    }
    
    await prisma.restaurant.upsert({
      where: { slug: restaurant.slug },
      update: restaurant,
      create: restaurant
    })
  }
  
  console.log(`✅ ${records.length} restaurants seeded`)
}

async function seedReviews() {
  console.log('🌱 Seeding sample reviews...')
  
  const users = await prisma.user.findMany({ where: { role: 'USER' } })
  const restaurants = await prisma.restaurant.findMany({ take: 10 })
  
  const reviewTexts = [
    "Great food and excellent service! Will definitely come back.",
    "The atmosphere was wonderful and the food was delicious.",
    "Good portions and fair prices. Family-friendly place.",
    "Amazing experience! The staff was very attentive.",
    "Food was okay, nothing special. Service could be better.",
    "Loved everything about this place! Highly recommend.",
    "Decent food but a bit overpriced for what you get.",
    "Best restaurant in Katy! The flavors are incredible.",
    "Nice ambiance but the food took too long to arrive.",
    "Fantastic meal! Everything was cooked to perfection."
  ]
  
  for (const restaurant of restaurants) {
    // Add 2-3 reviews per restaurant
    const numReviews = Math.floor(Math.random() * 2) + 2
    
    for (let i = 0; i < numReviews && i < users.length; i++) {
      const user = users[i]
      const rating = Math.floor(Math.random() * 2) + 3 // 3-5 stars
      
      await prisma.review.upsert({
        where: {
          restaurantId_userId: {
            restaurantId: restaurant.id,
            userId: user.id
          }
        },
        update: {},
        create: {
          restaurantId: restaurant.id,
          userId: user.id,
          rating: rating,
          title: rating >= 4 ? "Great experience!" : "Good but could improve",
          text: reviewTexts[Math.floor(Math.random() * reviewTexts.length)],
          verified: Math.random() > 0.5,
          photos: ''
        }
      })
    }
  }
  
  console.log('✅ Sample reviews seeded')
}

async function seedFavorites() {
  console.log('🌱 Seeding sample favorites...')
  
  const users = await prisma.user.findMany({ where: { role: 'USER' } })
  const restaurants = await prisma.restaurant.findMany({ take: 15 })
  
  for (const user of users) {
    // Each user favorites 3-5 restaurants
    const numFavorites = Math.floor(Math.random() * 3) + 3
    const shuffled = [...restaurants].sort(() => 0.5 - Math.random())
    const toFavorite = shuffled.slice(0, numFavorites)
    
    for (const restaurant of toFavorite) {
      await prisma.favorite.upsert({
        where: {
          userId_restaurantId: {
            userId: user.id,
            restaurantId: restaurant.id
          }
        },
        update: {},
        create: {
          userId: user.id,
          restaurantId: restaurant.id,
          notes: Math.random() > 0.7 ? "Love this place!" : null
        }
      })
    }
  }
  
  console.log('✅ Sample favorites seeded')
}

async function seedSpins() {
  console.log('🌱 Seeding sample spin history...')
  
  const users = await prisma.user.findMany()
  const restaurants = await prisma.restaurant.findMany()
  
  // Create some anonymous spins and some user spins
  for (let i = 0; i < 20; i++) {
    const isAnonymous = Math.random() > 0.6
    const restaurant = restaurants[Math.floor(Math.random() * restaurants.length)]
    
    await prisma.spin.create({
      data: {
        userId: isAnonymous ? null : users[Math.floor(Math.random() * users.length)].id,
        restaurantId: restaurant.id,
        spinParams: JSON.stringify({
          radius: 5,
          categories: [],
          openNow: false,
          priceLevel: null
        }),
        seed: Math.random().toString(36).substring(7),
        sessionId: isAnonymous ? `anon-${Math.random().toString(36).substring(7)}` : null
      }
    })
  }
  
  console.log('✅ Sample spins seeded')
}

async function seedAds() {
  console.log('🌱 Seeding sample ads...')
  
  const featuredRestaurants = await prisma.restaurant.findMany({ 
    where: { featured: true },
    take: 3 
  })
  
  for (const restaurant of featuredRestaurants) {
    const startDate = new Date()
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + 30) // 30-day campaign
    
    await prisma.ad.create({
      data: {
        restaurantId: restaurant.id,
        title: `Featured: ${restaurant.name}`,
        description: `Special offers and exclusive deals at ${restaurant.name}`,
        creative: JSON.stringify({
          image: restaurant.photos?.split(',')[0] || '/placeholder-ad.jpg',
          headline: `Visit ${restaurant.name} Today!`,
          body: restaurant.description || 'Experience the best dining in Katy'
        }),
        ctaUrl: `/restaurants/${restaurant.slug}`,
        ctaText: 'View Details',
        startDate: startDate,
        endDate: endDate,
        budget: 500.00,
        impressions: Math.floor(Math.random() * 1000),
        clicks: Math.floor(Math.random() * 50),
        active: true
      }
    })
  }
  
  console.log('✅ Sample ads seeded')
}

async function main() {
  console.log('🚀 Starting database seed...')
  
  try {
    await seedUsers()
    await seedRestaurants()
    await seedReviews()
    await seedFavorites()
    await seedSpins()
    await seedAds()
    
    console.log('✨ Database seeding completed successfully!')
  } catch (error) {
    console.error('❌ Error during seeding:', error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })