const assert = require('node:assert/strict');
const { readFile, mkdir } = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');

module.exports = async function checkImages(browser, engine, width) {
    const source = await readFile(path.join(__dirname, '../script/ad/x.js'), 'utf8');
    const page = await browser.newPage({ viewport: { width, height: 900 }, isMobile: width < 600, hasTouch: width < 600 });
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const bitmap = await page.evaluate(() => {
        const canvas = document.createElement('canvas');canvas.width = 320;canvas.height = 240;
        return ['#247b81', '#a84353', '#386b41', '#60518b'].map((color, index) => {
            const ctx = canvas.getContext('2d');ctx.fillStyle = color;ctx.fillRect(0, 0, 320, 240);
            ctx.fillStyle = '#fff';ctx.font = '30px sans-serif';ctx.fillText(`Image ${index + 1}`, 90, 130);
            return canvas.toDataURL(index === 1 ? 'image/png' : 'image/jpeg').split(',')[1];
        });
    });
    const photo = (post, index) => ({ type: 'photo', id_str: `${post}${index}`, media_url_https: `https://pbs.twimg.com/media/img${post}_${index}.${index === 2 ? 'png' : 'jpg'}`, expanded_url: `https://x.com/u/status/${post}/photo/${index}`, original_info: { width: 320, height: 240 } });
    const tweet = (id, media) => ({ __typename: 'Tweet', rest_id: id, media_entities2: media });
    const tiles = (id, indices) => `<div class="photos">${indices.map(index => `<div class="tile"><img alt="Photo ${index}" src="https://pbs.twimg.com/media/img${id}_${index}?format=${index === 2 ? 'png' : 'jpg'}&name=small"><a aria-label="View media" href="/u/status/${id}/photo/${index}"></a></div>`).join('')}</div>`;
    const quote = `<div role="link" data-testid="quoteTweet"><a href="/u/status/202"><time>Quote</time></a>${tiles('202', [1])}</div>`;
    const article = (id, indices, extra = '') => `<article id="post-${id}"><a href="/u/status/${id}"><time>Post ${id}</time></a>${tiles(id, indices)}${extra}</article>`;
    const data = [tweet('101', [1, 2, 3, 4].map(index => photo('101', index))), tweet('202', [photo('202', 1)]), tweet('404', [{ type: 'video', media_url_https: 'https://pbs.twimg.com/amplify_video_thumb/404/img/poster.jpg' }, photo('404', 2), photo('404', 3)])];
    const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font:15px -apple-system,sans-serif;margin:0;color:#0f1419;background:white}main{max-width:580px;margin:auto;padding:16px}article{padding:16px 0;border-bottom:1px solid #ddd}.photos{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:3px}.tile{position:relative;aspect-ratio:4/3;overflow:hidden}.tile img{width:100%;height:100%;object-fit:cover}.tile a{position:absolute;inset:0}[data-testid=quoteTweet]{margin:12px;border:1px solid #ccc;padding:8px}</style><script>window.__INITIAL_STATE__=${JSON.stringify({ data })}</script></head><body><main>${article('101', [1, 2, 3, 4], quote)}${article('303', [], '<img src="https://pbs.twimg.com/profile_images/avatar.jpg"><div data-testid="card.wrapper"><img src="https://pbs.twimg.com/media/card?format=jpg&name=small"></div>')}${article('404', [2, 3], '<div data-testid="videoPlayer"><img src="https://pbs.twimg.com/amplify_video_thumb/404/img/poster.jpg"></div>')}${article('505', [1])}${article('707', [1])}${article('606', []).replace('<div class="photos"></div>', '<a href="/u/status/606/photo/1"><img src="https://example.com/foreign.jpg"></a>')}</main></body></html>`;
    let rewritten;
    let failThird = false;
    const originals = [];
    let shellRequests = 0;
    try {
        await page.route('https://pbs.twimg.com/**', route => {
            const url = new URL(route.request().url());
            const index = Number(url.pathname.match(/_(\d+)/)?.[1]) || 1;
            if (url.searchParams.get('name') === 'orig') {
                originals.push(url.href);
                if (failThird && index === 3) return route.fulfill({ status: 503, contentType: 'text/html', body: 'Unavailable' });
            }
            return route.fulfill({ contentType: index === 2 ? 'image/png' : 'image/jpeg', headers: { 'access-control-allow-origin': '*' }, body: Buffer.from(bitmap[(index - 1) % 4], 'base64') });
        });
        await page.route('https://example.com/**', route => route.fulfill({ status: 404, body: '' }));
        await page.route('https://x.com/**', route => {
            const pathname = new URL(route.request().url()).pathname;
            if (pathname.startsWith('/i/web/status/')) {
                shellRequests++;
                const id = pathname.split('/').at(-1);
                return route.fulfill({ contentType: 'text/html', body: id === '505' ? `<script type="application/json">${JSON.stringify(tweet(id, [photo(id, 1)]))}</script>` : '<html></html>' });
            }
            if (pathname.startsWith('/i/api/')) return route.fulfill({ json: tweet('707', [photo('707', 1)]) });
            return route.fulfill({ contentType: 'text/html; charset=utf-8', body: rewritten });
        });
        await page.addInitScript(() => {
            const activation = navigator.userActivation;
            window.shared = [];window.copied = [];window.shareFailure = null;window.supportShare = true;window.denyClipboard = false;
            Object.defineProperty(navigator, 'userActivation', { configurable: true, value: { isActive: false } });
            Object.defineProperty(navigator, 'canShare', { configurable: true, value: ({ files }) => window.supportShare && files.length > 0 && files.every(file => file instanceof File && /^image\//.test(file.type)) });
            Object.defineProperty(navigator, 'share', { configurable: true, value: async ({ files }) => {
                assertActivation();
                if (window.shareFailure) throw new DOMException('Cancelled', window.shareFailure);
                window.shared.push(await Promise.all(files.map(async file => ({ name: file.name, type: file.type, bytes: Array.from(new Uint8Array(await file.arrayBuffer())) }))));
            } });
            function assertActivation() { if (!activation.isActive) throw new Error('Missing user activation'); }
            Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { if (window.denyClipboard) throw new Error('Denied');window.copied.push(text); } } });
            document.addEventListener('click', () => { window.delegatedClicks = (window.delegatedClicks || 0) + 1; });
        });
        const boot = async (enabled, method = 'system_share') => {
            rewritten = await page.evaluate(async ({ source, html, enabled, method }) => {
                const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
                const parser = source.slice(source.indexOf('function getXOptions()'), source.indexOf('function removeAdsCode('));
                const defaults = new Function(`${parser};return getXOptions();`)();
                const settings = Object.fromEntries(Object.entries(defaults).map(([key, value]) => [key, typeof value === 'boolean' ? false : value]));
                settings.enable_image_tools = enabled;settings.image_save_method = method;
                let result;
                await new AsyncFunction('$request', '$response', '$script', '$argument', '$done', source)({ url: 'https://x.com/u/status/101' }, { headers: { 'content-type': 'text/html' }, body: html }, { type: 'response' }, JSON.stringify(settings), value => { result = value; });
                return result.body || html;
            }, { source, html, enabled, method });
            await page.goto('https://x.com/u/status/101');
        };
        const entry = id => page.locator(`#post-${id}`).getByRole('button', { name: /^图片文件/ });
        const dialog = page.getByRole('dialog', { name: '图片文件', exact: true });
        const prompt = page.locator('[data-stash-x-video="save-prompt"]');
        const save = () => dialog.getByRole('button', { name: /^保存(?:全部|所选)/ });
        const close = () => dialog.getByRole('button', { name: '关闭', exact: true }).click();
        await boot(false);
        assert.equal(await page.evaluate(() => !!window.__stashXVideos), false, 'Disabled image tools installed media runtime');
        assert.equal(await page.getByRole('button', { name: /^图片文件/ }).count(), 0);
        await boot(true);
        await entry('101').first().waitFor();
        assert.equal(await entry('101').count(), 2, 'Quote should have an independent entry');
        assert.equal(await entry('303').count(), 0, 'Avatar or link preview acquired an image entry');
        assert.equal(await entry('606').count(), 0, 'Foreign image acquired an entry');
        assert.equal(await entry('404').getAttribute('aria-label'), '图片文件 · 2', 'Video poster counted as a photo');
        assert.equal(await page.getByRole('button', { name: '视频文件', exact: true }).count(), 0, 'Image switch enabled video tools');
        await entry('101').first().click();
        await dialog.waitFor();
        assert.equal(await page.evaluate(() => window.delegatedClicks || 0), 0, 'Entry triggered the tweet click handler');
        assert.equal(await dialog.getByRole('checkbox', { name: /^选择图片/ }).count(), 4);
        assert.equal(await save().getAttribute('aria-label'), '保存全部（4）');
        await dialog.locator('.image-pick img').first().evaluate(img => img.decode());
        assert.equal(await dialog.locator('.image-pick img').first().evaluate(img => img.naturalWidth), 320, 'Thumbnail is blank');
        await dialog.getByRole('checkbox', { name: '选择图片 1', exact: true }).uncheck();
        assert(await dialog.getByRole('checkbox', { name: '全选图片' }).evaluate(input => input.indeterminate));
        assert.equal(await save().getAttribute('aria-label'), '保存所选（3）');
        await dialog.getByRole('button', { name: '复制图片 2 地址' }).click();
        assert.equal(await page.evaluate(() => window.copied.at(-1)), 'https://pbs.twimg.com/media/img101_2?format=png&name=orig');
        assert.equal(await save().getAttribute('aria-label'), '保存所选（3）', 'Copy toggled image selection');
        await page.evaluate(() => { window.denyClipboard = true; });
        await dialog.getByRole('button', { name: '复制图片 2 地址' }).click();
        assert.equal(await dialog.getByRole('textbox', { name: '图片 2 原图地址' }).inputValue(), 'https://pbs.twimg.com/media/img101_2?format=png&name=orig');
        await dialog.getByRole('checkbox', { name: '全选图片' }).check();
        await dialog.getByRole('checkbox', { name: '全选图片' }).uncheck();
        assert(await save().isDisabled());
        await dialog.getByRole('checkbox', { name: '选择图片 2', exact: true }).check();
        await save().click();
        await prompt.waitFor();
        await page.evaluate(() => { window.shareFailure = 'AbortError'; });
        await prompt.getByRole('button', { name: '系统分享', exact: true }).click();
        await prompt.getByText('已取消分享。').waitFor();
        await page.evaluate(() => { window.shareFailure = null; });
        await prompt.getByRole('button', { name: '系统分享', exact: true }).click();
        await prompt.waitFor({ state: 'detached' });
        assert.deepEqual(await page.evaluate(() => window.shared[0]), [{ name: 'x-101-image-2.png', type: 'image/png', bytes: Array.from(Buffer.from(bitmap[1], 'base64')) }], 'Selected image, MIME or bytes changed');
        await close();
        await page.locator('[data-testid="quoteTweet"]').getByRole('button', { name: /^图片文件/ }).click();
        assert.equal(await dialog.getByRole('checkbox', { name: /^选择图片/ }).count(), 1, 'Parent images mixed into quote');
        await close();
        await entry('505').click();
        await dialog.locator('.image-meta').getByText('1 · 320×240', { exact: true }).waitFor();
        await dialog.getByRole('button', { name: '保存全部（1）' }).waitFor();
        await save().click();
        await prompt.getByText('图片已准备好。').waitFor();
        assert(shellRequests > 0, 'DOM fallback skipped metadata lookup');
        await close();
        await entry('707').click();
        await dialog.getByText('未取得完整图片数据，可重新读取。').waitFor();
        await page.evaluate(async () => { await (await fetch('/i/api/graphql/query/TweetDetail')).json(); });
        await dialog.locator('.image-meta').getByText('1 · 320×240', { exact: true }).waitFor();
        await save().click();
        await prompt.getByText('图片已准备好。').waitFor();
        await close();

        await boot(true);
        await entry('101').first().click();
        failThird = true;
        const countBefore = originals.length;
        await save().click();
        await dialog.getByText('1 张图片准备失败，请重试或调整选择。').waitFor();
        assert.equal(await prompt.count(), 0, 'Partial preparation silently shared an incomplete set');
        assert.equal(await save().getAttribute('aria-label'), '保存全部（4）');
        assert.equal(originals.length - countBefore, 4);
        failThird = false;
        await save().click();
        await prompt.waitFor();
        assert.equal(originals.length - countBefore, 5, 'Retry refetched successful originals');
        await dialog.getByRole('checkbox', { name: '选择图片 1', exact: true }).uncheck();
        await prompt.waitFor({ state: 'detached' });
        assert.equal(await save().getAttribute('aria-label'), '保存所选（3）', 'Selection change retained prepared files for the old selection');
        await dialog.getByRole('checkbox', { name: '选择图片 1', exact: true }).check();
        await save().click();
        await prompt.waitFor();
        const artifacts = path.join(os.tmpdir(), 'stash-x-image-verification');
        await mkdir(artifacts, { recursive: true });
        await page.screenshot({ path: path.join(artifacts, `${engine.name()}-${width}.png`) });
        assert(await dialog.evaluate(node => { const r = node.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight && node.scrollWidth <= node.clientWidth; }), 'Image panel overflows the viewport');
        assert(await prompt.getByRole('button', { name: '系统分享', exact: true }).evaluate(node => { const r = node.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }), 'Prepared share action is clipped below the viewport');
        await prompt.getByRole('button', { name: '系统分享', exact: true }).click();
        await prompt.waitFor({ state: 'detached' });
        assert.deepEqual((await page.evaluate(() => window.shared[0])).map(file => file.name), ['x-101-image-1.jpg', 'x-101-image-2.png', 'x-101-image-3.jpg', 'x-101-image-4.jpg'], 'Image order was lost');
        await page.evaluate(() => { window.supportShare = false; });
        await save().click();
        await prompt.getByText('此浏览器不支持分享这些图片，可使用浏览器下载。').waitFor();
        const ready = page.waitForEvent('download');
        await prompt.getByRole('button', { name: '浏览器下载', exact: true }).click();
        const fallback = await ready;
        assert.equal(fallback.suggestedFilename(), 'x-101-image-1.jpg');
        assert.deepEqual(await readFile(await fallback.path()), Buffer.from(bitmap[0], 'base64'));
        await close();

        await boot(true, 'browser');
        await entry('404').click();
        const downloads = [];
        const downloadReady = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => { page.off('download', collect); reject(new Error('Batch downloads missing')); }, 10000);
            function collect(file) {
                downloads.push(file);
                if (downloads.length === 2) { clearTimeout(timeout); page.off('download', collect); resolve(); }
            }
            page.on('download', collect);
        });
        await save().click();
        await downloadReady;
        await dialog.getByText('已请求下载 2 张图片。').waitFor();
        assert.equal(await prompt.count(), 0, 'Browser mode offered system share');
        assert.equal(downloads.length, 2);
        assert.deepEqual(downloads.map(file => file.suggestedFilename()), ['x-404-image-2.png', 'x-404-image-3.jpg']);
        await page.keyboard.press('Escape');
        await dialog.waitFor({ state: 'hidden' });
        await page.evaluate(() => { document.querySelector('#post-404 a').href = '/u/status/999'; });
        await entry('404').waitFor({ state: 'detached' });
        await entry('101').first().click();
        await page.evaluate(() => history.pushState({}, '', '/home'));
        await dialog.waitFor({ state: 'hidden' });
        await page.evaluate(() => window.__stashXVideos.destroy());
        assert.equal(await page.getByRole('button', { name: /^图片文件/ }).count(), 0);
        assert.equal(await page.getByRole('dialog', { name: '图片文件' }).count(), 0);
        assert.deepEqual(errors, []);
        console.log(`${engine.name()} ${width}px: PASS image-only mode, original formats/order, quote isolation, selection/copy, metadata fallback, batch share/download, retry and cleanup`);
    } finally { await page.close(); }
};
