# Email Form Setup Guide

## Current Status

The contact form is currently set up to log submissions to the console. You need to configure email sending.

## Option 1: Formspree (Easiest - Recommended for quick setup)

### Steps:

1. Go to [formspree.io](https://formspree.io) and sign up
2. Create a new form
3. Copy your form endpoint (looks like `https://formspree.io/f/YOUR_FORM_ID`)
4. Update the form in `app/page.tsx`:

```javascript
// Replace the current fetch with:
const response = await fetch('https://formspree.io/f/YOUR_FORM_ID', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(formData),
});
```

### Benefits:

- ✅ No server configuration needed
- ✅ Spam protection included
- ✅ Email notifications to info@atlaes.de
- ✅ Free tier available

## Option 2: AWS SES (Production - As per brief)

### Prerequisites:

- AWS account
- Domain verified (atlaes.de)
- SES configured

### Steps:

1. Install AWS SDK: `pnpm add aws-sdk`
2. Set up environment variables:
   ```
   AWS_ACCESS_KEY_ID=your_key
   AWS_SECRET_ACCESS_KEY=your_secret
   AWS_REGION=eu-central-1
   ```
3. Uncomment the AWS SES code in `app/api/contact/route.ts`
4. Configure SES to send from noreply@atlaes.de to info@atlaes.de

### Benefits:

- ✅ Professional email service
- ✅ High deliverability
- ✅ Scalable
- ✅ As specified in brief

## Option 3: EmailJS (Client-side)

### Steps:

1. Sign up at [emailjs.com](https://emailjs.com)
2. Configure email service
3. Update form to send directly from client

## Current Form Data Structure

The form sends this data:

```javascript
{
  name: "John Doe",
  company: "Example Corp",
  email: "john@example.com",
  country: "Germany",
  website: "https://example.com",
  partnershipType: "affiliate",
  message: "Interested in partnership..."
}
```

## Testing

1. Fill out the form at http://localhost:3000
2. Check browser console for logged data
3. Once email service is configured, emails will be sent to info@atlaes.de

## Recommended Next Steps

1. **Quick setup**: Use Formspree for immediate functionality
2. **Production**: Migrate to AWS SES for professional email handling
3. **Domain**: Set up atlaes.de domain and verify with email service
