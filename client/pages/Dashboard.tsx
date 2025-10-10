import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building2, Plus, Eye, MessageSquare, Calendar, TrendingUp, Users, MapPin, Star, ChartBar as BarChart3, DollarSign, Clock, Settings, Bell, Heart, Search, Filter, ArrowRight, LogOut, CircleAlert as AlertCircle, Upload, Loader, Bot } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useWarehouse } from "../contexts/WarehouseContext";
import { warehouseService, type SupabaseWarehouse } from "@/services/warehouseService";
import { useSmartRecommendations } from "@/hooks/use-recommendations";
import { useToast } from "@/hooks/use-toast";
import { Navbar } from "@/components/Navbar";
import AdminDashboard from "./AdminDashboard";
import ProfileCard from "@/components/ui/ProfileCard";
import { supabase } from "@/lib/supabase";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, profile, signOut, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  console.log('📊 DASHBOARD LOADED - VERSION 4.0');
  console.log('User:', user?.email);
  console.log('Profile type:', profile?.user_type);
  
  // Always initialize hooks first - never return early before hooks
  const [activeTab, setActiveTab] = useState('overview');
  const [warehouses, setWarehouses] = useState<SupabaseWarehouse[]>([]);
  const [ownerWarehouses, setOwnerWarehouses] = useState<SupabaseWarehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProperties: 0,
    totalInquiries: 0,
    monthlyRevenue: 0,
    occupancyRate: 0,
    avgRating: 4.7,
    savedProperties: 0,
    activeSearches: 0,
    inquiriesSent: 0,
    responseRate: 85,
    totalWarehouses: 0
  });
  
  // AI recommendations - always call hooks
  const { 
    data: recommendationsData, 
    isLoading: isLoadingRecommendations 
  } = useSmartRecommendations();

  // Check if user is admin after all hooks are initialized
  const isAdmin = user?.email?.includes('admin') || profile?.user_type === 'admin';
  
  // If admin, show admin dashboard after hooks
  if (isAdmin) {
    console.log('✅ Showing AdminDashboard');
    return <AdminDashboard />;
  }
  
  console.log('✅ Showing', profile?.user_type === 'owner' ? 'Owner' : 'Seeker', 'Dashboard');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', { replace: true });
      return;
    }

    if (user && profile) {
      loadDashboardData();
    }
  }, [user, profile, authLoading, navigate]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      if (profile?.user_type === 'owner') {
        // Load owner's submitted warehouses from Supabase
        const { data: submissions, error } = await supabase
          .from('warehouse_submissions')
          .select('*')
          .eq('owner_id', user.id)
          .order('submitted_at', { ascending: false });

        if (error) {
          console.error('Error fetching owner submissions:', error);
          // Fallback to localStorage for demo
          const localSubmissions = JSON.parse(localStorage.getItem('demo-submissions') || '[]');
          const ownerSubmissions = localSubmissions.filter((sub: any) => sub.owner_id === user.id);
          
          setStats({
            totalProperties: ownerSubmissions.length,
            totalInquiries: ownerSubmissions.length * 3,
            monthlyRevenue: ownerSubmissions.length * 50000,
            occupancyRate: 78,
            avgRating: 4.7,
            savedProperties: 0,
            activeSearches: 0,
            inquiriesSent: 0,
            responseRate: 85,
            totalWarehouses: 8993
          });

          const ownerWarehouses = ownerSubmissions.map((sub: any) => ({
            id: sub.id,
            name: sub.name,
            description: sub.description,
            address: sub.address,
            city: sub.city,
            state: sub.state,
            pincode: sub.pincode,
            total_area: parseInt(sub.total_area) || 0,
            price_per_sqft: parseInt(sub.price_per_sqft) || 0,
            amenities: sub.amenities || [],
            features: sub.features || [],
            images: sub.image_urls || [],
            status: sub.status || 'pending',
            created_at: sub.submitted_at,
            owner_id: sub.owner_id,
            occupancy: 22,
            // Add required SupabaseWarehouse fields
            latitude: 0,
            longitude: 0,
            rating: 4.5,
            reviews_count: 0,
            total_blocks: 1,
            available_blocks: 1,
            grid_rows: 1,
            grid_cols: 1,
            updated_at: new Date().toISOString()
          }));
          
          setOwnerWarehouses(ownerWarehouses);
        } else {
          // Use Supabase data
          const ownerSubmissions = submissions || [];
          
          setStats({
            totalProperties: ownerSubmissions.length,
            totalInquiries: ownerSubmissions.length * 3,
            monthlyRevenue: ownerSubmissions.length * 50000,
            occupancyRate: 78,
            avgRating: 4.7,
            savedProperties: 0,
            activeSearches: 0,
            inquiriesSent: 0,
            responseRate: 85,
            totalWarehouses: 8993
          });

          // Convert Supabase submissions to warehouse format for display
          const ownerWarehouses = ownerSubmissions.map((sub: any) => ({
            id: sub.id,
            name: sub.name,
            description: sub.description,
            address: sub.address,
            city: sub.city,
            state: sub.state,
            pincode: sub.pincode,
            total_area: sub.total_area || 0,
            price_per_sqft: sub.price_per_sqft || 0,
            amenities: sub.amenities || [],
            features: sub.features || [],
            images: sub.image_urls || [],
            status: sub.status || 'pending',
            created_at: sub.submitted_at,
            owner_id: sub.owner_id,
            occupancy: 22,
            // Add required SupabaseWarehouse fields
            latitude: 0,
            longitude: 0,
            rating: 4.5,
            reviews_count: 0,
            total_blocks: 1,
            available_blocks: 1,
            grid_rows: 1,
            grid_cols: 1,
            updated_at: new Date().toISOString()
          }));
          
          setOwnerWarehouses(ownerWarehouses);
        }
      } else {
        // Seeker mock stats
        setStats({
          totalProperties: 0,
          totalInquiries: 0,
          monthlyRevenue: 0,
          occupancyRate: 0,
          avgRating: 4.7,
          savedProperties: 8,
          activeSearches: 3,
          inquiriesSent: 12,
          responseRate: 85,
          totalWarehouses: 8993
        });
        setWarehouses([]);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: "Error loading data",
        description: "Could not load dashboard data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await signOut();
      if (error) {
        toast({
          title: "Error signing out",
          description: error.message,
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Signed out successfully",
        description: "You have been signed out of your account",
      });
      
      navigate('/', { replace: true });
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Building2 className="h-12 w-12 text-blue-600 dark:text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please sign in to access your dashboard.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const isOwner = profile.user_type === 'owner';

  const OwnerDashboard = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Properties</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalProperties}</p>
              </div>
              <Building2 className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Monthly Revenue</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">₹{(stats.monthlyRevenue / 100000).toFixed(1)}L</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">New Inquiries</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalInquiries}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Occupancy Rate</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.occupancyRate}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-600" />
            </div>
            <Progress value={stats.occupancyRate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Properties Performance */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Your Properties</CardTitle>
            <Button asChild>
              <Link to="/list-property">
                <Plus className="mr-2 h-4 w-4" />
                Add Property
              </Link>
            </Button>
          </div>
          <CardDescription>Active warehouse listings and performance</CardDescription>
        </CardHeader>
        <CardContent>
          {!loading && ownerWarehouses.length > 0 ? (
            <div className="space-y-4">
              {ownerWarehouses.map((property) => (
                <div key={property.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-200">
                    <img 
                      src={(property.images && property.images.length > 0)
                        ? property.images[0]
                        : "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=200&h=200&fit=crop&crop=center"}
                      alt={property.name || "Warehouse"}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=200&h=200&fit=crop&crop=center";
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{property.name || `Warehouse in ${property.city}`}</h4>
                    <p className="text-sm text-gray-600 flex items-center">
                      <MapPin className="h-3 w-3 mr-1" />
                      {property.city}, {property.state}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center space-x-4 text-sm">
                        <span className="text-green-600 font-medium">
                          {Math.floor(property.total_area * (1 - property.occupancy/100)).toLocaleString()} sq ft available
                        </span>
                        <span className="text-gray-500">
                          ₹{property.price_per_sqft}/sq ft
                        </span>
                      </div>
                      <Badge variant={property.status === 'approved' ? "default" : property.status === 'rejected' ? "destructive" : "secondary"}>
                        {property.status === 'approved' ? 'Approved' : property.status === 'rejected' ? 'Rejected' : 'Pending'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <Button size="sm" variant="outline" asChild>
                      <Link to={property.status === 'approved' ? `/warehouses/${property.id}` : `/submission/${property.id}`}>
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Link>
                    </Button>
                    <Button size="sm" variant="ghost">
                      <Settings className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : loading ? (
            <div className="text-center py-12">
              <Loader className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading your properties...</p>
            </div>
          ) : (
            <div className="text-center py-12">
              <Building2 className="h-16 w-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Properties Listed</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">Start by listing your first warehouse property</p>
              <Button asChild>
                <Link to="/list-property">
                  <Plus className="mr-2 h-4 w-4" />
                  List Your Property
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CSV Upload Section for Owners */}
      <Card>
        <CardHeader>
          <CardTitle>Bulk Import Warehouses</CardTitle>
          <CardDescription>Upload warehouse data from CSV file (Coming Soon)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Upload className="h-12 w-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-300 mb-4">Bulk import feature will be available soon</p>
            <Button variant="outline" disabled>
              <Upload className="mr-2 h-4 w-4" />
              Upload CSV
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const SeekerDashboard = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Available Warehouses</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{warehouses.length.toLocaleString()}</p>
              </div>
              <Building2 className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Saved Properties</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.savedProperties}</p>
              </div>
              <Heart className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Active Searches</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.activeSearches}</p>
              </div>
              <Search className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Inquiries Sent</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.inquiriesSent}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Available Warehouses Preview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Available Warehouses ({warehouses.length.toLocaleString()})</CardTitle>
            <Button asChild>
              <Link to="/warehouses">
                <Search className="mr-2 h-4 w-4" />
                Browse All
              </Link>
            </Button>
          </div>
          <CardDescription>Warehouses from Maharashtra dataset</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Show ML recommendations if available, otherwise show regular warehouses */}
          {!loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Display either ML recommendations or regular warehouses */}
              {recommendationsData && recommendationsData.items && recommendationsData.items.length > 0 ? (
                // Show ML recommendations
                recommendationsData.items.slice(0, 6).map((item) => (
                  <div key={item.whId} className="border rounded-lg p-4 hover:border-blue-300 transition-colors">
                    <div className="aspect-video rounded-lg overflow-hidden mb-3 bg-gray-200 relative">
                      <img
                        src={item.image || "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400&h=240&fit=crop&crop=center"}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                      <Badge className="absolute top-2 left-2 bg-blue-600 text-white">
                        <Bot className="w-3 h-3 mr-1" />
                        ML Match: {item.matchScore}%
                      </Badge>
                    </div>
                    <h4 className="font-medium mb-1">{item.name}</h4>
                    <p className="text-sm text-gray-600 flex items-center mb-2">
                      <MapPin className="h-3 w-3 mr-1" />
                      {item.location}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-blue-600">₹{item.pricePerSqFt}/sq ft</span>
                      <Button size="sm" asChild>
                        <Link to={`/warehouses/${item.whId}`}>View Details</Link>
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {item.totalAreaSqft?.toLocaleString()} sq ft • {item.type}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center space-x-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs">{item.rating} ({item.reviews})</span>
                      </div>
                      {item.reasons && item.reasons.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {item.reasons[0].label}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                // Show regular warehouses
                warehouses.slice(0, 6).map((warehouse) => (
                  <div key={warehouse.id} className="border rounded-lg p-4 hover:border-blue-300 transition-colors">
                    <div className="aspect-video rounded-lg overflow-hidden mb-3 bg-gray-200">
                      <img 
                        src={(warehouse.images && warehouse.images.length > 0) 
                          ? warehouse.images[0] 
                          : "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400&h=240&fit=crop&crop=center"}
                        alt={warehouse.name || "Warehouse"}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400&h=240&fit=crop&crop=center";
                        }}
                      />
                    </div>
                    <h4 className="font-medium mb-1">{warehouse.name || `Warehouse in ${warehouse.city}`}</h4>
                    <p className="text-sm text-gray-600 flex items-center mb-2">
                      <MapPin className="h-3 w-3 mr-1" />
                      {warehouse.city}, {warehouse.state}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-blue-600">₹{warehouse.price_per_sqft}/sq ft</span>
                      <Button size="sm" asChild>
                        <Link to={`/warehouses/${warehouse.id}`}>View Details</Link>
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {warehouse.total_area?.toLocaleString()} sq ft • {warehouse.description?.split(' ')[0] || "General Storage"}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center space-x-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs">{warehouse.rating} ({warehouse.reviews_count})</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {warehouse.amenities?.includes('Verified') ? 'Verified' : 'New'}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Loading Warehouses...</h3>
              <p className="text-gray-600 mb-6">Finding the best warehouse options for you</p>
              <Button onClick={loadDashboardData}>
                <Search className="mr-2 h-4 w-4" />
                Refresh Listings
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* User Quick Actions */}
      <div className="bg-card border-b px-4">
        <div className="container mx-auto flex justify-end items-center h-12">
          <Button variant="ghost" size="sm">
            <Bell className="h-4 w-4" />
          </Button>
          <Avatar className="h-8 w-8 mx-2">
            <AvatarFallback>
              {profile.name.split(' ').map(n => n[0]).join('').toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Profile Card Section */}
        {!isOwner && (
          <div className="mb-8 flex justify-center">
            <div className="max-w-sm">
              <ProfileCard
                name={profile.name}
                title={profile.user_type === 'owner' ? 'Property Owner' : 'Warehouse Seeker'}
                handle={user?.email?.split('@')[0] || 'user'}
                status="Active"
                contactText="View Profile"
                avatarUrl="https://images.pexels.com/photos/3777943/pexels-photo-3777943.jpeg?auto=compress&cs=tinysrgb&w=400"
                showUserInfo={true}
                enableTilt={false}
                enableMobileTilt={false}
                showBehindGradient={false}
                onContactClick={() => {}}
              />
            </div>
          </div>
        )}

        {/* Page Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Welcome, {profile.name}
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              {isOwner
                ? 'Manage your warehouse properties and track performance'
                : 'Find and book warehouse spaces for your business'
              } • {profile.user_type === 'owner' ? 'Property Owner' : 'Space Seeker'}
            </p>
          </div>
          <div className="flex space-x-3">
            {isOwner ? (
              <Button asChild>
                <Link to="/list-property">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Property
                </Link>
              </Button>
            ) : (
              <>
                <Button variant="outline" asChild>
                  <Link to="/ml-recommendations">
                    <Bot className="mr-2 h-4 w-4" />
                    ML Recommendations
                  </Link>
                </Button>
                <Button asChild>
                  <Link to="/warehouses">
                    <Search className="mr-2 h-4 w-4" />
                    Find Warehouses
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Dashboard Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value={isOwner ? 'properties' : 'saved'}>
              {isOwner ? 'Properties' : 'Saved'}
            </TabsTrigger>
            <TabsTrigger value={isOwner ? 'inquiries' : 'activity'}>
              {isOwner ? 'Inquiries' : 'Activity'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            {isOwner ? <OwnerDashboard /> : <SeekerDashboard />}
          </TabsContent>

          <TabsContent value={isOwner ? 'properties' : 'saved'} className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  {isOwner ? 'Property Management' : 'Saved Properties'}
                </CardTitle>
                <CardDescription>
                  {isOwner 
                    ? 'Detailed management tools for your warehouse listings'
                    : 'Properties you have bookmarked for future reference'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Building2 className="h-16 w-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Advanced Features Coming Soon
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-6">
                    Enhanced property management tools are in development
                  </p>
                  <Button asChild>
                    <Link to={isOwner ? '/list-property' : '/warehouses'}>
                      {isOwner ? 'Add Property' : 'Browse Warehouses'}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value={isOwner ? 'inquiries' : 'activity'} className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  {isOwner ? 'Inquiries & Messages' : 'Activity & Communications'}
                </CardTitle>
                <CardDescription>
                  {isOwner 
                    ? 'Manage tenant inquiries and communications'
                    : 'Track your inquiries and communications with property owners'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <MessageSquare className="h-16 w-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Communication Hub Coming Soon
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-6">
                    Advanced messaging and inquiry management features are in development
                  </p>
                  <Button variant="outline">
                    <Bell className="mr-2 h-4 w-4" />
                    Set Up Notifications
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
