// Run from the repository root: npm run test:x:browser
const http = require('node:http');
const { readFile } = require('node:fs/promises');
const path = require('node:path');
const { chromium, webkit } = require('playwright');
const root = path.resolve(__dirname, '..');
const files = ['x-options.html', 'x-scroll-navigation.html', 'x-runtime.html', 'x-double-tap.html'];
const server = http.createServer(async (request, response) => {
    try {
        const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
        if ((!pathname.startsWith('/tests/') && !pathname.startsWith('/script/')) || !/\.(html|js)$/.test(pathname)) { response.writeHead(404).end(); return; }
        const file = path.resolve(root, `.${pathname}`);
        if (!file.startsWith(`${root}${path.sep}`)) { response.writeHead(403).end(); return; }
        response.setHeader('Content-Type', file.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/javascript; charset=utf-8');
        response.end(await readFile(file));
    } catch (_) { response.writeHead(404).end(); }
});

// Browser-generated touch/mouse input complements the synthetic edge-case matrix.
async function checkGestureInput(browser, engine, address, touch) {
    const page = await browser.newPage({ viewport: { width: touch ? 390 : 1440, height: 900 }, hasTouch: touch, isMobile: touch });
    const assert = require('node:assert/strict');
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
        await page.goto(`${address}/tests/x-double-tap.html?fixture`);
        await page.waitForFunction(() => window.xGestureTest);
        const double = async (id = 'blank') => {
            const target = page.locator(`#${id}`);
            const position = id === 'text' ? { position: { x: 20, y: 8 } } : {};
            if (touch) { await target.tap(position); await target.tap(position); }
            else await target.dblclick(position);
        };
        await page.evaluate(() => {
            window.inputEvidence = [];
            for (const type of ['touchend', 'dblclick']) document.addEventListener(type, event => window.inputEvidence.push([type, event.isTrusted]));
            window.xGestureTest.start(window.xGestureTest.disabled);
            window.likes = 0;
            document.getElementById('like').addEventListener('click', () => window.likes++);
        });
        await double();
        assert.equal(await page.evaluate(() => window.xGestureTest.backs()), 0, 'Disabled feature navigated');
        await page.evaluate(() => window.xGestureTest.start());
        await double('like-label');
        assert.equal(await page.evaluate(() => window.xGestureTest.backs()), 0, 'Like intercepted');
        assert.equal(await page.evaluate(() => window.likes), 2, 'Original clicks suppressed');
        await page.evaluate(() => window.xGestureTest.start());
        await double();
        assert.equal(await page.evaluate(() => window.xGestureTest.backs()), 1, 'Trusted double input did not navigate exactly once');
        if (touch) {
            await page.evaluate(() => window.xGestureTest.start());
            await double('text');
            assert.equal(await page.evaluate(() => window.xGestureTest.backs()), 1, 'Trusted text taps failed');
        } else {
            await page.evaluate(() => window.xGestureTest.start());
            await double('text');
            assert.equal(await page.evaluate(() => window.xGestureTest.backs()), 0, 'Mouse word selection intercepted');
            assert(await page.evaluate(() => !window.getSelection().isCollapsed), 'Mouse test did not select text');
        }
        const evidence = await page.evaluate(() => window.inputEvidence);
        assert(evidence.some(([type, trusted]) => type === (touch ? 'touchend' : 'dblclick') && trusted), 'No trusted input exercised');
        await page.evaluate(() => {
            window.xGestureTest.start(undefined, false, '/home');
            history.pushState({}, '', '/u/status/123');
        });
        await double();
        await page.waitForURL('**/home');
        await page.evaluate(() => {
            window.xGestureTest.start(undefined, false, '/u/status/123');
            history.pushState({}, '', '/u/status/456');
        });
        await double();
        await page.waitForURL('**/u/status/123');
        assert.deepEqual(errors, []);
        console.log(`${engine.name()} ${touch ? 'touch' : 'mouse'}: PASS trusted input, interaction guards and real one-entry history back`);
    } finally { await page.close(); }
}

(async () => {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const address = `http://127.0.0.1:${server.address().port}`;
    try {
        for (const engine of [chromium, webkit]) {
            const browser = await engine.launch();
            try {
                for (const width of [390, 1440]) {
                    for (const file of files) {
                        const page = await browser.newPage({ viewport: { width, height: 900 } });
                        const errors = [];
                        page.on('pageerror', error => errors.push(error.message));
                        page.on('console', message => {
                            if (message.text().startsWith('X synthetic')) console.log(`${engine.name()} ${width}px ${message.text()}`);
                        });
                        try {
                            // Complete navigation (not srcdoc) also checks document-mode behavior.
                            await page.goto(`${address}/tests/${file}`);
                            await page.waitForFunction(() => /^(PASS|FAIL):/.test(document.querySelector('#result')?.textContent || ''), null, { timeout: 60000 });
                            const result = await page.textContent('#result');
                            console.log(`${engine.name()} ${width}px ${file}: ${result}`);
                            if (result.startsWith('FAIL:') || errors.length) throw new Error(`${file}: ${result}\n${errors.join('\n')}`);
                        } finally { await page.close(); }
                    }
                }
                for (const touch of [false, true]) await checkGestureInput(browser, engine, address, touch);
            } finally { await browser.close(); }
        }
    } finally { await new Promise(resolve => server.close(resolve)); }
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
