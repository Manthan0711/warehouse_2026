import { RequestHandler } from "express";
import { createClient } from '@supabase/supabase-js';

// Create Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://bsrzqffxgvdebyofmhzg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const statusUsesCapacity = (status?: string) => ['pending', 'approved', 'confirmed', 'active'].includes(status || '');

const normalizeBlocks = (rawBlocks: any[]): Array<{ id: string; block_number: number; area: number }> => {
    return (rawBlocks || []).map((b: any, index: number) => {
        if (typeof b === 'number') {
            return { id: `block_${b}`, block_number: b, area: 100 };
        }
        const blockNum = Number(b?.block_number ?? (index + 1));
        return {
            id: String(b?.id || `block_${blockNum}`),
            block_number: blockNum,
            area: Number(b?.area || b?.area_sqft || 100)
        };
    });
};

const getBlockIds = (blocks: any[]): string[] => normalizeBlocks(blocks).map((b) => b.id);

const isDateOverlap = (aStart?: string, aEnd?: string, bStart?: string, bEnd?: string): boolean => {
    if (!aStart || !aEnd || !bStart || !bEnd) return false;
    const aS = new Date(aStart).getTime();
    const aE = new Date(aEnd).getTime();
    const bS = new Date(bStart).getTime();
    const bE = new Date(bEnd).getTime();
    return aS <= bE && bS <= aE;
};

const getUnavailableBlockIds = (bookingLogs: any[], startDate: string, endDate: string): Set<string> => {
    const unavailable = new Set<string>();
    for (const row of bookingLogs || []) {
        const md = row.metadata || {};
        const status = md.booking_status || 'pending';
        if (!statusUsesCapacity(status)) continue;
        if (!isDateOverlap(startDate, endDate, md.start_date, md.end_date)) continue;
        getBlockIds(md.blocks_booked || []).forEach((id) => unavailable.add(id));
    }
    return unavailable;
};

