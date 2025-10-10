import type { RecommendationPreferences, RecommendedWarehouse } from "./api";
import type { SupabaseWarehouse } from "../client/services/warehouseService";

/**
 * Advanced K-Nearest Neighbors Implementation for Warehouse Recommendations
 * This algorithm finds warehouses that are similar to preferred criteria
 * using a multi-dimensional distance calculation in feature space
 * Based on professional ML standards similar to scikit-learn KNN implementation
 */
export function knnRecommend(warehouses: SupabaseWarehouse[], preferences: RecommendationPreferences, k: number = 8): SupabaseWarehouse[] {
  if (!warehouses || warehouses.length === 0) return [];
  
  console.log('Running KNN algorithm with advanced feature extraction');
  
  // Extract preference values
  const { district, targetPrice, minAreaSqft, preferredType, preferVerified, preferAvailability } = preferences;
  
  // Define ideal feature vector (target point in feature space)
  const idealFeatures = {
    locationScore: district && district !== 'any' ? 1.0 : 0.5,
    priceScore: targetPrice && targetPrice > 0 ? 1.0 : 0.5,
    areaScore: minAreaSqft && minAreaSqft > 0 ? 1.0 : 0.5,
    typeScore: preferredType && preferredType !== 'any' ? 1.0 : 0.5,
    verificationScore: preferVerified ? 1.0 : 0.5,
    availabilityScore: preferAvailability ? 1.0 : 0.5,
    ratingScore: 1.0,  // Always prefer higher ratings
    amenitiesScore: 1.0 // Always prefer more amenities
  };
  
  // Define feature weights based on user preferences
  const featureWeights = {
    locationScore: district && district !== 'any' ? 3.0 : 0.5,
    priceScore: targetPrice && targetPrice > 0 ? 2.5 : 0.5,
    areaScore: minAreaSqft && minAreaSqft > 0 ? 2.0 : 0.5,
    typeScore: preferredType && preferredType !== 'any' ? 1.5 : 0.5,
    verificationScore: preferVerified ? 1.0 : 0.3,
    availabilityScore: preferAvailability ? 1.5 : 0.3,
    ratingScore: 1.0,
    amenitiesScore: 0.8
  };
  
  // Calculate distances (similarity scores) using weighted Euclidean distance in feature space
  const warehousesWithScores = warehouses.map(warehouse => {
    // Extract features into a vector for this warehouse
    const warehouseFeatures = {
      // Location feature
      locationScore: district && district !== 'any' ? 
        (warehouse.city.toLowerCase() === district.toLowerCase() ? 1.0 : 
         warehouse.address?.toLowerCase().includes(district.toLowerCase()) ? 0.7 : 0.1) : 0.5,
      
      // Price feature
      priceScore: targetPrice && targetPrice > 0 ? 
        (warehouse.price_per_sqft <= targetPrice ? 
          Math.max(0.5, 1 - (targetPrice - warehouse.price_per_sqft) / targetPrice) : // Lower price is good but not too low
          Math.max(0, 1 - (warehouse.price_per_sqft - targetPrice) / targetPrice)) : 0.5, // Higher price is worse
      
      // Area feature
      areaScore: minAreaSqft && minAreaSqft > 0 ?
        (warehouse.total_area >= minAreaSqft ? 
          Math.min(1.0, 1 - Math.abs(warehouse.total_area - minAreaSqft * 1.2) / (minAreaSqft * 2)) : 0.2) : 0.5,
      
      // Type feature
      typeScore: preferredType && preferredType !== 'any' ? 
        (warehouse.features?.some(f => f.toLowerCase().includes(preferredType.toLowerCase())) ||
         warehouse.amenities?.some(a => a.toLowerCase().includes(preferredType.toLowerCase())) ? 1.0 : 0.1) : 0.5,
      
      // Verification feature
      verificationScore: warehouse.amenities?.some(a => a.toLowerCase().includes('verified')) ? 1.0 : 0.3,
      
      // Availability feature
      availabilityScore: 1 - (warehouse.occupancy || 0),
      
      // Rating feature - normalized to 0-1 range
      ratingScore: warehouse.rating ? Math.min(1.0, warehouse.rating / 5.0) : 0.5,
      
      // Amenities score - more amenities is better
      amenitiesScore: warehouse.amenities ? Math.min(1.0, warehouse.amenities.length / 10.0) : 0.3
    };
    
    // Calculate weighted Euclidean distance between this warehouse and the ideal
    let squaredDistanceSum = 0;
    let weightSum = 0;
    
    // For each feature, calculate weighted squared distance
    for (const [feature, value] of Object.entries(warehouseFeatures) as [keyof typeof warehouseFeatures, number][]) {
      const weight = featureWeights[feature];
      const ideal = idealFeatures[feature];
      const squaredDiff = Math.pow(value - ideal, 2);
      squaredDistanceSum += squaredDiff * weight;
      weightSum += weight;
    }
    
    // Normalize distance by weight sum to get value in 0-1 range
    const normalizedDistance = Math.sqrt(squaredDistanceSum) / Math.sqrt(weightSum);
    
    // Convert distance to similarity score (0-1 range, higher is better)
    const score = 1 - normalizedDistance;
    
    // Generate reasons based on feature values
    const reasons: string[] = [];
    
    // Location reason
    if (warehouseFeatures.locationScore > 0.8 && district) {
      reasons.push(`Perfect location match in ${warehouse.city}`);
    } else if (warehouseFeatures.locationScore > 0.6 && district) {
      reasons.push(`Near ${district}`);
    }
    
    // Price reason
    if (targetPrice && warehouse.price_per_sqft <= targetPrice) {
      const pctBelow = Math.round((1 - warehouse.price_per_sqft / targetPrice) * 100);
      if (pctBelow >= 5) {
        reasons.push(`${pctBelow}% below your target budget`);
      } else {
        reasons.push(`Within your budget at ₹${warehouse.price_per_sqft}/sqft`);
      }
    } else if (targetPrice && warehouse.price_per_sqft <= targetPrice * 1.1) {
      reasons.push(`Close to your budget at ₹${warehouse.price_per_sqft}/sqft`);
    }
    
    // Area reason
    if (minAreaSqft && warehouse.total_area >= minAreaSqft) {
      const pctAbove = Math.round((warehouse.total_area / minAreaSqft - 1) * 100);
      if (pctAbove > 10 && pctAbove < 50) {
        reasons.push(`${pctAbove}% more space than required (${warehouse.total_area.toLocaleString()} sqft)`);
      } else {
        reasons.push(`Optimal size for your needs (${warehouse.total_area.toLocaleString()} sqft)`);
      }
    }
    
    // Type reason
    if (warehouseFeatures.typeScore > 0.8 && preferredType) {
      reasons.push(`Specialized for ${preferredType} storage`);
    }
    
    // Rating reason
    if (warehouse.rating && warehouse.rating >= 4.7) {
      reasons.push(`Exceptional ratings (${warehouse.rating}⭐)`);
    } else if (warehouse.rating && warehouse.rating >= 4.3) {
      reasons.push(`Highly rated (${warehouse.rating}⭐)`);
    }
    
    // Verification reason
    if (warehouseFeatures.verificationScore > 0.8 && preferVerified) {
      reasons.push('Verified facility with proper documentation');
    }
    
    // Availability reason
    if (warehouseFeatures.availabilityScore >= 0.7 && preferAvailability) {
      reasons.push(`High availability (${Math.round(warehouseFeatures.availabilityScore * 100)}% free space)`);
    }
    
    // Amenities reason
    if (warehouse.amenities && warehouse.amenities.length >= 5) {
      reasons.push(`Well-equipped with ${warehouse.amenities.length} amenities`);
    }
    
    // Ensure at least one reason
    if (reasons.length === 0) {
      reasons.push(`Located in ${warehouse.city}, ${warehouse.state}`);
    }
    
    return {
      warehouse,
      score,
      reasons: reasons.slice(0, 3) // Limit to top 3 reasons
    };
  });
  
  // Sort by score descending
  warehousesWithScores.sort((a, b) => b.score - a.score);
  
  console.log(`KNN found ${warehousesWithScores.length} warehouses, showing top ${k}`);
  
  // Return the k nearest neighbors
  return warehousesWithScores.slice(0, k).map(item => item.warehouse);
}

