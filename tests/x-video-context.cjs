const assert = require('node:assert/strict');
const { readFile } = require('node:fs/promises');
const path = require('node:path');

// The displayed quote B reuses C's video; neither its source permalink nor
// its outer comment A is the owner used by the media cache.
module.exports = async function checkVideoContext(browser, engine, width) {
    const source = await readFile(path.join(__dirname, '../script/ad/x.js'), 'utf8');
    const page = await browser.newPage({ viewport: { width, height: 900 }, isMobile: width < 600, hasTouch: width < 600 });
    page.setDefaultTimeout(5000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const parent = '2125193225073991932';
    const quote = '2125084621352440241';
    const origin = '2125016623908270563';
    const next = '2125084621352440242';
    const high = 'https://video.twimg.com/amplify_video/2125016036768690176/vid/avc1/2160x3840/video.mp4';
    const low = high.replace('2160x3840', '480x852');
    const own = high.replace('2125016036768690176', '900');
    const poster = 'https://pbs.twimg.com/amplify_video_thumb/2125016036768690176/img/poster.jpg';
    const media = {
        type: 'video', expanded_url: `https://x.com/lyn_l0i/status/${origin}/video/1`, source_status_id_str: origin,
        media_url_https: poster, video_info: { duration_millis: 32666, variants: [
            { content_type: 'video/mp4', bitrate: 950000, url: low },
            { content_type: 'video/mp4', bitrate: 25128000, url: high },
        ] },
    };
    const sourceless = { ...media, expanded_url: undefined, source_status_id_str: undefined };
    const tweet = (id, videos = [media]) => ({ __typename: 'Tweet', rest_id: id, legacy: { extended_entities: { media: videos } } });
    const initial = videos => ({ ...tweet(parent, [{ ...media, id_str: 'parent-media', video_info: { variants: [{ content_type: 'video/mp4', url: own }] } }]), quoted_status_result: { result: tweet(quote, videos) } });
    const permalink = (id, time = true) => `<a href="/u/status/${id}">${time ? '<time>2026-11-24</time>' : '<span>23小时</span>'}</a>`;
    const player = `<div data-testid="videoPlayer"><video controls playsinline poster="${poster.replace('.jpg', '?format=jpg&name=medium')}"></video></div>`;
    const preview = `<div data-testid="videoPlayer"><div data-testid="previewInterstitial"><button data-testid="playButton">Play</button><img src="${poster}"></div></div>`;
    const sourceLink = (suffix = '/video/1') => `<a href="/lyn_l0i/status/${origin}${suffix}">Lyn Loi</a>`;
    const parentDOM = content => `<article id="parent"><section id="own">${permalink(parent)}${player}</section>${content}</article>`;
    const quoteDOM = (content, attributes = 'data-testid="quoteTweet" role="link"') => `<div id="quote" ${attributes}>${content}</div>`;
    const fixtures = [
        { name: 'unidentified inner link wrappers', content: quoteDOM(`${permalink(quote)}<div role="link"><div role="link">${player}</div></div>`), method: 'timestamp' },
        { name: 'standard quote', content: quoteDOM(`${permalink(quote)}${player}`), method: 'timestamp' },
        { name: 'quote permalink before reused media source', content: quoteDOM(`${sourceLink()}${permalink(quote, false)}${player}`), method: 'permalink' },
        { name: 'explicit data-href beats media source', content: quoteDOM(`${sourceLink()}${player}`, `data-testid="quoteTweet" role="link" data-href="/lencx_/status/${quote}"`), method: 'data-href' },
        { name: 'new quote frame with nested article', content: quoteDOM(`<article>${permalink(quote, false)}${player}${sourceLink('')}</article>`, `role="link" data-slot="embedded-tweet-frame" data-href="/lencx_/status/${quote}"`), method: 'data-href', syndication: true },
        { name: 'unmarked quote link outside nested article', content: quoteDOM(`<article>${permalink(quote, false)}${player}${sourceLink('')}</article>`, `role="link" data-href="/lencx_/status/${quote}"`), method: 'data-href' },
        { name: 'unmarked outer quote before inner wrappers', content: quoteDOM(`${permalink(quote)}<div role="link">${player}</div>`, 'role="link"'), method: 'timestamp' },
        { name: 'invalid external data-href', content: quoteDOM(`${permalink(quote)}${player}`, `data-testid="quoteTweet" role="link" data-href="https://example.com/u/status/${origin}"`), method: 'timestamp' },
        { name: 'poster identifies display owner among plain links', content: quoteDOM(`${permalink(quote, false)}${sourceLink('')}${player}`), method: 'media-match', partial: true },
        { name: 'cached source must not override reused quote', content: quoteDOM(`${permalink(quote, false)}${sourceLink('')}${player}`), method: 'media-match', sourceCached: true },
        { name: 'unplayed preview poster identifies quote', content: quoteDOM(`${permalink(quote, false)}${sourceLink('')}${preview}`), method: 'media-match' },
        { name: 'cached source alone does not identify display owner', content: quoteDOM(`${permalink(quote, false)}${sourceLink('')}${player}`), unresolved: true, sourceOnly: true },
        { name: 'ambiguous quote must not use parent', content: quoteDOM(`${permalink(quote, false)}${sourceLink('')}${player}`), unresolved: true, shared: true },
        { name: 'source-only quote must not use source or parent', content: quoteDOM(`${sourceLink()}${player}`), unresolved: true },
        { name: 'ambiguous unmarked quote must not use parent', content: quoteDOM(`${permalink(quote, false)}${sourceLink('')}${player}`, 'role="link"'), unresolved: true, shared: true },
        { name: 'unidentified unmarked nested article is a quote boundary', content: quoteDOM(`<article>${sourceLink()}${player}</article>`, 'role="link"'), unresolved: true },
        { name: 'metadata fallback uses displayed quote', content: quoteDOM(`${sourceLink()}${player}`, `data-slot="embedded-tweet-frame" data-href="/lencx_/status/${quote}"`), method: 'data-href', fallback: true },
    ];
    let rewritten;
    const requests = [];
    try {
        await page.route('**/*', route => {
            const url = new URL(route.request().url());
            if (url.hostname !== 'x.com') return route.fulfill({ body: '' });
            if (url.pathname.startsWith('/i/web/status/')) {
                const id = url.pathname.split('/').at(-1);
                requests.push(id);
                // A's response still stores media under B; a wrong fallback
                // must not be rescued by an unrealistic all-IDs fixture.
                const data = id === quote || id === next ? tweet(id) : id === parent ? initial() : null;
                return route.fulfill({ contentType: 'text/html; charset=utf-8', body: `<html><body>${data ? `<script type="application/json">${JSON.stringify(data)}</script>` : 'No media'}</body></html>` });
            }
            return route.fulfill({ contentType: 'text/html; charset=utf-8', body: rewritten });
        });
        const boot = async (dom, data, id = parent) => {
            requests.length = 0;
            const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font:16px sans-serif}article{padding:12px}video{width:280px;height:90px}#quote{border:1px solid #ccc;padding:12px}</style><script type="application/json">${JSON.stringify(data)}</script></head><body>${dom}</body></html>`;
            rewritten = await page.evaluate(async ({ source, html, id }) => {
                const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
                const parser = source.slice(source.indexOf('function getXOptions()'), source.indexOf('function removeAdsCode('));
                const defaults = new Function(`${parser};return getXOptions();`)();
                const settings = Object.fromEntries(Object.entries(defaults).map(([key, value]) => [key, typeof value === 'boolean' ? false : value]));
                settings.enable_video_tools = true;
                settings.enable_share_menu_download = true;
                let result;
                await new AsyncFunction('$request', '$response', '$script', '$argument', '$done', source)(
                    { url: `https://x.com/u/status/${id}` }, { headers: { 'content-type': 'text/html' }, body: html },
                    { type: 'response' }, JSON.stringify(settings), value => { result = value; });
                return result.body;
            }, { source, html, id });
            await page.goto(`https://x.com/u/status/${id}`);
            await page.waitForFunction(() => !!window.__stashXVideos);
        };
        const entry = scope => page.locator(scope).getByRole('button', { name: /^视频文件 · / });
        const dialog = page.getByRole('dialog', { name: '视频文件' });
        const address = page.getByRole('textbox', { name: 'MP4 地址', exact: true });
        const debug = async () => {
            const details = dialog.locator('details');
            if (!await details.evaluate(node => node.open)) await details.locator('summary').click();
            return JSON.parse(await details.locator('pre').textContent());
        };
        const close = () => dialog.getByRole('button', { name: '关闭', exact: true }).click();
        const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        for (const fixture of fixtures) {
            let data = initial(fixture.fallback ? [] : undefined);
            if (fixture.syndication) data = { ...tweet(parent, []), quoted_tweet: { id_str: quote, mediaDetails: [media] } };
            if (fixture.sourceCached) data = { data: [initial(), tweet(origin)] };
            if (fixture.sourceOnly) data = { data: [initial([]), tweet(origin)] };
            if (fixture.shared) data = { data: [initial([sourceless]), tweet(origin, [sourceless])] };
            await boot(parentDOM(fixture.content), data);
            await entry('#own').waitFor();
            if (fixture.unresolved) {
                await settle();
                assert.equal(await entry('#quote').count(), 0, `${fixture.name}: ambiguous media acquired another post's entry`);
                assert.equal(await page.getByRole('button', { name: /^视频文件 · / }).count(), 1, 'Quote leaked a second parent control');
                assert.deepEqual(requests, [], `${fixture.name}: unresolved quote fetched another owner`);
                assert.equal(await page.evaluate(() => window.__stashXVideos.diagnostics().identifiedPlayers), 2, `${fixture.name}: quote player resolved to the parent`);
                continue;
            }
            await entry('#quote').click();
            await address.waitFor();
            assert.equal(await address.inputValue(), high, `${fixture.name}: wrong video or missing MP4`);
            const info = await debug();
            assert.equal(info.postId, quote, `${fixture.name}: quote associated with parent or media source`);
            assert.equal(info.sourcePostId, origin, `${fixture.name}: missing original source diagnostics`);
            assert.equal(info.resolution.method, fixture.method, `${fixture.name}: missing resolution diagnostics`);
            assert.equal(info.variants.length, 2, `${fixture.name}: parent media mixed into quote`);
            if (fixture.fallback) assert.deepEqual(requests, [quote], 'Metadata fallback requested the parent or original source');
            else assert.deepEqual(requests, [], `${fixture.name}: cached quote unexpectedly needed fallback`);
            await dialog.getByRole('combobox', { name: '画质', exact: true }).selectOption(low);
            await dialog.getByRole('button', { name: '重新读取', exact: true }).click();
            await page.waitForFunction(() => {
                const hosts = Array.from(document.querySelectorAll('[data-stash-x-video]'));
                const retry = hosts.flatMap(host => Array.from(host.shadowRoot?.querySelectorAll('button') || [])).find(button => button.getAttribute('aria-label') === '重新读取');
                return retry && !retry.disabled;
            });
            assert.equal(requests.at(-1), quote, `${fixture.name}: retry requested another owner`);
            await close();
            if (fixture.partial) {
                await page.evaluate(payload => {
                    const script = document.createElement('script');
                    script.type = 'application/json'; script.textContent = JSON.stringify(payload); document.head.appendChild(script);
                }, tweet(quote, [{ ...media, expanded_url: undefined, source_status_id_str: undefined, media_url_https: undefined }]));
                await settle();
                await entry('#quote').click();
                await address.waitFor();
                assert.equal(await address.inputValue(), high, 'Partial metadata erased display ownership');
                assert.equal((await debug()).sourcePostId, origin, 'Partial metadata erased the known source relation');
                await close();
            }
            if (!fixture.syndication) {
                await entry('#own').click();
                await address.waitFor();
                assert.equal(await address.inputValue(), own, `${fixture.name}: parent video was replaced by quote`);
                assert.equal((await debug()).postId, parent);
                await close();
            }
        }
        // No <time> in the new detail DOM, and the source has an ordinary
        // status permalink too. Match the media instead of trusting the route.
        await boot(`<article id="direct">${permalink(quote, false)}${sourceLink('')}${player}</article>`, tweet(quote), quote);
        await entry('#direct').click();
        await address.waitFor();
        assert.equal(await address.inputValue(), high);
        assert.equal((await debug()).resolution.method, 'media-match');
        await close();
        // A reply can link to the current detail route without owning its video.
        await boot(`<article id="reply">${permalink(next, false)}${permalink(parent, false)}${player}</article>`, { data: [tweet(parent), tweet(next)] });
        await settle();
        assert.equal(await entry('#reply').count(), 0, 'Ambiguous reply borrowed the current route as its media owner');
        // Recycled quote frames can change only data-href, not href/src.
        await boot(parentDOM(quoteDOM(player, `data-slot="embedded-tweet-frame" data-href="/u/status/${quote}"`)), { data: [initial(), tweet(next)] });
        await entry('#quote').waitFor();
        await page.locator('#quote').evaluate((node, id) => node.setAttribute('data-href', `/u/status/${id}`), next);
        await settle();
        await entry('#quote').click();
        await address.waitFor();
        assert.equal((await debug()).postId, next, 'Recycled quote retained the old display owner');
        await close();
        // The parent share action must not treat a quoted video as its own.
        const share = '<button aria-label="分享帖子" onclick="document.querySelector(\'#share-menu\').hidden=false">Share</button>';
        await boot(`<article>${permalink(parent)}${quoteDOM(`${permalink(quote)}${player}`)}${share}</article><div id="share-menu" role="menu" hidden><button role="menuitem">Copy link</button></div>`, { ...tweet(parent, []), quoted_status_result: { result: tweet(quote) } });
        await entry('#quote').waitFor();
        await page.getByRole('button', { name: '分享帖子' }).click();
        await settle();
        assert.equal(await page.locator('[data-stash-x-video="share-download"]').count(), 0, 'Parent share acquired a quoted video download');
        assert.equal(await page.evaluate(() => window.__stashXVideos.diagnostics().share.lastAttempt), 'no-own-video');
        assert.deepEqual(errors, []);
        console.log(`${engine.name()} ${width}px: PASS reused quote ownership, nested links/articles, data-href, ambiguity, correct metadata fallback, recycled frames and parent share isolation`);
    } finally { await page.close(); }
};
