import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Loader2, Check, X, Info, AlertTriangle, Database, Network, Bot
} from "lucide-react";
import { supabase } from '../services/supabaseClient';

export default function EnvChecker() {
  const [checking, setChecking] = useState(false);
  const [results, setResults] = useState<{
    supabase: boolean;
    api: boolean;
    supabaseError?: string;
    apiError?: string;
    supabaseUrl?: string;
    envVars?: Record<string, string>;
  }>({
    supabase: false,
    api: false
  });

  const runDiagnostics = async () => {
    setChecking(true);
    const diagnosticResults = {
      supabase: false,
      api: false,
      supabaseError: '',
      apiError: '',
      supabaseUrl: '',
      envVars: {}
    };

    // Check environment variables
    try {
      // Get all VITE_ env vars (these are safe to expose)
      const envVars: Record<string, string> = {};
      Object.keys(import.meta.env).forEach(key => {
        if (key.startsWith('VITE_')) {
          envVars[key] = import.meta.env[key];
        }
      });
      diagnosticResults.envVars = envVars;
    } catch (error) {
      console.error('Error checking env vars:', error);
    }

    // Check Supabase connection
    try {
      // Just use the URL from env or hardcoded value
      try {
        diagnosticResults.supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || 'Using fallback URL';
      } catch {
        diagnosticResults.supabaseUrl = 'Using fallback URL';
      }
      const { data, error } = await supabase.from('warehouses').select('id').limit(1);
      
      if (error) {
        throw error;
      }
      
      diagnosticResults.supabase = true;
    } catch (error: any) {
      diagnosticResults.supabaseError = error.message || 'Unknown error connecting to Supabase';
      console.error('Supabase connection error:', error);
    }

    // Check API endpoint
    try {
      const response = await fetch('/api/recommend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          preferences: { preferVerified: true },
          limit: 1
        }),
      });

      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }

      const data = await response.json();
      diagnosticResults.api = Array.isArray(data?.items);
    } catch (error: any) {
      diagnosticResults.apiError = error.message || 'Unknown error connecting to API';
      console.error('API connection error:', error);
    }

    setResults(diagnosticResults);
    setChecking(false);
  };

  return (
    <Card className="bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center">
          <Network className="h-5 w-5 mr-2 text-blue-600" />
          System Diagnostics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {!checking && !results.supabase && !results.api ? (
            <Button 
              onClick={runDiagnostics} 
              variant="outline"
              className="w-full"
            >
              <Info className="h-4 w-4 mr-2" />
              Run Connection Diagnostics
            </Button>
          ) : checking ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-5 w-5 mr-2 animate-spin text-blue-600" />
              <span>Running diagnostics...</span>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="border rounded-md p-3 bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <Database className="h-4 w-4 mr-2 text-blue-600" />
                      <span className="font-medium">Supabase Connection</span>
                    </div>
                    {results.supabase ? (
                      <Check className="h-5 w-5 text-green-500" />
                    ) : (
                      <X className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                  {results.supabaseUrl && (
                    <div className="text-xs text-gray-500 mb-1">
                      URL: {results.supabaseUrl}
                    </div>
                  )}
                  {results.supabaseError && (
                    <div className="text-xs text-red-600 bg-red-50 p-2 rounded mt-1">
                      {results.supabaseError}
                    </div>
                  )}
                </div>

                <div className="border rounded-md p-3 bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <Bot className="h-4 w-4 mr-2 text-purple-600" />
                      <span className="font-medium">API Connection</span>
                    </div>
                    {results.api ? (
                      <Check className="h-5 w-5 text-green-500" />
                    ) : (
                      <X className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                  {results.apiError && (
                    <div className="text-xs text-red-600 bg-red-50 p-2 rounded mt-1">
                      {results.apiError}
                    </div>
                  )}
                </div>
              </div>

              {/* Environment Variables */}
              {results.envVars && Object.keys(results.envVars).length > 0 && (
                <div className="border rounded-md p-3 bg-white">
                  <div className="flex items-center mb-2">
                    <Info className="h-4 w-4 mr-2 text-blue-600" />
                    <span className="font-medium">Environment Variables</span>
                  </div>
                  <div className="space-y-1 text-xs font-mono bg-gray-50 p-2 rounded">
                    {Object.entries(results.envVars).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-gray-700">{key}:</span>
                        <span className="text-gray-900">{
                          // Mask sensitive values
                          key.includes('KEY') || key.includes('SECRET') 
                            ? value.substring(0, 8) + '...' 
                            : value
                        }</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between">
                <Button 
                  onClick={runDiagnostics} 
                  variant="outline" 
                  size="sm"
                >
                  <Loader2 className="h-4 w-4 mr-2" />
                  Run Again
                </Button>
                
                {(!results.supabase || !results.api) && (
                  <div className="flex items-center text-amber-600 text-sm">
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    <span>Issues detected. Check console for more details.</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
