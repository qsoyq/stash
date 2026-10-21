/** @namespace v2ex */

/**
 * @typedef {Object} v2ex.HTTPResponse
 * @property {string|null} error - 错误信息，如果没有错误则为 null
 * @property {object} response - HTTP 响应对象
 * @property {string|null} data - 返回的数据，如果没有数据则为 null
 */

/**
 * @typedef {function(Error|string|null, Object, string|null): void} v2ex.HTTPCallback
 * 回调函数类型，接受错误、响应和数据作为参数。
 * @param {Error|string|null} error - 错误信息，可以是 Error 对象、字符串或者 null
 * @param {Object} response - HTTP 响应对象
 * @param {string|null} data - 返回的数据，可以是字符串或者 null
 */

/**
 * @typedef {function(Object, v2ex.HTTPCallback): v2ex.HTTPResponse} v2ex.HTTPMethod
 */

/**
 * @typedef {Object} v2ex.HttpClient
 * @property {v2ex.HTTPMethod} get - 发送 GET 请求
 * @property {v2ex.HTTPMethod} post - 发送 POST 请求
 * @property {v2ex.HTTPMethod} put - 发送 PUT 请求
 * @property {v2ex.HTTPMethod} delete - 发送 DELETE 请求
 */

/**
 * 对异步回调的 HTTP 调用包装成 async 函数
 * @param {'GET'|'POST'|'PUT'|'DELETE'} method - HTTP 方法类型，支持 GET、POST、PUT 和 DELETE
 * @param {Object} params - 请求参数对象，包含请求所需的各类信息
 * @returns {Promise<v2ex.HTTPResponse>} 返回一个 Promise，解析为包含 error、response 和 data 的对象
 * @throws {Error} 如果请求失败，Promise 会被拒绝并返回错误信息
 */
async function request(method, params) {
    return new Promise((resolve, reject) => {
        /** @type {v2ex.HTTPMethod} */
        const httpMethod = $httpClient[method.toLowerCase()]; // 通过 HTTP 方法选择对应的请求函数
        httpMethod(params, (error, response, data) => {
            if (error) {
                echo(`[Request] Error: ${error}, Response: ${JSON.stringify(response)}, Data: ${data}`);
                reject({ error, response, data }); // 请求失败，拒绝 Promise
            } else {
                resolve({ error, response, data }); // 请求成功，解析 Promise
            }
        });
    });
}

/**
 * 请求封装
 * @param {object} params
 * @returns {Promise<v2ex.HTTPResponse>}
 */
async function get(params) {
    return request('GET', params);
}

/**
 * 请求封装
 * @param {object} params
 * @returns {Promise<v2ex.HTTPResponse>}
 */
async function post(params) {
    return request('POST', params);
}

/**
 * 请求封装
 * @param {object} params
 * @returns {Promise<v2ex.HTTPResponse>}
 */
async function put(params) {
    return request('PUT', params);
}

/**
 * 请求封装
 * @param {object} params
 * @returns {Promise<v2ex.HTTPResponse>}
 */
async function delete_(params) {
    return request('DELETE', params);
}

/**
 * 解析 cookies 字符串并返回对象
 * @param {string} cookie
 * @returns {object|null} 当返回为 null 表示解析失败
 */
function parseCookie(cookie) {
    if (typeof (cookie) !== "string") {
        echo(`illegally cookie: ${cookie}`)
        return null
    }
    let body = {}
    cookie.split(";").forEach(element => {
        if (element) {
            // let arr = element.trim().split("=")
            element = element.trim()
            let index = element.indexOf("=")
            if (index === -1) {
                echo(`illegally cookie field: ${element}`)
                return null
            } else {
                let key = element.substring(0, index)
                let value = element.substring(index + 1)
                body[key] = value
            }
        }
    })
    return body
}
/**
 * 读取 stash 内部持久化存储的值
 * @param {string} key
 */
function read(key) {
    $persistentStore.read(key)
}

/**
 * 更新 stash 内部持久化的值
 * @param {string} key
 * @param {string} val
 */
function writePersistentArgument(key, val) {
    $persistentStore.write(val, key)
}

/**
 *  基于持久化读取 Cookie
 * @param {string} key
 * @returns {string}
 */
function getCookie(key) {
    return $persistentStore.read(`Cookie.${key}`)
}

/**
 * 基于持久化写入 Cookie
 * @param {string} key
 * @param {string} val
 * @returns
 */
function setCookie(key, val) {
    return $persistentStore.write(val, `Cookie.${key}`)
}
/**
 * 发送 stash 通知
 * @param {string} title
 * @param {string} subtitle
 * @param {string} content
 * @param {string|undefined} [url]
 */
