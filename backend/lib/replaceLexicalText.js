import { mutateDeepByKey } from './mutateDeep.js';


/*
 * This function replaces all occurrences of a specified text in the lexical content of a Ghost article.
 * It is designed to work with the Ghost CMS and its Lexical editor.
 *
 * @param {Object} lexicalTree - The lexical tree object containing the content of a Ghost article.
 * @param {string} textToReplace - The text that needs to be replaced in the lexical content.
 * @param {string} replacementText - The text that will replace the specified text in the lexical content.
 * @returns {Object} - The updated lexical tree with the specified text replaced.
 */
export default function replaceGhostLexicalText(lexicalTree, textToReplace, replacementText) {
    const replacedCount = 0;

    // Traverse the lexical tree and replace text in all 'text' keys.
    mutateDeepByKey(lexicalTree, 'text', (val) => {
        return val.replaceAll(textToReplace, replacementText, (_) => {
            replacedCount++;
            return replacementText;
        });
    });

    return replacedCount;
}