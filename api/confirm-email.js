const { skalePost, getToken, readBody, requirePost, sendJson } = require('./_skale');

// Skale's underlying API call is GetOTPConfirmation (param name: otp_code),
// but on our side this is just the token from the confirmation link, not a
// user-entered one-time code, so it's named email_confirmation throughout.
module.exports = async (req, res) => {
  if (requirePost(req, res)) return;

  try {
    const { email, email_confirmation } = await readBody(req);
    const accessToken = await getToken();
    const result = await skalePost('/api/v-2', {
      access_token: accessToken,
      request: 'GetOTPConfirmation',
      email,
      otp_code: email_confirmation
    });
    sendJson(res, 200, result);
  } catch (err) {
    sendJson(res, 500, { error: err.message });
  }
};
