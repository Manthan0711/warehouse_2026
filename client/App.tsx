import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AuthProvider } from "./contexts/AuthContext";
import { WarehouseProvider } from "./contexts/WarehouseContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { Toaster } from "./components/ui/toaster";
import ProfessionalTheme from "./components/ProfessionalTheme";
import { GeminiChatbot } from "./components/GeminiChatbot";

console.log('🚀 APP VERSION 6.0 - OWNER WORKFLOW IMPLEMENTED');
console.log('✅ Property listing form with 4-step wizard');
console.log('✅ Image upload & preview');
console.log('✅ Database schema for approvals ready');
console.log('✅ Demo mode supported');
console.log('⏳ Next: Admin approval interface');
console.log('Hard refresh: Ctrl+Shift+R');

import Placeholder from "./pages/Placeholder";
import Index from "./pages/Index";
import About from "./pages/About";
import Warehouses from "./pages/Warehouses";
import WarehouseDetail from "./pages/WarehouseDetail";
import Compare from "./pages/Compare";
import NotFound from "./pages/NotFound";
import Contact from "./pages/Contact";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import SeekerDashboard from "./pages/SeekerDashboard";
import MLRecommendationsPage from "./pages/MLRecommendationsPage";
import ListProperty from "./pages/ListProperty";
import SubmissionView from "./pages/SubmissionView";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <ProfessionalTheme />
      <AuthProvider>
        <WarehouseProvider>
          <Router>
            <div className="min-h-screen">
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/about" element={<About />} />
                <Route path="/warehouses" element={<Warehouses />} />
                <Route path="/warehouses/:id" element={<WarehouseDetail />} />
                <Route path="/compare" element={<Compare />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Login />} />
                <Route path="/register" element={<Login />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/seeker-dashboard" element={<SeekerDashboard />} />
                <Route path="/admin-dashboard" element={<Dashboard />} />
                <Route path="/ml-recommendations" element={<MLRecommendationsPage />} />
                <Route path="/ai-recommendations" element={<MLRecommendationsPage />} />
                <Route path="/list-property" element={<ListProperty />} />
                <Route path="/submission/:id" element={<SubmissionView />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              <Toaster />
              <GeminiChatbot />
            </div>
          </Router>
        </WarehouseProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
