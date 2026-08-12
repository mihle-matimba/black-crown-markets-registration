const { skalePost, getToken, readBody, requirePost, sendJson } = require('./_skale');

module.exports = async (req, res) => {
  if (requirePost(req, res)) return;

  try {
    const { token, email } = await readBody(req);
    const accessToken = await getToken();
    const result = await skalePost('/api/v-2', {
      access_token: accessToken,
      request: 'GetOTPConfirmation',
      otp_code: token,
      email
    });
    sendJson(res, 200, result);
  } catch (err) {
    sendJson(res, 500, { error: err.message });
  }
};
