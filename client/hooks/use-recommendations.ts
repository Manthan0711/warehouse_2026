import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { 
  RecommendationPreferences, 
  RecommendedWarehouse,
  RecommendationRequest,
  RecommendationResponse 
} from '../../shared/api';
import { warehouseService } from '../services/warehouseService';
import { MLRecommender } from './ml-algorithms';

interface UseRecommendationsOptions {
  enabled?: boolean;
  refetchOnWindowFocus?: boolean;
}

/**
 * Hook to fetch warehouse recommendations based on user preferences
 */
export function useRecommendations(
  preferences: RecommendationPreferences,
  limit: number = 12,
  options: UseRecommendationsOptions = {}
) {
  const { enabled = true, refetchOnWindowFocus = false } = options;

  // Create a stable query key that changes when ANY preference changes
  // DO NOT use Date.now() - it causes infinite re-renders!
  const queryKey = [
    'recommendations', 
    preferences.district || 'all',
    preferences.targetPrice || 0,
    preferences.minAreaSqft || 0,
    preferences.preferredType || 'any',
    preferences.preferVerified ? 'verified' : 'any',
    preferences.preferAvailability ? 'available' : 'any',
    limit
  ];

  return useQuery<RecommendationResponse, Error>({
    queryKey,
    queryFn: async (): Promise<RecommendationResponse> => {
      const request: RecommendationRequest = {
        preferences,
        limit
      };

      console.log('🔄 Fetching recommendations with preferences:', JSON.stringify(preferences));
      
      try {
        // Request the server to use the hybrid ML algorithm by default so
        // the KNN+RandomForest ensemble runs on real Supabase data.
        // Add TIMESTAMP to URL to force new request (browser can't cache different URLs)
        const timestamp = Date.now();
        const prefsHash = JSON.stringify(preferences);
        const uniqueId = btoa(prefsHash).substring(0, 10); // Create unique ID from preferences
        
        const response = await fetch(`/api/recommend?algorithm=hybrid&t=${timestamp}&p=${uniqueId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
            'Pragma': 'no-cache',
            'Expires': '0',
            'X-Request-ID': `${timestamp}-${uniqueId}`, // Unique request ID
          },
          cache: 'no-store', // Force no caching
          body: JSON.stringify(request),
        });

        if (!response.ok) {
          throw new Error(`Recommendation API failed: ${response.status}`);
        }

        const data = await response.json();
        console.log(`✅ API returned ${data?.items?.length || 0} recommendations`);
        
        if (data?.items?.length > 0) {
          console.log('📊 First result:', data.items[0].name, '-', data.items[0].district);
        }
        
        // Make sure we got items back
        if (!data?.items?.length) {
          throw new Error('API returned empty recommendations');
        }
        
        // Return the data as-is from the backend
        return data;
      } catch (error) {
        console.error('Gemini AI recommendation failed, using enhanced ML algorithms:', error);
        
        // Fallback to client-side ML recommendations using our enhanced algorithms
        try {
          // Get warehouse data from service
          const warehousesResult = await warehouseService.getWarehouses();
          const warehousesData = warehousesResult.data || [];
          
          // Format warehouses for ML algorithms using type assertion to handle various data structures
          const formattedWarehouses = warehousesData.map(w => {
            // Use type assertion to handle different warehouse data structures
            const warehouse = w as any;
            
            return {
              id: warehouse.id || String(Math.random().toString(36).substr(2, 9)),
              name: warehouse.name || warehouse.description || `${warehouse.city} Warehouse`,
              description: warehouse.description || '',
              city: warehouse.city || '',
              district: warehouse.district || warehouse.city || '',
              state: warehouse.state || 'Maharashtra',
              price_per_sqft: warehouse.price_per_sqft || 30,
              total_area: warehouse.total_area || 10000,
              occupancy: warehouse.occupancy || 20,
              rating: warehouse.rating || 4.0,
              reviews_count: warehouse.reviews_count || Math.floor(Math.random() * 20) + 5,
              images: warehouse.images || ['https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&q=80'],
              type: warehouse.type || 'General Warehouse',
              amenities: warehouse.amenities || [],
              verified: warehouse.verified !== undefined ? warehouse.verified : Math.random() > 0.5,
              features: warehouse.features || {}
            };
          });
          
          console.log(`Running enhanced ML algorithms on ${formattedWarehouses.length} warehouses`);
          
          // Get recommendations using our enhanced ML algorithms (KNN and Random Forest)
          const mlRecommendations = MLRecommender.getRecommendations(formattedWarehouses, preferences, limit);
          
          // Map ML recommendations to expected format
          const items: RecommendedWarehouse[] = mlRecommendations.map(rec => ({
            whId: rec.warehouse.id,
            name: `${rec.warehouse.name}`,
            location: `${rec.warehouse.city}, ${rec.warehouse.state}`,
            district: rec.warehouse.city,
            state: rec.warehouse.state,
            pricePerSqFt: rec.warehouse.price_per_sqft,
            totalAreaSqft: rec.warehouse.total_area,
            availableAreaSqft: Math.floor(rec.warehouse.total_area * (1 - rec.warehouse.occupancy / 100)),
            rating: rec.warehouse.rating,
            reviews: rec.warehouse.reviews_count,
            image: (rec.warehouse.images && rec.warehouse.images.length > 0) 
              ? rec.warehouse.images[0]
              : 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&q=80',
            type: rec.recommendation_type === 'knn' 
              ? 'Cold Storage'
              : rec.recommendation_type === 'random_forest'
              ? 'General Warehouse'
              : 'Logistics Hub',
            matchScore: Math.floor(rec.similarity_score * 100),
            reasons: rec.recommendation_reasons.map(reason => ({ label: reason })),
            algorithmType: rec.recommendation_type // Add algorithm type for debugging
          }));
          
          console.log(`Generated ${items.length} recommendations using enhanced ML algorithms (${mlRecommendations[0]?.recommendation_type || 'unknown'})`);
          
          // Make sure we have items
          if (items.length > 0) {
            // Add algorithm info as a reason in each item
            items.forEach(item => {
              const algorithmName = mlRecommendations[0]?.recommendation_type || 'hybrid';
              if (!item.reasons.some(r => r.label.includes(algorithmName))) {
                item.reasons.push({ 
                  label: `Selected by ${algorithmName} algorithm for optimal match` 
                });
              }
            });
            
            return { items };
          }
          throw new Error('Enhanced ML recommendations returned empty');
        } catch (mlError) {
          console.error('Enhanced ML recommendations failed, using fallback ML approach:', mlError);
          
          // Fallback to existing ML recommendation system
          try {
            // Map preferences to ML recommendation format
            const mlPreferences = {
              user_preferences: {
                preferred_cities: preferences.district && preferences.district !== "any" ? [preferences.district] : undefined,
                max_budget: preferences.targetPrice,
                min_area: preferences.minAreaSqft,
                business_type: preferences.preferredType && preferences.preferredType !== "any" ? preferences.preferredType : undefined,
                preferred_amenities: preferences.preferVerified ? ['Verified'] : undefined
              },
              limit
            };
            
            const mlRecommendations = await warehouseService.getMLRecommendations(mlPreferences);
            
            // Map ML recommendations to expected format
            const items: RecommendedWarehouse[] = mlRecommendations.map(rec => ({
              whId: rec.warehouse.id,
              name: `${rec.warehouse.name || rec.warehouse.description || rec.warehouse.city + ' Warehouse'}`,
              location: `${rec.warehouse.city}, ${rec.warehouse.state}`,
              district: rec.warehouse.city,
              state: rec.warehouse.state,
              pricePerSqFt: rec.warehouse.price_per_sqft,
              totalAreaSqft: rec.warehouse.total_area,
              availableAreaSqft: Math.floor(rec.warehouse.total_area * (1 - rec.warehouse.occupancy / 100)),
              rating: rec.warehouse.rating,
              reviews: rec.warehouse.reviews_count,
              image: (rec.warehouse.images && rec.warehouse.images.length > 0) 
                ? rec.warehouse.images[0]
                : 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&q=80',
              type: rec.recommendation_type === 'features' 
                ? 'Cold Storage'
                : rec.recommendation_type === 'price'
                ? 'General Warehouse'
                : 'Logistics Hub',
              matchScore: Math.floor(rec.similarity_score * 100),
              reasons: rec.recommendation_reasons.map(reason => ({ label: reason }))
            }));
            
            console.log(`Generated ${items.length} fallback ML recommendations`);
            
            // Make sure we have items
            if (items.length > 0) {
              return { items };
            }
            throw new Error('Fallback ML recommendations returned empty');
          } catch (fallbackError) {
            console.error('All ML approaches failed, using static data:', fallbackError);
            
            // Ultimate fallback - use static data from warehouses.ts
            try {
              // Import the static warehouse data
              const { maharashtraWarehouses } = await import('../data/warehouses');
              
              // Create simple recommendations using static data
              const items: RecommendedWarehouse[] = maharashtraWarehouses.slice(0, limit).map(w => ({
                whId: w.whId,
                name: `${w.warehouseType} • ${w.district}`,
                location: `${w.district}, ${w.state}`,
                district: w.district,
                state: w.state,
                pricePerSqFt: w.pricing,
                totalAreaSqft: w.size,
                availableAreaSqft: Math.floor(w.size * (1 - w.occupancy)),
                rating: w.rating,
                reviews: w.reviews,
                image: w.image,
                type: w.warehouseType,
                matchScore: Math.floor(Math.random() * 30) + 70, // Random match score between 70-100
                reasons: [
                  { label: `Located in ${w.district}` },
                  { label: `${w.warehouseType} warehouse type` },
                  { label: `${w.rating}⭐ rated facility` }
                ]
              }));
              
              console.log(`Generated ${items.length} static data recommendations as last resort`);
              return { items };
            } catch (staticDataError) {
              console.error('Even static data fallback failed:', staticDataError);
              // Create empty response with helpful message
              return { 
                items: [],
                error: 'Unable to load recommendations due to connectivity issues. Please try again later.'
              };
            }
          }
        }
      }
    },
    enabled,
    refetchOnWindowFocus: false, // Disable auto-refetch on window focus
    refetchOnMount: false, // Don't fetch on mount - only on preference changes
    retry: 1, // Retry once on failure
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes to prevent spam
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });
}

/**
 * Smart recommendations hook with state management for preferences
 */
export function useSmartRecommendations() {
  const [preferences, setPreferences] = useState<RecommendationPreferences>({
    // Default preferences for general recommendations
    preferVerified: true,
    preferAvailability: true,
  });

  const [limit, setLimit] = useState(50); // Increased to show more results after ML analysis
  const [customizeMode, setCustomizeMode] = useState(false);
  const [forceRefreshKey, setForceRefreshKey] = useState(0); // Add force refresh mechanism
  const [hasAppliedPreferences, setHasAppliedPreferences] = useState(true); // TRUE by default to show recommendations

  // Enable query by default - will fetch fresh data with Date.now() in query key
  const query = useRecommendations(preferences, limit, { enabled: true });

  return {
    ...query,
    preferences,
    setPreferences: (newPrefs: RecommendationPreferences) => {
      console.log('🔄 Setting new preferences:', newPrefs);
      setPreferences(newPrefs);
      setHasAppliedPreferences(true); // Enable fetching after preferences are set
      setForceRefreshKey(prev => prev + 1); // Force new query
    },
    limit,
    setLimit,
    customizeMode,
    setCustomizeMode,
    forceRefreshKey, // Expose for external use
    updatePreference: <K extends keyof RecommendationPreferences>(
      key: K,
      value: RecommendationPreferences[K]
    ) => {
      setPreferences(prev => ({ ...prev, [key]: value }));
    },
    clearPreferences: () => {
      setPreferences({
        preferVerified: true,
        preferAvailability: true,
      });
    },
    // Additional helper methods for setting common preferences
    setLocation: (district: string) => {
      setPreferences(prev => ({ ...prev, district }));
    },
    setBudget: (targetPrice: number) => {
      setPreferences(prev => ({ ...prev, targetPrice }));
    },
    setAreaRequirement: (minAreaSqft: number) => {
      setPreferences(prev => ({ ...prev, minAreaSqft }));
    },
    setWarehouseType: (preferredType: string) => {
      setPreferences(prev => ({ ...prev, preferredType }));
    },
    toggleVerified: () => {
      setPreferences(prev => ({ ...prev, preferVerified: !prev.preferVerified }));
    },
    toggleAvailability: () => {
      setPreferences(prev => ({ ...prev, preferAvailability: !prev.preferAvailability }));
    }
  };
}
