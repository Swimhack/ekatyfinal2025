import Link from 'next/link'

interface RestaurantCardProps {
  restaurant: any
}

export default function RestaurantCard({ restaurant }: RestaurantCardProps) {
  const getPriceLevelDisplay = (level: string) => {
    switch (level) {
      case 'BUDGET': return '$'
      case 'MODERATE': return '$$'
      case 'UPSCALE': return '$$$'
      case 'PREMIUM': return '$$$$'
      default: return '$$'
    }
  }

  const getDefaultImage = () => {
    return `https://images.unsplash.com/photo-${
      Math.random() > 0.5 ? '1517248135467-4c7edcad34c4' : '1414235077428-338989a2e8c0'
    }?w=400&h=300&fit=crop`
  }

  return (
    <Link href={`/restaurants/${restaurant.slug || restaurant.id}`} data-testid="restaurant-card">
      <div className="card overflow-hidden hover:shadow-xl transition-all duration-200 cursor-pointer group">
        {/* Image */}
        <div className="relative h-48 bg-gray-200 overflow-hidden">
          <img 
            src={restaurant.photos?.[0] || getDefaultImage()} 
            alt={restaurant.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
          {restaurant.featured && (
            <div className="absolute top-2 left-2 bg-primary-600 text-white px-2 py-1 rounded text-xs font-semibold">
              FEATURED
            </div>
          )}
          {restaurant.distance && (
            <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
              {restaurant.distance.toFixed(1)} mi
            </div>
          )}
        </div>
        
        {/* Content */}
        <div className="p-4">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
              {restaurant.name}
            </h3>
            <span className="text-sm font-medium text-gray-500">
              {getPriceLevelDisplay(restaurant.priceLevel)}
            </span>
          </div>
          
          {/* Categories */}
          <div className="flex flex-wrap gap-1 mb-2">
            {restaurant.categories?.slice(0, 3).map((cat: string) => (
              <span key={cat} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                {cat}
              </span>
            ))}
          </div>
          
          {/* Rating and Reviews */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center">
              {restaurant.rating && (
                <>
                  <div className="flex items-center">
                    <svg className="w-4 h-4 text-yellow-500 fill-current" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="ml-1 text-sm font-medium text-gray-700">
                      {restaurant.rating.toFixed(1)}
                    </span>
                  </div>
                  <span className="ml-2 text-xs text-gray-500">
                    ({restaurant.reviewCount || restaurant._count?.reviews || 0} reviews)
                  </span>
                </>
              )}
            </div>
            
            {restaurant._count?.favorites > 0 && (
              <div className="flex items-center text-xs text-gray-500">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                </svg>
                {restaurant._count.favorites}
              </div>
            )}
          </div>
          
          {/* Address */}
          {restaurant.address && (
            <p className="text-xs text-gray-500 mt-2 truncate">
              {restaurant.address}, {restaurant.city}, {restaurant.state}
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}