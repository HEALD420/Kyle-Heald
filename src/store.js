// Simulated Etsy store state. Every agent reads and mutates this world.
// Swap the simulation for real Etsy API v3 calls in src/etsy.js when you
// have an Etsy developer key (see README).

const PRODUCT_SEED = [
  { name: 'Lavender Soy Candle', emoji: '🕯️', price: 18.0, cost: 6.5 },
  { name: 'Hand-Thrown Ceramic Mug', emoji: '☕', price: 32.0, cost: 11.0 },
  { name: 'Macrame Wall Hanging', emoji: '🪢', price: 45.0, cost: 14.0 },
  { name: 'Botanical Art Print A4', emoji: '🌿', price: 15.0, cost: 3.0 },
  { name: 'Sterling Moon Necklace', emoji: '🌙', price: 38.0, cost: 12.5 },
  { name: 'Chunky Knit Beanie', emoji: '🧶', price: 24.0, cost: 8.0 },
  { name: 'Walnut Phone Stand', emoji: '📱', price: 27.0, cost: 9.0 },
  { name: 'Pressed Flower Bookmark', emoji: '🌸', price: 9.0, cost: 2.0 },
  { name: 'Hand-Poured Bath Salts', emoji: '🛁', price: 14.0, cost: 4.5 },
  { name: 'Custom Pet Portrait', emoji: '🐶', price: 60.0, cost: 15.0 },
];

const CUSTOMER_NAMES = [
  'Maya R.', 'Jordan P.', 'Sam K.', 'Priya N.', 'Lena F.', 'Diego M.',
  'Avery T.', 'Noor H.', 'Felix W.', 'Tasha B.', 'Quinn D.', 'Ines G.',
];

const QUESTIONS = [
  'Hi! Can this be gift wrapped?',
  'Do you ship to Canada?',
  'Is this item back in stock soon?',
  'Could I get this personalized with a name?',
  'How long does processing take?',
  'Is the material hypoallergenic?',
  'Can I change my shipping address?',
  'Do you offer bundle discounts?',
];

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const chance = (p) => Math.random() < p;

let orderSeq = 1000;
let msgSeq = 1;

function createStore() {
  const store = {
    products: PRODUCT_SEED.map((p, i) => ({
      id: 'p' + (i + 1),
      ...p,
      stock: 8 + Math.floor(Math.random() * 12),
      views: 0,
      favorites: 0,
      seoScore: 40 + Math.floor(Math.random() * 25), // 0-100, agents improve it
      optimizedTitle: null,
      tags: [],
    })),
    orders: [],          // {id, productId, qty, buyer, status: new|packed|shipped, total}
    messages: [],        // {id, from, text, answered}
    stats: {
      revenue: 0,
      profit: 0,
      ordersShipped: 0,
      messagesAnswered: 0,
      visitorsToday: 0,
      promosRun: 0,
      restocks: 0,
      trendsSpotted: 0,
      reportsFiled: 0,
    },
    trends: [],          // strings the Trend Scout discovers
    day: 1,
  };

  return store;
}

// One world tick: shoppers browse, buy, and write messages on their own.
// Agent activity raises traffic (handled by the engine via trafficBoost).
function simulateWorld(store, trafficBoost = 1) {
  const visitors = Math.round((1 + Math.floor(Math.random() * 4)) * trafficBoost);
  store.stats.visitorsToday += visitors;

  for (let i = 0; i < visitors; i++) {
    const product = rand(store.products);
    product.views++;
    if (chance(0.18)) product.favorites++;

    // Better SEO -> better conversion
    const buyChance = 0.03 + (product.seoScore / 100) * 0.07;
    if (product.stock > 0 && chance(buyChance * trafficBoost)) {
      const qty = chance(0.15) ? 2 : 1;
      product.stock -= Math.min(qty, product.stock);
      store.orders.push({
        id: 'ETSY-' + orderSeq++,
        productId: product.id,
        productName: product.name,
        emoji: product.emoji,
        qty,
        buyer: rand(CUSTOMER_NAMES),
        status: 'new',
        total: +(product.price * qty).toFixed(2),
        cost: +(product.cost * qty).toFixed(2),
      });
    }
  }

  if (chance(0.10 * trafficBoost)) {
    store.messages.push({
      id: 'm' + msgSeq++,
      from: rand(CUSTOMER_NAMES),
      text: rand(QUESTIONS),
      answered: false,
    });
  }
}

module.exports = { createStore, simulateWorld, rand, chance };
