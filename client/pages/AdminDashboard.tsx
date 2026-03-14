import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navbar } from '../components/Navbar';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import {
  Users, Warehouse, DollarSign, TrendingUp, Clock, CheckCircle, XCircle,
  Bell, FileText, ShieldCheck, RefreshCw, Eye, BarChart3, LayoutDashboard,
  ChevronRight, Package, LogOut, Menu, X, Activity, Building2, Layers, Star,
  MapPin, ArrowUpRight, ArrowDownRight, Loader2, AlertTriangle, UserPlus,
  Bookmark, CreditCard, MessageSquare, Zap, PieChart,
} from 'lucide-react';

/* ---------- TYPES ---------- */

interface DashboardStats {
  totalUsers: number; seekerCount: number; ownerCount: number; adminCount: number;
  verifiedSeekers: number; verifiedOwners: number; newUsersLast30: number; userGrowthPct: number;
  totalWarehouses: number; activeWarehouses: number; verifiedWarehouses: number;
  totalStorageSqft: number; occupiedStorageSqft: number; availableStorageSqft: number;
  avgOccupancy: number; avgRating: number; avgPricePerSqft: number;
  pendingWarehouseSubmissions: number; approvedSubmissions: number; rejectedSubmissions: number; totalSubmissions: number;
  pendingVerifications: number; totalVerificationRequests: number;
  totalBookings: number; pendingBookings: number; approvedBookings: number; rejectedBookings: number; cancelledBookings: number;
  totalRevenue: number; avgBookingValue: number; bookingConversionRate: number;
  totalInquiries: number; openInquiries: number;
  totalVisits: number; pendingVisits: number;
  totalReviews: number; avgReviewRating: number; totalSaved: number;
  totalPayments: number; totalPaymentAmount: number;
  unreadNotifications: number;
}

interface RecentActivity {
  id: string; type: string; icon: string; message: string; detail?: string; timestamp: string; status: string;
}

interface TrendItem { label: string; count: number; revenue: number; }
interface CityItem { city: string; count: number; }
interface TypeItem { type: string; count: number; }
interface TopWarehouse { id: string; name: string; city: string; rating: number; occupancy: number; area: number; }
interface RevenueCityItem { city: string; revenue: number; }
interface SignupItem { id: string; name: string; type: string; joinedAt: string; }

const defaultStats: DashboardStats = {
  totalUsers:0,seekerCount:0,ownerCount:0,adminCount:0,verifiedSeekers:0,verifiedOwners:0,
  newUsersLast30:0,userGrowthPct:0,totalWarehouses:0,activeWarehouses:0,verifiedWarehouses:0,
  totalStorageSqft:0,occupiedStorageSqft:0,availableStorageSqft:0,avgOccupancy:0,avgRating:0,
  avgPricePerSqft:0,pendingWarehouseSubmissions:0,approvedSubmissions:0,rejectedSubmissions:0,
  totalSubmissions:0,pendingVerifications:0,totalVerificationRequests:0,totalBookings:0,
  pendingBookings:0,approvedBookings:0,rejectedBookings:0,cancelledBookings:0,totalRevenue:0,
  avgBookingValue:0,bookingConversionRate:0,totalInquiries:0,openInquiries:0,totalVisits:0,
  pendingVisits:0,totalReviews:0,avgReviewRating:0,totalSaved:0,totalPayments:0,
  totalPaymentAmount:0,unreadNotifications:0,
};

/* ---------- SIDEBAR NAV ---------- */

const SIDEBAR_NAV = [
  { id:'overview', label:'Dashboard', icon:LayoutDashboard, path:'/admin', color:'text-blue-400', bg:'bg-blue-500/20' },
  { id:'analytics', label:'Analytics', icon:BarChart3, path:'/admin/analytics', color:'text-indigo-400', bg:'bg-indigo-500/20' },
  { id:'warehouses', label:'Submissions', icon:Warehouse, path:'/admin/warehouse-submissions', color:'text-cyan-400', bg:'bg-cyan-500/20', badgeKey:'pendingWarehouseSubmissions' as const },
  { id:'verification', label:'Verification', icon:ShieldCheck, path:'/admin-verification', color:'text-yellow-400', bg:'bg-yellow-500/20', badgeKey:'pendingVerifications' as const },
  { id:'bookings', label:'Bookings', icon:FileText, path:'/admin/bookings', color:'text-purple-400', bg:'bg-purple-500/20', badgeKey:'pendingBookings' as const },
  { id:'users', label:'Users', icon:Users, path:'/admin/users', color:'text-green-400', bg:'bg-green-500/20' },
];

