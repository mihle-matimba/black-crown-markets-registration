const { skalePost, getToken, readBody, setCors, sendJson } = require('../lib/skale');

function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.socket ? req.socket.remoteAddress : '';
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (req.method !== 'POST') { sendJson(res, 405, { error: 'Method not allowed' }); return; }

  try {
    const body = await readBody(req);
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
      ip: clientIp(req),
      account_type_requested: body.account_type,
      requested_leverage: body.leverage,
      identification_number: body.identification_number,
      terms: body.terms ? '1' : '0',
      privacy: body.privacy ? '1' : '0',
      clientagreement: body.clientagreement ? '1' : '0',
    });
    sendJson(res, 200, result);
  } catch (err) {
    sendJson(res, 500, { error: err.message });
  }
};
