import { getRestaurantPhotos } from './restaurant-photos'

type RestaurantInsert = {
  name: string
  address: string
  lat: number
  lng: number
  phone?: string
  website?: string
  categories?: string[]
  hours?: any
  price_level?: number
  photos?: string[]
  featured?: boolean
  source?: string
  rating?: number
  review_count?: number
}

// Profiles fact-checked July 2026 against Yelp, official restaurant sites, and
// live listings. Entries that were fabricated, permanently closed, or outside
// the Katy area were removed (Guadalajara Mexican Restaurant, The Rustic,
// Hopdoddy Burger Bar, Pei Wei, Sushi Katana, Romano's Macaroni Grill,
// The Salt Traders Coastal Cooking, Del Frisco's Grille, Snooze, Local Foods).
// Coordinates are address-level approximations. Hours are omitted because no
// verified source was recorded for them; prefer the Google Places import
// (lib/google-places) for authoritative data.
export const katyRestaurants: Omit<RestaurantInsert, 'id' | 'created_at' | 'last_updated'>[] = [
  {
    name: "Chuy's",
    address: "21300 Katy Fwy, Katy, TX 77449",
    lat: 29.7862,
    lng: -95.748,
    phone: "(832) 772-1277",
    website: "https://www.chuys.com",
    categories: ["Mexican", "Tex-Mex", "Casual Dining"],
    price_level: 2,
    photos: getRestaurantPhotos("Chuy's"),
    featured: true,
    source: "manual_seed"
  },
  {
    name: "El Tiempo Cantina",
    address: "20095 Katy Fwy, Katy, TX 77450",
    lat: 29.7857,
    lng: -95.7235,
    phone: "(346) 365-2686",
    website: "https://www.eltiempocantina.com",
    categories: ["Mexican", "Tex-Mex"],
    price_level: 3,
    photos: getRestaurantPhotos("El Tiempo Cantina"),
    featured: false,
    source: "manual_seed"
  },
  {
    name: "Whataburger",
    address: "307 S Mason Rd, Katy, TX 77450",
    lat: 29.7838,
    lng: -95.7505,
    phone: "(281) 599-8952",
    website: "https://www.whataburger.com",
    categories: ["Burgers", "Fast Food"],
    price_level: 1,
    photos: getRestaurantPhotos("Whataburger"),
    featured: false,
    source: "manual_seed"
  },
  {
    name: "Pho Saigon",
    address: "890 S Mason Rd, Katy, TX 77450",
    lat: 29.777,
    lng: -95.7503,
    phone: "(281) 392-9022",
    website: "https://www.thephosaigon.com",
    categories: ["Vietnamese", "Pho", "Asian"],
    price_level: 1,
    photos: getRestaurantPhotos("Pho Saigon"),
    featured: false,
    source: "manual_seed"
  },
  {
    name: "Russo's New York Pizzeria",
    address: "1708 Spring Green Blvd, Ste 180, Katy, TX 77494",
    lat: 29.6995,
    lng: -95.8175,
    phone: "(832) 981-7727",
    website: "https://www.nypizzeria.com",
    categories: ["Pizza", "Italian"],
    price_level: 2,
    photos: getRestaurantPhotos("Russo's New York Pizzeria"),
    featured: false,
    source: "manual_seed"
  },
  {
    name: "Rudy's Country Store and Bar-B-Q",
    address: "21799 Katy Fwy, Katy, TX 77450",
    lat: 29.786,
    lng: -95.7515,
    phone: "(832) 772-7242",
    website: "https://rudysbbq.com",
    categories: ["BBQ", "Texas BBQ", "Casual Dining"],
    price_level: 2,
    photos: getRestaurantPhotos("Rudy's Country Store and Bar-B-Q"),
    featured: true,
    source: "manual_seed"
  },
  {
    name: "Perry's Steakhouse & Grille",
    address: "23501 Cinco Ranch Blvd, Ste Q100, Katy, TX 77494",
    lat: 29.739,
    lng: -95.7715,
    phone: "(281) 347-3600",
    website: "https://www.perryssteakhouse.com",
    categories: ["Steakhouse", "Fine Dining"],
    price_level: 4,
    photos: getRestaurantPhotos("Perry's Steakhouse & Grille"),
    featured: true,
    source: "manual_seed"
  },
  {
    name: "First Watch",
    address: "23659 Katy Fwy, Katy, TX 77494",
    lat: 29.787,
    lng: -95.79,
    phone: "(346) 998-6330",
    website: "https://www.firstwatch.com",
    categories: ["Breakfast", "Brunch", "American"],
    price_level: 2,
    photos: getRestaurantPhotos("First Watch"),
    featured: false,
    source: "manual_seed"
  },
  {
    name: "Mo's Irish Pub",
    address: "23511 Katy Fwy, Katy, TX 77450",
    lat: 29.7865,
    lng: -95.788,
    phone: "(281) 665-3535",
    website: "https://mosirishpub.com",
    categories: ["Irish", "Pub", "Sports Bar"],
    price_level: 2,
    photos: getRestaurantPhotos("Mo's Irish Pub"),
    featured: false,
    source: "manual_seed"
  },
  {
    name: "The Rouxpour",
    address: "2643 Commercial Center Blvd, Ste A300, Katy, TX 77494",
    lat: 29.7395,
    lng: -95.77,
    phone: "(281) 394-5013",
    website: "https://www.therouxpour.com",
    categories: ["Cajun", "Creole", "Seafood", "Louisiana"],
    price_level: 3,
    photos: getRestaurantPhotos("The Rouxpour"),
    featured: true,
    source: "manual_seed"
  }
]

export default katyRestaurants
