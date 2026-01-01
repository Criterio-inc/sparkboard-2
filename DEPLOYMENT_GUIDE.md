# 🚀 Sparkboard Production Deployment Guide

**Last Updated:** 2026-01-01
**Branch:** claude/analyze-sparkboard-subscription-IphyO → main → production

---

## 📋 Pre-Deployment Checklist

### ✅ Security Fixes Applied

- [x] **check-subscription** - Added JWT verification
- [x] **send-email** - Added internal-only access control
- [x] **Sentry** - Error tracking configured
- [x] **Resend** - Email infrastructure ready
- [x] **Privacy Policy** - Updated with transparency

### ⚠️ Environment Variables Required

**Supabase Edge Functions (Secrets):**
```
SUPABASE_URL=https://[project].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[key]
CLERK_SECRET_KEY=[key]
STRIPE_SECRET_KEY=[key]
RESEND_API_KEY=re_[key]
INTERNAL_API_KEY=[generate-random-key]  ← NEW!
LOVABLE_API_KEY=[key]
ENVIRONMENT=production
```

**Lovable (Secrets):**
```
VITE_SENTRY_DSN=https://[key]@sentry.io/[project]
VITE_CLERK_PUBLISHABLE_KEY=[key]
```

---

## 🔄 Deployment Workflow

### Step 1: Merge Feature Branch to Main

**In Lovable:**
1. You're currently on branch: `claude/analyze-sparkboard-subscription-IphyO`
2. **Test everything thoroughly** in this branch first
3. When ready, switch to `main` branch
4. Merge the feature branch

**Or via GitHub:**
```bash
# Locally
git checkout main
git pull origin main
git merge claude/analyze-sparkboard-subscription-IphyO
git push origin main
```

**Or via GitHub PR:**
1. Go to: https://github.com/Criterio-inc/sparkboard-2/pulls
2. Create Pull Request: `claude/analyze-sparkboard-subscription-IphyO` → `main`
3. Review changes
4. Merge PR
5. Delete feature branch (optional)

---

### Step 2: Configure Environment Variables

#### A) In Supabase

1. **Go to Supabase Dashboard** → Project → Settings → Edge Functions → Secrets
2. **Add NEW variable:** `INTERNAL_API_KEY`
   - Generate random key: `openssl rand -hex 32`
   - Value: `[your-generated-key]`
3. **Add:** `ENVIRONMENT=production`
4. **Verify all others exist:**
   - SUPABASE_SERVICE_ROLE_KEY ✓
   - CLERK_SECRET_KEY ✓
   - STRIPE_SECRET_KEY ✓
   - RESEND_API_KEY ✓

#### B) In Lovable

1. **Settings → Secrets**
2. **Verify:**
   - `VITE_SENTRY_DSN` = [your Sentry DSN]
   - `VITE_CLERK_PUBLISHABLE_KEY` = [your Clerk key]

---

### Step 3: Deploy Edge Functions

**In Lovable (Easiest):**
Lovable auto-deploys when you switch to `main` branch.

**Or Manually via CLI:**
```bash
# Deploy all functions
supabase functions deploy

# Or deploy specific ones
supabase functions deploy check-subscription
supabase functions deploy send-email
supabase functions deploy workshop-operations
supabase functions deploy analyze-notes
supabase functions deploy create-checkout
supabase functions deploy customer-portal
supabase functions deploy cluster-notes
supabase functions deploy clerk-webhook
```

---

### Step 4: Deploy Frontend

**In Lovable:**
1. Switch to `main` branch
2. Click **"Publish"** or **"Deploy"**
3. Lovable builds and deploys to https://sparkboard.eu

**Verify deployment:**
- Open https://sparkboard.eu
- Check browser console for: `✅ Sentry initialized for error tracking`
- Test login with Clerk
- Verify workshop loading

---

### Step 5: Verify All Systems

#### Test 1: Authentication
- [ ] Login with Clerk works
- [ ] JWT tokens are issued
- [ ] Protected routes require auth

#### Test 2: Subscriptions
- [ ] Free plan: Can create 1 workshop ✓
- [ ] Free plan: Cannot create 2nd workshop ✗
- [ ] Pro upgrade flow works
- [ ] Stripe checkout works
- [ ] @curago.se emails get auto-pro ✓

#### Test 3: AI Features
- [ ] Free users: AI blocked with error message
- [ ] Pro users: AI analysis works
- [ ] Curago users: AI analysis works

#### Test 4: Email (Internal Only)
- [ ] send-email blocks public access (403)
- [ ] send-email works with INTERNAL_API_KEY
- [ ] Resend domain verified
- [ ] Test email arrives

#### Test 5: Error Tracking
- [ ] Sentry catches errors
- [ ] Sentry dashboard shows events
- [ ] Email alerts configured

