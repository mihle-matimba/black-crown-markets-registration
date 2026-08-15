// The legal documents a client accepts during live registration.
//
// This catalogue is the authoritative record of what was accepted: the
// consent row is built from it server-side rather than from anything the
// browser sends, so a client cannot claim to have accepted a different
// document or version than the one that was actually presented.
//
// The `field` of each entry is the key the registration page sends for that
// checkbox. IMPORTANT: url and version must be kept in step with the links in
// register.html -- if a document is replaced there, update it here too, or the
// consent record will name the wrong version.
const LEGAL_DOCUMENTS = [
  {
    field: 'fsp_client_agreement',
    title: 'FSP Client Agreement and Mandate',
    version: 'V1 Aug 2026',
    url: 'https://yscggkgvxfjvfmnulrcy.supabase.co/storage/v1/object/public/Media/Black%20Crown%20Holdings_FSP%20Client%20Agreement%20and%20Mandate_V1%20Aug%202026.pdf'
  },
  {
    field: 'clientagreement',
    title: 'ODP Client Agreement',
    version: 'v2 March 2026',
    url: 'https://yscggkgvxfjvfmnulrcy.supabase.co/storage/v1/object/public/Media/ODP-Client-Agreement-March-2026-v2.pdf'
  },
  {
    field: 'terms',
    title: 'Terms and Conditions',
    version: 'v1.0',
    url: 'https://yscggkgvxfjvfmnulrcy.supabase.co/storage/v1/object/public/Media/Black%20Crown%20Holdings_Terms%20and%20Condittions%20v.1.0.pdf'
  },
  {
    field: 'privacy',
    title: 'Privacy Policy',
    version: 'v.2 07.2026',
    url: 'https://yscggkgvxfjvfmnulrcy.supabase.co/storage/v1/object/public/Media/Black%20Crown%20Holdings_Privacy%20Policy_07.2026%20v.2.pdf'
  }
];

// Returns the documents the submission actually ticked, in catalogue order,
// each stamped with the version that was live at the time of acceptance.
function acceptedDocuments(body) {
  return LEGAL_DOCUMENTS
    .filter((doc) => body[doc.field] === true || body[doc.field] === 'true')
    .map((doc) => ({
      title: doc.title,
      version: doc.version,
      url: doc.url,
      accepted: true
    }));
}

module.exports = { LEGAL_DOCUMENTS, acceptedDocuments };
