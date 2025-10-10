import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bot, Star, MapPin, Building2, Users, ArrowRight, RefreshCw, Settings, Brain, Zap, Target, ChartBar as BarChart3, TrendingUp, Filter, Info, ChevronRight, Clock, Save, Share, CircleHelp as HelpCircle, Sparkles, Download, TriangleAlert as AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { useSmartRecommendations } from "@/hooks/use-recommendations";
import RecommendationCustomizer from "@/components/RecommendationCustomizer";
import MLRecommendations from "@/components/MLRecommendations";
import EnvChecker from "@/components/EnvChecker";
import { Navbar } from "@/components/Navbar";
import GeminiApiKeySetup from "@/components/GeminiApiKeySetup";
import { platformStats, filterOptions } from "@/data/warehouses";

export default function MLRecommendationsPage() {
  const {
    data,
    isLoading,
    error,
    refetch,
    preferences,
    setPreferences,
    customizeMode,
    setCustomizeMode,
    clearPreferences
  } = useSmartRecommendations();

  const recommendations = data?.items || [];
  const [activeTab, setActiveTab] = useState("recommendations");
  const [showInsights, setShowInsights] = useState(true);
  const [compareWarehouseIds, setCompareWarehouseIds] = useState<string[]>([]);

  // Toggle warehouse selection for comparison
  const toggleWarehouseComparison = (whId: string) => {
    if (compareWarehouseIds.includes(whId)) {
      setCompareWarehouseIds(compareWarehouseIds.filter(id => id !== whId));
    } else {
      if (compareWarehouseIds.length < 3) {
        setCompareWarehouseIds([...compareWarehouseIds, whId]);
      }
    }
  };

  // Helper to get color based on match score
  const getMatchScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600 bg-green-100";
    if (score >= 80) return "text-blue-600 bg-blue-100";
    if (score >= 70) return "text-orange-600 bg-orange-100";
    return "text-gray-600 bg-gray-100";
  };

  // Calculate statistics about recommendations
  const getRecommendationStats = () => {
    if (!recommendations || recommendations.length === 0) return null;
    
    const avgPrice = recommendations.reduce((sum, w) => sum + w.pricePerSqFt, 0) / recommendations.length;
    const avgSpace = recommendations.reduce((sum, w) => sum + w.totalAreaSqft, 0) / recommendations.length;
    const avgRating = recommendations.reduce((sum, w) => sum + w.rating, 0) / recommendations.length;
    const avgScore = recommendations.reduce((sum, w) => sum + w.matchScore, 0) / recommendations.length;
    const districtCount = new Set(recommendations.map(w => w.district)).size;
    
    return {
      avgPrice,
      avgSpace,
      avgRating,
      avgScore,
      districtCount,
      topScore: recommendations.length > 0 ? recommendations[0].matchScore : 0
    };
  };

  const stats = getRecommendationStats();
  
  return (
    <div className="min-h-screen bg-gradient-warehouse relative">
      <div className="bg-decoration"></div>
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <div className="mb-8 fade-in">
          <h1 className="text-3xl font-bold text-gradient-blue flex items-center gap-2">
            <Bot className="h-8 w-8 text-blue-600 pulse" />
            ML Warehouse Recommendations
          </h1>
          <p className="text-xl text-gray-600 mt-2">
            Personalized warehouse suggestions powered by our advanced machine learning algorithm
          </p>
        </div>
        
        {/* Main Tabs */}
        <Tabs defaultValue="recommendations" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex justify-between items-center bg-glass p-2 rounded-lg fade-in">
            <TabsList className="bg-white bg-opacity-70">
              <TabsTrigger value="recommendations" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Recommendations
              </TabsTrigger>
              <TabsTrigger value="insights" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                ML Insights
              </TabsTrigger>
              <TabsTrigger value="how-it-works" className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                How It Works
              </TabsTrigger>
            </TabsList>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCustomizeMode(true)}
                className="glow-input"
              >
                <Settings className="h-4 w-4 mr-2" />
                Customize
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetch()}
                disabled={isLoading}
                className="glow-input"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="default" size="sm" asChild className="button-glow">
                <Link to="/warehouses">
                  <Building2 className="h-4 w-4 mr-2" />
                  All Warehouses
                </Link>
              </Button>
            </div>
          </div>
          
          <TabsContent value="recommendations" className="space-y-6">
            {/* Gemini API Key Setup Guide */}
            <GeminiApiKeySetup />
            
            {/* Active Filters Summary */}
            {(preferences.district || preferences.targetPrice || preferences.minAreaSqft || preferences.preferredType) && (
              <Card className="bg-glass border-blue-100 shadow-soft card-professional">
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">Active Preferences:</span>
                      <div className="flex flex-wrap gap-2">
                        {preferences.district && (
                          <Badge variant="outline" className="bg-blue-50 border-blue-200">
                            <MapPin className="h-3 w-3 mr-1" />
                            {preferences.district}
                          </Badge>
                        )}
                        {preferences.targetPrice && (
                          <Badge variant="outline" className="bg-green-50 border-green-200">
                            <Zap className="h-3 w-3 mr-1" />
                            ₹{preferences.targetPrice}/sqft
                          </Badge>
                        )}
                        {preferences.minAreaSqft && (
                          <Badge variant="outline" className="bg-orange-50 border-orange-200">
                            <Target className="h-3 w-3 mr-1" />
                            {preferences.minAreaSqft.toLocaleString()} sqft min
                          </Badge>
                        )}
                        {preferences.preferredType && (
                          <Badge variant="outline" className="bg-purple-50 border-purple-200">
                            <Building2 className="h-3 w-3 mr-1" />
                            {preferences.preferredType}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div>
                      <Button variant="ghost" size="sm" onClick={clearPreferences} className="glow-input">
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Clear All
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Quick Stat Cards */}
            {stats && recommendations.length > 0 && showInsights && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-glass stats-card">
                  <CardContent className="p-4 flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-500">Best Match</p>
                      <p className="text-2xl font-bold text-gradient-green">{stats.topScore}%</p>
                    </div>
                    <Target className="h-8 w-8 text-green-600 opacity-20" />
                  </CardContent>
                </Card>
                <Card className="bg-glass stats-card">
                  <CardContent className="p-4 flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-500">Avg. Price</p>
                      <p className="text-2xl font-bold text-gradient-blue">₹{Math.round(stats.avgPrice)}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-blue-600 opacity-20" />
                  </CardContent>
                </Card>
                <Card className="bg-glass stats-card">
                  <CardContent className="p-4 flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-500">Avg. Rating</p>
                      <p className="text-2xl font-bold text-gradient-amber">{stats.avgRating.toFixed(1)}</p>
                    </div>
                    <Star className="h-8 w-8 text-amber-500 opacity-20" />
                  </CardContent>
                </Card>
                <Card className="bg-glass stats-card">
                  <CardContent className="p-4 flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-500">Found In</p>
                      <p className="text-2xl font-bold text-gradient-purple">{stats.districtCount} districts</p>
                    </div>
                    <MapPin className="h-8 w-8 text-purple-600 opacity-20" />
                  </CardContent>
                </Card>
              </div>
            )}
            
            {/* Main Recommendations */}
            <MLRecommendations />
            
            {/* Compare Selected */}
            {compareWarehouseIds.length > 0 && (
              <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg p-4 z-20">
                <div className="container mx-auto">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-blue-100">
                        {compareWarehouseIds.length} selected
                      </Badge>
                      <span className="text-sm font-medium">Compare warehouses</span>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setCompareWarehouseIds([])}
                      >
                        Clear
                      </Button>
                      <Button 
                        variant="default" 
                        size="sm" 
                        asChild
                        disabled={compareWarehouseIds.length < 2}
                      >
                        <Link to={`/compare?ids=${compareWarehouseIds.join(',')}`}>
                          Compare
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="insights" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Price Analysis */}
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                    Price Analysis
                  </CardTitle>
                  <CardDescription>
                    How your matched warehouses compare to market rates
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {stats && (
                    <>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Your average match: ₹{Math.round(stats.avgPrice)}/sqft</span>
                          <span>Market average: ₹{Math.round(platformStats.averagePrice)}/sqft</span>
                        </div>
                        <Progress 
                          value={stats.avgPrice <= platformStats.averagePrice 
                            ? (stats.avgPrice / platformStats.averagePrice) * 100
                            : 100} 
                          className="h-2" 
                        />
                        <p className="text-sm text-gray-600">
                          {stats.avgPrice < platformStats.averagePrice 
                            ? `Your matches are ${Math.round((1 - stats.avgPrice / platformStats.averagePrice) * 100)}% below market average!` 
                            : `Your matches are ${Math.round((stats.avgPrice / platformStats.averagePrice - 1) * 100)}% above market average.`}
                        </p>
                      </div>
                      
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <Brain className="h-4 w-4 text-purple-600" />
                          <span className="text-sm font-medium text-purple-600">ML Price Insight</span>
                        </div>
                        <p className="text-sm text-gray-700">
                          {preferences.targetPrice 
                            ? `Based on your target price of ₹${preferences.targetPrice}/sqft, we recommend focusing on warehouses in the ${
                                preferences.targetPrice < 5 ? "budget" : preferences.targetPrice < 8 ? "standard" : "premium"
                              } segment where you'll find the best value.`
                            : `Setting a target price will help our AI find warehouses that offer the best balance of quality and affordability for your needs.`
                          }
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Location Insights */}
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-green-600" />
                    Location Insights
                  </CardTitle>
                  <CardDescription>
                    Geographic analysis of your matched warehouses
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {stats && (
                    <>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Districts covered: {stats.districtCount}</span>
                          <span>Total available: {filterOptions.districts.length}</span>
                        </div>
                        <Progress 
                          value={(stats.districtCount / filterOptions.districts.length) * 100} 
                          className="h-2" 
                        />
                      </div>

                      {preferences.district && (
                        <div className="flex items-center gap-2 my-3">
                          <Badge variant="outline" className="bg-blue-50">Focused on {preferences.district}</Badge>
                          <span className="text-sm text-gray-600">
                            {recommendations.filter(w => w.district === preferences.district).length} direct matches
                          </span>
                        </div>
                      )}
                      
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <Brain className="h-4 w-4 text-purple-600" />
                          <span className="text-sm font-medium text-purple-600">ML Location Insight</span>
                        </div>
                        <p className="text-sm text-gray-700">
                          {preferences.district 
                            ? `${preferences.district} has ${
                                recommendations.filter(w => w.district === preferences.district).length > 5
                                ? "excellent warehouse availability"
                                : "limited warehouse availability"
                              }. Consider ${
                                recommendations.filter(w => w.district === preferences.district).length < 5
                                ? "expanding your search to nearby districts"
                                : "refining your search with more specific requirements"
                              } for optimal results.`
                            : "Specifying a district will help our AI find warehouses in your preferred location. Popular choices include Mumbai, Pune, and Nagpur."
                          }
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Comparison to Market */}
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-orange-600" />
                    Market Comparison
                  </CardTitle>
                  <CardDescription>
                    How your recommendations compare to market averages
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {stats && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <div className="text-sm text-gray-500">Average Size</div>
                          <div className="text-lg font-semibold">{Math.round(stats.avgSpace).toLocaleString()} sqft</div>
                          <div className="text-xs text-gray-500">
                            {stats.avgSpace > platformStats.totalArea / platformStats.totalWarehouses 
                              ? `${Math.round((stats.avgSpace / (platformStats.totalArea / platformStats.totalWarehouses) - 1) * 100)}% larger than average`
                              : `${Math.round((1 - stats.avgSpace / (platformStats.totalArea / platformStats.totalWarehouses)) * 100)}% smaller than average`
                            }
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-sm text-gray-500">Average Rating</div>
                          <div className="text-lg font-semibold flex items-center">
                            {stats.avgRating.toFixed(1)}
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 ml-1" />
                          </div>
                          <div className="text-xs text-gray-500">
                            {stats.avgRating > platformStats.averageRating
                              ? `${((stats.avgRating / platformStats.averageRating - 1) * 100).toFixed(1)}% higher than market`
                              : `${((1 - stats.avgRating / platformStats.averageRating) * 100).toFixed(1)}% lower than market`
                            }
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <Brain className="h-4 w-4 text-purple-600" />
                          <span className="text-sm font-medium text-purple-600">ML Market Insight</span>
                        </div>
                        <div className="space-y-2 text-sm text-gray-700">
                          <div className="flex items-start gap-2">
                            <ChevronRight className="h-4 w-4 text-green-500 mt-0.5" />
                            <p>
                              {stats.avgScore >= 85 
                                ? "Your preferences have excellent availability in the current market."
                                : stats.avgScore >= 75
                                ? "Your preferences have good availability in the current market."
                                : "Your preferences have limited matches in the current market."}
                            </p>
                          </div>
                          <div className="flex items-start gap-2">
                            <ChevronRight className="h-4 w-4 text-green-500 mt-0.5" />
                            <p>
                              {recommendations.length >= 10 
                                ? "Consider adding more specific requirements to narrow down your options."
                                : recommendations.length >= 5
                                ? "Your current filters provide a good balance of options."
                                : "Consider broadening your search criteria to see more options."}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recommendation Quality */}
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-5 w-5 text-purple-600" />
                    Match Quality
                  </CardTitle>
                  <CardDescription>
                    Analysis of your recommendation match scores
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {stats && recommendations.length > 0 && (
                    <>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Top match score</span>
                            <span className={getMatchScoreColor(stats.topScore)}>
                              {stats.topScore}%
                            </span>
                          </div>
                          <Progress 
                            value={stats.topScore} 
                            className="h-2" 
                          />
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Average match score</span>
                            <span className={getMatchScoreColor(stats.avgScore)}>
                              {Math.round(stats.avgScore)}%
                            </span>
                          </div>
                          <Progress 
                            value={stats.avgScore} 
                            className="h-2" 
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 my-3">
                        <div className="text-center p-2 bg-gray-50 rounded-lg">
                          <div className="text-xs text-gray-500">Excellent</div>
                          <div className="font-semibold">
                            {recommendations.filter(w => w.matchScore >= 90).length}
                          </div>
                          <div className="text-xs text-gray-500">90%+</div>
                        </div>
                        <div className="text-center p-2 bg-gray-50 rounded-lg">
                          <div className="text-xs text-gray-500">Good</div>
                          <div className="font-semibold">
                            {recommendations.filter(w => w.matchScore >= 80 && w.matchScore < 90).length}
                          </div>
                          <div className="text-xs text-gray-500">80-89%</div>
                        </div>
                        <div className="text-center p-2 bg-gray-50 rounded-lg">
                          <div className="text-xs text-gray-500">Fair</div>
                          <div className="font-semibold">
                            {recommendations.filter(w => w.matchScore < 80).length}
                          </div>
                          <div className="text-xs text-gray-500">&lt;80%</div>
                        </div>
                      </div>

                      <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <Brain className="h-4 w-4 text-purple-600" />
                          <span className="text-sm font-medium text-purple-600">ML Quality Insight</span>
                        </div>
                        <p className="text-sm text-gray-700">
                          {stats.topScore >= 90 
                            ? "You have excellent matches! Your top warehouse has 90%+ compatibility with your requirements."
                            : stats.topScore >= 80
                            ? "You have good matches. Consider adjusting your preferences slightly to find even better options."
                            : "Your match scores indicate limited compatibility. Try adjusting your preferences to find better matches."}
                          {recommendations.filter(w => w.matchScore >= 85).length >= 3
                            ? " We recommend focusing on the top 3 warehouses which all have excellent match scores."
                            : ""}
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap justify-center gap-4">
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Export Insights Report
              </Button>
              <Button variant="outline" className="gap-2">
                <Share className="h-4 w-4" />
                Share Results
              </Button>
              <Button variant="default" className="gap-2" onClick={() => setActiveTab("recommendations")}>
                <Building2 className="h-4 w-4" />
                View Recommendations
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="how-it-works" className="space-y-6">
            {/* System Diagnostics Card for Troubleshooting */}
            <Card className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2 text-amber-600" />
                  System Status
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-amber-800 mb-4">
                  If you're experiencing issues with recommendations or seeing empty results, use the diagnostic tool below to check connection status.
                </p>
                <EnvChecker />
              </CardContent>
            </Card>
            
            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Brain className="h-6 w-6 text-blue-600" />
                  How Our ML Recommendation System Works
                </CardTitle>
                <CardDescription>
                  Understanding the technology behind our personalized warehouse recommendations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Zap className="h-5 w-5 text-amber-500" />
                    Recommendation Algorithm
                  </h3>
                  <p>
                    Our recommendation engine uses a sophisticated weighted scoring system to find the perfect warehouse matches for your needs:
                  </p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium mb-3">Scoring Factors</h4>
                      <ul className="space-y-2">
                        <li className="flex justify-between">
                          <span className="text-sm">Location matching</span>
                          <Badge variant="outline">25%</Badge>
                        </li>
                        <li className="flex justify-between">
                          <span className="text-sm">Price optimization</span>
                          <Badge variant="outline">20%</Badge>
                        </li>
                        <li className="flex justify-between">
                          <span className="text-sm">Area requirements</span>
                          <Badge variant="outline">20%</Badge>
                        </li>
                        <li className="flex justify-between">
                          <span className="text-sm">Type preference</span>
                          <Badge variant="outline">15%</Badge>
                        </li>
                        <li className="flex justify-between">
                          <span className="text-sm">Availability</span>
                          <Badge variant="outline">15%</Badge>
                        </li>
                        <li className="flex justify-between">
                          <span className="text-sm">Quality rating</span>
                          <Badge variant="outline">5%</Badge>
                        </li>
                        <li className="flex justify-between">
                          <span className="text-sm">Verification bonus</span>
                          <Badge variant="outline">+10%</Badge>
                        </li>
                      </ul>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium mb-3">Match Score Interpretation</h4>
                      <ul className="space-y-3">
                        <li className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-green-500"></div>
                          <span className="text-sm font-medium">90-100%: Perfect Match</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                          <span className="text-sm font-medium">80-89%: Excellent Match</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                          <span className="text-sm font-medium">70-79%: Good Match</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                          <span className="text-sm font-medium">Below 70%: Fair Match</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Target className="h-5 w-5 text-green-600" />
                    Data Sources & Processing
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <p className="mb-3">
                        Our AI recommendation system analyzes over {platformStats.totalWarehouses.toLocaleString()} warehouses across {platformStats.districtsCount} districts in Maharashtra to find the best matches for your requirements.
                      </p>
                      <p>
                        The system leverages real-time data from our Supabase database and can generate recommendations in under 100ms, ensuring you get the most current warehouse information.
                      </p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Processing Pipeline</h4>
                      <ol className="space-y-2 list-decimal list-inside text-sm">
                        <li>Capture user preferences</li>
                        <li>Query warehouse database</li>
                        <li>Apply preference filtering</li>
                        <li>Score each warehouse</li>
                        <li>Sort by match score</li>
                        <li>Generate human-readable reasons</li>
                        <li>Return top recommendations</li>
                      </ol>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Settings className="h-5 w-5 text-blue-600" />
                    How to Get the Best Recommendations
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <div className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">1</div>
                        <div>
                          <h4 className="font-medium">Be Specific About Location</h4>
                          <p className="text-sm text-gray-600">
                            Choosing a specific district improves match quality by focusing on your preferred areas.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">2</div>
                        <div>
                          <h4 className="font-medium">Set a Realistic Budget</h4>
                          <p className="text-sm text-gray-600">
                            Including your target price per sqft helps find warehouses in your budget range.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">3</div>
                        <div>
                          <h4 className="font-medium">Specify Minimum Area</h4>
                          <p className="text-sm text-gray-600">
                            Adding your minimum space requirement ensures recommendations meet your storage needs.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <div className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">4</div>
                        <div>
                          <h4 className="font-medium">Choose Warehouse Type</h4>
                          <p className="text-sm text-gray-600">
                            Selecting a warehouse type helps find facilities optimized for your specific needs.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">5</div>
                        <div>
                          <h4 className="font-medium">Enable Quality Preferences</h4>
                          <p className="text-sm text-gray-600">
                            Toggle verified facilities and availability preferences to focus on higher quality options.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">6</div>
                        <div>
                          <h4 className="font-medium">Refine Iteratively</h4>
                          <p className="text-sm text-gray-600">
                            Start broad, then gradually refine your preferences based on the recommendations.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 p-6 rounded-lg mt-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-blue-100 p-2 rounded-full">
                      <Sparkles className="h-5 w-5 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-medium text-blue-800">Need Help?</h3>
                  </div>
                  <p className="text-blue-800 mb-4">
                    Our AI recommendation system is designed to help you find the perfect warehouse space for your business needs. If you need assistance or have questions, our support team is here to help.
                  </p>
                  <Button variant="default" className="gap-2" asChild>
                    <Link to="/contact">
                      <HelpCircle className="h-4 w-4" />
                      Contact Support
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Customization Modal */}
      <RecommendationCustomizer
        isOpen={customizeMode}
        preferences={preferences}
        onPreferencesChange={setPreferences}
        onClose={() => setCustomizeMode(false)}
      />
    </div>
  );
}
