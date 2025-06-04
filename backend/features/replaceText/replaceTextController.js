import GhostAdminAPI from '@tryghost/admin-api'

import { countMatches } from '../../lib/matchers.js';
import { createReplaceWithTally, replaceGhostLexicalText } from '../../lib/replacers.js';
import { createJob } from '../../lib/jobManager.js';
import updateTotals from '../../lib/updateTotals.js';

import logger from '../../lib/logger.js';


const BrowseLimit = 25;


/**
 * Enum for article types.
 * @readonly
 * @enum {string}
 */
const ArticleType = {
    Post: 'post',
    Page: 'page'
};


/**
 * Replaces specified text in articles (posts and pages).
 * Retrieves articles in batches, checks if the text to replace exists in each article,
 * and updates the article content with the replacement text if found.
 *
 * @param {Object} apiForArticles - The Ghost Admin API resource instance for posts or pages.
 * @param {ArticleType} articleType - The type of articles to process (either 'posts' or 'pages').
 * @param {string} textToReplace - The text to be replaced in the articles.
 * @param {string} replacementText - The text to replace with in the articles.
 * @param {import('../../lib/jobManager.js').JobControl} jobControl - Control object for job management, including progress and completion callbacks.
 */
async function replaceTextInArticles(apiForArticles, articleType, textToReplace, replacementText, jobControl) {
    let totalStats = { matchCount: 0, replacedCount: 0, articleCount: 0, errorCount: 0 };

    let page = 1;
    let hasMore = false;

    do {
        // Bail out if the job is cancelled.
        if (jobControl.abortSignal?.aborted) {
            logger.warn('Job cancelled by user.');
            return;
        }

        // Retrieve all articles (paginated).
        const articles = await apiForArticles.browse({
            order: 'created_at ASC',
            formats: ['lexical', 'plaintext'],
            limit: BrowseLimit,
            page
        });

        const pagination = articles?.meta?.pagination || {};
        const totalArticles = pagination?.total || 0;
        logger.info(`[${articleType}] Processing page ${page} of ${pagination.pages} articles. Total articles found: ${totalArticles}`);

        // Iterate through each article and replace the text.
        // NOTE: We can't use Promise.all or Promise.allSettled here because we need to handle each article sequentially
        // to avoid hitting concurrency issues with Ghost DB.
        const stats = [];
        for (const article of articles) {
            // Count how many times the text to replace exists in the article's plaintext vs html or lexical.
            // We'll use this to determine if there are matches that couldn't be replaced in the lexical content.
            let matchCount = countMatches(article.plaintext, textToReplace);
            matchCount += countMatches(article.title, textToReplace);
            matchCount += countMatches(article.custom_excerpt, textToReplace);
            if (matchCount === 0) {
                logger.warn(`[${articleType}] No matches found in article: ${article.title}`);
                stats.push({ matchCount, replacedCount: 0, articleCount: 0, errorCount: 0 });
                continue;
            }
            
            // Perform the replacements.
            const replacerWithTally = createReplaceWithTally();
            const lexicalTree = JSON.parse(article.lexical);
            replaceGhostLexicalText(lexicalTree, textToReplace, replacementText, replacerWithTally);
            article.title = replacerWithTally.replaceAll(article.title, textToReplace, replacementText);
            article.custom_excerpt = replacerWithTally.replaceAll(article.custom_excerpt, textToReplace, replacementText);
            
            let replacedCount = replacerWithTally.getCount();
            let articleCount = 0;
            let errorCount = 0;
            
            // Only update the article if text was replaced.
            if (replacedCount > 0) {
                try {
                    article.lexical = JSON.stringify(lexicalTree);
                    await apiForArticles.edit(article);
                    articleCount++;
                } catch (error) {
                    errorCount++;
                    logger.error(`[${articleType}] Error updating article: ${article.title} - ${error.message}`);
                }

                logger.info(`[${articleType}] Replaced ${replacedCount} text(s) in article: ${article.title}`);
            } else {
                logger.warn(`[${articleType}] Matches found, but no text replaced in article: ${article.title}`);
            }

            stats.push({ matchCount, replacedCount, articleCount, errorCount });
        };

        // Update the overall replacement stats for this batch of articles.
        updateTotals(totalStats, stats);

        // Emit progress updates.
        const progress = Math.min(100, Math.floor((page * BrowseLimit / totalArticles) * 100));
        jobControl.emitProgress(progress);

        page++;
        hasMore = pagination?.next !== null;
        logger.info(`[${articleType}] Next page: ${pagination?.next}`);
    } while (hasMore);

    // Emit completion of the job.
    jobControl.emitComplete(totalStats);
    logger.info('[${articleType}] Finished processing articles.');
}

/**
 * Handle the text replacement in articles.
 * It validates the request parameters, retrieves articles, and replaces the specified text (if found).
 *
 * @param {import('express').Request} req - The request object containing the parameters.
 * @param {import('express').Response} res - The response object to send back the result.
 */
export async function replaceText (req, res) {
    logger.info('Received request to replace text in articles.');

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

        // Perform the text replacement in both posts and pages as jobs.
        const postJobId = createJob(replaceTextInArticles, api.posts, ArticleType.Post, textToReplace, replacementText);
        const pageJobId = createJob(replaceTextInArticles, api.pages, ArticleType.Page, textToReplace, replacementText);

        const responseData = {
            message: 'Text replacement jobs have been initiated successfully.',
            postJobId,
            pageJobId,
        };

        return res.status(200).json(responseData);
    } catch (error) {
        // Any errors during the process will be caught here.
        const errorMessage = `Error creating text replacement jobs: ${error.message}`
        logger.error(errorMessage);
        return res.status(500).json({ error: errorMessage });
    }
};
