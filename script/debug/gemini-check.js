/**
 * Gemini 解锁检测故障验证（临时调试用）
 * 依次请求同域名小响应、对照站点和 Gemini 首页，比较成功与否及响应头大小
 */
const targets = [
    'https://gemini.google.com/robots.txt',
    'https://gemini.google.com/_/BardChatUi/manifest.json',
    'https://www.google.com/',
    'https://gemini.google.com/',
]

function fetch(url) {
    const start = Date.now()
    return new Promise(resolve => {
        $httpClient.get({ url }, (error, response, data) => {
            const headers = (response && response.headers) || {}
            let headerBytes = 0
            for (const k in headers) headerBytes += k.length + String(headers[k]).length + 4
            resolve({
                url,
                ok: !error,
                error: error ? String(error) : null,
                status: response ? response.status || response.statusCode : null,
                headerCount: Object.keys(headers).length,
                headerBytes,
                bodyLength: typeof data === 'string' ? data.length : null,
                ms: Date.now() - start,
            })
        })
    })
}

try {
    const results = []
    for (const url of targets) {
        const r = await fetch(url)
        console.log(JSON.stringify(r))
        results.push(r)
    }
    const summary = results
        .map(r => {
            const name = r.url.replace('https://', '')
            return r.ok
                ? `✅ ${name} ${r.status} hdr=${r.headerBytes}B body=${r.bodyLength} ${r.ms}ms`
                : `❌ ${name} ${r.error} ${r.ms}ms`
        })
        .join('\n')
    console.log(summary)
    $done({ title: 'Gemini 验证', content: summary })
} catch (e) {
    console.log(`[Error] ${e && e.message ? e.message : JSON.stringify(e)}`)
    $done({ title: 'Gemini 验证', content: `脚本异常: ${e && e.message ? e.message : e}` })
}
