const { skalePost, getToken, readBody, requirePost, sendJson } = require('./_skale');

module.exports = async (req, res) => {
  if (requirePost(req, res)) return;

  try {
    const { email } = await readBody(req);
    const token = await getToken();
    const result = await skalePost('/api/v-2', { access_token: token, request: 'ForgotPasswordToken', email });
    sendJson(res, 200, result);
  } catch (err) {
    sendJson(res, 500, { error: err.message });
  }
};
