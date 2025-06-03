import GhostAdminAPI from '@tryghost/admin-api'


async function addParagraphsToArticles(api, paragraphChoices) {
    // Retrieve all posts from the Ghost API.
    let count = 0;
    let page = 1;
    let hasMore = true;

    do {
        const posts = await api.posts.browse({ limit: 30, page });
        if (!posts || posts.length === 0) {
            break;
        }

        // Iterate through each post and selectively add a random count of paragraph choices to 90% of them.
        for (const post of posts) {
            count++;
            if (count % 10 === 0) {
                continue; // Skip every 10th post.
            }

            const randomParagraphCount = Math.floor(Math.random() * paragraphChoices.length) + 1;
            const paragraphsToAdd = paragraphChoices.slice(0, randomParagraphCount);
            
            const lexicalTree = JSON.parse(post.lexical);
            lexicalTree.root.children = [...paragraphsToAdd, ...lexicalTree.root.children];

            post.lexical = JSON.stringify(lexicalTree);
            await api.posts.edit(post);

            console.log(`Updated post #${count}: "${post.title}" with ${randomParagraphCount} paragraphs.`);
        };

        page++;
        hasMore = posts?.meta?.pagination?.next !== null;
    } while (hasMore);

    console.log(`Total posts updated: ${count}`);
}

export async function setupDataForTest (req, res) {
    // Get request parameters and validate them.
    const { adminKey, apiUrl } = req.body;

    if (!adminKey) {
        return res.status(400).json({ error: 'Admin key is required.' });
    }
    if (!apiUrl) {
        return res.status(400).json({ error: 'API URL is required.' });
    }

    try {
        const api = new GhostAdminAPI({
            url: apiUrl,
            key: adminKey,
            version: "v5.0"
        });

        await addParagraphsToArticles(api, paragraphChoices);
        
        return res.status(200).json({ message: 'Data setup for test completed successfully.' });
    } catch (error) {
        // Any errors during the process will be caught here.
        const errorMessage = `Error setting up data for test: ${error.message}`
        console.error(errorMessage);
        console.trace();
        return res.status(500).json({ error: errorMessage });
    }
}


const paragraphChoices = [
    {
        children: [
            {
                detail: 0,
                format: 1,
                mode: "normal",
                style: "",
                text: "Disclaimer:",
                type: "extended-text",
                version: 1
            },
            {
                detail: 0,
                format: 0,
                mode: "normal",
                style: "",
                text: " The Sunday Star is ",
                type: "extended-text",
                version: 1
            },
            {
                detail: 0,
                format: 2,
                mode: "normal",
                style: "",
                text: "not responsible",
                type: "extended-text",
                version: 1
            },
            {
                detail: 0,
                format: 0,
                mode: "normal",
                style: "",
                text: " for any actions readers may take after reading this article.",
                type: "extended-text",
                version: 1
            }
        ],
        direction: "ltr",
        format: "",
        indent: 0,
        type: "paragraph",
        version: 1
    },
    {
        children: [
            {
                detail: 0,
                format: 16,
                mode: "normal",
                style: "",
                text: "The Sunday Star",
                type: "extended-text",
                version: 1
            },
            {
                detail: 0,
                format: 0,
                mode: "normal",
                style: "",
                text: " is not a licensed whatchamathing! Do your research and hire a professional.",
                type: "extended-text",
                version: 1
            }
        ],
        direction: "ltr",
        format: "",
        indent: 0,
        type: "paragraph",
        version: 1
    },
    {
        children: [
            {
                detail: 0,
                format: 0,
                mode: "normal",
                style: "",
                text: "It may be necessary for ",
                type: "extended-text",
                version: 1
            },
            {
                detail: 0,
                format: 2,
                mode: "normal",
                style: "",
                text: "The Sunday Star",
                type: "extended-text",
                version: 1
            },
            {
                detail: 0,
                format: 0,
                mode: "normal",
                style: "",
                text: " to reach out to you for confirmation of the things you claim. In such cases, ",
                type: "extended-text",
                version: 1
            },
            {
                detail: 0,
                format: 2,
                mode: "normal",
                style: "",
                text: "The Sunday Star",
                type: "extended-text",
                version: 1
            },
            {
                detail: 0,
                format: 0,
                mode: "normal",
                style: "",
                text: " will compensate you for your time.",
                type: "extended-text",
                version: 1
            }
        ],
        direction: "ltr",
        format: "",
        indent: 0,
        type: "paragraph",
        version: 1
    },
    {
        children: [
            {
                detail: 0,
                format: 0,
                mode: "normal",
                style: "",
                text: "The terms and conditions provided by ",
                type: "extended-text",
                version: 1
            },
            {
                detail: 0,
                format: 1,
                mode: "normal",
                style: "",
                text: "The Sunday Star",
                type: "extended-text",
                version: 1
            },
            {
                detail: 0,
                format: 0,
                mode: "normal",
                style: "",
                text: " are final.",
                type: "extended-text",
                version: 1
            }
        ],
        direction: "ltr",
        format: "",
        indent: 0,
        type: "paragraph",
        version: 1
    },
    {
        children: [
            {
                detail: 0,
                format: 0,
                mode: "normal",
                style: "",
                text: "Please, be aware that ",
                type: "extended-text",
                version: 1
            },
            {
                detail: 0,
                format: 11,
                mode: "normal",
                style: "",
                text: "The Sunday Star",
                type: "extended-text",
                version: 1
            },
            {
                detail: 0,
                format: 0,
                mode: "normal",
                style: "",
                text: " is a non-profit organization in the United States. Don't hesitate to contact us if you need our Employer Identification Number (EIN) for tax purposes.",
                type: "extended-text",
                version: 1
            }
        ],
        direction: "ltr",
        format: "",
        indent: 0,
        type: "paragraph",
        version: 1
    }
];