/**
 * Counts the number of times a specific text appears in a given string.
 * 
 * @param {string} text - The text in which to count matches.
 * @param {string} textToMatch - The text to match within the provided text.
 * @returns {number} - The count of matches found in the text.
 */
export function countMatches(text, textToMatch) {
    return (text?.match(new RegExp(textToMatch, 'g')) || []).length
}
