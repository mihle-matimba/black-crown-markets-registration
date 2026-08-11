const { skalePost, getToken, readBody, requirePost, sendJson } = require('./_skale');

module.exports = async (req, res) => {
  if (requirePost(req, res)) return;

  try {
    const { email, password } = await readBody(req);
    const token = await getToken();
    const login = await skalePost('/api/v-2', {
      access_token: token,
      request: 'Login',
      email,
      account_number: email,
      password
    });

    // Skale sometimes returns the token at the top level instead of nested
    // under `object` — normalize so the frontend can always read object._token.
    const tokenValue = login && (login._token || (login.object && login.object._token));
    if (tokenValue) {
      login.object = { ...(login.object || {}), _token: tokenValue };
    }

    sendJson(res, 200, login);
  } catch (err) {
    sendJson(res, 500, { error: err.message });
  }
};
