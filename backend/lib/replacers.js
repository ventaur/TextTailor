import { mutateDeepByKey } from './mutateDeep.js';


/* Utility to replace text in a string and keep track of how many times the replacement was made.
 * This is useful for tracking replacements across multiple calls.
 *
 * @returns {Object} An object with methods to replace text and get the count of replacements.
 */
export function createReplaceWithTally() {
    let count = 0;

    return {
        replaceAll(text, textToReplace, replacementText) {
            return text?.replaceAll(textToReplace, (...args) => {
                count++;
                return typeof replacementText === 'function'
                    ? replacementText(...args)
                    : replacementText;
            });
        },
        getCount() {
            return count;
        },
        resetCount() {
            count = 0;
        }
    };
}

/*
 * This function replaces all occurrences of a specified text in the lexical content of a Ghost article.
 * It is designed to work with the Ghost CMS and its Lexical editor.
 * The lexical tree is updated in-place with the specified text replaced.
 *
 * @param {Object} lexicalTree - The lexical tree object containing the content of a Ghost article.
 * @param {string} textToReplace - The text that needs to be replaced in the lexical content.
 * @param {string} replacementText - The text that will replace the specified text in the lexical content.
 * @param {Object} replacerWithTally - An instance of the createReplaceWithTally utility to track replacements.
 */
export function replaceGhostLexicalText(lexicalTree, textToReplace, replacementText, replacerWithTally) {
    // Traverse the lexical tree and replace the text value in all 'text' keys.
    mutateDeepByKey(lexicalTree, 'text', (value) => {
        return replacerWithTally.replaceAll(value, textToReplace, replacementText);
    });
}