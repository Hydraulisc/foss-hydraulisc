const sanitizeHtml = require('sanitize-html');

const BIDI_RE = /[\u200E\u200F\u202D\u202E\u2066-\u2069]/g;

/** 
 * Function to remove bidi control characters, forcing LTR orientations
 * @returns {string}
*/
function sanitizeText(text) {
    if (!text) return ''; // Handle null/undefined cases; **MUST BE EMPTY STRING!**

    // Strip Unicode bidirectional control characters
    const cleaned = String(text).replace(BIDI_RE, '');

    // Ensure the result isn't empty or just whitespace
    return cleaned.trim() === '' ? null : cleaned;
}

/** 
 * Function to sanitize text
 * @returns {function(string)}
*/
function sanitizeContent(text) {
    const returnable = sanitizeHtml(text ?? '', {
        allowedTags: ['b', 'i', 'a'],
        allowedAttributes: { a: ['href'] },
        // Explicitly pin schemes — default is safe but be loud about it.
        allowedSchemes: ['http', 'https', 'mailto'],
        allowedSchemesAppliedToAttributes: ['href'],
        disallowedTagsMode: 'recursiveEscape',
        // Force link hygiene on user-authored anchors too
        transformTags: {
            a: (tagName, attribs) => ({
            tagName: 'a',
                attribs: {
                    ...attribs,
                    rel: 'noopener noreferrer nofollow',
                    target: '_blank',
                },
            }),
        },
    });
    return sanitizeText(returnable);
}


/** 
 * Function to remove bidi control characters, forcing LTR orientations
 * @returns {string}
*/
/*
  This function re-sanitizes text, pointlessly for our use case, but does so anyways.
  Actually helps render new lines. No idea how it works without a "\n"
*/
// Requires explicit scheme OR www. prefix.
const URL_RE = /\b(?:(?:https?:\/\/)|(?:www\.))[^\s<>"'`]+/gi;

function trimTrailingPunct(url) {
  return url.replace(/[.,;:!?)\]}]+$/, '');
}

function linkify(rawText) {
  if (!rawText) return '';

  // Sanitize first — no anchors exist yet, so nothing to protect.
  let html = sanitizeHtml(String(rawText), {
    allowedTags: ['br', 'b', 'i', 'em', 'strong'],
    allowedAttributes: {},
  });

  // Preserve newlines
  html = html.replace(/\r\n|\r|\n/g, '<br>');

  // Linkify
  html = html.replace(URL_RE, (match) => {
    const url  = trimTrailingPunct(match);
    const tail = match.slice(url.length);
    const href = url.startsWith('www.') ? `https://${url}` : url;
    const safeHref = href.replace(/"/g, '%22').replace(/'/g, '%27');
    return `<a href="${safeHref}" rel="noopener noreferrer nofollow" target="_blank">${url}</a>${tail}`;
  });

  return html;
}


module.exports = { sanitizeText, sanitizeContent, linkify };