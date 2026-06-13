# 🏰 Etsy Agent HQ

An AI agent army that runs your Etsy store from a live, animated dashboard.
Eight agents, each with one job and their own room, working around the clock:

| Room | Agent | Job |
|---|---|---|
| 🚪 Listing Lab | 🧙‍♀️ **Lexi** the Listing Wizard | Rewrites titles, tags & descriptions for SEO |
| 🚪 Pricing Deck | 🏴‍☠️ **Penny** the Price Captain | Watches demand and tunes prices |
| 🚪 Shipping Bay | 🤖 **Otto** the Order Bot | Packs orders, prints labels, ships boxes |
| 🚪 Stockroom | 🦉 **Iris** the Inventory Keeper | Restocks before anything sells out |
| 🚪 Care Lounge | 🩺 **Mira** the Message Medic | Answers every customer message |
| 🚪 Promo Studio | 🎺 **Bea** the Marketing Bard | Runs promos & socials to pull in traffic |
| 🚪 Lookout Tower | 🔭 **Scout** the Trend Tracker | Spots what buyers want next |
| 🚪 Counting House | 🧮 **Fin** the Finance Gnome | Keeps the books, files profit reports |

The dashboard shows each agent working in their room (speech bubbles, status
lights, XP levels), a live activity wire, the trend board, store shelf with
stock/SEO/price per product, and topline stats (revenue, profit, queue, inbox).

## Run it

```sh
npm install   # only needed for the optional Claude integration
npm start     # → http://localhost:3000
```

Zero config — the store ships with a built-in shop simulation so you can watch
the army work immediately. Toggle agents off and watch the order queue and
inbox pile up; deploy them again and watch it drain.

## Optional: real AI copywriting

Set an Anthropic API key and Lexi (listings) + Mira (customer replies) will
write their copy with Claude instead of templates:

```sh
export ANTHROPIC_API_KEY=sk-ant-...
npm start
```

A `🧠 Claude copy: ON` badge appears in the header when active.

## Connecting your real Etsy store

The simulation lives in `src/store.js` and is intentionally shaped like the
Etsy API v3 domain (listings, receipts/orders, conversations). To go live:

1. Create an app at https://www.etsy.com/developers and complete OAuth 2.0
   (Etsy requires PKCE) to get an access token for your shop.
2. Replace `simulateWorld()` with polling of:
   - `GET /v3/application/shops/{shop_id}/receipts` → feeds Otto's order queue
   - `GET /v3/application/shops/{shop_id}/listings/active` → products/stock
   - conversations endpoints → Mira's inbox
3. Point agent actions at the corresponding write endpoints
   (`PATCH /listings/{id}` for Lexi's titles/tags and Penny's prices, etc.).

The agent engine (`src/agents.js`) doesn't care where the data comes from —
each agent only reads/writes the store object, so swapping the backing data
source doesn't touch the dashboard.

## Architecture

```
server.js          zero-framework HTTP server: static files, JSON API, SSE
src/store.js       store state + shop simulation (swap for real Etsy API)
src/agents.js      the 8 agents + engine (1s world tick, per-agent cooldowns)
src/brain.js       optional Claude API brain for copywriting agents
public/            the HQ dashboard (vanilla HTML/CSS/JS)
```
