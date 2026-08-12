const https = require('https');

const CLIENT_ID = process.env.SKALE_CLIENT_ID || 'bcm-dev_black_crown';
const CLIENT_SECRET = process.env.SKALE_CLIENT_SECRET;
const DEFAULT_PLATFORM = process.env.SKALE_DEFAULT_PLATFORM || 'MT5';

function skalePost(urlPath, data) {
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
    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function getToken() {
  if (!CLIENT_SECRET) throw new Error('SKALE_CLIENT_SECRET is not configured');
  const auth = await skalePost('/api/authorisation', {
    grant_type: 'client_credentials',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET
  });
  if (!auth.access_token) throw new Error('Auth failed');
  return auth.access_token;
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
