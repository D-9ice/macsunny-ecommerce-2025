# 🔑 API Keys Setup Guide - MacSunny E-Commerce

## Quick Reference for Getting Your API Keys

This guide will help you obtain all the API keys needed for MacSunny's Smart Product Manager and AI Chat Assistant.

---

## ✅ **Required API Keys**

### 1. **OpenAI API** (For AI Chat Assistant)
**Status:** ✅ You already have this!

**Add to `.env.local`:**
```bash
OPENAI_API_KEY=sk-proj-your_key_here
```

---

## 🎨 **Optional API Keys** (For Smart Product Manager Image Search)

### 2. **Google Custom Search API**
**Cost:** FREE (100 searches/day)  
**Purpose:** Search for component images online

**Steps to get:**
1. Visit https://console.cloud.google.com/
2. Create a new project (or select existing)
3. Enable "Custom Search API"
   - Go to "APIs & Services" → "Enable APIs and Services"
   - Search for "Custom Search API"
   - Click "Enable"
4. Create credentials:
   - Go to "Credentials" → "Create Credentials" → "API Key"
   - Copy your API key
5. Create Custom Search Engine:
   - Go to https://programmablesearchengine.google.com/
   - Click "Add" to create new search engine
   - In "Sites to search": enter `*` (search entire web)
   - Click "Create"
   - Copy your "Search engine ID" (cx)

**Add to `.env.local`:**
```bash
GOOGLE_SEARCH_API_KEY=your_api_key_here
GOOGLE_SEARCH_ENGINE_ID=your_cx_here
```

---

### 3. **Mouser Search API**
**Cost:** No separate API charge published for standard Search API access  
**Purpose:** Component identification, technical attributes, datasheets, images, lifecycle data, and suggested replacements

**Steps to get:**
1. Visit https://www.mouser.com/en/api-search/
2. Sign in or create a My Mouser account
3. Complete the Search API request form
4. Verify your email if requested
5. Mouser will provide the Search API key and setup information

**Add to `.env.local` or Vercel Production:**
```bash
MOUSER_API_KEY=your_key_here
MOUSER_PUBLIC_LOOKUP_ENABLED=false
```

MacSunny uses Mouser Search API V2 and keeps customer/public live lookup disabled by default.

---

### 4. **Unsplash API**
**Cost:** FREE (50 requests/hour)  
**Purpose:** Fallback for generic component category images

**Steps to get:**
1. Visit https://unsplash.com/developers
2. Click "Register as a developer"
3. Accept the developer terms
4. Click "New Application"
5. Fill in application details:
   - Application name: "MacSunny Electronics"
   - Description: "E-commerce product image search"
6. Accept API terms
7. Copy your "Access Key"

**Add to `.env.local`:**
```bash
UNSPLASH_ACCESS_KEY=your_access_key_here
```

---

## 📋 **Complete .env.local Setup**

Once you have all keys, your `.env.local` should look like this:

```bash
# ===== REQUIRED =====
MONGODB_URI=your_existing_mongodb_uri
OPENAI_API_KEY=sk-proj-your_openai_key

# ===== OPTIONAL PROVIDERS =====
GOOGLE_SEARCH_API_KEY=your_google_api_key
GOOGLE_SEARCH_ENGINE_ID=your_cx_id
MOUSER_API_KEY=your_mouser_key
MOUSER_PUBLIC_LOOKUP_ENABLED=false
UNSPLASH_ACCESS_KEY=your_unsplash_key

# ===== ALREADY CONFIGURED =====
NEXTAUTH_SECRET=your_existing_secret
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=your_paystack_public_key
PAYSTACK_SECRET_KEY=your_paystack_secret_key
```

---

## 🚀 **How Image Search Works**

The Smart Product Manager searches for images in this priority order:

1. **Local Files** (Best) - Checks `/public/components/` folder first
2. **Mouser Search API V2** - Real component images and verified product metadata
3. **Google Search** (Broadest) - Web search for component images
4. **Unsplash** (Fallback) - Generic category images
5. **Manual Upload** (Always Available) - Admin can upload directly

**Even without API keys, the system will:**
- ✅ Search local files
- ✅ Allow manual uploads
- ✅ Gracefully fallback when APIs aren't configured

---

## 💡 **Tips**

- **Start with Mouser API** - It's free and provides the best component images
- **Add Google Search next** - Broadens your search capability
- **Unsplash is optional** - Only needed for generic placeholders
- **No API keys?** No problem! You can still:
  - Upload images manually
  - Use local files in `/public/components/`
  - Add API keys later anytime

---

## 🧪 **Testing Your Setup**

1. Add your OpenAI key to `.env.local`
2. Restart your dev server: `npm run dev`
3. Go to Admin → Inventory → Click "⚡ Smart Manager"
4. Try the AI Chat button on homepage
5. Import some products and click "Auto-Enhance"

---

## ❓ **Need Help?**

If you run into issues:
1. Check the browser console for error messages
2. Verify API keys are correct in `.env.local`
3. Make sure `.env.local` is in the project root
4. Restart dev server after adding keys

---

**All set!** 🎉 You now have everything you need to use the Smart Product Manager and AI Chat Assistant.
