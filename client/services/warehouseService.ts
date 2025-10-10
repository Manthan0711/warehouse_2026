// Import Supabase client from the dedicated client file
import { supabase } from './supabaseClient';
import { WarehouseData, allMaharashtraWarehouses, platformStats } from '../data/enhanced-warehouses';

// Try importing warehouse data from the mock data file
let mockData: { warehouses: any[], platformStats: any } | null = null;
try {
  // Use the enhanced warehouse data
  mockData = {
    warehouses: allMaharashtraWarehouses,
    platformStats: platformStats
  };
  console.log(`Successfully loaded enhanced warehouse data with ${allMaharashtraWarehouses.length} warehouses`);
} catch (e) {
  try {
    // Fallback to original data
    const { maharashtraWarehouses } = require('../data/warehouses');
    mockData = {
      warehouses: maharashtraWarehouses.slice(0, 100),
      platformStats: {
        totalWarehouses: maharashtraWarehouses.length,
        totalCapacity: 2500000,
        totalArea: 25000000,
        averageOccupancy: 0.58,
        districtsCount: 36,
        verifiedWarehouses: 168
      }
    };
    console.log('Using original warehouse data fallback');
  } catch (mockError) {
    // If even the mock fails, create a minimal mock structure
    console.log('Using minimal mock data structure');
    mockData = {
      warehouses: [],
      platformStats: {
        totalWarehouses: 0,
        totalCapacity: 0,
        totalArea: 0,
        averageOccupancy: 0,
        districtsCount: 0,
        verifiedWarehouses: 0
      }
    };
  }
}

// Flag to control whether we should use mock data as a fallback
// CRITICAL: Disabled - ALL data MUST come from Supabase only
const USE_MOCK_DATA_FALLBACK = false;

export interface SupabaseWarehouse {
  id: string;
  name: string;
  description: string | null;
  address: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number | null;
  longitude: number | null;
  total_area: number;
  price_per_sqft: number;
  images: string[];
  amenities: string[];
  features: string[];
  status: string;
  occupancy: number;
  rating: number;
  reviews_count: number;
  total_blocks: number;
  available_blocks: number;
  grid_rows: number;
  grid_cols: number;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
  wh_id?: string;
  contact_person?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
}

export interface WarehouseFilters {
  city?: string;
  min_price?: number;
  max_price?: number;
  min_area?: number;
  max_area?: number;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface MLRecommendationRequest {
  user_preferences?: {
    preferred_cities?: string[];
    max_budget?: number;
    min_area?: number;
    preferred_amenities?: string[];
    business_type?: string;
  };
  current_warehouse_id?: string;
  limit?: number;
}

export interface MLRecommendationResponse {
  warehouse: SupabaseWarehouse;
  similarity_score: number;
  recommendation_reasons: string[];
  recommendation_type: 'location' | 'price' | 'features' | 'collaborative' | 'hybrid';
}

class WarehouseService {
  // Helper method to convert WarehouseData to SupabaseWarehouse
  private convertMockToSupabase(mockWarehouse: WarehouseData): SupabaseWarehouse {
    const safeOccupancy = Math.max(0, Math.min(1, mockWarehouse.occupancy));
    const safeSize = Math.max(0, mockWarehouse.size);
    const safePricing = Math.max(0, mockWarehouse.pricing);
    const safeRating = Math.max(0, Math.min(5, mockWarehouse.rating));
    const totalBlocks = Math.ceil(safeSize / 1000);
    const availableBlocks = Math.max(0, Math.ceil(totalBlocks * (1 - safeOccupancy)));

    return {
      id: mockWarehouse.whId,
      wh_id: mockWarehouse.whId,
      name: `${mockWarehouse.district} Warehouse ${mockWarehouse.whId.substring(0, 8)}`,
      description: mockWarehouse.description || `Premium warehouse facility in ${mockWarehouse.district}, ${mockWarehouse.state}. Modern infrastructure with excellent connectivity.`,
      address: mockWarehouse.address,
      city: mockWarehouse.district,
      state: mockWarehouse.state,
      pincode: '411001',
      latitude: null,
      longitude: null,
      total_area: safeSize,
      price_per_sqft: safePricing,
      images: [mockWarehouse.image],
      amenities: mockWarehouse.amenities || [],
      features: ['24/7 Security', 'CCTV Surveillance', 'Fire Safety', 'Loading Docks'],
      status: mockWarehouse.status.toLowerCase() === 'active' ? 'available' : mockWarehouse.status.toLowerCase(),
      occupancy: safeOccupancy,
      rating: safeRating,
      reviews_count: Math.max(0, mockWarehouse.reviews || 0),
      total_blocks: totalBlocks,
      available_blocks: availableBlocks,
      grid_rows: Math.ceil(Math.sqrt(totalBlocks)),
      grid_cols: Math.ceil(Math.sqrt(totalBlocks)),
      owner_id: null,
      created_at: mockWarehouse.registrationDate || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      contact_person: null,
      contact_phone: null,
      contact_email: null
    };
  }

