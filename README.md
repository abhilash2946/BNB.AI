<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/d1057251-8b8c-4658-8878-71f9a175ac0e

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set up environment variables:
   Copy `.env.example` to `.env` and fill in your Supabase and API details.
3. Run the app:
   `npm run dev`

## Testing

Run unit tests with Vitest:
`npm test`

## Features

- **Neural Command Center**: Real-time marketing insights powered by AI.
- **Multi-Module Intelligence**: Specialized reports for SEO, Performance, and Social.
- **Theme Support**: Dark and light modes.
- **PDF Export**: Export your intelligence reports to PDF.
- **Modular Architecture**: Clean, maintainable codebase with custom hooks and components.

## Deployment & Server Management

The project is hosted on an **IntechDC VPS** managed with **CloudPanel** and **PM2**.

### Server Infrastructure
- **Host IP**: `103.155.85.64`
- **Frontend URL**: [http://frontend.test](http://frontend.test) (Port 3001)
- **Backend URL**: [http://backend.test](http://backend.test) (Port 8000)
- **Search API**: OpenSERP (Port 7000)

### File Paths (On Server)
- **Frontend**: `/home/frontend/htdocs/frontend.test/`
- **Backend**: `/home/backend/htdocs/backend.test/`
- **OpenSERP**: `/root/openserp`

### Update Workflow

#### 1. Push changes from Laptop
```bash
git add .
git commit -m "Your description"
git push origin master
```

#### 2. Apply updates on Server (via SSH)
**Frontend Update:**
```bash
cd /home/frontend/htdocs/frontend.test/
git pull origin master
npm run build
pm2 restart frontend
```

**Backend Update:**
```bash
cd /home/backend/htdocs/backend.test/
git pull origin master
pm2 restart backend
```

### Useful Maintenance Commands
- **View all services**: `pm2 list`
- **View live logs**: `pm2 logs backend`
- **Flush old logs**: `pm2 flush`
- **Check RAM/Disk**: `free -h` / `df -h`

