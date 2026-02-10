import { RequestHandler } from "express";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://bsrzqffxgvdebyofmhzg.supabase.co";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, serviceRoleKey);

const buildWarehousePayload = (submission: any) => {
  const totalArea = Number(submission.total_area) || 0;
  const totalBlocks = Math.max(1, Math.floor(totalArea / 1000));
  const gridSize = Math.ceil(Math.sqrt(totalBlocks));

  return {
    wh_id: `SUB-${String(submission.id).substring(0, 8).toUpperCase()}`,
    owner_id: submission.owner_id,
    name: submission.name,
    description: submission.description,
    address: submission.address,
    city: submission.city,
    state: submission.state,
    pincode: submission.pincode,
    total_area: totalArea,
    price_per_sqft: Number(submission.price_per_sqft) || 0,
    images: submission.image_urls || [],
    amenities: submission.amenities || [],
    features: submission.features || [],
    warehouse_type: submission.warehouse_type || 'General Storage',
    allowed_goods_types: submission.allowed_goods_types || [],
    status: 'active',
    occupancy: 0,
    rating: 4.5,
    reviews_count: 0,
    total_blocks: totalBlocks,
    available_blocks: totalBlocks,
    grid_rows: gridSize,
    grid_cols: gridSize,
    source_submission_id: submission.id
  };
};

export const getWarehouseSubmissions: RequestHandler = async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('warehouse_submissions')
      .select('*')
      .order('submitted_at', { ascending: false });

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.json({ success: true, submissions: data || [] });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to load submissions' });
  }
};

export const reviewWarehouseSubmission: RequestHandler = async (req, res) => {
  try {
    const { submissionId, decision, adminNotes, rejectionReason, reviewedBy } = req.body || {};

    if (!submissionId || !decision) {
      return res.status(400).json({ success: false, error: 'submissionId and decision are required' });
    }

    const { data: submission, error: fetchError } = await supabase
      .from('warehouse_submissions')
      .select('*')
      .eq('id', submissionId)
      .single();

    if (fetchError || !submission) {
      return res.status(404).json({ success: false, error: 'Submission not found' });
    }

    const { error: updateError } = await supabase
      .from('warehouse_submissions')
      .update({
        status: decision,
        admin_notes: adminNotes || null,
        rejection_reason: decision === 'rejected' ? (rejectionReason || 'Rejected by admin') : null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewedBy || null
      })
      .eq('id', submissionId);

    if (updateError) {
      return res.status(500).json({ success: false, error: updateError.message });
    }

    let createdWarehouse: any = null;
    if (decision === 'approved') {
      const payload = buildWarehousePayload(submission);
      const { data: created, error: insertError } = await supabase
        .from('warehouses')
        .insert(payload)
        .select()
        .single();

      if (insertError) {
        return res.status(500).json({ success: false, error: insertError.message });
      }

      createdWarehouse = created || null;
    }

    return res.json({ success: true, warehouse: createdWarehouse });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to review submission' });
  }
};