  // Get mock data with filters
  private getMockWarehouses(filters: WarehouseFilters = {}): { data: SupabaseWarehouse[]; count: number } {
    try {
      console.log('🔄 Using mock warehouse data with filters:', filters);
      console.log('📦 Total mock warehouses available:', mockData.warehouses?.length || 0);
      
      // Start with all warehouses
      let filteredWarehouses = mockData.warehouses || [];
      
      // Apply filters
      if (filters.city) {
        filteredWarehouses = filteredWarehouses.filter(w => {
          // Try to match city or district (some mock data might use district instead of city)
          const cityMatch = w.city && w.city.toLowerCase().includes(filters.city!.toLowerCase());
          const districtMatch = w.district && w.district.toLowerCase().includes(filters.city!.toLowerCase());
          return cityMatch || districtMatch;
        });
      }

      if (filters.min_price) {
        filteredWarehouses = filteredWarehouses.filter(w => w.pricing >= filters.min_price!);
      }

      if (filters.max_price) {
        filteredWarehouses = filteredWarehouses.filter(w => w.pricing <= filters.max_price!);
      }

      if (filters.min_area) {
        filteredWarehouses = filteredWarehouses.filter(w => w.size >= filters.min_area!);
      }

      if (filters.max_area) {
        filteredWarehouses = filteredWarehouses.filter(w => w.size <= filters.max_area!);
      }

      if (filters.status) {
        filteredWarehouses = filteredWarehouses.filter(w => 
          w.status.toLowerCase() === filters.status!.toLowerCase()
        );
      } else {
        // Default to active warehouses (equivalent to "approved")
        filteredWarehouses = filteredWarehouses.filter(w => w.status === 'Active');
      }

      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        filteredWarehouses = filteredWarehouses.filter(w => 
          (w.whId && w.whId.toLowerCase().includes(searchTerm)) ||
          (w.address && w.address.toLowerCase().includes(searchTerm)) ||
          (w.district && w.district.toLowerCase().includes(searchTerm)) ||
          (w.state && w.state.toLowerCase().includes(searchTerm)) ||
          (w.description && w.description.toLowerCase().includes(searchTerm))
        );
      }

      // Sort by rating
      filteredWarehouses.sort((a, b) => b.rating - a.rating);
      
      // Calculate total count before pagination
      const totalCount = filteredWarehouses.length;
      
      // Apply pagination
      if (filters.offset && filters.limit) {
        filteredWarehouses = filteredWarehouses.slice(filters.offset, filters.offset + filters.limit);
      } else if (filters.limit) {
        filteredWarehouses = filteredWarehouses.slice(0, filters.limit);
      } else {
        filteredWarehouses = filteredWarehouses.slice(0, 500); // Default limit increased to show more warehouses
      }

      // Convert to Supabase format
      const supabaseWarehouses = filteredWarehouses.map(w => this.convertMockToSupabase(w));

      console.log(`✅ Returning ${supabaseWarehouses.length} mock warehouses out of ${totalCount}`);
      return { data: supabaseWarehouses, count: totalCount };
    } catch (error) {
      console.error('Error in getMockWarehouses:', error);
      return { data: [], count: 0 };
    }
  }