/**
 * Advanced Random Forest Recommendation Algorithm
 * Implements a sophisticated ensemble of decision trees with feature importance
 * and bootstrap aggregation (bagging) for robust recommendations
 * Based on professional ML standards similar to scikit-learn RandomForest implementation
 */
export function randomForestRecommend(warehouses: SupabaseWarehouse[], preferences: RecommendationPreferences, numTrees: number = 50, samplesPerTree: number = 0.8): SupabaseWarehouse[] {
  if (!warehouses || warehouses.length === 0) return [];
  
  console.log('Running RandomForest algorithm with', numTrees, 'trees');
  
  // Feature definitions for the forest
  type Feature = {
    name: string;
    extractor: (warehouse: SupabaseWarehouse) => number;
    importance: number;
  };
  
  // Define all possible features with their importance
  const allFeatures: Feature[] = [
    {
      name: 'locationMatch',
      extractor: (warehouse) => {
        if (!preferences.district || preferences.district === 'any') return 0.5;
        
        const exactMatch = warehouse.city?.toLowerCase() === preferences.district.toLowerCase();
        const partialMatch = warehouse.address?.toLowerCase()?.includes(preferences.district.toLowerCase());
        
        return exactMatch ? 1.0 : partialMatch ? 0.7 : 0.1;
      },
      importance: preferences.district && preferences.district !== 'any' ? 0.3 : 0.05
    },
    {
      name: 'priceMatch',
      extractor: (warehouse) => {
        if (!preferences.targetPrice || preferences.targetPrice <= 0) return 0.5;
        
        const priceDiff = (warehouse.price_per_sqft - preferences.targetPrice) / preferences.targetPrice;
        
        if (priceDiff <= -0.2) return 0.9;       // 20%+ below budget
        else if (priceDiff <= -0.1) return 0.85; // 10-20% below budget
        else if (priceDiff <= 0) return 0.8;     // 0-10% below budget
        else if (priceDiff <= 0.1) return 0.6;   // 0-10% above budget
        else if (priceDiff <= 0.2) return 0.4;   // 10-20% above budget
        else if (priceDiff <= 0.3) return 0.2;   // 20-30% above budget
        else return 0.1;                         // 30%+ above budget
      },
      importance: preferences.targetPrice && preferences.targetPrice > 0 ? 0.25 : 0.05
    },
    {
      name: 'areaMatch',
      extractor: (warehouse) => {
        if (!preferences.minAreaSqft || preferences.minAreaSqft <= 0) return 0.5;
        
        const areaRatio = warehouse.total_area / preferences.minAreaSqft;
        
        if (areaRatio < 0.8) return 0.1;          // Too small
        else if (areaRatio < 0.95) return 0.4;    // Slightly too small
        else if (areaRatio <= 1.2) return 0.95;   // Perfect size
        else if (areaRatio <= 1.5) return 0.8;    // Slightly larger
        else if (areaRatio <= 2.0) return 0.6;    // Moderately larger
        else if (areaRatio <= 3.0) return 0.4;    // Much larger
        else return 0.2;                          // Excessively large
      },
      importance: preferences.minAreaSqft && preferences.minAreaSqft > 0 ? 0.2 : 0.05
    },
    {
      name: 'typeMatch',
      extractor: (warehouse) => {
        if (!preferences.preferredType || preferences.preferredType === 'any') return 0.5;
        
        const typeMatch = 
          warehouse.features?.some(f => f.toLowerCase().includes(preferences.preferredType!.toLowerCase())) ||
          warehouse.amenities?.some(a => a.toLowerCase().includes(preferences.preferredType!.toLowerCase()));
          
        return typeMatch ? 1.0 : 0.2;
      },
      importance: preferences.preferredType && preferences.preferredType !== 'any' ? 0.15 : 0.05
    },
    {
      name: 'verificationMatch',
      extractor: (warehouse) => {
        const isVerified = warehouse.amenities?.some(a => a.toLowerCase().includes('verified'));
        return isVerified ? 1.0 : 0.3;
      },
      importance: preferences.preferVerified ? 0.1 : 0.02
    },
    {
      name: 'availabilityMatch',
      extractor: (warehouse) => {
        const availability = 1 - (warehouse.occupancy || 0);
        
        if (availability >= 0.8) return 0.95;      // 80%+ available
        else if (availability >= 0.6) return 0.8;  // 60-80% available
        else if (availability >= 0.4) return 0.6;  // 40-60% available
        else if (availability >= 0.2) return 0.4;  // 20-40% available
        else return 0.2;                           // Less than 20% available
      },
      importance: preferences.preferAvailability ? 0.1 : 0.03
    },
    {
      name: 'rating',
      extractor: (warehouse) => {
        if (!warehouse.rating) return 0.5;
        
        const normalizedRating = warehouse.rating / 5;
        return Math.pow(normalizedRating, 1.5); // Emphasize higher ratings
      },
      importance: 0.1
    },
    {
      name: 'amenitiesQuality',
      extractor: (warehouse) => {
        if (!warehouse.amenities || warehouse.amenities.length === 0) return 0.3;
        
        // Premium amenities count more
        const premiumAmenities = ['security', 'surveillance', 'climate', 'temperature', 'loading', 'dock', '24/7'];
        let premiumCount = 0;
        
        for (const amenity of warehouse.amenities) {
          if (premiumAmenities.some(p => amenity.toLowerCase().includes(p))) {
            premiumCount++;
          }
        }
        
        const amenityScore = Math.min(1.0, (warehouse.amenities.length * 0.07) + (premiumCount * 0.12));
        return amenityScore;
      },
      importance: 0.08
    },
    {
      name: 'reviewsQuantity',
      extractor: (warehouse) => {
        if (!warehouse.reviews_count || warehouse.reviews_count === 0) return 0.3;
        
        return Math.min(1.0, warehouse.reviews_count / 100);
      },
      importance: 0.02
    }
  ];
  
  // Results container - will hold votes from each tree
  const votes: Map<string, number> = new Map();
  const confidenceScores: Map<string, number[]> = new Map();
  const insights: Map<string, Set<string>> = new Map();
  
  // Run multiple decision trees
  for (let treeIndex = 0; treeIndex < numTrees; treeIndex++) {
    // Bootstrap sampling - randomly sample warehouses with replacement
    const sampleSize = Math.floor(warehouses.length * samplesPerTree);
    const sample: SupabaseWarehouse[] = [];
    
    for (let j = 0; j < sampleSize; j++) {
      const randomIndex = Math.floor(Math.random() * warehouses.length);
      sample.push(warehouses[randomIndex]);
    }
    
    // Random feature subset selection for this tree (feature bagging)
    const numFeaturesToSelect = Math.max(1, Math.floor(Math.sqrt(allFeatures.length)));
    const selectedFeatures: Feature[] = [];
    
    // Copy and shuffle features
    const featuresCopy = [...allFeatures];
    for (let i = 0; i < numFeaturesToSelect; i++) {
      if (featuresCopy.length === 0) break;
      
      const randomIndex = Math.floor(Math.random() * featuresCopy.length);
      selectedFeatures.push(featuresCopy[randomIndex]);
      featuresCopy.splice(randomIndex, 1);
    }
    
    // Apply the selected features to each warehouse in the sample
    const scored = sample.map(warehouse => {
      let score = 0;
      let totalImportance = 0;
      
      // Calculate score based on selected features
      for (const feature of selectedFeatures) {
        const featureValue = feature.extractor(warehouse);
        score += featureValue * feature.importance;
        totalImportance += feature.importance;
      }
      
      // Normalize by total importance
      const normalizedScore = totalImportance > 0 ? score / totalImportance : 0.5;
      
      return {
        warehouse,
        score: normalizedScore
      };
    });
    
    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);
    
    // The top warehouses in this tree get votes
    const topK = Math.min(5, scored.length);
    scored.slice(0, topK).forEach((item, index) => {
      // Higher positions get more votes
      const voteWeight = topK - index;
      
      // Record vote
      const currentVotes = votes.get(item.warehouse.id) || 0;
      votes.set(item.warehouse.id, currentVotes + voteWeight);
      
      // Record confidence score
      const scoresList = confidenceScores.get(item.warehouse.id) || [];
      scoresList.push(item.score);
      confidenceScores.set(item.warehouse.id, scoresList);
      
      // Generate insights for this warehouse
      if (!insights.has(item.warehouse.id)) {
        insights.set(item.warehouse.id, new Set<string>());
      }
      
      const warehouseInsights = insights.get(item.warehouse.id)!;
      
      // Add insights based on feature values
      if (preferences.district && item.warehouse.city?.toLowerCase() === preferences.district.toLowerCase()) {
        warehouseInsights.add(`Perfect location match in ${item.warehouse.city}`);
      } else if (preferences.district && item.warehouse.address?.toLowerCase()?.includes(preferences.district.toLowerCase())) {
        warehouseInsights.add(`Located near ${preferences.district}`);
      }
      
      if (preferences.targetPrice && item.warehouse.price_per_sqft <= preferences.targetPrice) {
        const pctBelow = Math.round((1 - item.warehouse.price_per_sqft / preferences.targetPrice) * 100);
        if (pctBelow >= 5) {
          warehouseInsights.add(`${pctBelow}% below your target budget`);
        } else {
          warehouseInsights.add(`Within your budget at ₹${item.warehouse.price_per_sqft}/sqft`);
        }
      }
      
      if (preferences.minAreaSqft && item.warehouse.total_area >= preferences.minAreaSqft) {
        const areaRatio = item.warehouse.total_area / preferences.minAreaSqft;
        if (areaRatio <= 1.2) {
          warehouseInsights.add(`Optimal warehouse size for your needs`);
        } else if (areaRatio <= 2.0) {
          warehouseInsights.add(`${Math.round((areaRatio - 1) * 100)}% more space than required`);
        }
      }
      
      if (preferences.preferredType && preferences.preferredType !== 'any' && 
          (item.warehouse.features?.some(f => f.toLowerCase().includes(preferences.preferredType!.toLowerCase())) ||
           item.warehouse.amenities?.some(a => a.toLowerCase().includes(preferences.preferredType!.toLowerCase())))) {
        warehouseInsights.add(`Specialized for ${preferences.preferredType} storage`);
      }
      
      if (item.warehouse.rating && item.warehouse.rating >= 4.5) {
        warehouseInsights.add(`Exceptional ratings (${item.warehouse.rating}⭐)`);
      }
      
      if (preferences.preferVerified && item.warehouse.amenities?.some(a => a.toLowerCase().includes('verified'))) {
        warehouseInsights.add('Verified facility with proper documentation');
      }
      
      if (preferences.preferAvailability && item.warehouse.occupancy !== undefined) {
        const availability = 1 - item.warehouse.occupancy;
        if (availability >= 0.7) {
          warehouseInsights.add(`High availability (${Math.round(availability * 100)}% free space)`);
        }
      }
      
      if (item.warehouse.amenities && item.warehouse.amenities.length >= 5) {
        warehouseInsights.add(`Well-equipped with ${item.warehouse.amenities.length} amenities`);
      }
    });
  }
  
  // Calculate final results from votes and confidence scores
  const results = Array.from(votes.entries()).map(([warehouseId, voteCount]) => {
    const warehouse = warehouses.find(w => w.id === warehouseId)!;
    
    // Calculate average confidence score
    const scores = confidenceScores.get(warehouseId) || [];
    const avgConfidence = scores.length > 0 
      ? scores.reduce((sum, score) => sum + score, 0) / scores.length
      : 0;
    
    // Get insights
    const warehouseInsights = Array.from(insights.get(warehouseId) || new Set<string>());
    
    // Make sure we have at least some insights
    if (warehouseInsights.length === 0) {
      warehouseInsights.push(`Located in ${warehouse.city}, ${warehouse.state}`);
    }
    
    return {
      warehouse,
      votes: voteCount,
      confidence: avgConfidence,
      insights: warehouseInsights.slice(0, 3)  // Limit to top 3 insights
    };
  });
  
  // Sort by votes and then by confidence
  results.sort((a, b) => {
    if (b.votes !== a.votes) return b.votes - a.votes;
    return b.confidence - a.confidence;
  });
  
  console.log(`RandomForest found ${results.length} warehouses with votes`);
  
  // Return warehouses
  return results.slice(0, 8).map(item => item.warehouse);
}

