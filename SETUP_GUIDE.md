# Cloudynic AI - Full Stack Setup Guide

## ✅ Project Status: COMPLETE

A fully functional full-stack application with **Neon PostgreSQL**, **Better Auth**, and **Razorpay Payments**.

---

## 🗄️ Database Setup

### Tables Created
All tables are set up in Neon with proper indexes and foreign key relationships:

1. **user** - Better Auth user accounts
2. **session** - User sessions
3. **account** - OAuth accounts (for future expansion)
4. **verification** - Email verification tokens
5. **user_profile** - User plan details (plan type, credits, API calls)
6. **payment** - Payment transaction records with Razorpay details
7. **api_usage** - API call analytics
8. **api_key** - User API keys

### Indexes
- `idx_user_email` - Fast user lookups
- `idx_session_userId` - Session management
- `idx_payment_userId` - Payment history
- `idx_api_usage_userId` - Usage analytics
- `idx_api_key_userId` - API key management

---

## 🔐 Authentication

### Better Auth Configuration
- **Database**: Neon PostgreSQL via `pg` Pool
- **Auth Type**: Email + Password (no OAuth, magic links, or passkeys)
- **Session Handling**: Secure HTTP-only cookies
- **Development Mode**: Special cookie settings for v0 iframe (`sameSite: "none", secure: true`)

### Files
- `lib/auth.ts` - Server config (load-bearing file)
- `lib/auth-client.ts` - React client
- `lib/db/index.ts` - Drizzle ORM with shared Pool
- `lib/db/schema.ts` - Better Auth tables + app tables
- `app/api/auth/[...all]/route.ts` - Better Auth HTTP handler
- `app/sign-in/page.tsx` - Sign-in page (client-side)
- `app/sign-up/page.tsx` - Sign-up page (client-side)

### User Flow
1. User creates account at `/sign-up` with email & password
2. Account stored in `user` table
3. Session created in `session` table
4. User redirected to pricing or checkout (if plan selected)

---

## 💳 Razorpay Payments

### Configuration
- **Currency**: INR (Indian Rupees)
- **Pricing Tiers**:
  - Free: ₹0/month (100 requests/day)
  - Pro: ₹199/month (10,000 requests/day)
  - Pro Max: ₹999/month (Unlimited)

### Payment Flow
1. User selects plan at `/pricing`
2. Sign up flow stores plan choice in URL (`?plan=pro`)
3. After auth, redirects to `/checkout?plan=pro`
4. Checkout page calls `POST /api/payment/create-order`
5. Backend creates Razorpay order, stores in `payment` table (status: pending)
6. Razorpay modal opens in browser
7. User completes payment
8. Browser calls `POST /api/payment/verify` with payment details
9. Backend verifies signature, updates payment record (status: completed)
10. User profile updated with plan & credits
11. Redirect to `/payment-success` with API setup instructions

### Environment Variables
```
RAZORPAY_KEY_ID=rzp_live_[key]              # Secret (server-side)
RAZORPAY_KEY_SECRET=[secret]                # Secret (server-side)
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_[key]  # Public (browser)
BETTER_AUTH_SECRET=[32+ char random]        # Auth secret
```

### API Endpoints
- `POST /api/payment/create-order` - Create Razorpay order
- `POST /api/payment/verify` - Verify payment & activate plan

---

## 👤 User Profile & API Keys

### Profile Management
- `GET /api/user/profile` - Get user profile (plan, credits, API calls)
- `POST /api/user/api-key` - Generate/get API key

### User Profile Fields
- `plan` - Current plan (free, pro, ultimate)
- `credits` - Available API credits
- `apiCalls` - Total API calls used

### API Key Generation
- Generated on first checkout success
- Stored in `api_key` table with plan tier
- Can be regenerated at `/payment-success` page

---

## 📄 Pages & Routes

### Public Pages
- `/` - Homepage
- `/pricing` - Pricing table (Pro & Pro Max link to sign-up)
- `/sign-up` - Sign up with email/password
- `/sign-in` - Sign in

### Protected Pages (Require Auth)
- `/checkout` - Payment checkout (accepts `?plan=pro` or `?plan=pro_max`)
- `/dashboard` - User dashboard (profile, plan, credits)
- `/payment-success` - Post-payment page with API setup

### API Routes
- `POST /api/auth/[...all]` - Better Auth handler
- `POST /api/payment/create-order` - Create Razorpay order
- `POST /api/payment/verify` - Verify payment signature
- `GET /api/user/profile` - Get user profile
- `POST /api/user/api-key` - Generate API key

---

## 🔒 Security

### Database Security
- All queries scoped by `userId` (no RLS on Neon, but enforced in code)
- `getUserId()` helper in server actions gets session user ID
- Every query includes `where(eq(table.userId, userId))`
- Foreign keys prevent orphaned records

### Payment Security
- Razorpay signature verification on backend
- Payment records stored before user confirmation
- Session required for all payment endpoints

### Best Practices
- Passwords hashed by Better Auth
- Sessions stored server-side (secure cookies)
- API keys never exposed in logs
- Signed payment transactions

---

## 🚀 Deployment

### Vercel Deployment
```bash
# Push to Vercel
git push vercel main

# Environment variables automatically loaded from integrations
```

### Environment Variables on Vercel
Add via Vercel Dashboard Settings → Environment Variables:
- `BETTER_AUTH_SECRET` (required)
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `NEXT_PUBLIC_RAZORPAY_KEY_ID`

The `DATABASE_URL` is automatically provided by Neon integration.

---

## 📊 Data Flow

### Sign-Up Flow
```
/sign-up → Create account → Redirect to /dashboard
  ↓ (if ?plan param)
/checkout → Payment → /payment-success
```

### Existing User Flow
```
/sign-in → /dashboard → /pricing → /checkout → /payment-success
```

### Payment Process
```
User → POST /api/payment/create-order → Razorpay order created
                 ↓
        Razorpay Modal (browser)
                 ↓
User confirms payment → POST /api/payment/verify → Update profile
                 ↓
        /payment-success (API setup guide)
```

---

## 🧪 Testing

### Local Development
```bash
cd /vercel/share/v0-project
pnpm dev
```

Visit `http://localhost:3000` and:
1. Go to `/pricing`
2. Click "GET STARTED" for Pro plan
3. Sign up with test email
4. Redirected to checkout (shows Razorpay test mode)
5. Use Razorpay test credentials
6. Payment success page with API key

### Testing Razorpay
- Use test mode credentials in development
- Test card: 4111111111111111
- OTP: 123456

---

## 📝 Next Steps

1. **Configure Razorpay**: Add production keys to environment
2. **Test Payment Flow**: Sign up → checkout → verify payment
3. **Monitor Database**: Check user/payment records in Neon
4. **Deploy to Vercel**: Push to main branch

---

## 🆘 Troubleshooting

### Auth Not Working
- Check `BETTER_AUTH_SECRET` is set
- Verify database connection string
- Check session cookie in browser DevTools

### Payment Failing
- Verify Razorpay keys are correct
- Check payment record created before error
- Review signature verification logic

### Database Errors
- Ensure Neon connection is active
- Verify tables exist: `SELECT * FROM "user";`
- Check userId scoping in queries

---

## 📞 Support

Email: hello@cloudynic.com

All systems ready for production use! 🎉
