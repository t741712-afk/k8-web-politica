const express = require('express');
const cors    = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  host:     process.env.DB_HOST     || 'postgres',
  port:     process.env.DB_PORT     || 5432,
  database: process.env.DB_NAME     || 'ppf',
  user:     process.env.DB_USER     || 'ppf',
  password: process.env.DB_PASSWORD || 'ppf123',
});

// Wait for DB and init schema
async function initDB() {
  for (let i = 0; i < 10; i++) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS affiliates (
          id        SERIAL PRIMARY KEY,
          nombre    TEXT NOT NULL,
          apellidos TEXT NOT NULL,
          email     TEXT UNIQUE NOT NULL,
          provincia TEXT NOT NULL,
          mensaje   TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS newsletter (
          id    SERIAL PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);
      console.log('DB ready');
      return;
    } catch (e) {
      console.log(`DB not ready yet (attempt ${i+1}/10):`, e.message);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}

// GET /api/health
app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

// GET /api/affiliates/count
app.get('/api/affiliates/count', async (_, res) => {
  try {
    const { rows } = await pool.query('SELECT COUNT(*) AS count FROM affiliates');
    // Add a base number to make it look realistic
    res.json({ count: parseInt(rows[0].count) + 24817 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/affiliates
app.post('/api/affiliates', async (req, res) => {
  const { nombre, apellidos, email, provincia, mensaje } = req.body;
  if (!nombre || !apellidos || !email || !provincia)
    return res.status(400).json({ error: 'Campos obligatorios faltantes' });
  try {
    await pool.query(
      'INSERT INTO affiliates (nombre, apellidos, email, provincia, mensaje) VALUES ($1,$2,$3,$4,$5)',
      [nombre, apellidos, email, provincia, mensaje || '']
    );
    res.json({ ok: true });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Email ya registrado' });
    res.status(500).json({ error: e.message });
  }
});

// POST /api/newsletter
app.post('/api/newsletter', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email requerido' });
  try {
    await pool.query('INSERT INTO newsletter (email) VALUES ($1)', [email]);
    res.json({ ok: true });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Ya estás suscrito' });
    res.status(500).json({ error: e.message });
  }
});

// GET /api/news
app.get('/api/news', (_, res) => {
  res.json([
    { icon: '📢', tag: 'Nota de prensa', title: 'El PPF presenta su plan de choque contra la pobreza energética', excerpt: 'Ana Morales ha presentado hoy un paquete de medidas urgentes para garantizar el suministro básico a las familias más vulnerables.', date: '28 mayo 2026' },
    { icon: '🗳️', tag: 'Electoral', title: 'El PPF supera el 18% en las últimas encuestas nacionales', excerpt: 'Los sondeos de mayo sitúan al Partido por el Futuro como tercera fuerza política del país con tendencia al alza.', date: '22 mayo 2026' },
    { icon: '🤝', tag: 'Acuerdos', title: 'Firmado el acuerdo con sindicatos para la reforma laboral progresista', excerpt: 'El acuerdo incluye la reducción a 35 horas, subida del SMI y mayor protección ante despidos improcedentes.', date: '15 mayo 2026' },
  ]);
});

// GET /api/events
app.get('/api/events', (_, res) => {
  res.json([
    { day: '14', month: 'JUN', title: 'Mitin central en Madrid — "España que queremos"', location: '📍 Palacio de Deportes, Madrid · 19:00h', badge: 'Gratuito' },
    { day: '21', month: 'JUN', title: 'Congreso Federal extraordinario del PPF', location: '📍 Palau Sant Jordi, Barcelona · 10:00h', badge: 'Afiliados' },
    { day: '05', month: 'JUL', title: 'Jornada de puertas abiertas en sedes provinciales', location: '📍 Todas las provincias · 11:00h', badge: 'Gratuito' },
  ]);
});

initDB().then(() => {
  app.listen(3000, () => console.log('Backend PPF escuchando en :3000'));
});
