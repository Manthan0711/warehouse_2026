# 🚀 QUICK COPY-PASTE GUIDE - IMPORT 10,000 WAREHOUSES

## ⚡ STEP 1: DROP & RECREATE TABLE (1 minute)

1. **Go to Supabase SQL Editor:**
   https://supabase.com/dashboard/project/bsrzqffxgvdebyofmhzg/sql

2. **Copy this ENTIRE block and click "Run":**

```sql
-- Drop existing table (if any)
DROP TABLE IF EXISTS warehouses CASCADE;

-- Create warehouses table with correct schema
CREATE TABLE warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wh_id text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  address text NOT NULL,
  city text NOT NULL,
  district text NOT NULL,
  state text NOT NULL DEFAULT 'Maharashtra',
  pincode text,
  latitude numeric,
  longitude numeric,
  total_area integer NOT NULL,
  capacity integer NOT NULL,
  price_per_sqft numeric NOT NULL,
  micro_rental_spaces integer DEFAULT 0,
  images text[] DEFAULT '{}',
  amenities text[] DEFAULT '{}',
  features text[] DEFAULT '{}',
  status text DEFAULT 'active',
  occupancy numeric DEFAULT 0.5,
  rating numeric DEFAULT 4.0,
  reviews_count integer DEFAULT 0,
  warehouse_type text,
  ownership_certificate text,
  owner_name text,
  owner_email text,
  owner_phone text,
  registration_date date,
  license_valid_upto date,
  total_blocks integer DEFAULT 100,
  available_blocks integer DEFAULT 50,
  grid_rows integer DEFAULT 10,
  grid_cols integer DEFAULT 10,
  owner_id uuid,
  contact_person text,
  contact_phone text,
  contact_email text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_warehouses_city ON warehouses(city);
CREATE INDEX idx_warehouses_district ON warehouses(district);
CREATE INDEX idx_warehouses_state ON warehouses(state);
CREATE INDEX idx_warehouses_status ON warehouses(status);
CREATE INDEX idx_warehouses_price ON warehouses(price_per_sqft);
CREATE INDEX idx_warehouses_rating ON warehouses(rating DESC);
CREATE INDEX idx_warehouses_type ON warehouses(warehouse_type);

-- Enable Row Level Security
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;

-- Public read access (anyone can view)
CREATE POLICY "Public read access"
ON warehouses FOR SELECT
USING (true);

-- Service role full access (for imports)
CREATE POLICY "Service role full access"
ON warehouses
TO service_role
USING (true)
WITH CHECK (true);
```

3. **Wait for "Success. No rows returned"**

✅ **Done!** Table is ready for import.

---

## ⚡ STEP 2: IMPORT WAREHOUSES (5 minutes)

Now run the import script:

```bash
npm run import-via-api
```

This will import all 10,000 warehouses automatically!

---

## 🔍 STEP 3: VERIFY IMPORT (30 seconds)

After import completes, verify in Supabase SQL Editor:

```sql
SELECT COUNT(*) as total FROM warehouses;
```

**Should return: 10000**

Check some sample data:

```sql
SELECT wh_id, name, city, rating, capacity
FROM warehouses
LIMIT 10;
```

---

## ✅ THAT'S IT!

1. ✅ Copy-paste SQL to create table (1 min)
2. ✅ Run `npm run import-via-api` (5 min)
3. ✅ Verify with SELECT queries (30 sec)
4. ✅ Hard refresh your app (Ctrl+Shift+R)

**Total time: ~7 minutes**

Your app will now have all 10,000 warehouses! 🎉
