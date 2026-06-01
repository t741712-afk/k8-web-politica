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
    { icon: '🗳️', tag: 'Elecciones 2027', title: 'El PPF registra su candidatura para las elecciones generales de mayo de 2027', excerpt: 'Ana Morales encabeza la lista nacional del PPF. El partido concurre por primera vez con presencia en las 52 circunscripciones.', date: '10 enero 2027' },
    { icon: '📊', tag: 'Encuestas', title: 'El PPF escala al 21% en el barómetro de enero, su mejor resultado histórico', excerpt: 'El ascenso se consolida a cuatro meses de las elecciones. Los analistas sitúan al PPF como llave del próximo gobierno.', date: '18 enero 2027' },
    { icon: '📢', tag: 'Programa electoral', title: 'Presentado el programa electoral completo: 180 medidas para transformar España', excerpt: 'Economía, sanidad, vivienda y transición ecológica centran las propuestas del PPF de cara a las generales de mayo de 2027.', date: '25 enero 2027' },
  ]);
});

// GET /api/events
app.get('/api/events', (_, res) => {
  res.json([
    { day: '15', month: 'FEB', title: 'Arranque de campaña — Mitin de apertura en Madrid', location: '📍 Palacio de los Deportes, Madrid · 19:00h', badge: 'Gratuito' },
    { day: '01', month: 'MAR', title: 'Gran mitin en Barcelona — "El cambio empieza aquí"', location: '📍 Palau Sant Jordi, Barcelona · 18:30h', badge: 'Gratuito' },
    { day: '22', month: 'MAR', title: 'Debate electoral en televisión nacional', location: '📍 TVE · Retransmisión en directo · 22:00h', badge: 'En directo' },
    { day: '10', month: 'ABR', title: 'Jornada de puertas abiertas en sedes provinciales', location: '📍 Todas las provincias · 11:00h', badge: 'Gratuito' },
    { day: 'MAY', month: '2027', title: '🗳️ Elecciones Generales — ¡A votar!', location: '📍 Colegios electorales de toda España', badge: 'Día D' },
  ]);
});

initDB().then(() => {
  app.listen(3000, () => console.log('Backend PPF escuchando en :3000'));
});
