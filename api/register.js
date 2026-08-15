const { skalePost, getToken, readBody, clientIp, requirePost, sendJson, DEFAULT_PLATFORM } = require('./_skale');
const { insertRow, isConfigured } = require('./_supabase');
const { acceptedDocuments } = require('./_legal-docs');

const CONSENT_TABLE = 'legal_consents';

// Records what the client accepted, alongside who accepted it and from where.
// Deliberately never throws: the trading account already exists by the time
// this runs, and a logging outage must not turn a completed registration into
// a failure the client sees. A failure is logged for the platform instead.
async function recordLegalConsent(req, body, result) {
  if (!isConfigured()) {
    console.log('Legal consent not recorded: Supabase is not configured');
    return;
  }

  const documents = acceptedDocuments(body);
  if (!documents.length) return;

  const object = (result && result.object) || {};

  try {
    await insertRow(CONSENT_TABLE, {
      full_name: `${body.first_name || ''} ${body.last_name || ''}`.trim(),
      email: body.email,
      identification_number: body.identification_number || null,
      ip_address: clientIp(req),
      country: body.country || null,
      crm_account_id: object.crm_account_id ? String(object.crm_account_id) : null,
      user_agent: req.headers['user-agent'] || null,
      documents
    });
  } catch (err) {
    // Name the client so the acceptance can be reconstructed from the log if
    // the row itself never landed.
    console.log('Legal consent insert failed:', JSON.stringify({
      email: body.email,
      documents: documents.map((d) => `${d.title} ${d.version}`),
      reason: err.message
    }));
  }
}

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

    // Only a created account gets a consent row, so the table never fills with
    // acceptances that have no client behind them.
    const created = result && (result.status_code === '1' || result.status_code === 1);
    if (created) await recordLegalConsent(req, body, result);

    sendJson(res, 200, result);
  } catch (err) {
    sendJson(res, 500, { error: err.message });
  }
};