function notificationPost(title, subtitle, content, url) {
    const params = url ? { url } : {};
    $notification.post(title, subtitle, content, params)
}

/**
 * 判断当前请求是否来自微信
 * @returns {Boolean}
 */
function isWechat() {
    if (typeof $request === 'undefined') {
        return false
    }
    let ua = $request.headers["User-Agent"].toLowerCase()
    return /micromessenger/.test(ua);
}

/**
 * 返回指定数量的随机字符
 * @param {number} num
 * @returns {string}
 */
function randomChar(num) {
    const min = 65; // 'A' 的 ASCII 码
    const max = 90; // 'Z' 的 ASCII 码

    return Array.from({ length: num }, () =>
        String.fromCharCode(Math.floor(Math.random() * (max - min + 1)) + min)
    ).join('');
}

/**
 * 将指定日期对象转为相应的日期时间字符串
 * 默认为当前日期时间
 * @param {Date|null} [date=null]
 * @returns {string} 表示当前时间的字符串
 */
function getLocalDateString(date = null) {
    if (!date) {
        date = new Date()
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // 月份从0开始，所以加1
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}.${month}.${day} ${hours}:${minutes}:${seconds}`;
}


/**
 * 遍历并输出对象字面值
 * @param {object} body
 * @param {string|undefined} prefix
 */
function visitAll(body, prefix = "", visited = new WeakSet()) {
    if (typeof body !== 'object' || body === null) {
        echo(`Key: ${prefix}, Value: ${body}, Type: ${typeof body}`);
        return;
    }

    if (visited.has(body)) {
        echo(`Key: ${prefix}, [Circular Reference Detected]`);
        return;
    }

    visited.add(body);

    for (const [key, value] of Object.entries(body)) {
        const currentPrefix = prefix ? `${prefix}.${key}` : key;
        if (typeof value === 'object' && value !== null) {
            visitAll(value, currentPrefix, visited);
        } else {
            echo(`Key: ${currentPrefix}, Value: ${value}, Type: ${typeof value}`);
        }
    }
}
/**
 * 解析 json 字符串， 失败返回 null
 * @param {*} string
 * @returns
 */
function parseJsonBody(string) {
    try {
        return JSON.parse(string)
    } catch (e) {
        echo(`[Warn] invalid json: ${e}, json: ${string}`)
        return null
    }
}

/**
 * 读取脚本参数
 * @param {string} key
 * @returns {any|undefined|null}
 */
function getScriptArgument(key) {
    if (typeof $argument === "undefined") {
        return;
    }

    let body = parseJsonBody($argument)
    if (!body) {
        echo(`[Warn] Invalid JSON: ${$argument}`);
        return null; // JSON 解析失败返回 null
    }
    return body[key]
}

/**
 * 从环境中读取参数， 且参数不可为空，否则抛出异常
 * @param {string} key
 * @returns {any}
 * @throws {Error} 如果找不到对应的参数值，或参数值为 `null` 或 `undefined`，则抛出一个包含错误信息的异常。*
 */
function mustGetScriptArgument(key) {
    let val = getScriptArgument(key)
    if (val === null || val === undefined) {
        echo(`can't find value for ${key}`)
        throw `can't find value for ${key}`
    }
    return val
}

/**
 * 读取本地持久化参数
 * @param {string} key
 * @returns {string}
 */
function getPersistentArgument(key) {
    return $persistentStore.read(key);
}

/**
 * 返回当前的脚本类型
* @returns {'request' | 'response' | 'tile' | 'cron' | 'undefined'}
 */
function getScriptType() {
    return typeof $script !== 'undefined' ? $script.type : 'undefined'
}

/**
 *
 * @param {string} countryCode
 * @returns
 */
function countryCodeToEmoji(countryCode) {
    // 将代码转为大写
    countryCode = countryCode.toUpperCase();

    // 如果是三位代码，转换为两位代码
    const threeToTwo = {
        'USA': 'US',
        'CAN': 'CA',
        'GBR': 'GB',
        'FRA': 'FR',
        'DEU': 'DE',
        // 继续添加你需要支持的三位代码
    };

    // 如果代码长度为3，尝试查找转换表
    if (countryCode.length === 3) {
        countryCode = threeToTwo[countryCode] || countryCode.slice(0, 2);
    }

    // 将两位代码转换为相应的Unicode字符
    const codePoints = [...countryCode].map(char => 127397 + char.charCodeAt(0));

    // 将Unicode字符转换为emoji
    return String.fromCodePoint(...codePoints);
}
/**
 * 返回从 from 到 to 递增或递减的数组，步长为 1
 * @param {number} from
 * @param {number} to
 * @returns
 */
