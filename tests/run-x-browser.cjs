// Run from the repository root: npm run test:x:browser
const http = require('node:http');
const { readFile } = require('node:fs/promises');
const path = require('node:path');
const { chromium, webkit } = require('playwright');
const root = path.resolve(__dirname, '..');
const files = ['x-options.html', 'x-scroll-navigation.html', 'x-runtime.html'];
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
            } finally { await browser.close(); }
        }
    } finally { await new Promise(resolve => server.close(resolve)); }
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
