import GhostAdminAPI from '@tryghost/admin-api'


const browseLimit = 30;


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
    let page = 1;
    let hasMore = false;

    do {
        // Retrieve all posts and pages.
        // ** Can we use a filter to only get posts with specific text? **
        const articles = await apiForArticles.browse({ limit: browseLimit, page: page });

        // Iterate through each article and replace the text.
        // * Promise.all is used to perform the replacements/updates in "parallel".
        await Promise.all(articles.map(async (article) => {
            // Check if the article's content contains the text to replace.
            if (!article.html || !article.html.includes(textToReplace)) {
                return;
            }

            const updatedContent = article.html.replaceAll(textToReplace, replacementText);
            article.html = updatedContent;

            // Update the post with the new content.
            await apiForArticles.edit(article);
        }));

        page++;
        hasMore = articles?.meta?.pagination?.next !== null;
    } while (hasMore);
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
            url: adminUrl,
            key: adminKey,
            version: "v5.0"
        });

        await replaceTextInArticles(api.posts, textToReplace, replacementText);
        await replaceTextInArticles(api.pages, textToReplace, replacementText);

        return res.status(200).json({ message: 'Articles were updated successfully.' });
    } catch (error) {
        // Any errors during the process will be caught here.
        console.error(`Error replacing text in articles: ${error.message}`);
        return res.status(500).json({ error: error.message });
    }
};
