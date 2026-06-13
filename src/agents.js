// The agent army. Each agent lives in its own room, has one job, and runs on
// its own cooldown. The engine ticks the world once per second and wakes any
// agent whose cooldown has elapsed.

const { simulateWorld, rand, chance } = require('./store');
const brain = require('./brain');

const TAG_POOL = [
  'handmade', 'cottagecore', 'boho decor', 'gift for her', 'gift for him',
  'minimalist', 'eco friendly', 'vintage style', 'self care', 'wedding gift',
  'personalized', 'aesthetic room decor', 'birthday gift', 'artisan',
];

const TREND_POOL = [
  'mushroom motifs are up 40% this week',
  '"dopamine decor" searches are spiking',
  'pearlcore jewelry is trending on socials',
  'buyers are searching "desk cozy setup"',
  'gingham everything is back',
  'searches for "teacher appreciation gift" climbing',
  'mini vase collections are hot right now',
  'celestial themes never miss in June',
];

function defineAgents() {
  return [
    {
      id: 'lexi',
      name: 'Lexi',
      title: 'Listing Wizard',
      room: 'Listing Lab',
      emoji: '🧙‍♀️',
      color: '#c084fc',
      job: 'Rewrites titles, tags & descriptions for SEO',
      cooldown: 9,
      async tick(store, log) {
        const product = store.products
          .slice()
          .sort((a, b) => a.seoScore - b.seoScore)[0];
        if (product.seoScore >= 95) {
          return log(this, `Every listing is polished ✨ auditing "${product.name}" anyway.`);
        }
        let title = null;
        if (brain.aiEnabled()) {
          title = await brain.generate(
            `Write one Etsy listing title (max 130 chars, keyword-rich, no quotes) for: ${product.name}. Reply with the title only.`,
            120
          );
        }
        if (!title) {
          title = `${product.name} | ${rand(TAG_POOL)} | ${rand(TAG_POOL)} | Handmade Gift`;
        }
        product.optimizedTitle = title;
        product.tags = Array.from(new Set([rand(TAG_POOL), rand(TAG_POOL), rand(TAG_POOL)]));
        product.seoScore = Math.min(100, product.seoScore + 6 + Math.floor(Math.random() * 6));
        log(this, `Re-spelled "${product.name}" → SEO ${product.seoScore}/100 ${brain.aiEnabled() ? '(Claude-written ✍️)' : ''}`, true);
      },
    },
    {
      id: 'penny',
      name: 'Penny',
      title: 'Price Captain',
      room: 'Pricing Deck',
      emoji: '🏴‍☠️',
      color: '#fbbf24',
      job: 'Watches the market and tunes prices',
      cooldown: 13,
      async tick(store, log) {
        const product = rand(store.products);
        const hot = product.views > 0 && product.favorites / Math.max(product.views, 1) > 0.2;
        const delta = hot ? 1 + Math.random() * 1.5 : -(0.5 + Math.random());
        const floor = product.cost * 1.8;
        const newPrice = Math.max(floor, +(product.price + delta).toFixed(2));
        const dir = newPrice > product.price ? '⬆️' : '⬇️';
        product.price = newPrice;
        log(this, `${dir} "${product.name}" repriced to $${newPrice.toFixed(2)} — ${hot ? 'demand is hot, charge for it!' : 'undercutting the competition.'}`, true);
      },
    },
    {
      id: 'otto',
      name: 'Otto',
      title: 'Order Bot',
      room: 'Shipping Bay',
      emoji: '🤖',
      color: '#60a5fa',
      job: 'Packs orders, prints labels, ships boxes',
      cooldown: 6,
      async tick(store, log) {
        const order = store.orders.find((o) => o.status !== 'shipped');
        if (!order) return log(this, 'Shipping bay clear. Re-taping boxes for fun. 📦');
        if (order.status === 'new') {
          order.status = 'packed';
          log(this, `Packed ${order.emoji} ${order.qty}× ${order.productName} for ${order.buyer} (${order.id})`, true);
        } else {
          order.status = 'shipped';
          store.stats.revenue = +(store.stats.revenue + order.total).toFixed(2);
          store.stats.profit = +(store.stats.profit + (order.total - order.cost)).toFixed(2);
          store.stats.ordersShipped++;
          log(this, `🚚 Shipped ${order.id} to ${order.buyer} — +$${order.total.toFixed(2)} revenue!`, true);
        }
      },
    },
    {
      id: 'iris',
      name: 'Iris',
      title: 'Inventory Keeper',
      room: 'Stockroom',
      emoji: '🦉',
      color: '#34d399',
      job: 'Counts stock and orders materials before they run out',
      cooldown: 11,
      async tick(store, log) {
        const low = store.products.filter((p) => p.stock <= 3);
        if (low.length === 0) {
          const p = rand(store.products);
          return log(this, `Shelf check: "${p.name}" ×${p.stock} — all healthy. 🗒️`);
        }
        const p = low[0];
        const added = 8 + Math.floor(Math.random() * 8);
        p.stock += added;
        store.stats.restocks++;
        log(this, `⚠️ "${p.name}" was nearly out — restocked +${added} (now ${p.stock}).`, true);
      },
    },
    {
      id: 'mira',
      name: 'Mira',
      title: 'Message Medic',
      room: 'Care Lounge',
      emoji: '🩺',
      color: '#f472b6',
      job: 'Answers every customer message with care',
      cooldown: 7,
      async tick(store, log) {
        const msg = store.messages.find((m) => !m.answered);
        if (!msg) return log(this, 'Inbox zero 🧘 sipping chamomile until the next ping.');
        let reply = null;
        if (brain.aiEnabled()) {
          reply = await brain.generate(
            `You are a friendly Etsy shop owner. Reply in under 40 words to this customer message: "${msg.text}". Reply text only.`,
            120
          );
        }
        if (!reply) reply = 'Absolutely — happy to help with that! 💛';
        msg.answered = true;
        msg.reply = reply;
        store.stats.messagesAnswered++;
        log(this, `Replied to ${msg.from}: "${msg.text}" → "${reply.slice(0, 60)}${reply.length > 60 ? '…' : ''}"`, true);
      },
    },
    {
      id: 'bea',
      name: 'Bea',
      title: 'Marketing Bard',
      room: 'Promo Studio',
      emoji: '🎺',
      color: '#fb923c',
      job: 'Runs promos and posts to socials to pull in traffic',
      cooldown: 15,
      boostsTraffic: true,
      async tick(store, log) {
        const p = rand(store.products);
        const moves = [
          `Posted a reel starring ${p.emoji} "${p.name}" — traffic incoming!`,
          `Dropped a 24h coupon BARD10 on "${p.name}" 🎟️`,
          `Pinned "${p.name}" to the Summer Gift Guide board 📌`,
          `Emailed past buyers about "${p.name}" — open rates looking spicy 🌶️`,
        ];
        store.stats.promosRun++;
        log(this, rand(moves), true);
      },
    },
    {
      id: 'scout',
      name: 'Scout',
      title: 'Trend Tracker',
      room: 'Lookout Tower',
      emoji: '🔭',
      color: '#22d3ee',
      job: 'Scans the market for what buyers want next',
      cooldown: 18,
      async tick(store, log) {
        const trend = rand(TREND_POOL);
        if (!store.trends.includes(trend)) store.trends.unshift(trend);
        store.trends = store.trends.slice(0, 5);
        store.stats.trendsSpotted++;
        // Scout's intel nudges a random product's SEO up a touch
        const p = rand(store.products);
        p.seoScore = Math.min(100, p.seoScore + 2);
        log(this, `📡 Intel: ${trend} — briefed the team.`, true);
      },
    },
    {
      id: 'fin',
      name: 'Fin',
      title: 'Finance Gnome',
      room: 'Counting House',
      emoji: '🧮',
      color: '#a3e635',
      job: 'Keeps the books and files profit reports',
      cooldown: 20,
      async tick(store, log) {
        store.stats.reportsFiled++;
        const margin = store.stats.revenue > 0
          ? Math.round((store.stats.profit / store.stats.revenue) * 100)
          : 0;
        log(this, `📜 Ledger #${store.stats.reportsFiled}: revenue $${store.stats.revenue.toFixed(2)}, profit $${store.stats.profit.toFixed(2)} (${margin}% margin). The hoard grows.`, true);
      },
    },
  ];
}

