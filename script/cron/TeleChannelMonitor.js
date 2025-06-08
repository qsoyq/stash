/** @namespace telegram.channel.monitor.*/

/**
 * @typedef {Object} telegram.channel.monitor.HTTPResponse
 * @property {string|null} error - 错误信息，如果没有错误则为 null
 * @property {object} response - HTTP 响应对象
 * @property {string|null} data - 返回的数据，如果没有数据则为 null
 */

/**
 * @typedef {function(Error|string|null, Object, string|null): void} telegram.channel.monitor.HTTPCallback
 * 回调函数类型，接受错误、响应和数据作为参数。
 * @param {Error|string|null} error - 错误信息，可以是 Error 对象、字符串或者 null
 * @param {Object} response - HTTP 响应对象
 * @param {string|null} data - 返回的数据，可以是字符串或者 null
 */

/**
 * @typedef {function(Object, telegram.channel.monitor.HTTPCallback): telegram.channel.monitor.HTTPResponse} telegram.channel.monitor.HTTPMethod
 */

/**
 * @typedef {Object} telegram.channel.monitor.HttpClient
 * @property {telegram.channel.monitor.HTTPMethod} get - 发送 GET 请求
 * @property {telegram.channel.monitor.HTTPMethod} post - 发送 POST 请求
 * @property {telegram.channel.monitor.HTTPMethod} put - 发送 PUT 请求
 * @property {telegram.channel.monitor.HTTPMethod} delete - 发送 DELETE 请求
 */

/** @type {telegram.channel.monitor.HttpClient} */
var $httpClient;

var $request, $response, $notification, $argument, $persistentStore, $script

/** @type {function(Object):void} */
var $done

/**
 * 对异步回调的 HTTP 调用包装成 async 函数
 * @param {'GET'|'POST'|'PUT'|'DELETE'} method - HTTP 方法类型，支持 GET、POST、PUT 和 DELETE
 * @param {Object} params - 请求参数对象，包含请求所需的各类信息
 * @returns {Promise<telegram.channel.monitor.HTTPResponse>} 返回一个 Promise，解析为包含 error、response 和 data 的对象
 * @throws {Error} 如果请求失败，Promise 会被拒绝并返回错误信息
 */
