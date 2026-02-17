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

export const katyRestaurants: Omit<RestaurantInsert, 'id' | 'created_at' | 'last_updated'>[] = [
  // Mexican Restaurants
  {
    name: "Chuy's",
    address: "23501 Cinco Ranch Blvd, Katy, TX 77494",
    lat: 29.7399,
    lng: -95.7629,
    phone: "(281) 392-1447",
    website: "https://www.chuys.com",
    categories: ["Mexican", "Tex-Mex", "Casual Dining"],
    hours: {
      "monday": "11:00-22:00",
      "tuesday": "11:00-22:00", 
      "wednesday": "11:00-22:00",
      "thursday": "11:00-22:00",
      "friday": "11:00-23:00",
      "saturday": "11:00-23:00",
      "sunday": "11:00-22:00"
    },
    price_level: 2,
    photos: getRestaurantPhotos("Chuy's"),
    featured: true,
    source: "manual_seed"
  },
  {
    name: "Guadalajara Mexican Restaurant",
    address: "1320 S Mason Rd, Katy, TX 77450",
    lat: 29.7597,
    lng: -95.8279,
    phone: "(281) 492-9001",
    website: undefined,
    categories: ["Mexican", "Authentic Mexican", "Family-owned"],
    hours: {
      "monday": "10:00-22:00",
      "tuesday": "10:00-22:00", 
      "wednesday": "10:00-22:00",
      "thursday": "10:00-22:00",
      "friday": "10:00-23:00",
      "saturday": "10:00-23:00",
      "sunday": "10:00-22:00"
    },
    price_level: 2,
    photos: getRestaurantPhotos("Guadalajara Mexican Restaurant"),
    featured: false,
    source: "manual_seed"
  },
  {
    name: "El Tiempo Cantina",
    address: "25407 Kingsland Blvd, Katy, TX 77494",
    lat: 29.7089,
    lng: -95.8279,
    phone: "(281) 392-7706",
    website: "https://www.eltiempocantina.com",
    categories: ["Mexican", "Tex-Mex", "Upscale Casual"],
    hours: {
      "monday": "11:00-22:00",
      "tuesday": "11:00-22:00", 
      "wednesday": "11:00-22:00",
      "thursday": "11:00-22:00",
      "friday": "11:00-23:00",
      "saturday": "11:00-23:00",
      "sunday": "11:00-22:00"
    },
    price_level: 3,
    photos: getRestaurantPhotos("El Tiempo Cantina"),
    featured: true,
    source: "manual_seed"
  },

  // American/Burgers
  {
    name: "Whataburger",
    address: "1219 S Mason Rd, Katy, TX 77450",
    lat: 29.7618,
    lng: -95.8279,
    phone: "(281) 579-7274",
    website: "https://www.whataburger.com",
    categories: ["Burgers", "American", "Fast Food"],
    hours: {
      "monday": "00:00-23:59",
      "tuesday": "00:00-23:59", 
      "wednesday": "00:00-23:59",
      "thursday": "00:00-23:59",
      "friday": "00:00-23:59",
      "saturday": "00:00-23:59",
      "sunday": "00:00-23:59"
    },
    price_level: 1,
    photos: getRestaurantPhotos("Whataburger"),
    featured: false,
    source: "manual_seed"
  },
  {
    name: "The Rustic",
    address: "1836 S Mason Rd, Katy, TX 77450",
    lat: 29.7509,
    lng: -95.8279,
    phone: "(281) 398-8700",
    website: "https://www.therustic.com",
    categories: ["American", "BBQ", "Live Music", "Southern"],
    hours: {
      "monday": "16:00-22:00",
      "tuesday": "16:00-22:00", 
      "wednesday": "16:00-22:00",
      "thursday": "16:00-23:00",
      "friday": "16:00-01:00",
      "saturday": "11:00-01:00",
      "sunday": "11:00-22:00"
    },
    price_level: 3,
    photos: getRestaurantPhotos("The Rustic"),
    featured: true,
    source: "manual_seed"
  },
  {
    name: "Hopdoddy Burger Bar",
    address: "23501 Cinco Ranch Blvd, Katy, TX 77494",
    lat: 29.7396,
    lng: -95.7625,
    phone: "(281) 665-5400",
    website: "https://www.hopdoddy.com",
    categories: ["Burgers", "American", "Craft Beer", "Upscale Casual"],
    hours: {
      "monday": "11:00-22:00",
      "tuesday": "11:00-22:00", 
      "wednesday": "11:00-22:00",
      "thursday": "11:00-22:00",
      "friday": "11:00-23:00",
      "saturday": "11:00-23:00",
      "sunday": "11:00-22:00"
    },
    price_level: 2,
    photos: getRestaurantPhotos("Hopdoddy Burger Bar"),
    featured: false,
    source: "manual_seed"
  },

  // Asian Cuisine
  {
    name: "Pei Wei Asian Kitchen",
    address: "23501 Cinco Ranch Blvd, Katy, TX 77494",
    lat: 29.7401,
    lng: -95.7631,
    phone: "(281) 665-7434",
    website: "https://www.peiwei.com",
    categories: ["Asian", "Chinese", "Fast Casual"],
    hours: {
      "monday": "11:00-21:00",
      "tuesday": "11:00-21:00", 
      "wednesday": "11:00-21:00",
      "thursday": "11:00-21:00",
      "friday": "11:00-22:00",
      "saturday": "11:00-22:00",
      "sunday": "11:00-21:00"
    },
    price_level: 2,
    photos: getRestaurantPhotos("Pei Wei Asian Kitchen"),
    featured: false,
    source: "manual_seed"
  },
  {
    name: "Pho Saigon",
    address: "1414 S Mason Rd, Katy, TX 77450",
    lat: 29.7574,
    lng: -95.8279,
    phone: "(281) 398-3057",
    website: undefined,
    categories: ["Vietnamese", "Asian", "Pho", "Authentic"],
    hours: {
      "monday": "10:00-21:00",
      "tuesday": "10:00-21:00", 
      "wednesday": "10:00-21:00",
      "thursday": "10:00-21:00",
      "friday": "10:00-22:00",
      "saturday": "10:00-22:00",
      "sunday": "10:00-21:00"
    },
    price_level: 2,
    photos: getRestaurantPhotos("Pho Saigon"),
    featured: false,
    source: "manual_seed"
  },
  {
    name: "Sushi Katana",
    address: "25407 Kingsland Blvd, Katy, TX 77494",
    lat: 29.7087,
    lng: -95.8277,
    phone: "(281) 769-3292",
    website: undefined,
    categories: ["Japanese", "Sushi", "Asian"],
    hours: {
      "monday": "11:30-21:30",
      "tuesday": "11:30-21:30", 
      "wednesday": "11:30-21:30",
      "thursday": "11:30-21:30",
      "friday": "11:30-22:30",
      "saturday": "11:30-22:30",
      "sunday": "12:00-21:30"
    },
    price_level: 2,
    photos: getRestaurantPhotos("Sushi Katana"),
    featured: false,
    source: "manual_seed"
  },

  // Italian
  {
    name: "Romano's Macaroni Grill",
    address: "25407 Kingsland Blvd, Katy, TX 77494",
    lat: 29.7091,
    lng: -95.8281,
    phone: "(281) 392-0999",
    website: "https://www.macaronigrill.com",
    categories: ["Italian", "Pasta", "Casual Dining"],
    hours: {
      "monday": "11:00-22:00",
      "tuesday": "11:00-22:00", 
      "wednesday": "11:00-22:00",
      "thursday": "11:00-22:00",
      "friday": "11:00-23:00",
      "saturday": "11:00-23:00",
      "sunday": "11:00-22:00"
    },
    price_level: 2,
    photos: getRestaurantPhotos("Romano's Macaroni Grill"),
    featured: false,
    source: "manual_seed"
  },
  {
    name: "Russo's New York Pizzeria",
    address: "25402 Kingsland Blvd, Katy, TX 77494",
    lat: 29.7088,
    lng: -95.8276,
    phone: "(281) 769-7900",
    website: "https://www.russos.com",
    categories: ["Pizza", "Italian", "New York Style"],
    hours: {
      "monday": "11:00-22:00",
      "tuesday": "11:00-22:00", 
      "wednesday": "11:00-22:00",
      "thursday": "11:00-22:00",
      "friday": "11:00-23:00",
      "saturday": "11:00-23:00",
      "sunday": "11:00-22:00"
    },
    price_level: 2,
    photos: getRestaurantPhotos("Russo's New York Pizzeria"),
    featured: false,
    source: "manual_seed"
  },

  // BBQ & Southern
  {
    name: "Rudy's Country Store and Bar-B-Q",
    address: "25323 Kingsland Blvd, Katy, TX 77494",
    lat: 29.7104,
    lng: -95.8243,
    phone: "(281) 392-7839",
    website: "https://www.rudysbbq.com",
    categories: ["BBQ", "American", "Southern", "Casual Dining"],
    hours: {
      "monday": "07:00-22:00",
      "tuesday": "07:00-22:00", 
      "wednesday": "07:00-22:00",
      "thursday": "07:00-22:00",
      "friday": "07:00-22:30",
      "saturday": "07:00-22:30",
      "sunday": "07:00-22:00"
    },
    price_level: 2,
    photos: getRestaurantPhotos("Rudy's Country Store and Bar-B-Q"),
    featured: true,
    source: "manual_seed"
  },
  {
    name: "The Salt Traders Coastal Cooking",
    address: "9522 Katy Fwy, Houston, TX 77024",
    lat: 29.7818,
    lng: -95.5657,
    phone: "(713) 463-7258",
    website: "https://www.salttraders.com",
    categories: ["Seafood", "American", "Coastal", "Upscale Casual"],
    hours: {
      "monday": "11:00-22:00",
      "tuesday": "11:00-22:00", 
      "wednesday": "11:00-22:00",
      "thursday": "11:00-22:00",
      "friday": "11:00-23:00",
      "saturday": "10:00-23:00",
      "sunday": "10:00-22:00"
    },
    price_level: 3,
    photos: getRestaurantPhotos("The Salt Traders Coastal Cooking"),
    featured: true,
    source: "manual_seed"
  },

  // Fine Dining
  {
    name: "Perry's Steakhouse & Grille",
    address: "23501 Cinco Ranch Blvd, Katy, TX 77494",
    lat: 29.7403,
    lng: -95.7633,
    phone: "(281) 579-3800",
    website: "https://www.perryssteakhouse.com",
    categories: ["Steakhouse", "Fine Dining", "American", "Upscale"],
    hours: {
      "monday": "16:00-22:00",
      "tuesday": "16:00-22:00", 
      "wednesday": "16:00-22:00",
      "thursday": "16:00-22:00",
      "friday": "16:00-23:00",
      "saturday": "16:00-23:00",
      "sunday": "16:00-21:00"
    },
    price_level: 4,
    photos: getRestaurantPhotos("Perry's Steakhouse & Grille"),
    featured: true,
    source: "manual_seed"
  },
  {
    name: "Del Frisco's Grille",
    address: "4061 Westheimer Rd, Houston, TX 77027",
    lat: 29.7370,
    lng: -95.4618,
    phone: "(713) 355-2600",
    website: "https://www.delfriscos.com",
    categories: ["Steakhouse", "Fine Dining", "American"],
    hours: {
      "monday": "11:00-22:00",
      "tuesday": "11:00-22:00", 
      "wednesday": "11:00-22:00",
      "thursday": "11:00-22:00",
      "friday": "11:00-23:00",
      "saturday": "11:00-23:00",
      "sunday": "11:00-21:00"
    },
    price_level: 4,
    photos: getRestaurantPhotos("Del Frisco's Grille"),
    featured: false,
    source: "manual_seed"
  },

  // Breakfast & Coffee
  {
    name: "First Watch",
    address: "25407 Kingsland Blvd, Katy, TX 77494",
    lat: 29.7085,
    lng: -95.8275,
    phone: "(281) 829-8330",
    website: "https://www.firstwatch.com",
    categories: ["Breakfast", "Brunch", "American", "Healthy Options"],
    hours: {
      "monday": "07:00-14:30",
      "tuesday": "07:00-14:30", 
      "wednesday": "07:00-14:30",
      "thursday": "07:00-14:30",
      "friday": "07:00-14:30",
      "saturday": "07:00-14:30",
      "sunday": "07:00-14:30"
    },
    price_level: 2,
    photos: getRestaurantPhotos("First Watch"),
    featured: false,
    source: "manual_seed"
  },
  {
    name: "Snooze, an A.M. Eatery",
    address: "4410 Westheimer Rd, Houston, TX 77027",
    lat: 29.7370,
    lng: -95.4718,
    phone: "(713) 360-7666",
    website: "https://www.snoozeeatery.com",
    categories: ["Breakfast", "Brunch", "American", "Creative"],
    hours: {
      "monday": "07:00-14:00",
      "tuesday": "07:00-14:00", 
      "wednesday": "07:00-14:00",
      "thursday": "07:00-14:00",
      "friday": "07:00-14:00",
      "saturday": "07:00-15:00",
      "sunday": "07:00-15:00"
    },
    price_level: 2,
    photos: getRestaurantPhotos("Snooze, an A.M. Eatery"),
    featured: false,
    source: "manual_seed"
  },

  // Local Favorites & Unique Spots
  {
    name: "Local Foods",
    address: "23501 Cinco Ranch Blvd, Katy, TX 77494",
    lat: 29.7397,
    lng: -95.7627,
    phone: "(281) 665-5300",
    website: "https://www.local-foods.com",
    categories: ["American", "Healthy Options", "Fast Casual", "Local"],
    hours: {
      "monday": "11:00-21:00",
      "tuesday": "11:00-21:00", 
      "wednesday": "11:00-21:00",
      "thursday": "11:00-21:00",
      "friday": "11:00-22:00",
      "saturday": "11:00-22:00",
      "sunday": "11:00-21:00"
    },
    price_level: 2,
    photos: getRestaurantPhotos("Local Foods"),
    featured: true,
    source: "manual_seed"
  },
  {
    name: "Mo's Irish Pub",
    address: "1019 S Mason Rd, Katy, TX 77450",
    lat: 29.7662,
    lng: -95.8279,
    phone: "(281) 398-6777",
    website: "https://www.mosirishpub.com",
    categories: ["Irish", "Pub", "American", "Sports Bar"],
    hours: {
      "monday": "11:00-02:00",
      "tuesday": "11:00-02:00", 
      "wednesday": "11:00-02:00",
      "thursday": "11:00-02:00",
      "friday": "11:00-02:00",
      "saturday": "11:00-02:00",
      "sunday": "11:00-02:00"
    },
    price_level: 2,
    photos: getRestaurantPhotos("Mo's Irish Pub"),
    featured: false,
    source: "manual_seed"
  },
  {
    name: "The Rouxpour",
    address: "25407 Kingsland Blvd, Katy, TX 77494",
    lat: 29.7083,
    lng: -95.8273,
    phone: "(281) 665-7689",
    website: "https://www.rouxpour.com",
    categories: ["Cajun", "Creole", "Seafood", "Louisiana"],
    hours: {
      "monday": "11:00-22:00",
      "tuesday": "11:00-22:00", 
      "wednesday": "11:00-22:00",
      "thursday": "11:00-22:00",
      "friday": "11:00-23:00",
      "saturday": "10:00-23:00",
      "sunday": "10:00-22:00"
    },
    price_level: 3,
    photos: getRestaurantPhotos("The Rouxpour"),
    featured: true,
    source: "manual_seed"
  }
]

export default katyRestaurants