# ATLAES Website Deployment Guide

## Overview

This guide shows how to deploy the ATLAES corporate website to AWS using SST (Serverless Stack).

## Prerequisites

### 1. AWS Account Setup

- Create an AWS account
- Configure AWS credentials:

  ```bash
  aws configure
  ```

  - Access Key ID
  - Secret Access Key
  - Default region: `eu-central-1` (Frankfurt)
  - Default output format: `json`

### 2. Domain Setup

- Purchase `atlaes.de` domain
- Set up Route 53 hosted zone for `atlaes.de`
- Update nameservers at your domain registrar

### 3. Install Dependencies

```bash
# Install SST globally
npm install -g sst

# Install project dependencies
pnpm install
```

## Deployment Steps

### 1. Development Mode

Test the website locally with SST:

```bash
# Start SST dev mode
npx sst dev

# This will:
# - Start the SST development environment
# - Deploy to a temporary AWS environment
# - Provide a local URL for testing
```

### 2. Production Deployment

Deploy to production:

```bash
# Deploy to production
npx sst deploy --stage production

# This will:
# - Build the Next.js app
# - Deploy to AWS S3 + CloudFront
# - Set up custom domain (atlaes.de)
# - Configure SSL certificate
```

### 3. Verify Deployment

After deployment, SST will output:

- Website URL (CloudFront distribution)
- Custom domain (atlaes.de)

## Architecture

The deployment uses:

- **AWS S3**: Static file hosting
- **CloudFront**: CDN for global distribution
- **Route 53**: DNS management
- **ACM**: SSL certificate management

## Configuration

### SST Configuration (`sst.config.ts`)

```typescript
export default {
  config(_input) {
    return {
      name: 'atlaes-corporate-website',
      region: 'eu-central-1', // Frankfurt
    };
  },
  async stacks(app) {
    const { NextjsSite } = await import('sst');

    app.stack(function Site({ stack }) {
      const site = new NextjsSite(stack, 'AtlaesWebsite', {
        path: 'apps/web',
        environment: {
          NODE_ENV: 'production',
        },
        customDomain: {
          domainName: 'atlaes.de',
          hostedZone: 'atlaes.de',
        },
      });

      stack.addOutputs({
        WebsiteUrl: site.url,
        CustomDomain: 'atlaes.de',
      });
    });
  },
};
```

### Next.js Configuration (`apps/web/next.config.js`)

```javascript
const nextConfig = {
  output: 'standalone',
  images: {
    domains: ['localhost'],
  },
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
};
```

## Performance Features

- ✅ **Static Generation**: Fast loading times
- ✅ **CDN Distribution**: Global content delivery
- ✅ **SSL Certificate**: Automatic HTTPS
- ✅ **Compression**: Gzip compression enabled
- ✅ **Caching**: Optimized caching headers

## Monitoring

### SST Console

- View deployment status
- Monitor CloudFront metrics
- Check SSL certificate status
- View logs and errors

### AWS Console

- S3 bucket for static files
- CloudFront distribution
- Route 53 DNS records
- Certificate Manager

## Troubleshooting

### Common Issues

1. **Domain not resolving**
   - Check Route 53 hosted zone
   - Verify nameserver configuration
   - Wait for DNS propagation (up to 48 hours)

2. **SSL certificate issues**
   - Ensure domain is verified in Route 53
   - Check certificate status in AWS Certificate Manager

3. **Build failures**
   - Check Node.js version compatibility
   - Verify all dependencies are installed
   - Review build logs in SST console

### Useful Commands

```bash
# Check deployment status
npx sst list

# View logs
npx sst logs

# Remove deployment
npx sst remove --stage production

# Update deployment
npx sst deploy --stage production
```

## Cost Estimation

- **S3**: ~$0.023 per GB stored
- **CloudFront**: ~$0.085 per GB transferred
- **Route 53**: ~$0.50 per hosted zone
- **Total**: ~$1-5/month for typical corporate website

## Security

- ✅ **HTTPS Only**: Automatic SSL certificate
- ✅ **Security Headers**: Configured in Next.js
- ✅ **No Server**: Static deployment reduces attack surface
- ✅ **AWS Security**: Enterprise-grade infrastructure

## Next Steps

1. **Email Setup**: Configure AWS SES for contact forms
2. **Analytics**: Add Plausible or Cloudflare Analytics
3. **Monitoring**: Set up CloudWatch alarms
4. **Backup**: Configure S3 versioning
5. **CI/CD**: Set up GitHub Actions for automatic deployment
