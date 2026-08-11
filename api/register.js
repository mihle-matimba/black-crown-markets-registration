const { skalePost, getToken, readBody, clientIp, requirePost, sendJson, DEFAULT_PLATFORM } = require('./_skale');

module.exports = async (req, res) => {
  if (requirePost(req, res)) return;

  try {
    const body = await readBody(req);
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
      platform_name: DEFAULT_PLATFORM,
      ip: clientIp(req),
      account_type_requested: body.account_type,
      requested_leverage: body.leverage,
      identification_number: body.identification_number,
      professional_status: body.professional_status,
      workatfinancial: !!body.workatfinancial,
      howlong: body.howlong,
      occupation: body.occupation,
      ibid: body.ibid,
      terms: !!body.terms,
      privacy: !!body.privacy,
      clientagreement: !!body.clientagreement,
    });
    sendJson(res, 200, result);
  } catch (err) {
    sendJson(res, 500, { error: err.message });
  }
};
