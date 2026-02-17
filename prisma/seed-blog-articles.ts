import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(8, 0, 0, 0)
  return d
}

const articles = [
  {
    title: 'Why Cinco Ranch Blvd Is Katy\'s Best Restaurant Row',
    slug: 'why-cinco-ranch-blvd-is-katys-best-restaurant-row',
    metaDescription: 'Discover why Cinco Ranch Blvd at LaCenterra has become Katy\'s premier dining destination, from Perry\'s Steakhouse to Dish Society.',
    keywords: 'Katy restaurants, Cinco Ranch Blvd, LaCenterra dining, Katy TX food, Perry\'s Steakhouse Katy',
    publishedDate: daysAgo(1),
    content: `<p>If you'd told me twenty years ago that a stretch of Cinco Ranch Blvd would become one of the best dining corridors in west Houston, I'd have laughed. Back then, this was open prairie. Now? LaCenterra is the heartbeat of Katy dining.</p>

<p>Walk the main plaza and you're within a few hundred feet of <strong>Perry's Steakhouse</strong>, where the legendary Friday lunch pork chop draws crowds from all over Houston. Across the way, <strong>The Oaks Kitchen + Bar</strong> serves craft cocktails and one of the best weekend brunches in town. My wife and I have made it our Saturday ritual.</p>

<p>For weeknight family dinners, <strong>Dish Society</strong> is our go-to. Farm-to-table comfort food, healthy options the kids actually eat, and they're open at 7 AM for the early risers. Right next door, <strong>Sushi Hana</strong> delivers some of the freshest sushi west of the Beltway.</p>

<p>What makes this strip special isn't just the food. It's the walkability. Park once and you can stroll between a $15 lunch at Dish Society and a $60 anniversary dinner at Perry's. The fountain plaza is where my kids learned to people-watch. This little stretch of Cinco Ranch Blvd has become our family's dining room away from home.</p>

<p><a href="/discover">Explore all Katy restaurants on eKaty</a></p>`,
  },
  {
    title: 'The Best Budget Eats in Katy: Great Food Under $15',
    slug: 'best-budget-eats-in-katy-great-food-under-15',
    metaDescription: 'Feed the whole family without breaking the bank. A Katy local\'s guide to the best affordable restaurants including Midway BBQ and Torchy\'s Tacos.',
    keywords: 'cheap eats Katy TX, budget restaurants Katy, affordable dining Katy Texas, Midway BBQ, Torchy\'s Tacos Katy',
    publishedDate: daysAgo(4),
    content: `<p>Raising three kids in Katy means I've become an expert at finding great food that won't empty my wallet. After twenty years here, these are the spots where flavor punches way above the price tag.</p>

<p><strong>Midway BBQ</strong> on Highway Blvd is a Katy institution. They've been smoking meat since before most of us moved here. It's cash only, the line can wrap around the building on Saturdays, and a loaded plate with two sides runs about $12. My family of five eats like kings for under $50. If you haven't been, you're not really from Katy.</p>

<p><strong>Torchy's Tacos</strong> on Katy Freeway brought Austin's creative taco energy to our doorstep. The Trailer Park taco is legendary, and at $4-5 per taco, two of them with chips and queso makes a solid meal under $15. The kids get the simple beef tacos and never complain.</p>

<p><strong>Pho One</strong> on Westheimer Parkway serves enormous bowls of pho for around $11. On a cold January evening, there's nothing better. And <strong>Kolache Factory</strong> handles breakfast for under $8 per person. Czech kolaches are a Texas thing, and this is how we start most Saturday mornings before soccer games.</p>

<p><a href="/spinner">Can't decide? Let Grub Roulette pick for you</a></p>`,
  },
  {
    title: 'Katy Asian Town: The Food Scene You Need to Explore',
    slug: 'katy-asian-town-food-scene-you-need-to-explore',
    metaDescription: 'Katy Asian Town on the Grand Parkway has transformed Katy\'s dining scene with 40+ authentic Asian restaurants. A local family\'s guide to exploring it.',
    keywords: 'Katy Asian Town, Asian restaurants Katy TX, Grand Parkway restaurants, Vietnamese food Katy, H-Mart Katy',
    publishedDate: daysAgo(7),
    content: `<p>The single biggest change to Katy's food scene in my twenty years here happened at the corner of I-10 and the Grand Parkway. Katy Asian Town didn't just add restaurants. It added an entire culinary world.</p>

<p>Anchored by H-Mart, the complex now houses over 40 dining spots spanning Vietnamese, Chinese, Korean, Japanese, Thai, and Malaysian cuisines. I remember when this corner was an empty field. Now my kids can tell the difference between Sichuan and Cantonese cooking, and they learned that here.</p>

<p>If you're new to the area, start with <strong>Pho One</strong> on Westheimer Parkway. Their pho is approachable, the portions are enormous, and the price is right. From there, work your way into the more adventurous spots. Malaysian street food, hand-pulled noodles, Korean BBQ where you cook at your table. Each visit reveals something new.</p>

<p>Closer to Cinco Ranch, <strong>Sushi Hana</strong> on Cinco Ranch Blvd is an excellent Japanese option with a great sushi bar. But for the full experience, you need to drive the Grand Parkway corridor. Pack the family in the car and make an afternoon of it. Hit H-Mart for groceries afterward. My wife discovered ingredients there she'd been ordering online for years.</p>

<p>Katy Asian Town turned our suburb into a destination. <a href="/discover?category=Asian">Browse Asian restaurants on eKaty</a></p>`,
  },
  {
    title: 'Date Night in Katy: 4 Restaurants That Will Impress',
    slug: 'date-night-in-katy-4-restaurants-that-will-impress',
    metaDescription: 'Skip the drive to Houston. These four Katy restaurants deliver unforgettable date nights right in your backyard.',
    keywords: 'date night Katy TX, romantic restaurants Katy, upscale dining Katy Texas, Antonia\'s Italian Katy',
    publishedDate: daysAgo(10),
    content: `<p>My wife and I used to drive 45 minutes into Montrose or the Heights for a proper date night. Not anymore. Katy's upscale dining has caught up, and honestly, some of it has surpassed what the inner loop offers.</p>

<p><strong>Perry's Steakhouse</strong> is the obvious choice and it delivers every time. The atmosphere is refined without being stuffy, the wine list is serious, and that pork chop has earned its reputation. Reserve a booth and you'll forget you're in a suburb. It's our anniversary spot.</p>

<p><strong>Antonia's Cucina Italiana</strong> on Westheimer Parkway is the hidden gem. Homemade pasta, a thoughtful wine bar, and a romantic atmosphere that feels like a neighborhood trattoria in the Hill Country. They're closed Mondays, so plan accordingly. My wife says their carbonara changed her life. I don't argue.</p>

<p><strong>The Oaks Kitchen + Bar</strong> brings a modern American energy with craft cocktails that rival any Houston bar. The outdoor patio on a cool evening is perfect. And <strong>Alicia's Mexican Grille</strong> near Katy Mills elevates Mexican cuisine with handcrafted tequila cocktails, an upscale atmosphere, and a menu that goes well beyond the Tex-Mex basics.</p>

<p>Four restaurants. Zero reason to fight I-10 traffic for a great night out. <a href="/discover">Find your perfect date spot</a></p>`,
  },
  {
    title: 'A Local\'s Guide to Tex-Mex and Mexican Food in Katy',
    slug: 'locals-guide-to-tex-mex-and-mexican-food-in-katy',
    metaDescription: 'From budget tacos to upscale Mexican cuisine, Katy\'s Tex-Mex scene covers every craving. A 20-year local shares his favorites.',
    keywords: 'Mexican restaurants Katy TX, Tex-Mex Katy, best Mexican food Katy Texas, Los Cucos Katy, Vida Mariscos',
    publishedDate: daysAgo(14),
    content: `<p>You can't live in Katy for twenty years without developing strong opinions about Mexican food. This is Texas, and Tex-Mex isn't just cuisine here. It's culture. Here's how the Mexican food landscape breaks down in our little corner of Fort Bend County.</p>

<p>For everyday Tex-Mex, <strong>Los Cucos</strong> on Highway Blvd has been a fixture since before the LaCenterra days. The margaritas are dangerously good, the enchiladas are consistent, and they know my family by name. That's the mark of a real neighborhood joint. My standing order: cheese enchiladas, rice, beans, extra green sauce.</p>

<p><strong>Torchy's Tacos</strong> brought something different. Their creative approach, think fried avocado tacos and green chile queso, appeals to the kids who want something beyond the standard combo plate. It's fast, affordable, and always packed. There's a reason they expanded from Austin.</p>

<p>When we want to step it up, <strong>Alicia's Mexican Grille</strong> delivers an upscale experience with a serious tequila bar and dishes that go deep into Mexican regional cooking. And for something completely unique, <strong>Vida Mariscos</strong> on Kingsland Blvd focuses on Mexican seafood. Their ceviches and aguachiles are unlike anything else in Katy. It's coastal Mexican cuisine done right, and it's become our Friday night ritual.</p>

<p><a href="/discover?category=Mexican">Explore all Mexican restaurants in Katy</a></p>`,
  },
  {
    title: 'Where to Get the Best Seafood in Katy, Texas',
    slug: 'where-to-get-best-seafood-in-katy-texas',
    metaDescription: 'Gulf Coast seafood meets Cajun tradition in Katy. Discover the best spots for shrimp, crawfish, ceviche, and po\'boys from a local who\'s tried them all.',
    keywords: 'seafood restaurants Katy TX, Cajun food Katy, crawfish Katy Texas, Babin\'s Seafood, BB\'s Tex-Orleans',
    publishedDate: daysAgo(17),
    content: `<p>Living ninety minutes from the Gulf of Mexico means great seafood isn't a luxury in Katy. It's an expectation. Over twenty years, I've watched our seafood options evolve from a couple of chain restaurants to a genuinely diverse scene. Here are the spots that have earned permanent spots in our family rotation.</p>

<p><strong>Babin's Seafood House</strong> on Colonial Parkway is family-owned and feels like it. Their Cajun-style cooking, think blackened catfish, shrimp baskets, and fried oyster po'boys, has a New Orleans spirit that's hard to find this far from Louisiana. The portions are generous, the prices are fair, and it's been a Katy staple for years. We bring the grandparents here.</p>

<p><strong>BB's Tex-Orleans</strong> on the Grand Parkway takes the Cajun angle further with live music, a buzzing atmosphere, and some of the best crawfish in the area during season. Their po'boys are stuffed, the gumbo is thick, and the energy on a Friday night makes you feel like you're on Magazine Street. My kids love it because it's loud enough that nobody notices them.</p>

<p>For a completely different approach, <strong>Vida Mariscos</strong> on Kingsland Blvd serves Mexican coastal seafood. Their ceviches, tostadas, and aguachiles are fresh, vibrant, and unlike anything the Cajun spots offer. It's the kind of range that makes Katy's food scene special.</p>

<p><a href="/discover?category=Seafood">Find more seafood options on eKaty</a></p>`,
  },
  {
    title: 'Saturday Morning in Katy: The Best Brunch Spots',
    slug: 'saturday-morning-in-katy-best-brunch-spots',
    metaDescription: 'Start your weekend right with Katy\'s best breakfast and brunch spots, from early-morning kolaches to farm-to-table brunch at LaCenterra.',
    keywords: 'brunch Katy TX, breakfast restaurants Katy, weekend brunch Katy Texas, Kolache Factory, Dish Society brunch',
    publishedDate: daysAgo(21),
    content: `<p>Saturday mornings in the Strickland house follow a predictable pattern. Someone wakes up hungry, nobody wants to cook, and the debate begins: where are we going? After two decades of Saturday mornings in Katy, here's our well-tested rotation.</p>

<p><strong>Kolache Factory</strong> on Westheimer Parkway is the 6 AM option. When the kids have early soccer games, we swing through for a bag of kolaches and coffee. If you didn't grow up in Texas, a kolache is a soft Czech pastry stuffed with sausage, cheese, or fruit. At under $3 each, it's the most efficient breakfast in Katy. We get a dozen and eat them on the way to the fields.</p>

<p>When we have time to actually sit down, <strong>Dish Society</strong> is our go-to. They open at 7 AM, the menu leans healthy and farm-to-table, and they manage to make quinoa bowls that my teenagers willingly eat. The avocado toast is honestly great. The atmosphere is bright and airy, and the coffee is strong.</p>

<p>For a fancier weekend brunch, <strong>The Oaks Kitchen + Bar</strong> opens at 10 AM on Saturdays with a menu that includes craft cocktails alongside eggs Benedict. This is the adult brunch, the one where the grandparents watch the kids and we enjoy a proper morning out.</p>

<p><strong>La Madeleine</strong> near Katy Mills rounds it out with French pastries, quiche, and a cafe atmosphere. It's quiet, it's civilized, and the croissants are legitimately good. <a href="/discover">Explore more Katy restaurants</a></p>`,
  },
  {
    title: '20 Years in Katy: How the Restaurant Scene Has Changed',
    slug: '20-years-in-katy-how-restaurant-scene-has-changed',
    metaDescription: 'A long-time Katy resident reflects on two decades of explosive restaurant growth, from a handful of chains to a diverse dining destination.',
    keywords: 'Katy TX growth, Katy Texas restaurants history, dining Katy Texas, LaCenterra, Katy Asian Town history',
    publishedDate: daysAgo(25),
    content: `<p>When my family moved to Katy in the mid-2000s, our dining options were Midway BBQ, Los Cucos, and whatever was near Katy Mills. That was about it. Friday night meant driving into Houston. The idea of a destination food scene out here would've been laughable.</p>

<p>Then LaCenterra opened on Cinco Ranch Blvd and everything shifted. Suddenly we had walkable dining. Perry's Steakhouse arrived and proved that fine dining could work in the suburbs. The Oaks, Dish Society, and Antonia's followed. A real restaurant row materialized where cattle once grazed.</p>

<p>The Grand Parkway changed the game again. When the 99 corridor opened up, Katy Asian Town planted its flag at the I-10 interchange. Overnight, we went from zero authentic Asian options to forty-plus. H-Mart anchored a complex that introduced our family to Malaysian, Korean, and Sichuan cooking. My kids grew up with a culinary vocabulary I never had.</p>

<p>Today, with over 300,000 people in the greater Katy area and an average household income north of $180,000, the restaurant scene reflects what this community has become: diverse, ambitious, and family-oriented. The Katy Taste Fest draws thousands. The Rice Harvest Festival reminds us where we came from. Wild West Brewfest celebrates where we're going.</p>

<p>We don't drive into Houston for dinner anymore. Houston drives out to us. <a href="/spinner">Discover something new with Grub Roulette</a></p>`,
  },
]

async function main() {
  console.log('Seeding blog articles...')

  for (const article of articles) {
    const result = await prisma.blogArticle.upsert({
      where: { slug: article.slug },
      update: {
        title: article.title,
        content: article.content,
        metaDescription: article.metaDescription,
        keywords: article.keywords,
        publishedDate: article.publishedDate,
        status: 'published',
      },
      create: {
        title: article.title,
        slug: article.slug,
        content: article.content,
        metaDescription: article.metaDescription,
        keywords: article.keywords,
        authorName: 'James Strickland',
        contactEmail: 'james@ekaty.com',
        publishedDate: article.publishedDate,
        status: 'published',
      },
    })
    console.log(`  [OK] ${result.title}`)
  }

  console.log(`\nSeeded ${articles.length} blog articles.`)
}

main()
  .catch((e) => {
    console.error('Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
