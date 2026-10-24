// Run with: node tests/x-rewrites.cjs (requires Ruby YAML and jq).
const { execFileSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const assert = require('node:assert/strict');
const override = JSON.parse(execFileSync('ruby', ['-r', 'yaml', '-r', 'json', '-e', 'puts JSON.generate(YAML.load_file(ARGV[0]))', 'override/ad/x.stoverride'], { encoding: 'utf8' }));
const defaults = Object.fromEntries(Object.entries(override.arguments).map(([key, value]) => [key, value.default]));
function expand(text, values = defaults) {
    return text.replace(/\$\{args\.([a-z_]+)(\|json)?\}/g, (_, key, json) => {
        assert(Object.hasOwn(values, key), `Undeclared parameter: ${key}`);
        return json ? JSON.stringify(values[key]) : String(values[key]);
    });
}
const source = readFileSync('script/ad/x.js', 'utf8');
const diagnosticUrl = source.match(/const LAYOUT_DIAGNOSTICS_URL = '([^']+)'/)?.[1];
assert.equal(diagnosticUrl, override['script-providers'].x.url.replace('/script/ad/x.js', '/script/browser/layout-diagnostics.js'), 'Indirect diagnostic resource uses a different branch');
const parser = source.slice(source.indexOf('function getXOptions()'), source.indexOf('function removeAdsCode('));
const scriptDefaults = new Function(`${parser}; return getXOptions();`)();
assert.deepEqual(JSON.parse(expand(override.http.script[0].argument)), scriptDefaults, 'Override and script defaults differ');
for (const [key, declaration] of Object.entries(override.arguments)) {
    if (declaration.type === 'switch') assert.equal(typeof declaration.default, 'boolean');
    if (declaration.type === 'select') assert(declaration.options.some(option => option.value === declaration.default));
}
const entry = (id, component, promoted = false) => ({ entryId: id, content: { itemContent: promoted ? { promotedMetadata: {} } : {}, clientEventInfo: { component } } });
const recommendations = ['for_you_pinned', 'community_to_join', 'suggest_who_to_subscribe', 'suggest_who_to_follow', 'premium-plus-upsell-prompt'];
const home = { data: { home: { home_timeline_urt: { instructions: [
    { type: 'TimelineShowAlert', alertType: 'NewTweets' },
    { entries: [entry('normal', 'tweet'), entry('ad', 'tweet', true), ...recommendations.map(id => entry(id, id))] },
] } } } };
const detail = { data: { nested: { entries: [
    { entryId: 'normal', content: { items: [{ item: { itemContent: {} } }] } },
    { entryId: 'ad', content: { items: [{ item: { itemContent: { promotedMetadata: {} } } }] } },
] } } };
const profile = { data: { nested: { entries: [entry('normal', 'tweet'), entry('follow', 'suggest_who_to_follow')] } } };
let passed = 0;
function rewrite(operation, body, values = defaults) {
    let result = body;
    let matched = 0;
    for (const raw of override.http['body-rewrite']) {
        const [pattern, expression] = expand(raw, values).split(' response-jq ');
        if (!new RegExp(pattern).test(`https://x.com/i/api/graphql/query/${operation}?variables=example`)) continue;
        matched++;
        result = JSON.parse(execFileSync('jq', ['-c', expression], { input: JSON.stringify(result), encoding: 'utf8' }));
    }
    assert(matched > 0, `No rule matched ${operation}`);
    return result;
}
for (const [operation, input] of [['HomeTimeline', home], ['HomeTimelineLatest', home], ['TweetDetail', detail], ['UserTweets', profile], ['UserTweetsAndReplies', profile]]) {
    const off = { ...defaults, block_ads_and_recommendations: false, hide_new_tweets_alert: false };
    assert.deepEqual(rewrite(operation, input, off), input);
    assert.deepEqual(rewrite(operation, { data: {} }), { data: {} });
    passed += 2;
}
const homeResult = rewrite('HomeTimeline', home).data.home.home_timeline_urt.instructions;
assert.equal(homeResult.length, 1);
assert.deepEqual(homeResult[0].entries.map(item => item.entryId), ['normal']);
const keepAlert = rewrite('HomeTimeline', home, { ...defaults, hide_new_tweets_alert: false }).data.home.home_timeline_urt.instructions;
assert.equal(keepAlert[0].alertType, 'NewTweets');
assert.equal(keepAlert[1].entries.length, 1);
const keepRecommendations = rewrite('HomeTimeline', home, { ...defaults, block_ads_and_recommendations: false }).data.home.home_timeline_urt.instructions;
assert.equal(keepRecommendations.length, 1);
assert.equal(keepRecommendations[0].entries.length, 7);
for (const [operation, input] of [['TweetDetail', detail], ['UserTweets', profile], ['UserTweetsAndReplies', profile]]) {
    assert.deepEqual(rewrite(operation, input).data.nested.entries.map(item => item.entryId), ['normal']);
    passed++;
}
const header = override.http['header-rewrite'][0];
assert(new RegExp(expand(header).split(' ')[0]).test('https://x.com/home'));
assert(!new RegExp(expand(header, { ...defaults, csp_policy: '^$' }).split(' ')[0]).test('https://x.com/home'));
console.log(`PASS: ${passed + 10} rewrite, parameter-binding and CSP checks`);

// Exercise the pure direction decision used by the injected runtime.
const decisionSource = source.slice(source.indexOf('    function nextScrollState('), source.indexOf('    function notificationBadges('));
const nextScrollState = new Function(`${decisionSource}; return nextScrollState;`)();
const initial = () => ({ lastY: 0, distance: 0, direction: 0, collapsed: false });
let scroll = initial();
for (const y of [100, 104, 107]) scroll = nextScrollState(scroll, y);
assert.equal(scroll.collapsed, true);
for (const y of [105, 102, 98]) scroll = nextScrollState(scroll, y);
assert.equal(scroll.collapsed, false, 'Small upward movements did not accumulate');
scroll = nextScrollState(scroll, 99);
assert.equal(scroll.collapsed, false, 'A small direction reversal changed visibility');
scroll = nextScrollState(scroll, 110);
assert.equal(scroll.collapsed, true);
scroll = nextScrollState(scroll, 7);
assert.equal(scroll.collapsed, false, 'Top threshold must restore navigation');
const previous = { lastY: 500, direction: 1, distance: 20, collapsed: true };
assert.deepEqual(nextScrollState(previous, 500), previous, 'No movement changed the scroll decision');
assert.deepEqual(previous, { lastY: 500, direction: 1, distance: 20, collapsed: true }, 'Decision mutated its input');
console.log('PASS: 7 pure scroll-direction checks');
