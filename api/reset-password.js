const { skalePost, getToken, readBody, setCors, sendJson } = require('../lib/skale');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (req.method !== 'POST') { sendJson(res, 405, { error: 'Method not allowed' }); return; }

  try {
    const { email, token, new_password, confirm_password } = await readBody(req);
    const accessToken = await getToken();
    const result = await skalePost('/api/v-2', { access_token: accessToken, request: 'ResetPassword', email, new_password, confirm_password, token });
    sendJson(res, 200, result);
  } catch (err) {
    sendJson(res, 500, { error: err.message });
  }
};
