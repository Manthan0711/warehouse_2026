import "dotenv/config";
import express, { RequestHandler } from "express";
import cors from "cors";
import { createClient } from '@supabase/supabase-js';
import { handleDemo } from "./routes/demo";
import { handleRecommend } from "./routes/recommend";
import approveSubmissionRouter from "./routes/approveSubmission";
import debugRouter from "./routes/debug";

// Create Supabase client directly to avoid module resolution issues
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://bsrzqffxgvdebyofmhzg.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔧 Server index loaded - Supabase configured');

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
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API routes
  app.get("/api/ping", (_req, res) => {
    res.json({ message: process.env.PING_MESSAGE ?? "ping" });
  });

  app.get("/api/demo", handleDemo);
  app.post("/api/recommend", handleRecommend);
  app.post('/api/approve-submission', approveSubmissionRouter);
  app.use('/api/debug', debugRouter);

  // Admin booking routes (inline to avoid module issues)
  app.get("/api/admin/bookings", getAdminBookings);
  app.post("/api/admin/bookings/status", updateBookingStatus);
  app.get("/api/admin/bookings/stats", getBookingStats);

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

