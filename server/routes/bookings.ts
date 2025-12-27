import { RequestHandler } from "express";
import { createClient } from '@supabase/supabase-js';

// Create Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://bsrzqffxgvdebyofmhzg.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Get seeker's bookings
export const getSeekerBookings: RequestHandler = async (req, res) => {
    try {
        const { seeker_id } = req.query;

        if (!seeker_id) {
            return res.status(400).json({
                success: false,
                error: 'Missing seeker_id parameter'
            });
        }

        console.log(`📊 Fetching bookings for seeker: ${seeker_id}`);

        // Fetch bookings from activity_logs
        const { data: bookingsData, error } = await supabase
            .from('activity_logs')
            .select('*')
            .eq('seeker_id', seeker_id)
            .eq('type', 'booking')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ Error fetching seeker bookings:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch bookings'
            });
        }

        const bookings = [];

        for (const booking of bookingsData || []) {
            const metadata = booking.metadata || {};
            const warehouseId = metadata.warehouse_id;

            // Map admin approval status to booking status for seeker view
            let status: 'active' | 'upcoming' | 'completed' | 'cancelled';
            const adminStatus = metadata.booking_status || 'pending';

            if (adminStatus === 'cancelled') {
                status = 'cancelled';
            } else if (adminStatus === 'rejected') {
                status = 'cancelled'; // Show rejected bookings as cancelled to seeker
            } else if (adminStatus === 'approved') {
                // Check if the booking period has started/ended for approved bookings
                const now = new Date();
                const startDate = new Date(metadata.start_date);
                const endDate = new Date(metadata.end_date);

                if (now < startDate) {
                    status = 'upcoming'; // Approved but not started yet
                } else if (now > endDate) {
                    status = 'completed'; // Approved and period has ended
                } else {
                    status = 'active'; // Approved and currently active
                }
            } else {
                // Pending or confirmed bookings are shown as upcoming
                status = 'upcoming';
            }

            // Use warehouse info from metadata
            const warehouseInfo = {
                name: metadata.warehouse_name || 'Unknown Warehouse',
                address: metadata.warehouse_address || 'Address not available',
                city: metadata.warehouse_city || 'Unknown',
                state: metadata.warehouse_state || 'Unknown'
            };

            bookings.push({
                id: booking.id,
                warehouse_id: warehouseId,
                warehouse_name: warehouseInfo.name,
                warehouse_location: `${warehouseInfo.city}, ${warehouseInfo.state}`,
                warehouse_address: warehouseInfo.address,
                start_date: metadata.start_date,
                end_date: metadata.end_date,
                total_amount: metadata.total_amount || metadata.monthly_rent,
                area_sqft: metadata.area_sqft,
                blocks_booked: metadata.blocks_booked || [],
                status,
                admin_status: adminStatus,
                created_at: booking.created_at,
                booking_type: metadata.booking_type || 'standard'
            });
        }

        console.log(`✅ Found ${bookings.length} bookings for seeker`);

        return res.json({
            success: true,
            bookings,
            total: bookings.length
        });

    } catch (error) {
        console.error('❌ Get seeker bookings error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// Cancel a booking
export const cancelBooking: RequestHandler = async (req, res) => {
    try {
        const { booking_id, seeker_id } = req.body;

        if (!booking_id || !seeker_id) {
            return res.status(400).json({
                success: false,
                error: 'Missing booking_id or seeker_id'
            });
        }

        console.log(`🚫 Cancelling booking ${booking_id}`);

        // Fetch the booking
        const { data: booking, error: fetchError } = await supabase
            .from('activity_logs')
            .select('*')
            .eq('id', booking_id)
            .eq('seeker_id', seeker_id)
            .eq('type', 'booking')
            .single();

        if (fetchError || !booking) {
            return res.status(404).json({
                success: false,
                error: 'Booking not found'
            });
        }

        // Update booking status to cancelled
        const updatedMetadata = {
            ...booking.metadata,
            booking_status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            cancelled_by: 'seeker'
        };

        const { error: updateError } = await supabase
            .from('activity_logs')
            .update({ metadata: updatedMetadata })
            .eq('id', booking_id);

        if (updateError) {
            return res.status(500).json({
                success: false,
                error: 'Failed to cancel booking'
            });
        }

        console.log(`✅ Booking ${booking_id} cancelled`);

        return res.json({
            success: true,
            message: 'Booking cancelled successfully'
        });

    } catch (error) {
        console.error('❌ Cancel booking error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// Generate invoice for a booking
export const generateInvoice: RequestHandler = async (req, res) => {
    try {
        const { booking_id } = req.params;

        if (!booking_id) {
            return res.status(400).json({
                success: false,
                error: 'Missing booking_id'
            });
        }

        console.log(`📄 Generating invoice for booking ${booking_id}`);

        // Fetch the booking
        const { data: booking, error } = await supabase
            .from('activity_logs')
            .select('*')
            .eq('id', booking_id)
            .eq('type', 'booking')
            .single();

        if (error || !booking) {
            return res.status(404).json({
                success: false,
                error: 'Booking not found'
            });
        }

        const metadata = booking.metadata || {};

        // Generate invoice data
        const invoice = {
            invoice_id: `INV-${booking_id.substring(0, 8).toUpperCase()}`,
            booking_id: booking.id,
            generated_at: new Date().toISOString(),
            customer: {
                name: metadata.customer_details?.name || 'N/A',
                email: metadata.customer_details?.email || 'N/A',
                phone: metadata.customer_details?.phone || 'N/A'
            },
            warehouse: {
                name: metadata.warehouse_name || 'Unknown Warehouse',
                address: metadata.warehouse_address || 'N/A',
                city: metadata.warehouse_city || 'N/A',
                state: metadata.warehouse_state || 'N/A'
            },
            booking_details: {
                start_date: metadata.start_date,
                end_date: metadata.end_date,
                area_sqft: metadata.area_sqft || 'N/A',
                blocks_booked: metadata.blocks_booked || []
            },
            payment: {
                total_amount: metadata.total_amount || 0,
                payment_method: metadata.payment_method || 'N/A',
                status: metadata.booking_status || 'pending'
            }
        };

        console.log(`✅ Invoice generated for booking ${booking_id}`);

        return res.json({
            success: true,
            invoice
        });

    } catch (error) {
        console.error('❌ Generate invoice error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};
