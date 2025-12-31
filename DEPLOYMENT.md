# HawkOps Deployment Guide

This guide covers deploying HawkOps to Render.com and other platforms.

## 🚀 Deploying to Render.com

### Option 1: Blueprint (Recommended)

Render can automatically set up all services using the `render.yaml` blueprint:

1. **Push your code to GitHub**
   ```bash
   git push origin main
   ```

2. **Connect to Render**
   - Go to [Render Dashboard](https://dashboard.render.com/)
   - Click "New" → "Blueprint"
   - Connect your GitHub repository
   - Select the `HawkOps` repository

3. **Render will automatically create:**
   - Web Service (backend + frontend)
   - PostgreSQL Database
   - Redis Instance

4. **Set Environment Variables**
   - `ANTHROPIC_API_KEY`: Your Claude API key (set manually in Render dashboard)
   - All other variables are auto-configured

5. **Deploy!**
   - Render will build and deploy automatically
   - First deployment takes 5-10 minutes

### Option 2: Manual Setup

If you prefer manual setup:

#### 1. Create PostgreSQL Database
- In Render Dashboard → "New" → "PostgreSQL"
- Name: `hawkops-db`
- Plan: Starter (free) or higher
- Copy the **Internal Connection String**

#### 2. Create Redis Instance
- "New" → "Redis"
- Name: `hawkops-redis`
- Plan: Starter (free) or higher
- Copy the **Internal Connection String**

#### 3. Create Web Service
- "New" → "Web Service"
- Connect your GitHub repo
- Configure:

**Basic Settings:**
- Name: `hawkops`
- Runtime: `Node`
- Branch: `main`
- Root Directory: (leave empty)

**Build & Deploy:**
- Build Command: `npm install && npm run build`
- Start Command: `npm start`

**Environment Variables:**
```
NODE_ENV=production
DATABASE_URL=[Your PostgreSQL Internal Connection String]
REDIS_URL=[Your Redis Internal Connection String]
SESSION_SECRET=[Generate a random string]
ANTHROPIC_API_KEY=[Your Claude API key]
CLIENT_URL=https://hawkops.onrender.com
SOCKET_CORS_ORIGIN=https://hawkops.onrender.com
PORT=3000
```

**Advanced:**
- Auto-Deploy: Yes

#### 4. Deploy
- Click "Create Web Service"
- Wait for build and deployment (5-10 minutes)

## 🔧 Post-Deployment

### Verify Deployment

1. **Check Health Endpoint**
   ```bash
   curl https://your-app.onrender.com/health
   ```
   Should return: `{"status":"ok","timestamp":"..."}`

2. **Check Frontend**
   - Visit `https://your-app.onrender.com`
   - Should see the HawkOps homepage

3. **Check Logs**
   - In Render Dashboard → Your Service → Logs
   - Look for: "Server running on port 3000"

### Seed Demo Data (Optional)

SSH into your Render service or use a one-off job:

```bash
npm run db:seed --workspace=packages/backend
```

## 🐛 Troubleshooting

### Build Failures

**Error: "Command 'start' not found"**
- Solution: Ensure root `package.json` has `"start": "npm run start --workspace=packages/backend"`

**Error: "Cannot find module 'typescript'"**
- Solution: Run `npm install` in root before building

**Error: "ENOENT: no such file or directory, open 'schema.sql'"**
- Solution: Check that `schema.sql` is in `packages/backend/src/database/`

### Runtime Errors

**Error: "Connection refused" (Database)**
- Check `DATABASE_URL` is set correctly
- Use the **Internal Connection String** from Render
- Ensure database is in the same region

**Error: "Redis connection failed"**
- Check `REDIS_URL` is set correctly
- Use the **Internal Connection String** from Render
- Ensure Redis instance is running

**Error: "ANTHROPIC_API_KEY is not set"**
- Add your Claude API key in Render environment variables
- Redeploy after adding

**Frontend shows 404 or blank page**
- Check build logs for frontend build errors
- Verify `NODE_ENV=production` is set
- Check that `dist` folder exists in frontend package after build

### Performance Issues

**Slow cold starts**
- Render free tier spins down after 15 min of inactivity
- Upgrade to paid plan for always-on services

**WebSocket disconnections**
- Check `SOCKET_CORS_ORIGIN` matches your domain
- Verify WebSocket support (Render supports this by default)

## 📊 Monitoring

### Render Dashboard
- View real-time logs
- Monitor resource usage
- Check deployment history

### Health Checks
Render automatically pings `/health` endpoint

### Logs
Access via Render Dashboard or CLI:
```bash
render logs -s hawkops
```

## 🔄 Updates & Redeployment

### Automatic Deployment
- Push to `main` branch
- Render auto-deploys

### Manual Deployment
In Render Dashboard:
1. Go to your service
2. Click "Manual Deploy"
3. Select "Clear build cache & deploy" if needed

### Rolling Back
1. Go to "Events" in Render Dashboard
2. Find previous successful deployment
3. Click "Rollback"

## 🌍 Other Deployment Platforms

### Heroku
```bash
# Install Heroku CLI
heroku create hawkops

# Add add-ons
heroku addons:create heroku-postgresql:mini
heroku addons:create heroku-redis:mini

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set ANTHROPIC_API_KEY=your-key

# Deploy
git push heroku main
```

### Railway
1. Connect GitHub repo
2. Railway auto-detects Node.js
3. Add PostgreSQL and Redis from Railway dashboard
4. Set environment variables
5. Deploy

### DigitalOcean App Platform
1. Create new app from GitHub
2. Choose Node.js runtime
3. Add managed PostgreSQL and Redis
4. Configure environment variables
5. Deploy

## 💰 Cost Considerations

### Render Free Tier
- Web Service: Free (spins down after 15 min inactivity)
- PostgreSQL: Free (1GB storage, expires after 90 days)
- Redis: Free (25MB, no persistence)

**Good for:** Development, testing, demos

### Render Paid Plans
- Starter: $7/month (always-on)
- Standard: $25/month (better performance)
- Database: $7/month (10GB)
- Redis: $10/month (persistent)

**Good for:** Production, 24/7 availability

## 🔐 Security Checklist

Before going to production:

- [ ] Change `SESSION_SECRET` to a strong random value
- [ ] Enable SSL (Render provides this automatically)
- [ ] Set strong database password
- [ ] Restrict database access (use internal connection strings)
- [ ] Enable rate limiting
- [ ] Review CORS settings
- [ ] Enable monitoring and alerts
- [ ] Set up automated backups
- [ ] Review and limit API keys

## 📚 Additional Resources

- [Render Documentation](https://render.com/docs)
- [Node.js on Render](https://render.com/docs/deploy-node-express-app)
- [Environment Variables](https://render.com/docs/environment-variables)
- [Custom Domains](https://render.com/docs/custom-domains)

---

**Need Help?** Check the [main README](README.md) or open an issue on GitHub.
