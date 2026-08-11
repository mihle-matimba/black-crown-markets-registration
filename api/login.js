const { skalePost, getToken, readBody, setCors, sendJson } = require('../lib/skale');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (req.method !== 'POST') { sendJson(res, 405, { error: 'Method not allowed' }); return; }

  try {
    const { email, password } = await readBody(req);
    const token = await getToken();
    const login = await skalePost('/api/v-2', { access_token: token, request: 'Login', email, password });
    sendJson(res, 200, login);
  } catch (err) {
    sendJson(res, 500, { error: err.message });
  }
};
