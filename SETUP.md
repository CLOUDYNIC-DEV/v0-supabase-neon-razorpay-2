# CloudyNIC AI - Setup Guide

## Prerequisites

- Node.js 18+ and pnpm
- Supabase account (for authentication)
- Neon account (for database)
- Razorpay account (for payments)

---

## Environment Variables Setup

### 1. **Supabase Configuration**

Get these from your Supabase project settings:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

**Important:** In Supabase dashboard, go to **Auth > Email Settings** and set:
- From Email Name: `CloudyNIC`
- From Email Address: Your configured email

### 2. **Neon Database**

Get from Neon dashboard:

```bash
DATABASE_URL=postgresql://user:password@host/dbname
```

### 3. **Razorpay Payment Gateway**

From Razorpay dashboard at https://dashboard.razorpay.com/app/keys:

```bash
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
NEXT_PUBLIC_RAZORPAY_KEY_ID=your_key_id  # (same as above, for frontend)
```

---

## Database Setup

The database tables are created automatically through the application. They include:
- `auth.users` (handled by Supabase)
- `public.cloudynic_subscriptions`
- `public.cloudynic_api_keys`
- `public.cloudynic_usage`
- `public.cloudynic_demo_chats`

---

## Running Locally

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev
```

Visit `http://localhost:3000`

---

## API Endpoints

### Demo Chat (No Auth)
```
POST /api/chat/demo
Body: { "message": "Your prompt here" }
Headers: { "Content-Type": "application/json" }
```

### User Chat (Requires Auth + API Key)
```
POST /api/chat/prompt?prompt=YOUR_PROMPT&api_key=YOUR_API_KEY
```

### Payment
```
POST /api/payment/create-order
POST /api/payment/verify
```

### Subscriptions
```
GET /api/subscription/get
POST /api/subscription/create
```

### API Keys
```
GET /api/keys/list
POST /api/keys/generate
```

---

## Rate Limiting

**Free Tier:**
- 1 request per minute
- 100 requests per day
- Tracked by IP address

**Pro Tier ($1/month):**
- 30 requests per minute
- 10,000 requests per day
- Tracked by API key

**Pro Max ($5/month):**
- Unlimited requests
- Unlimited daily limit
- Tracked by API key

---

## External LLM Integration

The app connects to Ollama LLM at:
```
http://140.245.196.245:11434/api/chat
```

Model: `mistral`

To change or self-host:
1. Update the URL in `/app/api/chat/demo/route.ts`
2. Update in `/app/api/chat/prompt/route.ts`
3. Ensure the model supports the message format

---

## Security Checklist

- [ ] All API keys stored in environment variables
- [ ] HTTPS enabled in production (Vercel handles this)
- [ ] Supabase RLS policies enabled
- [ ] Password hashing via Supabase Auth
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] SQL injection prevention via parameterized queries
- [ ] Email verification enabled for signups
- [ ] Razorpay webhook signature verification

---

## Deployment to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# Then redeploy
vercel --prod
```

---

## Troubleshooting

**Demo chat not working:**
- Check if Ollama server is running at http://140.245.196.245:11434
- Verify the model name is `mistral`
- Check browser console for CORS errors

**Auth not working:**
- Verify Supabase keys are correct
- Check that email verification is enabled
- Ensure callback URL matches `/auth/callback`

**Payments failing:**
- Verify Razorpay keys are correct
- Check if amount is in correct currency (INR)
- Ensure webhook is configured in Razorpay dashboard

**Rate limiting issues:**
- Check database for usage records
- Verify `cloudynic_usage` table has data
- Check IP address detection (use x-forwarded-for header)

---

## Support

Email: hello@cloudynic.com

---

## Important Legal Notes

- CloudyNIC AI uses artificial intelligence and responses may contain errors
- Always verify AI-generated content before taking action
- Not suitable for medical, legal, or financial advice
- See Terms of Service and Privacy Policy for complete details
