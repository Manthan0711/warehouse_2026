/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

/**
 * Example response type for /api/demo
 */
export interface DemoResponse {
  message: string;
}

/**
 * Recommendation API types
 */
export interface RecommendationPreferences {
  // Desired district (exact match preferred). If empty, no district filter.
  district?: string;
  // Budget per sqft/month in INR. If provided, closer pricing scores higher.
  targetPrice?: number;
  // Minimum required area in sqft. Larger warehouses score higher up to 2x this value.
  minAreaSqft?: number;
  // Preferred warehouse type (exact string from dataset) if any.
  preferredType?: string;
  // Preference for verified ownership certificate.
  preferVerified?: boolean;
  // Preference for availability: lower occupancy preferred (true) or ignore (false/undefined)
  preferAvailability?: boolean;
}

export interface RecommendationRequest {
  preferences: RecommendationPreferences;
  // Limit number of recommendations
  limit?: number;
}

export interface RecommendationReason {
  label: string;
}

export interface RecommendedWarehouse {
  whId: string;
  name: string; // generated label
  location: string; // e.g., "District, State"
  district: string;
  state: string;
  pricePerSqFt: number;
  totalAreaSqft: number;
  availableAreaSqft: number;
  rating: number;
  reviews: number;
  image: string;
  type: string;
  matchScore: number; // 0-100
  reasons: RecommendationReason[];
  // Additional AI insights from Gemini (optional)
  aiInsights?: string[];
}

export interface RecommendationResponse {
  items: RecommendedWarehouse[];
  error?: string; // Optional error message if something went wrong
}
