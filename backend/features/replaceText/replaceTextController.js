import GhostAdminAPI from '@tryghost/admin-api'


const browseLimit = 30;


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
            const updatedContent = article.html.replaceAll(textToReplace, replacementText);
            article.html = updatedContent;

            // Update the post with the new content.
            await apiForArticles.edit(article);
        }));

        page++;
        hasMore = articles?.meta?.pagination?.next !== null;
    } while (hasMore);
}

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

        return res.status(200).json({ message: 'Posts updated successfully.' });
    } catch (error) {
        // Any errors during the process will be caught here.
        console.error(`Error replacing text in posts: ${error.message}`);
        return res.status(500).json({ error: error.message });
    }
};
