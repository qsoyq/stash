const assert = require('node:assert/strict');
const { readFile, mkdir } = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');

module.exports = async function checkShareMenu(browser, engine, width) {
    const source = await readFile(path.join(__dirname, '../script/ad/x.js'), 'utf8');
    const page = await browser.newPage({ viewport: { width, height: 900 }, isMobile: width < 600, hasTouch: width < 600 });
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const high = 'https://video.twimg.com/amplify_video/123/vid/avc1/720x752/video.mp4';
    const tweet = (id, allowed) => ({ __typename: 'Tweet', rest_id: id, media_entities2: [{
        id_str: `media${id}`, type: 'video', allow_download_status: { allow_download: allowed },
        video_info: { variants: [{ content_type: 'video/mp4', bitrate: 1000, url: high }] },
    }] });
    const article = (id, video = true) => `<article id="post-${id}"><a href="/u/status/${id}"><time>2026-11-23</time></a><p>Post ${id}</p>${video ? '<video controls></video>' : ''}<button aria-label="分享帖子" onclick="window.openShare()">分享</button></article>`;
    const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
        <style>body{margin:0;font:15px -apple-system,sans-serif;color:#0f1419;background:#fff}main{max-width:580px;margin:auto;padding:16px}article{padding:12px;border-bottom:1px solid #ddd}video{width:100%;height:80px;background:#eee}button{font:inherit;min-height:44px}div[role=menu]{position:fixed;inset:auto 12px 12px;max-width:400px;z-index:10;background:white;border:1px solid #ccc;border-radius:8px;box-shadow:0 3px 12px #ccc}div[role=menu]>button{display:block;width:100%;padding:12px 16px;text-align:left;background:none;border:0}</style>
        <script>window.__INITIAL_STATE__=${JSON.stringify({ data: [tweet('101', true), tweet('202', true), tweet('303', false)] })};</script>
        </head><body><main>${article('101')}${article('202')}${article('303')}${article('909', false)}</main>
        <script>
        window.upsells=0;window.copies=0;window.kind='plus';
        window.openShare=()=>{
            document.querySelector('[role=menu]')?.remove();
            const menu=document.createElement('div');menu.setAttribute('role','menu');menu.setAttribute('aria-label','Share');
            if(window.kind==='login'){menu.setAttribute('role','dialog');menu.setAttribute('aria-label','Sign in');menu.innerHTML='<button>Sign in to download video</button>';document.body.appendChild(menu);return}
            menu.innerHTML='<button role="menuitem" id="copy-link">Copy link</button>'+(window.kind==='missing'?'':'<button role="menuitem" id="native-download" style="opacity: 0.7" '+(window.kind==='disabled'?'disabled':'')+'><span>'+(window.kind==='english'?'Download video':'下载视频')+'</span><span> Plus</span></button>');
            if(window.kind==='role-button'){const old=menu.querySelector('#native-download');const div=document.createElement('div');div.id=old.id;div.setAttribute('role','button');div.style.cssText=old.style.cssText;div.innerHTML=old.innerHTML;old.replaceWith(div)}
            menu.querySelector('#copy-link').onclick=()=>window.copies++;
            const download=menu.querySelector('#native-download');if(download)download.onclick=()=>window.upsells++;
            menu.onkeydown=event=>{if(event.key==='Escape')menu.remove()};
            document.body.appendChild(menu);
        };
        </script></body></html>`;
    let rewritten;
    try {
        await page.route('https://x.com/**', route => route.fulfill({ contentType: 'text/html; charset=utf-8', body: rewritten }));
        const boot = async (entry, menu, escape = true) => {
            rewritten = await page.evaluate(async ({ source, html, entry, menu, escape }) => {
                const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
                const parser = source.slice(source.indexOf('function getXOptions()'), source.indexOf('function removeAdsCode('));
                const defaults = new Function(`${parser}; return getXOptions();`)();
                const options = Object.fromEntries(Object.entries(defaults).map(([key, value]) => [key, typeof value === 'boolean' ? false : value]));
                options.enable_video_tools = entry;
                options.enable_share_menu_download = menu;
                options.enable_escape_back = escape;
                let result;
                await new AsyncFunction('$request', '$response', '$script', '$argument', '$done', source)(
                    { url: 'https://x.com/u/status/101' }, { headers: { 'content-type': 'text/html' }, body: html },
                    { type: 'response' }, JSON.stringify(options), value => { result = value; });
                return result.body || html;
            }, { source, html, entry, menu, escape });
            await page.goto('https://x.com/u/status/101');
        };
        const replacement = page.locator('[data-stash-x-video="share-download"]');
        const panel = page.getByRole('dialog', { name: '视频文件' });
        const open = async (id = '101', kind = 'plus') => {
            await page.evaluate(kind => { window.kind = kind; }, kind);
            await page.locator(`#post-${id} button[aria-label="分享帖子"]`).click();
            await page.getByRole('menu', { name: 'Share' }).waitFor();
        };
        const close = async () => { await panel.getByRole('button', { name: '关闭', exact: true }).click(); await panel.waitFor({ state: 'hidden' }); };
        const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));

        await boot(false, false, false);
        assert.equal(await page.evaluate(() => !!window.__stashXVideos), false, 'All-disabled settings still installed the video runtime');
        await boot(true, false);
        await open();
        await settle();
        assert.equal(await replacement.count(), 0, 'Disabled experiment changed the share menu');
        await page.locator('#native-download').click();
        assert.equal(await page.evaluate(() => window.upsells), 1, 'Original handler changed while disabled');
        assert(await page.locator('article').getByRole('button', { name: '视频文件', exact: true }).count() > 0);

        await boot(false, true, false);
        assert.equal(await page.locator('article').getByRole('button', { name: '视频文件', exact: true }).count(), 0, 'Menu option enabled the independent toolbar entry');
        await page.evaluate(() => window.openShare());
        await settle();
        assert.equal(await replacement.count(), 0, 'Unrelated menu was modified without a share trigger');
        await page.evaluate(() => document.querySelector('[role=menu]').remove());
        await page.evaluate(() => { window.kind = 'login'; });
        await page.locator('#post-101 button[aria-label="分享帖子"]').click();
        await page.getByRole('dialog', { name: 'Sign in' }).waitFor();
        await settle();
        assert.equal(await replacement.count(), 0, 'Login dialog was mistaken for a share menu');
        await page.evaluate(() => document.querySelector('[aria-label="Sign in"]').remove());
        const kinds = ['plus', 'disabled', 'role-button', 'english', 'missing'];
        for (const kind of kinds) {
            await open('101', kind);
            await replacement.waitFor();
            if (kind !== 'missing') assert(!(await page.locator('#native-download').isVisible()), 'Premium action remains visible');
            await page.locator('#copy-link').click();
            assert.equal(await page.evaluate(() => window.copies), kinds.indexOf(kind) + 1, 'Other share actions were intercepted');
            await replacement.click();
            await panel.waitFor();
            assert.equal(await panel.getByRole('textbox', { name: 'MP4 地址', exact: true }).inputValue(), high);
            assert.equal(await page.evaluate(() => window.upsells), 0, 'Subscription handler was invoked');
            await panel.locator('summary').click();
            assert.equal(JSON.parse(await panel.locator('pre').textContent()).shareMenu.action, kind === 'missing' ? 'added' : 'replaced');
            await panel.locator('summary').click();
            assert.equal(await page.getByRole('menu').count(), 0, 'Native share menu was not dismissed');
            assert.equal(new URL(page.url()).pathname, '/u/status/101', 'Dismissing share menu navigated back');
            await close();
        }
        await open('202');
        await replacement.click();
        await panel.locator('summary').click();
        assert.equal(JSON.parse(await panel.locator('pre').textContent()).postId, '202', 'Share used the URL post instead of the clicked post');
        await close();
        await open('303');
        await settle();
        assert.equal(await replacement.count(), 0, 'Author no-download preference was overridden');
        assert(await page.locator('#native-download').isVisible());
        await open('909');
        await settle();
        assert.equal(await replacement.count(), 0, 'Text-only tweet acquired a video action');
        // The device report contains previewInterstitial/playButton, with no
        // videoPlayer or <video>. No metadata has arrived for this post either.
        await page.evaluate(() => {
            const preview = document.createElement('div');
            preview.setAttribute('data-testid', 'previewInterstitial');
            preview.innerHTML = '<button data-testid="playButton">Play</button><img alt="" />';
            document.querySelector('#post-909').appendChild(preview);
        });
        await open('909');
        await replacement.waitFor();
        await replacement.click();
        await panel.waitFor();
        await panel.locator('summary').click();
        assert.equal(JSON.parse(await panel.locator('pre').textContent()).postId, '909', 'Unplayed preview did not acquire its own download action');
        await close();
        await open();
        await replacement.waitFor();
        await page.evaluate(() => { document.querySelector('#post-101 a').href = '/u/status/999'; });
        await settle();
        assert.equal(await replacement.count(), 0, 'Recycled tweet retained its download action');
        assert.equal(await page.locator('#native-download').getAttribute('style'), 'opacity: 0.7', 'Original action was not restored exactly');

        if (width < 600) {
            for (const [iconOnly, suppressClick] of [[false, true], [true, true], [true, false]]) {
                await boot(true, true);
                await page.evaluate(({ iconOnly, suppressClick }) => {
                    window.shareEvents = [];
                    const button = document.querySelector('#post-101 button[aria-label="分享帖子"]');
                    button.id = 'device-share';
                    button.removeAttribute('onclick');
                    if (iconOnly) {
                        button.removeAttribute('aria-label');
                        button.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 2.59l5.7 5.7-1.41 1.42L13 6.41V16h-2V6.41l-3.3 3.3-1.41-1.42L12 2.59z" /></svg>';
                        const group = document.createElement('div');
                        group.setAttribute('role', 'group');
                        group.innerHTML = '<button data-testid="reply">Reply</button><button data-testid="like">Like</button>';
                        button.before(group);
                        group.appendChild(button);
                    }
                    for (const type of ['pointerdown', 'touchstart', 'touchend', 'click']) document.addEventListener(type, event => {
                        if (button.contains(event.target)) window.shareEvents.push(type);
                    }, true);
                    button.addEventListener('touchend', event => {
                        if (suppressClick) event.preventDefault();
                        window.openShare();
                    }, { passive: false });
                }, { iconOnly, suppressClick });
                await page.locator('#device-share').tap();
                await page.getByRole('menu', { name: 'Share' }).waitFor();
                await settle();
                const trace = await page.evaluate(() => ({ events: window.shareEvents, share: window.__stashXVideos.diagnostics().share }));
                console.log(`${engine.name()} touch share trace: ${JSON.stringify(trace)}`);
                assert(trace.events.includes('touchend') && trace.events.includes('click') === !suppressClick, 'Touch fixture generated an unexpected compatibility click');
                assert.equal(trace.share.trigger, true, 'Touch-only share never reached the download integration');
                await page.evaluate(() => {
                    const diagnostic = document.createElement('button');
                    diagnostic.id = 'device-diagnostic';
                    diagnostic.setAttribute('data-stash-layout-diagnostic', '');
                    diagnostic.textContent = 'Diagnostic';
                    diagnostic.style.cssText = 'position:fixed;top:0;right:0;z-index:20';
                    document.body.appendChild(diagnostic);
                });
                await page.locator('#device-diagnostic').click();
                await settle();
                assert.equal(await replacement.count(), 1, 'Copying a diagnostic cleared the active share integration');
                await replacement.click();
                await panel.waitFor();
                assert.equal(await panel.getByRole('textbox', { name: 'MP4 地址', exact: true }).inputValue(), high);
                assert.equal(await page.evaluate(() => window.upsells), 0, 'Touch share invoked the Premium handler');
                await close();
            }
        }

        await boot(false, true);
        await page.evaluate(() => {
            const button = document.querySelector('#post-101 button[aria-label="分享帖子"]');
            button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
            button.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true }));
            window.openShare();
        });
        await settle();
        assert.equal(await replacement.count(), 0, 'A cancelled share touch retained an active integration');
        assert.equal(await page.evaluate(() => window.__stashXVideos.diagnostics().share.lastAttempt), 'cancelled');

        await boot(true, true);
        await open();
        await replacement.waitFor();
        await replacement.click();
        await panel.waitFor();
        assert.equal(new URL(page.url()).pathname, '/u/status/101', 'Share dismissal triggered global Escape navigation');
        await close();
        await open();
        await replacement.waitFor();
        const artifacts = path.join(os.tmpdir(), 'stash-x-video-verification');
        await mkdir(artifacts, { recursive: true });
        await page.screenshot({ path: path.join(artifacts, `${engine.name()}-${width}-share-menu.png`) });
        await page.evaluate(() => window.__stashXVideos.destroy());
        assert.equal(await replacement.count(), 0, 'Destroy left an injected menu item');
        assert.equal(await page.locator('#native-download').getAttribute('style'), 'opacity: 0.7', 'Destroy failed to restore the original action');
        await page.locator('#native-download').click();
        assert.equal(await page.evaluate(() => window.upsells), 1, 'Destroy lost the original handler');
        assert.deepEqual(errors, []);
        console.log(`${engine.name()} ${width}px: PASS share-menu Plus replacement, disabled/English/missing items, independent switches, post ownership, author restriction and cleanup`);
    } finally { await page.close(); }
};
