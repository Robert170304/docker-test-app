// index.js
const http = require('http');
const { Client } = require('pg');

const DB_HOST = process.env.DATABASE_HOST || 'localhost';
const DB_PORT = process.env.DATABASE_PORT || 5432;
const DB_USER = process.env.DATABASE_USER || 'dev';
const DB_PASS = process.env.DATABASE_PASSWORD || 'devpass';
const DB_NAME = process.env.DATABASE_NAME || 'devdb';

// simple retry helper for connecting to Postgres
async function waitForDb(retries = 10, delayMs = 1000) {
  for (let i = 0; i < retries; i++) {
    const client = new Client({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASS,
      database: DB_NAME,
    });
    try {
      await client.connect();
      await client.end();
      console.log('Connected to Postgres');
      return true;
    } catch (err) {
      console.log(`Postgres not ready yet (attempt ${i+1}/${retries}) — retrying in ${delayMs}ms`);
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  throw new Error('Could not connect to Postgres after retries');
}

const server = http.createServer(async (req, res) => {
  if (req.url === '/db') {
    // On /db, run a simple SELECT NOW()
    const client = new Client({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASS,
      database: DB_NAME,
    });

    try {
      await client.connect();
      const result = await client.query('SELECT NOW() as now');
      await client.end();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ now: result.rows[0].now }));
    } catch (err) {
      console.error('DB query error', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'db_error', detail: err.message }));
    }
    return;
  }

  // default root
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello from docker with live reload, this is day 2!');
});

(async () => {
  try {
    // wait for DB to be ready before starting server (helps avoid errors)
    await waitForDb(15, 2000);
  } catch (err) {
    console.error(err);
    // still start server so healthcheck can show unready state; app will return DB errors on /db
  }

  server.listen(3000, "0.0.0.0", () => {
    console.log('Server running on port 3000');
  });
})();
