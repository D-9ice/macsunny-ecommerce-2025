# 🚀 Quick Start Guide

## Get Up and Running in 5 Minutes

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Environment Variables
```bash
cp .env.example .env.local
```

Edit `.env.local` and add your MongoDB connection:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/macsunny
DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/macsunny
ADMIN_PASSWORD=your_password_here
NEXTAUTH_SECRET=run_openssl_rand_base64_32
NEXTAUTH_URL=http://localhost:3000
```

### 3. Generate Prisma Client
```bash
npx prisma generate
```

### 4. Start Development Server
```bash
npm run dev
```

### 5. Access Your Site
- **Frontend:** http://localhost:3000
- **Admin Panel:** http://localhost:3000/admin/login (or press `Ctrl+Shift+A`)

---

## 🔑 Admin Login

**Password:** Whatever you set in `ADMIN_PASSWORD` in `.env.local`

---

## 💳 Enable Payments

Add your Paystack keys to `.env.local`:
```env
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_xxxxx
PAYSTACK_SECRET_KEY=sk_test_xxxxx
```

Get keys from: https://dashboard.paystack.com/#/settings/developer

---

## 🗄️ Seed Sample Data (Optional)

```bash
npx tsx scripts/seed-products.ts
```

---

## 🎨 Customize Theme

1. Login to admin panel
2. Navigate to Settings (`/admin/settings`)
3. Adjust colors, fonts, and theme mode

---

## ✅ You're Ready!

Your e-commerce platform is now fully functional with:
- ✅ Product catalog
- ✅ Shopping cart
- ✅ Secure checkout
- ✅ Payment processing
- ✅ Admin dashboard
- ✅ Order management

**Need help?** Check `README.md` for detailed documentation.
