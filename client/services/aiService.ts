/**
 * Unified AI Service - Groq & OpenRouter as primary LLM providers
 * Priority: Groq (fastest, free) → OpenRouter (free models) → Local Fallback
 * Gemini & Cloudflare removed (broken/unreliable)
 */

// API Keys from environment
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

export interface AIRequest {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AIResponse {
  text: string;
  provider: 'openrouter' | 'groq' | 'fallback';
  model: string;
  error?: string;
}

/** Helper: fetch with timeout (default 15s) */
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Call Groq API — fastest free LLM provider
 * Models tried in order: llama-3.3-70b-versatile → llama-3.1-8b-instant → mixtral-8x7b-32768
 */
async function callGroq(request: AIRequest): Promise<AIResponse> {
  if (!GROQ_API_KEY) {
    throw new Error('Groq API key not configured');
  }

  // Try multiple models in case one is unavailable/deprecated
  const models = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'];

  for (const model of models) {
    try {
      console.log(`  🔸 Groq: trying model ${model}...`);
      const response = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages: [
            ...(request.systemPrompt ? [{ role: 'system', content: request.systemPrompt }] : []),
            { role: 'user', content: request.prompt }
          ],
          max_tokens: request.maxTokens || 2000,
          temperature: request.temperature || 0.7
        })
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        console.warn(`  ❌ Groq ${model}: ${response.status} ${response.statusText} — ${errorBody.substring(0, 200)}`);
        continue; // try next model
      }

      const data = await response.json();
      if (!data.choices?.[0]?.message?.content) {
        console.warn(`  ❌ Groq ${model}: empty response`);
        continue;
      }

      return {
        text: data.choices[0].message.content,
        provider: 'groq',
        model
      };
    } catch (err: any) {
      console.warn(`  ❌ Groq ${model}: ${err.name === 'AbortError' ? 'timeout' : err.message}`);
      continue;
    }
  }

  throw new Error('All Groq models failed');
}

/**
 * Call OpenRouter API — access to many free LLM models
 * Uses free models: qwen-2.5-72b → llama-3.1-8b → gemma-2-9b
 */
async function callOpenRouter(request: AIRequest): Promise<AIResponse> {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OpenRouter API key not configured');
  }

  // Free models on OpenRouter (no credits needed)
  const models = [
    'qwen/qwen-2.5-72b-instruct:free',
    'meta-llama/llama-3.1-8b-instruct:free',
    'google/gemma-2-9b-it:free'
  ];

  for (const model of models) {
    try {
      console.log(`  🔸 OpenRouter: trying model ${model}...`);
      const response = await fetchWithTimeout('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'SmartSpace Warehouse'
        },
        body: JSON.stringify({
          model,
          messages: [
            ...(request.systemPrompt ? [{ role: 'system', content: request.systemPrompt }] : []),
            { role: 'user', content: request.prompt }
          ],
          max_tokens: request.maxTokens || 2000,
          temperature: request.temperature || 0.7
        })
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        console.warn(`  ❌ OpenRouter ${model}: ${response.status} ${response.statusText} — ${errorBody.substring(0, 200)}`);
        continue;
      }

      const data = await response.json();
      if (!data.choices?.[0]?.message?.content) {
        console.warn(`  ❌ OpenRouter ${model}: empty response`);
        continue;
      }

      return {
        text: data.choices[0].message.content,
        provider: 'openrouter',
        model
      };
    } catch (err: any) {
      console.warn(`  ❌ OpenRouter ${model}: ${err.name === 'AbortError' ? 'timeout' : err.message}`);
      continue;
    }
  }

  throw new Error('All OpenRouter models failed');
}

/**
 * Main AI service — tries Groq first (fastest), then OpenRouter (free models)
 * Falls back to local template if both providers fail
 */
export async function getAIResponse(request: AIRequest): Promise<AIResponse> {
  console.log('🤖 AI Request:', request.prompt.substring(0, 100) + '...');

  const providers = [
    { name: 'Groq', fn: callGroq, enabled: !!GROQ_API_KEY },
    { name: 'OpenRouter', fn: callOpenRouter, enabled: !!OPENROUTER_API_KEY }
  ];

  for (const provider of providers) {
    if (!provider.enabled) {
      console.log(`⏭️ Skipping ${provider.name} — API key not set`);
      continue;
    }

    try {
      console.log(`🔄 Trying ${provider.name}...`);
      const response = await provider.fn(request);
      console.log(`✅ Success with ${provider.name} (${response.model})`);
      return response;
    } catch (error: any) {
      console.warn(`⚠️ ${provider.name} failed:`, error.message || error);
      continue;
    }
  }

  // All providers failed — return a useful local fallback
  console.error('❌ All AI providers failed, using local fallback response');
  return generateLocalFallback(request);
}

/**
 * Get warehouse recommendations using AI
 */