  // Get all warehouses with filters
  async getWarehouses(filters: WarehouseFilters = {}): Promise<{ data: SupabaseWarehouse[]; count: number }> {
    try {
      console.log('Fetching warehouses with filters:', filters);
      
      // Fetch from original warehouses table (Maharashtra focus)
      let warehousesQuery = supabase
        .from('warehouses')
        .select('*', { count: 'exact' })
        .eq('state', 'Maharashtra');

      // Apply filters to warehouses
      if (filters.city) {
        warehousesQuery = warehousesQuery.ilike('city', `%${filters.city}%`);
      }

      if (filters.min_price) {
        warehousesQuery = warehousesQuery.gte('price_per_sqft', filters.min_price);
      }

      if (filters.max_price) {
        warehousesQuery = warehousesQuery.lte('price_per_sqft', filters.max_price);
      }

      if (filters.min_area) {
        warehousesQuery = warehousesQuery.gte('total_area', filters.min_area);
      }

      if (filters.max_area) {
        warehousesQuery = warehousesQuery.lte('total_area', filters.max_area);
      }

      if (filters.status) {
        warehousesQuery = warehousesQuery.eq('status', filters.status);
      } else {
        // Default to active warehouses
        warehousesQuery = warehousesQuery.eq('status', 'active');
      }

      if (filters.search) {
        // Enhanced search across multiple fields
        warehousesQuery = warehousesQuery.or(`name.ilike.%${filters.search}%,address.ilike.%${filters.search}%,city.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      // Fetch approved warehouse submissions
      let submissionsQuery = supabase
        .from('warehouse_submissions')
        .select('*')
        .eq('status', 'approved');

      // Apply same filters to submissions
      if (filters.city) {
        submissionsQuery = submissionsQuery.ilike('city', `%${filters.city}%`);
      }

      if (filters.min_price) {
        submissionsQuery = submissionsQuery.gte('price_per_sqft', filters.min_price);
      }

      if (filters.max_price) {
        submissionsQuery = submissionsQuery.lte('price_per_sqft', filters.max_price);
      }

      if (filters.min_area) {
        submissionsQuery = submissionsQuery.gte('total_area', filters.min_area);
      }

      if (filters.max_area) {
        submissionsQuery = submissionsQuery.lte('total_area', filters.max_area);
      }

      if (filters.search) {
        submissionsQuery = submissionsQuery.or(`name.ilike.%${filters.search}%,address.ilike.%${filters.search}%,city.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      // Execute both queries
      const [warehousesResult, submissionsResult] = await Promise.all([
        warehousesQuery.limit(filters.limit || 500),
        submissionsQuery.limit(100) // Limit approved submissions
      ]);

      const { data: warehouses, error: warehousesError, count: warehousesCount } = warehousesResult;
      const { data: approvedSubmissions, error: submissionsError } = submissionsResult;

      if (warehousesError) {
        console.error('Error fetching warehouses:', warehousesError);
      }

      if (submissionsError) {
        console.error('Error fetching approved submissions:', submissionsError);
      }

      // Convert approved submissions to SupabaseWarehouse format
      const convertedSubmissions: SupabaseWarehouse[] = (approvedSubmissions || []).map(submission => ({
        id: submission.id,
        wh_id: submission.id,
        name: submission.name,
        description: submission.description,
        address: submission.address,
        city: submission.city,
        state: submission.state,
        pincode: submission.pincode,
        latitude: null,
        longitude: null,
        total_area: submission.total_area,
        price_per_sqft: submission.price_per_sqft,
        images: submission.image_urls || [],
        amenities: submission.amenities || [],
        features: submission.features || [],
        status: 'active', // Approved submissions are active
        occupancy: 0, // New warehouses start with 0 occupancy
        rating: 4.5, // Default rating for new warehouses
        reviews_count: 0,
        total_blocks: Math.max(1, Math.floor(submission.total_area / 1000)),
        available_blocks: Math.max(1, Math.floor(submission.total_area / 1000)),
        grid_rows: Math.ceil(Math.sqrt(Math.max(1, Math.floor(submission.total_area / 1000)))),
        grid_cols: Math.ceil(Math.sqrt(Math.max(1, Math.floor(submission.total_area / 1000)))),
        owner_id: submission.owner_id,
        created_at: submission.created_at,
        updated_at: submission.updated_at,
        submission_id: submission.id,
        approved_at: submission.reviewed_at,
        approved_by: submission.reviewed_by
      }));

      // Combine warehouses and approved submissions
      const allWarehouses = [...(warehouses || []), ...convertedSubmissions];
      const totalCount = (warehousesCount || 0) + convertedSubmissions.length;

      console.log(`✅ Found ${warehouses?.length || 0} original warehouses + ${convertedSubmissions.length} approved submissions = ${allWarehouses.length} total`);

      // Apply pagination to combined results
      const offset = filters.offset || 0;
      const limit = filters.limit || 500;
      const paginatedResults = allWarehouses.slice(offset, offset + limit);

      // Sort combined results by rating and reviews for better results
      const sortedResults = paginatedResults.sort((a, b) => {
        // Sort by rating first, then by reviews count
        if (b.rating !== a.rating) {
          return b.rating - a.rating;
        }
        return b.reviews_count - a.reviews_count;
      });

      console.log(`✅ Returning ${sortedResults.length} warehouses from combined sources`);
      return { data: sortedResults, count: totalCount };

    } catch (error) {
      console.error('Error in getWarehouses:', error);
      
      // Use mock data if enabled as fallback
      if (USE_MOCK_DATA_FALLBACK) {
        console.log('Falling back to mock warehouse data');
        return this.getMockWarehouses(filters);
      }
      
      // Return empty result if mock data is disabled
      return { data: [], count: 0 };
    }
  }

  // Get warehouse by ID (supports both UUID and wh_id)
  async getWarehouseById(id: string): Promise<{ data: SupabaseWarehouse | null; error: string | null }> {
    try {
      console.log(`🔍 Looking for warehouse with ID: ${id}`);

      // First check original warehouses table
      const { data: warehouse, error: warehouseError } = await supabase
        .from('warehouses')
        .select('*')
        .or(`id.eq.${id},wh_id.eq.${id}`)
        .single();

      if (warehouse && !warehouseError) {
        console.log('✅ Found warehouse in original warehouses table:', warehouse.name);
        return { data: warehouse, error: null };
      }

      // Then check approved warehouse submissions
      const { data: submission, error: submissionError } = await supabase
        .from('warehouse_submissions')
        .select('*')
        .eq('id', id)
        .eq('status', 'approved')
        .single();

      if (submission && !submissionError) {
        console.log('✅ Found approved submission in warehouse_submissions:', submission.name);
        
        // Convert submission to SupabaseWarehouse format
        const convertedWarehouse: SupabaseWarehouse = {
          id: submission.id,
          wh_id: submission.id,
          name: submission.name,
          description: submission.description,
          address: submission.address,
          city: submission.city,
          state: submission.state,
          pincode: submission.pincode,
          latitude: null,
          longitude: null,
          total_area: submission.total_area,
          price_per_sqft: submission.price_per_sqft,
          images: submission.image_urls || [],
          amenities: submission.amenities || [],
          features: submission.features || [],
          status: 'active',
          occupancy: 0,
          rating: 4.5,
          reviews_count: 0,
          total_blocks: Math.max(1, Math.floor(submission.total_area / 1000)),
          available_blocks: Math.max(1, Math.floor(submission.total_area / 1000)),
          grid_rows: Math.ceil(Math.sqrt(Math.max(1, Math.floor(submission.total_area / 1000)))),
          grid_cols: Math.ceil(Math.sqrt(Math.max(1, Math.floor(submission.total_area / 1000)))),
          owner_id: submission.owner_id,
          created_at: submission.created_at,
          updated_at: submission.updated_at,
          contact_person: null,
          contact_phone: null,
          contact_email: null
        };
        
        return { data: convertedWarehouse, error: null };
      }

      // Fallback to localStorage for demo submissions
      const localSubmissions = JSON.parse(localStorage.getItem('demo-submissions') || '[]');
      const approvedWarehouses = JSON.parse(localStorage.getItem('approved-warehouses') || '[]');
      const allLocalWarehouses = [...localSubmissions, ...approvedWarehouses];
      
      const localWarehouse = allLocalWarehouses.find((w: any) => w.id === id);
      if (localWarehouse) {
        console.log('📦 Found warehouse in localStorage:', localWarehouse.name);
        // Convert localStorage format to Supabase format for display
        const convertedWarehouse: SupabaseWarehouse = {
          id: localWarehouse.id,
          wh_id: localWarehouse.id,
          name: localWarehouse.name,
          description: localWarehouse.description || null,
          address: localWarehouse.address,
          city: localWarehouse.city,
          state: localWarehouse.state,
          pincode: localWarehouse.pincode,
          total_area: parseInt(localWarehouse.total_area?.toString() || '0'),
          price_per_sqft: parseInt(localWarehouse.price_per_sqft?.toString() || '0'),
          images: localWarehouse.image_urls || [],
          amenities: localWarehouse.amenities || [],
          features: localWarehouse.features || [],
          status: localWarehouse.status === 'approved' ? 'active' : 'pending',
          occupancy: 0,
          rating: 4.5,
          reviews_count: 0,
          total_blocks: Math.floor(parseInt(localWarehouse.total_area?.toString() || '0') / 100),
          available_blocks: Math.floor(parseInt(localWarehouse.total_area?.toString() || '0') / 100),
          grid_rows: 10,
          grid_cols: 10,
          owner_id: localWarehouse.owner_id || 'demo-owner',
          created_at: localWarehouse.submitted_at || new Date().toISOString(),
          updated_at: localWarehouse.reviewed_at || new Date().toISOString(),
          latitude: 19.0760,
          longitude: 72.8777,
          contact_person: localWarehouse.owner_name || 'Demo Owner',
          contact_phone: localWarehouse.owner_phone || '+91 9876543210',
          contact_email: localWarehouse.owner_email || 'owner@demo.com'
        };
        return { data: convertedWarehouse, error: null };
      }

      // Try to find by wh_id first (for routes like /warehouse/LIC000062)
      let query = supabase
        .from('warehouses')
        .select('*');

      // Check if it looks like a UUID or wh_id
      if (id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        query = query.eq('id', id);
      } else {
        query = query.eq('wh_id', id);
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        console.error('Error fetching warehouse from Supabase:', error);
        throw error;
      }

      // If no data found in Supabase, fall back to mock data
      if (!data) {
        console.log('No warehouse found in Supabase, falling back to mock data');
        throw new Error('Warehouse not found in database');
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error in getWarehouseById:', error);

      // Use mock data if enabled as fallback
      if (USE_MOCK_DATA_FALLBACK) {
        console.log('Falling back to mock warehouse data for ID:', id);
        const mockWarehouse = mockData.warehouses?.find(w => w.whId === id);
        if (mockWarehouse) {
          return { data: this.convertMockToSupabase(mockWarehouse), error: null };
        }
        return { data: null, error: 'Warehouse not found in mock data' };
      }

      return { data: null, error: 'Failed to fetch warehouse details' };
    }
  }

  // Get warehouse statistics
  async getWarehouseStats() {
    try {
      const { data, error } = await supabase
        .from('warehouses')
        .select(`
          city,
          total_area,
          price_per_sqft,
          status,
          occupancy,
          rating,
          amenities
        `);

      if (error) {
        console.error('Error fetching warehouse stats from Supabase:', error);
        throw error;
      }

      // If no data in Supabase, fall back to mock data
      if (!data || data.length === 0) {
        console.log('No data in Supabase, falling back to mock data');
        throw new Error('No warehouses in database');
      }

      const cities = new Set(data.map(w => w.city));
      const totalArea = data.reduce((sum, w) => sum + w.total_area, 0);
      const avgPrice = data.reduce((sum, w) => sum + w.price_per_sqft, 0) / data.length;
      const avgOccupancy = data.reduce((sum, w) => sum + w.occupancy, 0) / data.length;
      const avgRating = data.reduce((sum, w) => sum + w.rating, 0) / data.length;

      return {
        totalWarehouses: data.length,
        totalArea,
        averagePrice: Math.round(avgPrice),
        averageOccupancy: Math.round(avgOccupancy * 100),
        citiesCount: cities.size,
        averageRating: Math.round(avgRating * 10) / 10
      };
    } catch (error) {
      console.error('Error in getWarehouseStats:', error);
      
      // Use mock data if enabled as fallback
      if (USE_MOCK_DATA_FALLBACK && mockData.platformStats) {
        console.log('Falling back to mock warehouse stats');
        
        const cities = new Set(mockData.warehouses?.map(w => w.city) || []);
        
        return {
          totalWarehouses: mockData.platformStats.totalWarehouses || 0,
          totalArea: mockData.platformStats.totalArea || 0,
          averagePrice: mockData.warehouses?.reduce((sum, w) => sum + w.pricing, 0) / (mockData.warehouses?.length || 1) || 0,
          averageOccupancy: Math.round(mockData.platformStats.averageOccupancy * 100) || 0,
          citiesCount: cities.size || 0,
          averageRating: mockData.warehouses?.reduce((sum, w) => sum + w.rating, 0) / (mockData.warehouses?.length || 1) || 0
        };
      }
      
      // Return default stats if mock data is disabled or not available
      return {
        totalWarehouses: 0,
        totalArea: 0,
        averagePrice: 0,
        averageOccupancy: 0,
        citiesCount: 0,
        averageRating: 0
      };
    }
  }

  // ML-powered recommendations using advanced algorithms (XGBoost-inspired approach)
  async getMLRecommendations(request: MLRecommendationRequest): Promise<MLRecommendationResponse[]> {
    try {
      console.log('Generating ML recommendations with preferences:', request.user_preferences);
      
      // Get base warehouse data - increased limit for better ML analysis
      const { data: warehouses } = await this.getWarehouses({
        limit: 1000,  // Get more data for better ML recommendations
        status: 'active'
      });
      
      if (!warehouses || warehouses.length === 0) {
        console.warn('No warehouses available for ML recommendations');
        
        // Fall back to mock recommendations if no warehouses are available
        if (USE_MOCK_DATA_FALLBACK) {
          console.log('Using mock data for ML recommendations');
          const mockRecommendations = await this.getMockRecommendations(request.limit || 12);
          
          // Convert to ML recommendation format
          return mockRecommendations.map(warehouse => ({
            warehouse,
            similarity_score: Math.random() * 0.3 + 0.7, // Random high score between 0.7-1.0
            recommendation_reasons: [
              `Top rated: ${warehouse.rating}⭐ (${warehouse.reviews_count} reviews)`,
              'Popular choice among similar businesses',
              'Excellent location and facilities'
            ],
            recommendation_type: Math.random() > 0.5 ? 'collaborative' : 'hybrid'
          }));
        }
        
        return [];
      }

      console.log(`Processing ${warehouses.length} warehouses for ML recommendations`);
      
      const recommendations: MLRecommendationResponse[] = [];
      const preferences = request.user_preferences || {};

      // Generate feature vectors for warehouses based on city, price, amenities, size
      // This mimics how XGBoost would compute feature importance
      const enhancedWarehouses = warehouses.map(warehouse => {
        let featureScores = {
          locationScore: 0,
          priceScore: 0,
          amenityScore: 0,
          sizeScore: 0,
          ratingScore: warehouse.rating / 5.0, // Normalize rating to 0-1
          availabilityScore: (100 - warehouse.occupancy) / 100 // Higher score for lower occupancy
        };
        
        // Compute location score based on preferred cities
        if (preferences.preferred_cities && preferences.preferred_cities.length > 0) {
          const cityMatch = preferences.preferred_cities.some(city => 
            warehouse.city.toLowerCase() === city.toLowerCase());
          const cityPartialMatch = preferences.preferred_cities.some(city => 
            warehouse.city.toLowerCase().includes(city.toLowerCase()) || 
            (warehouse.address && warehouse.address.toLowerCase().includes(city.toLowerCase())));
            
          featureScores.locationScore = cityMatch ? 1.0 : cityPartialMatch ? 0.7 : 0.0;
        } else {
          // If no location preference, all locations get a neutral score
          featureScores.locationScore = 0.5;
        }
        
        // Compute price score based on budget
        if (preferences.max_budget) {
          if (warehouse.price_per_sqft <= preferences.max_budget) {
            // Lower price gets higher score, but extremely low prices may indicate issues
            const priceFraction = warehouse.price_per_sqft / preferences.max_budget;
            featureScores.priceScore = priceFraction < 0.5 ? 0.8 : 1 - (priceFraction * 0.8); // Optimal around 50-70% of max budget
          } else {
            featureScores.priceScore = 0; // Over budget
          }
        } else {
          // If no price preference, give neutral score with preference to more affordable options
          featureScores.priceScore = Math.min(1.0, 1000 / warehouse.price_per_sqft) * 0.5;
        }
        
        // Compute amenity score based on preferences
        if (preferences.preferred_amenities && preferences.preferred_amenities.length > 0 && warehouse.amenities) {
          const matchingAmenities = warehouse.amenities.filter(amenity =>
            preferences.preferred_amenities?.some(pref => 
              amenity.toLowerCase().includes(pref.toLowerCase())
            )
          );
          featureScores.amenityScore = matchingAmenities.length / preferences.preferred_amenities.length;
        } else {
          // If no amenity preferences or warehouse has no amenities data
          featureScores.amenityScore = warehouse.amenities?.length ? 0.5 : 0.3;
        }
        
        // Compute size score based on minimum area
        if (preferences.min_area) {
          if (warehouse.total_area >= preferences.min_area) {
            // Penalize warehouses that are too oversized (using a Gaussian-like function)
            const sizeRatio = warehouse.total_area / preferences.min_area;
            featureScores.sizeScore = Math.exp(-0.5 * Math.pow((sizeRatio - 1.3) / 1.0, 2));
          } else {
            featureScores.sizeScore = 0; // Too small
          }
        } else {
          // If no size preference, give neutral score with preference to mid-sized warehouses
          featureScores.sizeScore = Math.exp(-0.5 * Math.pow((Math.log10(warehouse.total_area) - 4.5) / 1.0, 2));
        }
        
        // Calculate total score using a weighted ensemble approach (XGBoost style)
        // The weights simulate what an XGBoost model might learn for feature importance
        const totalScore = (
          featureScores.locationScore * 0.30 +  // Location is very important
          featureScores.priceScore * 0.25 +     // Price is quite important
          featureScores.sizeScore * 0.20 +      // Size matters
          featureScores.amenityScore * 0.10 +   // Amenities have some weight
          featureScores.ratingScore * 0.10 +    // Ratings matter
          featureScores.availabilityScore * 0.05 // Availability is a factor
        );
        
        return {
          warehouse,
          featureScores,
          totalScore
        };
      });
      
      // Sort by total score (Random Forest / XGBoost predicted probability)
      enhancedWarehouses.sort((a, b) => b.totalScore - a.totalScore);
      
      // Generate recommendations by type using KNN-like approach for diverse recommendations
      
      // Location-based recommendations (closest city match)
      if (preferences.preferred_cities && preferences.preferred_cities.length > 0) {
        const locationMatches = enhancedWarehouses
          .filter(item => item.featureScores.locationScore > 0.6)
          .slice(0, 5);

        locationMatches.forEach(item => {
          recommendations.push({
            warehouse: item.warehouse,
            similarity_score: item.totalScore,
            recommendation_reasons: [
              `Located in your preferred city: ${item.warehouse.city}`,
              `${Math.round((100 - item.warehouse.occupancy))}% available space`,
              item.warehouse.rating >= 4.0 ? `Highly rated: ${item.warehouse.rating}⭐` : 'Good location match'
            ],
            recommendation_type: 'location'
          });
        });
      }

      // Price-based recommendations (KNN approach to find most cost-effective options)
      if (preferences.max_budget) {
        const priceMatches = enhancedWarehouses
          .filter(item => item.featureScores.priceScore > 0.7)
          .slice(0, 5);

        priceMatches.forEach(item => {
          const savingsPercent = preferences.max_budget 
            ? Math.round(((preferences.max_budget - item.warehouse.price_per_sqft) / preferences.max_budget) * 100)
            : 0;
            
          recommendations.push({
            warehouse: item.warehouse,
            similarity_score: item.totalScore,
            recommendation_reasons: [
              `Optimal price: ₹${item.warehouse.price_per_sqft}/sqft`,
              savingsPercent > 0 ? `Save ${savingsPercent}% compared to max budget` : 'Good value for money',
              `${item.warehouse.total_area.toLocaleString()} sq ft total area`
            ],
            recommendation_type: 'price'
          });
        });
      }

      // Feature-based recommendations (using cosine similarity concept)
      if (preferences.preferred_amenities && preferences.preferred_amenities.length > 0) {
        const featureMatches = enhancedWarehouses
          .filter(item => item.featureScores.amenityScore > 0.5)
          .slice(0, 5);

        featureMatches.forEach(item => {
          const matchingFeatures = item.warehouse.amenities?.filter(amenity =>
            preferences.preferred_amenities?.some(pref => 
              amenity.toLowerCase().includes(pref.toLowerCase())
            )
          ) || [];

          recommendations.push({
            warehouse: item.warehouse,
            similarity_score: item.totalScore,
            recommendation_reasons: [
              `Has ${matchingFeatures.length} of your preferred amenities`,
              `Features: ${(matchingFeatures.slice(0, 2).join(', ') + (matchingFeatures.length > 2 ? '...' : ''))}`,
              'High feature compatibility'
            ],
            recommendation_type: 'features'
          });
        });
      }

      // Size-optimized recommendations (using nearest neighbor concept)
      if (preferences.min_area) {
        const areaMatches = enhancedWarehouses
          .filter(item => item.featureScores.sizeScore > 0.7)
          .slice(0, 5);

        areaMatches.forEach(item => {
          const sizeRatio = preferences.min_area ? item.warehouse.total_area / preferences.min_area : 1;
          recommendations.push({
            warehouse: item.warehouse,
            similarity_score: item.totalScore,
            recommendation_reasons: [
              `Optimal size: ${item.warehouse.total_area.toLocaleString()} sq ft`,
              sizeRatio > 1.1 
                ? `${Math.round((sizeRatio - 1) * 100)}% extra space compared to minimum` 
                : 'Perfect size match',
              `Good layout for efficient operations`
            ],
            recommendation_type: 'features'
          });
        });
      }

      // Add collaborative filtering recommendations (based on rating and similar users behavior)
      // This simulates what a real collaborative filtering algorithm would do
      const topRatedWarehouses = enhancedWarehouses
        .filter(item => item.warehouse.rating >= 4.0 && item.warehouse.reviews_count >= 3)
        .sort((a, b) => b.warehouse.rating - a.warehouse.rating)
        .slice(0, 6);

      topRatedWarehouses.forEach(item => {
        recommendations.push({
          warehouse: item.warehouse,
          similarity_score: item.totalScore * 0.9, // Slightly lower weight for pure rating-based
          recommendation_reasons: [
            `Top rated: ${item.warehouse.rating}⭐ (${item.warehouse.reviews_count} reviews)`,
            'Businesses similar to yours chose this warehouse',
            'Excellent service quality'
          ],
          recommendation_type: 'collaborative'
        });
      });
      
      // Remove duplicates and sort by ML score
      console.log(`Generated ${recommendations.length} raw recommendations, deduplicating...`);
      const uniqueRecommendations = recommendations
        .filter((rec, index, arr) => 
          arr.findIndex(r => r.warehouse.id === rec.warehouse.id) === index
        )
        .sort((a, b) => b.similarity_score - a.similarity_score)
        .slice(0, request.limit || 12);
      
      // Scale all scores to 0-1 range for consistency
      const maxScore = Math.max(...uniqueRecommendations.map(r => r.similarity_score));
      uniqueRecommendations.forEach(rec => {
        rec.similarity_score = maxScore > 0 ? rec.similarity_score / maxScore : rec.similarity_score;
      });
      
      console.log(`Returning ${uniqueRecommendations.length} final ML recommendations`);
      return uniqueRecommendations;

    } catch (error) {
      console.error('Error generating ML recommendations:', error);
      
      // Fall back to mock recommendations if there was an error
      if (USE_MOCK_DATA_FALLBACK) {
        console.log('Falling back to mock data for ML recommendations after error');
        const mockRecommendations = await this.getMockRecommendations(request.limit || 12);
        
        // Convert to ML recommendation format
        return mockRecommendations.map(warehouse => ({
          warehouse,
          similarity_score: Math.random() * 0.3 + 0.7, // Random high score between 0.7-1.0
          recommendation_reasons: [
            `Top rated: ${warehouse.rating}⭐ (${warehouse.reviews_count} reviews)`,
            'Popular choice among similar businesses',
            'Excellent location and facilities'
          ],
          recommendation_type: Math.random() > 0.5 ? 'collaborative' : 'hybrid'
        }));
      }
      
      return [];
    }
  }

  // Get similar warehouses (collaborative filtering)
  async getSimilarWarehouses(warehouseId: string, limit = 6): Promise<SupabaseWarehouse[]> {
    const { data: currentWarehouse } = await this.getWarehouseById(warehouseId);
    if (!currentWarehouse) return [];

    const { data: warehouses } = await this.getWarehouses({ limit: 200 });

    // Find similar warehouses based on city, price range, and amenities
    const similarWarehouses = warehouses
      .filter(w => w.id !== warehouseId)
      .map(w => {
        let similarity = 0;

        // City similarity (40% weight)
        if (w.city === currentWarehouse.city) similarity += 0.4;

        // Price similarity (30% weight)
        const priceDiff = Math.abs(w.price_per_sqft - currentWarehouse.price_per_sqft);
        const maxPrice = Math.max(w.price_per_sqft, currentWarehouse.price_per_sqft);
        const priceScore = maxPrice > 0 ? 1 - (priceDiff / maxPrice) : 1;
        similarity += priceScore * 0.3;

        // Amenities similarity (20% weight)
        const commonAmenities = w.amenities.filter(a => currentWarehouse.amenities.includes(a));
        const amenityScore = commonAmenities.length / Math.max(w.amenities.length, currentWarehouse.amenities.length, 1);
        similarity += amenityScore * 0.2;

        // Size similarity (10% weight)
        const sizeDiff = Math.abs(w.total_area - currentWarehouse.total_area);
        const maxSize = Math.max(w.total_area, currentWarehouse.total_area);
        const sizeScore = maxSize > 0 ? 1 - (sizeDiff / maxSize) : 1;
        similarity += sizeScore * 0.1;

        return { ...w, similarity };
      })
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return similarWarehouses;
  }

  // Get warehouses by city
  async getWarehousesByCity(city: string, limit = 20): Promise<SupabaseWarehouse[]> {
    const { data } = await this.getWarehouses({ city, limit });
    return data;
  }

  // Search warehouses
  async searchWarehouses(query: string, limit = 20): Promise<SupabaseWarehouse[]> {
    const { data } = await this.getWarehouses({ search: query, limit });
    return data;
  }
  
  // Get recommendations using mock data if needed
  async getMockRecommendations(limit = 6): Promise<SupabaseWarehouse[]> {
    if (!mockData.warehouses || mockData.warehouses.length === 0) {
      return [];
    }
    
    // Get high-rated warehouses
    const topRatedWarehouses = [...mockData.warehouses]
      .sort((a, b) => b.rating - a.rating)
      .slice(0, limit)
      .map(w => this.convertMockToSupabase(w));
      
    return topRatedWarehouses;
  }
}

export const warehouseService = new WarehouseService();
