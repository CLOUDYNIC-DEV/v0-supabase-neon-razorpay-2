# CloudyNIC AI - API Implementation Guide

## Overview
CloudyNIC is now a complete AI API platform with three pricing tiers (Free, Pro, Pro Max), database-backed API keys, and comprehensive documentation.

## Features Implemented

### 1. Database Schema (Supabase)
- **users** table: Tracks user accounts and plan types
- **api_keys** table: Stores API keys with plan tier and usage tracking
- **subscriptions** table: Manages subscription and payment information
- **api_usage** table: Logs all API requests for analytics

All tables have Row Level Security (RLS) enabled for data protection.

### 2. API Endpoints

#### `/api/v1/prompt` - Main AI Endpoint
**Free Tier** (IP-based rate limiting)
```bash
GET http://localhost:3000/api/v1/prompt?prompt=hello
# Returns: Raw text response
# Rate Limit: 1 request/minute, 100 requests/day
```

**Pro/Pro Max Tier** (Key-based)
```bash
GET http://localhost:3000/api/v1/prompt?prompt=hello&key=YOUR_API_KEY
# Returns: Raw text response
# Pro Rate Limit: 30 requests/minute, 10,000 requests/day
# Pro Max Rate Limit: Unlimited
```

**POST Request**
```bash
curl -X POST http://localhost:3000/api/v1/prompt \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Your question", "key": "YOUR_API_KEY"}'
```

#### `/api/keys/generate` - Generate API Key
```bash
POST /api/keys/generate
# Requires: User authentication (Supabase Auth)
# Returns: New API key with plan tier
```

#### `/api/keys/list` - List User's API Keys
```bash
GET /api/keys/list
# Requires: User authentication
# Returns: Array of user's API keys
```

#### `/api/subscription/get` - Get Active Subscription
```bash
GET /api/subscription/get
# Requires: User authentication
# Returns: Current subscription details and plan information
```

#### `/api/payment/create-order` - Create Razorpay Order
```bash
POST /api/payment/create-order
{
  "plan": "pro" or "pro_max",
  "amount": 1 or 9,
  "user_id": "user_uuid"
}
# Returns: Razorpay order details
```

#### `/api/payment/verify` - Verify Payment
```bash
POST /api/payment/verify
{
  "razorpay_order_id": "order_id",
  "razorpay_payment_id": "payment_id",
  "razorpay_signature": "signature",
  "plan": "pro"
}
# Returns: Subscription created and API key generated
```

### 3. User Pages

#### Homepage (`/`)
- Demo chat with 3 free messages per IP
- Pricing information
- Features showcase
- Auto-scroll fixed: Chat responses no longer scroll page down

#### Pricing (`/pricing`)
- Plan comparison
- Checkout flow with Razorpay integration
- Discount information

#### Dashboard (`/dashboard`)
- View active subscription
- Manage API keys (copy to clipboard)
- API usage statistics
- Complete setup instructions with examples
- Test API endpoint

#### Payment Success (`/payment-success`)
- Display API key
- Copy-to-clipboard functionality
- Comprehensive setup instructions
- Code examples in JavaScript and Python
- Test API button

### 4. Authentication
- Uses Supabase Auth for user management
- Automatic user creation in `public.users` table
- RLS policies protect user data
- Session-based authentication with HTTP-only cookies

### 5. Database Integration

#### API Key Management
```typescript
// Generate API key
const apiKey = await generateApiKey();

// Validate API key
const validation = await validateApiKey(apiKey);

// Track usage
await trackApiUsage(userId, apiKey, endpoint);
```

#### Subscription Management
```typescript
// Get active subscription
const subscription = await getActiveSubscription(userId);

// Create subscription after payment
const subscription = await createSubscription(userId, plan, razorpayData);
```

### 6. Rate Limiting Implementation
- Free tier: IP-based rate limiting (1 req/min, 100 req/day)
- Pro: Key-based rate limiting (30 req/min, 10k req/day)
- Pro Max: Unlimited requests

Uses Redis (if available) or in-memory caching for rate limiting.

## Testing the API

### Test Free Endpoint
```bash
curl "http://localhost:3000/api/v1/prompt?prompt=What%20is%20AI"
```

### Test with API Key (after generating)
```bash
curl "http://localhost:3000/api/v1/prompt?prompt=Hello&key=YOUR_KEY"
```

### Test POST Request
```bash
curl -X POST http://localhost:3000/api/v1/prompt \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello", "key": "YOUR_KEY"}'
```

## Environment Variables Required

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_SECRET=your_secret
```

## File Structure

```
app/
├── page.tsx                          # Homepage with demo chat
├── pricing/page.tsx                  # Pricing page
├── dashboard/page.tsx                # User dashboard
├── payment-success/page.tsx          # Payment confirmation
└── api/
    ├── v1/
    │   └── prompt/route.ts          # Main API endpoint
    ├── keys/
    │   ├── generate/route.ts        # Generate API key
    │   └── list/route.ts            # List keys
    ├── subscription/
    │   └── get/route.ts             # Get subscription
    └── payment/
        ├── create-order/route.ts    # Create Razorpay order
        └── verify/route.ts          # Verify payment

lib/
├── api-utils.ts                      # API utilities and helpers
├── supabase/
│   ├── client.ts                     # Browser client
│   ├── server.ts                     # Server client
│   └── proxy.ts                      # Middleware proxy
```

## Database Schema Details

### users table
```sql
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  plan_type TEXT DEFAULT 'free' CHECK (plan_type IN ('free', 'pro', 'pro_max')),
  api_requests_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### api_keys table
```sql
CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  key VARCHAR(255) NOT NULL UNIQUE,
  name TEXT NOT NULL,
  plan_tier TEXT NOT NULL CHECK (plan_tier IN ('free', 'pro', 'pro_max')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  requests_count INTEGER DEFAULT 0
);
```

### subscriptions table
```sql
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('free', 'pro', 'pro_max')),
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### api_usage table
```sql
CREATE TABLE public.api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  api_key_id UUID REFERENCES public.api_keys(id) ON DELETE SET NULL,
  endpoint TEXT NOT NULL,
  method TEXT DEFAULT 'GET',
  status_code INTEGER,
  response_time_ms INTEGER,
  prompt TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Next Steps (Optional Enhancements)

1. **Analytics Dashboard**: Add detailed usage analytics and charts
2. **Webhooks**: Implement webhooks for payment notifications
3. **Custom Models**: Allow users to select different AI models
4. **Billing History**: Show detailed billing and invoice history
5. **Team Management**: Add support for team members and shared API keys
6. **API Documentation**: Add interactive API documentation (OpenAPI/Swagger)
7. **Monitoring**: Add health checks and uptime monitoring
8. **Email Notifications**: Send email confirmations for payments and API key generation

## Support
For issues or questions, contact: hello@cloudynic.com
