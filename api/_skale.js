const https = require('https');

const CLIENT_ID = process.env.SKALE_CLIENT_ID || 'bcm-dev_black_crown';
const CLIENT_SECRET = process.env.SKALE_CLIENT_SECRET;
const DEFAULT_PLATFORM = process.env.SKALE_DEFAULT_PLATFORM || 'MT5';

// Upstream calls get a hard timeout so a slow Skale surfaces as a real error
// instead of hanging until the platform kills the whole invocation (which
// leaves the browser with a dropped connection and no idea what happened).
const DEFAULT_TIMEOUT_MS = 8000;

function skalePostOnce(urlPath, data, timeoutMs) {
  return new Promise((resolve, reject) => {
    const cleaned = {};
    for (const key in data) {
      if (data[key] !== undefined && data[key] !== null) cleaned[key] = data[key];
    }
    const body = new URLSearchParams(cleaned).toString();
    const options = {
      hostname: 'client.api.skaleapps.io',
      path: urlPath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body)
      }
    };
    let settled = false;
    const fail = (err) => { if (!settled) { settled = true; reject(err); } };
    const done = (value) => { if (!settled) { settled = true; resolve(value); } };

    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try { done(JSON.parse(raw)); }
        catch (e) { fail(new Error('Skale returned a non-JSON response')); }
      });
    });
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error('Skale API timed out'));
    });
    req.on('error', fail);
    req.write(body);
    req.end();
  });
}

// `retries` is opt-in per call: retrying is safe for authorisation, but never
// for a request that consumes a one-time code — a retry there can spend a
// second OTP the client never asked to spend.
function skalePost(urlPath, data, options = {}) {
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const retries = options.retries || 0;
  const attempt = (remaining) =>
    skalePostOnce(urlPath, data, timeoutMs).catch((err) => {
      if (remaining <= 0) throw err;
      return attempt(remaining - 1);
    });
  return attempt(retries);
}

// Every request used to pay for a fresh authorisation round trip before it
// could even start its real call. Caching the token across warm invocations
// halves the upstream latency that was pushing requests past the timeout.
let cachedToken = null;
let cachedTokenExpiry = 0;
const MAX_TOKEN_TTL_MS = 5 * 60 * 1000;

async function getToken() {
  if (!CLIENT_SECRET) throw new Error('SKALE_CLIENT_SECRET is not configured');
  if (cachedToken && Date.now() < cachedTokenExpiry) return cachedToken;
  const auth = await skalePost('/api/authorisation', {
    grant_type: 'client_credentials',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET
  }, { retries: 1 });
  if (!auth.access_token) throw new Error('Auth failed');
  const expiresInMs = Number(auth.expires_in) > 0 ? Number(auth.expires_in) * 1000 : MAX_TOKEN_TTL_MS;
  cachedToken = auth.access_token;
  cachedTokenExpiry = Date.now() + Math.min(expiresInMs, MAX_TOKEN_TTL_MS);
  return cachedToken;
}

function readBody(req) {
  if (req.body !== undefined) {
    return Promise.resolve(typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body);
  }
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => raw += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(raw || '{}')); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.socket ? req.socket.remoteAddress : '';
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJson(res, statusCode, payload) {
  res.setHeader('Content-Type', 'application/json');
  res.statusCode = statusCode;
  res.end(JSON.stringify(payload));
}

// Returns true if the request was already handled (preflight or wrong method).
function requirePost(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return true; }
  if (req.method !== 'POST') { sendJson(res, 405, { error: 'Method not allowed' }); return true; }
  return false;
}

module.exports = { skalePost, getToken, readBody, clientIp, setCors, sendJson, requirePost, DEFAULT_PLATFORM };