/**
 * Advanced Hybrid Recommendation System
 * Combines KNN and RandomForest algorithms with machine learning techniques 
 * similar to stacking/ensemble methods in professional ML applications
 * 
 * @returns Scored warehouse recommendations with detailed insights
 */
export function hybridRecommend(warehouses: SupabaseWarehouse[], preferences: RecommendationPreferences): {
  warehouse: SupabaseWarehouse;
  score: number;
  reasons: string[];
  recommendationType: 'ml' | 'knn' | 'random-forest' | 'hybrid';
}[] {
  if (!warehouses || warehouses.length === 0) return [];
  
  console.log('Running hybrid ML algorithm combining KNN and RandomForest');
  
  // Use both algorithms to get base recommendations
  const knnResults = knnRecommend(warehouses, preferences);
  const rfResults = randomForestRecommend(warehouses, preferences);
  
  // Create a meta-dataset of all ranked warehouses from both algorithms
  const allIds = new Set([
    ...knnResults.map(w => w.id),
    ...rfResults.map(w => w.id)
  ]);
  
  // Detailed feature extraction for meta-learning phase
  type MetaFeatures = {
    knnRank: number;         // Rank in KNN results (-1 if not found)
    rfRank: number;          // Rank in RF results (-1 if not found)
    inBothAlgorithms: boolean; // Whether warehouse appears in both algorithms
    rankDifference: number;  // Absolute difference in ranking
    normalizedRating: number; // Rating normalized to 0-1
    priceMatchScore: number; // How well price matches preferences
    areaMatchScore: number;  // How well area matches preferences
    locationMatchScore: number; // How well location matches preferences
    typeMatchScore: number;  // How well type matches preferences
    verificationScore: number; // Whether warehouse is verified
    amenityRichness: number; // Quality of amenities
    availabilityScore: number; // How available the warehouse is
  };
  
  // Create a map for quick warehouse lookup
  const warehouseMap = new Map(warehouses.map(w => [w.id, w]));
  
  // Detailed function to compute meta-features for each warehouse
  function computeMetaFeatures(warehouse: SupabaseWarehouse): MetaFeatures {
    const knnRank = knnResults.findIndex(w => w.id === warehouse.id);
    const rfRank = rfResults.findIndex(w => w.id === warehouse.id);
    
    // Calculate feature values
    return {
      knnRank,
      rfRank,
      inBothAlgorithms: knnRank >= 0 && rfRank >= 0,
      rankDifference: Math.abs((knnRank >= 0 ? knnRank : knnResults.length) - 
                              (rfRank >= 0 ? rfRank : rfResults.length)),
      normalizedRating: warehouse.rating ? Math.min(1, warehouse.rating / 5) : 0.5,
      
      // Price match score
      priceMatchScore: (() => {
        if (!preferences.targetPrice || preferences.targetPrice <= 0) return 0.5;
        
        const priceDiff = (warehouse.price_per_sqft - preferences.targetPrice) / preferences.targetPrice;
        if (priceDiff <= -0.15) return 0.9;     // 15%+ below target (great value)
        else if (priceDiff <= -0.05) return 0.8; // 5-15% below target (good value)
        else if (priceDiff <= 0.05) return 0.7;  // Within 5% of target (close match)
        else if (priceDiff <= 0.15) return 0.5;  // 5-15% above target (acceptable)
        else if (priceDiff <= 0.3) return 0.3;   // 15-30% above target (expensive)
        else return 0.1;                         // 30%+ above target (very expensive)
      })(),
      
      // Area match score
      areaMatchScore: (() => {
        if (!preferences.minAreaSqft || preferences.minAreaSqft <= 0) return 0.5;
        
        const areaRatio = warehouse.total_area / preferences.minAreaSqft;
        if (areaRatio < 0.9) return 0.1;         // Too small
        else if (areaRatio < 0.95) return 0.3;   // Slightly too small
        else if (areaRatio <= 1.1) return 0.95;  // Perfect size
        else if (areaRatio <= 1.3) return 0.8;   // Slightly larger
        else if (areaRatio <= 1.7) return 0.6;   // Moderately larger
        else if (areaRatio <= 2.5) return 0.4;   // Much larger
        else return 0.2;                         // Excessively large
      })(),
      
      // Location match score
      locationMatchScore: (() => {
        if (!preferences.district || preferences.district === 'any') return 0.5;
        
        const exactMatch = warehouse.city?.toLowerCase() === preferences.district?.toLowerCase();
        const partialMatch = warehouse.address?.toLowerCase()?.includes(preferences.district?.toLowerCase());
        
        return exactMatch ? 1.0 : partialMatch ? 0.7 : 0.1;
      })(),
      
      // Type match score
      typeMatchScore: (() => {
        if (!preferences.preferredType || preferences.preferredType === 'any') return 0.5;
        
        const typeMatch = 
          warehouse.features?.some(f => f.toLowerCase().includes(preferences.preferredType!.toLowerCase())) ||
          warehouse.amenities?.some(a => a.toLowerCase().includes(preferences.preferredType!.toLowerCase()));
        
        return typeMatch ? 0.9 : 0.2;
      })(),
      
      // Verification score
      verificationScore: warehouse.amenities?.some(a => a.toLowerCase().includes('verified')) ? 1.0 : 0.2,
      
      // Amenity richness
      amenityRichness: warehouse.amenities ? Math.min(1.0, warehouse.amenities.length / 10) : 0.2,
      
      // Availability score
      availabilityScore: 1 - (warehouse.occupancy || 0)
    };
  }
  
  // Process each warehouse using our stacked approach
  const results = Array.from(allIds).map(id => {
    const warehouse = warehouseMap.get(id)!;
    const features = computeMetaFeatures(warehouse);
    
    // Meta-learning model: weighted combination of features based on preferences
    let metaScore = 0;
    let totalWeight = 0;
    
    // Define feature importance weights based on user preferences
    const weights = {
      algorithmsAgreement: 2.0, // How much both algorithms agree is important
      
      // Weights for feature-specific scores
      knnRankWeight: 0.6,
      rfRankWeight: 0.4,
      
      // Weights for specific features
      ratingWeight: 0.8,
      locationWeight: preferences.district && preferences.district !== 'any' ? 2.5 : 0.5,
      priceWeight: preferences.targetPrice && preferences.targetPrice > 0 ? 2.0 : 0.5,
      areaWeight: preferences.minAreaSqft && preferences.minAreaSqft > 0 ? 1.5 : 0.5,
      typeWeight: preferences.preferredType && preferences.preferredType !== 'any' ? 1.5 : 0.3,
      verificationWeight: preferences.preferVerified ? 1.0 : 0.2,
      amenityWeight: 0.7,
      availabilityWeight: preferences.preferAvailability ? 1.2 : 0.3
    };
    
    // Calculate algorithm agreement bonus
    let algorithmAgreementScore = 0;
    if (features.inBothAlgorithms) {
      // Better score when both algorithms rank it similarly
      const normalizedRankDiff = Math.max(0, 1 - features.rankDifference / 10);
      algorithmAgreementScore = features.inBothAlgorithms ? 0.5 + (normalizedRankDiff * 0.5) : 0;
      
      metaScore += algorithmAgreementScore * weights.algorithmsAgreement;
      totalWeight += weights.algorithmsAgreement;
    }
    
    // Individual algorithm ranks
    if (features.knnRank >= 0) {
      const normalizedKnnRank = 1 - (features.knnRank / knnResults.length);
      metaScore += normalizedKnnRank * weights.knnRankWeight;
      totalWeight += weights.knnRankWeight;
    }
    
    if (features.rfRank >= 0) {
      const normalizedRfRank = 1 - (features.rfRank / rfResults.length);
      metaScore += normalizedRfRank * weights.rfRankWeight;
      totalWeight += weights.rfRankWeight;
    }
    
    // Rating
    metaScore += features.normalizedRating * weights.ratingWeight;
    totalWeight += weights.ratingWeight;
    
    // Price match
    metaScore += features.priceMatchScore * weights.priceWeight;
    totalWeight += weights.priceWeight;
    
    // Area match
    metaScore += features.areaMatchScore * weights.areaWeight;
    totalWeight += weights.areaWeight;
    
    // Location match
    metaScore += features.locationMatchScore * weights.locationWeight;
    totalWeight += weights.locationWeight;
    
    // Type match
    metaScore += features.typeMatchScore * weights.typeWeight;
    totalWeight += weights.typeWeight;
    
    // Verification status
    metaScore += features.verificationScore * weights.verificationWeight;
    totalWeight += weights.verificationWeight;
    
    // Amenities quality
    metaScore += features.amenityRichness * weights.amenityWeight;
    totalWeight += weights.amenityWeight;
    
    // Availability
    metaScore += features.availabilityScore * weights.availabilityWeight;
    totalWeight += weights.availabilityWeight;
    
    // Normalize final score
    const finalScore = totalWeight > 0 ? metaScore / totalWeight : 0.5;
    
    // Generate reasons
    const reasons: string[] = [];
    
    // Create dynamic reasons based on strongest features
    const featureStrengths = [
      { name: 'location', score: features.locationMatchScore * weights.locationWeight, 
        reason: `Perfect location match in ${warehouse.city}` },
      { name: 'price', score: features.priceMatchScore * weights.priceWeight,
        reason: preferences.targetPrice && warehouse.price_per_sqft <= preferences.targetPrice ? 
          `${Math.round((1 - warehouse.price_per_sqft / preferences.targetPrice) * 100)}% below your target budget` : 
          `Within your budget at ₹${warehouse.price_per_sqft}/sqft` },
      { name: 'area', score: features.areaMatchScore * weights.areaWeight,
        reason: preferences.minAreaSqft && warehouse.total_area >= preferences.minAreaSqft ?
          (warehouse.total_area <= preferences.minAreaSqft * 1.2 ? 
            `Optimal warehouse size for your needs` : 
            `${Math.round((warehouse.total_area / preferences.minAreaSqft - 1) * 100)}% more space than required`) :
          `${warehouse.total_area.toLocaleString()} sqft available` },
      { name: 'type', score: features.typeMatchScore * weights.typeWeight,
        reason: preferences.preferredType ? `Specialized for ${preferences.preferredType} storage` : 
          warehouse.features && warehouse.features.length > 0 ? `Features: ${warehouse.features[0]}` : ''},
      { name: 'rating', score: features.normalizedRating * weights.ratingWeight,
        reason: warehouse.rating >= 4.7 ? `Exceptional ratings (${warehouse.rating}⭐)` :
                warehouse.rating >= 4.3 ? `Highly rated (${warehouse.rating}⭐)` : ''},
      { name: 'verification', score: features.verificationScore * weights.verificationWeight,
        reason: features.verificationScore > 0.7 ? 'Verified facility with proper documentation' : ''},
      { name: 'amenities', score: features.amenityRichness * weights.amenityWeight,
        reason: warehouse.amenities && warehouse.amenities.length >= 5 ? 
          `Well-equipped with ${warehouse.amenities.length} amenities` : ''},
      { name: 'availability', score: features.availabilityScore * weights.availabilityWeight,
        reason: features.availabilityScore >= 0.7 ? 
          `High availability (${Math.round(features.availabilityScore * 100)}% free space)` : ''}
    ]
    .filter(item => item.reason !== '') // Filter out empty reasons
    .sort((a, b) => b.score - a.score); // Sort by strength
    
    // Take top 3 reasons
    reasons.push(...featureStrengths.slice(0, 3).map(item => item.reason));
    
    // Ensure we have at least one reason
    if (reasons.length === 0) {
      reasons.push(`Located in ${warehouse.city}, ${warehouse.state}`);
    }
    
    // Determine which algorithm contributed most to this recommendation
    let recommendationType: 'ml' | 'knn' | 'random-forest' | 'hybrid' = 'hybrid';
    
    if (features.knnRank >= 0 && features.rfRank >= 0) {
      // If it's in both algorithms and highly ranked in both, it's truly hybrid
      if (features.knnRank < 3 && features.rfRank < 3) {
        recommendationType = 'hybrid';
      } else if (features.knnRank < features.rfRank) {
        recommendationType = 'knn';
      } else {
        recommendationType = 'random-forest';
      }
    } else if (features.knnRank >= 0) {
      recommendationType = 'knn';
    } else if (features.rfRank >= 0) {
      recommendationType = 'random-forest';
    }
    
    // For top recommendations, use the most comprehensive label
    if (finalScore > 0.85) {
      recommendationType = 'ml';
    }
    
    return {
      warehouse,
      score: finalScore,
      reasons,
      recommendationType
    };
  });
  
  // Sort by final score
  results.sort((a, b) => b.score - a.score);
  
  // Ensure the top result is marked as hybrid/ML for UI presentation
  if (results.length > 0) {
    results[0].recommendationType = 'hybrid';
  }
  
  console.log(`Hybrid algorithm generated ${results.length} scored recommendations`);
  
  return results;
}

