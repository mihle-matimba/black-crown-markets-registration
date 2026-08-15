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
      // Names per the Skale Client API doc: address2 has no underscore, and
      // the postal code goes as zip_code (CRM field name "Postal Code").
      address: body.address,
      address2: body.address_2,
      city: body.city,
      zip_code: body.postal_code,
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
      // Omit the key entirely when there is no affiliate. An empty string
      // survives the undefined/null filter in _skale.js and goes upstream as
      // `ibid=`, which is a value Skale has to interpret rather than an
      // absent field.
      ibid: body.ibid || undefined,
      terms: body.terms ? '1' : '0',
      privacy: body.privacy ? '1' : '0',
      clientagreement: body.clientagreement ? '1' : '0',
    });
    sendJson(res, 200, result);
  } catch (err) {
    sendJson(res, 500, { error: err.message });
  }
};