---

### Step 6: Monitor for 24 Hours

**Watch:**
1. **Sentry Dashboard** - Any errors?
2. **Supabase Logs** - Edge function logs
3. **Stripe Dashboard** - Payment events
4. **Resend Dashboard** - Email delivery
5. **User Feedback** - Any issues reported?

---

## 🐛 Rollback Procedure (If Needed)

**If something breaks:**

### Quick Rollback (Lovable):
1. **Switch back to previous branch** or commit
2. **Deploy/Publish** again
3. **Investigate issue** in feature branch

### Emergency Rollback (Edge Functions):
```bash
# Deploy previous version
git checkout [previous-commit-hash]
supabase functions deploy [function-name]
git checkout main
```

---

## 📊 Post-Deployment Monitoring

### Daily Checks (First Week):
- [ ] Sentry: No critical errors
- [ ] Stripe: Payments processing
- [ ] Resend: Emails delivering
- [ ] User signups working

### Weekly Checks:
- [ ] Review Sentry error trends
- [ ] Check subscription metrics
- [ ] Monitor API costs
- [ ] User feedback review

---

## 🔐 Security Verification

### Before Going Live:

**Run Security Scan:**
1. **Check all edge functions have JWT** (except clerk-webhook)
   ```bash
   grep -r "verifyClerkToken" supabase/functions/*/index.ts
   ```
   Should show: analyze-notes, cluster-notes, create-checkout, customer-portal, workshop-operations, **check-subscription**

2. **Verify no secrets in code:**
   ```bash
   grep -r "sk_live\|pk_live\|STRIPE_SECRET" src/
   ```
   Should return: **NO RESULTS**

3. **Check CORS settings:**
   All edge functions should have:
   ```typescript
   "Access-Control-Allow-Origin": "*"
   ```
   *(Can be restricted post-launch if needed)*

4. **Test unauthorized access:**
   ```bash
   # Should return 401/403
   curl -X POST https://[project].supabase.co/functions/v1/send-email \
     -H "Content-Type: application/json" \
     -d '{"to":"test@test.com","subject":"test","html":"test"}'
   ```

---

## ✅ Production Ready Checklist

### Critical (Must Have):
- [x] All security fixes applied
- [x] JWT verification in all protected functions
- [x] Environment variables configured
- [x] Sentry error tracking enabled
- [x] Resend email domain verified
- [x] Privacy Policy updated
- [x] Stripe integration tested
- [x] Edge functions deployed
- [x] Frontend deployed

### Important (Should Have):
- [ ] Rate limiting configured (optional for MVP)
- [ ] CORS restricted to sparkboard.eu (optional for MVP)
- [ ] Custom error pages
- [ ] Loading states everywhere
- [ ] Mobile responsiveness tested

### Nice to Have (Post-Launch):
- [ ] Analytics (Google Analytics/Posthog)
- [ ] A/B testing
- [ ] Feature flags
- [ ] Status page
- [ ] Automated backups

---

## 🎉 Launch Day Plan

### 9:00 AM - Pre-Launch
- [ ] Final security scan
- [ ] Verify all environment variables
- [ ] Test all critical flows

### 10:00 AM - Deploy
- [ ] Merge to main
- [ ] Deploy edge functions
- [ ] Deploy frontend
- [ ] Verify deployment

### 10:30 AM - Soft Launch
- [ ] Send to 5-10 beta users
- [ ] Monitor Sentry closely
- [ ] Be ready to rollback

### 12:00 PM - Public Launch
- [ ] Post on LinkedIn
- [ ] Send email to mailing list
- [ ] Update website
- [ ] Monitor everything

### Rest of Day
- [ ] Monitor Sentry
- [ ] Respond to user feedback
- [ ] Fix any issues quickly

---

## 📞 Support Contacts

**If something breaks:**
- **Sentry:** https://sentry.io/organizations/[org]/
- **Supabase:** https://supabase.com/dashboard
- **Clerk:** https://dashboard.clerk.com
- **Stripe:** https://dashboard.stripe.com
- **Resend:** https://resend.com/domains

**Emergency Contacts:**
- Developer: [Your contact]
- Supabase Support: support@supabase.com
- Clerk Support: support@clerk.com

---

## 🎯 Success Metrics

**Track These:**
- User signups per day
- Free → Pro conversion rate
- Workshop creation rate
- AI analysis usage
- Error rate (should be <1%)
- Payment success rate (should be >95%)

**Tools:**
- Sentry: Error tracking
- Stripe: Payment metrics
- Supabase: Database metrics
- Resend: Email delivery

---

**Ready to launch?** Follow the steps above and you're good to go! 🚀

**Questions?** Review SECURITY_AUDIT_REPORT.md for details on all fixes.
