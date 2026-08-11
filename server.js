const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

const loginHandler = require('./api/login');
const forgotPasswordHandler = require('./api/forgot-password');
const resetPasswordHandler = require('./api/reset-password');
const registerHandler = require('./api/register');
const registerDemoHandler = require('./api/register-demo');

function serveFile(res, filename) {
  const html = fs.readFileSync(path.join(__dirname, filename), 'utf8');
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(html);
}

const server = http.createServer(async (req, res) => {
  const url = req.url.split('?')[0];

  if (req.method === 'GET') {
    if (url === '/' || url === '/login' || url === '/login.html') { serveFile(res, 'login.html'); return; }
    if (url === '/register' || url === '/register.html') { serveFile(res, 'register.html'); return; }
    if (url === '/register-demo' || url === '/register-demo.html') { serveFile(res, 'register-demo.html'); return; }
    if (url === '/new-password' || url === '/new-password.html' || url.startsWith('/new-password/')) { serveFile(res, 'new-password.html'); return; }
  }

  if (url === '/api/login') { await loginHandler(req, res); return; }
  if (url === '/api/forgot-password') { await forgotPasswordHandler(req, res); return; }
  if (url === '/api/reset-password') { await resetPasswordHandler(req, res); return; }
  if (url === '/api/register') { await registerHandler(req, res); return; }
  if (url === '/api/register-demo') { await registerDemoHandler(req, res); return; }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`BCM running at http://localhost:${PORT}`);
});