/* ---------- COMPONENT ---------- */

export default function AdminDashboard() {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [stats, setStats] = useState<DashboardStats>(defaultStats);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [bookingTrend, setBookingTrend] = useState<TrendItem[]>([]);
  const [topCities, setTopCities] = useState<CityItem[]>([]);
  const [warehouseTypes, setWarehouseTypes] = useState<TypeItem[]>([]);
  const [topWarehouses, setTopWarehouses] = useState<TopWarehouse[]>([]);
  const [revenueByCity, setRevenueByCity] = useState<RevenueCityItem[]>([]);
  const [recentSignups, setRecentSignups] = useState<SignupItem[]>([]);
  const [connectionError, setConnectionError] = useState('');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [liveIndicator, setLiveIndicator] = useState(false);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ---- Fetch ---- */
  const fetchDashboardData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    setConnectionError('');
    try {
      const res = await fetch('/api/admin/dashboard-stats');
      if (!res.ok) {
        const text = await res.text();
        let msg = `Server error (${res.status})`;
        try { msg = JSON.parse(text)?.error || msg; } catch {}
        if (msg.includes('fetch failed') || msg.includes('TypeError'))
          msg = 'Cannot reach the database. Your Supabase project may be paused. Go to supabase.com/dashboard and click Restore, then retry.';
        throw new Error(msg);
      }
      const d = await res.json();
      if (!d.success) throw new Error(d.error || 'Failed to load dashboard');
      setStats({ ...defaultStats, ...d.stats });
      setBookingTrend(d.bookingTrend || []);
      setTopCities(d.topCities || []);
      setWarehouseTypes(d.warehouseTypes || []);
      setTopWarehouses(d.topWarehouses || []);
      setRevenueByCity(d.revenueByCity || []);
      setRecentActivities(d.recentActivities || []);
      setNotifications(d.notifications || []);
      setRecentSignups(d.recentSignups || []);
      setLastRefresh(new Date());
      setLiveIndicator(true);
      setTimeout(() => setLiveIndicator(false), 2000);
      if (d.errors?.length) console.warn('Partial warnings:', d.errors);
    } catch (e: any) {
      console.error('Dashboard fetch error:', e);
      setConnectionError(e.message || 'Failed to load dashboard');
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  /* ---- Auto-refresh + Real-time ---- */
  useEffect(() => {
    fetchDashboardData();
    refreshTimerRef.current = setInterval(() => fetchDashboardData(true), 60000);
    const channel = supabase.channel('admin-live')
      .on('postgres_changes', { event:'*', schema:'public', table:'activity_logs' }, () => fetchDashboardData(true))
      .on('postgres_changes', { event:'*', schema:'public', table:'warehouse_submissions' }, () => fetchDashboardData(true))
      .on('postgres_changes', { event:'*', schema:'public', table:'verification_queue' }, () => fetchDashboardData(true))
      .on('postgres_changes', { event:'*', schema:'public', table:'admin_notifications' }, () => fetchDashboardData(true))
      .subscribe();
    return () => { if (refreshTimerRef.current) clearInterval(refreshTimerRef.current); supabase.removeChannel(channel); };
  }, [fetchDashboardData]);

  /* ---- Helpers ---- */
  const fmt = (n: number) => n.toLocaleString('en-IN');
  const fmtCurrency = (n: number) => {
    if (n >= 10000000) return '\u20B9' + (n/10000000).toFixed(2) + ' Cr';
    if (n >= 100000) return '\u20B9' + (n/100000).toFixed(2) + ' L';
    if (n >= 1000) return '\u20B9' + (n/1000).toFixed(1) + ' K';
    return '\u20B9' + n.toFixed(0);
  };
  const timeAgo = (ts: string) => {
    const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s/60) + 'm ago';
    if (s < 86400) return Math.floor(s/3600) + 'h ago';
    if (s < 604800) return Math.floor(s/86400) + 'd ago';
    return new Date(ts).toLocaleDateString('en-IN', { day:'numeric', month:'short' });
  };
  const maxTrend = Math.max(1, ...bookingTrend.map(t => t.count));

  /* ---- Guards ---- */
  if (profile?.user_type !== 'admin') {
    return (<div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950"><Navbar />
      <div className="flex items-center justify-center h-[80vh]"><div className="text-center">
        <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
        <p className="text-slate-400">Only administrators can access this page.</p>
      </div></div></div>);
  }
  if (loading) {
    return (<div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950"><Navbar />
      <div className="flex items-center justify-center h-[80vh]"><div className="text-center">
        <Loader2 className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
        <p className="text-slate-300 text-lg font-medium">Loading Admin Dashboard</p>
        <p className="text-slate-500 text-sm mt-1">Fetching real-time data...</p>
      </div></div></div>);
  }

  const totalPending = (stats.pendingVerifications||0) + (stats.pendingWarehouseSubmissions||0) + (stats.pendingBookings||0);
  const occPct = stats.totalStorageSqft ? Math.round((stats.occupiedStorageSqft / stats.totalStorageSqft) * 100) : 0;

  /* ---- RENDER ---- */
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <Navbar />
      <div className="flex">
        {mobileSidebarOpen && <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setMobileSidebarOpen(false)}><div className="fixed inset-0 bg-black/60 backdrop-blur-sm" /></div>}

        {/* LEFT SIDEBAR */}
        <aside className={`${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:sticky top-0 lg:top-0 z-50 lg:z-10 h-screen ${sidebarCollapsed ? 'w-[72px]' : 'w-64'} bg-slate-950/95 backdrop-blur-xl border-r border-slate-800/60 transition-all duration-300 flex flex-col overflow-hidden`}>
          <div className={`p-4 border-b border-slate-800/60 ${sidebarCollapsed ? 'px-3' : ''}`}>
            <div className="flex items-center justify-between">
              {!sidebarCollapsed && <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25"><Building2 className="w-4 h-4 text-white" /></div><div><h2 className="text-white font-bold text-sm tracking-tight">SmartSpace</h2><p className="text-slate-500 text-[10px] font-medium">Admin Console</p></div></div>}
              <button onClick={() => { setSidebarCollapsed(!sidebarCollapsed); setMobileSidebarOpen(false); }} className="p-1.5 rounded-md hover:bg-slate-800 text-slate-500 hover:text-white transition-colors">
                {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <X className="w-4 h-4 lg:hidden" />}
                {!sidebarCollapsed && <Menu className="w-4 h-4 hidden lg:block" />}
              </button>
            </div>
          </div>
          {!sidebarCollapsed && <div className="px-4 py-3 border-b border-slate-800/60"><div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-xs">{profile?.name?.[0]?.toUpperCase() || 'A'}</div>
            <div className="flex-1 min-w-0"><p className="text-white text-xs font-semibold truncate">{profile?.name || 'Admin'}</p><p className="text-slate-500 text-[10px] truncate">{user?.email}</p></div>
            <div className={`w-2 h-2 rounded-full ${liveIndicator ? 'bg-green-400 animate-ping' : 'bg-green-500'}`} />
          </div></div>}
          <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
            {!sidebarCollapsed && <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest px-3 mb-1.5 mt-1">Menu</p>}
            {SIDEBAR_NAV.map(item => {
              const isActive = location.pathname === item.path || (item.id === 'overview' && location.pathname === '/admin');
              const badge = item.badgeKey ? stats[item.badgeKey] : 0;
              return (<Link key={item.id} to={item.path} onClick={() => setMobileSidebarOpen(false)}>
                <div className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-150 group relative ${isActive ? 'bg-blue-600/15 text-white border-l-2 border-blue-500' : 'hover:bg-slate-800/60 text-slate-400 hover:text-slate-200 border-l-2 border-transparent'} ${sidebarCollapsed ? 'justify-center px-0 border-l-0' : ''}`} title={sidebarCollapsed ? item.label : undefined}>
                  <item.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? item.color : 'text-slate-500 group-hover:text-slate-300'}`} />
                  {!sidebarCollapsed && <><span className="flex-1 text-[13px] font-medium">{item.label}</span>{badge > 0 && <span className="bg-red-500/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-tight">{badge}</span>}</>}
                  {sidebarCollapsed && badge > 0 && <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[8px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">{badge > 9 ? '9+' : badge}</span>}
                </div>
              </Link>);
            })}
            {!sidebarCollapsed && <>
              <div className="border-t border-slate-800/60 my-2" />
              <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest px-3 mb-1.5">Live Stats</p>
              <div className="space-y-1 px-1">
                {[{ l:'Users', v:fmt(stats.totalUsers), s:`${stats.seekerCount}S / ${stats.ownerCount}O`, c:'text-blue-400' },
                  { l:'Warehouses', v:fmt(stats.totalWarehouses), s:`${stats.avgOccupancy}% occupied`, c:'text-cyan-400' },
                  { l:'Revenue', v:fmtCurrency(stats.totalRevenue), s:`${stats.approvedBookings} bookings`, c:'text-green-400' }
                ].map(x => <div key={x.l} className="bg-slate-900/60 rounded-md p-2.5 border border-slate-800/40">
                  <div className="flex items-center justify-between"><span className="text-slate-500 text-[10px] font-medium">{x.l}</span><span className={`${x.c} font-bold text-xs`}>{x.v}</span></div>
                  <p className="text-slate-600 text-[9px] mt-0.5">{x.s}</p>
                </div>)}
              </div>
            </>}
          </nav>
          <div className="border-t border-slate-800/60 p-2">
            <button onClick={() => signOut?.()} className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors text-xs ${sidebarCollapsed ? 'justify-center px-0' : ''}`}>
              <LogOut className="w-4 h-4" />{!sidebarCollapsed && <span className="font-medium">Sign Out</span>}
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 min-w-0 overflow-x-hidden">
          <div className="sticky top-0 z-20 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/40 px-4 sm:px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => setMobileSidebarOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-slate-800 text-slate-400" title="Open menu"><Menu className="w-5 h-5" /></button>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg font-bold text-white">Dashboard</h1>
                    <div className="flex items-center gap-1 bg-green-500/10 border border-green-500/20 rounded-full px-2 py-0.5"><div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /><span className="text-green-400 text-[10px] font-semibold">LIVE</span></div>
                  </div>
                  <p className="text-slate-500 text-xs">{lastRefresh ? `Updated ${timeAgo(lastRefresh.toISOString())}` : 'Loading...'} &bull; Auto-refreshes every 60s</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {totalPending > 0 && <div className="hidden sm:flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1.5"><AlertTriangle className="w-3.5 h-3.5 text-amber-400" /><span className="text-amber-400 text-[11px] font-semibold">{totalPending} pending</span></div>}
                {stats.unreadNotifications > 0 && <div className="relative"><Bell className="w-5 h-5 text-slate-400" /><span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{stats.unreadNotifications > 9 ? '9+' : stats.unreadNotifications}</span></div>}
                <Button onClick={() => fetchDashboardData(true)} variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs h-8" disabled={refreshing}>
                  <RefreshCw className={`w-3.5 h-3.5 mr-1 ${refreshing ? 'animate-spin' : ''}`} />{refreshing ? 'Refreshing...' : 'Refresh'}
                </Button>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6 space-y-5">
            {/* Connection Error */}
            {connectionError && <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1"><p className="font-semibold text-sm text-red-300">Database Connection Error</p><p className="text-xs mt-1 text-red-200/80">{connectionError}</p></div>
                <Button onClick={() => fetchDashboardData()} size="sm" className="bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/30 text-xs"><RefreshCw className="w-3 h-3 mr-1" /> Retry</Button>
              </div>
            </div>}

            {/* KPI CARDS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {[
                { label:'Total Users', value:fmt(stats.totalUsers), icon:Users, iconBg:'bg-blue-500/20', sub:`${stats.seekerCount} Seekers \u2022 ${stats.ownerCount} Owners`, change:stats.userGrowthPct, changeLbl:`${stats.newUsersLast30} new (30d)` },
                { label:'Warehouses', value:fmt(stats.totalWarehouses), icon:Warehouse, iconBg:'bg-purple-500/20', sub:`${stats.activeWarehouses} active \u2022 ${stats.verifiedWarehouses} verified`, change:null, changeLbl:`${stats.avgOccupancy}% avg occupancy` },
                { label:'Bookings', value:fmt(stats.totalBookings), icon:FileText, iconBg:'bg-cyan-500/20', sub:`${stats.approvedBookings} approved \u2022 ${stats.pendingBookings} pending`, change:null, changeLbl:`${stats.bookingConversionRate}% conversion` },
                { label:'Revenue', value:fmtCurrency(stats.totalRevenue), icon:DollarSign, iconBg:'bg-emerald-500/20', sub:`Avg ${fmtCurrency(stats.avgBookingValue)} per booking`, change:null, changeLbl:`${stats.totalPayments} payments` },
              ].map((kpi, i) => (
                <div key={i} className="bg-slate-900/80 border border-slate-800/50 rounded-xl p-4 sm:p-5 hover:border-slate-700/60 transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`${kpi.iconBg} p-2 rounded-lg`}><kpi.icon className="w-4 h-4 text-white" /></div>
                    {kpi.change !== null ? <div className={`flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded ${kpi.change >= 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>{kpi.change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}{Math.abs(kpi.change)}%</div>
                      : <span className="text-[9px] font-bold text-green-500/70 bg-green-500/10 px-1.5 py-0.5 rounded">LIVE</span>}
                  </div>
                  <p className="text-slate-400 text-[11px] font-medium mb-0.5">{kpi.label}</p>
                  <p className="text-white text-xl sm:text-2xl font-bold tracking-tight">{kpi.value}</p>
                  <p className="text-slate-500 text-[10px] mt-1.5">{kpi.sub}</p>
                  <p className="text-slate-600 text-[9px] mt-0.5">{kpi.changeLbl}</p>
                </div>
              ))}
            </div>

            {/* ACTION ITEMS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { path:'/admin-verification', icon:ShieldCheck, color:'yellow', label:'Pending Verifications', val:stats.pendingVerifications, sub:`${stats.totalVerificationRequests} total requests` },
                { path:'/admin/warehouse-submissions', icon:Warehouse, color:'cyan', label:'Warehouse Submissions', val:stats.pendingWarehouseSubmissions, sub:`${stats.approvedSubmissions} approved \u2022 ${stats.rejectedSubmissions} rejected` },
                { path:'/admin/bookings', icon:Clock, color:'purple', label:'Pending Bookings', val:stats.pendingBookings, sub:`${stats.rejectedBookings} rejected \u2022 ${stats.cancelledBookings} cancelled` },
              ].map(a => (
                <Link key={a.label} to={a.path} className="group">
                  <div className={`bg-slate-900/80 border border-slate-800/50 rounded-xl p-4 hover:border-${a.color}-500/30 transition-all`}>
                    <div className="flex items-center gap-3">
                      <div className={`bg-${a.color}-500/15 p-2.5 rounded-lg`}><a.icon className={`w-5 h-5 text-${a.color}-400`} /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-400 text-[11px] font-medium">{a.label}</p>
                        <p className="text-white text-xl font-bold">{a.val}</p>
                        <p className="text-slate-600 text-[10px]">{a.sub}</p>
                      </div>
                      <ChevronRight className={`w-4 h-4 text-slate-700 group-hover:text-${a.color}-400 transition-colors`} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* STORAGE + BOOKING BREAKDOWN */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-slate-900/80 border border-slate-800/50 rounded-xl p-5">
                <h3 className="text-white text-sm font-semibold mb-4 flex items-center gap-2"><Layers className="w-4 h-4 text-blue-400" /> Storage Utilization</h3>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="text-center"><p className="text-slate-500 text-[10px] font-medium mb-1">Total Capacity</p><p className="text-white text-lg font-bold">{fmt(stats.totalStorageSqft)}</p><p className="text-slate-600 text-[9px]">sq. ft.</p></div>
                  <div className="text-center"><p className="text-slate-500 text-[10px] font-medium mb-1">Occupied</p><p className="text-orange-400 text-lg font-bold">{fmt(stats.occupiedStorageSqft)}</p><p className="text-slate-600 text-[9px]">sq. ft.</p></div>
                  <div className="text-center"><p className="text-slate-500 text-[10px] font-medium mb-1">Available</p><p className="text-green-400 text-lg font-bold">{fmt(stats.availableStorageSqft)}</p><p className="text-slate-600 text-[9px]">sq. ft.</p></div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2"><span className="text-slate-400 text-[11px]">Occupancy Rate</span><span className={`text-xs font-bold ${occPct > 80 ? 'text-red-400' : occPct > 50 ? 'text-yellow-400' : 'text-green-400'}`}>{occPct}%</span></div>
                  <Progress value={occPct} className="h-2.5" />
                  <div className="flex justify-between mt-2"><span className="text-slate-600 text-[9px]">Avg Rating: {stats.avgRating}/5</span><span className="text-slate-600 text-[9px]">Avg Price: \u20B9{stats.avgPricePerSqft}/sqft</span></div>
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800/50 rounded-xl p-5">
                <h3 className="text-white text-sm font-semibold mb-4 flex items-center gap-2"><PieChart className="w-4 h-4 text-purple-400" /> Booking Breakdown</h3>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[{ l:'Approved', v:stats.approvedBookings, bg:'bg-green-500', tc:'text-green-400' },
                    { l:'Pending', v:stats.pendingBookings, bg:'bg-yellow-500', tc:'text-yellow-400' },
                    { l:'Rejected', v:stats.rejectedBookings, bg:'bg-red-500', tc:'text-red-400' },
                    { l:'Cancelled', v:stats.cancelledBookings, bg:'bg-slate-500', tc:'text-slate-400' },
                  ].map(b => <div key={b.l} className="bg-slate-800/50 rounded-lg p-3 flex items-center gap-3"><div className={`w-2.5 h-2.5 rounded-full ${b.bg}`} /><div><p className="text-slate-400 text-[10px]">{b.l}</p><p className={`text-lg font-bold ${b.tc}`}>{b.v}</p></div></div>)}
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1.5"><span className="text-slate-400 text-[11px]">Conversion Rate</span><span className="text-blue-400 text-xs font-bold">{stats.bookingConversionRate}%</span></div>
                  <Progress value={stats.bookingConversionRate} className="h-2" />
                  <div className="flex justify-between mt-2"><span className="text-slate-600 text-[9px]">Total: {stats.totalBookings} bookings</span><span className="text-slate-600 text-[9px]">Avg: {fmtCurrency(stats.avgBookingValue)}</span></div>
                </div>
              </div>
            </div>

            {/* TREND + REVENUE BY CITY */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800/50 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div><h3 className="text-white text-sm font-semibold flex items-center gap-2"><TrendingUp className="w-4 h-4 text-blue-400" /> Booking Trend</h3><p className="text-slate-500 text-[10px] mt-0.5">Last 6 months</p></div>
                </div>
                <div className="w-full h-40 bg-slate-800/30 rounded-lg p-3">
                  <svg viewBox="0 0 400 120" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                    <defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" /><stop offset="100%" stopColor="#3b82f6" stopOpacity="0" /></linearGradient></defs>
                    {[0,30,60,90].map(y => <line key={y} x1="30" y1={y+5} x2="395" y2={y+5} stroke="#1e293b" strokeWidth="0.5" />)}
                    {bookingTrend.length > 0 && <>
                      <polygon fill="url(#ag)" points={`30,105 ${bookingTrend.map((t,i) => { const x=30+(i/Math.max(1,bookingTrend.length-1))*365; const y=105-(t.count/maxTrend)*90; return `${x},${y}`; }).join(' ')} 395,105`} />
                      <polyline fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={bookingTrend.map((t,i) => { const x=30+(i/Math.max(1,bookingTrend.length-1))*365; const y=105-(t.count/maxTrend)*90; return `${x},${y}`; }).join(' ')} />
                      {bookingTrend.map((t,i) => { const x=30+(i/Math.max(1,bookingTrend.length-1))*365; const y=105-(t.count/maxTrend)*90; return (<g key={i}><circle cx={x} cy={y} r="3.5" fill="#3b82f6" stroke="#0f172a" strokeWidth="2" /><text x={x} y={y-8} fill="#94a3b8" fontSize="8" textAnchor="middle" fontWeight="600">{t.count}</text><text x={x} y={115} fill="#64748b" fontSize="7" textAnchor="middle">{t.label}</text></g>); })}
                    </>}
                  </svg>
                </div>
              </div>
              <div className="bg-slate-900/80 border border-slate-800/50 rounded-xl p-5">
                <h3 className="text-white text-sm font-semibold mb-4 flex items-center gap-2"><MapPin className="w-4 h-4 text-green-400" /> Revenue by City</h3>
                {revenueByCity.length === 0 ? <p className="text-slate-500 text-xs text-center py-6">No revenue data yet</p> :
                  <div className="space-y-2.5">{revenueByCity.map(r => { const mx = revenueByCity[0]?.revenue || 1; return (
                    <div key={r.city}><div className="flex items-center justify-between mb-1"><span className="text-slate-300 text-xs font-medium">{r.city}</span><span className="text-green-400 text-xs font-bold">{fmtCurrency(r.revenue)}</span></div>
                    <div className="w-full bg-slate-800/60 rounded-full h-1.5"><div className="bg-gradient-to-r from-green-500 to-emerald-400 h-1.5 rounded-full" style={{ width: `${(r.revenue/mx)*100}%` }} /></div></div>); })}</div>}
              </div>
            </div>

            {/* TOP CITIES + WH TYPES + ENGAGEMENT */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-slate-900/80 border border-slate-800/50 rounded-xl p-5">
                <h3 className="text-white text-sm font-semibold mb-3 flex items-center gap-2"><MapPin className="w-4 h-4 text-cyan-400" /> Top Cities</h3>
                {topCities.length === 0 ? <p className="text-slate-500 text-xs text-center py-4">No data</p> :
                  <div className="space-y-1.5">{topCities.slice(0,7).map((c,i) => <div key={c.city} className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-slate-800/40"><span className="text-slate-600 text-[10px] font-mono w-4">{i+1}.</span><span className="text-slate-300 text-xs font-medium flex-1 truncate">{c.city}</span><span className="text-cyan-400 text-xs font-bold">{c.count}</span></div>)}</div>}
              </div>
              <div className="bg-slate-900/80 border border-slate-800/50 rounded-xl p-5">
                <h3 className="text-white text-sm font-semibold mb-3 flex items-center gap-2"><Package className="w-4 h-4 text-indigo-400" /> Warehouse Types</h3>
                {warehouseTypes.length === 0 ? <p className="text-slate-500 text-xs text-center py-4">No data</p> :
                  <div className="space-y-2">{warehouseTypes.slice(0,6).map(t => { const pct = stats.totalWarehouses > 0 ? Math.round((t.count/stats.totalWarehouses)*100) : 0; return (
                    <div key={t.type}><div className="flex items-center justify-between mb-0.5"><span className="text-slate-300 text-[11px] font-medium truncate flex-1 mr-2">{t.type}</span><span className="text-indigo-400 text-[11px] font-bold">{t.count} ({pct}%)</span></div>
                    <div className="w-full bg-slate-800/60 rounded-full h-1.5"><div className="bg-gradient-to-r from-indigo-500 to-purple-400 h-1.5 rounded-full" style={{ width: `${pct}%` }} /></div></div>); })}</div>}
              </div>
              <div className="bg-slate-900/80 border border-slate-800/50 rounded-xl p-5">
                <h3 className="text-white text-sm font-semibold mb-3 flex items-center gap-2"><Zap className="w-4 h-4 text-yellow-400" /> Engagement</h3>
                <div className="space-y-2">
                  {[{ icon:MessageSquare, l:'Inquiries', v:stats.totalInquiries, s:`${stats.openInquiries} open`, c:'text-blue-400' },
                    { icon:Eye, l:'Visits', v:stats.totalVisits, s:`${stats.pendingVisits} pending`, c:'text-purple-400' },
                    { icon:Star, l:'Reviews', v:stats.totalReviews, s:`${stats.avgReviewRating} avg`, c:'text-yellow-400' },
                    { icon:Bookmark, l:'Saved', v:stats.totalSaved, s:'by seekers', c:'text-pink-400' },
                    { icon:CreditCard, l:'Payments', v:stats.totalPayments, s:fmtCurrency(stats.totalPaymentAmount), c:'text-green-400' },
                  ].map(m => <div key={m.l} className="flex items-center gap-3 py-1.5 px-2 rounded-md bg-slate-800/30">
                    <m.icon className={`w-3.5 h-3.5 ${m.c} flex-shrink-0`} />
                    <span className="text-slate-300 text-[11px] font-medium flex-1">{m.l}</span>
                    <div className="text-right"><span className={`text-xs font-bold ${m.c}`}>{fmt(m.v)}</span><p className="text-slate-600 text-[9px]">{m.s}</p></div>
                  </div>)}
                </div>
              </div>
            </div>

            {/* TOP WAREHOUSES + RECENT SIGNUPS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-slate-900/80 border border-slate-800/50 rounded-xl p-5">
                <h3 className="text-white text-sm font-semibold mb-3 flex items-center gap-2"><Star className="w-4 h-4 text-yellow-400" /> Top Rated Warehouses</h3>
                {topWarehouses.length === 0 ? <p className="text-slate-500 text-xs text-center py-4">No rated warehouses</p> :
                  <div className="space-y-2">{topWarehouses.map((w,i) => <div key={w.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 transition-colors">
                    <div className={`w-7 h-7 rounded-md flex items-center justify-center font-bold text-xs ${i===0?'bg-yellow-500/20 text-yellow-400':i===1?'bg-slate-400/20 text-slate-300':i===2?'bg-orange-500/20 text-orange-400':'bg-slate-700/50 text-slate-500'}`}>#{i+1}</div>
                    <div className="flex-1 min-w-0"><p className="text-slate-200 text-xs font-semibold truncate">{w.name}</p><p className="text-slate-500 text-[10px]">{w.city} &bull; {fmt(w.area)} sqft</p></div>
                    <div className="text-right"><div className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-400 fill-yellow-400" /><span className="text-yellow-400 text-xs font-bold">{w.rating}</span></div><p className="text-slate-600 text-[9px]">{w.occupancy}% occ.</p></div>
                  </div>)}</div>}
              </div>
              <div className="bg-slate-900/80 border border-slate-800/50 rounded-xl p-5">
                <h3 className="text-white text-sm font-semibold mb-3 flex items-center gap-2"><UserPlus className="w-4 h-4 text-green-400" /> Recent Signups</h3>
                {recentSignups.length === 0 ? <p className="text-slate-500 text-xs text-center py-4">No recent signups</p> :
                  <div className="space-y-1.5">{recentSignups.map(u => <div key={u.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 transition-colors">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] ${u.type==='seeker'?'bg-blue-500/20 text-blue-400':u.type==='owner'?'bg-purple-500/20 text-purple-400':'bg-green-500/20 text-green-400'}`}>{u.name?.[0]?.toUpperCase()||'?'}</div>
                    <div className="flex-1 min-w-0"><p className="text-slate-200 text-xs font-medium truncate">{u.name}</p><p className="text-slate-500 text-[10px]">{timeAgo(u.joinedAt)}</p></div>
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${u.type==='seeker'?'bg-blue-500/10 text-blue-400':u.type==='owner'?'bg-purple-500/10 text-purple-400':'bg-green-500/10 text-green-400'}`}>{u.type}</span>
                  </div>)}</div>}
              </div>
            </div>

            {/* RECENT ACTIVITY */}
            <div className="bg-slate-900/80 border border-slate-800/50 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white text-sm font-semibold flex items-center gap-2"><Activity className="w-4 h-4 text-blue-400" /> Recent Activity <span className="text-slate-600 text-[10px] font-normal">Real-time from database</span></h3>
                <span className="text-slate-600 text-[10px]">{recentActivities.length} events</span>
              </div>
              {recentActivities.length === 0 ? <div className="flex flex-col items-center justify-center py-8 text-slate-500"><Bell className="w-8 h-8 mb-2 opacity-30" /><p className="text-sm">No recent activity</p></div> :
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto pr-1">
                  {recentActivities.map(act => {
                    const ic = act.type==='verification'?'bg-yellow-500/15 text-yellow-400':act.type==='booking'&&act.status==='approved'?'bg-green-500/15 text-green-400':act.type==='booking'&&act.status==='rejected'?'bg-red-500/15 text-red-400':act.type==='submission'?'bg-cyan-500/15 text-cyan-400':act.type==='visit'?'bg-purple-500/15 text-purple-400':'bg-blue-500/15 text-blue-400';
                    const Ic = act.type==='verification'?ShieldCheck:act.type==='booking'&&act.status==='approved'?CheckCircle:act.type==='booking'&&act.status==='rejected'?XCircle:act.type==='submission'?Warehouse:act.type==='visit'?Eye:act.type==='booking'?Clock:FileText;
                    return (<div key={act.id} className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg hover:bg-slate-800/50 transition-colors border border-slate-800/40">
                      <div className={`p-1.5 rounded-md mt-0.5 ${ic}`}><Ic className="w-3.5 h-3.5" /></div>
                      <div className="flex-1 min-w-0"><p className="text-slate-200 text-[12px] font-medium leading-relaxed">{act.message}</p>{act.detail && <p className="text-slate-500 text-[10px] mt-0.5">{act.detail}</p>}</div>
                      <div className="text-right flex-shrink-0"><p className="text-slate-600 text-[10px] whitespace-nowrap">{timeAgo(act.timestamp)}</p>
                        <span className={`text-[8px] font-bold uppercase px-1 py-0.5 rounded mt-0.5 inline-block ${act.status==='approved'?'bg-green-500/10 text-green-500':act.status==='rejected'?'bg-red-500/10 text-red-500':act.status==='cancelled'?'bg-slate-500/10 text-slate-500':'bg-yellow-500/10 text-yellow-500'}`}>{act.status}</span>
                      </div>
                    </div>);
                  })}
                </div>}
            </div>

            {/* QUICK ACCESS */}
            <div className="bg-slate-900/80 border border-slate-800/50 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white text-sm font-semibold flex items-center gap-2"><BarChart3 className="w-4 h-4 text-indigo-400" /> Quick Access</h3>
                <Link to="/admin/analytics"><Button variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:bg-slate-800 text-[11px] h-7">Full Analytics <ChevronRight className="w-3 h-3 ml-1" /></Button></Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[{ icon:BarChart3, l:'Analytics', d:'Charts & insights', c:'text-blue-400', b:'hover:border-blue-500/30' },
                  { icon:Eye, l:'Explorer', d:'Browse warehouses', c:'text-purple-400', b:'hover:border-purple-500/30' },
                  { icon:TrendingUp, l:'Performance', d:'Trends & ratings', c:'text-green-400', b:'hover:border-green-500/30' },
                  { icon:Star, l:'Leaderboard', d:'Top performers', c:'text-yellow-400', b:'hover:border-yellow-500/30' },
                ].map(lk => <Link key={lk.l} to="/admin/analytics" className={`bg-slate-800/40 rounded-lg p-3.5 transition-all border border-transparent ${lk.b} group`}>
                  <lk.icon className={`w-5 h-5 ${lk.c} mb-2 group-hover:scale-110 transition-transform`} />
                  <p className="text-white text-xs font-semibold">{lk.l}</p>
                  <p className="text-slate-500 text-[10px] mt-0.5">{lk.d}</p>
                </Link>)}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
