/** @namespace thread.nga */

/**
 * @typedef {Object} thread.nga.HTTPResponse
 * @property {string|null} error - 错误信息，如果没有错误则为 null
 * @property {object} response - HTTP 响应对象
 * @property {string|null} data - 返回的数据，如果没有数据则为 null
 */

/**
 * @typedef {function(Error|string|null, Object, string|null): void} thread.nga.HTTPCallback
 * 回调函数类型，接受错误、响应和数据作为参数。
 * @param {Error|string|null} error - 错误信息，可以是 Error 对象、字符串或者 null
 * @param {Object} response - HTTP 响应对象
 * @param {string|null} data - 返回的数据，可以是字符串或者 null
 */

/**
 * @typedef {function(Object, thread.nga.HTTPCallback): thread.nga.HTTPResponse} thread.nga.HTTPMethod
 */

/**
 * @typedef {Object} thread.nga.HttpClient
 * @property {thread.nga.HTTPMethod} get - 发送 GET 请求
 * @property {thread.nga.HTTPMethod} post - 发送 POST 请求
 * @property {thread.nga.HTTPMethod} put - 发送 PUT 请求
 * @property {thread.nga.HTTPMethod} delete - 发送 DELETE 请求
 */

/** @type {thread.nga.HttpClient} */
var $httpClient;

var $request, $response, $notification, $argument, $persistentStore, $script

/** @type {function(Object):void} */
var $done

/**
 * 对异步回调的 HTTP 调用包装成 async 函数
 * @param {'GET'|'POST'|'PUT'|'DELETE'} method - HTTP 方法类型，支持 GET、POST、PUT 和 DELETE
 * @param {Object} params - 请求参数对象，包含请求所需的各类信息
 * @returns {Promise<thread.nga.HTTPResponse>} 返回一个 Promise，解析为包含 error、response 和 data 的对象
 * @throws {Error} 如果请求失败，Promise 会被拒绝并返回错误信息
 */
async function request(method, params) {
    return new Promise((resolve, reject) => {
        /** @type {thread.nga.HTTPMethod} */
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
 * @returns {Promise<thread.nga.HTTPResponse>}
 */
async function get(params) {
    return request('GET', params);
}

/**
 * 请求封装
 * @param {object} params
 * @returns {Promise<thread.nga.HTTPResponse>}
 */
async function post(params) {
    return request('POST', params);
}

/**
 * 请求封装
 * @param {object} params
 * @returns {Promise<thread.nga.HTTPResponse>}
 */
async function put(params) {
    return request('PUT', params);
}

/**
 * 请求封装
 * @param {object} params
 * @returns {Promise<thread.nga.HTTPResponse>}
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

/**
 * @param {{ [x: string]: any; tid: any; subject: any; ios_app_scheme_url: string | number | boolean; postdateStr: any; lastpostStr: any; url: any; }} thread
 */
async function push(thread) {
    let force = getScriptArgument("force")
    let debug = getScriptArgument('debug')
    let telegram = getScriptArgument("telegram")
    let APNs = getScriptArgument('APNs')

    let keyname = `nga-threads-${thread.tid}`
    let cache = getPersistentArgument(keyname)

    if (debug) {
        echo(`[Cache] 读取缓存成功， title: ${thread.subject}, ${cache}`)
    }

    if (cache && !force) {
        echo(`[Cache] skip, title: ${thread.subject}`)
        return
    }

    let messages = []

    if (telegram) {
        let redirectUrl = `https://p.19940731.xyz/api/network/url/redirect?url=${encodeURIComponent(thread.ios_app_scheme_url)}`
        let title = telegramEscapeMarkdownV2(`NGA ${thread["fname"]} 有新帖子`)
        let subject = telegramEscapeMarkdownV2(thread.subject)
        title = `${title}\n[${subject}](${thread.url})\n\n[跳转到 App](${redirectUrl})`
        let content = telegramEscapeMarkdownV2(`创建时间:${thread.postdateStr}\n回复时间:${thread.lastpostStr}`)
        let payload = {
            bot_id: telegram.bot_id,
            chat_id: telegram.chat_id,
            message: {
                text: `${title}\n\n${content}`,
                parse_mode: "MarkdownV2"
            }
        }
        messages.push({ telegram: payload })
    }

    if (APNs) {
        let group = APNs?.group || "nga-threads"
        let payload = {
            "group": group,
            "url": thread.url,
            "device_token": APNs.device_token,
            "aps": {
                "alert": {
                    "title": `NGA ${thread["fname"]} 有新帖子`,
                    "body": `${thread.subject}`
                },
                "thread-id": group
            }
        }
        if (thread.icon.startsWith("http")) {
            payload.icon = thread.icon
        }
        messages.push({ apple: payload })
    }

    if (messages) {
        let url = 'https://p.19940731.xyz/api/notifications/push/v3'
        let res = await post({ url: url, body: JSON.stringify({ messages: messages }), headers: { "content-type": "application/json" } })
        if (debug) {
            echo(`[Request] push body: ${JSON.stringify({ messages: messages })}`)
            echo(`[Response] push body: ${res.data}`)
        }
        if (res.error || res.response.status >= 400) {
            throw `[Push] notifications error: ${res.data}`
        }
    }


    writePersistentArgument(keyname, keyname)
    if (debug) {
        echo(`[Cache] 写入缓存成功， title: ${thread.subject}, ${keyname}`)
    }


}

async function main() {
    let fidList = getScriptArgument("fidList") || []
    let uid = getScriptArgument("uid") || ""
    let cid = getScriptArgument("cid") || ""
    let debug = getScriptArgument("debug") || false
    let onceMax = getScriptArgument("onceMax")
    let from = getScriptArgument("from") || 1
    let to = getScriptArgument("to") || 1
    for (const page of generateArray(from, to)) {
        let querystringArray = Array.from(fidList.map((/** @type {any} */ fid) => {
            return `fid=${fid}`
        }))
        querystringArray.push(`order_by=lastpostdesc`)
        querystringArray.push(`page=${page}`)
        let qs = querystringArray.join("&")
        if (debug) {
            echo(`[Request] threads querystringArray: ${qs}`)
        }
        let url = `https://p.19940731.xyz/api/nga/threads/v2?${qs}`
        let res = await get({ url: url, headers: { "content-type": "application/json", "uid": uid, "cid": cid } })
        if (res.error || res.response.status >= 400) {
            throw `request nga threads error: ${res.data}`
        }
        let body = parseJsonBody(res.data)
        if (debug) {
            echo(`[Response] threads response body: ${res.data}`)
        }
        for (const item of body.data) {
            /** @type {any[]} */
            let threads = item?.threads || []
            if (onceMax) {
                threads = threads.slice(0, onceMax)
            }
            threads = threads.filter((ele) => {
                // 帖子发布或回复时间超过限制
                return ele.postdate
            })
            for (const thread of threads) {
                await push(thread)
            }
        }
    }
}



(async () => {
    main().then(_ => {
        $done({})
    }).catch(error => {
        if (typeof error === 'object') {
            error = JSON.stringify(error)
        }
        echo(`[Error]: ${error?.message || error}`)
        $done({})
    })
})();