async function request(method, params) {
    return new Promise((resolve, reject) => {
        /** @type {telegram.channel.monitor.HTTPMethod} */
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
 * @returns {Promise<telegram.channel.monitor.HTTPResponse>}
 */
async function get(params) {
    return request('GET', params);
}

/**
 * 请求封装
 * @param {object} params
 * @returns {Promise<telegram.channel.monitor.HTTPResponse>}
 */
async function post(params) {
    return request('POST', params);
}

/**
 * 请求封装
 * @param {object} params
 * @returns {Promise<telegram.channel.monitor.HTTPResponse>}
 */
async function put(params) {
    return request('PUT', params);
}

/**
 * 请求封装
 * @param {object} params
 * @returns {Promise<telegram.channel.monitor.HTTPResponse>}
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
 * 
 * @param {Document} document 
 * @returns 
 */
function parseMessages(channel, document) {
    let resp = []
    let headImg = document.querySelector("body > header > div > div.tgme_header_info > a.tgme_header_link > i > img")?.attributes?.getNamedItem("src")?.textContent
    let channelName = document.querySelector("body > header > div > div.tgme_header_info > a.tgme_header_link > div.tgme_header_title_wrap > div.tgme_header_title > span")?.textContent
    let li = document.querySelectorAll("body > main > div > section > div .tgme_widget_message")
    li.forEach(ele => {
        let _arr = ele.attributes["data-post"].value.split('/')
        let username = _arr[0]
        let msgid = _arr[1]
        let title
        let text
        let textTag = ele.querySelector(".js-message_text")
        if (textTag) {
            if (ele.querySelector(".js-message_text>b")) {
                // @ts-ignore
                title = ele.querySelector(".js-message_text>b")?.outerText || ""
            } else {

            }
            if (ele.querySelector(".js-message_text")) {
                // @ts-ignore
                text = ele.querySelector(".js-message_text")?.outerText || ""
                if (!title && text) {
                    title = text.split('\n')[0]
                }
            }
        } else {
            title = "Please open Telegram to view this post"
        }
        console.log(msgid, textTag, title)
        resp.push({ head: headImg, channelName, username, msgid, title, text, channel })
    })
    return resp
}

/**
 * 请求频道消息网页，解析并返回响应的消息组
 * @param {number} channel 
 * @returns 
 */
async function getChannelMessages(channel) {
    echo(`正在访问频道: ${channel}`)
    let onceMaxSize = Number(getScriptArgument("onceMaxSize") || 10)
    let url = `https://t.me/s/${channel}`
    let lastMessageID = Number(getPersistentArgument(`TelegramLastMessageId-${channel}`) || 0)
    if (lastMessageID) {
        lastMessageID = Number(lastMessageID)
        url += `?after=${lastMessageID}`
    }
    let totalChannelMessages = []
    while (true) {
        try {
            echo(`channel url: ${url}`)
            let res = await get(url)
            if (res.error || res.response.status >= 400) {
                echo(`[Error] getChannelMessages: ${res.error}, ${res.response.status}, ${res.data}`)
                throw `[Error] getChannelMessages: ${res.error}, ${res.response.status}, ${res.data}`
            }
            if (res.data) {
                let document = new DOMParser().parseFromString(res.data, 'text/html');
                let channelMessages = parseMessages(channel, document).filter(element => !lastMessageID || element.msgid > lastMessageID)
                totalChannelMessages = totalChannelMessages.concat(channelMessages)
                if (channelMessages.length < 20) {
                    break
                }
                if (totalChannelMessages.length >= onceMaxSize) {
                    break
                }
                url = `https://t.me/s/${channel}`
                lastMessageID = channelMessages.at(-1).msgid
                url += `?after=${lastMessageID}`
            }
        } catch (error) {
            echo(`Error fetching data for channel ${channel}:`, error)
        }
    }
    totalChannelMessages = totalChannelMessages.slice(0, onceMaxSize)
    echo(`get channel ${channel} message count: ${totalChannelMessages.length}`)
    return totalChannelMessages
}

/**
 * 
 * @param {array} groupMessages 
 * @returns 
 */
function makePushMessages(groupMessages) {
    echo(`make push messages`)
    let barkToken = getScriptArgument("barkToken")
    let barkGroup = getScriptArgument("barkGroup") || "Telegram"
    let level = getScriptArgument("level") || "passive"
    let icon = getScriptArgument("icon")
    /** @type {string[]} */
    let activeKeywords = getScriptArgument("activeKeywords") || []
    let messages = []
    for (const group of groupMessages) {
        for (const message of group) {
            let url = `tg://resolve?domain=${message.username}&post=${message.msgid}&single`
            if (activeKeywords) {
                activeKeywords.forEach(element => {
                    if (typeof message.text === 'string' && message.text.includes(element)) {
                        level = 'critical'
                    }
                })
            }
            let payload = {
                device_key: barkToken,
                title: message.channelName,
                body: `${message.text}`.slice(0, 1024), // bark-server 或 APNs 的限制，限制在 1600 个左右的字符
                group: barkGroup,
                level: level,
                icon: icon || message.head,
                url: url
            }
            messages.push({ bark: payload })
        }
    }
    let blockKeywords = getScriptArgument("blockKeywords") || []
    messages = messages.filter(message => {
        if (blockKeywords) {
            for (const keyword of blockKeywords) {
                if (message.bark.body.includes(keyword)) {
                    return false
                }
            }
        }
        return true
    })

    return messages
}

async function main() {
    // 遍历频道
    /** @type {number[]} */
    let channels = mustGetScriptArgument("channels")
    if (typeof channels !== 'object') {
        throw `invalid channles: ${channels}`
    }

    let groupMessages = []
    // 使用 Promise.all 并行获取所有频道的消息
    try {
        groupMessages = await Promise.all(
            channels.map(async channel => await getChannelMessages(channel))
        );
    } catch (error) {
        throw `get channel messages error: ${error}`
    }

    if (!groupMessages) {
        throw `invali groupMessages: ${groupMessages}`
    }
    for (const group of groupMessages) {
        if (group.length === 0) {
            continue
        }
        let messages = makePushMessages([group])
        if (messages) {
            echo(messages)
        }
        for (const message of messages) {
            let body = JSON.stringify({ messages: [message] }, null, 4)
            let res = await post({ url: 'https://p.19940731.xyz/api/notifications/push/v3', headers: { 'Content-Type': "application/json" }, body: body })
            if (res.error || res.response.status >= 400) {
                echo(`[Error] push messages error: ${res.error}, ${res.response.status}, ${res.data}, \n${body}`)
                throw `[Error] push messages error: ${res.error}, ${res.response.status}, ${res.data}, \n${body}`
            }
        }

        // 写入本地持久化    
        echo(`write local persistent`)
        let lastMessage = group.at(-1)
        echo(`更新 ${lastMessage.channel} 缓存成功. msgid: ${lastMessage.msgid}`)
        writePersistentArgument(`TelegramLastMessageId-${lastMessage.channel}`, lastMessage.msgid)
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
