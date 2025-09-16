# Omira Lead Capture Service - Setup Guide

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Supabase Database

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase-schema.sql`
4. Run the query to create the leads table

### 3. Set Up Environment Variables

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Fill in your credentials:

#### Supabase Credentials:
- Go to your Supabase project settings
- Find "API" section
- Copy `URL` and `anon public` key

#### WhatsApp Business API:
- Go to Meta Business Suite
- Navigate to WhatsApp > API Setup
- Copy your Phone Number ID
- Generate a permanent access token
- Note your template name

#### Email Settings (Gmail):
- Use your Gmail address
- Generate an App-Specific Password:
  1. Go to Google Account Settings
  2. Security > 2-Step Verification
  3. App passwords > Generate

### 4. Test Locally
```bash
npm run dev
```

Open `frontend-integration.html` in your browser to test the form.

### 5. Deploy to Vercel

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

3. Set environment variables in Vercel:
   - Go to your Vercel dashboard
   - Project Settings > Environment Variables
   - Add all variables from your `.env` file

### 6. Update Your Landing Pages

1. Copy the form code from `frontend-integration.html`
2. Update the API_URL to your Vercel deployment URL:
```javascript
const API_URL = 'https://your-app.vercel.app/api/submit-lead';
```

3. Add the form to both landing pages:
   - https://www.omira.it/restaurants
   - https://www.omira.it/pmi

## Testing Checklist

- [ ] Form submits successfully
- [ ] Lead appears in Supabase database
- [ ] WhatsApp message is received
- [ ] Email notification arrives at hello@byrivon.com
- [ ] Invalid phone numbers are rejected
- [ ] Consent checkbox is required
- [ ] Honeypot field catches bots
- [ ] CORS only allows your domains

## API Endpoints

### Health Check
```
GET /api/health
```
Returns: `{"status": "ok", "timestamp": "..."}`

### Submit Lead
```
POST /api/submit-lead
Content-Type: application/json

{
  "name": "Mario Rossi",
  "phone": "+39 333 1234567",
  "consent": true,
  "source": "{\"utm_source\":\"facebook\"}",
  "honeypot": ""
}
```

## Monitoring

### Check Logs in Vercel
```bash
vercel logs
```

### Database Queries

View recent leads:
```sql
SELECT * FROM leads ORDER BY created_at DESC LIMIT 10;
```

Check WhatsApp delivery status:
```sql
SELECT name, phone, whatsapp_status, whatsapp_error
FROM leads
WHERE created_at > NOW() - INTERVAL '24 hours';
```

## Troubleshooting

### WhatsApp Message Not Sending
1. Verify template name matches exactly
2. Check access token is valid
3. Ensure phone number format is correct
4. Review WhatsApp API logs in Meta Business Suite

### Email Not Arriving
1. Check spam folder
2. Verify SMTP credentials
3. Try with a different email provider
4. Check Vercel function logs

### CORS Errors
1. Verify domain is in allowed origins list
2. Check that you're using HTTPS in production
3. Ensure proper headers are set

## Security Notes

- Never commit `.env` file to Git
- Rotate WhatsApp access tokens periodically
- Monitor for suspicious activity in logs
- Keep dependencies updated: `npm update`

## Support

For issues or questions, contact your development team or check the Vercel and Supabase documentation.