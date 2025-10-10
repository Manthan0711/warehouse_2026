# 🏗️ SmartWarehouse Setup Guide

This guide will help you set up the complete SmartWarehouse application with owner panel, admin notifications, and document verification.

## 📋 Prerequisites

- Node.js 18+ installed
- A Supabase account and project
- Git (for cloning the repository)

## 🚀 Quick Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**How to get Supabase credentials:**
1. Go to your Supabase project dashboard
2. Navigate to Settings > API
3. Copy the Project URL and anon/public key
4. Copy the service_role key (keep this secret!)

### 3. Database Setup

Run the database setup script:

```bash
node scripts/setup-database.js
```

This will:
- Create the `warehouse_submissions` table
- Create the `notifications` table
- Set up Row Level Security (RLS) policies
- Create storage buckets for images and documents

### 4. Start the Application

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## 🎯 Features Implemented

### ✅ Owner Panel/Module
- **List Warehouse Option**: Owners can submit warehouse listings through a multi-step form
- **Image Display**: Fixed image display issues in owner dashboard
- **Status Tracking**: Shows pending/approved/rejected status for each submission
- **Real-time Updates**: Dashboard refreshes automatically when status changes

### ✅ Admin Notification System
- **Automatic Notifications**: Admin receives notifications when new warehouses are submitted
- **Approval/Rejection**: Admin can approve or reject warehouse submissions
- **Owner Notifications**: Owners receive notifications when their submissions are reviewed
- **Real-time Updates**: Notifications appear instantly using Supabase real-time

### ✅ Document Viewing & Verification
- **Document Upload**: Support for GST certificates, property papers, and fire safety certificates
- **OCR Integration**: Document validation with confidence scores and anomaly detection
- **Admin Review**: Admins can view and verify all uploaded documents
- **Document Links**: Direct links to view documents in new tabs

## 🔧 Key Components

### Owner Dashboard (`/dashboard`)
- Shows all submitted warehouses with status
- Displays images properly with fallback
- Real-time status updates
- Quick access to list new properties

### Admin Dashboard (`/admin-dashboard`)
- Pending warehouse approvals
- Document verification interface
- Approve/reject functionality
- User management tools

### List Property (`/list-property`)
- Multi-step form (Basic Info → Pricing → Features → Documents → Review)
- Image upload with preview
- Document upload with validation
- OCR processing for document verification

### Notification System
- Real-time notifications in navbar
- Unread count badges
- Mark as read functionality
- Automatic notifications for status changes

## 🗄️ Database Schema

### `warehouse_submissions` Table
```sql
- id (UUID, Primary Key)
- owner_id (UUID, Foreign Key)
- name, description, address, city, state, pincode
- total_area, price_per_sqft
- amenities[], features[]
- images[] (array of image URLs)
- documents (JSONB with document URLs and validation results)
- status (pending/approved/rejected)
- admin_notes, rejection_reason
- submitted_at, reviewed_at, reviewed_by
```

### `notifications` Table
```sql
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key)
- type (approval/rejection/submission/booking/payment/system)
- title, message, link
- read (boolean)
- created_at
```

## 🔐 Security Features

- **Row Level Security (RLS)**: Users can only access their own data
- **Role-based Access**: Different permissions for owners, seekers, and admins
- **Document Validation**: OCR-based document verification
- **Secure File Storage**: Supabase Storage with proper access controls

## 🧪 Testing the Application

### 1. Test Owner Flow
1. Sign up as an owner
2. Go to "List Your Property"
3. Fill out the form and upload documents
4. Submit for approval
5. Check dashboard for status

### 2. Test Admin Flow
1. Sign in as admin (email contains 'admin')
2. Go to Admin Dashboard
3. Check "Warehouse Approvals" tab
4. Review submitted warehouses
5. Approve or reject submissions

### 3. Test Notifications
1. Submit a warehouse as owner
2. Check admin notifications
3. Approve/reject as admin
4. Check owner notifications

## 🐛 Troubleshooting

### Images Not Showing
- Check if image URLs are valid
- Verify Supabase Storage bucket permissions
- Check browser console for CORS errors

### Database Connection Issues
- Verify Supabase URL and keys in `.env`
- Check if RLS policies are properly set up
- Ensure tables exist in your Supabase project

### Notifications Not Working
- Check if real-time subscriptions are enabled
- Verify notification table exists
- Check browser console for WebSocket errors

## 📝 Development Notes

- The application uses placeholder images for testing
- Real file uploads require Supabase Storage buckets
- OCR processing is simulated with mock data
- All database operations use Supabase client

## 🚀 Production Deployment

For production deployment:

1. Set up proper Supabase Storage buckets
2. Configure CORS policies
3. Set up proper RLS policies
4. Enable real-time subscriptions
5. Configure proper environment variables
6. Set up monitoring and logging

## 📞 Support

If you encounter any issues:
1. Check the browser console for errors
2. Verify your Supabase configuration
3. Ensure all dependencies are installed
4. Check the database schema matches the code

---

**Happy coding! 🎉**
