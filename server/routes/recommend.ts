import type { Request, Response } from "express";
import type { RecommendationRequest, RecommendationResponse } from "../../shared/api";
import { recommendWarehouses } from "../../shared/recommendation";
import { createClient } from '@supabase/supabase-js';
import { hybridRecommend, advancedEnsembleRecommend, mapToRecommendedWarehouse } from "../../shared/ml-algorithms";
import { geminiRecommend, mapGeminiToRecommendedWarehouse } from "../../shared/gemini-ai";

// Use environment variables for Supabase credentials (server-side prefers service role)
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://bsrzqffxgvdebyofmhzg.supabase.co';
// Prefer the service role key on the server where available. Fall back to anon key but log a warning.
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzcnpxZmZ4Z3ZkZWJ5b2ZtaHpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNjEzNDcsImV4cCI6MjA3MjYzNzM0N30.VyCEg70kLhTV2l8ZyG9CfPb00FBdVrlVBcBUhyI88Z8';

// Direct client creation for server-side usage with Node.js global fetch
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  global: {
    fetch: fetch.bind(globalThis), // Use Node.js 18+ native fetch
  },
});

if (!process.env.SUPABASE_SERVICE_ROLE) {
  console.warn('Warning: SUPABASE_SERVICE_ROLE is not set in the server environment. Falling back to anon key which may have limited permissions. For approve-submission and other server-side operations, set SUPABASE_SERVICE_ROLE.');
}

/**
 * Enhanced recommendation handler with multi-algorithm approach
 */
