# Etsy Automator 🧡

A cross-platform (React Native + Expo) iPhone app to help automate the day-to-day
running of your Etsy shop. It connects to the **official Etsy Open API v3** and
gives you:

- **📊 Dashboard** — 30-day revenue, order count, best-sellers, and a
  "needs attention" feed.
- **📦 Orders & shipping** — see paid-but-unshipped orders and mark them shipped
  with tracking (which notifies the buyer via Etsy).
- **🏷️ Listings & inventory** — browse active listings, spot low stock, and edit
  price/quantity inline.
- **💬 Reviews & reply templates** — monitor new reviews (with low-rating
  escalation) and keep copy-paste reply templates handy.
- **⚙️ Automation** — background checks that send you push notifications for new
  orders, low stock, expiring listings, and new/low reviews.

## Why "automation" works the way it does

Etsy's public API intentionally supports some things and not others. This app is
honest about that line:

| Feature | API support | What the app does |
|---|---|---|
| Read orders / mark shipped | ✅ Yes | Fully automated detection + one-tap shipping |
| Read/edit listings & inventory | ✅ Yes | Inline editing + low-stock alerts |
| Read reviews | ✅ Yes | Automatic monitoring + notifications |
| **Send buyer messages** | ❌ **No public endpoint** | Reply *templates* you copy into Etsy Messages |
| Auto-renew listings | ⚠️ Limited | Expiry alerts (renew in Etsy when notified) |

Truly "set-and-forget" 24/7 automation (running even when your phone is off)
would need a small backend service — see [Going further](#going-further).

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- The **Expo Go** app on your iPhone (App Store) — no Mac or Xcode required.
- An Etsy developer app + API keystring.

## 1. Get an Etsy API key

1. Go to <https://www.etsy.com/developers/your-apps> and create an app.
2. Copy the **keystring** (this is your public API key).
3. Add this app's redirect URI to your Etsy app's allowed callback URLs:
   - `etsyautomator://auth`
   - For Expo Go testing you may also need the Expo proxy URI that the app
     prints to the console on first launch.
4. Etsy OAuth uses **PKCE**, so you do **not** need a client secret on the device.

## 2. Configure the key

Open `app.json` and set your keystring:

```json
"extra": { "etsyApiKey": "YOUR_ETSY_KEYSTRING" }
```

(or copy `.env.example` to `.env` and set `ETSY_API_KEY=`).

## 3. Install & run

```bash
npm install
npm start
```

Scan the QR code with your iPhone camera to open it in **Expo Go**. Tap
**Connect your Etsy shop**, sign in through Etsy, and you're in.

```bash
npm run typecheck   # static type checking
```

## Project structure

```
App.tsx                     App root: providers + navigation
src/
  api/
    config.ts               Etsy endpoints, scopes, API-key access
    auth.ts                 OAuth 2.0 PKCE login + token refresh
    etsyClient.ts           Authenticated fetch w/ auto token refresh
    endpoints.ts            Typed Etsy v3 calls (shop, listings, orders, reviews)
  automation/
    rules.ts                Rule + template config (persisted)
    engine.ts               Detects new orders/stock/expiry/reviews
    tasks.ts                Background fetch + local notifications
  context/AuthContext.tsx   Session + shop state
  screens/                  Dashboard, Orders, Listings, Messages, Automation, Settings
  components/ui.tsx         Shared UI primitives
  storage/secureStore.ts    Keychain-backed storage
  theme/colors.ts           Design tokens
  types/etsy.ts             API typings + money helpers
```

## Security notes

- Your Etsy password is never seen by the app — login is delegated to Etsy via
  OAuth in a secure web session.
- Access/refresh tokens live in the iOS Keychain (`expo-secure-store`).
- Only the scopes the features need are requested
  (`shops_r listings_r listings_w transactions_r transactions_w profile_r`).

## Going further

To run automations server-side (so they fire even when the phone is closed),
add a small backend (e.g. a scheduled serverless function) that holds the
refresh token and calls the same Etsy endpoints on a cron. The app's
`src/api` and `src/automation/engine.ts` are written so that logic can be
lifted into a Node service with minimal changes.

> Built to comply with Etsy's API Terms of Use. Respect Etsy's rate limits and
> automation policies for your shop.
