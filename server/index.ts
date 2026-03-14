import "dotenv/config";
import express, { RequestHandler } from "express";
import cors from "cors";
import { createClient } from '@supabase/supabase-js';
import { handleDemo } from "./routes/demo";
import { handleRecommend } from "./routes/recommend";
import approveSubmissionRouter from "./routes/approveSubmission";
import debugRouter from "./routes/debug";
import recommendPriceRouter from "./routes/recommend-price";
import productPricingRouter from "./routes/product-pricing";
import citiesRouter from "./routes/cities";

// Create Supabase client directly to avoid module resolution issues
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://bsrzqffxgvdebyofmhzg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔧 Server index loaded - Supabase configured');

const normalizeBookingBlockIds = (blocks: any[]): string[] => {
  return (blocks || []).map((b: any, idx: number) => {
    if (typeof b === 'number') return `block_${b}`;
    if (typeof b === 'string') return b;
    if (b?.id) return String(b.id);
    const blockNum = Number(b?.block_number || idx + 1);
    return `block_${blockNum}`;
  });
};

const applyBlockStateTransition = async (
  warehouseId: string,
  blockIds: string[],
  status: 'approved' | 'rejected' | 'cancelled' | 'pending',
  bookingMeta: any,
  bookingId: string
) => {
  if (!warehouseId || !blockIds.length) return;

  let warehouseData: any = null;
  let warehouseTable = 'warehouses';
  let idColumn = 'wh_id';

  let { data: mainWarehouse } = await supabase
    .from('warehouses')
    .select('id, wh_id, blocks, total_blocks')
    .eq('wh_id', warehouseId)
    .maybeSingle();

  if (!mainWarehouse) {
    const { data: byId } = await supabase
      .from('warehouses')
      .select('id, wh_id, blocks, total_blocks')
      .eq('id', warehouseId)
      .maybeSingle();
    mainWarehouse = byId;
    idColumn = 'id';
  }

  if (mainWarehouse) {
    warehouseData = mainWarehouse;
  } else {
    const { data: submissionWarehouse } = await supabase
      .from('warehouse_submissions')
      .select('id, blocks, total_blocks')
      .eq('id', warehouseId)
      .eq('status', 'approved')
      .maybeSingle();

    if (submissionWarehouse) {
      warehouseData = submissionWarehouse;
      warehouseTable = 'warehouse_submissions';
      idColumn = 'id';
    }
  }

  if (!warehouseData || !Array.isArray(warehouseData.blocks) || warehouseData.blocks.length === 0) return;

  const blockSet = new Set(blockIds);
  const nextBlockState = status === 'approved' ? 'occupied' : status === 'pending' ? 'reserved' : 'available';

  const updatedBlocks = warehouseData.blocks.map((block: any) => {
    const blockId = String(block?.id || `block_${block?.block_number}`);
    if (!blockSet.has(blockId)) return block;

    if (nextBlockState === 'available') {
      return {
        ...block,
        status: 'available',
        booking_id: null,
        booked_by: null,
        booking_dates: null,
        reserved_at: null,
        occupied_at: null,
      };
    }

    return {
      ...block,
      status: nextBlockState,
      booking_id: bookingId,
      booked_by: bookingMeta?.customer_details?.email || bookingMeta?.customer_details?.name || block.booked_by,
      booking_dates: {
        start: bookingMeta?.start_date,
        end: bookingMeta?.end_date,
      },
      reserved_at: nextBlockState === 'reserved' ? new Date().toISOString() : (block.reserved_at || new Date().toISOString()),
      occupied_at: nextBlockState === 'occupied' ? new Date().toISOString() : null,
    };
  });

  const totalBlocks = Number(warehouseData.total_blocks) || updatedBlocks.length;
  const unavailableCount = updatedBlocks.filter((b: any) => ['reserved', 'occupied', 'booked'].includes(String(b.status))).length;
  const availableBlocks = Math.max(0, totalBlocks - unavailableCount);
  const occupancy = totalBlocks > 0 ? unavailableCount / totalBlocks : 0;

  const { error: blockUpdateError } = await supabase
    .from(warehouseTable)
    .update({ blocks: updatedBlocks, available_blocks: availableBlocks, occupancy })
    .eq(idColumn, warehouseId);

  if (blockUpdateError) {
    console.error(`⚠️ Failed to update block status:`, blockUpdateError);
  }
};