export async function getAIWarehouseRecommendations(
  userPreferences: {
    district?: string;
    targetPrice?: number;
    minAreaSqft?: number;
    preferredType?: string;
  },
  warehouses: any[]
): Promise<{ recommendations: any[]; reasoning: string }> {
  const prompt = `As a warehouse recommendation expert, analyze these ${warehouses.length} warehouses and recommend the top 10 based on these user preferences:
  
User Preferences:
- District: ${userPreferences.district || 'Any'}
- Target Price: ₹${userPreferences.targetPrice || 'Any'} per sq ft
- Minimum Area: ${userPreferences.minAreaSqft || 'Any'} sq ft
- Type: ${userPreferences.preferredType || 'Any'}

Warehouse Data (sample):
${JSON.stringify(warehouses.slice(0, 20).map(w => ({
  id: w.id,
  name: w.name,
  district: w.district,
  city: w.city,
  price: w.pricePerSqFt,
  area: w.totalAreaSqft,
  type: w.warehouseType,
  rating: w.rating
})), null, 2)}

Provide recommendations in JSON format:
{
  "recommendations": [
    { "warehouseId": "id", "matchScore": 0-100, "reason": "why this matches" }
  ],
  "reasoning": "Overall recommendation strategy"
}`;

  const response = await getAIResponse({
    prompt,
    systemPrompt: 'You are a warehouse recommendation expert. Always respond with valid JSON.',
    temperature: 0.3,
    maxTokens: 2000
  });

  try {
    // Extract JSON from response
    const jsonMatch = response.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return result;
    }
  } catch (e) {
    console.error('Failed to parse AI response:', e);
  }

  return {
    recommendations: [],
    reasoning: 'AI analysis completed but response parsing failed'
  };
}

/**
 * Get AI-powered chatbot response for warehouse queries
 * Uses real LLM with warehouse context for intelligent responses
 */
export async function getChatbotResponse(
  userMessage: string,
  context?: { warehouses?: any[]; userProfile?: any }
): Promise<string> {
  console.log('🤖 LLM Chatbot Request:', userMessage.substring(0, 50) + '...');
  
  const systemPrompt = `You are SmartSpace AI Assistant, an expert in warehouse rental and logistics in Maharashtra, India.

**YOUR KNOWLEDGE:**
- 10,002+ warehouses in our database across Maharashtra
- Cities covered: Mumbai, Pune, Nashik, Aurangabad, Thane, Solapur, Kolhapur, Sangli, Satara, Raigad
- Price range: ₹25-150 per sq ft per month
- Warehouse types: General Storage, Godown, Gala, Cold Storage, Pharma Storage, Food Storage, Industrial Logistics, E-commerce Fulfillment, Zepto Dark Store, Swiggy Instamart Dark Store, Blinkit Dark Store, Automobile Spare Storage, Textile Storage, Electronics Storage, FMCG Distribution, Agri Warehouse, Hazardous Materials, Temperature Controlled, Bonded Warehouse
- Features: 24/7 Security, Loading Docks, Climate Control, CCTV, Power Backup, FSSAI Certified, Pest Control

**YOUR CAPABILITIES:**
1. Help users find suitable warehouses based on their needs
2. Provide pricing estimates and market insights
3. Explain warehouse features and amenities
4. Guide users through the SmartSpace platform
5. Recommend warehouses based on business type

**RESPONSE STYLE:**
- Be helpful, concise, and professional
- Use bullet points and formatting for clarity
- Provide specific recommendations when possible
- Include relevant statistics from our database
- Suggest next steps for the user

Current context: ${context?.warehouses?.length || '10,000+'} warehouses available in database.`;

  const response = await getAIResponse({
    prompt: userMessage,
    systemPrompt,
    temperature: 0.7,
    maxTokens: 800
  });

  console.log('✅ LLM Response received from:', response.provider, response.model);
  
  return response.text;
}

export default {
  getAIResponse,
  getAIWarehouseRecommendations,
  getChatbotResponse
};

/**
 * Local fallback when all AI providers are unavailable
 * Generates contextually relevant text without any API
 */
function generateLocalFallback(request: AIRequest): AIResponse {
  const prompt = request.prompt.toLowerCase();

  let text = '';

  // Warehouse description generation
  if (prompt.includes('listing description') || prompt.includes('warehouse listing')) {
    const nameMatch = request.prompt.match(/Name:\s*(.+)/i);
    const cityMatch = request.prompt.match(/City:\s*(.+)/i);
    const typeMatch = request.prompt.match(/Warehouse Type:\s*(.+)/i);
    const areaMatch = request.prompt.match(/Total Area:\s*(.+?)(?:\s*sq|$)/im);
    const name = nameMatch?.[1]?.trim() || 'this warehouse';
    const city = cityMatch?.[1]?.trim() || 'a prime location';
    const type = typeMatch?.[1]?.trim() || 'General Storage';
    const area = areaMatch?.[1]?.trim() || '';

    text = `${name} is a premium ${type.toLowerCase()} facility located in ${city}. ${area ? `Spanning ${area} sq ft of well-maintained space, this` : 'This'} warehouse offers excellent connectivity to major transport routes and industrial areas. The facility is equipped with modern amenities including 24/7 security, CCTV surveillance, and dedicated loading/unloading docks. With robust infrastructure and competitive pricing, it is an ideal choice for businesses looking for reliable storage and logistics solutions in ${city}.`;
  }
  // Owner insights
  else if (prompt.includes('owner insight') || prompt.includes('owner dashboard')) {
    text = 'Your warehouse portfolio is performing well in the current market. Consider optimizing pricing for peak season demand in Maharashtra. Tip 1: List detailed amenities and high-quality images to improve inquiry rates by up to 40%. Tip 2: Offer flexible rental terms (monthly/quarterly) to attract a wider range of tenants.';
  }
  // Chatbot / general
  else if (prompt.includes('warehouse') || prompt.includes('storage')) {
    text = 'I can help you find the right warehouse. Our platform lists over 10,000 warehouses across Maharashtra with prices ranging from ₹25-150 per sq ft. Tell me your preferred city, required area, and storage type, and I\'ll suggest the best options for you.';
  }
  // Generic fallback
  else {
    text = 'I\'m SmartSpace AI Assistant. I can help with warehouse recommendations, pricing insights, and platform guidance. Please ask me about available warehouses, pricing, or how to list your property.';
  }

  return {
    text,
    provider: 'fallback',
    model: 'local-template',
    error: 'All AI providers unavailable, using local fallback'
  };
}
