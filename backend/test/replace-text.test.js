import { expect } from 'chai';
import nock from 'nock';

import { replaceText } from '../features/replaceText/replaceTextController.js';


const PathBrowsePosts = '/ghost/api/admin/posts/';
const PathBrowsePages = '/ghost/api/admin/pages/';
const PathEditPosts   = /\/ghost\/api\/admin\/posts\/.*/;
const PathEditPages   = /\/ghost\/api\/admin\/pages\/.*/;


describe('replace-text', function () {
    const apiUrl = 'https://mock-ghost-api.com';
    const adminKey = '0123456789abcdef01234567:0123456789abcdef012345670123456789abcdef012345670123456789abcdef';
    const textToReplace = 'foo';
    const replacementText = 'bar';

    // Helper to create a mock Express req/res.
    function createMockReqRes(body = {}) {
        const req = { body };

        let statusCode, jsonResponse;
        const res = {
            status(code) {
                statusCode = code;
                return this;
            },
            json(obj) {
                jsonResponse = obj;
                return this;
            }
        };

        return { req, res, getStatus: () => statusCode, getJson: () => jsonResponse };
    }

    afterEach(() => {
        nock.cleanAll();
    });


    it('should return 400 if required parameters are missing', async function () {
        const { req, res, getStatus, getJson } = createMockReqRes({});
        await replaceText(req, res);

        expect(getStatus()).to.equal(400);
        expect(getJson()).to.have.property('error');
    });

    it('should initiate jobs and replace text in posts and pages', async function () {
        // Prepare mock articles.
        const postArticles = [
            {
                id: 'post1',
                title: 'foo in title',
                custom_excerpt: 'no match',
                lexical: JSON.stringify({ root: { children: [{ text: 'the foo is...' }, { text: 'all around you. foodom!' }] } }),
                plaintext: 'the foo is...all around you. foodom!'
            },
            {
                id: 'post2',
                title: 'no match',
                custom_excerpt: 'foo in excerpt',
                lexical: JSON.stringify({ root: { children: [{ text: 'not here' }] } }),
                plaintext: 'not here'
            }
        ];
        const pageArticles = [
            {
                id: 'page1',
                title: 'foo page',
                custom_excerpt: 'foo excerpt',
                lexical: JSON.stringify({ root: { children: [{ text: 'foo' }] } }),
                plaintext: 'foo'
            }
        ];

        // Mock /posts and /pages browse endpoints (pagination: 1 page only).
        nock(apiUrl)
            .get(PathBrowsePosts)
            .query(true)
            .reply(200, {
                posts: postArticles,
                meta: { pagination: { page: 1, pages: 1, total: 2, next: null } }
            });

        nock(apiUrl)
            .get(PathBrowsePages)
            .query(true)
            .reply(200, {
                pages: pageArticles,
                meta: { pagination: { page: 1, pages: 1, total: 1, next: null } }
            });

        // Mock edit endpoints to capture payloads.
        const postEdit = nock(apiUrl)
            .put(PathEditPosts)
            .twice()
            .reply(200, (uri, reqBody) => reqBody);

        const pageEdit = nock(apiUrl)
            .put(PathEditPages)
            .reply(200, (uri, reqBody) => reqBody);

        const { req, res, getStatus, getJson } = createMockReqRes({
            adminKey, apiUrl, textToReplace, replacementText
        });

        // Act.
        await replaceText(req, res);

        // Check the response.
        expect(getStatus()).to.equal(200);
        expect(getJson()).to.have.property('postJobId');
        expect(getJson()).to.have.property('pageJobId');

        // Wait for jobs to finish (jobs run async, so wait a bit).
        await new Promise(resolve => setTimeout(resolve, 200));

        // Check that edit was called for each article with a match.
        // TODO: Verify the payload has the replacements.
        expect(postEdit.isDone()).to.be.true;
        expect(pageEdit.isDone()).to.be.true;
    });

    it('should not call edit for articles with no matches', async function() {
        const postArticles = [
            {
                id: 'post3',
                title: 'no match here',
                custom_excerpt: 'no match',
                lexical: JSON.stringify({ root: { children: [{ text: 'no match' }] } }),
                plaintext: 'no match'
            }
        ];
        nock(apiUrl)
            .get(PathBrowsePosts)
            .query(true)
            .reply(200, {
                posts: postArticles,
                meta: { pagination: { page: 1, pages: 1, total: 1, next: null } }
            });

        nock(apiUrl)
            .get(PathBrowsePages)
            .query(true)
            .reply(200, {
                pages: [],
                meta: { pagination: { page: 1, pages: 1, total: 0, next: null } }
            });

        // Mock edit endpoints to see if they are called.
        const postEdit = nock(apiUrl)
            .put(PathEditPosts)
            .reply(200);
        const pageEdit = nock(apiUrl)
            .put(PathEditPages)
            .reply(200);

        const { req, res, getStatus, getJson } = createMockReqRes({
            adminKey, apiUrl, textToReplace, replacementText
        });

        // Act.
        await replaceText(req, res);
        await new Promise(resolve => setTimeout(resolve, 100));

        // Verify that edit was NOT called.
        expect(postEdit.isDone()).to.be.false;
        expect(pageEdit.isDone()).to.be.false;
    });

    xit('should handle GhostAdminAPI errors by emitting error event', async function() {
        nock(apiUrl)
            .get(PathBrowsePosts)
            .query(true)
            .replyWithError('Ghost API error');

        nock(apiUrl)
            .get(PathBrowsePages)
            .query(true)
            .reply(200, {
                pages: [],
                meta: { pagination: { page: 1, pages: 1, total: 0, next: null } }
            });

        const { req, res, getStatus, getJson } = createMockReqRes({
            adminKey, apiUrl, textToReplace, replacementText
        });

        // Act.
        await replaceText(req, res);

        // TODO: Test jobProgress for error event.
        
    });
});
