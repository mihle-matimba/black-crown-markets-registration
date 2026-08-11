const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const CLIENT_ID = 'bcm-dev_black_crown';
const CLIENT_SECRET = 'mp8zT8j8oqpzgWj4VeVsnye5LyP2xXbs';

function skalePost(urlPath, data) {
  return new Promise((resolve, reject) => {
    const body = new URLSearchParams(data).toString();
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
  const auth = await skalePost('/api/authorisation', {
    grant_type: 'client_credentials',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET
  });
  if (!auth.access_token) throw new Error('Auth failed');
  return auth.access_token;
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => resolve(JSON.parse(body)));
  });
}

function serveFile(res, filename) {
  const html = fs.readFileSync(path.join(__dirname, filename), 'utf8');
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(html);
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // Pages
  if (req.method === 'GET') {
    if (req.url === '/' || req.url === '/login') { serveFile(res, 'bcm-login.html'); return; }
    if (req.url === '/register') { serveFile(res, 'bcm-register.html'); return; }
    if (req.url === '/register-demo') { serveFile(res, 'bcm-register-demo.html'); return; }
  }

  // Login
  if (req.method === 'POST' && req.url === '/login') {
    try {
      const { email, password } = await parseBody(req);
      const token = await getToken();
      const login = await skalePost('/api/v-2', { access_token: token, request: 'Login', email, password });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(login));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // Forgot Password
  if (req.method === 'POST' && req.url === '/forgot-password') {
    try {
      const { email } = await parseBody(req);
      const token = await getToken();
      const result = await skalePost('/api/v-2', { access_token: token, request: 'ForgotPasswordToken', email });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // Reset Password
  if (req.method === 'POST' && req.url === '/reset-password') {
    try {
      const { email, token, new_password, confirm_password } = await parseBody(req);
      const accessToken = await getToken();
      const result = await skalePost('/api/v-2', { access_token: accessToken, request: 'ResetPassword', email, new_password, confirm_password, token });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // Create Live Account
  if (req.method === 'POST' && req.url === '/register') {
    try {
      const body = await parseBody(req);
      const token = await getToken();
      const result = await skalePost('/api/v-2', {
        access_token: token,
        request: 'CreateLiveAccount',
        first_name: body.first_name,
        last_name: body.last_name,
        email: body.email,
        phone: body.phone,
        country: body.country,
        password: body.password,
        currency: body.currency || 'USD',
        platform_name: 'MT5',
        ip: '127.0.0.1',
        account_type_requested: body.account_type,
        requested_leverage: body.leverage,
        identification_number: body.identification_number,
        terms: body.terms ? '1' : '0',
        privacy: body.privacy ? '1' : '0',
        clientagreement: body.clientagreement ? '1' : '0',
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // Create Demo Account
  if (req.method === 'POST' && req.url === '/register-demo') {
    try {
      const body = await parseBody(req);
      const token = await getToken();
      const result = await skalePost('/api/v-2', {
        access_token: token,
        request: 'CreateDemoAccount',
        first_name: body.first_name,
        last_name: body.last_name,
        email: body.email,
        phone: body.phone,
        country: body.country,
        password: body.password,
        currency: body.currency || 'USD',
        platform_name: 'MT5',
        ip: '127.0.0.1',
        account_type_requested: body.account_type,
        requested_leverage: body.leverage,
        identification_number: body.identification_number,
        terms: body.terms ? '1' : '0',
        privacy: body.privacy ? '1' : '0',
        clientagreement: body.clientagreement ? '1' : '0',
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`BCM running at http://localhost:${PORT}`);
});
