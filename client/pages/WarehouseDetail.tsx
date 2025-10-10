import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Navbar } from "@/components/Navbar";
import InquiryModal from "@/components/InquiryModal";
import { warehouseService, type SupabaseWarehouse } from "@/services/warehouseService";
import { Building2, MapPin, Star, ArrowLeft, Share2, Heart, Phone, Mail, MessageSquare, CircleCheck as CheckCircle, Shield, Package, Factory, TrendingUp, DollarSign, ChevronLeft, ChevronRight } from "lucide-react";

export default function WarehouseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState(0);
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [warehouse, setWarehouse] = useState<SupabaseWarehouse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [similarWarehouses, setSimilarWarehouses] = useState<SupabaseWarehouse[]>([]);

  useEffect(() => {
    setSelectedImage(0);
    setShowAllAmenities(false);
    setIsFavorited(false);
    setShowInquiryModal(false);
    setSimilarWarehouses([]);
  }, [id]);

  useEffect(() => {
    const fetchWarehouse = async () => {
      console.log('🏭 WAREHOUSE DETAIL - VERSION 2.0');
      console.log('ID:', id);

      if (!id) {
        setError('No warehouse ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log('Fetching warehouse...');
        const result = await warehouseService.getWarehouseById(id);
        console.log('Result:', result);

        if (result.error || !result.data) {
          setError(result.error || 'Warehouse not found');
          setWarehouse(null);
        } else {
          console.log('✅ Loaded:', result.data.name);
          setWarehouse(result.data);
          setError(null);

          const similar = await warehouseService.getSimilarWarehouses(id, 3);
          setSimilarWarehouses(similar);
        }
      } catch (err) {
        console.error('Error fetching warehouse:', err);
        setError('Failed to load warehouse details');
        setWarehouse(null);
      } finally {
        setLoading(false);
      }
    };

    fetchWarehouse();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="container mx-auto px-4 py-12 flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md">
            <CardContent className="p-8 text-center">
              <Building2 className="h-12 w-12 text-blue-600 dark:text-blue-400 mx-auto mb-4 animate-pulse" />
              <p className="text-gray-600 dark:text-gray-300">Loading warehouse details...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !warehouse) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="container mx-auto px-4 py-12 flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <Building2 className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <CardTitle className="text-2xl">Warehouse Not Found</CardTitle>
              <CardDescription>
                {error || 'The warehouse you\'re looking for doesn\'t exist or has been removed.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center pb-6">
              <Button asChild>
                <Link to="/warehouses">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Warehouses
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const warehouseImages = warehouse.images && warehouse.images.length > 0
    ? warehouse.images
    : [
        "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&q=80",
        "https://images.unsplash.com/photo-1601980169411-4c0d37967c2e?w=800&q=80",
        "https://images.unsplash.com/photo-1553864250-05b20249ee6c?w=800&q=80",
        "https://images.unsplash.com/photo-1565610222536-ef2bdc4a7fd2?w=800&q=80"
      ];

  const safeOccupancy = Math.max(0, Math.min(100, (warehouse.occupancy || 0) * 100));
  const safeAvailableBlocks = Math.max(0, warehouse.available_blocks || 0);
  const safeTotalBlocks = Math.max(0, warehouse.total_blocks || 0);
  const safeAvailableArea = warehouse.total_area > 0
    ? Math.max(0, Math.floor(warehouse.total_area * (1 - (warehouse.occupancy || 0))))
    : 0;

  const warehouseAmenities = warehouse.amenities || [];
  const displayedAmenities = showAllAmenities
    ? warehouseAmenities
    : warehouseAmenities.slice(0, 8);

  const facilityManager = {
    name: warehouse.contact_person || `${warehouse.city || 'Unknown'} Facility Manager`,
    role: "Facility Manager",
    phone: warehouse.contact_phone || "+91 98765 43210",
    email: warehouse.contact_email || `contact@${(warehouse.city || 'warehouse').toLowerCase()}-warehouse.com`,
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&q=80",
    properties: Math.floor(Math.random() * 10) + 5,
    rating: warehouse.rating || 4.0
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />

      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <Link to="/" className="hover:text-blue-600 dark:hover:text-blue-400">Home</Link>
            <span>/</span>
            <Link to="/warehouses" className="hover:text-blue-600 dark:hover:text-blue-400">Warehouses</Link>
            <span>/</span>
            <span className="text-gray-900 dark:text-gray-100 font-medium">
              {warehouse.wh_id || warehouse.id.substring(0, 8)}
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Search
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-0">
                <div className="relative aspect-video bg-gray-200 dark:bg-gray-800">
                  <img
                    src={warehouseImages[selectedImage]}
                    alt={warehouse.name}
                    className="w-full h-full object-cover"
                  />
                  {warehouseImages.length > 1 && (
                    <>
                      <button
                        onClick={() => setSelectedImage((prev) => (prev - 1 + warehouseImages.length) % warehouseImages.length)}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 p-2 rounded-full shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <ChevronLeft className="h-6 w-6 text-gray-900 dark:text-gray-100" />
                      </button>
                      <button
                        onClick={() => setSelectedImage((prev) => (prev + 1) % warehouseImages.length)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 p-2 rounded-full shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <ChevronRight className="h-6 w-6 text-gray-900 dark:text-gray-100" />
                      </button>
                    </>
                  )}
                  <div className="absolute bottom-4 left-4 flex space-x-2">
                    {warehouse.status === 'available' && (
                      <Badge className="bg-green-600 text-white">Available</Badge>
                    )}
                    {warehouse.amenities.some(a => a.toLowerCase().includes('verified')) && (
                      <Badge className="bg-blue-600 text-white">
                        <Shield className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>
                </div>

                {warehouseImages.length > 1 && (
                  <div className="flex space-x-2 p-4 overflow-x-auto">
                    {warehouseImages.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedImage(idx)}
                        className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${
                          selectedImage === idx
                            ? 'border-blue-600'
                            : 'border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <img src={img} alt={`View ${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-2xl mb-2 text-gray-900 dark:text-gray-100">{warehouse.name}</CardTitle>
                    <div className="flex items-center text-gray-600 dark:text-gray-400 mb-3">
                      <MapPin className="h-4 w-4 mr-1" />
                      <span className="text-sm">
                        {warehouse.address}, {warehouse.city}, {warehouse.state} - {warehouse.pincode}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center">
                        <Star className="h-5 w-5 text-yellow-500 fill-current mr-1" />
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          {warehouse.rating.toFixed(1)}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
                          ({warehouse.reviews_count} reviews)
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setIsFavorited(!isFavorited)}
                    >
                      <Heart className={`h-5 w-5 ${isFavorited ? 'fill-red-500 text-red-500' : ''}`} />
                    </Button>
                    <Button variant="outline" size="icon">
                      <Share2 className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <Factory className="h-6 w-6 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {warehouse.total_area.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Total Sq Ft</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <Package className="h-6 w-6 text-green-600 dark:text-green-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {safeAvailableArea.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Available Sq Ft</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <DollarSign className="h-6 w-6 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      ₹{warehouse.price_per_sqft}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Per Sq Ft</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-orange-600 dark:text-orange-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {safeOccupancy.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Occupancy</div>
                  </div>
                </div>

                <Separator className="my-6" />

                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="w-full justify-start">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="amenities">Amenities</TabsTrigger>
                    <TabsTrigger value="location">Location</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-4 mt-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                        Description
                      </h3>
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        {warehouse.description || `Premium warehouse facility located in ${warehouse.city}, ${warehouse.state}. This ${warehouse.total_area.toLocaleString()} sq ft facility offers modern infrastructure and excellent connectivity. Perfect for logistics, storage, and distribution operations.`}
                      </p>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                        Key Features
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        {warehouse.features && warehouse.features.length > 0 ? (
                          warehouse.features.map((feature, idx) => (
                            <div key={idx} className="flex items-start">
                              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                              <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                            </div>
                          ))
                        ) : (
                          <>
                            <div className="flex items-start">
                              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mr-2 mt-0.5" />
                              <span className="text-sm text-gray-700 dark:text-gray-300">24/7 Security</span>
                            </div>
                            <div className="flex items-start">
                              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mr-2 mt-0.5" />
                              <span className="text-sm text-gray-700 dark:text-gray-300">CCTV Surveillance</span>
                            </div>
                            <div className="flex items-start">
                              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mr-2 mt-0.5" />
                              <span className="text-sm text-gray-700 dark:text-gray-300">Fire Safety Systems</span>
                            </div>
                            <div className="flex items-start">
                              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mr-2 mt-0.5" />
                              <span className="text-sm text-gray-700 dark:text-gray-300">Loading Docks</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                        Occupancy Status
                      </h3>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm text-gray-700 dark:text-gray-300">
                          <span>Current Occupancy</span>
                          <span className="font-semibold">{safeOccupancy.toFixed(1)}%</span>
                        </div>
                        <Progress value={safeOccupancy} className="h-2" />
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                          <span>
                            Available: {safeAvailableBlocks > 0 ? `${safeAvailableBlocks} blocks` : `${safeAvailableArea.toLocaleString()} sq ft`}
                          </span>
                          <span>
                            Total: {safeTotalBlocks > 0 ? `${safeTotalBlocks} blocks` : `${warehouse.total_area.toLocaleString()} sq ft`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="details" className="space-y-4 mt-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Warehouse ID</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {warehouse.wh_id || warehouse.id.substring(0, 8)}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Type</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {warehouse.features?.[0] || 'General Warehouse'}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                        <Badge variant={warehouse.status === 'available' ? 'default' : 'secondary'}>
                          {warehouse.status.charAt(0).toUpperCase() + warehouse.status.slice(1)}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Registration Date</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {new Date(warehouse.created_at).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Total Area</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {warehouse.total_area.toLocaleString()} sq ft
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Available Area</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {safeAvailableArea.toLocaleString()} sq ft
                        </p>
                      </div>
                      {safeTotalBlocks > 0 && (
                        <>
                          <div className="space-y-1">
                            <p className="text-sm text-gray-500 dark:text-gray-400">Total Blocks</p>
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                              {safeTotalBlocks}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm text-gray-500 dark:text-gray-400">Available Blocks</p>
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                              {safeAvailableBlocks}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="amenities" className="mt-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {displayedAmenities.map((amenity, idx) => (
                        <div
                          key={idx}
                          className="flex items-center space-x-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                        >
                          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{amenity}</span>
                        </div>
                      ))}
                    </div>
                    {warehouse.amenities.length > 8 && (
                      <Button
                        variant="outline"
                        className="w-full mt-4"
                        onClick={() => setShowAllAmenities(!showAllAmenities)}
                      >
                        {showAllAmenities ? 'Show Less' : `Show All ${warehouse.amenities.length} Amenities`}
                      </Button>
                    )}
                  </TabsContent>

                  <TabsContent value="location" className="mt-6">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Address</h3>
                        <p className="text-gray-700 dark:text-gray-300">
                          {warehouse.address}
                          <br />
                          {warehouse.city}, {warehouse.state} - {warehouse.pincode}
                        </p>
                      </div>
                      <div className="aspect-video bg-gray-200 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                        <MapPin className="h-12 w-12 text-gray-400 dark:text-gray-500" />
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl text-gray-900 dark:text-gray-100">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-4">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                    ₹{warehouse.price_per_sqft}/sq ft
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Monthly Rental</p>
                </div>
                <Button className="w-full" size="lg" onClick={() => setShowInquiryModal(true)}>
                  <MessageSquare className="mr-2 h-5 w-5" />
                  Send Inquiry
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="w-full">
                    <Phone className="mr-2 h-4 w-4" />
                    Call
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Mail className="mr-2 h-4 w-4" />
                    Email
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-gray-900 dark:text-gray-100">Facility Manager</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start space-x-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={facilityManager.avatar} />
                    <AvatarFallback>{facilityManager.name.substring(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                      {facilityManager.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{facilityManager.role}</p>
                    <div className="flex items-center mt-1">
                      <Star className="h-4 w-4 text-yellow-500 fill-current mr-1" />
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {facilityManager.rating.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
                <Separator className="my-4" />
                <div className="space-y-2 text-sm">
                  <div className="flex items-center text-gray-700 dark:text-gray-300">
                    <Phone className="h-4 w-4 mr-2 text-gray-400 dark:text-gray-500" />
                    {facilityManager.phone}
                  </div>
                  <div className="flex items-center text-gray-700 dark:text-gray-300">
                    <Mail className="h-4 w-4 mr-2 text-gray-400 dark:text-gray-500" />
                    {facilityManager.email}
                  </div>
                  <div className="flex items-center text-gray-700 dark:text-gray-300">
                    <Building2 className="h-4 w-4 mr-2 text-gray-400 dark:text-gray-500" />
                    {facilityManager.properties} Properties
                  </div>
                </div>
              </CardContent>
            </Card>

            {similarWarehouses.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg text-gray-900 dark:text-gray-100">Similar Properties</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {similarWarehouses.map((similar) => (
                    <Link
                      key={similar.id}
                      to={`/warehouses/${similar.id}`}
                      className="block group"
                    >
                      <div className="flex space-x-3">
                        <img
                          src={similar.images?.[0] || "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=200&q=80"}
                          alt={similar.name}
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                            {similar.name}
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            {similar.city}, {similar.state}
                          </p>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                              ₹{similar.price_per_sqft}/sq ft
                            </span>
                            <div className="flex items-center">
                              <Star className="h-3 w-3 text-yellow-500 fill-current mr-1" />
                              <span className="text-xs text-gray-600 dark:text-gray-400">
                                {similar.rating.toFixed(1)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {warehouse && (
        <InquiryModal
          isOpen={showInquiryModal}
          onClose={() => setShowInquiryModal(false)}
          warehouseName={warehouse.name}
          warehouseId={warehouse.id}
          warehouseLocation={`${warehouse.city}, ${warehouse.state}`}
          pricePerSqFt={warehouse.price_per_sqft}
          availableArea={safeAvailableArea}
          ownerName={facilityManager.name}
          ownerPhone={facilityManager.phone}
          ownerEmail={facilityManager.email}
        />
      )}
    </div>
  );
}