function generateArray(from, to) {
    const start = Math.min(from, to);
    const end = Math.max(from, to);

    // 如果 from 大于 to，生成逆序数组
    if (from > to) {
        return Array.from({ length: end - start + 1 }, (_, i) => end - i);
    } else {
        // 否则生成顺序数组
        return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    }
}

/**
 * 解析响应脚本参数
 * @returns {string | undefined}
 */
function getScriptResponseBody() {
    let body = (typeof $response.body === 'object') ? (new TextDecoder('utf-8')).decode(new Uint8Array($response.body)) : $response.body;
    return body
}

/**
 *  处理 telegram.sendMessage MarkdownV2 格式消息体转义
 * @param {string} text
 * @returns
 */
function telegramEscapeMarkdownV2(text) {
    const escapeChars = [
        { char: '_', replacement: '\\_' },
        { char: '*', replacement: '\\*' },
        { char: '[', replacement: '\\[' },
        { char: ']', replacement: '\\]' },
        { char: '(', replacement: '\\(' },
        { char: ')', replacement: '\\)' },
        { char: '~', replacement: '\\~' },
        { char: '>', replacement: '\\>' },
        { char: '#', replacement: '\\#' },
        { char: '+', replacement: '\\+' },
        { char: '-', replacement: '\\-' },
        { char: '=', replacement: '\\=' },
        { char: '|', replacement: '\\|' },
        { char: '{', replacement: '\\{' },
        { char: '}', replacement: '\\}' },
        { char: '.', replacement: '\\.' },
        { char: '!', replacement: '\\!' },
        { char: '`', replacement: '\\`' }
    ];

    let escapedText = text;

    escapeChars.forEach(({ char, replacement }) => {
        const regex = new RegExp(`\\${char}`, 'g');
        escapedText = escapedText.replace(regex, replacement);
    });

    return escapedText;
}

/** 获取当前 URL 中的参数
 * @param {any} key
 */
function getUrlArgument(key) {
    const url = new URL(window.location.href);
    const params = new URLSearchParams(url.search);
    return params.get(key) || null
}

/**
 * 生成推送消息格式
 * https://p.19940731.xyz/redoc#tag/notifications.push/operation/push_v3_api_notifications_push_v3_post
 * @param {*} title
 * @param {*} body
 * @param {*} url
 * @param {*} group
 * @param {*} icon
 * @param {*} level
 * @returns
 */
function makePushMessage(title, body, url = null, group = null, icon = null, level = null) {
    let payload = {}

    let APNs = getScriptArgument("APNs")
    let bark = getScriptArgument("bark")
    group = getScriptArgument("group") || group || "Default"
    level = getScriptArgument("level") || level || "passive"
    icon = icon || getScriptArgument("icon")
    if (APNs) {
        payload.apple = {
            group: group,
            url: url,
            icon: icon,
            device_token: APNs.device_token,
            aps: {
                "thread-id": group,
                "interruption-level": level,
                alert: {
                    title: title,
                    body: body
                }
            }
        }
    }
    if (bark) {
        payload.bark = {
            device_key: bark.device_key,
            title: title,
            body: body,
            level: level,
            icon: icon,
            group: group,
            url: url,
            endpoint: bark?.endpoint || "https://api.day.app/push"

        }
    }
    return payload
}

/**
 * 推送消息
 * https://p.19940731.xyz/redoc#tag/notifications.push/operation/push_v3_api_notifications_push_v3_post
 * @param {*} message
 * @returns
 */
async function pushMessage(message) {
    let url = 'https://p.19940731.xyz/api/notifications/push/v3'
    let res = await post({ url, body: JSON.stringify({ messages: [message] }), headers: { "content-type": "application/json" } })
    let now = getLocalDateString()
    if (res.error || res.response.status >= 400) {
        throw `${now} [Error] push messages error: ${res.error}, ${res.response.status}, ${res.data}`
    }
    return res
}

/**
 * @param {...any} args - Arguments to log
 */
function echo(...args) {
    let date = getLocalDateString()
    let logMessage = `${args.join(' ')}`
    logMessage = `[${date}] ${logMessage}`
    console.log(logMessage)
}

/**
 * 在指定作用域中执行代码
 * @param {*} code 执行代码
 * @param {*} context 上下文作用域
 * @returns
 */
function safeEval(code, context) {
    const func = new Function(...Object.keys(context), code);
    return func(...Object.values(context));
}

function parseDocument(body) {
    let domParser = new DOMParser();
    return domParser.parseFromString(body, 'text/html');
}

