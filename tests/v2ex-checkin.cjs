// Run with jsdom available: NODE_PATH=/path/to/node_modules node --test tests/v2ex-checkin.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');
const source = fs.readFileSync(`${__dirname}/../script/enhance/v2ex.js`, 'utf8');
const browserSource = source.slice(source.indexOf('async function v2exAutoCheckinCode()'), source.indexOf('\nasync function main()'));
const top = '<div id="Top"><a href="/member/example">example</a></div>';
const marker = '<code>v2ex:member:123:20261021</code>';
const pending = `${top}<div id="Main">${marker}<input value="Redeem X Copper Coins" onclick="location.href = '/mission/daily/redeem?once=12345';"></div>`;
const claimed = `${top}<div id="Main">${marker}每日登录奖励已领取</div>`;
const signin = '<form><input placeholder="Username or Email" name="randomhash"><input type="password"></form>';
const doc = html => new JSDOM(html).window.document;
const DOMParser = new JSDOM('').window.DOMParser;

async function rewrite(body, argument, path = '/signin', headers = { 'content-type': 'text/html' }, status = 200) {
    const calls = [];
    const context = {
        $script: { type: 'response' }, $request: { url: `https://v2ex.com${path}` },
        $response: { status, headers, body }, $done: result => calls.push(result),
        DOMParser, URL, TextDecoder, Uint8Array, console: { log() {} },
    };
    if (argument !== undefined) context.$argument = argument;
    await vm.runInNewContext(source, context);
    assert.equal(calls.length, 1, '$done must run exactly once');
    return calls[0];
}

function browser({ page = pending, replies = [], pathname = '/t/123', storage = new Map(), locked = false, storageDenied = false } = {}) {
    const calls = [];
    let reloads = 0;
    const context = {
        document: doc(page), DOMParser, URL, AbortController, setTimeout, clearTimeout,
        window: { location: { origin: 'https://v2ex.com', pathname, reload() { reloads++; } } },
        localStorage: {
            getItem(key) { if (storageDenied) throw Error('denied'); return storage.get(key) || null; },
            setItem(key, value) { if (storageDenied) throw Error('denied'); storage.set(key, value); },
        },
        navigator: { locks: { request: async (_, options, fn) => fn(locked ? null : {}) } },
        console: { log() {} },
        fetch: async (path, options) => {
            calls.push(path);
            assert.equal(options.credentials, 'same-origin');
            assert.equal(options.cache, 'no-store');
            assert.equal(options.referrer, 'https://v2ex.com/mission/daily');
            const reply = replies.shift();
            assert.ok(reply, `Unexpected request: ${path}`);
            if (reply.error) throw Error(reply.error);
            return {
                ok: (reply.status || 200) === 200, status: reply.status || 200,
                url: reply.url || `https://v2ex.com${path}`,
                headers: { get: () => reply.type || 'text/html' }, text: async () => reply.html,
            };
        },
    };
    const run = () => vm.runInNewContext(`${browserSource}; v2exAutoCheckinCode()`, context);
    return { run, calls, storage, reloads: () => reloads };
}

test('defaults and invalid arguments preserve AutoFill without enabling check-in', async () => {
    for (const arg of [undefined, '', '{}', 'invalid', 'null', '[]', '{"safari_autofill":0,"auto_checkin":"true"}']) {
        const result = await rewrite(signin, arg);
        const document = doc(result.body);
        assert.equal(document.querySelector('input[name="username"]').getAttribute('autocomplete'), 'username');
        assert.ok(document.querySelector('input[type="hidden"][name="randomhash"]'));
        assert.ok(!document.querySelector('#__v2ex_auto_checkin'));
    }
});

test('independent switches, all disabled, and response filters', async () => {
    for (const autofill of [false, true]) {
        for (const checkin of [false, true]) {
            const arg = JSON.stringify({ safari_autofill: autofill, auto_checkin: checkin });
            assert.equal(Boolean((await rewrite(signin, arg)).body), autofill);
            for (const path of ['/', '/?tab=tech', '/t/123?p=2', '/go/python', '/mission/daily']) {
                const result = await rewrite(pending, arg, path);
                assert.equal(Boolean(result.body), checkin);
                if (checkin) assert.ok(doc(result.body).querySelector('#__v2ex_auto_checkin'));
            }
        }
    }
    for (const [page, path, headers, status] of [
        [pending, '/mission/daily/redeem?once=123', undefined, 200],
        [pending, '/', { 'Content-Type': 'application/json' }, 200],
        [pending, '/', undefined, 403],
        ['<div id="Main">Sign in</div>', '/', undefined, 200],
    ]) assert.equal((await rewrite(page, '{"auto_checkin":true}', path, headers, status)).body, undefined);
});

