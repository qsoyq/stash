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
    const low = 'https://video.twimg.com/amplify_video/123/vid/avc1/320x334/video.mp4';
    const videoBytes = Buffer.from('000000186674797069736f6d0000020069736f6d', 'hex');
    const requests = [];
    const tweet = (id, allowed) => ({ __typename: 'Tweet', rest_id: id, media_entities2: [{
        id_str: `media${id}`, type: 'video', allow_download_status: { allow_download: allowed },
        video_info: { variants: [{ content_type: 'video/mp4', bitrate: 200, url: low }, { content_type: 'video/mp4', bitrate: 1000, url: high }] },
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
            menu.innerHTML='<button role="menuitem" id="copy-link"><span class="menu-label">Copy link</span></button>'+(window.kind==='missing'?'':'<button role="menuitem" id="native-download" style="opacity: 0.7" '+(window.kind==='disabled'?'disabled':'')+'><svg data-native-icon="download" width="20" height="20" viewBox="0 0 24 24"><path d="M12 3v12m-4-4 4 4 4-4"/></svg><span>'+(window.kind==='english'?'Download video':'下载视频')+'</span><span> Plus</span></button>');
            if(['sheet','mask-sheet','stuck-sheet'].includes(window.kind)){
                const sheet=document.createElement('div');sheet.dataset.testid='sheetDialog';
                sheet.innerHTML='<button role="menuitem" id="send-chat"><span class="menu-label">通过聊天发送</span></button>';
                while(menu.firstChild)sheet.appendChild(menu.firstChild);
                if(window.kind==='sheet')sheet.insertAdjacentHTML('beforeend','<button id="cancel-share">取消</button>');
                menu.appendChild(sheet);
                sheet.style.color='rgb(83,100,113)';
                const style=document.createElement('style');style.textContent='.premium-disabled{opacity:.45;color:rgb(83,100,113)}.menu-label{color:rgb(15,20,25)}.premium-disabled span{color:rgb(83,100,113)}[data-testid="sheetDialog"]>button{display:block;width:100%;min-height:44px;border:0;background:none;text-align:left;padding:12px 16px}';menu.appendChild(style);
                sheet.querySelector('#native-download').className='premium-disabled';
                const dismiss=()=>requestAnimationFrame(()=>{menu.remove();document.querySelector('#post-101 button[aria-label="分享帖子"]').focus()});
                if(window.kind==='sheet')sheet.querySelector('#cancel-share').onclick=dismiss;
                if(window.kind==='mask-sheet'){
                    const mask=document.createElement('div');mask.dataset.testid='mask';mask.onclick=dismiss;menu.prepend(mask);
                }
                window.nativePresses=0;window.chatFocuses=0;window.syntheticEscapes=0;
                sheet.addEventListener('touchstart',()=>window.nativePresses++);
                sheet.querySelector('#send-chat').onfocus=()=>window.chatFocuses++;
            }
            if(window.kind==='role-button'){const old=menu.querySelector('#native-download');const div=document.createElement('div');div.id=old.id;div.setAttribute('role','button');div.style.cssText=old.style.cssText;div.innerHTML=old.innerHTML;old.replaceWith(div)}
            menu.querySelector('#copy-link').onclick=()=>window.copies++;
            const download=menu.querySelector('#native-download');if(download)download.onclick=()=>window.upsells++;
            menu.onkeydown=event=>{if(event.key==='Escape'){if(['sheet','mask-sheet','stuck-sheet'].includes(window.kind)){window.syntheticEscapes=(window.syntheticEscapes||0)+1;menu.querySelector('#send-chat').focus()}else menu.remove()}};
            document.body.appendChild(menu);
        };
        </script></body></html>`;
    let rewritten;
    try {
        await page.route('https://video.twimg.com/**', route => {
            requests.push(route.request().url());
            return route.fulfill({ contentType: 'video/mp4', headers: { 'access-control-allow-origin': '*' }, body: videoBytes });
        });
        await page.route('https://x.com/**', route => {
            const pathname = new URL(route.request().url()).pathname;
            const id = pathname.split('/').at(-1);
            const data = tweet(id, id !== '606');
            if (id === '707') data.media_entities2[0].video_info.variants = [{ content_type: 'application/x-mpegURL', url: 'https://video.twimg.com/707/video.m3u8' }];
            return route.fulfill({ contentType: 'text/html; charset=utf-8', body: pathname.startsWith('/i/web/status/') ? `<script type="application/json">${JSON.stringify(data)}</script>` : rewritten });
        });
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
        const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const download = async (id = '101', touch = false, keyboard = false) => {
            const ready = page.waitForEvent('download');
            if (keyboard) await replacement.press('Enter');
            else if (touch) await replacement.tap();
            else await replacement.click();
            const file = await ready;
            assert.equal(file.suggestedFilename(), `x-${id}-media${id}.mp4`, 'Download used the wrong post or media');
            assert.deepEqual(await readFile(await file.path()), videoBytes, 'Downloaded bytes differ from the MP4 response');
            assert.equal(requests.at(-1), high, 'Share download did not select the highest bitrate');
            await page.waitForFunction(() => window.__stashXVideos.diagnostics().share.download === 'requested');
            assert.equal(await panel.count(), 0, 'Share download opened the custom video panel');
        };

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
            await download('101', false, kind === 'role-button');
            assert.equal(await page.evaluate(() => window.upsells), 0, 'Subscription handler was invoked');
            assert.equal(await page.evaluate(() => window.__stashXVideos.diagnostics().share.action), kind === 'missing' ? 'added' : 'replaced');
            await page.getByRole('menu').waitFor({ state: 'detached' });
            assert.equal(new URL(page.url()).pathname, '/u/status/101', 'Dismissing share menu navigated back');
        }
        await open('202');
        await download('202');
        // The iPhone sheet has its own cancel action and focus manager. A
        // synthetic Escape is not a reliable dismissal API for that sheet.
        for (const kind of ['sheet', 'mask-sheet']) {
            await open('101', kind);
            await replacement.waitFor();
            const appearance = await replacement.evaluate(button => ({ opacity: getComputedStyle(button).opacity, color: getComputedStyle(button).color, textColor: getComputedStyle(button.querySelector('span')).color }));
            assert.equal(appearance.opacity, '1', 'Replacement inherited the Premium-disabled opacity class');
            assert.equal(appearance.color, 'rgb(15, 20, 25)', 'Replacement retained the disabled text color instead of the sheet theme');
            assert.equal(appearance.textColor, 'rgb(15, 20, 25)', 'Native text spans retained disabled colors');
            assert.equal(await replacement.locator('[data-native-icon="download"]').count(), 1, 'Original download icon was replaced');
            await download('101', width < 600);
            await page.getByRole('menu').waitFor({ state: 'detached' });
            assert.equal(await page.evaluate(() => window.syntheticEscapes), 0, 'iPhone sheet received the synthetic Escape that focuses Send via chat');
            assert.equal(await page.evaluate(() => window.chatFocuses + window.nativePresses), 0, 'Replacement press leaked to the native focus manager');
            assert.equal(await page.evaluate(() => window.upsells), 0, 'iPhone share sheet restored the subscription action');
        }
        await open('101', 'stuck-sheet');
        await download();
        await page.waitForFunction(() => !window.__stashXVideos.isOpen());
        assert(!(await page.locator('#native-download').isVisible()), 'Failed dismissal exposed the Plus action');
        await download();
        assert.equal(await page.evaluate(() => window.upsells), 0, 'Second activation invoked Plus after a failed dismissal');
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
        await download('909');
        for (const [id, message] of [['606', '作者已关闭视频下载。'], ['707', '未找到可下载的 MP4。']]) {
            await page.evaluate(markup => document.body.insertAdjacentHTML('beforeend', markup), article(id));
            await open(id);
            await replacement.waitFor();
            const count = requests.length;
            await replacement.click();
            await page.waitForFunction(() => window.__stashXVideos.diagnostics().share.download === 'failed');
            assert.equal(requests.length, count, 'Unavailable or author-disabled media was downloaded');
            assert.equal(await panel.count(), 0, 'Download error opened the custom video panel');
            assert.equal(await page.getByRole('status').textContent(), message, 'Download failure was silent or misleading');
        }
        const multi = tweet('808', true);
        multi.media_entities2.push({ ...multi.media_entities2[0], id_str: 'media808b' });
        await page.evaluate(({ markup, data }) => {
            document.body.insertAdjacentHTML('beforeend', markup);
            const script = document.createElement('script');script.type = 'application/json';script.textContent = JSON.stringify(data);document.body.appendChild(script);
        }, { markup: article('808'), data: multi });
        await open('808');
        await replacement.waitFor();
        const files = [];
        const allDownloads = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => { page.off('download', collect); reject(new Error('Multiple videos were not all downloaded')); }, 10000);
            function collect(file) {
                files.push(file);
                if (files.length === 2) { clearTimeout(timeout); page.off('download', collect); resolve(files); }
            }
            page.on('download', collect);
        });
        await replacement.click();
        await allDownloads;
        assert.deepEqual(files.map(file => file.suggestedFilename()).sort(), ['x-808-media808.mp4', 'x-808-media808b.mp4']);
        for (const file of files) assert.deepEqual(await readFile(await file.path()), videoBytes);
        assert.equal(await panel.count(), 0, 'Multiple-video download opened a selection panel');
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
                await download('101', true);
                assert.equal(await page.evaluate(() => window.upsells), 0, 'Touch share invoked the Premium handler');
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
        await download();
        assert.equal(new URL(page.url()).pathname, '/u/status/101', 'Share dismissal triggered global Escape navigation');
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
        console.log(`${engine.name()} ${width}px: PASS native menu appearance, direct highest-quality MP4 downloads, multiple videos, keyboard/touch, metadata fallback, author restrictions, errors and cleanup`);
    } finally { await page.close(); }
};
