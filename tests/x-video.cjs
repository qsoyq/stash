const assert = require('node:assert/strict');
const { readFile, mkdir } = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');

module.exports = async function checkVideoTools(browser, engine, width) {
    const source = await readFile(path.join(__dirname, '../script/ad/x.js'), 'utf8');
    const page = await browser.newPage({ viewport: { width, height: 900 }, isMobile: width < 600, hasTouch: width < 600 });
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const high = 'https://video.twimg.com/amplify_video/2124490488032137216/vid/avc1/720x752/dt36Q5998JvIMt46.mp4';
    const low = 'https://video.twimg.com/amplify_video/2124490488032137216/vid/avc1/480x500/YhB1_C0XS20z7syB.mp4';
    const hls = 'https://video.twimg.com/amplify_video/2124490488032137216/pl/yJTbCUGg5jhkzb77.m3u8';
    const video = (post, id, variants = [{ bitrate: 950000, content_type: 'video/mp4', url: low }, { bitrate: 2176000, content_type: 'video/mp4', url: high }]) => ({
        id_str: id, type: 'video', expanded_url: `https://x.com/u/status/${post}/video/1`,
        allow_download_status: { allow_download: true }, video_info: { duration_millis: 54900, variants },
    });
    const tweet = (id, media) => ({ __typename: 'Tweet', rest_id: id, media_entities2: media });
    const article = (id, extra = '') => `<article id="post-${id}"><a href="/u/status/${id}"><time>2026-11-22</time></a><p>Video ${id}</p><div data-testid="videoPlayer"><video controls playsinline></video></div>${extra}</article>`;
    const quote = '<div data-testid="quoteTweet" role="link"><a href="/u/status/202"><time>Quoted video</time></a><div data-testid="videoPlayer"><video controls></video></div></div>';
    const newPlayer = '<div style="overflow:hidden;aspect-ratio:1"><div style="position:relative;aspect-ratio:1;overflow:hidden"><video controls playsinline></video><button style="position:absolute;inset:0">Play</button></div></div>';
    const newArticle = article('303').replace('<time>2026-11-22</time>', '<span>2026-11-22</span>').replace('href="/u/status/303"', 'href="https://m.x.com/u/status/303?launch_app_store=true"').replace('<div data-testid="videoPlayer"><video controls playsinline></video></div>', newPlayer);
    const initial = { data: { result: { ...tweet('101', [video('101', 'v101a'), video('101', 'v101b')]), quoted_status_result: { result: tweet('202', [video('202', 'v202')]) } } } };
    // The first API requests run in <head>, before the injected body script.
    const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
        <style>body{margin:0;font:16px -apple-system,sans-serif;background:white;color:#0f1419}main{max-width:580px;margin:auto;padding:16px}article{padding:16px 0;border-bottom:1px solid #ddd}video{display:block;width:100%;height:120px;background:#eee}a{color:#536471}[data-testid=quoteTweet]{margin:12px;padding:12px;border:1px solid #ddd}</style>
        <script>window.__INITIAL_STATE__=${JSON.stringify(initial)};</script>
        <script>window.fetchBody=fetch('/i/api/graphql/early/TweetDetail').then(r=>r.json());var earlyXHR=new XMLHttpRequest();earlyXHR.open('GET','/i/api/graphql/xhr/TweetDetail');earlyXHR.send();</script>
        </head><body><main data-testid="primaryColumn">${article('101', quote)}${newArticle}${article('404')}${article('505')}${article('606')}${article('707')}${article('808').replace('<div data-testid="videoPlayer"><video controls playsinline></video></div>', '<div style="overflow:hidden;aspect-ratio:1"><div data-testid="previewInterstitial"><button data-testid="playButton">Play</button><img alt="" /></div></div>')}</main></body></html>`;
    try {
        const render = async (body, enabled) => page.evaluate(async ({ source, body, enabled }) => {
            const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
            const optionsCode = source.slice(source.indexOf('function getXOptions()'), source.indexOf('function removeAdsCode('));
            const defaults = new Function(`${optionsCode};return getXOptions();`)();
            const settings = Object.fromEntries(Object.entries(defaults).map(([key, value]) => [key, typeof value === 'boolean' ? false : value]));
            settings.enable_video_tools = enabled;
            settings.enable_escape_back = enabled;
            let result;
            await new AsyncFunction('$request', '$response', '$script', '$argument', '$done', source)(
                { url: 'https://x.com/u/status/101' }, { headers: { 'content-type': 'text/html' }, body },
                { type: 'response' }, JSON.stringify(settings), value => { result = value; });
            return result;
        }, { source, body, enabled });
        const off = await render(html, false);
        assert.deepEqual(off, {}, 'All features disabled must pass the response through');
        const rewritten = (await render(html, true)).body;
        assert(rewritten.startsWith('<!DOCTYPE html>'), 'Injection lost the document mode');
        assert(rewritten.indexOf('data-stash-x-video="bootstrap"') < rewritten.indexOf('window.__INITIAL_STATE__='), 'Video hooks were injected after X started');
        let shellRequests = 0;
        await page.route('https://x.com/**', async route => {
            const url = new URL(route.request().url());
            if (url.pathname === '/u/status/101') return route.fulfill({ contentType: 'text/html; charset=utf-8', body: rewritten });
            if (url.pathname.startsWith('/i/web/status/')) { shellRequests++; return route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><body>No media</body></html>' }); }
            if (url.pathname.includes('/early/')) return route.fulfill({ json: { data: { result: tweet('303', [video('303', '2124490488032137216')]) } } });
            if (url.pathname.includes('/xhr/')) return route.fulfill({ json: { data: { result: { rest_id: '404', legacy: { extended_entities: { media: [video('404', 'v404')] } } } } } });
            if (url.pathname.includes('/late/')) return route.fulfill({ json: { data: { result: tweet('505', [{ ...video('202', 'v505'), source_status_id_str: '202' }]) } } });
            return route.fulfill({ json: {} });
        });
        await page.route('https://video.twimg.com/**', route => route.fulfill({ contentType: 'video/mp4', headers: { 'access-control-allow-origin': '*' }, body: Buffer.from('000000186674797069736f6d0000000169736f6d69736f34', 'hex') }));
        await page.addInitScript(() => {
            window.copied = [];
            Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.copied.push(text); } } });
            document.addEventListener('click', () => { window.originalClicks = (window.originalClicks || 0) + 1; });
        });
        await page.goto('https://x.com/u/status/101');
        const entry = id => page.locator(`#post-${id}`).getByRole('button', { name: /^视频文件 · / });
        await entry('101').first().waitFor();
        assert.equal(await entry('101').first().textContent(), '视频文件 · 2', 'Video entry does not display its media count');
        assert.equal(await entry('303').textContent(), '视频文件 · 1', 'Single video entry must display its count');
        await entry('808').waitFor();
        assert(await entry('808').isVisible(), 'Unplayed iPhone preview must have an entry before a video element exists');
        await page.evaluate(() => document.querySelector('#post-808 [data-testid="playButton"]').remove());
        await entry('808').waitFor({ state: 'hidden' });
        assert.equal(await entry('808').count(), 0, 'A non-video interstitial acquired an entry');
        await page.evaluate(() => {
            const video = document.createElement('video');
            video.controls = true;
            document.querySelector('#post-808 [data-testid="previewInterstitial"]').replaceWith(video);
        });
        await entry('808').waitFor();
        assert.equal(await entry('808').count(), 1, 'Transition from preview to playback lost or duplicated its entry');
        assert.equal(await page.evaluate(() => window.__stashXVideoStatus.phase), 'ready');
        await page.waitForFunction(() => window.fetchBody);
        assert.equal((await page.evaluate(() => window.fetchBody)).data.result.rest_id, '303', 'Fetch capture consumed the original body');
        const dialog = page.getByRole('dialog', { name: '视频文件' });
        const address = page.getByRole('textbox', { name: 'MP4 地址', exact: true });
        const close = async () => { await dialog.getByRole('button', { name: '关闭', exact: true }).click(); await dialog.waitFor({ state: 'hidden' }); };
        await entry('101').first().click();
        await dialog.waitFor();
        if (width < 600) {
            await address.tap();
            await dialog.getByRole('button', { name: '关闭', exact: true }).tap();
            await dialog.waitFor({ state: 'hidden' });
            const focus = await entry('101').first().evaluate(button => ({ focused: button.matches(':focus'), outline: getComputedStyle(button).outlineStyle }));
            console.log(`${engine.name()} touch-close focus: ${JSON.stringify(focus)}`);
            assert.equal(focus.focused, false, 'Touch dismissal left the entry focused with a lingering outline');
            assert.equal(focus.outline, 'none', 'Touch dismissal left a visible entry outline');
            const focusArtifacts = path.join(os.tmpdir(), 'stash-x-video-verification');
            await mkdir(focusArtifacts, { recursive: true });
            await page.locator('#post-101').screenshot({ path: path.join(focusArtifacts, `${engine.name()}-${width}-closed.png`) });
            await entry('101').first().focus();
            await page.keyboard.press('Enter');
            await dialog.waitFor();
            await page.keyboard.press('Escape');
            await dialog.waitFor({ state: 'hidden' });
            assert(await entry('101').first().evaluate(button => button.matches(':focus') && button.matches(':focus-visible')), 'Keyboard dismissal lost the visible return focus');
            await entry('101').first().click();
            await dialog.waitFor();
        }
        assert.equal(await address.inputValue(), high, 'Highest bitrate was not selected');
        assert.equal(await page.evaluate(() => window.originalClicks || 0), 0, 'Video entry triggered a delegated tweet click');
        assert.equal(await dialog.getByRole('combobox', { name: '视频', exact: true }).locator('option').count(), 2, 'Multiple videos lost or quote mixed into main tweet');
        await dialog.getByRole('combobox', { name: '画质', exact: true }).selectOption(low);
        assert.equal(await address.inputValue(), low, 'Quality selection did not update the address');
        assert.equal(await dialog.getByRole('link', { name: '打开原文件' }).getAttribute('href'), low);
        await dialog.getByRole('button', { name: '复制地址', exact: true }).click();
        assert.equal(await page.evaluate(() => window.copied.at(-1)), low, 'Wrong address copied');
        await dialog.getByRole('combobox', { name: '视频', exact: true }).selectOption('v101b');
        assert.equal(await address.inputValue(), high, 'Switching video did not choose its best quality');
        const downloadPromise = page.waitForEvent('download');
        await dialog.getByRole('button', { name: '保存视频', exact: true }).click();
        const download = await downloadPromise;
        assert.equal(download.suggestedFilename(), 'x-101-v101b.mp4');
        const batch = [];
        const collect = file => batch.push(file);
        page.on('download', collect);
        const batchDone = page.waitForEvent('download', { predicate: () => batch.length === 2 });
        await dialog.getByRole('button', { name: '保存全部（2）', exact: true }).click();
        await dialog.getByText('已请求保存；若浏览器转为播放，可通过系统分享菜单保存。', { exact: true }).waitFor();
        await batchDone;
        page.off('download', collect);
        assert.deepEqual(batch.map(file => file.suggestedFilename()).sort(), ['x-101-v101a.mp4', 'x-101-v101b.mp4'], 'Save all did not download each video');
        await dialog.locator('summary').click();
        await dialog.getByRole('button', { name: '复制调试信息' }).click();
        const debug = JSON.parse(await page.evaluate(() => window.copied.at(-1)));
        assert.equal(debug.postId, '101');
        assert.equal(debug.allowDownload, true);
        assert.equal(debug.mediaId, 'v101b');
        await dialog.locator('summary').click();
        const artifacts = path.join(os.tmpdir(), 'stash-x-video-verification');
        await mkdir(artifacts, { recursive: true });
        const screenshot = path.join(artifacts, `${engine.name()}-${width}.png`);
        await page.screenshot({ path: screenshot });
        assert(await dialog.evaluate(element => { const rect = element.getBoundingClientRect(); return rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight && element.scrollWidth <= element.clientWidth; }), 'Panel overflows the viewport');
        await page.keyboard.press('Escape');
        await dialog.waitFor({ state: 'hidden' });
        assert.equal(new URL(page.url()).pathname, '/u/status/101', 'Escape navigated away instead of closing the panel');
        await page.locator('[data-testid="quoteTweet"]').getByRole('button', { name: '视频文件' }).click();
        await dialog.locator('summary').click();
        assert.equal(JSON.parse(await dialog.locator('pre').textContent()).postId, '202', 'Quoted video associated with parent post');
        await close();
        for (const id of ['303', '404']) {
            await entry(id).click();
            await address.waitFor();
            assert.equal(await address.inputValue(), high, `Early ${id === '303' ? 'fetch' : 'XHR'} data missing`);
            await close();
        }
        const alternateMedia = video('303', '2124490488032137216');
        delete alternateMedia.id_str;
        alternateMedia.media_url_https = 'https://pbs.twimg.com/amplify_video_thumb/2124490488032137216/img/iQywwwcv1t1uiajW.jpg';
        await page.evaluate(payload => {
            const script = document.createElement('script');
            script.type = 'application/json'; script.textContent = JSON.stringify(payload); document.head.appendChild(script);
        }, { data: { result: tweet('303', [alternateMedia]) } });
        await entry('303').click();
        assert.equal(await dialog.getByRole('combobox', { name: '视频', exact: true, includeHidden: true }).locator('option').count(), 1, 'SSR and API versions of one video were duplicated');
        await close();
        await entry('505').click();
        await dialog.getByText('尚未收到视频地址，可播放视频后重新读取。').waitFor();
        await page.evaluate(async () => { window.lateResult = await (await fetch('/i/api/graphql/late/TweetDetail')).json(); });
        await address.waitFor();
        assert.equal(await address.inputValue(), high, 'Embedded video from another post did not populate the current post from an API response');
        await close();
        // JSON string literals in new X SSR hydration are parsed without eval.
        await page.evaluate(payload => {
            const script = document.createElement('script');
            script.type = 'application/x-hydration-fixture';
            script.textContent = `window.notExecuted=${JSON.stringify(JSON.stringify(payload))};`;
            document.head.appendChild(script);
        }, { data: { result: { __typename: 'Tweet', id_str: '606', mediaDetails: [{ ...video('202', 'v606'), source_status_id_str: '202' }] } } });
        await entry('606').click();
        await address.waitFor();
        assert.equal(await address.inputValue(), high, 'Embedded video in serialized SSR JSON was not associated with its displaying post');
        await page.evaluate(payload => {
            const script = document.createElement('script');
            script.type = 'application/json';script.textContent = JSON.stringify(payload);document.head.appendChild(script);
        }, tweet('606', [video('606', 'v606b')]));
        await entry('606').filter({ hasText: '视频文件 · 2' }).waitFor();
        await dialog.getByRole('button', { name: '保存全部（2）', exact: true }).waitFor();
        await close();
        // No MP4 must not become a misleading download; unsafe URLs never surface.
        await page.evaluate(payload => {
            const script = document.createElement('script');
            script.type = 'application/json'; script.textContent = JSON.stringify(payload); document.head.appendChild(script);
        }, { data: { result: tweet('707', [video('707', 'v707', [{ content_type: 'video/mp4', url: 'https://example.com/not-a-video.mp4' }, { content_type: 'application/x-mpegURL', url: hls }]), video('707', 'v707b')]) } });
        await entry('707').click();
        await dialog.getByText('仅返回了 HLS 地址，可在调试信息中复制。').waitFor();
        assert.equal(await dialog.getByRole('link', { name: '打开原文件' }).count(), 0, 'Unsafe URL exposed as a video');
        await dialog.getByRole('button', { name: '保存全部（2）', exact: true }).click();
        await dialog.getByText('部分视频尚无 MP4 地址，请重新读取后再保存全部。', { exact: true }).waitFor();
        await close();
        // Hydration can replace a tweet or remove foreign UI without changing routes.
        await page.evaluate(() => {
            const article = document.querySelector('#post-101');
            article.querySelector('a').href = 'https://m.x.com/u/status/101?ct=engagement_view_post';
            article.replaceWith(article.cloneNode(true));
        });
        await entry('101').first().click();
        await address.waitFor();
        assert.equal(await address.inputValue(), high, 'Hydrated tweet lost its cached media');
        await page.evaluate(() => {
            document.querySelectorAll('[data-stash-x-video]:not(script)').forEach(host => host.remove());
        });
        await dialog.waitFor();
        assert.equal(await address.inputValue(), high, 'Removed panel was not restored');
        await close();
        await entry('101').first().click();
        await address.waitFor();
        await close();
        // Recycled rows must acquire the new owner; opening never uses stale IDs.
        await page.evaluate(() => { document.querySelector('#post-303 a').href = '/u/status/808'; });
        await entry('303').click();
        await dialog.locator('summary').click();
        assert.equal(JSON.parse(await dialog.locator('pre').textContent()).postId, '808', 'Recycled row retained its old video');
        await page.evaluate(() => history.pushState({}, '', '/home'));
        await dialog.waitFor({ state: 'hidden' });
        assert(shellRequests >= 1, 'Metadata fallback never exercised');
        await page.evaluate(() => { window.__stashXBlocker.destroy(); window.__stashXVideos.destroy(); });
        assert.equal(await page.locator('[data-stash-x-video]:not(script)').count(), 0, 'Cleanup left video controls or panel behind');
        assert.equal(await page.evaluate(() => !!window.__stashXVideos), false);
        assert.deepEqual(errors, []);
        if (width < 600) await checkOpenContexts(browser, engine, rewritten, high, low);
        console.log(`${engine.name()} ${width}px: PASS video injection, SSR/fetch/XHR, quotes, qualities, clipboard, download, late data, HLS, recycled rows, Escape and cleanup; screenshot ${screenshot}`);
    } catch (error) {
        console.error('Video fixture diagnostics:', JSON.stringify({ errors, state: await page.evaluate(() => ({ url: location.href, videos: !!window.__stashXVideos, blocker: !!window.__stashXBlocker, hosts: document.querySelectorAll('[data-stash-x-video]').length, articles: document.querySelectorAll('article').length, buttons: Array.from(document.querySelectorAll('[data-stash-x-video]')).map(host => { const b = host.shadowRoot?.querySelector('button'); return b ? [b.outerHTML, b.getBoundingClientRect().toJSON(), getComputedStyle(b).display, getComputedStyle(host).display] : null; }) })) }));
        throw error;
    } finally { await page.close(); }
};


