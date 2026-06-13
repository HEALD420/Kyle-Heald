// Etsy Agent HQ frontend — renders rooms, listens to the live wire (SSE),
// and polls /api/state for stats.

const roomsEl = document.getElementById('rooms');
const feedEl = document.getElementById('feed');
const trendsEl = document.getElementById('trends');
const shelfEl = document.getElementById('shelf');

const roomCards = new Map(); // agentId -> {root, bubble, level, tasks, toggle}

function buildRoom(agent) {
  const root = document.createElement('article');
  root.className = 'room';
  root.style.setProperty('--accent', agent.color);
  root.innerHTML = `
    <div class="room-head">
      <span class="room-name">${agent.room}</span>
      <span class="status-dot"></span>
    </div>
    <div class="agent-row">
      <span class="avatar">${agent.emoji}</span>
      <div class="agent-meta">
        <h3>${agent.name}<small>${agent.title}</small></h3>
        <p class="agent-job">${agent.job}</p>
      </div>
    </div>
    <div class="bubble"></div>
    <div class="room-foot">
      <span class="level-chip">Lv <b class="level">1</b> · <span class="tasks">0</span> tasks</span>
      <button class="toggle">ON</button>
    </div>`;

  const card = {
    root,
    bubble: root.querySelector('.bubble'),
    level: root.querySelector('.level'),
    tasks: root.querySelector('.tasks'),
    toggle: root.querySelector('.toggle'),
  };
  card.toggle.addEventListener('click', () =>
    fetch(`/api/agents/${agent.id}/toggle`, { method: 'POST' }).then(refresh)
  );
  roomCards.set(agent.id, card);
  roomsEl.appendChild(root);
  return card;
}

function renderAgents(agents) {
  for (const agent of agents) {
    const card = roomCards.get(agent.id) || buildRoom(agent);
    card.root.classList.toggle('on', agent.enabled);
    card.root.classList.toggle('off', !agent.enabled);
    card.root.classList.toggle('working', agent.enabled && agent.working);
    card.bubble.textContent = agent.lastAction;
    card.level.textContent = agent.level;
    card.tasks.textContent = agent.tasksDone;
    card.toggle.textContent = agent.enabled ? 'ON' : 'OFF';
  }
}

function renderStats(s) {
  const set = (id, v) => (document.getElementById(id).textContent = v);
  set('stat-revenue', '$' + s.stats.revenue.toFixed(2));
  set('stat-profit', '$' + s.stats.profit.toFixed(2));
  set('stat-shipped', s.stats.ordersShipped);
  set('stat-replies', s.stats.messagesAnswered);
  set('stat-visitors', s.stats.visitorsToday);
  set('stat-queue', s.pendingOrders);
  set('stat-inbox', s.unreadMessages);
  document.getElementById('ai-badge').hidden = !s.aiEnabled;
}

function renderTrends(trends) {
  if (!trends.length) return;
  trendsEl.innerHTML = trends.map((t) => `<li>${t}</li>`).join('');
}

function renderShelf(products) {
  shelfEl.innerHTML = products
    .map(
      (p) => `<li>
        <span>${p.emoji}</span>
        <span class="pname" title="${p.name}">${p.name}</span>
        <span class="seo-bar" title="SEO ${p.seoScore}/100"><i style="width:${p.seoScore}%"></i></span>
        <span class="price">$${p.price.toFixed(2)}</span>
        <span class="stock ${p.stock <= 3 ? 'low' : ''}">×${p.stock}</span>
      </li>`
    )
    .join('');
}

function addFeedItem(event) {
  const li = document.createElement('li');
  li.style.setProperty('--evt', event.color);
  const time = new Date(event.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  li.innerHTML = `<time>${time}</time><span class="who">${event.emoji} ${event.agentName}</span> ${escapeHtml(event.text)}`;
  feedEl.prepend(li);
  while (feedEl.children.length > 40) feedEl.lastChild.remove();

  const card = roomCards.get(event.agentId);
  if (card) {
    card.bubble.textContent = event.text;
    card.bubble.classList.remove('pop');
    void card.bubble.offsetWidth; // restart animation
    card.bubble.classList.add('pop');
  }
}

function escapeHtml(s) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

async function refresh() {
  const state = await fetch('/api/state').then((r) => r.json());
  renderAgents(state.agents);
  renderStats(state);
  renderTrends(state.trends);
  renderShelf(state.products);
}

document.getElementById('deploy-all').addEventListener('click', () =>
  fetch('/api/agents/all?enabled=1', { method: 'POST' }).then(refresh)
);
document.getElementById('pause-all').addEventListener('click', () =>
  fetch('/api/agents/all?enabled=0', { method: 'POST' }).then(refresh)
);

// Live wire
const sse = new EventSource('/api/events');
sse.onmessage = (msg) => addFeedItem(JSON.parse(msg.data));

refresh();
setInterval(refresh, 2500);