function addScript(document, url) {
    let script = document.createElement('script');
    script.src = url
    document.head.appendChild(script)
}

function addCSS(document) {

}



function runtimeCode() {

}

function addRuntimeCode(document) {
    let code = `
    ${runtimeCode.toString()};
    runtimeCode();
    `
    let script = document.createElement('script');
    script.textContent = code
    document['body'].appendChild(script);
}

/**
 * 跨桌面/移动两种登录页布局定位用户名输入框:
 * 1. 桌面版有 placeholder="Username or Email"
 * 2. 移动版 input 无 placeholder, 靠同行 <td>用户名</td> 当 label
 * @param {Document} document
 * @returns {Element|null}
 */
function findV2exUsernameInput(document) {
    let input = document.querySelector('input[placeholder="Username or Email"]')
    if (input) return input

    input = document.querySelector('input[placeholder*="用户名"]')
    if (input) return input

    const rows = document.querySelectorAll('tr')
    for (const tr of rows) {
        const tds = tr.querySelectorAll('td')
        if (tds.length < 2) continue
        const label = (tds[0].textContent || '').trim()
        if (label === '用户名' || /^(username|email)/i.test(label)) {
            const candidate = tds[1].querySelector('input[type="text"]')
            if (candidate) return candidate
        }
    }
    return null
}

/**
 * 把 V2EX 登录页用户名输入框改成 Safari AutoFill 可识别的形式。
 * 原始 name 是随机 hash（反爬），改名会让表单提交失败,
 * 因此插入一个 hidden 字段承载原始 name,并在 submit 时镜像值过去。
 * @param {Document} document
 * @returns {boolean} 是否做了改动
 */
function patchV2exUsernameInput(document) {
    const input = findV2exUsernameInput(document)
    if (!input) {
        return false
    }
    const originalName = input.getAttribute('name')
    if (!originalName || originalName === 'username') {
        return false
    }

    input.setAttribute('name', 'username')
    input.setAttribute('autocomplete', 'username')
    input.setAttribute('data-original-name', originalName)

    const hidden = document.createElement('input')
    hidden.setAttribute('type', 'hidden')
    hidden.setAttribute('name', originalName)
    hidden.setAttribute('id', '__v2ex_username_mirror')
    if (input.parentNode) {
        input.parentNode.insertBefore(hidden, input.nextSibling)
    }

    const script = document.createElement('script')
    script.textContent = `
        (function () {
            var real = document.querySelector('input[name="username"][data-original-name]');
            var mirror = document.getElementById('__v2ex_username_mirror');
            if (!real || !mirror) return;
            var sync = function () { mirror.value = real.value; };
            real.addEventListener('input', sync);
            real.addEventListener('change', sync);
            var form = real.closest('form');
            if (form) form.addEventListener('submit', sync, true);
            sync();
        })();
    `
    document.body.appendChild(script)

    echo(`[v2ex] patched username input, original name: ${originalName}`)
    return true
}

function getV2exOptions() {
    const options = { safari_autofill: true, auto_checkin: false }
    try {
        const supplied = JSON.parse(typeof $argument === 'undefined' || !$argument ? '{}' : $argument)
        if (!supplied || typeof supplied !== 'object' || Array.isArray(supplied)) return options
        for (const key of Object.keys(options)) {
            if (typeof supplied[key] === 'boolean') options[key] = supplied[key]
        }
    } catch (error) {
        console.log('[V2EX] 参数无效，使用默认设置')
    }
    return options
}

