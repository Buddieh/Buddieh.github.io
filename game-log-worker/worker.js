/*
 * Game Log relay: a Cloudflare Worker that saves Game Log entries to one Notion database.
 *
 * The Notion secret lives here, as a Worker secret, never in the browser. Every project
 * site on buddieh.com shares one browser origin, so anything kept in the page's storage
 * can be read by all of them. The page only holds a passphrase, which can do nothing
 * except add entries to this one database.
 *
 * Setup (Cloudflare dashboard → Workers & Pages → your relay Worker):
 *   1. Replace the Worker's code with this file and deploy.
 *   2. Settings → Variables and Secrets, add:
 *        NOTION_TOKEN   (Secret)  the Notion integration secret, ntn_… or secret_…
 *        NOTION_DB      (Text)    the 32-character database ID from the database URL
 *        PASSPHRASE     (Secret)  any long random phrase; you type it once into the Game Log
 *        ALLOWED_ORIGIN (Text)    optional, defaults to https://buddieh.com
 *   3. In Notion, open the database → ••• → Connections and add the integration.
 *   4. On buddieh.com/game-log.html open ⚙ Setup, enter the Worker URL and the passphrase,
 *      and press Test connection.
 *
 * Endpoints:
 *   GET  /check   → 200 if the passphrase is right and Notion can see the database
 *   POST /entry   → body {title: string, children: Notion blocks[]}; creates a page
 */

const NOTION = 'https://api.notion.com/v1';
const NOTION_VERSION = '2026-03-11'; // latest Notion API version as of November 2026
const MAX_BODY = 200_000; // bytes; a long entry is ~20 KB

export default {
  async fetch(request, env) {
    const origin = env.ALLOWED_ORIGIN || 'https://buddieh.com';
    const cors = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin',
    };
    const reply = (status, data) => new Response(JSON.stringify(data), {
      status, headers: { ...cors, 'Content-Type': 'application/json' },
    });

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.headers.get('Origin') !== origin) return reply(403, { message: 'Origin not allowed.' });
    if (!env.NOTION_TOKEN || !env.NOTION_DB || !env.PASSPHRASE) {
      return reply(500, { message: 'The relay is missing NOTION_TOKEN, NOTION_DB or PASSPHRASE.' });
    }
    const given = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    if (!(await sameText(given, env.PASSPHRASE))) return reply(401, { message: 'Wrong passphrase.' });

    const notion = (path, method, body) => fetch(NOTION + path, {
      method,
      headers: {
        'Authorization': 'Bearer ' + env.NOTION_TOKEN,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const pass = async (res) => reply(res.status, res.ok ? { ok: true } : { message: (await res.json().catch(() => ({}))).message || 'Notion error ' + res.status });

    // Since API version 2025-09-03 a database holds one or more data sources (its tables), and
    // pages are created in a data source. Use the database's first one, and its title column,
    // whatever it is called.
    let target;
    try { target = await findTarget(env, notion); }
    catch (e) { return reply(e.status || 502, { message: e.message }); }

    const { pathname } = new URL(request.url);
    if (request.method === 'GET' && pathname === '/check') return reply(200, { ok: true });
    if (request.method === 'POST' && pathname === '/entry') {
      const text = await request.text();
      if (text.length > MAX_BODY) return reply(413, { message: 'Entry is too long.' });
      let entry;
      try { entry = JSON.parse(text); } catch { return reply(400, { message: 'Body is not JSON.' }); }
      const title = String(entry.title || '').trim().slice(0, 2000);
      if (!title) return reply(400, { message: 'The entry needs a title.' });
      if (!Array.isArray(entry.children) || entry.children.length > 100) return reply(400, { message: 'children must be a list of at most 100 blocks.' });
      // The database is fixed here, so the passphrase can only ever add pages to it.
      return pass(await notion('/pages', 'POST', {
        parent: { type: 'data_source_id', data_source_id: target.source },
        properties: { [target.title]: { title: [{ text: { content: title } }] } },
        children: entry.children,
      }));
    }
    return reply(404, { message: 'Not found.' });
  },
};

// Looked up once per Worker instance: {db, source: data source id, title: title property name}.
let cached = null;
async function findTarget(env, notion) {
  if (cached && cached.db === env.NOTION_DB) return cached;
  const read = async (path) => {
    const res = await notion(path, 'GET');
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.message || 'Notion error ' + res.status), { status: res.status });
    return data;
  };
  const db = await read('/databases/' + encodeURIComponent(env.NOTION_DB));
  const source = (db.data_sources || [])[0];
  if (!source) throw Object.assign(new Error('That database has no data source the integration can see.'), { status: 404 });
  const ds = await read('/data_sources/' + encodeURIComponent(source.id));
  const title = Object.entries(ds.properties || {}).find(([, p]) => p.type === 'title');
  if (!title) throw Object.assign(new Error('The database has no title column.'), { status: 400 });
  cached = { db: env.NOTION_DB, source: source.id, title: title[0] };
  return cached;
}

// Compare two strings without leaking how much of the passphrase matched.
async function sameText(a, b) {
  const enc = new TextEncoder();
  const [x, y] = await Promise.all([a, b].map(s => crypto.subtle.digest('SHA-256', enc.encode(s))));
  const u = new Uint8Array(x), v = new Uint8Array(y);
  let diff = 0;
  for (let i = 0; i < u.length; i++) diff |= u[i] ^ v[i];
  return diff === 0;
}
