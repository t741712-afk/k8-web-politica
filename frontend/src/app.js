const API = '/api';

/* ── Navbar scroll effect ── */
window.addEventListener('scroll', () => {
  document.getElementById('navbar').style.boxShadow =
    window.scrollY > 50 ? '0 4px 24px rgba(0,0,0,.25)' : 'none';
});

document.getElementById('hamburger').addEventListener('click', () => {
  document.querySelector('.nav-links').classList.toggle('open');
});

/* ── Affiliate counter animation ── */
async function loadAffiliateCount() {
  try {
    const r = await fetch(`${API}/affiliates/count`);
    const { count } = await r.json();
    animateCounter('counter-affiliates', count);
  } catch {
    animateCounter('counter-affiliates', 24817);
  }
}

function animateCounter(id, target) {
  const el = document.getElementById(id);
  const duration = 2000;
  const step = Math.ceil(target / (duration / 16));
  let current = 0;
  const interval = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current.toLocaleString('es-ES');
    if (current >= target) clearInterval(interval);
  }, 16);
}

/* ── News ── */
const NEWS_FALLBACK = [
  { icon: '🗳️', tag: 'Elecciones 2027', title: 'El PPF registra su candidatura para las elecciones generales de mayo de 2027', excerpt: 'Ana Morales encabeza la lista nacional del PPF. El partido concurre por primera vez con presencia en las 52 circunscripciones.', date: '10 enero 2027' },
  { icon: '📊', tag: 'Encuestas', title: 'El PPF escala al 21% en el barómetro de enero, su mejor resultado histórico', excerpt: 'El ascenso se consolida a cuatro meses de las elecciones. Los analistas sitúan al PPF como llave del próximo gobierno.', date: '18 enero 2027' },
  { icon: '📢', tag: 'Programa electoral', title: 'Presentado el programa electoral completo: 180 medidas para transformar España', excerpt: 'Economía, sanidad, vivienda y transición ecológica centran las propuestas del PPF de cara a las generales de mayo de 2027.', date: '25 enero 2027' },
];

async function loadNews() {
  let news = NEWS_FALLBACK;
  try {
    const r = await fetch(`${API}/news`);
    if (r.ok) news = await r.json();
  } catch {}

  const grid = document.getElementById('news-grid');
  grid.innerHTML = news.map(n => `
    <div class="news-card">
      <div class="news-card-img">${n.icon || '📰'}</div>
      <div class="news-card-body">
        <span class="news-card-tag">${n.tag}</span>
        <h3>${n.title}</h3>
        <p>${n.excerpt}</p>
        <span class="news-card-date">📅 ${n.date}</span>
      </div>
    </div>
  `).join('');
}

/* ── Events ── */
const EVENTS_FALLBACK = [
  { day: '15', month: 'FEB', title: 'Arranque de campaña — Mitin de apertura en Madrid', location: '📍 Palacio de los Deportes, Madrid · 19:00h', badge: 'Gratuito' },
  { day: '01', month: 'MAR', title: 'Gran mitin en Barcelona — "El cambio empieza aquí"', location: '📍 Palau Sant Jordi, Barcelona · 18:30h', badge: 'Gratuito' },
  { day: '22', month: 'MAR', title: 'Debate electoral en televisión nacional', location: '📍 TVE · Retransmisión en directo · 22:00h', badge: 'En directo' },
  { day: '10', month: 'ABR', title: 'Jornada de puertas abiertas en sedes provinciales', location: '📍 Todas las provincias · 11:00h', badge: 'Gratuito' },
  { day: 'MAY', month: '2027', title: '🗳️ Elecciones Generales — ¡A votar!', location: '📍 Colegios electorales de toda España', badge: 'Día D' },
];

async function loadEvents() {
  let events = EVENTS_FALLBACK;
  try {
    const r = await fetch(`${API}/events`);
    if (r.ok) events = await r.json();
  } catch {}

  const list = document.getElementById('events-list');
  list.innerHTML = events.map(e => `
    <div class="event-card">
      <div class="event-date"><span class="day">${e.day}</span><span class="month">${e.month}</span></div>
      <div class="event-info"><h3>${e.title}</h3><p>${e.location}</p></div>
      <span class="event-badge">${e.badge}</span>
    </div>
  `).join('');
}

/* ── Program tabs ── */
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

/* ── Survey ── */
const surveyData = { economia: 42, sanidad: 28, vivienda: 20, clima: 10 };
const surveyLabels = { economia: '💶 Economía y empleo', sanidad: '🏥 Sanidad pública', vivienda: '🏠 Vivienda', clima: '🌍 Cambio climático' };

document.querySelectorAll('.survey-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    surveyData[btn.dataset.option]++;
    btn.classList.add('selected');
    document.querySelectorAll('.survey-btn').forEach(b => b.disabled = true);
    showSurveyResults();
  });
});

function showSurveyResults() {
  const total = Object.values(surveyData).reduce((a, b) => a + b, 0);
  const barsEl = document.getElementById('survey-bars');
  barsEl.innerHTML = Object.entries(surveyData).map(([key, val]) => {
    const pct = Math.round((val / total) * 100);
    return `
      <div class="bar-row">
        <div class="bar-label"><span>${surveyLabels[key]}</span><span>${pct}%</span></div>
        <div class="bar-track"><div class="bar-fill" style="width:0%" data-width="${pct}%"></div></div>
      </div>`;
  }).join('');
  document.getElementById('survey-result').style.display = 'block';
  document.getElementById('survey-options').style.display = 'none';
  setTimeout(() => {
    document.querySelectorAll('.bar-fill').forEach(b => b.style.width = b.dataset.width);
  }, 100);
}

/* ── Affiliate form ── */
document.getElementById('affiliate-form').addEventListener('submit', async e => {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('button[type=submit]');
  const msg = document.getElementById('form-msg');
  btn.textContent = 'Enviando...';
  btn.disabled = true;

  const data = Object.fromEntries(new FormData(form));
  try {
    const r = await fetch(`${API}/affiliates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (r.ok) {
      msg.className = 'form-msg success';
      msg.textContent = '✅ ¡Bienvenido/a al PPF! Recibirás un email de confirmación en breve.';
      form.reset();
      loadAffiliateCount();
    } else {
      throw new Error();
    }
  } catch {
    msg.className = 'form-msg error';
    msg.textContent = '❌ Ha ocurrido un error. Por favor, inténtalo de nuevo.';
  }
  btn.textContent = 'Afiliarme ahora →';
  btn.disabled = false;
});

/* ── Newsletter form ── */
document.getElementById('newsletter-form').addEventListener('submit', async e => {
  e.preventDefault();
  const form = e.target;
  const msg = document.getElementById('newsletter-msg');
  const data = Object.fromEntries(new FormData(form));
  try {
    const r = await fetch(`${API}/newsletter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (r.ok) {
      msg.className = 'form-msg success';
      msg.textContent = '✅ ¡Suscripción confirmada!';
      form.reset();
    } else throw new Error();
  } catch {
    msg.className = 'form-msg error';
    msg.textContent = '❌ Error al suscribirse. Inténtalo de nuevo.';
  }
});

/* ── Init ── */
loadAffiliateCount();
loadNews();
loadEvents();
