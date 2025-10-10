import React from "react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ExternalLink, Info } from "lucide-react";

/**
 * Component to guide users on setting up Gemini API key
 */
export default function GeminiApiKeySetup() {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  
  if (apiKey) return null; // Only show if no API key is configured
  
  return (
    <Alert className="mb-4 bg-amber-50 border-amber-200">
      <div className="flex gap-2 items-center">
        <Info className="h-5 w-5 text-amber-600" />
        <AlertTitle className="text-amber-800">Gemini AI Integration Not Configured</AlertTitle>
      </div>
      <AlertDescription className="mt-2 text-amber-700">
        <p className="mb-2">
          You're currently seeing simulated AI recommendations. For real Gemini AI-powered recommendations:
        </p>
        <ol className="list-decimal list-inside space-y-1 mb-3">
          <li>Visit <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Google AI Studio</a> to get an API key</li>
          <li>Add the API key to your <code>.env</code> file as <code>VITE_GEMINI_API_KEY=your_key_here</code></li>
          <li>Restart the development server</li>
        </ol>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="border-amber-300" onClick={() => window.open('https://aistudio.google.com/app/apikey', '_blank')}>
            <ExternalLink className="h-4 w-4 mr-1" />
            Get API Key
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
