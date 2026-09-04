# eKaty Deployment Guide

## 🚀 Production Deployment

The eKaty app is deployed to **Fly.io** at [https://ekaty.fly.dev](https://ekaty.fly.dev)

## 📋 Prerequisites

- [Fly.io CLI](https://fly.io/docs/hands-on/install-flyctl/) installed
- Fly.io account with access to the `ekaty` app
- Node.js 18+ installed locally
- [Supabase CLI](https://supabase.com/docs/guides/cli) installed
- [Resend](https://resend.com) account for email functionality
- Environment variables configured

## 🔧 Environment Setup

### Required Environment Variables

The following environment variables must be set in Fly.io:

```bash
# Supabase Configuration (Set as build args during deployment)
NEXT_PUBLIC_SUPABASE_URL=https://xlelbtiigxiodsbrqtgkls.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
NEXT_PUBLIC_APP_URL=https://ekaty.fly.dev

# Required: Supabase Service Role (for admin features and monetization)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Required: Resend Email API (for outreach campaigns)
RESEND_API_KEY=re_your_resend_api_key_here
```

### Setting Secrets in Fly.io

```bash
# Set secrets (runtime environment variables)
flyctl secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here --app ekaty
flyctl secrets set RESEND_API_KEY=re_your_resend_api_key_here --app ekaty

# Build args must be passed during deployment
flyctl deploy --build-arg NEXT_PUBLIC_SUPABASE_URL=your_url \
              --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key \
              --build-arg NEXT_PUBLIC_APP_URL=https://ekaty.fly.dev
```

## 💰 Monetization Dashboard Setup

### Step 1: Database Migration

The monetization dashboard requires additional database tables. Run the migration:

```sql
-- Connect to your Supabase project
-- Navigate to SQL Editor in Supabase Dashboard
-- Or use: psql -h db.xlelbtiigxiodsbrqtgkls.supabase.co -U postgres

-- Create partnership_tiers table
CREATE TABLE IF NOT EXISTS partnership_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  monthly_price INTEGER NOT NULL CHECK (monthly_price >= 0),
  features TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create restaurant_partnerships table
CREATE TABLE IF NOT EXISTS restaurant_partnerships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  tier_id UUID REFERENCES partnership_tiers(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'cancelled', 'expired')),
  start_date DATE,
  end_date DATE,
  monthly_price INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create restaurant_leads table
CREATE TABLE IF NOT EXISTS restaurant_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  cuisine_type TEXT,
  city TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'disqualified')),
  last_contacted_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create outreach_campaigns table
CREATE TABLE IF NOT EXISTS outreach_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  tier_showcase UUID REFERENCES partnership_tiers(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'sent')),
  total_sent INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  sent_at TIMESTAMPTZ
);

-- Create outreach_emails table
CREATE TABLE IF NOT EXISTS outreach_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES outreach_campaigns(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES restaurant_leads(id) ON DELETE CASCADE,
  email_provider_id TEXT,
  subject TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now(),
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ
);

-- Enable Row Level Security
ALTER TABLE partnership_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_partnerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_emails ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (admin only access)
CREATE POLICY "Admin full access to partnership_tiers"
  ON partnership_tiers FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin full access to restaurant_partnerships"
  ON restaurant_partnerships FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin full access to restaurant_leads"
  ON restaurant_leads FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin full access to outreach_campaigns"
  ON outreach_campaigns FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin full access to outreach_emails"
  ON outreach_emails FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

-- Public read access to active tiers
CREATE POLICY "Public can view active partnership_tiers"
  ON partnership_tiers FOR SELECT
  USING (is_active = true);

-- Create indexes for performance
CREATE INDEX idx_partnerships_restaurant ON restaurant_partnerships(restaurant_id);
CREATE INDEX idx_partnerships_tier ON restaurant_partnerships(tier_id);
CREATE INDEX idx_partnerships_status ON restaurant_partnerships(status);
CREATE INDEX idx_leads_status ON restaurant_leads(status);
CREATE INDEX idx_leads_email ON restaurant_leads(email);
CREATE INDEX idx_campaigns_status ON outreach_campaigns(status);
CREATE INDEX idx_emails_campaign ON outreach_emails(campaign_id);
CREATE INDEX idx_emails_lead ON outreach_emails(lead_id);
```

### Step 2: Configure Resend Email Service

1. **Create Resend Account**
   - Sign up at [resend.com](https://resend.com)
   - Verify your email address

2. **Add and Verify Domain**
   ```bash
   # In Resend dashboard:
   # 1. Navigate to Domains → Add Domain
   # 2. Enter: ekaty.com
   # 3. Add DNS records to your domain registrar:

   # SPF Record
   Type: TXT
   Name: @
   Value: v=spf1 include:resend.com ~all

   # DKIM Record
   Type: TXT
   Name: resend._domainkey
   Value: [provided by Resend]

   # DMARC Record (optional but recommended)
   Type: TXT
   Name: _dmarc
   Value: v=DMARC1; p=none; rua=mailto:admin@ekaty.com
   ```

3. **Get API Key**
   - Navigate to API Keys in Resend dashboard
   - Click "Create API Key"
   - Name: "eKaty Production"
   - Copy the key (starts with `re_`)
   - Add to Fly.io secrets:
   ```bash
   flyctl secrets set RESEND_API_KEY=re_your_key_here --app ekaty
   ```

4. **Configure Sending Domain**
   - Default sender: `eKaty <noreply@ekaty.com>`
   - Configured in `lib/email/client.ts`

### Step 3: Create Admin User

Admin users need special permissions to access the monetization dashboard.

**Option A: Via Supabase Dashboard**
```sql
-- In Supabase SQL Editor:
-- 1. First, create a regular user via the Auth UI
-- 2. Then promote to admin:

UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'::jsonb
WHERE email = 'admin@ekaty.com';
```

**Option B: Via Supabase CLI**
```bash
# Create admin user programmatically
supabase db execute \
  "UPDATE auth.users SET raw_app_meta_data = raw_app_meta_data || '{\"role\": \"admin\"}'::jsonb WHERE email = 'admin@ekaty.com';"
```

**Verify Admin Access:**
```bash
# Check user role
SELECT email, raw_app_meta_data->>'role' as role
FROM auth.users
WHERE email = 'admin@ekaty.com';
```

### Step 4: Seed Initial Partnership Tiers

Create your first partnership tiers:

```sql
-- Insert default partnership tiers
INSERT INTO partnership_tiers (name, description, monthly_price, features, display_order, is_active)
VALUES
  ('Basic', 'Essential visibility for local restaurants', 99,
   ARRAY['Profile listing', 'Basic analytics', 'Customer reviews', 'Mobile app presence'],
   1, true),

  ('Featured', 'Enhanced visibility with premium placement', 199,
   ARRAY['Everything in Basic', 'Homepage featured spot', 'Priority search ranking', 'Social media promotion', 'Monthly performance report'],
   2, true),

  ('Premium', 'Maximum visibility and marketing support', 399,
   ARRAY['Everything in Featured', 'Dedicated account manager', 'Custom marketing campaigns', 'Event promotion', 'Advanced analytics dashboard', 'Priority customer support'],
   3, true),

  ('Enterprise', 'Custom solutions for restaurant groups', 999,
   ARRAY['Everything in Premium', 'Multi-location management', 'API access', 'Custom integrations', 'White-label options', 'Quarterly business reviews'],
   4, true);
```

### Step 5: Create Email Campaign Templates

Set up your first outreach campaign:

```sql
-- Insert sample outreach campaign
INSERT INTO outreach_campaigns (name, subject_template, body_template, tier_showcase, status, created_by)
VALUES (
  'Welcome to eKaty Partnership',
  'Partner with eKaty - {{restaurant_name}}',
  'Dear {{contact_name}},

We''d love to partner with {{restaurant_name}} in {{city}}.

eKaty has 10,000+ active users discovering great restaurants like yours. Our {{tier_name}} tier at ${{tier_price}}/month provides:

• Premium visibility in search results
• Featured placement on our homepage
• Social media promotion to local food lovers
• Detailed analytics on customer engagement

Your {{cuisine}} restaurant would be perfect for our platform. Would you be interested in learning more?

Best regards,
The eKaty Team',
  (SELECT id FROM partnership_tiers WHERE name = 'Featured' LIMIT 1),
  'draft',
  (SELECT id FROM auth.users WHERE raw_app_meta_data->>'role' = 'admin' LIMIT 1)
);
```

### Step 6: Post-Setup Verification

Verify your monetization dashboard is properly configured:

**1. Check Database Tables**
```bash
# Connect to Supabase and verify tables exist
psql -h db.xlelbtiigxiodsbrqtgkls.supabase.co -U postgres -c "\dt partnership*"
psql -h db.xlelbtiigxiodsbrqtgkls.supabase.co -U postgres -c "\dt restaurant_*"
psql -h db.xlelbtiigxiodsbrqtgkls.supabase.co -U postgres -c "\dt outreach_*"
```

**2. Test Admin Access**
- Navigate to https://ekaty.fly.dev/admin/monetization
- Login with admin credentials
- Verify you can access:
  - `/admin/monetization/leads` - Lead management
  - `/admin/monetization/campaigns` - Email campaigns
  - `/admin/monetization/tiers` - Partnership tiers
  - `/admin/monetization/revenue` - Revenue dashboard

**3. Test Public Partnership Page**
- Navigate to https://ekaty.fly.dev/partner
- Verify all tiers are displayed
- Test application form submission

**4. Test Email Sending**
- Create a test lead in the dashboard
- Create a test campaign
- Send a test email
- Verify delivery in Resend dashboard

**5. Test Revenue Dashboard**
- Create a test partnership
- Navigate to `/admin/monetization/revenue`
- Verify MRR calculation
- Test CSV export functionality

## 🎯 Manual Deployment

### 1. Deploy to Fly.io

```bash
# Navigate to project directory
cd "C:\STRICKLAND\Strickland Technology Marketing\ekaty-25"

# Deploy with build arguments
flyctl deploy --remote-only \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://xlelbtiigxiodsbrqtgkls.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key \
  --build-arg NEXT_PUBLIC_APP_URL=https://ekaty.fly.dev \
  --app ekaty
```

### 2. Verify Deployment

After deployment, run the verification script:

```bash
npm run verify-deployment
```

This will:
- Check if the homepage loads correctly
- Test mobile responsiveness
- Verify API endpoints
- Capture screenshots
- Generate a verification report

## 🤖 Automated CI/CD with GitHub Actions

### Setup

The repository includes a GitHub Actions workflow that automatically:
1. ✅ Type checks the code
2. ✅ Lints the code
3. ✅ Builds the app locally for testing
4. 🚀 Deploys to Fly.io
5. ⏳ Waits for deployment to stabilize
6. 🧪 Runs Puppeteer verification tests
7. 📸 Captures and uploads screenshots
8. 📊 Generates deployment reports

### Required GitHub Secrets

Set these secrets in your GitHub repository settings:

```
FLY_API_TOKEN=your_fly_api_token
NEXT_PUBLIC_SUPABASE_URL=https://xlelbtiigxiodsbrqtgkls.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

To get your Fly API token:
```bash
flyctl auth token
```

### Triggering Deployments

The workflow runs automatically when you:
- Push to the `main` or `master` branch
- Manually trigger via GitHub Actions UI

```bash
# Push changes to trigger deployment
git add .
git commit -m "feat: your changes"
git push origin master
```

## 📊 Verification Scripts

### Available Scripts

```bash
# Full deployment verification
npm run verify-deployment

# Mobile-first verification
npm run verify-mobile

# Combined: Deploy and verify
npm run deploy-verify
```

### Verification Tests

The Puppeteer scripts test:
- ✅ Homepage loads with 200 status
- ✅ All key UI elements present
- ✅ Mobile viewport rendering
- ✅ API endpoints return data
- ✅ Performance metrics
- 📸 Visual regression via screenshots

## 🔍 Monitoring

### Check App Status

```bash
# View app status
flyctl status --app ekaty

# View logs
flyctl logs --app ekaty

# View machines
flyctl machine list --app ekaty

# SSH into a machine
flyctl ssh console --app ekaty
```

### View in Dashboard

Visit [https://fly.io/apps/ekaty/monitoring](https://fly.io/apps/ekaty/monitoring)

## 🛠️ Troubleshooting

### App Not Starting

1. Check logs:
   ```bash
   flyctl logs --app ekaty
   ```

2. Verify build arguments were passed correctly

3. Restart machines:
   ```bash
   flyctl machine restart <machine-id> --app ekaty
   ```

### Database Connection Issues

1. Verify Supabase URL and keys are correct
2. Check that Supabase project is accessible
3. Verify environment variables are set in Fly.io

### Deployment Failures

1. Check if build completed successfully
2. Verify Dockerfile syntax
3. Ensure all dependencies are in package.json
4. Check Fly.io build logs

### Image Uploads

Admin hero/logo/photo uploads and user profile images go to Cloudflare R2 when
`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY` are set, and
otherwise to local disk under `public/uploads/`.

- Local writes need the app directory to be writable by the Node process. Set
  `UPLOADS_DIR` to point at a writable path (for example a mounted volume) if it
  is not.
- `output: 'standalone'` serves static assets from `.next/standalone/public`, so
  uploads are written to both that tree and `public/`. A file that only exists in
  one of them is still served: `/uploads/*` falls through to a route handler that
  reads from either location.
- Heroes cap at 5MB and profile images at 2MB in the API, and the framework body
  limit is 10mb. A reverse proxy needs a matching `client_max_body_size` (at
  least `10m`) or it rejects the upload with a 413 HTML page before Next sees it.
- A restaurant's primary image is resolved as
  `metadata.heroImage → metadata.profileImageUrl → photos[0] → logoUrl`, and
  saving a hero writes all of the first two plus `photos[0]`. Keep new code going
  through `lib/restaurant-images.ts` so detail pages and cards can't disagree.

### Clean Slate Deployment

If you need to start fresh:

```bash
# Destroy all machines
flyctl machine list --app ekaty
flyctl machine destroy <machine-id> --app ekaty --force

# Deploy fresh
flyctl deploy --remote-only \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=your_url \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key \
  --build-arg NEXT_PUBLIC_APP_URL=https://ekaty.fly.dev \
  --app ekaty
```

## 🎨 Architecture

### Docker Multi-Stage Build

The app uses a multi-stage Docker build for optimal production size:

1. **Base**: Node 18 Alpine
2. **Deps**: Install dependencies
3. **Builder**: Build Next.js app with standalone output
4. **Runner**: Minimal production image (~44 MB)

### Next.js Configuration

- **Output**: `standalone` - Optimized for production
- **Image Optimization**: Configured for Supabase storage
- **Compression**: Enabled
- **Server Components**: Optimized with Supabase external packages

### Fly.io Configuration

- **Region**: Dallas (DFW) - Central US for optimal latency
- **Auto-scaling**: 
  - Min machines: 1
  - Auto-stop: Suspend when idle
  - Auto-start: On incoming requests
- **Memory**: 1GB per machine
- **CPU**: Shared CPU, 1 core

## 📚 Additional Resources

- [Fly.io Documentation](https://fly.io/docs/)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Supabase Documentation](https://supabase.com/docs)
- [GitHub Actions](https://docs.github.com/en/actions)

## 🆘 Support

For deployment issues:
1. Check the logs first: `flyctl logs --app ekaty`
2. Review the deployment verification report
3. Check GitHub Actions workflow runs
4. Contact the development team

---

**Last Updated**: 2025-10-07  
**Production URL**: https://ekaty.fly.dev  
**Status**: ✅ Operational