/** 在浏览器执行，使用同源登录会话；只解析领取地址，不执行网页的 onclick。 */
async function v2exAutoCheckinCode() {
    const log = (...args) => console.log('[V2EX 自动签到]', ...args)
    const origin = window.location.origin
    const account = (doc) => doc.querySelector('#Top a[href^="/member/"]')?.getAttribute('href')
    const user = account(document)
    if (!user) return
    // 每个账号独立节流；完成标记采用服务器提供的日期，不推断站点时区。
    const prefix = `v2ex_auto_checkin:${user}:`
    const read = (key) => {
        try { return localStorage.getItem(prefix + key) } catch (error) { return null }
    }
    const write = (key, value) => {
        try { localStorage.setItem(prefix + key, value) } catch (error) { }
    }

    function inspect(doc) {
        const main = doc.querySelector('#Main')
        const marker = Array.from(main?.querySelectorAll('code') || [])
            .map(node => node.textContent.trim())
            .find(text => /^v2ex:member:\d+:\d{8}$/.test(text))
        let redeem = null
        for (const node of main?.querySelectorAll('input[onclick],button[onclick],a[href]') || []) {
            const onclick = node.getAttribute('onclick') || ''
            const match = onclick.match(/^\s*location(?:\.href)?\s*=\s*(['"])(\/mission\/daily\/redeem\?once=\d+)\1\s*;?\s*$/)
            const path = match ? match[2] : node.getAttribute('href')
            if (path && /^\/mission\/daily\/redeem\?once=\d+$/.test(path)) {
                redeem = path
                break
            }
        }
        const text = main?.textContent || ''
        const done = /每日登录奖励已领取|每日登入獎勵已領取|Daily (?:login )?reward (?:has been|already) (?:redeemed|claimed)|already (?:claimed|redeemed).*daily/i.test(text)
        return { marker, redeem, done }
    }

    async function load(path) {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 15000)
        try {
            const response = await fetch(path, {
                credentials: 'same-origin',
                cache: 'no-store',
                referrer: `${origin}/mission/daily`,
                signal: controller.signal,
            })
            const url = new URL(response.url)
            if (!response.ok || url.origin !== origin || !/^\/mission\/daily(?:\/redeem)?\/?$/.test(url.pathname)
                || !/text\/html/i.test(response.headers.get('content-type') || '')) {
                throw new Error(`签到页面不可用（HTTP ${response.status}）`)
            }
            const doc = new DOMParser().parseFromString(await response.text(), 'text/html')
            if (account(doc) !== user) throw new Error('登录状态已变化，跳过')
            return doc
        } finally {
            clearTimeout(timer)
        }
    }

    async function run() {
        const now = Date.now()
        const last = Number(read('attempt')) || 0
        if (now - last < 5 * 60 * 1000) return
        write('attempt', String(now))
        // 总是读取新页面，避免浏览器历史缓存中的 once 或日期失效。
        const state = inspect(await load('/mission/daily'))
        if (!state.marker) {
            log('无法识别今日签到状态，跳过')
            return
        }
        if (state.done && !state.redeem) {
            write('done', state.marker)
            log('今日已签到')
            return
        }
        // 没有明确的领取按钮就不发起请求，验证页或未知页面不算签到成功。
        if (!state.redeem || read('done') === state.marker) return
        log('今日未签到，领取铜币')
        const result = inspect(await load(state.redeem))
        const confirmed = result.done && !result.redeem ? result : inspect(await load('/mission/daily'))
        if (confirmed.done && !confirmed.redeem && confirmed.marker === state.marker) {
            write('done', state.marker)
            log('签到成功')
            // 签到页刷新显示领取结果；阅读帖子时保持当前位置。
            if (/^\/mission\/daily\/?$/.test(window.location.pathname)) window.location.reload()
        } else {
            log('尚未确认签到成功，稍后访问时重试')
        }
    }

    try {
        if (navigator.locks?.request) {
            await navigator.locks.request(`v2ex_auto_checkin:${user}`, { ifAvailable: true }, async lock => {
                if (lock) await run()
            })
        } else {
            await run()
        }
    } catch (error) {
        log(String(error))
    }
}

async function main() {
    const options = getV2exOptions()
    if (getScriptType() !== 'response' || (!options.safari_autofill && !options.auto_checkin)) return {}
    const url = new URL($request.url)
    if (url.origin !== 'https://v2ex.com' || Number($response.status) !== 200) return {}
    const isSignin = /^\/signin\/?$/.test(url.pathname)
    const isCheckinPage = /^(?:\/|\/t\/[^/]+\/?|\/go\/[^/]+\/?|\/mission\/daily\/?)$/.test(url.pathname)
    if (!(options.safari_autofill && isSignin) && !(options.auto_checkin && isCheckinPage)) return {}
    const ct = Object.entries($response.headers || {}).find(([key]) => key.toLowerCase() === 'content-type')?.[1]
    if (!/text\/html/i.test(ct || '')) return {}
    const body = getScriptResponseBody()
    if (!body) return {}
    const document = new DOMParser().parseFromString(body, 'text/html')
    let patched = options.safari_autofill && isSignin && patchV2exUsernameInput(document)
    if (options.auto_checkin && isCheckinPage && document.querySelector('#Top a[href^="/member/"]')) {
        const script = document.createElement('script')
        script.id = '__v2ex_auto_checkin'
        script.textContent = `(${v2exAutoCheckinCode.toString()})();`
        document.body.appendChild(script)
        patched = true
    }
    return patched ? { body: '<!DOCTYPE html>\n' + document.documentElement.outerHTML } : {}
}

main().then(result => $done(result)).catch(error => {
    console.log(`[V2EX] ${String(error)}`)
    $done({})
});