class Engine {
  constructor(store) {
    this.store = store;
    this.agents = defineAgents().map((a) => ({
      ...a,
      enabled: true,
      timer: Math.floor(Math.random() * a.cooldown), // stagger first runs
      xp: 0,
      tasksDone: 0,
      lastAction: 'Reporting for duty!',
      working: false,
    }));
    this.events = [];
    this.listeners = new Set();
    this.eventSeq = 0;
  }

  onEvent(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit(agent, text, productive) {
    const event = {
      id: ++this.eventSeq,
      ts: Date.now(),
      agentId: agent.id,
      agentName: agent.name,
      emoji: agent.emoji,
      color: agent.color,
      text,
      productive: Boolean(productive),
    };
    this.events.unshift(event);
    this.events = this.events.slice(0, 60);
    agent.lastAction = text;
    if (productive) {
      agent.tasksDone++;
      agent.xp += 5 + Math.floor(Math.random() * 6);
    }
    for (const fn of this.listeners) fn(event);
  }

  trafficBoost() {
    // Marketing being online makes shoppers show up; SEO average helps too.
    const bea = this.agents.find((a) => a.id === 'bea');
    const avgSeo = this.store.products.reduce((s, p) => s + p.seoScore, 0) / this.store.products.length;
    return (bea && bea.enabled ? 1.4 : 1) * (0.8 + avgSeo / 200);
  }

  start() {
    this.interval = setInterval(() => this.tick(), 1000);
  }

  async tick() {
    simulateWorld(this.store, this.trafficBoost());
    for (const agent of this.agents) {
      if (!agent.enabled || agent.working) continue;
      agent.timer++;
      if (agent.timer < agent.cooldown) continue;
      agent.timer = 0;
      agent.working = true;
      try {
        await agent.tick(this.store, (a, text, productive) => this.emit(a, text, productive));
      } catch (err) {
        this.emit(agent, `tripped over a wire (${err.message}) — rebooting.`);
      } finally {
        agent.working = false;
      }
    }
  }

  snapshot() {
    const { store } = this;
    return {
      aiEnabled: require('./brain').aiEnabled(),
      stats: store.stats,
      trends: store.trends,
      pendingOrders: store.orders.filter((o) => o.status !== 'shipped').length,
      unreadMessages: store.messages.filter((m) => !m.answered).length,
      products: store.products.map((p) => ({
        id: p.id, name: p.name, emoji: p.emoji, price: p.price,
        stock: p.stock, seoScore: p.seoScore, views: p.views, favorites: p.favorites,
      })),
      agents: this.agents.map((a) => ({
        id: a.id, name: a.name, title: a.title, room: a.room, emoji: a.emoji,
        color: a.color, job: a.job, enabled: a.enabled, working: a.working,
        xp: a.xp, level: 1 + Math.floor(Math.sqrt(a.xp / 12)),
        tasksDone: a.tasksDone, lastAction: a.lastAction,
      })),
      events: this.events.slice(0, 30),
    };
  }

  setAgentEnabled(id, enabled) {
    const agent = this.agents.find((a) => a.id === id);
    if (!agent) return false;
    agent.enabled = enabled;
    this.emit(agent, enabled ? 'Back on duty! 🫡' : 'Taking a coffee break ☕');
    return true;
  }

  setAll(enabled) {
    for (const agent of this.agents) agent.enabled = enabled;
  }
}

module.exports = { Engine };
