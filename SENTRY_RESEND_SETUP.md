# Sentry & Resend Setup Guide

## Översikt

Detta dokument beskriver hur man sätter upp:
1. **Sentry** - Error tracking och performance monitoring
2. **Resend** - Transactional emails (betalningsbekräftelser, välkomstmail, etc.)

---

## 1. Sentry Setup (Error Tracking)

### Vad är Sentry?
Sentry fångar automatiskt alla fel som händer i produktionsmiljön och ger dig:
- Stack traces (exakt var felet inträffade)
- User context (vilken användare drabbades)
- Breadcrumbs (vad gjorde användaren innan felet?)
- Performance metrics (långsamma sidor)
- Session replays (se vad användaren såg när det kraschade)

### Steg 1: Skapa Sentry-konto

1. Gå till [sentry.io](https://sentry.io)
2. Skapa ett gratis konto (upp till 5,000 errors/månad gratis)
3. Välj "React" som platform
4. Kopiera din **DSN** (Data Source Name)
   - Format: `https://abc123@o123456.ingest.sentry.io/123456`

### Steg 2: Lägg till VITE_SENTRY_DSN i miljövariabler

**Lokalt (.env):**
```bash
VITE_SENTRY_DSN=https://your-key@sentry.io/your-project-id
```

**Production (Lovable):**
1. Gå till Project Settings → Environment Variables
2. Lägg till: `VITE_SENTRY_DSN` = `https://your-key@sentry.io/your-project-id`

### Steg 3: Verifiera att Sentry fungerar

**Testa i development:**
```typescript
// Lägg till i valfri komponent för att testa
const testSentry = () => {
  throw new Error("Test Sentry error tracking!");
};

// Klicka på en knapp som kör testSentry()
```

**Kontrollera i Sentry Dashboard:**
1. Gå till Sentry Dashboard
2. Du ska se felet dyka upp inom 30 sekunder
3. Klicka på felet för att se stack trace, user context, etc.

### Steg 4: Sätt upp Alerts

I Sentry Dashboard:
1. Gå till **Alerts** → **Create Alert**
2. Välj "When an issue is first seen"
3. Lägg till email-notifikation
4. Nu får du email varje gång ett nytt fel upptäcks!

---

## 2. Resend Setup (Email Notifications)

### Vad är Resend?
Resend är en modern email API för att skicka transactional emails:
- Välkomstmail när någon köper Pro
- Betalningsbekräftelser
- Subscription renewals
- Cancellation bekräftelser

### Steg 1: Skapa Resend-konto

1. Gå till [resend.com](https://resend.com)
2. Skapa ett gratis konto (3,000 emails/månad gratis)
3. Verifiera din email

### Steg 2: Lägg till och verifiera domän

**VIKTIGT: Du måste verifiera sparkboard.eu för att skicka från no-reply@sparkboard.eu**

1. I Resend Dashboard → **Domains** → **Add Domain**
2. Ange: `sparkboard.eu`
3. Lägg till följande DNS-records hos din DNS-leverantör:

```
Type: TXT
Name: @
Value: [Resend ger dig detta värde]

Type: CNAME
Name: resend._domainkey
Value: [Resend ger dig detta värde]
```

4. Vänta ~10 minuter
5. Klicka "Verify Domain" i Resend
6. När verifierad ser du ✅ Status: Verified

### Steg 3: Skapa API Key

1. I Resend Dashboard → **API Keys** → **Create API Key**
2. Name: `Sparkboard Production`
3. Permission: **Full Access**
4. Kopiera API Key (visas bara EN gång!)
   - Format: `re_abc123...`

### Steg 4: Lägg till RESEND_API_KEY i Supabase

**Lokalt (för testing):**
```bash
# Lägg till i .env
RESEND_API_KEY=re_your_api_key_here
```

**Production (Supabase):**
1. Gå till Supabase Dashboard → Project Settings → Edge Functions
2. Under "Environment Variables" klicka **Add variable**
3. Name: `RESEND_API_KEY`
4. Value: `re_your_api_key_here`
5. Klicka **Save**

### Steg 5: Deploy send-email edge function

```bash
# Deploy edge function
supabase functions deploy send-email

# Test att den fungerar
curl -X POST https://your-project.supabase.co/functions/v1/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "din@email.se",
    "subject": "Test från Sparkboard",
    "html": "<h1>Det fungerar!</h1><p>Resend är konfigurerad korrekt.</p>"
  }'
```

Om du får email = ✅ Success!

### Steg 6: Skicka välkomstmail när någon köper Pro

Detta kommer implementeras genom att lyssna på Stripe webhooks när en subscription skapas.

**Implementationssteg:**
1. Skapa Stripe webhook endpoint
2. När `checkout.session.completed` event kommer:
   - Uppdatera user plan till 'pro' i Supabase
   - Skicka välkomstmail via send-email edge function

**Exempel email-template (Welcome to Pro):**
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #03122F; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #F1916D 0%, #AE7DAC 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #fff; padding: 30px; border: 2px solid #F3DADF; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; background: linear-gradient(135deg, #F1916D 0%, #AE7DAC 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
    .feature { margin: 15px 0; padding-left: 25px; position: relative; }
    .feature:before { content: "✨"; position: absolute; left: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✨ Välkommen till Sparkboard Pro!</h1>
    </div>
    <div class="content">
      <p>Hej {{first_name}}!</p>

      <p>Tack för din betalning! Du har nu full tillgång till Sparkboard Pro.</p>

      <h2>Vad får du nu?</h2>
      <div class="feature">Obegränsade workshops - Skapa så många workshops du vill</div>
      <div class="feature">AI-analys - Få automatiska insikter från dina workshops</div>
      <div class="feature">Obegränsade deltagare - Ingen gräns på gruppstorlek</div>
      <div class="feature">Premium support - Prioriterad hjälp när du behöver det</div>

      <p style="text-align: center;">
        <a href="https://www.sparkboard.eu/dashboard" class="button">Kom igång →</a>
      </p>

      <h3>Betalningsinfo</h3>
      <p>
        <strong>Plan:</strong> Sparkboard Pro - Monthly<br>
        <strong>Pris:</strong> 99 kr/månad<br>
        <strong>Nästa betalning:</strong> {{next_billing_date}}<br>
      </p>

      <p style="color: #666; font-size: 14px; margin-top: 30px;">
        Du kan när som helst hantera din prenumeration i
        <a href="https://www.sparkboard.eu/account">dina kontoinställningar</a>.
      </p>

      <p>Lycka till med dina workshops! 🚀</p>

      <p>
        Mvh,<br>
        Sparkboard Team<br>
        <a href="mailto:kontakt@criteroconsulting.se">kontakt@criteroconsulting.se</a>
      </p>
    </div>
  </div>
</body>
</html>
```

---

## 3. Testing Checklist

### Sentry Testing
- [ ] Throw test error in development
- [ ] Verify error appears in Sentry Dashboard
- [ ] Check that user email is attached to error
- [ ] Verify stack trace shows correct file/line
- [ ] Test that alerts work (email when new error)

### Resend Testing
- [ ] Domain verified (sparkboard.eu)
- [ ] Send test email via curl command
- [ ] Verify email arrives (check spam!)
- [ ] Email displays correctly in Gmail/Outlook
- [ ] Links in email work correctly

### Integration Testing
- [ ] Buy Pro subscription (use Stripe test mode)
- [ ] Verify welcome email is sent
- [ ] Check Sentry for any errors during checkout
- [ ] Verify user plan updated to 'pro' in Supabase

---

## 4. Maintenance

### Monthly Tasks
1. **Check Sentry Dashboard**
   - Review error trends
   - Fix top 3 most common errors
   - Update error budgets if needed

2. **Check Resend Dashboard**
   - Review email delivery rate (should be >95%)
   - Check bounce rate (should be <5%)
   - Monitor spam complaints

3. **Update Email Templates**
   - Keep branding consistent
   - Test on different email clients
   - A/B test subject lines

---

## 5. Kostnader

### Sentry
- **Free tier:** 5,000 errors/månad, 1 user
- **Team plan:** $26/månad - 50,000 errors/månad, 10 users
- **Business:** $80/månad - 100,000 errors/månad

**Rekommendation:** Börja med Free, uppgradera när ni når 5,000 errors/månad

### Resend
- **Free tier:** 3,000 emails/månad, 100 emails/dag
- **Pro plan:** $20/månad - 50,000 emails/månad
- **Business:** $120/månad - 1M emails/månad

**Rekommendation:** Free räcker för första 100 kunder (30 emails/kund/månad)

---

## 6. Support

### Sentry
- Docs: https://docs.sentry.io
- Discord: https://discord.gg/sentry
- Email: support@sentry.io

### Resend
- Docs: https://resend.com/docs
- Discord: https://resend.com/discord
- Email: support@resend.com

---

## 7. Nästa Steg

När Sentry och Resend är uppsatta:

1. **Skapa Stripe webhook handler**
   - Lyssna på `checkout.session.completed`
   - Skicka välkomstmail
   - Uppdatera user plan

2. **Lägg till fler email-templates**
   - Subscription renewal reminder (3 dagar före)
   - Payment failed notification
   - Subscription cancelled confirmation
   - Workshop creation confirmation

3. **Sätt upp monitoring dashboards**
   - Error rate över tid
   - Email delivery rate
   - User signup → activation funnel

---

**Frågor? Kontakta utvecklingsteamet!**
