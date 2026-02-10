import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { getAIResponse } from '@/services/aiService';
import { 
  Bell, 
  Package, 
  Calendar, 
  MapPin, 
  DollarSign, 
  User, 
  Phone, 
  Mail, 
  Clock,
  CheckCircle,
  FileText,
  Building2,
  ArrowLeft,
  RefreshCw,
  Eye,
  Sparkles
} from 'lucide-react';
import BookingReceipt from '@/components/BookingReceipt';

interface OwnerNotification {
  id: string;
  type: string;
  description: string;
  created_at: string;
  metadata: {
    notification_type: string;
    booking_id: string;
    warehouse_id: string;
    warehouse_name: string;
    seeker_name: string;
    seeker_email: string;
    seeker_phone: string;
    blocks_booked: Array<{ id: string; block_number: number }>;
    area_sqft: number;
    start_date: string;
    end_date: string;
    total_amount: number;
    payment_method: string;
    read: boolean;
  };
}

export default function OwnerNotificationsPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [notifications, setNotifications] = useState<OwnerNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<OwnerNotification | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draftReplies, setDraftReplies] = useState<Record<string, string>>({});
  const [draftLoadingId, setDraftLoadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || profile?.user_type !== 'owner') {
      navigate('/');
      return;
    }
    fetchNotifications();
  }, [user, profile]);

  const fetchNotifications = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      console.log('📬 Fetching owner notifications for user:', user.id);
      
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('seeker_id', user.id)
        .eq('type', 'notification')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching notifications:', error);
        throw error;
      }

      console.log('📬 Raw notifications from DB:', data?.length || 0, 'records');
      console.log('📬 Notification data:', data);

      // Filter for booking-related notifications
      const bookingNotifications = (data || []).filter(
        n => n.metadata?.notification_type === 'booking_approved' || 
             n.metadata?.notification_type === 'visit_request'
      );
      
      console.log('📬 Filtered booking notifications:', bookingNotifications.length);
      
      setNotifications(bookingNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const notification = notifications.find(n => n.id === notificationId);
      if (!notification) return;

      await supabase
        .from('activity_logs')
        .update({
          metadata: {
            ...notification.metadata,
            read: true
          }
        })
        .eq('id', notificationId);

      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId
            ? { ...n, metadata: { ...n.metadata, read: true } }
            : n
        )
      );
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const unreadCount = notifications.filter(n => !n.metadata?.read).length;

  const generateReplyDraft = async (notification: OwnerNotification) => {
    setDraftLoadingId(notification.id);
    try {
      const prompt = `Draft a short, professional reply from a warehouse owner.

Notification type: ${notification.metadata?.notification_type}
Warehouse: ${notification.metadata?.warehouse_name}
Seeker: ${notification.metadata?.seeker_name}
Requested dates: ${notification.metadata?.start_date} to ${notification.metadata?.end_date}
Total amount: ₹${notification.metadata?.total_amount}

Tone: polite, business-friendly, and action-oriented. Keep it under 80 words.`;

      const response = await getAIResponse({
        prompt,
        systemPrompt: 'You are a professional warehouse owner replying to seekers. Provide plain text only.',
        temperature: 0.3,
        maxTokens: 180
      });

      setDraftReplies(prev => ({ ...prev, [notification.id]: response.text.trim() }));
    } catch (error) {
      console.error('Reply draft error:', error);
    } finally {
      setDraftLoadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/dashboard')}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Bell className="h-8 w-8 text-blue-400" />
                Notifications
                {unreadCount > 0 && (
                  <Badge className="bg-red-500 text-white">{unreadCount} new</Badge>
                )}
              </h1>
              <p className="text-gray-400 mt-1">
                Booking approvals and visit requests for your warehouses
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={fetchNotifications}
            className="border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
          </div>
        ) : notifications.length === 0 ? (
          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="py-12 text-center">
              <Bell className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-300 mb-2">No Notifications Yet</h3>
              <p className="text-gray-500">
                You'll receive notifications here when bookings are approved for your warehouses
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <Card
                key={notification.id}
                className={`border transition-all duration-200 ${
                  notification.metadata?.read
                    ? 'bg-gray-800/30 border-gray-700'
                    : 'bg-gray-800/60 border-blue-500/50 shadow-lg shadow-blue-500/10'
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`p-3 rounded-xl ${
                        notification.metadata?.notification_type === 'booking_approved'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {notification.metadata?.notification_type === 'booking_approved' 
                          ? <CheckCircle className="h-6 w-6" />
                          : <Calendar className="h-6 w-6" />
                        }
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-white">
                            {notification.metadata?.notification_type === 'booking_approved'
                              ? 'New Booking Approved!'
                              : 'Visit Request'
                            }
                          </h3>
                          {!notification.metadata?.read && (
                            <Badge className="bg-blue-500/20 text-blue-400 text-xs">New</Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 text-gray-400 text-sm mb-3">
                          <Building2 className="h-4 w-4" />
                          <span>{notification.metadata?.warehouse_name}</span>
                          <span>•</span>
                          <Clock className="h-4 w-4" />
                          <span>{formatDateTime(notification.created_at)}</span>
                        </div>

                        {notification.metadata?.notification_type === 'booking_approved' && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-900/50 rounded-lg p-4 mb-4">
                            <div>
                              <p className="text-gray-500 text-xs">Customer</p>
                              <p className="text-white text-sm font-medium">{notification.metadata?.seeker_name}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 text-xs">Blocks</p>
                              <p className="text-white text-sm font-medium">
                                {notification.metadata?.blocks_booked?.length || 0} blocks
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-500 text-xs">Duration</p>
                              <p className="text-white text-sm font-medium">
                                {formatDate(notification.metadata?.start_date)} - {formatDate(notification.metadata?.end_date)}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-500 text-xs">Amount</p>
                              <p className="text-green-400 text-sm font-bold">
                                ₹{notification.metadata?.total_amount?.toLocaleString()}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Expanded Details */}
                        {expandedId === notification.id && notification.metadata?.notification_type === 'booking_approved' && (
                          <div className="mt-4 p-4 bg-gray-900/50 rounded-lg border border-gray-700 space-y-3">
                            <h4 className="text-sm font-semibold text-gray-300 mb-3">Customer Details</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="flex items-center gap-2 text-gray-400">
                                <User className="h-4 w-4" />
                                <span className="text-sm">{notification.metadata?.seeker_name}</span>
                              </div>
                              <div className="flex items-center gap-2 text-gray-400">
                                <Mail className="h-4 w-4" />
                                <span className="text-sm">{notification.metadata?.seeker_email || 'Not provided'}</span>
                              </div>
                              <div className="flex items-center gap-2 text-gray-400">
                                <Phone className="h-4 w-4" />
                                <span className="text-sm">{notification.metadata?.seeker_phone || 'Not provided'}</span>
                              </div>
                            </div>
                            <div className="pt-2 border-t border-gray-700">
                              <p className="text-gray-500 text-xs mb-1">Payment Method</p>
                              <p className="text-white text-sm capitalize">{notification.metadata?.payment_method || 'Not specified'}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 ml-4">
                      {notification.metadata?.notification_type === 'booking_approved' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setExpandedId(expandedId === notification.id ? null : notification.id)}
                            className="border-gray-600 text-gray-300 hover:bg-gray-700"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            {expandedId === notification.id ? 'Hide' : 'Details'}
                          </Button>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => {
                              markAsRead(notification.id);
                              setSelectedReceipt(notification);
                            }}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            Receipt
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => generateReplyDraft(notification)}
                        disabled={draftLoadingId === notification.id}
                        className="border-gray-600 text-gray-300 hover:bg-gray-700"
                      >
                        <Sparkles className="h-4 w-4 mr-1" />
                        {draftLoadingId === notification.id ? 'Drafting...' : 'AI Reply'}
                      </Button>
                      {!notification.metadata?.read && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => markAsRead(notification.id)}
                          className="text-gray-400 hover:text-white"
                        >
                          Mark Read
                        </Button>
                      )}
                    </div>
                  </div>

                  {draftReplies[notification.id] && (
                    <div className="mt-4 rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
                      <p className="text-xs uppercase tracking-wide text-blue-300 mb-2">AI Reply Draft</p>
                      <p className="text-sm text-blue-100 whitespace-pre-line">
                        {draftReplies[notification.id]}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Receipt Modal */}
      {selectedReceipt && (
        <BookingReceipt
          isOpen={!!selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
          type="owner"
          booking={{
            id: selectedReceipt.metadata?.booking_id || selectedReceipt.id,
            warehouse_name: selectedReceipt.metadata?.warehouse_name || 'Warehouse',
            warehouse_location: '',
            seeker_name: selectedReceipt.metadata?.seeker_name || 'Customer',
            seeker_email: selectedReceipt.metadata?.seeker_email || '',
            seeker_phone: selectedReceipt.metadata?.seeker_phone || '',
            start_date: selectedReceipt.metadata?.start_date || '',
            end_date: selectedReceipt.metadata?.end_date || '',
            area_sqft: selectedReceipt.metadata?.area_sqft || 0,
            blocks_booked: selectedReceipt.metadata?.blocks_booked?.map((b: any) => b.block_number) || [],
            total_amount: selectedReceipt.metadata?.total_amount || 0,
            payment_method: selectedReceipt.metadata?.payment_method || 'Not specified',
            status: 'approved',
            created_at: selectedReceipt.created_at,
          }}
        />
      )}
    </div>
  );
}
