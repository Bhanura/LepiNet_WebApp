# LepiNet Web Platform - System Overview

## 🚀 Major System Refactoring Completed

This system has been comprehensively refactored to implement a robust role-based access control system with three distinct user types and their respective functionalities.

## 👥 User Roles & Access Control

### 1. Super Admins
**Purpose:** System management and oversight, NOT using the app's core features

**Access:** `/admin/dashboard`

**Functions:**
- **User Management:**
  - Search, filter users by role/status
  - Edit user details
  - Change user roles (user/expert/admin)
  - Ban/unban users
  - Delete users

- **Verification Management:**
  - Review expert verification requests
  - Approve/reject applications
  - View applicant credentials (bio, experience, LinkedIn)

- **System Statistics:**
  - Total users count
  - Verified experts count
  - Total records in system
  - Unreviewed records count
  - Pending verification requests
  - System health monitoring

### 2. Regular Users
**Purpose:** Upload butterfly observations, view records

**Access:** `/dashboard`

**Functions:**
- View/edit profile
- View all uploaded records
- Request expert verification
- Browse all community records
- View expert reviews on records
- Receive notifications

### 3. Verified Experts
**Purpose:** Same as users + ability to review and validate observations

**Access:** `/dashboard` (same as regular users)

**Additional Functions:**
- Review butterfly records (`/review/[id]`)
- Add expert opinions
- Mark confidence level (certain/uncertain)
- Flag new discoveries
- Comment on other expert reviews
- Receive notifications when others comment on their reviews

## 📁 Key Pages & Routes

### Public Routes
- `/` - Home page
- `/login` - Login (redirects based on role)
- `/signup` - User registration

### User/Expert Routes (Protected)
- `/dashboard` - Unified dashboard for users and experts
- `/records` - Browse all records with filters
- `/records/[id]` - View record details with reviews
- `/review/[id]` - Add expert review (verified experts only)
- `/profile` - View/edit profile
- `/expert-application` - Apply for expert verification

### Admin Routes (Protected)
- `/admin/dashboard` - Super admin control panel

## 🔐 Authentication & Authorization

**Middleware:** `middleware.ts`
- Automatic route protection
- Role-based redirection
- Session validation

**Login Flow:**
1. User enters credentials
2. System fetches user role from database
3. Redirects based on role:
   - `admin` → `/admin/dashboard`
   - `user` or `verified expert` → `/dashboard`

## 💾 Database Schema Updates

### New Tables

#### `review_comments`
Allows experts to comment on reviews
```sql
- id (uuid)
- review_id (uuid) → expert_reviews.id
- commenter_id (uuid) → auth.users.id
- comment_text (text)
- created_at (timestamp)
```

#### `notifications`
System notifications for users
```sql
- id (uuid)
- user_id (uuid)
- type (enum: review_comment, verification_status, role_change)
- title (text)
- message (text)
- related_id (uuid)
- is_read (boolean)
- created_at (timestamp)
```

#### `user_activity_logs`
Track user contributions for admins
```sql
- id (uuid)
- user_id (uuid)
- activity_type (enum: record_upload, review_submitted, comment_posted)
- related_id (uuid)
- created_at (timestamp)
```

### Database Views

#### `records_with_stats`
Optimized view for record listings with review counts
```sql
SELECT ai_logs.*, 
       COUNT(expert_reviews) as review_count,
       COUNT(review_comments) as comment_count,
       uploader info
```

### Triggers & Functions

#### `notify_review_author()`
Automatically creates notifications when someone comments on a review

## 🎨 UI/UX Features

### Records List (`/records/page.tsx`)
- **Adapter Pattern:** Records displayed as cards in a grid
- **Summary Details:**
  - Review count badge
  - Verification status
  - AI confidence (if unverified)
  - Upload date
- **Filters:**
  - Search by species name
  - Date range (today, week, month, year, all)
  - Status (verified, unverified, reviewed, unreviewed)
  - View mode toggle (all records vs. my records)

### Record Detail (`/records/[id]/page.tsx`)
- **Left Panel:**
  - Full image display
  - Observation metadata
  - AI prediction details
  - Review button (for verified experts)

- **Right Panel:**
  - List of expert reviews
  - Review details (species ID, confidence, comments)
  - Helpful voting system
  - Expandable comments section
  - Add comment feature (verified experts only)

### Dashboard Features
- **Unified Dashboard** for users and experts
- Tab-based navigation (Overview, Records, Reviews)
- Notifications panel
- Quick stats cards
- Expert application status
- Quick actions

### Admin Dashboard
- **Tab System:**
  - Verification Requests
  - User Management
  - System Statistics
- **User Table** with:
  - Inline role changing
  - Search and filters
  - Ban/unban actions
  - Delete functionality
- **Statistics Dashboard:**
  - Real-time metrics
  - System health indicators
  - Progress tracking

## 🔔 Notification System

### Notification Types
1. **review_comment** - When someone comments on your review
2. **verification_status** - When admin approves/rejects verification
3. **role_change** - When admin changes your role

### Automatic Triggers
- Comment posted → Notify review author
- Verification approved/rejected → Notify applicant
- Role changed → Notify user

## 🛡️ Security Features

### Row Level Security (RLS)
- All new tables have RLS enabled
- Policies restrict data access by role
- Service role required for system operations

### Access Control
- Middleware enforces route protection
- Database policies prevent unauthorized data access
- Comment system restricted to verified experts only

## 📝 To-Do / Future Enhancements

1. **Profile Management Page** (`/profile`)
   - Edit personal details
   - Upload profile photo
   - Update expertise information

2. **Advanced Filters**
   - Location-based filtering
   - Conservation status filtering
   - Family/genus filtering

3. **Email Notifications**
   - Send emails for critical notifications
   - Digest emails for activity summaries

4. **Activity Dashboard for Admins**
   - User contribution charts
   - Review quality metrics
   - System usage analytics

5. **Expert Leaderboard**
   - Rank experts by contributions
   - Badges and achievements
   - Reputation system

## 🚀 Getting Started

### 1. Database Setup
```bash
# Run the schema update in Supabase SQL Editor
cat database/schema_update.sql
```

### 2. Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### 3. Install & Run
```bash
npm install
npm run dev
```

### 4. Create First Admin
```sql
-- In Supabase SQL Editor
UPDATE users 
SET role = 'admin' 
WHERE email = 'your-admin@email.com';
```

## 📦 Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **Styling:** Tailwind CSS
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **Real-time:** Supabase Realtime (for notifications)
- **Image Storage:** Supabase Storage

## 📖 Key Files

- `middleware.ts` - Route protection and role-based access
- `database/schema_update.sql` - Database schema changes
- `app/admin/dashboard/page.tsx` - Super admin control panel
- `app/dashboard/page.tsx` - Unified user/expert dashboard
- `app/records/page.tsx` - Records list with filters
- `app/records/[id]/page.tsx` - Record detail with reviews & comments

## 🤝 Contributing

When adding new features:
1. Check user role and verification status
2. Update middleware if adding protected routes
3. Add appropriate RLS policies for new tables
4. Create notifications for user actions
5. Update this README

## 📞 Support

For issues or questions:
- Check console for error messages
- Verify database policies are correct
- Ensure environment variables are set
- Check Supabase logs for backend errors

---

**Last Updated:** December 18, 2025
**Version:** 2.0.0 - Role-Based System Implementation
