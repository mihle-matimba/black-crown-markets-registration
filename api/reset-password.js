const { skalePost, getToken, readBody, requirePost, sendJson } = require('./_skale');

// KNOWN GAP: Skale's docs mark `email` as mandatory on ResetPassword even when
// a reset token is supplied, but the token-only flow (new-password.html) never
// collects an email — there's no lookup here to resolve one from the token.
// Passing `email: undefined` until that's implemented server-side.
module.exports = async (req, res) => {
  if (requirePost(req, res)) return;

  try {
    const { email, token, new_password, confirm_password, old_password } = await readBody(req);
    const accessToken = await getToken();
    const result = await skalePost('/api/v-2', {
      access_token: accessToken,
      request: 'ResetPassword',
      email,
      new_password,
      confirm_password,
      old_password,
      token
    });
    sendJson(res, 200, result);
  } catch (err) {
    sendJson(res, 500, { error: err.message });
  }
};
