# MacSunny Electronics - Deployment Guide

## 🚀 Deploy to Vercel

### Prerequisites
- GitHub account
- Vercel account (free tier is fine)
- MongoDB Atlas account (free tier available)

### Step 1: Prepare MongoDB Database

1. **Create MongoDB Atlas Account**
   - Go to https://www.mongodb.com/cloud/atlas
   - Sign up for free tier
   - Create a new cluster

2. **Get Connection String**
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net/`)
   - Replace `<password>` with your actual password
   - Add database name at the end: `/macsunny`

### Step 2: Push to GitHub

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - MacSunny Electronics E-commerce Platform"

# Create repository on GitHub (github.com/new)
# Then link and push:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

### Step 3: Deploy to Vercel

1. **Connect GitHub**
   - Go to https://vercel.com
   - Click "New Project"
   - Import your GitHub repository

2. **Configure Environment Variables**
   
   Add these in Vercel dashboard under "Environment Variables":
   
   ```
   MONGODB_URI=mongodb+srv://your-connection-string/macsunny
   NEXTAUTH_SECRET=your-random-secret-here
   NEXTAUTH_URL=https://your-app-name.vercel.app
   ```

   **Generate NEXTAUTH_SECRET:**
   ```bash
   openssl rand -base64 32
   ```

3. **Deploy**
   - Click "Deploy"
   - Wait for deployment to complete
   - Your site will be live at `https://your-app-name.vercel.app`

### Step 4: Initialize Admin Account

1. **First Login**
   - Visit `https://your-app-name.vercel.app/admin/login`
   - Default password: `admin123`
   - **IMPORTANT:** Change this immediately!

2. **Change Admin Password**
   - After login, go to Admin → Settings
   - Or visit `/admin/password`
   - Change to a strong password
   - Password is stored securely in MongoDB with bcrypt hashing

3. **Seed Categories** (Optional)
   - Visit `https://your-app-name.vercel.app/api/categories/seed`
   - Or use the "+ Add Category" button in admin panel

### Step 5: Configure Domain (Optional)

1. In Vercel dashboard, go to your project
2. Click "Settings" → "Domains"
3. Add your custom domain (e.g., www.macsunny.com)
4. Follow DNS configuration instructions

---

## 🔒 Security Features

✅ **Password Security**
- bcrypt hashing (10 salt rounds)
- Database-stored credentials
- No hardcoded passwords
- Secure cookie-based sessions

✅ **Admin Protection**
- Authentication required for all admin routes
- HTTP-only cookies
- 24-hour session timeout
- Change password functionality

✅ **Data Validation**
- Zod schema validation
- Input sanitization
- MongoDB injection prevention

---

## 📱 PWA Features

Your site is installable as a Progressive Web App:

- **Android:** Chrome menu → "Add to Home screen"
- **iOS:** Safari → Share → "Add to Home Screen"

Features:
- Offline support
- App-like experience
- Fast loading
- Mobile responsive

---

## 🎨 Theme System

Users can choose from 3 themes:
- **Light** - Bright, easy on the eyes
- **Dark** - Default, battery-saving
- **Premium** - Gold accents, premium feel

Theme persists across sessions via localStorage.

---

## 🛠️ Admin Features

1. **Inventory Management**
   - Add/Edit/Delete products
   - Image upload support
   - Category management
   - Real-time search

2. **Order Management**
   - View all orders
   - Track order status
   - Customer information

3. **Settings**
   - Change password
   - Theme customization
   - System monitoring

---

## 📊 Default Setup

**Default Admin Password:** `admin123`
**Default Categories:**
- Capacitors
- ICs
- Inductors
- Loudspeakers
- Modules
- Resistors
- Semiconductors
- Transistors

---

## 🐛 Troubleshooting

### MongoDB Connection Issues
- Check connection string format
- Verify network access in MongoDB Atlas
- Ensure password is URL-encoded

### Admin Login Issues
- Clear browser cookies
- Check MongoDB connection
- Verify NEXTAUTH_SECRET is set

### Categories Not Showing
- Visit `/api/categories/seed`
- Add categories via admin panel
- Check MongoDB connection

---

## 📞 Support

For issues or questions:
- Email: Macsunny2025@gmail.com
- WhatsApp: (+233) 024 338 0902

---

## ✅ Pre-Deployment Checklist

- [ ] MongoDB Atlas cluster created
- [ ] Connection string obtained
- [ ] GitHub repository created
- [ ] Code pushed to GitHub
- [ ] Vercel account created
- [ ] Environment variables configured
- [ ] Site deployed successfully
- [ ] Admin password changed from default
- [ ] Categories seeded
- [ ] Test order placed
- [ ] Mobile responsiveness verified
- [ ] PWA installation tested

---

**Congratulations! Your MacSunny Electronics store is now live! 🎉**