// Admin booking handlers defined inline
const getAdminBookings: RequestHandler = async (req, res) => {
  try {
    console.log('📊 Fetching admin bookings from activity_logs...');

    const { data: bookingLogs, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('type', 'booking')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching bookings:', error);
      return res.json({ success: true, bookings: [], total: 0, message: 'No bookings found or table does not exist' });
    }

    const bookings = bookingLogs?.map(log => ({
      id: log.id,
      seeker_name: log.metadata?.customer_details?.name || 'Unknown',
      seeker_email: log.metadata?.customer_details?.email || 'N/A',
      warehouse_name: log.metadata?.warehouse_name || 'Unknown Warehouse',
      warehouse_location: `${log.metadata?.warehouse_city || ''}, ${log.metadata?.warehouse_state || ''}`,
      start_date: log.metadata?.start_date,
      end_date: log.metadata?.end_date,
      total_amount: log.metadata?.total_amount || 0,
      area_sqft: log.metadata?.area_sqft,
      status: log.metadata?.booking_status || 'pending',
      created_at: log.created_at,
      booking_notes: log.description
    })) || [];

    console.log(`✅ Found ${bookings.length} bookings`);
    return res.json({ success: true, bookings, total: bookings.length });
  } catch (error) {
    console.error('❌ Admin bookings error:', error);
    return res.json({ success: true, bookings: [], total: 0 });
  }
};

const getBookingStats: RequestHandler = async (req, res) => {
  try {
    console.log('📈 Fetching booking stats...');

    const { data: logs, error } = await supabase
      .from('activity_logs')
      .select('metadata, created_at')
      .eq('type', 'booking');

    const stats = {
      total_bookings: logs?.length || 0,
      pending_bookings: 0,
      approved_bookings: 0,
      rejected_bookings: 0,
      total_revenue: 0,
      new_bookings_24h: 0
    };

    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    logs?.forEach(log => {
      const status = log.metadata?.booking_status || 'pending';
      if (status === 'pending') stats.pending_bookings++;
      else if (status === 'approved') stats.approved_bookings++;
      else if (status === 'rejected') stats.rejected_bookings++;

      if (status === 'approved' && log.metadata?.total_amount) {
        stats.total_revenue += log.metadata.total_amount;
      }
      if (new Date(log.created_at) > yesterday) stats.new_bookings_24h++;
    });

    console.log('✅ Stats calculated:', stats);
    return res.json({ success: true, stats });
  } catch (error) {
    console.error('❌ Stats error:', error);
    return res.json({ success: true, stats: { total_bookings: 0, pending_bookings: 0, approved_bookings: 0, rejected_bookings: 0, total_revenue: 0, new_bookings_24h: 0 } });
  }
};

