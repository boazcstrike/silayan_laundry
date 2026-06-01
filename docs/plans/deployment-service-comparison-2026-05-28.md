# Deployment Service Comparison and Recommendation

Date: 2026-05-28  
Target: Deployment  
Goal: Choose the optimal service for deployment with cost efficiency (domain and hosting)

## Codebase Deployment Constraints

This repository is not static-only. It includes:

- Next.js API routes (`app/api/...`)
- Node runtime requirement (`export const runtime = "nodejs"`)
- Local SQLite persistence via `better-sqlite3` (`lib/services/AnalyticsDB.ts`)

Because of this, pure static hosting with AWS S3 + CloudFront is not sufficient without backend/data-layer refactoring.

## Service Comparison (Cost + Fit)

| Option | Fit for current app | Hosting cost signal | Domain/DNS cost signal | Notes |
|---|---|---:|---:|---|
| DigitalOcean Droplet | Strong | Basic Droplets start at $4/$6/$12 (512MB/1GB/2GB) | DigitalOcean DNS is free, but DigitalOcean is not a domain registrar (buy domain elsewhere) | Best cost/performance for current architecture (Node + SQLite on one VM). |
| Bluehost VPS | Works | VPS renewal pricing shown around $53.99+/month tiers | Free domain voucher first year on eligible 12/36-month plans | Higher recurring cost than DigitalOcean for comparable control. |
| AWS (EC2 + optional CloudFront + S3) | Strong but more complex | EC2 is variable plus EBS plus transfer (not fixed single price) | Route 53 hosted zone is $0.50/month; query costs apply (standard $0.40/million) | Powerful and flexible; higher pricing and operations complexity for small-to-mid workloads. |
| AWS S3 + CloudFront only | Not fit as-is | Can be cheap for static sites | CloudFront has flat-rate tiers including Free ($0) and Pro ($15) | Requires refactor because current app needs server runtime and local DB. |

## Recommendation

For this codebase and stated cost target, the optimal deployment choice is:

**DigitalOcean Droplet (start at 1GB or 2GB).**

### Suggested baseline

1. Start at **1GB ($6/month)** for low traffic, or **2GB ($12/month)** for safer headroom.
2. Deploy Next.js as a Node app behind Nginx or Caddy.
3. Keep SQLite on persistent disk and add scheduled backups.
4. Purchase domain from a registrar and delegate DNS to DigitalOcean (free DNS management).

## Why this is the optimal choice

- Lowest predictable monthly cost among viable options for current architecture.
- No forced app redesign.
- Minimal operational complexity compared with AWS multi-service setup.
- Better price-to-control ratio than Bluehost VPS tiers for this use case.

## Sources

- DigitalOcean Droplet pricing: https://www.digitalocean.com/pricing/droplets  
- DigitalOcean bandwidth billing ($0.01/GiB overage): https://docs.digitalocean.com/platform/billing/bandwidth/  
- DigitalOcean DNS + registrar note: https://docs.digitalocean.com/products/networking/dns/getting-started/dns-registrars/  
- Bluehost shared hosting and domain voucher context: https://www.bluehost.com/help/article/shared-hosting-prices , https://www.bluehost.com/help/article/domain-coupon  
- Bluehost VPS pricing details: https://www.bluehost.com/help/article/virtual-private-server-vps-hosting-prices/  
- AWS Route 53 pricing: https://aws.amazon.com/route53/pricing/  
- AWS CloudFront pricing: https://aws.amazon.com/cloudfront/pricing/  
- AWS CloudFront flat-rate plan coverage: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/flat-rate-pricing-plan.html  
- AWS S3 pricing: https://aws.amazon.com/s3/pricing/  
- AWS EC2 on-demand pricing model: https://aws.amazon.com/ec2/pricing/on-demand/