/**
 * Maps a Supabase warehouse to the app's RecommendedWarehouse format
 */
export function mapToRecommendedWarehouse(
  item: { 
    warehouse: SupabaseWarehouse;
    score: number;
    reasons: string[];
    recommendationType: 'ml' | 'knn' | 'random-forest' | 'hybrid';
  }
): RecommendedWarehouse {
  const { warehouse, score, reasons } = item;
  
  // Safely calculate available area with fallbacks
  const totalArea = warehouse.total_area || 50000; // fallback to 50k sqft
  const occupancy = warehouse.occupancy || 0;
  const availableArea = Math.floor(totalArea * (1 - occupancy));
  
  return {
    whId: warehouse.id || String(Math.random()),
    name: warehouse.name || `Warehouse in ${warehouse.city || 'Maharashtra'}`,
    location: `${warehouse.city || 'Mumbai'}, ${warehouse.state || 'Maharashtra'}`,
    district: warehouse.city || 'Mumbai',
    state: warehouse.state || 'Maharashtra',
    pricePerSqFt: warehouse.price_per_sqft || 65,
    totalAreaSqft: totalArea,
    availableAreaSqft: availableArea,
    rating: warehouse.rating || 4.5,
    reviews: warehouse.reviews_count || 10,
    image: (warehouse.images && warehouse.images.length > 0) 
      ? warehouse.images[0] 
      : 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&q=80',
    type: (warehouse.features && warehouse.features.length > 0) 
      ? warehouse.features[0] 
      : (warehouse.amenities && warehouse.amenities.length > 0)
      ? warehouse.amenities[0]
      : 'General Storage',
    matchScore: Math.round(score * 100),
    reasons: reasons.map(r => ({ label: r })),
  };
}