test('AutoFill mirrors desktop and mobile fields on submit', async () => {
    for (const html of [signin, '<form><table><tr><td>用户名</td><td><input type="text" name="mobilehash"></td></tr></table></form>']) {
        const result = await rewrite(html);
        const dom = new JSDOM(result.body, { runScripts: 'dangerously' });
        const input = dom.window.document.querySelector('input[name="username"]');
        input.value = 'example';
        input.closest('form').dispatchEvent(new dom.window.Event('submit'));
        assert.equal(dom.window.document.querySelector('input[type="hidden"]').value, 'example');
    }
});

test('claims fresh token, confirms success, throttles repeats and keeps topic position', async () => {
    const b = browser({ replies: [{ html: pending }, { html: claimed }] });
    await b.run();
    await b.run();
    assert.deepEqual(b.calls, ['/mission/daily', '/mission/daily/redeem?once=12345']);
    assert.equal(b.storage.get('v2ex_auto_checkin:/member/example:done'), 'v2ex:member:123:20261021');
    assert.equal(b.reloads(), 0);
});

test('daily page refreshes only after confirmed success; fallback rechecks state', async () => {
    const b = browser({ pathname: '/mission/daily', replies: [{ html: pending }, { html: `${top}<div id="Main">OK</div>` }, { html: claimed }] });
    await b.run();
    assert.equal(b.calls.length, 3);
    assert.equal(b.reloads(), 1);
});

test('already claimed, unknown state, invalid token, login changes, network and HTTP errors do not redeem', async () => {
    for (const reply of [
        { html: claimed }, { html: claimed.replace('每日登录奖励已领取', 'Daily login reward already redeemed') },
        { html: `${top}<div id="Main">${marker}Unknown</div>` },
        { html: pending.replace('?once=12345', '?once=12345&next=bad') },
        { html: pending.replaceAll('/member/example', '/member/other') },
        { html: pending, url: 'https://v2ex.com/signin' },
        { html: pending, status: 403 }, { html: pending, type: 'application/json' }, { error: 'offline' },
    ]) {
        const b = browser({ replies: [reply] });
        await b.run();
        assert.deepEqual(b.calls, ['/mission/daily']);
    }
});

test('unconfirmed claim is not cached as success', async () => {
    const b = browser({ replies: [{ html: pending }, { html: pending }, { html: pending }] });
    await b.run();
    assert.equal(b.storage.has('v2ex_auto_checkin:/member/example:done'), false);
});

test('signed-out and concurrent tabs send no requests', async () => {
    for (const options of [{ page: '<div id="Main">Sign in</div>' }, { locked: true }]) {
        const b = browser(options);
        await b.run();
        assert.deepEqual(b.calls, []);
    }
});

test('storage denial still allows confirmed claim', async () => {
    const b = browser({ storageDenied: true, replies: [{ html: pending }, { html: claimed }] });
    await b.run();
    assert.equal(b.calls.length, 2);
});

test('completed day is checked again after throttle without redeeming twice', async () => {
    const storage = new Map([['v2ex_auto_checkin:/member/example:done', 'v2ex:member:123:20261021']]);
    const b = browser({ storage, replies: [{ html: claimed.replace('每日登录奖励已领取', 'Daily login reward already redeemed') }] });
    await b.run();
    assert.deepEqual(b.calls, ['/mission/daily']);
});

test('server date rollover and account switch do not reuse another completion marker', async () => {
    const storage = new Map([
        ['v2ex_auto_checkin:/member/example:done', 'v2ex:member:123:20261020'],
        ['v2ex_auto_checkin:/member/other:attempt', String(Date.now())],
    ]);
    const b = browser({ storage, replies: [{ html: pending }, { html: claimed }] });
    await b.run();
    assert.equal(b.calls.length, 2);
    assert.equal(storage.get('v2ex_auto_checkin:/member/example:done'), 'v2ex:member:123:20261021');
});