const updateBookingStatus: RequestHandler = async (req, res) => {
  try {
    const { bookingId, status, adminNotes } = req.body;
    console.log(`📝 Updating booking ${bookingId} to ${status}`);

    if (!bookingId || !status) {
      return res.status(400).json({ success: false, error: 'Missing bookingId or status' });
    }

    const { data: existing, error: fetchError } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    const updatedMetadata = {
      ...existing.metadata,
      booking_status: status,
      admin_notes: adminNotes || '',
      status_updated_at: new Date().toISOString()
    };

    const { error: updateError } = await supabase
      .from('activity_logs')
      .update({ metadata: updatedMetadata })
      .eq('id', bookingId);

    if (updateError) {
      return res.status(500).json({ success: false, error: updateError.message });
    }

    // Update warehouse block states for status transition
    if (existing.metadata?.warehouse_id) {
      const warehouseId = existing.metadata.warehouse_id;
      const blockIds = normalizeBookingBlockIds(existing.metadata.blocks_booked || []);
      if (blockIds.length > 0) {
        await applyBlockStateTransition(warehouseId, blockIds, status, existing.metadata, bookingId);
      }
    }

    // Notify warehouse owner for booking status updates
    if (['approved', 'rejected', 'cancelled'].includes(status) && existing.metadata?.warehouse_id) {
      const warehouseId = existing.metadata.warehouse_id;
      
      // Try to find the warehouse owner - first check if stored in booking metadata
      let ownerId = existing.metadata?.warehouse_owner_id || null;
      
      // If not in metadata, try to find from warehouse tables
      if (!ownerId) {
        console.log(`🔍 Looking up owner for warehouse: ${warehouseId}`);
        
        // Try by wh_id first (for LIC format IDs)
        let { data: mainWarehouse } = await supabase
          .from('warehouses')
          .select('owner_id, wh_id')
          .eq('wh_id', warehouseId)
          .maybeSingle();
        
        // If not found, try by id (UUID format)
        if (!mainWarehouse) {
          const { data: byId } = await supabase
            .from('warehouses')
            .select('owner_id, wh_id')
            .eq('id', warehouseId)
            .maybeSingle();
          mainWarehouse = byId;
        }
      
        if (mainWarehouse?.owner_id) {
          ownerId = mainWarehouse.owner_id;
          console.log(`✅ Found owner from warehouses table: ${ownerId}`);
        } else {
          // Try warehouse_submissions for approved submissions
          const { data: submissionWarehouse } = await supabase
            .from('warehouse_submissions')
            .select('owner_id')
            .eq('id', warehouseId)
            .eq('status', 'approved')
            .maybeSingle();
          
          if (submissionWarehouse?.owner_id) {
            ownerId = submissionWarehouse.owner_id;
            console.log(`✅ Found owner from submissions table: ${ownerId}`);
          }
        }
      }

      // If we found an owner, create a notification for them
      if (ownerId) {
        const bookingDetails = existing.metadata;
        const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
        const notificationDescription = `Booking ${statusLabel} for ${bookingDetails.warehouse_name || 'your warehouse'}.
          ${bookingDetails.blocks_booked?.length || 0} blocks (${bookingDetails.area_sqft || 0} sq ft)
          from ${new Date(bookingDetails.start_date).toLocaleDateString()} to ${new Date(bookingDetails.end_date).toLocaleDateString()}
          Amount: ₹${bookingDetails.total_amount?.toLocaleString() || 0}`;

        const { error: notifError } = await supabase.from('activity_logs').insert({
          seeker_id: ownerId, // owner receives the notification (seeker_id is user_id here)
          type: 'notification',
          description: notificationDescription,
          metadata: {
            notification_type: `booking_${status}`,
            booking_id: bookingId,
            warehouse_id: warehouseId,
            warehouse_name: bookingDetails.warehouse_name,
            seeker_name: bookingDetails.customer_details?.name || 'Unknown',
            seeker_email: bookingDetails.customer_details?.email || '',
            seeker_phone: bookingDetails.customer_details?.phone || '',
            blocks_booked: bookingDetails.blocks_booked,
            area_sqft: bookingDetails.area_sqft,
            start_date: bookingDetails.start_date,
            end_date: bookingDetails.end_date,
            total_amount: bookingDetails.total_amount,
            payment_method: bookingDetails.payment_method,
            read: false
          }
        });
        
        if (notifError) {
          console.error(`❌ Failed to create notification:`, notifError);
        } else {
          console.log(`📧 Owner notification created for user ${ownerId}`);
        }
      } else {
        console.log(`⚠️ Could not find owner for warehouse ${warehouseId}`);
        console.log(`   Booking metadata warehouse_owner_id: ${existing.metadata?.warehouse_owner_id}`);
      }
    }

    console.log(`✅ Booking ${bookingId} updated to ${status}`);
    return res.json({ success: true, message: `Booking ${status} successfully` });
  } catch (error) {
    console.error('❌ Update error:', error);
    return res.status(500).json({ success: false, error: 'Internal error' });
  }
};

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  // API routes
  app.get("/api/ping", (_req, res) => {
    res.json({ message: process.env.PING_MESSAGE ?? "ping" });
  });

  app.get("/api/demo", handleDemo);
  app.post("/api/recommend", handleRecommend);
  app.post('/api/approve-submission', approveSubmissionRouter);
  app.use('/api/debug', debugRouter);

  // New AI-powered features
  app.use('/api/recommend-price', recommendPriceRouter);
  app.use('/api/product-pricing', productPricingRouter);
  app.use('/api/cities', citiesRouter);

  // Admin booking routes (inline to avoid module issues)
  app.get("/api/admin/bookings", getAdminBookings);
  app.post("/api/admin/bookings/status", updateBookingStatus);
  app.get("/api/admin/bookings/stats", getBookingStats);

  // Owner warehouse submission routes (uses service role key to bypass RLS)
  app.post("/api/warehouse-submissions", async (req, res) => {
    try {
      const { createWarehouseSubmission } = await import("./routes/warehouse-submissions");
      return createWarehouseSubmission(req, res, () => { });
    } catch (error) {
      console.error('Submission route error:', error);
      return res.status(500).json({ success: false, error: 'Route loading error' });
    }
  });

  app.get("/api/warehouse-submissions/owner/:ownerId", async (req, res) => {
    try {
      const { getOwnerSubmissions } = await import("./routes/warehouse-submissions");
      return getOwnerSubmissions(req, res, () => { });
    } catch (error) {
      return res.status(500).json({ success: false, error: 'Route loading error' });
    }
  });

  app.post("/api/warehouse-submissions/upload", async (req, res) => {
    try {
      const { uploadFile } = await import("./routes/warehouse-submissions");
      return uploadFile(req, res, () => { });
    } catch (error) {
      return res.status(500).json({ success: false, error: 'Route loading error' });
    }
  });

  // Admin warehouse submission routes
  app.get("/api/admin/warehouse-submissions", async (req, res) => {
    try {
      const { getWarehouseSubmissions } = await import("./routes/admin-warehouse-submissions");
      return getWarehouseSubmissions(req, res, () => { });
    } catch (error) {
      return res.status(500).json({ success: false, error: 'Route loading error' });
    }
  });

  app.post("/api/admin/warehouse-submissions/review", async (req, res) => {
    try {
      const { reviewWarehouseSubmission } = await import("./routes/admin-warehouse-submissions");
      return reviewWarehouseSubmission(req, res, () => { });
    } catch (error) {
      return res.status(500).json({ success: false, error: 'Route loading error' });
    }
  });

  app.get("/api/admin/user-activity", async (req, res) => {
    try {
      const { getAdminUserActivity } = await import("./routes/admin-user-activity");
      return getAdminUserActivity(req, res, () => { });
    } catch (error) {
      return res.status(500).json({ success: false, error: 'Route loading error' });
    }
  });

  // Seeker booking routes (import from bookings.ts)
  // These are dynamically imported to avoid Vite module issues
  app.get("/api/bookings", async (req, res) => {
    try {
      const { getSeekerBookings } = await import("./routes/bookings");
      return getSeekerBookings(req, res, () => { });
    } catch (error) {
      console.error('Error loading seeker bookings route:', error);
      return res.status(500).json({ success: false, error: 'Route loading error' });
    }
  });

  app.post("/api/bookings/cancel", async (req, res) => {
    try {
      const { cancelBooking } = await import("./routes/bookings");
      return cancelBooking(req, res, () => { });
    } catch (error) {
      return res.status(500).json({ success: false, error: 'Route loading error' });
    }
  });

  app.get("/api/bookings/invoice/:booking_id", async (req, res) => {
    try {
      const { generateInvoice } = await import("./routes/bookings");
      return generateInvoice(req, res, () => { });
    } catch (error) {
      return res.status(500).json({ success: false, error: 'Route loading error' });
    }
  });

  // Admin dashboard stats API
  app.get("/api/admin/dashboard-stats", async (req, res) => {
    try {
      const { getDashboardStats } = await import("./routes/analytics");
      return getDashboardStats(req, res, () => { });
    } catch (error) {
      console.error('Dashboard stats route error:', error);
      return res.status(500).json({ success: false, error: 'Route loading error' });
    }
  });

  // Analytics routes
  app.get("/api/analytics/admin", async (req, res) => {
    try {
      const { getAdminAnalytics } = await import("./routes/analytics");
      return getAdminAnalytics(req, res, () => { });
    } catch (error) {
      console.error('Analytics route error:', error);
      return res.status(500).json({ success: false, error: 'Route loading error' });
    }
  });

  app.get("/api/analytics/filters", async (req, res) => {
    try {
      const { getAnalyticsFilters } = await import("./routes/analytics");
      return getAnalyticsFilters(req, res, () => { });
    } catch (error) {
      console.error('Filters route error:', error);
      return res.status(500).json({ success: false, error: 'Route loading error' });
    }
  });

  app.get("/api/analytics/warehouses", async (req, res) => {
    try {
      const { getWarehouseList } = await import("./routes/analytics");
      return getWarehouseList(req, res, () => { });
    } catch (error) {
      console.error('Warehouse list route error:', error);
      return res.status(500).json({ success: false, error: 'Route loading error' });
    }
  });

  app.get("/api/analytics/warehouse/:id", async (req, res) => {
    try {
      const { getWarehouseDetail } = await import("./routes/analytics");
      return getWarehouseDetail(req, res, () => { });
    } catch (error) {
      console.error('Warehouse detail route error:', error);
      return res.status(500).json({ success: false, error: 'Route loading error' });
    }
  });

  app.get("/api/analytics/owner/:ownerId", async (req, res) => {
    try {
      const { getOwnerAnalytics } = await import("./routes/analytics");
      return getOwnerAnalytics(req, res, () => { });
    } catch (error) {
      console.error('Owner analytics route error:', error);
      return res.status(500).json({ success: false, error: 'Route loading error' });
    }
  });

  // Owner booking routes (view bookings for owned warehouses + approve/reject)
  app.get("/api/owner/bookings", async (req, res) => {
    try {
      const { getOwnerBookings } = await import("./routes/owner-bookings");
      return getOwnerBookings(req, res, () => { });
    } catch (error) {
      console.error('Owner bookings route error:', error);
      return res.status(500).json({ success: false, error: 'Route loading error' });
    }
  });

  app.post("/api/owner/bookings/respond", async (req, res) => {
    try {
      const { respondToBooking } = await import("./routes/owner-bookings");
      return respondToBooking(req, res, () => { });
    } catch (error) {
      console.error('Owner booking respond route error:', error);
      return res.status(500).json({ success: false, error: 'Route loading error' });
    }
  });

  // Block booking routes (grid-based booking)
  app.post("/api/bookings/blocks", async (req, res) => {
    try {
      const { bookWarehouseBlocks } = await import("./routes/simple-booking");
      return bookWarehouseBlocks(req, res, () => { });
    } catch (error) {
      return res.status(500).json({ success: false, error: 'Route loading error' });
    }
  });

  app.get("/api/bookings/blocks/available", async (req, res) => {
    try {
      const { getAvailableBlocks } = await import("./routes/simple-booking");
      return getAvailableBlocks(req, res, () => { });
    } catch (error) {
      return res.status(500).json({ success: false, error: 'Route loading error' });
    }
  });

  // Saved warehouses routes
  app.post("/api/saved/toggle", async (req, res) => {
    try {
      const { toggleSavedWarehouse } = await import("./routes/saved");
      return toggleSavedWarehouse(req, res, () => { });
    } catch (error) {
      console.error('Error loading saved toggle route:', error);
      return res.status(500).json({ success: false, error: 'Route loading error' });
    }
  });

  app.get("/api/saved/:seekerId", async (req, res) => {
    try {
      const { getSavedWarehouses } = await import("./routes/saved");
      return getSavedWarehouses(req, res, () => { });
    } catch (error) {
      console.error('Error loading get saved route:', error);
      return res.status(500).json({ success: false, warehouses: [], error: 'Route loading error' });
    }
  });

  app.get("/api/saved/:seekerId/status/:warehouseId", async (req, res) => {
    try {
      const { checkSavedStatus } = await import("./routes/saved");
      return checkSavedStatus(req, res, () => { });
    } catch (error) {
      console.error('Error loading check saved status route:', error);
      return res.status(500).json({ success: false, saved: false, error: 'Route loading error' });
    }
  });

  // Activity routes
  app.post("/api/activity/log", async (req, res) => {
    try {
      const { logActivity } = await import("./routes/activity");
      return logActivity(req, res, () => { });
    } catch (error) {
      console.error('Error loading log activity route:', error);
      return res.status(500).json({ success: false, error: 'Route loading error' });
    }
  });

  app.get("/api/activity/:seekerId", async (req, res) => {
    try {
      const { getActivityTimeline } = await import("./routes/activity");
      return getActivityTimeline(req, res, () => { });
    } catch (error) {
      console.error('Error loading get activity timeline route:', error);
      return res.status(500).json({ success: false, activities: [], error: 'Route loading error' });
    }
  });

  app.get("/api/activity/:seekerId/stats", async (req, res) => {
    try {
      const { getActivityStats } = await import("./routes/activity");
      return getActivityStats(req, res, () => { });
    } catch (error) {
      console.error('Error loading get activity stats route:', error);
      return res.json({ 
        success: true, 
        stats: {
          activities: { total: 0, bookings: 0, inquiries: 0, payments: 0, cancellations: 0 },
          inquiries: { total: 0, open: 0, responded: 0, closed: 0 },
          savedWarehouses: 0
        }
      });
    }
  });

  // Inquiry routes
  app.post("/api/inquiries/send", async (req, res) => {
    try {
      const { sendInquiry } = await import("./routes/activity");
      return sendInquiry(req, res, () => { });
    } catch (error) {
      console.error('Error loading send inquiry route:', error);
      return res.status(500).json({ success: false, error: 'Route loading error' });
    }
  });

  app.get("/api/inquiries/:seekerId", async (req, res) => {
    try {
      const { getSeekerInquiries } = await import("./routes/activity");
      return getSeekerInquiries(req, res, () => { });
    } catch (error) {
      console.error('Error loading get inquiries route:', error);
      return res.json({ success: true, inquiries: [] });
    }
  });

  // Schedule visit routes
  app.post("/api/schedule-visit", async (req, res) => {
    try {
      const { scheduleVisit } = await import("./routes/schedule-visit");
      return scheduleVisit(req, res, () => { });
    } catch (error) {
      console.error('Error loading schedule visit route:', error);
      return res.status(500).json({ success: false, error: 'Route loading error' });
    }
  });

  app.get("/api/visits/owner", async (req, res) => {
    try {
      const { getOwnerVisitRequests } = await import("./routes/schedule-visit");
      return getOwnerVisitRequests(req, res, () => { });
    } catch (error) {
      console.error('Error loading get owner visits route:', error);
      return res.json({ success: true, visits: [] });
    }
  });

  app.post("/api/visits/status", async (req, res) => {
    try {
      const { updateVisitStatus } = await import("./routes/schedule-visit");
      return updateVisitStatus(req, res, () => { });
    } catch (error) {
      console.error('Error loading update visit status route:', error);
      return res.status(500).json({ success: false, error: 'Route loading error' });
    }
  });

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, time: new Date().toISOString() });
  });

  app.get("/api/recommend", (_req, res) => {
    res.status(405).json({
      message: "Use POST with JSON body to get recommendations.",
      example: {
        preferences: {
          district: "Pune",
          targetPrice: 6.5,
          minAreaSqft: 60000,
          preferredType: "Industrial logistics parks",
          preferVerified: true,
          preferAvailability: true,
        },
        limit: 5,
      },
    });
  });

  console.log('✅ All routes registered including admin booking routes');
  return app;
}

