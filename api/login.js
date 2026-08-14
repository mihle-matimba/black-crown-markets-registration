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
      password
    });

    // Skale sometimes returns the token at the top level instead of nested
    // under `object` — normalize so the frontend can always read object._token.
    const tokenValue = login && (login._token || (login.object && login.object._token));
    if (tokenValue) {
      login.object = { ...(login.object || {}), _token: tokenValue };
    }

    // The browser can only report what it receives, and a rejected credential
    // and an unexpected response shape look identical from there. Record the
    // shape -- field names and status values only, never the token itself --
    // so the platform log can settle which one it was.
    console.log('Skale Login response shape:', JSON.stringify({
      keys: Object.keys(login || {}),
      status: login && login.status,
      status_code: login && login.status_code,
      message: login && login.message,
      token_present: !!tokenValue
    }));

    sendJson(res, 200, login);
  } catch (err) {
    sendJson(res, 500, { error: err.message });
  }
};
