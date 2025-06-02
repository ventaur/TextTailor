import GhostAdminAPI from '@tryghost/admin-api'

import { createReplaceWithTally, replaceGhostLexicalText } from '../../lib/replacers.js';
import escapeGhostFilterString from '../../lib/escape.js';
import { countMatches } from '../../lib/matchers.js';


const BrowseLimit = 30;


/**
 * Replaces specified text in articles (posts and pages).
 * Retrieves articles in batches, checks if the text to replace exists in each article,
 * and updates the article content with the replacement text if found.
 *
 * @param {Object} apiForArticles - The Ghost Admin API resource instance for posts or pages.
 * @param {string} textToReplace - The text to be replaced in the articles.
 * @param {string} replacementText - The text to replace with in the articles.
 */
async function replaceTextInArticles(apiForArticles, textToReplace, replacementText) {
    let stats = { matchCount: 0, replacedCount: 0, articleCount: 0 }

    let page = 1;
    let hasMore = false;

    do {
        // Retrieve matching articles (paginated).
        // NOTE: The filter uses `plaintext` to search for the text in the article content.
        const filterText = escapeGhostFilterString(textToReplace);
        const articles = await apiForArticles.browse({
            filter: `title:~'${filterText}',custom_excerpt:~'${filterText}',plaintext:~'${filterText}'`,
            order: 'created_at ASC',
            formats: ['lexical', 'plaintext'],
            limit: BrowseLimit,
            page
        });

        // Iterate through each article and replace the text.
        // NOTE: Promise.all is used to perform the replacements/updates in "parallel".
        const statsList = await Promise.all(articles.map(async (article) => {
            // Count how many times the text to replace exists in the article's plaintext vs html or lexical.
            // We'll use this to determine if there are matches that couldn't be replaced in the lexical content.
            let matchCount = countMatches(article.plaintext, textToReplace);
            matchCount += countMatches(article.title, textToReplace);
            matchCount += countMatches(article.excerpt, textToReplace);
            if (matchCount === 0) {
                console.log(`No matches found in article: ${article.title}`);
                return { matchCount, replacedCount: 0, articleCount: 0 };
            }
            
            // Perform the replacements.
            const replacerWithTally = createReplaceWithTally();
            const lexicalTree = JSON.parse(article.lexical);
            replaceGhostLexicalText(lexicalTree, textToReplace, replacementText, replacerWithTally);
            article.title = replacerWithTally.replaceAll(article.title, textToReplace, replacementText);
            article.custom_excerpt = replacerWithTally.replaceAll(article.custom_excerpt, textToReplace, replacementText);
            
            let replacedCount = replacerWithTally.getCount();
            let articleCount = 0;
            
            // Only update the article if text was replaced.
            if (replacedCount > 0) {
                article.lexical = JSON.stringify(lexicalTree);
                await apiForArticles.edit(article);
                articleCount++;

                console.log(`Replaced ${replacedCount} text(s) in article: ${article.title}`);
            } else {
                console.log(`Matches found, but no text replaced in article: ${article.title}`);
            }

            return { matchCount, replacedCount, articleCount };
        }));

        // Update the overall replacement stats for this batch of articles.
        statsList.reduce((acc, stats) => {
            acc.matchCount += stats.matchCount;
            acc.replacedCount += stats.replacedCount;
            acc.articleCount += stats.articleCount;
            return acc;
        }, stats);

        page++;
        hasMore = articles?.meta?.pagination?.next !== null;
    } while (hasMore);

    return stats;
}

/**
 * Controller function to handle the text replacement in articles.
 * It validates the request parameters, retrieves articles, and replaces the specified text (if found).
 *
 * @param {import('express').Request} req - The request object containing the parameters.
 * @param {import('express').Response} res - The response object to send back the result.
 */
export async function replaceText (req, res) {
    // Get request parameters and valiate them.
    const { adminKey, apiUrl, textToReplace, replacementText } = req.body;

    if (!adminKey) {
        return res.status(400).json({ error: 'Admin key is required.' });
    }
    if (!apiUrl) {
        return res.status(400).json({ error: 'API URL is required.' });
    }
    if (!textToReplace) {
        return res.status(400).json({ error: 'Text to replace is required.' });
    }
    if (!replacementText) {
        return res.status(400).json({ error: 'Replacement text is required.' });
    }

    try {
        const api = new GhostAdminAPI({
            url: apiUrl,
            key: adminKey,
            version: "v5.0"
        });

        // Perform the text replacement in both posts and pages.
        const postStats = await replaceTextInArticles(api.posts, textToReplace, replacementText);
        const pageStats = await replaceTextInArticles(api.pages, textToReplace, replacementText);

        // Prepare the response data with the stats and messages.
        const responseData = {
            message: `${postStats.articleCount + pageStats.articleCount} article(s) were updated successfully. Replaced ${postStats.replacedCount + pageStats.replacedCount} text(s).`,
            info: [],
            stats: {
                posts: postStats,
                pages: pageStats
            }
        };
        if (postStats.matchCount > postStats.replacedCount) {
            responseData.info.push(`${postStats.matchCount - postStats.replacedCount} text(s) were found in posts but could not be replaced in the lexical content.`);
        }
        if (pageStats.matchCount > pageStats.replacedCount) {
            responseData.info.push(`${pageStats.matchCount - pageStats.replacedCount} text(s) were found in pages but could not be replaced in the lexical content.`);
        }
        if (responseData.info.length > 0) {
            responseData.info.push('This typically happens when some text to replace has different casing or mixed formatting (e.g., bold, italic) or is partially included in a link.');
        }

        return res.status(200).json(responseData);
    } catch (error) {
        // Any errors during the process will be caught here.
        const errorMessage = `Error replacing text in articles: ${error.message}`
        console.error(errorMessage);
        return res.status(500).json({ error: errorMessage });
    }
};
