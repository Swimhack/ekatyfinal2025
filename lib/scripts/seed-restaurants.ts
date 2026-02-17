// Legacy Supabase seed script - use prisma/seed-katy.ts instead
// @ts-nocheck
import { createClient } from '@supabase/supabase-js'
import katyRestaurants from '@/lib/data/restaurants-seed'

// Initialize Supabase client with service role key for admin operations
function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing required environment variables for Supabase')
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

export async function seedRestaurants() {
  try {
    const supabase = createSupabaseClient()
    
    console.log('🌱 Starting restaurant database seeding...')
    console.log(`📊 Preparing to insert ${katyRestaurants.length} restaurants`)

    // Check if restaurants already exist to avoid duplicates
    const { data: existingRestaurants, error: checkError } = await supabase
      .from('restaurants')
      .select('name')
      .eq('source', 'manual_seed')

    if (checkError) {
      console.error('❌ Error checking existing restaurants:', checkError)
      return
    }

    const existingNames = (existingRestaurants || []).map((r: { name: string }) => r.name)
    const newRestaurants = katyRestaurants.filter(r => !existingNames.includes(r.name))

    if (newRestaurants.length === 0) {
      console.log('✅ All seed restaurants already exist in database')
      return
    }

    console.log(`🆕 Found ${newRestaurants.length} new restaurants to insert`)

    // Insert restaurants in batches to avoid API limits
    const batchSize = 10
    const batches = []
    for (let i = 0; i < newRestaurants.length; i += batchSize) {
      batches.push(newRestaurants.slice(i, i + batchSize))
    }

    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]
      console.log(`📦 Processing batch ${i + 1}/${batches.length} (${batch.length} restaurants)`)

      const { data, error } = await supabase
        .from('restaurants')
        .insert(batch as any)
        .select()

      if (error) {
        console.error(`❌ Error inserting batch ${i + 1}:`, error)
        errorCount += batch.length
        continue
      }

      successCount += data?.length || 0
      console.log(`✅ Successfully inserted ${data?.length} restaurants from batch ${i + 1}`)

      // Add a small delay between batches to be gentle on the API
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    console.log('🎉 Seeding completed!')
    console.log(`✅ Successfully inserted: ${successCount} restaurants`)
    console.log(`❌ Failed to insert: ${errorCount} restaurants`)
    console.log(`📊 Total in database: ${existingNames.length + successCount} restaurants`)

    // Generate some sample reviews for featured restaurants
    await seedSampleReviews()

  } catch (error) {
    console.error('💥 Fatal error during seeding:', error)
  }
}

async function seedSampleReviews() {
  // Sample reviews have been removed to keep only real-world data
  // Reviews will be added by actual users of the platform
  console.log('📝 Skipping sample reviews - using real user data only')
}

// Run the seeding if this script is executed directly
if (require.main === module) {
  seedRestaurants()
}