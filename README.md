# 🏨 Hostel Daily Count - WhatsApp Automated Management System

A production-ready, standalone WhatsApp-first daily count management system built with **Next.js (App Router)**, **Supabase PostgreSQL**, and the official **Meta WhatsApp Cloud API**.

Hostel managers submit daily student, staff, and other counts directly from WhatsApp by sending just 3 numbers (e.g. `120,8,3`). The system automatically calculates totals, prevents duplicates, handles confirmations, stores records in Supabase, and responds instantly via WhatsApp. An authenticated Admin Dashboard provides live monitoring, filters, monthly reports, and CSV exports.

---

## 📑 Table of Contents
1. [Architecture & Flow](#1-architecture--flow)
2. [Key Features](#2-key-features)
3. [WhatsApp Bot Commands & Formats](#3-whatsapp-bot-commands--formats)
4. [Environment Variables](#4-environment-variables)
5. [Supabase Setup & Database SQL](#5-supabase-setup--database-sql)
6. [Meta WhatsApp Cloud API Setup](#6-meta-whatsapp-cloud-api-setup)
7. [Meta Webhook Configuration](#7-meta-webhook-configuration)
8. [Local Development & Testing with ngrok](#8-local-development--testing-with-ngrok)
9. [Automated Testing](#9-automated-testing)
10. [Production Deployment (Vercel)](#10-production-deployment-vercel)
11. [Security & Idempotency](#11-security--idempotency)
12. [Troubleshooting Guide](#12-troubleshooting-guide)

---

## 1. Architecture & Flow

```
HOSTEL MANAGER (WhatsApp)
          |
          | Sends: "120,8,3"
          ↓
META WHATSAPP CLOUD API
          |
          | Webhook POST /api/webhook
          ↓
NEXT.JS BACKEND
          |
          | 1. Check rate limit & sender authorization
          | 2. Idempotency check (Meta message_id)
          | 3. Parse numbers & calculate total (120 + 8 + 3 = 131)
          | 4. Check for existing record on same date
          ↓
SUPABASE POSTGRESQL (hostel_daily_counts)
          |
          | Save / Update record
          ↓
NEXT.JS BACKEND
          |
          | Meta Graph API POST /v21.0/{phone_number_id}/messages
          ↓
META WHATSAPP CLOUD API
          |
          ↓
HOSTEL MANAGER (Receives formatted confirmation)
```

The **Admin Dashboard** connects independently to the database to provide reporting and metrics:
```
ADMIN (Browser) → Admin Login → Dashboard UI → Next.js API Routes → Supabase
```

---

## 2. Key Features

- **Zero-Friction WhatsApp Workflow**: Managers never have to log into a website for daily logging.
- **Automated Total Calculation**: Total is calculated server-side (`students + staff + others`); user totals are never trusted.
- **Flexible Whitespace Normalization**: Accepts `120,8,3`, `120, 8, 3`, or `120 8 3`.
- **Strict Data Validation**: Only non-negative integers (`0,0,0` is valid; letters, decimals, and negative numbers are rejected).
- **Timezone Awareness**: Official dates are strictly calculated using Indian Standard Time (`Asia/Kolkata`).
- **Duplicate Prevention with 2-Step Confirmation**: If a count already exists for today, the bot informs the manager and prompts for `UPDATE` before replacing values.
- **Idempotency & Anti-Flooding**: Dedupes Meta webhook retries via `message_id` and implements in-memory sliding window rate-limiting per sender.
- **Authorized Senders Only**: Enforces `AUTHORIZED_WHATSAPP_NUMBERS`; unauthorized numbers are rejected immediately.
- **Secure Admin Dashboard**: Authenticated with JWT session cookies, cards for today's stats, interactive filter bar (by Date, Month, Submitter), monthly summaries, and CSV exports.

---

## 3. WhatsApp Bot Commands & Formats

### Daily Count Submission
Send 3 whole numbers:
```
120,8,3
```
*(Also supported: `120, 8, 3` and `120 8 3`)*

**Automatic Response:**
```
🏨 HOSTEL DAILY COUNT

📅 08-10-2026

👨🎓 Students: 120
👨🏫 Staff: 8
👤 Others: 3
----------------
📊 Total: 131

✅ Saved
```

### Invalid Format
If an invalid format is sent (e.g. `120`, `120,8`, `120,8,3,4`, `abc,8,3`, `120,-5,3`, `120.5,8,3`):
```
❌ Invalid format.

Please send the hostel count like:

120,8,3

Students, Staff, Others
```

### Duplicate Entry & Confirmation
If a count was already saved for today and another count is sent:
```
⚠️ Today's hostel count already exists.

Current count:

👨🎓 Students: 120
👨🏫 Staff: 8
👤 Others: 3
📊 Total: 131

To update today's count, reply:

UPDATE
```

Reply `UPDATE` to replace the record:
```
✅ Today's count updated successfully.
```

### Inquiries & Commands
- **`today`**:
  Returns today's recorded count or `❌ No count has been submitted for today.`
- **`yesterday`**:
  Returns yesterday's count or `❌ No count has been submitted for yesterday.`
- **`month`**:
  Returns monthly aggregate summary:
  ```
  📊 HOSTEL MONTHLY SUMMARY

  October 2026

  Days Recorded: 24

  Student Count Total: 2880
  Staff Count Total: 192
  Others Count Total: 72
  ```
- **`help`**:
  Returns usage instructions and list of available commands.

---

## 4. Environment Variables

Create `.env.local` in the project root:

```env
# ============================================================
# META WHATSAPP CLOUD API CONFIGURATION
# ============================================================
WHATSAPP_ACCESS_TOKEN=your_meta_system_user_access_token_here
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id_here
WHATSAPP_VERIFY_TOKEN=your_custom_webhook_verify_token_here
WHATSAPP_API_VERSION=v21.0

# ============================================================
# SUPABASE POSTGRESQL CONFIGURATION
# ============================================================
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# ============================================================
# AUTHORIZATION & TIMEZONE
# ============================================================
# Comma-separated list of authorized manager phone numbers (country code without '+')
AUTHORIZED_WHATSAPP_NUMBERS=919876543210,919876543211

# Application Timezone (defaults to Asia/Kolkata)
APP_TIMEZONE=Asia/Kolkata

# ============================================================
# ADMIN DASHBOARD AUTHENTICATION
# ============================================================
ADMIN_USERNAME=admin
ADMIN_PASSWORD=HostelAdminPass2026!
JWT_SECRET=super_secret_jwt_key_min_32_characters_random_string_2026
```

---

## 5. Supabase Setup & Database SQL

1. Log into your [Supabase Dashboard](https://supabase.com).
2. Create a new project.
3. Open the **SQL Editor** and execute the contents of `database/schema.sql`:

```sql
-- 1. Create hostel_daily_counts table
CREATE TABLE IF NOT EXISTS hostel_daily_counts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_date DATE NOT NULL,
    students INTEGER NOT NULL CHECK (students >= 0),
    staff INTEGER NOT NULL CHECK (staff >= 0),
    others INTEGER NOT NULL CHECK (others >= 0),
    total INTEGER NOT NULL CHECK (total >= 0 AND total = (students + staff + others)),
    submitted_by TEXT NOT NULL,
    message_id TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_hostel_record_date UNIQUE (record_date)
);

CREATE INDEX IF NOT EXISTS idx_hostel_daily_counts_date ON hostel_daily_counts (record_date DESC);
CREATE INDEX IF NOT EXISTS idx_hostel_daily_counts_message_id ON hostel_daily_counts (message_id);

-- 2. Pending updates table for 2-step confirmation
CREATE TABLE IF NOT EXISTS hostel_pending_updates (
    phone_number TEXT PRIMARY KEY,
    record_date DATE NOT NULL,
    students INTEGER NOT NULL CHECK (students >= 0),
    staff INTEGER NOT NULL CHECK (staff >= 0),
    others INTEGER NOT NULL CHECK (others >= 0),
    total INTEGER NOT NULL CHECK (total >= 0),
    message_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now() + interval '2 hours') NOT NULL
);

-- 3. Idempotency tracking for non-saving commands
CREATE TABLE IF NOT EXISTS hostel_processed_messages (
    message_id TEXT PRIMARY KEY,
    phone_number TEXT,
    command TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE hostel_daily_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE hostel_pending_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE hostel_processed_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on hostel_daily_counts"
    ON hostel_daily_counts FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on hostel_pending_updates"
    ON hostel_pending_updates FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on hostel_processed_messages"
    ON hostel_processed_messages FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow read access to hostel_daily_counts"
    ON hostel_daily_counts FOR SELECT TO anon, authenticated USING (true);
```

4. In **Project Settings** > **API**, copy:
   - `Project URL` → `SUPABASE_URL`
   - `anon public` key → `SUPABASE_ANON_KEY`
   - `service_role secret` key → `SUPABASE_SERVICE_ROLE_KEY` *(Server only)*

---

## 6. Meta WhatsApp Cloud API Setup

1. Go to [Meta for Developers](https://developers.facebook.com/).
2. Create an App of type **Business**.
3. Under **Add products to your app**, set up **WhatsApp**.
4. In **WhatsApp** > **API Setup**:
   - Note the **Phone number ID** → `WHATSAPP_PHONE_NUMBER_ID`
   - Note the **WhatsApp Business Account ID** → `WHATSAPP_BUSINESS_ACCOUNT_ID`
5. Generate a **Permanent System User Access Token**:
   - Navigate to **Meta Business Suite** > **Business Settings** > **System Users**.
   - Create a System User (Admin role).
   - Click **Generate New Token**, select your App, and grant `whatsapp_business_messaging` and `whatsapp_business_management` permissions.
   - Set as `WHATSAPP_ACCESS_TOKEN`.
6. Add your test phone number to the **To** recipient list in the API setup test panel.

---

## 7. Meta Webhook Configuration

In the Meta App Dashboard:
1. Navigate to **WhatsApp** > **Configuration**.
2. Click **Edit** next to **Webhook**.
3. Fill in:
   - **Callback URL**:
     ```
     https://YOUR-DOMAIN/api/webhook
     ```
     *(Must be publicly accessible over HTTPS. Do NOT paste any token into this URL).*
   - **Verify Token**:
     The exact string you configured in `WHATSAPP_VERIFY_TOKEN`.
4. Click **Verify and Save**. Meta will make a `GET` request to your webhook with `hub.mode=subscribe` and `hub.challenge`.
5. Under **Webhook fields**, click **Manage** and subscribe to:
   - `messages`

---

## 8. Local Development & Testing with ngrok

Because Meta requires a publicly accessible HTTPS callback URL, use an HTTPS tunnel (e.g. ngrok or cloudflared) for local testing.

### Step-by-Step Local Workflow:
1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Create environment file:**
   Copy `.env.example` to `.env.local` and populate keys:
   ```bash
   cp .env.example .env.local
   ```
3. **Run local development server:**
   ```bash
   npm run dev
   ```
   Server starts at `http://localhost:3000`.
4. **Expose localhost using ngrok:**
   In another terminal:
   ```bash
   ngrok http 3000
   ```
   Copy the HTTPS Forwarding URL (e.g. `https://xxxx-xx-xx.ngrok-free.app`).
5. **Configure Meta Webhook Callback URL:**
   - Callback URL: `https://xxxx-xx-xx.ngrok-free.app/api/webhook`
   - Verify Token: value from your `WHATSAPP_VERIFY_TOKEN`
6. **Send a WhatsApp test:**
   From your authorized WhatsApp number, send:
   ```
   120,8,3
   ```
7. **Verify Database & Reply:**
   - Look at your terminal console logs.
   - Verify receipt on WhatsApp with the formatted confirmation.
   - Check Supabase `hostel_daily_counts` table to view the saved row.
   - Open `http://localhost:3000/dashboard` to view the updated cards and records.

---

## 9. Automated Testing

The codebase includes an extensive suite of automated tests verifying:
- Valid count formats (`120,8,3`, `120, 8, 3`, `120 8 3`, `0,0,0`, `100,5,2`)
- Invalid inputs (`120`, `120,8`, `120,8,3,4`, `abc,8,3`, negatives, decimals, empty)
- All commands (`today`, `yesterday`, `month`, `help`, `update`)
- Phone number normalization & authorization lists
- Exact WhatsApp response formats
- Timezone date calculations in `Asia/Kolkata`
- Webhook GET handshake verification and 403 rejections
- WhatsApp service error handling without leaking tokens

Run all tests:
```bash
npm test
```

---

## 10. Production Deployment (Vercel)

This application is built with standard Next.js App Router and is 100% Vercel-ready.

### Deployment Steps:
1. Push repository to GitHub or GitLab.
2. In the [Vercel Dashboard](https://vercel.com), click **Add New** > **Project** and import this repository.
3. In **Environment Variables**, add all variables from `.env.example`:
   - `WHATSAPP_ACCESS_TOKEN`
   - `WHATSAPP_PHONE_NUMBER_ID`
   - `WHATSAPP_BUSINESS_ACCOUNT_ID`
   - `WHATSAPP_VERIFY_TOKEN`
   - `WHATSAPP_API_VERSION` (`v21.0`)
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `AUTHORIZED_WHATSAPP_NUMBERS`
   - `APP_TIMEZONE` (`Asia/Kolkata`)
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD`
   - `JWT_SECRET`
4. Click **Deploy**.
5. Once deployed, note your domain (e.g. `https://hostel-daily-count.vercel.app`).
6. Update Meta Webhook Callback URL:
   - URL: `https://hostel-daily-count.vercel.app/api/webhook`
   - Verify Token: same `WHATSAPP_VERIFY_TOKEN`
7. Verify and subscribe to `messages`.

---

## 11. Security & Idempotency

- **Zero Client-Side Secret Exposure**: `SUPABASE_SERVICE_ROLE_KEY` and `WHATSAPP_ACCESS_TOKEN` are only imported in server-side API routes and services.
- **Idempotency**: Meta Cloud API may deliver webhooks more than once upon network delay. We track `message_id` and return HTTP 200 immediately for duplicated messages.
- **Timing-Safe Auth**: Admin authentication uses constant-time string comparison (`timingSafeCompare`) and signed HS256 JWT cookies.
- **Safe Logging**: The WhatsApp service strips sensitive headers and never prints the access token to application logs.

---

## 12. Troubleshooting Guide

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| **Meta Webhook Verification Fails (403)** | Token mismatch or mode is not `subscribe` | Ensure `WHATSAPP_VERIFY_TOKEN` matches the token entered in Meta developer dashboard. |
| **"You are not authorized..."** | Sender phone not in allowlist | Add the manager's phone number (with country code, no `+` sign) to `AUTHORIZED_WHATSAPP_NUMBERS`. |
| **WhatsApp replies not received** | Invalid `WHATSAPP_ACCESS_TOKEN` or `PHONE_NUMBER_ID` | Check server logs for Meta Graph API error codes. Ensure system user token has messaging permissions. |
| **"Unable to save today's count right now"** | Supabase connection or RLS issue | Ensure `SUPABASE_SERVICE_ROLE_KEY` is set and `database/schema.sql` was executed in Supabase SQL editor. |
| **Dashboard redirects to /login** | No active admin session | Log in using credentials defined in `ADMIN_USERNAME` and `ADMIN_PASSWORD`. |
#   h o s t e l  
 