async function checkOpenContexts(browser, engine, html, high, low) {
    const profiles = [
        { name: 'iPhone Home Screen', userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X)', platform: 'iPhone', touch: 5, standalone: true, safari: true },
        { name: 'iOS display mode', userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X)', platform: 'iPhone', touch: 5, displayMode: true, safari: true },
        { name: 'iPad desktop identity', userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18.5 Safari/605.1.15', platform: 'MacIntel', touch: 5, standalone: true, safari: true },
        { name: 'iPhone browser tab', userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X)', platform: 'iPhone', touch: 5 },
        { name: 'Mac Safari web app', userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.5 Safari/605.1.15', platform: 'MacIntel', touch: 0, standalone: true, displayMode: true },
        { name: 'Mac Chrome/Arc web app', userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/143.0.0.0 Safari/537.36', platform: 'MacIntel', touch: 0, displayMode: true },
        { name: 'Mac Chrome/Arc tab', userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/143.0.0.0 Safari/537.36', platform: 'MacIntel', touch: 0 },
        { name: 'Android web app', userAgent: 'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/143.0.0.0 Mobile Safari/537.36', platform: 'Linux armv8l', touch: 5, displayMode: true },
    ];
    for (const profile of profiles) {
        const page = await browser.newPage({ viewport: { width: 375, height: 900 }, hasTouch: true, isMobile: true });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        try {
            await page.addInitScript(profile => {
                for (const [key, value] of Object.entries({ userAgent: profile.userAgent, platform: profile.platform, maxTouchPoints: profile.touch, standalone: profile.standalone })) {
                    Object.defineProperty(navigator, key, { configurable: true, value });
                }
                const matchMedia = window.matchMedia.bind(window);
                window.matchMedia = query => query === '(display-mode: standalone)' ? { matches: !!profile.displayMode } : matchMedia(query);
                window.copied = [];
                Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => window.copied.push(text) } });
                document.addEventListener('click', event => {
                    const link = event.composedPath().find(node => node instanceof HTMLAnchorElement && node.closest('.actions'));
                    if (!link) return;
                    window.openRequest = { href: link.href, target: link.target, trusted: event.isTrusted };
                    // Desktop test runners cannot launch iOS applications.
                    if (link.protocol === 'x-safari-https:') event.preventDefault();
                }, true);
            }, profile);
            await page.route('https://x.com/**', route => route.fulfill(new URL(route.request().url()).pathname === '/u/status/101' ? { contentType: 'text/html; charset=utf-8', body: html } : { json: {} }));
            await page.route('https://video.twimg.com/**', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Original video</title>' }));
            await page.goto('https://x.com/u/status/101');
            await page.locator('#post-101').getByRole('button', { name: /^视频文件 · / }).first().tap();
            const dialog = page.getByRole('dialog', { name: '视频文件' });
            const open = dialog.getByRole('link', { name: profile.safari ? '在 Safari 打开' : '打开原文件', exact: true });
            await open.waitFor();
            const expectedURL = url => profile.safari ? url.replace(/^https:/, 'x-safari-https:') : url;
            assert.equal(await open.getAttribute('href'), expectedURL(high), `${profile.name}: wrong best-quality destination`);
            await dialog.getByRole('combobox', { name: '画质', exact: true }).selectOption(low);
            assert.equal(await open.getAttribute('href'), expectedURL(low), `${profile.name}: quality selection lost`);
            assert.equal(await dialog.getByRole('textbox', { name: 'MP4 地址', exact: true }).inputValue(), low);
            await dialog.getByRole('button', { name: '复制地址', exact: true }).tap();
            assert.equal(await page.evaluate(() => window.copied.at(-1)), low, `${profile.name}: copy must retain HTTPS`);
            assert.equal(await open.getAttribute('rel'), 'noopener noreferrer');
            if (profile.safari) await open.tap();
            else {
                const popupPromise = page.waitForEvent('popup');
                await open.tap();
                const popup = await popupPromise;
                await popup.waitForLoadState();
                assert.equal(popup.url(), low, `${profile.name}: new tab did not open the selected video`);
                assert.equal(await popup.evaluate(() => window.opener), null);
                await popup.close();
            }
            assert.deepEqual(await page.evaluate(() => window.openRequest), { href: expectedURL(low), target: profile.safari ? '_self' : '_blank', trusted: true }, `${profile.name}: activation destination changed`);
            assert.equal(page.url(), 'https://x.com/u/status/101', `${profile.name}: opening replaced the X page`);
            assert(await dialog.isVisible(), `${profile.name}: opening closed the video panel`);
            if (profile.name === 'iPhone Home Screen') {
                const artifacts = path.join(os.tmpdir(), 'stash-x-video-verification');
                await mkdir(artifacts, { recursive: true });
                await page.screenshot({ path: path.join(artifacts, `${engine.name()}-ios-standalone.png`) });
                assert(await open.evaluate(link => link.scrollWidth <= link.clientWidth), 'Safari button label overflows');
            }
            assert.deepEqual(errors, []);
        } finally { await page.close(); }
    }
    console.log(`${engine.name()}: PASS iOS/iPadOS standalone Safari handoff and standard links/popups for Mac, browser tabs and Android`);
}
