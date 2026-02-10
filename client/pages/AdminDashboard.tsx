import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseClient';
import { getPendingVerifications, getAdminNotifications } from '../services/verificationService';
import { Navbar } from '../components/Navbar';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Link } from 'react-router-dom';
import { isDemoSession } from '../services/demoAuth';
import {
  Users,
  Warehouse,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Bell,
  FileText,
  ShieldCheck,
  RefreshCw,
  Eye
} from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  totalWarehouses: number;
  pendingVerifications: number;
  pendingWarehouseSubmissions: number;
  totalBookings: number;
  totalRevenue: number;
  seekerCount: number;
  ownerCount: number;
  pendingBookings: number;
  approvedBookings: number;
  totalStorageSqft: number;
  occupiedStorageSqft: number;
  availableStorageSqft: number;
}

interface RecentActivity {
  id: string;
  type: string;
  message: string;
  timestamp: string;
}

export default function AdminDashboard() {
  const { user, profile } = useAuth();
  const demoMode = isDemoSession();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalWarehouses: 0,
    pendingVerifications: 0,
    pendingWarehouseSubmissions: 0,
    totalBookings: 0,
    totalRevenue: 0,
    seekerCount: 0,
    ownerCount: 0,
    pendingBookings: 0,
    approvedBookings: 0,
    totalStorageSqft: 0,
    occupiedStorageSqft: 0,
    availableStorageSqft: 0
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [bookingTrend, setBookingTrend] = useState<Array<{ label: string; count: number }>>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      if (isDemoSession()) {
        const trend: Array<{ label: string; count: number }> = [];
        for (let i = 5; i >= 0; i--) {
          const start = new Date();
          start.setDate(1);
          start.setMonth(start.getMonth() - i);
          start.setHours(0, 0, 0, 0);
          trend.push({
            label: start.toLocaleDateString('en-IN', { month: 'short' }),
            count: 0
          });
        }

        setBookingTrend(trend);
        setStats({
          totalUsers: 0,
          totalWarehouses: 0,
          pendingVerifications: 0,
          pendingWarehouseSubmissions: 0,
          totalBookings: 0,
          totalRevenue: 0,
          seekerCount: 0,
          ownerCount: 0,
          pendingBookings: 0,
          approvedBookings: 0,
          totalStorageSqft: 0,
          occupiedStorageSqft: 0,
          availableStorageSqft: 0
        });
        setNotifications([]);
        setRecentActivities([]);
        setLoading(false);
        return;
      }

      // Fetch all data in parallel
      const [
        seekersData,
        ownersData,
        warehousesData,
        warehouseCapacityData,
        submissionsData,
        pendingVerifs,
        bookingsData,
        notifsData
      ] = await Promise.all([
        supabase.from('seeker_profiles').select('*', { count: 'exact' }),
        supabase.from('owner_profiles').select('*', { count: 'exact' }),
        supabase.from('warehouses').select('id', { count: 'exact' }),
        supabase.from('warehouses').select('total_area, occupancy'),
        supabase.from('warehouse_submissions').select('id', { count: 'exact' }).eq('status', 'pending'),
        getPendingVerifications(),
        // Fetch bookings from activity_logs where type='booking'
        supabase.from('activity_logs').select('*').eq('type', 'booking').order('created_at', { ascending: false }),
        getAdminNotifications()
      ]);

      // Calculate stats
      const seekerCount = seekersData.count || 0;
      const ownerCount = ownersData.count || 0;
      const totalUsers = seekerCount + ownerCount;

      const warehouses = warehousesData.count || 0;

      const bookings = bookingsData.data || [];
      const totalBookings = bookings.length;
      const pendingBookings = bookings.filter((b: any) => b.metadata?.booking_status === 'pending').length;
      const approvedBookings = bookings.filter((b: any) => b.metadata?.booking_status === 'approved').length;

      // Calculate revenue from approved bookings
      const totalRevenue = bookings.reduce((sum: number, b: any) => {
        if (b.metadata?.booking_status === 'approved') {
          return sum + (parseFloat(b.metadata?.total_amount) || 0);
        }
        return sum;
      }, 0);

      // Build booking trend (last 6 months)
      const trend: Array<{ label: string; count: number }> = [];
      for (let i = 5; i >= 0; i--) {
        const start = new Date();
        start.setDate(1);
        start.setMonth(start.getMonth() - i);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setMonth(end.getMonth() + 1);

        const label = start.toLocaleDateString('en-IN', { month: 'short' });
        const count = bookings.filter((b: any) => {
          const created = new Date(b.created_at);
          return created >= start && created < end;
        }).length;

        trend.push({ label, count });
      }

      setBookingTrend(trend);

      const capacityRows = warehouseCapacityData.data || [];
      const totalStorageSqft = capacityRows.reduce((sum: number, w: any) => sum + (Number(w.total_area) || 0), 0);
      const occupiedStorageSqft = capacityRows.reduce((sum: number, w: any) => {
        const total = Number(w.total_area) || 0;
        const occupancy = Number(w.occupancy) || 0;
        return sum + Math.round(total * occupancy);
      }, 0);
      const availableStorageSqft = Math.max(0, totalStorageSqft - occupiedStorageSqft);

      setStats({
        totalUsers,
        totalWarehouses: warehouses,
        pendingVerifications: pendingVerifs.length,
        pendingWarehouseSubmissions: submissionsData.count || 0,
        totalBookings,
        totalRevenue,
        seekerCount,
        ownerCount,
        pendingBookings,
        approvedBookings,
        totalStorageSqft,
        occupiedStorageSqft,
        availableStorageSqft
      });

      setNotifications(notifsData);

      // Build recent activities from real data
      const activities: RecentActivity[] = [];

      // Add verification submissions
      pendingVerifs.slice(0, 3).forEach((verif: any) => {
        activities.push({
          id: verif.id,
          type: 'verification',
          message: `New ${verif.profile_type} verification: ${verif.user_name} (${verif.company_name})`,
          timestamp: verif.created_at
        });
      });

      // Add recent bookings from activity_logs
      const recentBookings = bookings.slice(0, 5);

      recentBookings.forEach((booking: any) => {
        const status = booking.metadata?.booking_status || 'pending';
        const warehouseName = booking.metadata?.warehouse_name || 'Warehouse';
        const amount = booking.metadata?.total_amount || 0;
        const customerName = booking.metadata?.customer_details?.name || 'Customer';
        
        activities.push({
          id: booking.id,
          type: 'booking',
          message: `${status === 'approved' ? '✅ Approved' : status === 'rejected' ? '❌ Rejected' : '⏳ New'} booking: ${warehouseName} by ${customerName} - ₹${amount.toLocaleString()}`,
          timestamp: booking.created_at
        });
      });

      // Sort by timestamp
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setRecentActivities(activities.slice(0, 8));

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)}L`;
    } else if (amount >= 1000) {
      return `₹${(amount / 1000).toFixed(1)}K`;
    }
    return `₹${amount.toFixed(0)}`;
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  };

  const maxTrendCount = Math.max(1, ...bookingTrend.map(t => t.count));
  const trendPoints = bookingTrend.map((t, i) => ({ x: i, y: t.count }));
  const trendCount = trendPoints.length;
  const trendSlope = trendCount > 1
    ? (() => {
        const sumX = trendPoints.reduce((sum, p) => sum + p.x, 0);
        const sumY = trendPoints.reduce((sum, p) => sum + p.y, 0);
        const sumXY = trendPoints.reduce((sum, p) => sum + p.x * p.y, 0);
        const sumXX = trendPoints.reduce((sum, p) => sum + p.x * p.x, 0);
        const denom = trendCount * sumXX - sumX * sumX;
        return denom === 0 ? 0 : (trendCount * sumXY - sumX * sumY) / denom;
      })()
    : 0;
  const trendIntercept = trendCount > 0
    ? (() => {
        const sumX = trendPoints.reduce((sum, p) => sum + p.x, 0);
        const sumY = trendPoints.reduce((sum, p) => sum + p.y, 0);
        return (sumY - trendSlope * sumX) / trendCount;
      })()
    : 0;
  const trendLabel = trendSlope > 0.2 ? 'Rising' : trendSlope < -0.2 ? 'Falling' : 'Stable';

  if (profile?.user_type !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Navbar />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="text-center">
            <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
            <p className="text-slate-400">Only administrators can access this page.</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Navbar />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-slate-300">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-slate-400 mt-1">Real-time platform overview and management</p>
          </div>
          <Button onClick={fetchDashboardData} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {demoMode && (
          <div className="mb-6 rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-4 text-sm text-yellow-100">
            Demo mode is active. Admin analytics are shown as 0 until you create real data (users, submissions, bookings).
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Users */}
          <div className="glass-dark rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-blue-500/20 p-3 rounded-lg">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
              <span className="text-green-400 text-sm">Live</span>
            </div>
            <h3 className="text-slate-400 text-sm mb-1">Total Users</h3>
            <p className="text-3xl font-bold text-white">{stats.totalUsers}</p>
            <p className="text-slate-500 text-xs mt-2">
              {stats.seekerCount} seekers • {stats.ownerCount} owners
            </p>
          </div>

          {/* Total Warehouses */}
          <div className="glass-dark rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-purple-500/20 p-3 rounded-lg">
                <Warehouse className="w-6 h-6 text-purple-400" />
              </div>
              <span className="text-green-400 text-sm">Live</span>
            </div>
            <h3 className="text-slate-400 text-sm mb-1">Warehouses</h3>
            <p className="text-3xl font-bold text-white">{stats.totalWarehouses.toLocaleString()}</p>
            <p className="text-slate-500 text-xs mt-2">Active listings</p>
          </div>

          {/* Pending Verifications */}
          <div className="glass-dark rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-yellow-500/20 p-3 rounded-lg">
                <ShieldCheck className="w-6 h-6 text-yellow-400" />
              </div>
              <Link to="/admin-verification">
                <Button size="sm" variant="ghost" className="text-xs text-blue-400 hover:text-blue-300">
                  Review →
                </Button>
              </Link>
            </div>
            <h3 className="text-slate-400 text-sm mb-1">Pending Verifications</h3>
            <p className="text-3xl font-bold text-white">{stats.pendingVerifications}</p>
            <p className="text-slate-500 text-xs mt-2">Awaiting review</p>
          </div>

          {/* Total Revenue */}
          <div className="glass-dark rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-green-500/20 p-3 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-400" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="text-slate-400 text-sm mb-1">Total Revenue</h3>
            <p className="text-3xl font-bold text-white">{formatCurrency(stats.totalRevenue)}</p>
            <p className="text-slate-500 text-xs mt-2">From {stats.totalBookings} bookings</p>
          </div>
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="glass-dark rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Bookings</p>
                <p className="text-2xl font-bold text-white">{stats.totalBookings}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          <div className="glass-dark rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Pending Bookings</p>
                <p className="text-2xl font-bold text-yellow-400">{stats.pendingBookings}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-400" />
            </div>
          </div>
          <div className="glass-dark rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Approved Bookings</p>
                <p className="text-2xl font-bold text-green-400">{stats.approvedBookings}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </div>
          <div className="glass-dark rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Warehouse Submissions</p>
                <p className="text-2xl font-bold text-blue-400">{stats.pendingWarehouseSubmissions}</p>
                <Link to="/admin/warehouse-submissions" className="text-xs text-blue-400 hover:text-blue-300">
                  Review submissions →
                </Link>
              </div>
              <Warehouse className="w-8 h-8 text-blue-400" />
            </div>
          </div>
        </div>

        {/* Storage Utilization */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="glass-dark rounded-xl p-6">
            <h3 className="text-slate-400 text-sm mb-1">Total Storage Capacity</h3>
            <p className="text-2xl font-bold text-white">{stats.totalStorageSqft.toLocaleString()} sq ft</p>
          </div>
          <div className="glass-dark rounded-xl p-6">
            <h3 className="text-slate-400 text-sm mb-1">Occupied Storage</h3>
            <p className="text-2xl font-bold text-orange-400">{stats.occupiedStorageSqft.toLocaleString()} sq ft</p>
            <div className="mt-2">
              <Progress value={stats.totalStorageSqft ? (stats.occupiedStorageSqft / stats.totalStorageSqft) * 100 : 0} className="h-2" />
            </div>
          </div>
          <div className="glass-dark rounded-xl p-6">
            <h3 className="text-slate-400 text-sm mb-1">Available Storage</h3>
            <p className="text-2xl font-bold text-green-400">{stats.availableStorageSqft.toLocaleString()} sq ft</p>
          </div>
        </div>

        {/* Booking Trend Chart */}
        <div className="glass-dark rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Bookings Trend (Last 6 Months)</h3>
              <p className="text-slate-400 text-sm">Monthly booking volume</p>
            </div>
            <TrendingUp className="w-5 h-5 text-blue-400" />
          </div>
          <div className="w-full h-40 bg-gray-900/40 rounded-lg p-4">
            <svg viewBox="0 0 300 100" className="w-full h-full">
              <polyline
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2"
                points={bookingTrend.map((t, i) => {
                  const x = (i / Math.max(1, bookingTrend.length - 1)) * 300;
                  const y = 100 - (t.count / maxTrendCount) * 80 - 10;
                  return `${x},${y}`;
                }).join(' ')}
              />
              {bookingTrend.length > 1 && (
                <polyline
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="2"
                  strokeDasharray="4 3"
                  points={bookingTrend.map((_, i) => {
                    const x = (i / Math.max(1, bookingTrend.length - 1)) * 300;
                    const predicted = trendSlope * i + trendIntercept;
                    const y = 100 - (predicted / maxTrendCount) * 80 - 10;
                    return `${x},${y}`;
                  }).join(' ')}
                />
              )}
            </svg>
            <div className="mt-3 flex justify-between text-xs text-slate-400">
              {bookingTrend.map((t) => (
                <span key={t.label}>{t.label}</span>
              ))}
            </div>
            <div className="mt-2 text-xs text-slate-400">
              Trend: <span className="text-slate-200">{trendLabel}</span> • Regression slope: <span className="text-slate-200">{trendSlope.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <div className="glass-dark rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-400" />
              Recent Activity
            </h2>
            {recentActivities.length === 0 ? (
              <p className="text-slate-400 text-center py-8">No recent activity</p>
            ) : (
              <div className="space-y-3">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg">
                    <div className={`p-2 rounded-full ${activity.type === 'verification' ? 'bg-yellow-500/20' : 'bg-blue-500/20'
                      }`}>
                      {activity.type === 'verification' ? (
                        <ShieldCheck className="w-4 h-4 text-yellow-400" />
                      ) : (
                        <FileText className="w-4 h-4 text-blue-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-slate-200 text-sm">{activity.message}</p>
                      <p className="text-slate-500 text-xs mt-1">{formatTimeAgo(activity.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="glass-dark rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-4">
              <Link to="/admin-verification">
                <Button className="w-full h-24 bg-blue-600 hover:bg-blue-700 flex flex-col items-center justify-center gap-2">
                  <ShieldCheck className="w-6 h-6" />
                  <span>Profile Verification</span>
                  {stats.pendingVerifications > 0 && (
                    <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {stats.pendingVerifications}
                    </span>
                  )}
                </Button>
              </Link>
              <Link to="/admin/bookings">
                <Button className="w-full h-24 bg-purple-600 hover:bg-purple-700 flex flex-col items-center justify-center gap-2">
                  <FileText className="w-6 h-6" />
                  <span>Manage Bookings</span>
                  {stats.pendingBookings > 0 && (
                    <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {stats.pendingBookings}
                    </span>
                  )}
                </Button>
              </Link>
              <Link to="/admin/users">
                <Button className="w-full h-24 bg-green-600 hover:bg-green-700 flex flex-col items-center justify-center gap-2">
                  <Users className="w-6 h-6" />
                  <span>User Management</span>
                  <span className="text-xs opacity-80">{stats.totalUsers} users</span>
                </Button>
              </Link>
              <Link to="/admin/warehouses">
                <Button className="w-full h-24 bg-orange-600 hover:bg-orange-700 flex flex-col items-center justify-center gap-2">
                  <Warehouse className="w-6 h-6" />
                  <span>Warehouses</span>
                  <span className="text-xs opacity-80">{stats.totalWarehouses}</span>
                </Button>
              </Link>
            </div>

            {/* Admin Notifications */}
            {notifications.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  Unread Notifications ({notifications.length})
                </h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {notifications.slice(0, 5).map((notif) => (
                    <div key={notif.id} className="bg-blue-500/10 border border-blue-500/30 rounded p-2">
                      <p className="text-blue-300 text-xs">{notif.title}</p>
                      <p className="text-blue-400 text-xs mt-1">{notif.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
