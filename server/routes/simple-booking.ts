import { RequestHandler } from "express";
import { createClient } from '@supabase/supabase-js';

// Create Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://bsrzqffxgvdebyofmhzg.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Book warehouse blocks (grid-based booking)
export const bookWarehouseBlocks: RequestHandler = async (req, res) => {
    try {
        const {
            seeker_id,
            warehouse_id,
            blocks,
            start_date,
            end_date,
            total_amount,
            payment_method,
            customer_details
        } = req.body;

        console.log(`📦 Processing block booking for warehouse ${warehouse_id}`);

        if (!seeker_id || !warehouse_id || !blocks || !start_date || !end_date) {
            return res.status(400).json({
                success: false,
                error: 'Missing required booking fields'
            });
        }

        // Calculate total area from blocks
        const totalArea = blocks.reduce((sum: number, block: any) => sum + (block.area || 0), 0);

        // Fetch warehouse info
        const { data: warehouse, error: warehouseError } = await supabase
            .from('warehouses')
            .select('name, address, city, state')
            .eq('id', warehouse_id)
            .single();

        if (warehouseError) {
            console.error('Error fetching warehouse:', warehouseError);
        }

        // Create booking activity log with 'pending' status for admin review
        const { data: booking, error: bookingError } = await supabase
            .from('activity_logs')
            .insert({
                seeker_id,
                type: 'booking',
                description: `Block booking for ${warehouse?.name || 'Warehouse'} - ${blocks.length} blocks (${totalArea} sq ft)`,
                metadata: {
                    warehouse_id,
                    warehouse_name: warehouse?.name || 'Unknown Warehouse',
                    warehouse_address: warehouse?.address || '',
                    warehouse_city: warehouse?.city || '',
                    warehouse_state: warehouse?.state || '',
                    blocks_booked: blocks,
                    area_sqft: totalArea,
                    start_date,
                    end_date,
                    total_amount,
                    payment_method,
                    customer_details,
                    booking_status: 'pending',  // Changed from 'confirmed' to 'pending' for admin review
                    booking_type: 'block_booking'
                }
            })
            .select()
            .single();

        if (bookingError) {
            console.error('❌ Error creating booking:', bookingError);
            return res.status(500).json({
                success: false,
                error: 'Failed to create booking',
                details: bookingError.message
            });
        }

        console.log(`✅ Block booking created successfully with ID: ${booking.id}`);

        return res.json({
            success: true,
            booking: {
                id: booking.id,
                warehouse_id,
                blocks_booked: blocks,
                area_sqft: totalArea,
                start_date,
                end_date,
                total_amount,
                status: 'pending',
                created_at: booking.created_at
            },
            message: 'Booking submitted successfully! Awaiting admin approval.'
        });

    } catch (error) {
        console.error('❌ Block booking error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// Get available blocks for a warehouse
export const getAvailableBlocks: RequestHandler = async (req, res) => {
    try {
        const { warehouse_id } = req.query;

        if (!warehouse_id) {
            return res.status(400).json({
                success: false,
                error: 'Missing warehouse_id'
            });
        }

        console.log(`🔍 Fetching available blocks for warehouse ${warehouse_id}`);

        // Get all approved bookings for this warehouse to find occupied blocks
        const { data: bookings, error } = await supabase
            .from('activity_logs')
            .select('metadata')
            .eq('type', 'booking')
            .filter('metadata->>warehouse_id', 'eq', warehouse_id)
            .filter('metadata->>booking_status', 'eq', 'approved');

        if (error) {
            console.error('Error fetching bookings:', error);
        }

        // Extract booked blocks
        const bookedBlocks = new Set<string>();
        bookings?.forEach(booking => {
            const blocks = booking.metadata?.blocks_booked || [];
            blocks.forEach((block: any) => {
                if (block.id) bookedBlocks.add(block.id);
            });
        });

        // Fetch warehouse to get total blocks/grid config
        const { data: warehouse } = await supabase
            .from('warehouses')
            .select('area_sqft, metadata')
            .eq('id', warehouse_id)
            .single();

        // Generate grid layout (default 4x5 grid = 20 blocks)
        const gridConfig = warehouse?.metadata?.grid_config || { rows: 4, cols: 5 };
        const totalArea = warehouse?.area_sqft || 10000;
        const blockArea = Math.floor(totalArea / (gridConfig.rows * gridConfig.cols));

        const blocks = [];
        for (let row = 0; row < gridConfig.rows; row++) {
            for (let col = 0; col < gridConfig.cols; col++) {
                const blockId = `${row}-${col}`;
                blocks.push({
                    id: blockId,
                    row,
                    col,
                    area: blockArea,
                    available: !bookedBlocks.has(blockId),
                    label: `Block ${String.fromCharCode(65 + row)}${col + 1}`
                });
            }
        }

        console.log(`✅ Found ${blocks.filter(b => b.available).length} available blocks`);

        return res.json({
            success: true,
            blocks,
            grid_config: gridConfig,
            total_blocks: blocks.length,
            available_blocks: blocks.filter(b => b.available).length
        });

    } catch (error) {
        console.error('❌ Get blocks error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};
