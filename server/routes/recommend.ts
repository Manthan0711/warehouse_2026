import type { Request, Response } from "express";
import type { RecommendationRequest, RecommendationResponse } from "../../shared/api";
import { recommendWarehouses } from "../../shared/recommendation";
import { createClient } from '@supabase/supabase-js';
import { hybridRecommend, mapToRecommendedWarehouse } from "../../shared/ml-algorithms";
import { geminiRecommend, mapGeminiToRecommendedWarehouse } from "../../shared/gemini-ai";

// Use environment variables for Supabase credentials (server-side uses non-VITE prefix)
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://bsrzqffxgvdebyofmhzg.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzcnpxZmZ4Z3ZkZWJ5b2ZtaHpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNjEzNDcsImV4cCI6MjA3MjYzNzM0N30.VyCEg70kLhTV2l8ZyG9CfPb00FBdVrlVBcBUhyI88Z8';

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

/**
 * Enhanced recommendation handler with multi-algorithm approach
 */
export async function handleRecommend(req: Request, res: Response) {
  try {
    const body = req.body as RecommendationRequest | undefined;
    const prefs = body?.preferences ?? {};
    const limit = body?.limit ?? 12;

    console.log("Recommendation request:", { prefs, limit });

    // Check for a special flag in the request to use a specific algorithm
    const useAlgorithm = req.query.algorithm as string || 'auto';
    
    let items;
    
    // Try enhanced ML algorithms with fallback to standard recommendations
    try {
      let warehouses;
      
      // Try to fetch from Supabase, fall back to mock data if it fails
      try {
        const { data, error } = await supabase
          .from('warehouses')
          .select('*')
          .limit(1000);
        
        if (error) throw error;
        if (!data || data.length === 0) throw new Error('No warehouses found');
        
        warehouses = data;
        console.log(`Fetched ${warehouses.length} warehouses from Supabase for ML processing`);
      } catch (supabaseError) {
        console.log('Supabase fetch failed, using mock warehouse data for ML:', supabaseError);
        // Import mock data as fallback
        const { maharashtraWarehouses } = await import('../../client/data/warehouses');
        warehouses = maharashtraWarehouses;
        console.log(`Using ${warehouses.length} mock warehouses for ML processing`);
      }
      
      // Choose the algorithm based on query param or use auto-selection
      if (useAlgorithm === 'gemini' || useAlgorithm === 'auto') {
        // First try Gemini AI
        try {
          console.log('Attempting Gemini AI recommendations...');
          const geminiResults = await geminiRecommend(warehouses, prefs);
          items = geminiResults.map(mapGeminiToRecommendedWarehouse).slice(0, limit);
          console.log(`Generated ${items.length} recommendations with Gemini AI`);
        } catch (geminiError) {
          console.error('Gemini AI recommendations failed, falling back to hybrid ML:', geminiError);
          // Fall back to hybrid ML
          const hybridResults = hybridRecommend(warehouses, prefs);
          items = hybridResults.map(mapToRecommendedWarehouse).slice(0, limit);
          console.log(`Generated ${items.length} recommendations with hybrid ML fallback`);
        }
      } else if (useAlgorithm === 'hybrid') {
        // Use hybrid ML directly
        const hybridResults = hybridRecommend(warehouses, prefs);
        items = hybridResults.map(mapToRecommendedWarehouse).slice(0, limit);
        console.log(`Generated ${items.length} recommendations with hybrid ML`);
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
    
    console.log(`Returning ${items.length} recommendations`);
    res.json(payload);
  } catch (err) {
    console.error("/api/recommend error", err);
    res.status(500).json({ error: "Failed to generate recommendations" });
  }
}
