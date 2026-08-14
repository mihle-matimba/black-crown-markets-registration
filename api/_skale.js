const https = require('https');

const CLIENT_ID = process.env.SKALE_CLIENT_ID || 'bcm-dev_black_crown';
const CLIENT_SECRET = process.env.SKALE_CLIENT_SECRET;
const DEFAULT_PLATFORM = process.env.SKALE_DEFAULT_PLATFORM || 'MT5';

// Upstream calls get a hard timeout so a slow Skale surfaces as a real error
// instead of hanging until the platform kills the whole invocation (which
// leaves the browser with a dropped connection and no idea what happened).
// The default is deliberately generous: account creation provisions a trading
// account and legitimately takes far longer than a lookup, so a short ceiling
// here aborts work that would have succeeded. Endpoints that should give up
// sooner pass their own timeoutMs.
const DEFAULT_TIMEOUT_MS = 30000;

// Authorisation runs before the real request, so its ceiling is part of every
// call's budget -- but Skale's auth endpoint is genuinely slow (seconds, not
// milliseconds), so this has to be generous enough not to abort a call that
// would have completed. It is deliberately not retried: a retry here doubles
// the worst case in front of the request that actually matters.
const AUTH_TIMEOUT_MS = 20000;

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

// `retries` is opt-in per call and off by default. Nothing on the hot path
// uses it: a retry in front of a slow call just doubles the wait before the
// request that matters, and retrying a call that consumes a one-time code can
// spend a second OTP the client never asked to spend.
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

// Every call authorises for itself. This used to cache the token across warm
// invocations to keep the auth round trip off the hot path, but Skale expects
// a token generated per request: a reused token is rejected, and because the
// cache lived on the module it kept being reused for as long as the instance
// stayed warm. That turned one stale token into every subsequent call on that
// instance failing with an OAuth-shaped {error, error_description} reply --
// which the sign-in page then reported as a bad password.
//
// The cost is one extra round trip per call. That is what maxDuration in
// vercel.json has to cover, and correctness is worth more than the saving.
async function getToken() {
  if (!CLIENT_SECRET) throw new Error('SKALE_CLIENT_SECRET is not configured');
  const auth = await skalePost('/api/authorisation', {
    grant_type: 'client_credentials',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET
  }, { timeoutMs: AUTH_TIMEOUT_MS });
  if (!auth || !auth.access_token) {
    // Carry Skale's own wording out to the caller instead of a bare 'Auth
    // failed', so a rejected client credential is not mistaken for a rejected
    // user credential further up.
    const detail = auth && (auth.error_description || auth.error);
    throw new Error(detail ? `Authorisation failed: ${detail}` : 'Authorisation failed');
  }
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
