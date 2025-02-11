/** 
 * Function to sanitize text and force LTR orientations
 * @returns {string}
*/
function sanitizeText(text) {
    if (!text) return ''; // Handle null/undefined cases

    // Strip Unicode bidirectional control characters
    const cleanedText = text.replace(/[\u200E\u200F\u202D\u202E\u2066-\u2069]/g, '');

    // Ensure the result isn't empty or just whitespace
    return cleanedText.trim() === '' ? null : cleanedText;
}


module.exports = { sanitizeText };