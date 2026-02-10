import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Navbar } from '@/components/Navbar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  Users,
  Search,
  Building2,
  Package,
  Mail,
  Phone,
  Calendar,
  Shield,
  ArrowLeft,
  RefreshCw,
  CheckCircle,
  XCircle,
  User
} from 'lucide-react';

interface UserProfile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone?: string;
  company_name?: string;
  user_type: 'seeker' | 'owner';
  verification_status: string;
  created_at: string;
}

interface ActivityLog {
  id: string;
  type: string;
  description: string;
  created_at: string;
  metadata?: any;
}

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'seeker' | 'owner'>('all');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [showActivity, setShowActivity] = useState(false);

  useEffect(() => {
    if (profile?.user_type !== 'admin') {
      navigate('/');
      return;
    }
    fetchUsers();
  }, [profile]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch seekers
      const { data: seekers } = await supabase
        .from('seeker_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      // Fetch owners
      const { data: owners } = await supabase
        .from('owner_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      const allUsers: UserProfile[] = [];

      // Map seekers
      (seekers || []).forEach((s: any) => {
        allUsers.push({
          id: s.id,
          user_id: s.user_id,
          name: s.name || s.full_name || 'Unknown',
          email: s.email || '',
          phone: s.phone || s.contact_number || '',
          company_name: s.company_name || '',
          user_type: 'seeker',
          verification_status: s.verification_status || 'pending',
          created_at: s.created_at
        });
      });

      // Map owners
      (owners || []).forEach((o: any) => {
        allUsers.push({
          id: o.id,
          user_id: o.user_id,
          name: o.name || o.full_name || 'Unknown',
          email: o.email || '',
          phone: o.phone || o.contact_number || '',
          company_name: o.company_name || '',
          user_type: 'owner',
          verification_status: o.verification_status || 'pending',
          created_at: o.created_at
        });
      });

      // Sort by created_at
      allUsers.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setUsers(allUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.company_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || user.user_type === filterType;
    
    return matchesSearch && matchesType;
  });

  const seekerCount = users.filter(u => u.user_type === 'seeker').length;
  const ownerCount = users.filter(u => u.user_type === 'owner').length;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const fetchActivity = async (user: UserProfile) => {
    setSelectedUser(user);
    setShowActivity(true);
    setLoadingActivity(true);
    try {
      const response = await fetch(`/api/admin/user-activity?user_id=${user.user_id}&user_type=${user.user_type}`);
      const data = await response.json();
      if (data.success) {
        setActivityLogs(data.activities || []);
      }
    } catch (error) {
      console.error('Error loading activity:', error);
    } finally {
      setLoadingActivity(false);
    }
  };

  const deactivateUser = async (user: UserProfile) => {
    try {
      const table = user.user_type === 'seeker' ? 'seeker_profiles' : 'owner_profiles';
      const { error } = await supabase
        .from(table)
        .update({ is_active: false, verification_status: 'disabled' })
        .eq('id', user.id);

      if (error) throw error;

      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, verification_status: 'disabled' } : u));
    } catch (error) {
      console.error('Error deactivating user:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-900">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/admin')}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Users className="h-8 w-8 text-blue-400" />
                User Management
              </h1>
              <p className="text-gray-400 mt-1">
                Manage all platform users - seekers and owners
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={fetchUsers}
            className="border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Users</p>
                <p className="text-2xl font-bold text-white">{users.length}</p>
              </div>
              <Users className="h-8 w-8 text-blue-400" />
            </CardContent>
          </Card>
          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Seekers</p>
                <p className="text-2xl font-bold text-green-400">{seekerCount}</p>
              </div>
              <Package className="h-8 w-8 text-green-400" />
            </CardContent>
          </Card>
          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Owners</p>
                <p className="text-2xl font-bold text-purple-400">{ownerCount}</p>
              </div>
              <Building2 className="h-8 w-8 text-purple-400" />
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name, email, or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-700 text-white"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={filterType === 'all' ? 'default' : 'outline'}
              onClick={() => setFilterType('all')}
              className={filterType === 'all' ? 'bg-blue-600' : 'border-gray-600 text-gray-300'}
            >
              All
            </Button>
            <Button
              variant={filterType === 'seeker' ? 'default' : 'outline'}
              onClick={() => setFilterType('seeker')}
              className={filterType === 'seeker' ? 'bg-green-600' : 'border-gray-600 text-gray-300'}
            >
              Seekers
            </Button>
            <Button
              variant={filterType === 'owner' ? 'default' : 'outline'}
              onClick={() => setFilterType('owner')}
              className={filterType === 'owner' ? 'bg-purple-600' : 'border-gray-600 text-gray-300'}
            >
              Owners
            </Button>
          </div>
        </div>

        {/* User List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="py-12 text-center">
              <Users className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-300 mb-2">No Users Found</h3>
              <p className="text-gray-500">
                {searchTerm ? 'Try a different search term' : 'No users registered yet'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((user) => (
              <Card key={user.id} className="bg-gray-800/50 border-gray-700 hover:border-gray-600 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-full ${
                        user.user_type === 'seeker' ? 'bg-green-500/20' : 'bg-purple-500/20'
                      }`}>
                        {user.user_type === 'seeker' 
                          ? <Package className="h-6 w-6 text-green-400" />
                          : <Building2 className="h-6 w-6 text-purple-400" />
                        }
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-white">{user.name}</h3>
                          <Badge className={
                            user.user_type === 'seeker' 
                              ? 'bg-green-500/20 text-green-400 border-green-500/30'
                              : 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                          }>
                            {user.user_type}
                          </Badge>
                          {user.verification_status === 'verified' && (
                            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                              <Shield className="h-3 w-3 mr-1" />
                              Verified
                            </Badge>
                          )}
                        </div>
                        {user.company_name && (
                          <p className="text-gray-400 text-sm">{user.company_name}</p>
                        )}
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {user.email || 'No email'}
                          </span>
                          {user.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {user.phone}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Joined {formatDate(user.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {user.verification_status === 'verified' ? (
                        <CheckCircle className="h-5 w-5 text-green-400" />
                      ) : user.verification_status === 'rejected' ? (
                        <XCircle className="h-5 w-5 text-red-400" />
                      ) : (
                        <div className="h-5 w-5 rounded-full bg-yellow-500/20 flex items-center justify-center">
                          <div className="h-2 w-2 rounded-full bg-yellow-400" />
                        </div>
                      )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-gray-600 text-gray-300"
                          onClick={() => fetchActivity(user)}
                        >
                          View Activity
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deactivateUser(user)}
                        >
                          Deactivate
                        </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

        {showActivity && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="w-full max-w-3xl bg-gray-900 border border-gray-700 rounded-xl shadow-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-white">Activity for {selectedUser.name}</h3>
                  <p className="text-sm text-gray-400">{selectedUser.user_type} • {selectedUser.email}</p>
                </div>
                <Button variant="outline" onClick={() => setShowActivity(false)} className="border-gray-600 text-gray-300">
                  Close
                </Button>
              </div>

              {loadingActivity ? (
                <div className="text-gray-400">Loading activity...</div>
              ) : activityLogs.length === 0 ? (
                <div className="text-gray-400">No activity logs found.</div>
              ) : (
                <div className="max-h-[60vh] overflow-y-auto space-y-3">
                  {activityLogs.map((log) => (
                    <Card key={log.id} className="bg-gray-800/60 border-gray-700">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white font-medium capitalize">{log.type}</p>
                            <p className="text-gray-400 text-sm">{log.description}</p>
                          </div>
                          <span className="text-xs text-gray-500">{formatDate(log.created_at)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
    </div>
  );
}