const updateWarehouseBlockState = async (
    warehouseId: string,
    targetBlockIds: string[],
    nextState: 'reserved' | 'occupied' | 'available',
    bookingMeta?: any
) => {
    let warehouseData: any = null;
    let warehouseTable = 'warehouses';
    let keyColumn = 'wh_id';

    let { data: mainWarehouse } = await supabase
        .from('warehouses')
        .select('id, wh_id, blocks, total_blocks, available_blocks, occupancy')
        .eq('wh_id', warehouseId)
        .maybeSingle();

    if (!mainWarehouse) {
        const { data: byId } = await supabase
            .from('warehouses')
            .select('id, wh_id, blocks, total_blocks, available_blocks, occupancy')
            .eq('id', warehouseId)
            .maybeSingle();
        mainWarehouse = byId;
        keyColumn = 'id';
    }

    if (mainWarehouse) {
        warehouseData = mainWarehouse;
    } else {
        const { data: submissionWarehouse } = await supabase
            .from('warehouse_submissions')
            .select('id, blocks, total_blocks, available_blocks, occupancy')
            .eq('id', warehouseId)
            .eq('status', 'approved')
            .maybeSingle();
        if (submissionWarehouse) {
            warehouseData = submissionWarehouse;
            warehouseTable = 'warehouse_submissions';
            keyColumn = 'id';
        }
    }

    if (!warehouseData || !Array.isArray(warehouseData.blocks) || warehouseData.blocks.length === 0) {
        return;
    }

    const targetSet = new Set(targetBlockIds);
    const updatedBlocks = warehouseData.blocks.map((block: any) => {
        const blockId = String(block?.id || `block_${block?.block_number}`);
        if (!targetSet.has(blockId)) return block;

        if (nextState === 'available') {
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
            status: nextState,
            booking_id: bookingMeta?.booking_id || block.booking_id || null,
            booked_by: bookingMeta?.booked_by || block.booked_by || null,
            booking_dates: bookingMeta?.booking_dates || block.booking_dates || null,
            reserved_at: nextState === 'reserved' ? new Date().toISOString() : block.reserved_at || new Date().toISOString(),
            occupied_at: nextState === 'occupied' ? new Date().toISOString() : block.occupied_at || null,
        };
    });

    const totalBlocks = Number(warehouseData.total_blocks) || updatedBlocks.length;
    const unavailableCount = updatedBlocks.filter((b: any) => ['reserved', 'occupied', 'booked'].includes(String(b.status))).length;
    const availableBlocks = Math.max(0, totalBlocks - unavailableCount);
    const occupancy = totalBlocks > 0 ? unavailableCount / totalBlocks : 0;

    await supabase
        .from(warehouseTable)
        .update({ blocks: updatedBlocks, available_blocks: availableBlocks, occupancy })
        .eq(keyColumn, warehouseId);
};

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
            goods_type,
            customer_details
        } = req.body;

        console.log(`📦 Processing block booking for warehouse ${warehouse_id}`);

        if (!seeker_id || !warehouse_id || !blocks || !start_date || !end_date) {
            return res.status(400).json({
                success: false,
                error: 'Missing required booking fields'
            });
        }

        if (!goods_type) {
            return res.status(400).json({
                success: false,
                error: 'Missing goods_type'
            });
        }

        const normalizedBlocks = normalizeBlocks(blocks);
        if (!normalizedBlocks.length) {
            return res.status(400).json({ success: false, error: 'At least one block must be selected' });
        }

        const totalArea = normalizedBlocks.reduce((sum: number, block: any) => sum + (block.area || 100), 0);

        // Fetch warehouse info - try main table first, then submissions
        // Warehouse ID could be wh_id (LIC007986) or UUID id
        let warehouse: any = null;
        let warehouseOwnerId: string | null = null;

        // Try by wh_id first (for LIC format IDs)
        let { data: mainWarehouse } = await supabase
            .from('warehouses')
            .select('name, address, city, state, owner_id')
            .eq('wh_id', warehouse_id)
            .maybeSingle();

        // If not found, try by id (UUID format)
        if (!mainWarehouse) {
            const { data: byId } = await supabase
                .from('warehouses')
                .select('name, address, city, state, owner_id')
                .eq('id', warehouse_id)
                .maybeSingle();
            mainWarehouse = byId;
        }

        if (mainWarehouse) {
            warehouse = mainWarehouse;
            warehouseOwnerId = mainWarehouse.owner_id || null;
            console.log(`✅ Found warehouse in main table, owner_id: ${warehouseOwnerId}`);
        } else {
            // Try warehouse_submissions for approved submissions (by id which is the submission ID)
            const { data: submissionWarehouse } = await supabase
                .from('warehouse_submissions')
                .select('name, address, city, state, owner_id')
                .eq('id', warehouse_id)
                .eq('status', 'approved')
                .maybeSingle();

            if (submissionWarehouse) {
                warehouse = submissionWarehouse;
                warehouseOwnerId = submissionWarehouse.owner_id || null;
                console.log(`✅ Found warehouse in submissions, owner_id: ${warehouseOwnerId}`);
            }
        }

        if (!warehouse) {
            console.log(`⚠️ Warehouse ${warehouse_id} not found in database, using provided details`);
        }

        // Validate that selected blocks are still available in requested date range
        const { data: existingBookings, error: existingError } = await supabase
            .from('activity_logs')
            .select('id, metadata')
            .eq('type', 'booking')
            .filter('metadata->>warehouse_id', 'eq', warehouse_id);

        if (existingError) {
            return res.status(500).json({ success: false, error: 'Failed to validate block availability', details: existingError.message });
        }

        const unavailableIds = getUnavailableBlockIds(existingBookings || [], start_date, end_date);
        const requestedIds = normalizedBlocks.map((b) => b.id);
        const conflicting = requestedIds.filter((id) => unavailableIds.has(id));

        if (conflicting.length > 0) {
            return res.status(409).json({
                success: false,
                error: 'Some selected blocks were just reserved by another booking. Please refresh availability.',
                conflictingBlocks: conflicting,
            });
        }

        // Create booking activity log with 'pending' status for admin review
        const { data: booking, error: bookingError } = await supabase
            .from('activity_logs')
            .insert({
                seeker_id,
                type: 'booking',
                description: `Block booking for ${warehouse?.name || 'Warehouse'} - ${normalizedBlocks.length} blocks (${totalArea} sq ft)`,
                metadata: {
                    warehouse_id,
                    warehouse_owner_id: warehouseOwnerId, // Store owner ID for notifications
                    warehouse_name: warehouse?.name || 'Unknown Warehouse',
                    warehouse_address: warehouse?.address || '',
                    warehouse_city: warehouse?.city || '',
                    warehouse_state: warehouse?.state || '',
                    blocks_booked: normalizedBlocks,
                    area_sqft: totalArea,
                    start_date,
                    end_date,
                    total_amount,
                    payment_method,
                    goods_type,
                    customer_details,
                    booking_status: 'pending',
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

        await updateWarehouseBlockState(
            warehouse_id,
            requestedIds,
            'reserved',
            {
                booking_id: booking.id,
                booked_by: customer_details?.email || customer_details?.name || 'Unknown',
                booking_dates: { start: start_date, end: end_date }
            }
        );

        if (warehouseOwnerId) {
            await supabase.from('activity_logs').insert({
                seeker_id: warehouseOwnerId,
                type: 'notification',
                description: `New booking request for ${warehouse?.name || 'your warehouse'} is pending admin review`,
                metadata: {
                    notification_type: 'booking_pending_review',
                    booking_id: booking.id,
                    warehouse_id,
                    warehouse_name: warehouse?.name || 'Warehouse',
                    seeker_name: customer_details?.name || 'Unknown',
                    seeker_email: customer_details?.email || '',
                    seeker_phone: customer_details?.phone || '',
                    blocks_booked: normalizedBlocks,
                    area_sqft: totalArea,
                    start_date,
                    end_date,
                    total_amount,
                    payment_method,
                    read: false
                }
            });
        }

        console.log(`✅ Block booking created successfully with ID: ${booking.id}`);

        return res.json({
            success: true,
            booking: {
                id: booking.id,
                warehouse_id,
                blocks_booked: normalizedBlocks,
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
        const { warehouse_id, start_date, end_date } = req.query;

        if (!warehouse_id) {
            return res.status(400).json({
                success: false,
                error: 'Missing warehouse_id'
            });
        }

        console.log(`🔍 Fetching available blocks for warehouse ${warehouse_id}`);

        // Get all capacity-consuming bookings for this warehouse and date range
        const { data: bookings, error } = await supabase
            .from('activity_logs')
            .select('id, metadata')
            .eq('type', 'booking')
            .filter('metadata->>warehouse_id', 'eq', String(warehouse_id));

        if (error) {
            console.error('Error fetching bookings:', error);
        }

        const bookedBlocks = new Set<string>();
        const filteredBookings = (bookings || []).filter((row: any) => {
            const status = row.metadata?.booking_status || 'pending';
            if (!statusUsesCapacity(status)) return false;
            if (!start_date || !end_date) return true;
            return isDateOverlap(String(start_date), String(end_date), row.metadata?.start_date, row.metadata?.end_date);
        });

        filteredBookings.forEach((booking: any) => {
            getBlockIds(booking.metadata?.blocks_booked || []).forEach((id) => bookedBlocks.add(id));
        });

        // Fetch warehouse to get total blocks/grid config
        let { data: warehouse } = await supabase
            .from('warehouses')
            .select('total_area, total_blocks, blocks')
            .eq('id', warehouse_id)
            .maybeSingle();

        if (!warehouse) {
            const { data: byWhId } = await supabase
                .from('warehouses')
                .select('total_area, total_blocks, blocks')
                .eq('wh_id', warehouse_id)
                .maybeSingle();
            warehouse = byWhId;
        }

        if (!warehouse) {
            const { data: submissionWarehouse } = await supabase
                .from('warehouse_submissions')
                .select('total_area, total_blocks, blocks')
                .eq('id', warehouse_id)
                .eq('status', 'approved')
                .maybeSingle();
            warehouse = submissionWarehouse;
        }

        let blocks: any[] = [];

        if (Array.isArray(warehouse?.blocks) && warehouse.blocks.length > 0) {
            blocks = warehouse.blocks.map((b: any, idx: number) => {
                const blockId = String(b?.id || `block_${b?.block_number || idx + 1}`);
                const blockNumber = Number(b?.block_number || idx + 1);
                const row = Number(b?.position_y || Math.floor(idx / 10));
                const col = Number(b?.position_x || idx % 10);
                const isUnavailable = bookedBlocks.has(blockId) || ['reserved', 'occupied', 'booked'].includes(String(b?.status || ''));
                return {
                    id: blockId,
                    block_number: blockNumber,
                    row,
                    col,
                    area: Number(b?.area || b?.area_sqft || 100),
                    available: !isUnavailable,
                    label: b?.label || `Block ${blockNumber}`
                };
            });
        } else {
            const totalBlocks = Number(warehouse?.total_blocks || 20);
            const cols = Math.ceil(Math.sqrt(totalBlocks));
            const rows = Math.ceil(totalBlocks / cols);
            const totalArea = Number(warehouse?.total_area || 10000);
            const blockArea = Math.max(1, Math.floor(totalArea / totalBlocks));

            for (let row = 0; row < rows; row++) {
                for (let col = 0; col < cols; col++) {
                    const blockNumber = row * cols + col + 1;
                    if (blockNumber > totalBlocks) break;
                    const blockId = `block_${blockNumber}`;
                    blocks.push({
                        id: blockId,
                        block_number: blockNumber,
                        row,
                        col,
                        area: blockArea,
                        available: !bookedBlocks.has(blockId),
                        label: `Block ${blockNumber}`
                    });
                }
            }
        }

        console.log(`✅ Found ${blocks.filter(b => b.available).length} available blocks`);

        return res.json({
            success: true,
            blocks,
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
