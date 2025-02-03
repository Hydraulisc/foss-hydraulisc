/** 
 * Function to sanitize text and force LTR orientations
 * @returns {string}
*/
function sanitizeText(text) {
    // Strip Unicode bidirectional control characters
    return text.replace(/[\u200E\u200F\u202D\u202E\u2066-\u2069]/g, '');
}


module.exports = { sanitizeText };