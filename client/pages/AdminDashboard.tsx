import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Building2, Users, TrendingUp, DollarSign, BarChart3, 
  Settings, Shield, AlertCircle, CheckCircle, Clock,
  MapPin, Star, Eye, Edit, Trash, Filter, Search,
  UserCheck, UserX, FileText, Activity, Download,
  Flame, ExternalLink, Zap
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

// Modal Components
function WarehouseReviewModal({ 
  warehouse, 
  onApprove, 
  onReject, 
  loading 
}: { 
  warehouse: PendingWarehouse;
  onApprove: () => void;
  onReject: (reason: string) => void;
  loading: boolean;
}) {
  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Warehouse Details</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Name</Label>
            <p className="text-sm text-gray-600">{warehouse.name}</p>
          </div>
          <div>
            <Label>Location</Label>
            <p className="text-sm text-gray-600">{warehouse.address}, {warehouse.city}, {warehouse.state}</p>
          </div>
          <div>
            <Label>Area</Label>
            <p className="text-sm text-gray-600">{warehouse.total_area.toLocaleString()} sq ft</p>
          </div>
          <div>
            <Label>Price</Label>
            <p className="text-sm text-gray-600">₹{warehouse.price_per_sqft}/sq ft</p>
          </div>
        </div>
      </div>

      {/* Description */}
      <div>
        <Label>Description</Label>
        <p className="text-sm text-gray-600 mt-2">{warehouse.description}</p>
      </div>

      {/* Amenities & Features */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label>Amenities</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {warehouse.amenities.map((amenity, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {amenity}
              </Badge>
            ))}
          </div>
        </div>
        <div>
          <Label>Features</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {warehouse.features.map((feature, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {feature}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Images */}
      {warehouse.image_urls && warehouse.image_urls.length > 0 && (
        <div>
          <Label>Property Images</Label>
          <div className="grid grid-cols-3 gap-4 mt-2">
            {warehouse.image_urls.slice(0, 6).map((image, index) => (
              <img
                key={index}
                src={image}
                alt={`Property ${index + 1}`}
                className="w-full h-24 object-cover rounded border"
              />
            ))}
          </div>
        </div>
      )}

      {/* Document Validation */}
      <div>
        <Label>Document Verification</Label>
        <div className="space-y-4 mt-2">
          {/* GST Certificate */}
          {warehouse.document_urls?.gst_certificate && (
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  GST Certificate
                </h4>
                <Badge variant={warehouse.ocr_results?.gst_certificate?.is_valid ? "default" : "destructive"}>
                  {warehouse.ocr_results?.gst_certificate?.is_valid ? 'Valid' : 'Issues Found'}
                </Badge>
              </div>
              <div className="text-sm text-gray-600">
                <p>Confidence: {warehouse.ocr_results?.gst_certificate?.confidence ? (warehouse.ocr_results.gst_certificate.confidence * 100).toFixed(1) : 'N/A'}%</p>
                {warehouse.ocr_results?.gst_certificate?.anomalies && warehouse.ocr_results.gst_certificate.anomalies.length > 0 && (
                  <div className="mt-2">
                    <p className="font-medium text-red-600">Issues:</p>
                    <ul className="text-xs text-red-500 mt-1">
                      {warehouse.ocr_results.gst_certificate.anomalies.map((anomaly, i) => (
                        <li key={i}>• {anomaly}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <Button size="sm" variant="outline" className="mt-2" asChild>
                <a 
                  href={warehouse.document_urls.gst_certificate.includes('placeholder') ? '#' : warehouse.document_urls.gst_certificate} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    if (warehouse.document_urls?.gst_certificate?.includes('placeholder')) {
                      e.preventDefault();
                      alert('This is demo data. Real documents will be uploaded by warehouse owners when they submit properties.');
                    }
                  }}
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  {warehouse.document_urls.gst_certificate.includes('placeholder') ? 'Demo Document (Not Available)' : 'View GST Certificate'}
                </a>
              </Button>
            </div>
          )}

          {/* Property Papers */}
          {warehouse.document_urls?.property_papers && (
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  Property Papers
                </h4>
                <Badge variant={warehouse.ocr_results?.property_papers?.is_valid ? "default" : "destructive"}>
                  {warehouse.ocr_results?.property_papers?.is_valid ? 'Valid' : 'Issues Found'}
                </Badge>
              </div>
              <div className="text-sm text-gray-600">
                <p>Confidence: {warehouse.ocr_results?.property_papers?.confidence ? (warehouse.ocr_results.property_papers.confidence * 100).toFixed(1) : 'N/A'}%</p>
                {warehouse.ocr_results?.property_papers?.anomalies && warehouse.ocr_results.property_papers.anomalies.length > 0 && (
                  <div className="mt-2">
                    <p className="font-medium text-red-600">Issues:</p>
                    <ul className="text-xs text-red-500 mt-1">
                      {warehouse.ocr_results.property_papers.anomalies.map((anomaly, i) => (
                        <li key={i}>• {anomaly}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <Button size="sm" variant="outline" className="mt-2" asChild>
                <a href={warehouse.document_urls.property_papers} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  View Property Papers
                </a>
              </Button>
            </div>
          )}

          {/* Fire Safety Certificate */}
          {warehouse.document_urls?.fire_certificate && (
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium flex items-center">
                  <Flame className="h-4 w-4 mr-2" />
                  Fire Safety Certificate
                </h4>
                <Badge variant={warehouse.ocr_results?.fire_certificate?.is_valid ? "default" : "destructive"}>
                  {warehouse.ocr_results?.fire_certificate?.is_valid ? 'Valid' : 'Issues Found'}
                </Badge>
              </div>
              <div className="text-sm text-gray-600">
                <p>Confidence: {warehouse.ocr_results?.fire_certificate?.confidence ? (warehouse.ocr_results.fire_certificate.confidence * 100).toFixed(1) : 'N/A'}%</p>
                {warehouse.ocr_results?.fire_certificate?.anomalies && warehouse.ocr_results.fire_certificate.anomalies.length > 0 && (
                  <div className="mt-2">
                    <p className="font-medium text-red-600">Issues:</p>
                    <ul className="text-xs text-red-500 mt-1">
                      {warehouse.ocr_results.fire_certificate.anomalies.map((anomaly, i) => (
                        <li key={i}>• {anomaly}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <Button size="sm" variant="outline" className="mt-2" asChild>
                <a href={warehouse.document_urls.fire_certificate} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  View Fire Certificate
                </a>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4 pt-4 border-t">
        <Button 
          onClick={onApprove}
          disabled={loading}
          className="bg-green-600 hover:bg-green-700"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          {loading ? 'Approving...' : 'Approve Warehouse'}
        </Button>
        <Button 
          variant="destructive"
          disabled={loading}
          onClick={() => onReject('Document validation failed')}
        >
          <AlertCircle className="h-4 w-4 mr-2" />
          Reject
        </Button>
      </div>
    </div>
  );
}

function RejectWarehouseModal({ 
  warehouse, 
  onConfirm, 
  loading 
}: { 
  warehouse: PendingWarehouse;
  onConfirm: (reason: string) => void;
  loading: boolean;
}) {
  const [reason, setReason] = useState('');

  const commonReasons = [
    'Document verification failed',
    'Invalid property papers',
    'Fire safety certificate expired',
    'GST certificate invalid',
    'Location not suitable',
    'Pricing not competitive',
    'Other'
  ];

  return (
    <div className="space-y-4">
      <div>
        <Label>Rejection Reason</Label>
        <div className="flex flex-wrap gap-2 mt-2 mb-4">
          {commonReasons.map((commonReason) => (
            <Button
              key={commonReason}
              size="sm"
              variant={reason === commonReason ? "default" : "outline"}
              onClick={() => setReason(commonReason)}
            >
              {commonReason}
            </Button>
          ))}
        </div>
        <Textarea
          placeholder="Enter specific rejection reason..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
        />
      </div>
      
      <div className="flex gap-2 pt-4">
        <Button 
          variant="destructive"
          onClick={() => onConfirm(reason)}
          disabled={!reason || loading}
        >
          {loading ? 'Rejecting...' : 'Confirm Rejection'}
        </Button>
      </div>
    </div>
  );
}

interface AdminStats {
  totalUsers: number;
  totalWarehouses: number;
  pendingApprovals: number;
  monthlyRevenue: number;
  growthRate: number;
  activeUsers: number;
  verifiedWarehouses: number;
  totalInquiries: number;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  userType: 'owner' | 'seeker';
  status: 'active' | 'pending' | 'suspended';
  joinedDate: string;
  lastActive: string;
  totalBookings?: number;
  warehousesOwned?: number;
}

interface PendingWarehouse {
  id: string;
  name: string;
  description: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  total_area: string | number;
  price_per_sqft: string | number;
  amenities: string[];
  features: string[];
  image_urls: string[];
  document_urls?: {
    gst_certificate?: string;
    property_papers?: string;
    fire_certificate?: string;
  };
  documents?: {
    gst_certificate?: string;
    property_papers?: string;
    fire_certificate?: string;
    validation?: {
      gst_certificate?: { text: string; confidence: number; isValid: boolean; anomalies: string[] };
      property_papers?: { text: string; confidence: number; isValid: boolean; anomalies: string[] };
      fire_certificate?: { text: string; confidence: number; isValid: boolean; anomalies: string[] };
    };
  };
  ocr_results?: {
    gst_certificate?: { text: string; confidence: number; is_valid: boolean; anomalies: string[] };
    property_papers?: { text: string; confidence: number; is_valid: boolean; anomalies: string[] };
    fire_certificate?: { text: string; confidence: number; is_valid: boolean; anomalies: string[] };
  };
  owner_id: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  admin_notes?: string;
  rejection_reason?: string;
  // Joined data
  owner_name?: string;
  owner_email?: string;
  owner_phone?: string;
}

export default function AdminDashboard() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [pendingWarehouses, setPendingWarehouses] = useState<PendingWarehouse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<PendingWarehouse | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  // Real admin stats from Supabase
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalWarehouses: 0,
    pendingApprovals: 0,
    monthlyRevenue: 0,
    growthRate: 0,
    activeUsers: 0,
    verifiedWarehouses: 0,
    totalInquiries: 0
  });

  // Mock recent activity data
  const recentActivity = [
    {
      id: 1,
      type: 'approval',
      message: 'Warehouse approved - Prime Storage Hub, Gurgaon',
      timestamp: '2 hours ago',
      icon: CheckCircle,
      iconColor: 'text-green-600'
    },
    {
      id: 2,
      type: 'registration',
      message: 'New user registration - Storage Seeker from Mumbai',
      timestamp: '4 hours ago',
      icon: UserCheck,
      iconColor: 'text-blue-600'
    },
    {
      id: 3,
      type: 'payment',
      message: '₹45,000 booking payment confirmed',
      timestamp: '6 hours ago',
      icon: DollarSign,
      iconColor: 'text-green-600'
    },
    {
      id: 4,
      type: 'verification',
      message: 'Document verification pending - 3 warehouses awaiting review',
      timestamp: '8 hours ago',
      icon: FileText,
      iconColor: 'text-orange-600'
    }
  ];

  // Fetch real admin stats from Supabase
  const fetchAdminStats = async () => {
    try {
      console.log('📊 Fetching admin stats from Supabase...');
      
      // Fetch total users (using users table instead of profiles)
      const { count: totalUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      // Fetch total warehouses
      const { count: totalWarehouses } = await supabase
        .from('warehouses')
        .select('*', { count: 'exact', head: true });

      // Fetch pending approvals
      const { count: pendingApprovals } = await supabase
        .from('warehouse_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Fetch verified warehouses (check if is_verified column exists)
      const { count: verifiedWarehouses } = await supabase
        .from('warehouses')
        .select('*', { count: 'exact', head: true });

      // Calculate monthly revenue (approximate) - using correct column names
      const { data: revenueData } = await supabase
        .from('warehouses')
        .select('total_area, price_per_sqft');

      const monthlyRevenue = revenueData?.reduce((total, warehouse) => {
        const area = warehouse.total_area || 0;
        const price = warehouse.price_per_sqft || 0;
        const occupancy = 0.7; // Default occupancy rate
        return total + (area * price * occupancy);
      }, 0) || 0;

      // Calculate growth rate (mock for now)
      const growthRate = 12.5; // This would need historical data to calculate properly

      setStats({
        totalUsers: totalUsers || 0,
        totalWarehouses: totalWarehouses || 0,
        pendingApprovals: pendingApprovals || 0,
        monthlyRevenue: monthlyRevenue,
        growthRate: growthRate,
        activeUsers: Math.floor((totalUsers || 0) * 0.7), // Assume 70% are active
        verifiedWarehouses: verifiedWarehouses || 0,
        totalInquiries: Math.floor((totalWarehouses || 0) * 2.5) // Estimate based on warehouses
      });

      console.log('✅ Admin stats updated:', {
        totalUsers: totalUsers || 0,
        totalWarehouses: totalWarehouses || 0,
        pendingApprovals: pendingApprovals || 0,
        monthlyRevenue: monthlyRevenue
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    }
  };

  // Fetch real data from Supabase
  const fetchPendingWarehouses = async () => {
    try {
      console.log('📋 Loading submissions from Supabase for admin review');
      
      // Load from Supabase warehouse_submissions table (simplified query)
      const { data: submissions, error } = await supabase
        .from('warehouse_submissions')
        .select('*')
        .eq('status', 'pending')
        .order('submitted_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching submissions:', error);
        // Fallback to localStorage if Supabase fails
        const localSubmissions = JSON.parse(localStorage.getItem('demo-submissions') || '[]');
        const pendingSubmissions = localSubmissions.filter((sub: any) => sub.status === 'pending' || !sub.status);
        console.log(`Fallback: Found ${pendingSubmissions.length} pending submissions from localStorage`);
        setPendingWarehouses(pendingSubmissions);
        return;
      }
      
      // Transform data to match our interface (simplified since we don't have user join)
      const transformedData: PendingWarehouse[] = submissions?.map(submission => ({
        ...submission,
        owner_name: 'Demo Owner', // Default name since we don't have user data
        owner_email: 'demo.owner@example.com',
        owner_phone: '+91-9876543210'
      })) || [];
      
      console.log(`Found ${transformedData.length} pending submissions for admin review`);
      setPendingWarehouses(transformedData);
    } catch (error) {
      console.error('Error loading warehouse submissions:', error);
      setPendingWarehouses([]);
    }
  };

  // Mock user management data
  const users: AdminUser[] = [
    {
      id: '1',
      name: 'Rajesh Kumar',
      email: 'rajesh@example.com',
      userType: 'owner',
      status: 'active',
      joinedDate: '2024-01-15',
      lastActive: '2 hours ago',
      warehousesOwned: 3
    },
    {
      id: '2',
      name: 'Priya Sharma', 
      email: 'priya@example.com',
      userType: 'seeker',
      status: 'active',
      joinedDate: '2024-01-10',
      lastActive: '1 day ago',
      totalBookings: 5
    },
    {
      id: '3',
      name: 'Amit Patel',
      email: 'amit@example.com', 
      userType: 'owner',
      status: 'pending',
      joinedDate: '2024-01-18',
      lastActive: '5 hours ago',
      warehousesOwned: 1
    },
    {
      id: '4',
      name: 'Sunita Singh',
      email: 'sunita@example.com',
      userType: 'seeker',
      status: 'active',
      joinedDate: '2024-01-12',
      lastActive: '3 hours ago',
      totalBookings: 2
    }
  ];

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        fetchAdminStats(),
        fetchPendingWarehouses()
      ]);
      setLoading(false);
    };
    
    loadData();
    
    // Set up periodic refresh to check for new submissions
    const interval = setInterval(() => {
      fetchAdminStats();
      fetchPendingWarehouses();
    }, 10000); // Refresh every 10 seconds
    
    return () => clearInterval(interval);
  }, []);

  const handleApproveWarehouse = async (warehouseId: string) => {
    setReviewLoading(true);
    try {
      const warehouse = pendingWarehouses.find(w => w.id === warehouseId);
      if (!warehouse) return;

      // Update warehouse_submissions status in Supabase
      const { error: updateError } = await supabase
        .from('warehouse_submissions')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id || 'demo-admin',
          admin_notes: 'Approved after document verification'
        })
        .eq('id', warehouseId);

      if (updateError) {
        console.error('Error updating submission:', updateError);
        throw updateError;
      }

      console.log('✅ Warehouse approved:', warehouse.name);
      
      // Prefer a server-side approval endpoint that returns the created
      // warehouse id (the DB trigger will insert the row) so notifications
      // can link directly to the public warehouse listing.
      try {
        const resp = await fetch('/api/approve-submission', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ submissionId: warehouseId })
        });
        const json = await resp.json();
        const createdWarehouseId = json?.warehouseId || null;

        // Create notification for the owner using the returned id when available
        await supabase.from('notifications').insert({
          user_id: warehouse.owner_id,
          type: 'approval',
          title: 'Warehouse Approved! 🎉',
          message: `Your warehouse "${warehouse.name}" has been approved and is now visible to seekers.`,
          link: createdWarehouseId ? `/warehouses/${createdWarehouseId}` : `/warehouses`
        });
      } catch (err) {
        console.warn('Server-side approval endpoint failed, falling back to direct notification');
        await supabase.from('notifications').insert({
          user_id: warehouse.owner_id,
          type: 'approval',
          title: 'Warehouse Approved! 🎉',
          message: `Your warehouse "${warehouse.name}" has been approved and is now visible to seekers.`,
          link: `/warehouses`
        });
      }
      
      toast({
        title: "Warehouse Approved! 🎉",
        description: `${warehouse.name} has been approved and is now visible to seekers.`,
      });

      // Refresh data
      await Promise.all([
        fetchAdminStats(),
        fetchPendingWarehouses()
      ]);
    } catch (error) {
      console.error('Error approving warehouse:', error);
      const msg = (error && (error as any).message) ? (error as any).message : String(error);
      toast({
        title: "Approval Failed",
        description: `There was an error approving the warehouse: ${msg}`,
        variant: "destructive"
      });
    } finally {
      setReviewLoading(false);
    }
  };

  const handleRejectWarehouse = async (warehouseId: string, reason: string) => {
    setReviewLoading(true);
    try {
      const warehouse = pendingWarehouses.find(w => w.id === warehouseId);
      if (!warehouse) return;

      // Update warehouse_submissions status in Supabase
      const { error: updateError } = await supabase
        .from('warehouse_submissions')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id || 'demo-admin',
          rejection_reason: reason,
          admin_notes: `Rejected: ${reason}`
        })
        .eq('id', warehouseId);

      if (updateError) {
        console.error('Error updating submission:', updateError);
        throw updateError;
      }

      console.log('🚫 Warehouse rejected:', warehouse.name, 'Reason:', reason);
      
      // Create notification for the owner
      await supabase
        .from('notifications')
        .insert({
          user_id: warehouse.owner_id,
          type: 'rejection',
          title: 'Warehouse Rejected ❌',
          message: `Your warehouse "${warehouse.name}" has been rejected. Reason: ${reason}`,
          link: `/list-property`
        });
      
      toast({
        title: "Warehouse Rejected ❌",
        description: `${warehouse.name} has been rejected. Reason: ${reason}`,
      });

      // Refresh data
      await Promise.all([
        fetchAdminStats(),
        fetchPendingWarehouses()
      ]);
    } catch (error) {
      console.error('Error rejecting warehouse:', error);
      toast({
        title: "Rejection Failed",
        description: "There was an error rejecting the warehouse. Please try again.",
        variant: "destructive"
      });
    } finally {
      setReviewLoading(false);
    }
  };

  const handleUserStatusChange = (userId: string, newStatus: 'active' | 'suspended') => {
    console.log('Changing user status:', userId, newStatus);
    // TODO: Implement actual user status change logic
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading admin dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Admin Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage users, warehouses, and platform operations
          </p>
        </div>

        {/* Admin Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card className="bg-white dark:bg-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.totalUsers.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <Building2 className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Warehouses</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.totalWarehouses}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Pending Approvals</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.pendingApprovals}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <DollarSign className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Revenue</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    ₹{(stats.monthlyRevenue / 100000).toFixed(1)}L
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-indigo-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Growth</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    +{stats.growthRate}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 mb-8 bg-white dark:bg-gray-800 p-1 rounded-lg">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="warehouse-approvals" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Warehouse Approvals
            </TabsTrigger>
            <TabsTrigger value="user-management" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              User Management
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Recent Activity
                  </CardTitle>
                  <CardDescription>Latest platform activities and updates</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <activity.icon className={`h-5 w-5 ${activity.iconColor} mt-0.5`} />
                        <div className="flex-1">
                          <p className="text-sm text-gray-900 dark:text-white">{activity.message}</p>
                          <p className="text-xs text-gray-500 mt-1">{activity.timestamp}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Common administrative tasks</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      className="h-20 bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => setActiveTab('warehouse-approvals')}
                    >
                      <div className="text-center">
                        <Shield className="h-6 w-6 mx-auto mb-1" />
                        <div className="text-sm">Verify Documents</div>
                      </div>
                    </Button>
                    <Button 
                      className="h-20 bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => toast({ title: "Feature Coming Soon", description: "Report generation will be available in the next update." })}
                    >
                      <div className="text-center">
                        <FileText className="h-6 w-6 mx-auto mb-1" />
                        <div className="text-sm">Generate Reports</div>
                      </div>
                    </Button>
                    <Button 
                      className="h-20 bg-purple-600 hover:bg-purple-700 text-white"
                      onClick={() => setActiveTab('user-management')}
                    >
                      <div className="text-center">
                        <Users className="h-6 w-6 mx-auto mb-1" />
                        <div className="text-sm">Manage Users</div>
                      </div>
                    </Button>
                    <Button 
                      className="h-20 bg-orange-600 hover:bg-orange-700 text-white"
                      onClick={() => toast({ title: "Feature Coming Soon", description: "System settings will be available in the next update." })}
                    >
                      <div className="text-center">
                        <Settings className="h-6 w-6 mx-auto mb-1" />
                        <div className="text-sm">System Settings</div>
                      </div>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Warehouse Approvals Tab */}
          <TabsContent value="warehouse-approvals" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Pending Warehouse Approvals</CardTitle>
                    <CardDescription>Review and approve warehouse listings</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Filter className="h-4 w-4 mr-2" />
                      Filter
                    </Button>
                    <Button variant="outline" size="sm">
                      <FileText className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pendingWarehouses.map((warehouse) => (
                    <div key={warehouse.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">{warehouse.name}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />
                            {warehouse.city}, {warehouse.state}
                          </p>
                        </div>
                        <Badge variant="secondary">Pending</Badge>
                      </div>
                      
                      <div className="grid md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-gray-500">Owner</p>
                          <p className="font-medium">{warehouse.owner_name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Area</p>
                          <p className="font-medium">{warehouse.total_area.toLocaleString()} sq ft</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Price</p>
                          <p className="font-medium">₹{warehouse.price_per_sqft}/sq ft</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Submitted</p>
                          <p className="font-medium">{new Date(warehouse.submitted_at).toLocaleDateString()}</p>
                        </div>
                      </div>

                      <div className="mb-4">
                        <p className="text-xs text-gray-500 mb-2">Documents & Validation:</p>
                        <div className="flex gap-2 flex-wrap">
                          {warehouse.document_urls?.gst_certificate && (
                            <Badge 
                              variant={warehouse.ocr_results?.gst_certificate?.is_valid ? "default" : "destructive"} 
                              className="text-xs"
                            >
                              GST Certificate {warehouse.ocr_results?.gst_certificate?.is_valid ? '✓' : '✗'}
                            </Badge>
                          )}
                          {warehouse.document_urls?.property_papers && (
                            <Badge 
                              variant={warehouse.ocr_results?.property_papers?.is_valid ? "default" : "destructive"} 
                              className="text-xs"
                            >
                              Property Papers {warehouse.ocr_results?.property_papers?.is_valid ? '✓' : '✗'}
                            </Badge>
                          )}
                          {warehouse.document_urls?.fire_certificate && (
                            <Badge 
                              variant={warehouse.ocr_results?.fire_certificate?.is_valid ? "default" : "destructive"} 
                              className="text-xs"
                            >
                              Fire Certificate {warehouse.ocr_results?.fire_certificate?.is_valid ? '✓' : '✗'}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" onClick={() => setSelectedWarehouse(warehouse)}>
                              <Eye className="h-4 w-4 mr-1" />
                              Review
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Review Warehouse Submission</DialogTitle>
                            </DialogHeader>
                            {selectedWarehouse && (
                              <WarehouseReviewModal 
                                warehouse={selectedWarehouse}
                                onApprove={() => handleApproveWarehouse(selectedWarehouse.id)}
                                onReject={(reason) => handleRejectWarehouse(selectedWarehouse.id, reason)}
                                loading={reviewLoading}
                              />
                            )}
                          </DialogContent>
                        </Dialog>
                        <Button 
                          size="sm" 
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleApproveWarehouse(warehouse.id)}
                          disabled={reviewLoading}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              disabled={reviewLoading}
                            >
                              <AlertCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Reject Warehouse</DialogTitle>
                            </DialogHeader>
                            <RejectWarehouseModal 
                              warehouse={warehouse}
                              onConfirm={(reason) => handleRejectWarehouse(warehouse.id, reason)}
                              loading={reviewLoading}
                            />
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* User Management Tab */}
          <TabsContent value="user-management" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>Manage user accounts and verification status</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                      <Input
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-64"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                          <span className="font-semibold text-blue-600">
                            {user.name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">{user.name}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{user.email}</p>
                          <p className="text-xs text-gray-500">
                            {user.userType === 'owner' ? 'Warehouse Owner' : 'Storage Seeker'} • 
                            Joined {user.joinedDate} • Last active {user.lastActive}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <Badge 
                            variant={user.status === 'active' ? 'default' : user.status === 'pending' ? 'secondary' : 'destructive'}
                          >
                            {user.status}
                          </Badge>
                          <p className="text-xs text-gray-500 mt-1">
                            {user.userType === 'owner' ? `${user.warehousesOwned} warehouses` : `${user.totalBookings} bookings`}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {user.status === 'pending' && (
                            <Button 
                              size="sm" 
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleUserStatusChange(user.id, 'active')}
                            >
                              <UserCheck className="h-4 w-4" />
                            </Button>
                          )}
                          {user.status === 'active' && (
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => handleUserStatusChange(user.id, 'suspended')}
                            >
                              <UserX className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Analytics</CardTitle>
                  <CardDescription>Monthly revenue trends</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">Revenue chart will be implemented here</p>
                      <p className="text-sm text-gray-400">Integration with Chart.js or Recharts</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>User Growth</CardTitle>
                  <CardDescription>User registration trends</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                    <div className="text-center">
                      <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">User growth chart will be implemented here</p>
                      <p className="text-sm text-gray-400">Integration with Chart.js or Recharts</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
