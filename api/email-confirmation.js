const { skalePost, getToken, readBody, requirePost, sendJson } = require('./_skale');

// KNOWN GAP: Skale's docs mark `email` as mandatory on GetOTPConfirmation, but
// the real confirmation link (trade.blackcrownmarkets.com/email-confirmation/$token,
// now pointed at this page instead) only carries the token — there's no email
// to send. Passing `email: undefined` until that's resolved server-side.
// Same gap as reset-password.js.
module.exports = async (req, res) => {
  if (requirePost(req, res)) return;

  try {
    const { token } = await readBody(req);
    const accessToken = await getToken();
    const result = await skalePost('/api/v-2', {
      access_token: accessToken,
      request: 'GetOTPConfirmation',
      otp_code: token
    });
    sendJson(res, 200, result);
  } catch (err) {
    sendJson(res, 500, { error: err.message });
  }
};