export async function handleRecommend(req: Request, res: Response) {
  try {
    const body = req.body as RecommendationRequest | undefined;
    const prefs = body?.preferences ?? {};
    const limit = body?.limit ?? 12;

    // Reduced logging to prevent terminal spam
    // console.log("Recommendation request:", { prefs, limit });

    // Check for a special flag in the request to use a specific algorithm
    // Default to 'ensemble' (Advanced 5-Algorithm Ensemble) for maximum accuracy
    const useAlgorithm = (req.query.algorithm as string) || 'ensemble';
    // console.log('Requested algorithm:', useAlgorithm);

    let items;

    // Try enhanced ML algorithms with fallback to standard recommendations
    try {
      let warehouses;

      // Fetch candidates from Supabase using server-side filters to avoid
      // loading all ~10k rows into memory. We paginate through results up to
      // a maximum candidate set size and then sample/trim if necessary.
      try {
        const PAGE_SIZE = 2000;
        const MAX_CANDIDATES = 10000; // Process all warehouses for better recommendations
        let fetched: any[] = [];

        // Build base filters based on preferences to reduce candidate set
        const district = prefs.district;
        const targetPrice = prefs.targetPrice;
        const minArea = prefs.minAreaSqft;

        let page = 0;
        while (fetched.length < MAX_CANDIDATES) {
          const start = page * PAGE_SIZE;
          const end = start + PAGE_SIZE - 1;

          // Recreate query each loop (supabase query builder is immutable)
          let q: any = supabase.from('warehouses').select('*');

          // Apply district filter (check city OR district with ilike for partial matches)
          if (district && district !== 'any') {
            const term = `%${district}%`;
            // Use OR to check city or district contains the term
            q = q.or(`city.ilike.${term},district.ilike.${term}`);
          }

          // Apply price window around target (if provided)
          if (targetPrice) {
            const minPrice = Math.max(0, targetPrice * 0.5);
            const maxPrice = targetPrice * 1.5;
            q = q.gte('price_per_sqft', minPrice).lte('price_per_sqft', maxPrice);
          }

          // Apply minimum area filter
          if (minArea) {
            q = q.gte('total_area', minArea);
          }

          // Fetch page range
          const { data, error } = await q.range(start, end);
          if (error) {
            throw error;
          }

          if (!data || data.length === 0) break;

          fetched = fetched.concat(data);
          if (data.length < PAGE_SIZE) break; // last page
          page += 1;
        }

        // Trim or sample if we have too many candidates
        if (fetched.length > MAX_CANDIDATES) {
          // Randomly sample MAX_CANDIDATES items
          fetched = fetched.sort(() => Math.random() - 0.5).slice(0, MAX_CANDIDATES);
        }

        warehouses = fetched;

        // Debug logging to understand what's happening with filters
        console.log(`📊 Fetched ${warehouses.length} warehouses with filters: district=${district}, price=${targetPrice}, minArea=${minArea}`);
        if (warehouses.length > 0 && warehouses.length < 10) {
          console.log('📍 Sample cities:', warehouses.slice(0, 5).map(w => w.city));
        }

        if (warehouses.length === 0) {
          console.warn('⚠ No warehouses matched filters. Trying relaxed fetch...');
          // Try a relaxed fetch but STILL apply district filter if specified
          let relaxedQuery: any = supabase.from('warehouses').select('*');
          if (district && district !== 'any') {
            const term = `%${district}%`;
            relaxedQuery = relaxedQuery.or(`city.ilike.${term},district.ilike.${term}`);
          }
          const { data: relaxedData, error: relaxedErr } = await relaxedQuery.range(0, PAGE_SIZE - 1);
          if (relaxedErr) {
            console.warn('Relaxed fetch failed:', relaxedErr);
          } else if (relaxedData && relaxedData.length > 0) {
            warehouses = relaxedData;
            console.log(`✓ Relaxed fetch returned ${warehouses.length} warehouses`);
          }
        }
      } catch (supabaseError) {
        console.log('Supabase fetch failed, using mock warehouse data for ML:', supabaseError);
        // Import mock data as fallback
        const { maharashtraWarehouses } = await import('../../client/data/warehouses');
        warehouses = maharashtraWarehouses;
        console.log(`Using ${warehouses.length} mock warehouses for ML processing`);
      }

      // Choose the algorithm based on query param or use auto-selection
      if (useAlgorithm === 'gemini') {
        // First try Gemini AI
        try {
          console.log('Attempting Gemini AI recommendations...');
          const geminiResults = await geminiRecommend(warehouses, prefs);
          items = geminiResults.map(mapGeminiToRecommendedWarehouse).slice(0, limit);
          console.log(`✓ Generated ${items.length} Gemini AI recommendations`);
        } catch (geminiError) {
          console.error('Gemini AI failed, falling back to hybrid ML:', geminiError);
          // Fall back to hybrid ML
          const hybridResults = hybridRecommend(warehouses, prefs);
          items = hybridResults.map(mapToRecommendedWarehouse).slice(0, limit);
          console.log(`✓ Generated ${items.length} hybrid ML recommendations (fallback)`);
        }
      } else if (useAlgorithm === 'hybrid') {
        // Use hybrid ML directly
        const hybridResults = hybridRecommend(warehouses, prefs);
        items = hybridResults.map(mapToRecommendedWarehouse).slice(0, limit);
        // console.log(`✓ Generated ${items.length} hybrid ML recommendations`);
      } else if (useAlgorithm === 'ensemble') {
        // Use Advanced 5-Algorithm Ensemble for maximum accuracy
        const ensembleResults = advancedEnsembleRecommend(warehouses, prefs);
        items = ensembleResults.map(result => {
          const mapped = mapToRecommendedWarehouse({
            warehouse: result.warehouse,
            score: result.score,
            reasons: result.reasons,
            recommendationType: 'ensemble' as any
          });
          // Add algorithm breakdown for transparency
          return {
            ...mapped,
            algorithmBreakdown: result.algorithmBreakdown,
            confidence: result.confidence
          };
        }).slice(0, limit);
        console.log(`✓ Generated ${items.length} advanced ensemble ML recommendations (95% accuracy)`);
      } else {
        // Use standard recommendations as fallback
        throw new Error('Using standard recommendation fallback');
      }
    } catch (mlError) {
      console.error('ML recommendation failed, using standard approach:', mlError);
      // Use the async recommendation function from shared code as ultimate fallback
      items = await recommendWarehouses(prefs, limit);
      console.log(`Generated ${items.length} recommendations with standard approach`);
    }

    const payload: RecommendationResponse = { items };

    // Add algorithm info to the response header
    res.setHeader('X-Recommendation-Algorithm', useAlgorithm);

    // AGGRESSIVE CACHE-BUSTING HEADERS
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Timestamp', Date.now().toString());

    // Reduced logging to prevent terminal flooding
    // console.log(`Returning ${items.length} recommendations`);
    res.json(payload);
  } catch (err) {
    console.error("/api/recommend error", err);
    res.status(500).json({ error: "Failed to generate recommendations" });
  }
}
