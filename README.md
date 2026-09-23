# MacSunny Electronics E-Commerce Platform

A modern, full-featured e-commerce platform built with Next.js 15, TypeScript, MongoDB, and Paystack payment integration. Designed for electronic components sourcing and retail.

## 🚀 Features

### Customer Features
- **Product Catalog** - Browse and search electronic components
- **Shopping Cart** - Add items, manage quantities, persistent storage
- **Secure Checkout** - Complete order placement with customer information
- **Paystack Integration** - Accept payments via MTN MoMo, cards, and more
- **Theme Customization** - Light, dark, and premium themes
- **WhatsApp Integration** - Direct contact button
- **Location Services** - Store location with maps
- **AI Chat** - Customer support assistant

### Admin Features
- **Dashboard** - Overview of orders and inventory
- **Inventory Management** - Add, edit, and manage products
- **Order Management** - Track and update order statuses
- **Password Protection** - Secure admin access with bcrypt hashing
- **Theme Customizer** - Customize site appearance
- **Settings Panel** - Configure site settings

## 🛠️ Tech Stack

- **Framework:** Next.js 15.5.24 with App Router
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 4
- **Databases:** 
  - MongoDB with Mongoose (primary)
  - Prisma ORM (optional/dual support)
- **Authentication:** Signed, time-limited HMAC admin sessions with bcrypt password verification
- **Payment:** Paystack (@paystack/inline-js)
- **State Management:** Zustand
- **Data Fetching:** TanStack React Query
- **Form Validation:** Zod 4
- **UI Components:** Custom components with Lucide icons
- **Maps:** Leaflet & React-Leaflet
- **Color Picker:** React Color

## 📋 Prerequisites

- Node.js 20+ (recommended)
- MongoDB database (local or Atlas)
- Paystack account for payments (optional for testing)
- Git

## 🔧 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/D-9ice/macsunny-ecommerce-2025.git
cd macsunny
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

```bash
# Required
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/macsunny
DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/macsunny
ADMIN_PASSWORD=your_secure_password

# Required for NextAuth
NEXTAUTH_SECRET=generate_with_openssl_rand_hex_32
NEXTAUTH_URL=http://localhost:3000

# Required for Payments (get from Paystack dashboard)
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_xxxxx
PAYSTACK_SECRET_KEY=sk_test_xxxxx
```

### 4. Generate Prisma Client (Optional)

If using Prisma:

```bash
npx prisma generate
```

### 5. Seed Database (Optional)

```bash
npm run seed
# or
npx tsx scripts/seed-products.ts
```

## 🚀 Development

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🏗️ Build for Production

```bash
npm run build
npm start
```

## 🔑 Admin Access

### Access the Admin Panel

1. **Keyboard Shortcut:** Press `Ctrl+Shift+A` (or `Cmd+Shift+A` on Mac) from the homepage
2. **Direct URL:** Navigate to `/admin/login`

### Admin Credentials

- Admin credentials are database-backed and bcrypt-hashed.
- There is intentionally **no default production password** and no automatic default-account creation.
- Keep admin credentials and all signing secrets out of source control.

### Admin Routes

- `/admin` - Main admin dashboard
- `/admin/inventory` - Product management
- `/admin/orders` - Order tracking
- `/admin/settings` - Theme and site customization
- `/admin/password` - Change admin password

## 📁 Project Structure

```
macsunny/
├── app/
│   ├── api/              # API routes
│   │   ├── admin/        # Admin authentication APIs
│   │   ├── auth/         # NextAuth configuration
│   │   ├── orders/       # Order management APIs
│   │   └── products/     # Product APIs
│   ├── admin/            # Admin panel pages
│   ├── checkout/         # Checkout flow
│   ├── components/       # Page-specific components
│   ├── context/          # React contexts (Theme)
│   ├── lib/              # Utilities and helpers
│   │   ├── auth.ts       # Authentication helpers
│   │   ├── cart.ts       # Cart management
│   │   ├── mongodb.ts    # MongoDB connection
│   │   ├── paystack.ts   # Payment integration
│   │   ├── prisma.ts     # Prisma client
│   │   └── validations.ts# Zod schemas
│   └── providers/        # Context providers
├── components/           # Shared components
├── prisma/              # Prisma schema
├── public/              # Static assets
├── scripts/             # Database seeding scripts
└── src/
    └── models/          # Mongoose models
```

## 🔒 Security Features

- **bcrypt Password Hashing** - Secure password storage
- **Signed Admin Sessions** - HMAC-signed, expiring server-verified sessions
- **HTTP-only Cookies** - Session cookies are inaccessible to browser JavaScript
- **Input Validation** - Zod schema validation on all inputs
- **Environment Variables** - Sensitive data protection
- **CORS Protection** - Configured for production

## 💳 Payment Integration

### Paystack Setup

1. Create account at [paystack.com](https://paystack.com)
2. Get your API keys from Dashboard → Settings → Developer
3. Add keys to `.env.local`:
   ```
   NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_xxxxx
   PAYSTACK_SECRET_KEY=sk_test_xxxxx
   ```
4. Test with Paystack test cards before going live

### Supported Payment Methods

- Mobile Money (MTN, AirtelTigo, Vodafone)
- Visa/Mastercard
- Bank Transfer
- USSD

## 📱 PWA Support

The app includes a web manifest for progressive web app capabilities:

- Installable on mobile devices
- Offline page support
- Custom app icons

## 🎨 Theme Customization

Access `/admin/settings` to customize:
- Color mode (Light/Dark/Premium)
- Accent colors
- Font scaling
- Border radius

Changes are saved to localStorage and persist across sessions.

## 🧪 Testing

```bash
# Run tests (add your test commands)
npm test

# Type checking
npm run type-check

# Lint code
npm run lint
```

## 📦 Database Seeding

Seed sample products:

```bash
npx tsx scripts/seed-products.ts
```

## 🐛 Troubleshooting

### MongoDB Connection Issues

- Verify `MONGODB_URI` is correct
- Check IP whitelist in MongoDB Atlas
- Ensure network connectivity

### Hydration Errors

- Clear `.next` cache: `rm -rf .next`
- Rebuild: `npm run build`

### Payment Not Working

- Verify Paystack keys are correct
- Check browser console for errors
- Ensure Paystack script loads (check Network tab)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is private and proprietary to MacSunny Electronics.

## 📞 Support

- **Email:** Macsunny2025@gmail.com
- **WhatsApp:** +233 243380902, +233 249135208, +233 551507985
- **Website:** [www.macsunny.com](https://www.macsunny.com)

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- Vercel for hosting platform
- Paystack for payment infrastructure
- MongoDB for database services

---

**Built with ❤️ by MacSunny Electronics Team**
