/** @namespace x */

/**
 * @typedef {Object} x.HTTPResponse
 * @property {string|null} error - 错误信息，如果没有错误则为 null
 * @property {object} response - HTTP 响应对象
 * @property {string|null} data - 返回的数据，如果没有数据则为 null
 */

/**
 * @typedef {function(Error|string|null, Object, string|null): void} x.HTTPCallback
 * 回调函数类型，接受错误、响应和数据作为参数。
 * @param {Error|string|null} error - 错误信息，可以是 Error 对象、字符串或者 null
 * @param {Object} response - HTTP 响应对象
 * @param {string|null} data - 返回的数据，可以是字符串或者 null
 */

/**
 * @typedef {function(Object, x.HTTPCallback): x.HTTPResponse} x.HTTPMethod
 */

/**
 * @typedef {Object} x.HttpClient
 * @property {x.HTTPMethod} get - 发送 GET 请求
 * @property {x.HTTPMethod} post - 发送 POST 请求
 * @property {x.HTTPMethod} put - 发送 PUT 请求
 * @property {x.HTTPMethod} delete - 发送 DELETE 请求
 */

/**
 * 对异步回调的 HTTP 调用包装成 async 函数
 * @param {'GET'|'POST'|'PUT'|'DELETE'} method - HTTP 方法类型，支持 GET、POST、PUT 和 DELETE
 * @param {Object} params - 请求参数对象，包含请求所需的各类信息
 * @returns {Promise<x.HTTPResponse>} 返回一个 Promise，解析为包含 error、response 和 data 的对象
 * @throws {Error} 如果请求失败，Promise 会被拒绝并返回错误信息
 */
async function request(method, params) {
    return new Promise((resolve, reject) => {
        /** @type {x.HTTPMethod} */
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
 * @returns {Promise<x.HTTPResponse>}
 */
async function get(params) {
    return request('GET', params);
}

/**
 * 请求封装
 * @param {object} params
 * @returns {Promise<x.HTTPResponse>}
 */
async function post(params) {
    return request('POST', params);
}

/**
 * 请求封装
 * @param {object} params
 * @returns {Promise<x.HTTPResponse>}
 */
async function put(params) {
    return request('PUT', params);
}

/**
 * 请求封装
 * @param {object} params
 * @returns {Promise<x.HTTPResponse>}
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
        console.log(`illegally cookie: ${cookie}`)
        return null
    }
    let body = {}
    cookie.split(";").forEach(element => {
        if (element) {
            // let arr = element.trim().split("=")
            element = element.trim()
            let index = element.indexOf("=")
            if (index === -1) {
                console.log(`illegally cookie field: ${element}`)
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
        console.log(`Key: ${prefix}, Value: ${body}, Type: ${typeof body}`);
        return;
    }

    if (visited.has(body)) {
        console.log(`Key: ${prefix}, [Circular Reference Detected]`);
        return;
    }

    visited.add(body);

    for (const [key, value] of Object.entries(body)) {
        const currentPrefix = prefix ? `${prefix}.${key}` : key;
        if (typeof value === 'object' && value !== null) {
            visitAll(value, currentPrefix, visited);
        } else {
            console.log(`Key: ${currentPrefix}, Value: ${value}, Type: ${typeof value}`);
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
        console.log(`[Warn] invalid json: ${e}, json: ${string}`)
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
        console.log(`[Warn] Invalid JSON: ${$argument}`);
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
        console.log(`can't find value for ${key}`)
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

function getXOptions() {
    const options = {
        block_ads_and_recommendations: true,
        hide_top_nav: true,
        hide_home_composer: true,
        hide_chat_drawer: true,
        hide_sidebar_trends: true,
        hide_nav_grok: true,
        hide_nav_premium: true,
        hide_nav_verified_orgs: true,
        hide_nav_jobs: true,
        hide_account_menu: true,
        hide_grok_drawer: true,
        hide_floating_post_button: true,
        hide_reply_permissions: true,
        hide_grok_actions: true,
        hide_translate_button: true,
        hide_automated_content: true,
        hide_probable_spam_prompt: true,
        enable_custom_layout: true,
        home_width_vw: 65,
        page_width_vw: 55,
        center_primary_column: true,
        enable_escape_back: true,
        enable_layout_diagnostics: false,
    }
    if (typeof $argument === 'undefined' || !$argument) return options
    let supplied
    try {
        supplied = JSON.parse($argument)
    } catch (_) {
        console.log('[x-ad] 参数不是有效 JSON，使用默认设置')
        return options
    }
    if (!supplied || typeof supplied !== 'object' || Array.isArray(supplied)) return options
    for (const key of Object.keys(options)) {
        if (typeof options[key] === 'boolean' && typeof supplied[key] === 'boolean') {
            options[key] = supplied[key]
        } else if (typeof options[key] === 'number' && Number.isInteger(supplied[key]) && supplied[key] >= 30 && supplied[key] <= 100) {
            options[key] = supplied[key]
        }
    }
    return options
}

function removeAdsCode(options) {
    const hiddenClass = 'x-ad-hidden'
    const sidebarClass = 'x-ad-empty-sidebar'
    const style = document.createElement('style')
    style.id = 'x-ad-blocker-style'
    style.textContent = `
        .${hiddenClass}, .${sidebarClass} { display: none !important; }
        ${options.enable_custom_layout ? `
        @media (min-width: 1000px) {
            div[data-testid='primaryColumn'] {
                width: ${options.page_width_vw}vw !important;
                max-width: 100% !important;
                min-width: 0 !important;
                flex: 0 1 ${options.page_width_vw}vw !important;
            }
            html.x-ad-home-layout div[data-testid='primaryColumn'] {
                width: ${options.home_width_vw}vw !important;
                flex-basis: ${options.home_width_vw}vw !important;
            }
        }` : ''}
    `

    const componentRules = [
        ['hide_chat_drawer', "[data-testid='chat-drawer-main']"],
        ['hide_nav_grok', "header a[aria-label='Grok'], header a[href='/i/grok']"],
        ['hide_nav_premium', "header a[aria-label='Premium'], header a[href='/i/premium_sign_up']"],
        ['hide_nav_verified_orgs', "header a[aria-label='Verified Orgs'], header a[href='/i/verified-orgs-signup']"],
        ['hide_nav_jobs', "header a[aria-label='Jobs'], header a[href='/jobs']"],
        ['hide_account_menu', "header button[aria-label='Account menu'], header [data-testid='SideNav_AccountSwitcher_Button']"],
        ['hide_floating_post_button', "[data-testid='FloatingActionButtonBase']"],
        ['hide_grok_drawer', "[data-testid='GrokDrawer']"],
        ['hide_grok_actions', "button[aria-label='Grok actions']"],
        ['hide_translate_button', "button[aria-label='Translate post']"],
        ['hide_reply_permissions', "[data-testid='tweetReplyRestrictions'], [data-testid='reply-restrictions']"],
        ['hide_sidebar_trends', "[data-testid='sidebarColumn'] [data-testid='trend'], [data-testid='sidebarColumn'] [data-testid='trends']"],
        ['block_ads_and_recommendations', "[data-testid='sidebarColumn'] [data-testid='premium-signup'], [data-testid='sidebarColumn'] [data-testid='super-upsell-UpsellCardRenderProperties']"],
    ].filter(([key]) => options[key])

    function hide(element) {
        if (element) element.classList.add(hiddenClass)
    }

    function hasVisibleContent(element) {
        if (element.classList.contains(hiddenClass)) return false
        const computed = window.getComputedStyle(element)
        if (computed.display === 'none' || computed.visibility === 'hidden') return false
        // Inspect leaves rather than the aggregate text of wrappers containing hidden cards.
        const text = Array.from(element.childNodes).some(node => node.nodeType === 3 && node.textContent.trim())
        if (text || element.matches('input, button, img, svg, video, canvas, iframe')) return true
        return Array.from(element.children).some(hasVisibleContent)
    }

    function updateSidebar() {
        const sidebar = document.querySelector("[data-testid='sidebarColumn']")
        if (!sidebar) return null
        sidebar.classList.remove(sidebarClass)
        // Only collapse an empty sidebar when this execution actually hides sidebar components.
        if ((options.block_ads_and_recommendations || options.hide_sidebar_trends) && !hasVisibleContent(sidebar)) {
            sidebar.classList.add(sidebarClass)
        }
        return sidebar
    }

    function centerPrimaryColumn(sidebar) {
        const column = document.querySelector("[data-testid='primaryColumn']")
        if (!column || !options.center_primary_column) return
        column.style.removeProperty('transform')
        if (window.innerWidth < 1000) return
        if (sidebar && window.getComputedStyle(sidebar).display !== 'none') return
        const rect = column.getBoundingClientRect()
        const offset = (window.innerWidth - rect.width) / 2 - rect.left
        column.style.setProperty('transform', `translateX(${offset}px)`, 'important')
    }

    function updatePage() {
        const path = new URL(window.location.href).pathname
        const mobile = window.innerWidth < 1000
        if (options.enable_custom_layout) {
            document.documentElement.classList.toggle('x-ad-home-layout', path.startsWith('/home'))
        }
        if (options.hide_top_nav) {
            const preserveSearch = mobile && path.startsWith('/explore')
            document.querySelectorAll("[data-testid='TopNavBar']").forEach(element => {
                element.classList.toggle(hiddenClass, !preserveSearch)
            })
            // Mobile X renders the visible TopNavBar in a fixed layer and keeps an empty
            // banner in document flow to reserve its height. Collapse only that spacer.
            document.querySelectorAll("header[role='banner']").forEach(header => {
                const hasNavigation = header.querySelector("nav, a, button, input, [data-testid='TopNavBar']") !== null
                const collapse = mobile && !preserveSearch && !hasNavigation && !hasVisibleContent(header)
                header.classList.toggle(hiddenClass, collapse)
            })
        }
        if (options.hide_home_composer && path === '/home') {
            document.querySelectorAll("[data-testid='tweetTextarea_0']").forEach(composer => {
                const container = composer.closest("[data-testid='cellInnerDiv']") || composer.closest("[data-testid='tweetComposer']")
                    || Array.from(document.querySelectorAll("div[role='progressbar'] + div")).find(element => element.contains(composer))
                hide(container)
            })
        }
        componentRules.forEach(([, selector]) => document.querySelectorAll(selector).forEach(hide))

        if (options.block_ads_and_recommendations) {
            document.querySelectorAll("[data-testid='sidebarColumn'] a[href^='/i/premium_sign_up']").forEach(link => {
                hide(link.closest('aside') || link.closest('section') || link)
            })
            document.querySelectorAll("[data-testid='sidebarColumn'] aside").forEach(card => {
                if (card.querySelector("[data-testid='UserCell']")) hide(card)
            })
        }
        if (options.hide_sidebar_trends) {
            document.querySelectorAll("[data-testid='sidebarColumn'] [data-testid='trend']").forEach(trend => {
                // A trend's enclosing section is the trends component, including its heading.
                hide(trend.closest('section') || trend)
            })
        }
        if (options.hide_reply_permissions && /^\/[^/]+\/status\/\d+(?:\/|$)/.test(path)) {
            // Never hide every aria-live region: unrelated status messages use the same attribute.
            document.querySelectorAll('span').forEach(span => {
                if (['Who can reply', '谁可以回复', '誰可以回覆'].includes(span.textContent.trim())) {
                    hide(span.closest("[aria-live='polite']") || span)
                }
            })
        }
        if (options.hide_automated_content || options.hide_probable_spam_prompt) {
            document.querySelectorAll('span').forEach(span => {
                if (options.hide_automated_content && span.textContent.trim() === 'Automated') {
                    hide(span.closest("[data-testid='cellInnerDiv']") || span.closest('article'))
                }
                if (options.hide_probable_spam_prompt && span.textContent.trim() === 'Show probable spam') hide(span)
            })
        }
        centerPrimaryColumn(updateSidebar())
    }

    if (options.enable_escape_back) {
        document.addEventListener('keydown', event => {
            if (event.key !== 'Escape' || event.isComposing || event.repeat) return
            if (!/^\/[^/]+\/status\/\d+(?:\/|$)/.test(new URL(window.location.href).pathname)) return
            if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return
            event.preventDefault()
            event.stopPropagation()
            window.history.back()
        }, true)
    }

    const needsUpdates = Object.keys(options).some(key => key !== 'enable_escape_back' && key !== 'enable_layout_diagnostics' && typeof options[key] === 'boolean' && options[key])
    if (needsUpdates) {
        document.head.appendChild(style)
        updatePage()
        window.addEventListener('resize', updatePage)
        window.setInterval(updatePage, 500)
    }
}

function layoutDiagnosticsCode(options) {
    const hiddenClass = 'x-ad-hidden'
    const diagnosticAttribute = 'data-x-ad-diagnostic'

    function roundRect(rect) {
        return {
            top: Math.round(rect.top), bottom: Math.round(rect.bottom),
            left: Math.round(rect.left), width: Math.round(rect.width), height: Math.round(rect.height),
        }
    }

    function describeElement(element) {
        const style = window.getComputedStyle(element)
        return {
            tag: element.tagName.toLowerCase(),
            testid: element.getAttribute('data-testid'),
            role: element.getAttribute('role'),
            classes: Array.from(element.classList).slice(0, 8),
            rect: roundRect(element.getBoundingClientRect()),
            style: {
                display: style.display, position: style.position, zIndex: style.zIndex,
                overflow: style.overflow, height: style.height, minHeight: style.minHeight,
                paddingTop: style.paddingTop, marginTop: style.marginTop,
                transform: style.transform === 'none' ? null : style.transform, opacity: style.opacity,
            },
            childCount: element.children.length,
            hiddenByScript: element.classList.contains(hiddenClass),
        }
    }

    function ancestorChain(element, limit = 16) {
        const chain = []
        for (let current = element; current && chain.length < limit; current = current.parentElement) {
            chain.push(describeElement(current))
            if (current === document.documentElement) break
        }
        return chain
    }

    function isDiagnosticElement(element) {
        return element.closest(`[${diagnosticAttribute}]`) !== null
    }

    function measureSafeArea() {
        const probe = document.createElement('div')
        probe.setAttribute(diagnosticAttribute, '')
        probe.style.cssText = 'position:fixed;top:0;left:0;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)'
        document.body.appendChild(probe)
        const style = window.getComputedStyle(probe)
        const result = { top: style.paddingTop, bottom: style.paddingBottom }
        probe.remove()
        return result
    }

    function collectLayoutDiagnostics() {
        const maxTop = 360
        const width = window.innerWidth || document.documentElement.clientWidth
        const nav = document.querySelector("[data-testid='TopNavBar']")
        const topElements = Array.from(document.querySelectorAll('body *')).filter(element => {
            if (isDiagnosticElement(element) || element.matches('script, style')) return false
            const rect = element.getBoundingClientRect()
            return rect.bottom > 0 && rect.top < maxTop && rect.height >= 16 && rect.width >= width * 0.5
        }).slice(0, 100).map(element => {
            let depth = 0
            for (let current = element; current.parentElement; current = current.parentElement) depth++
            return { depth, ...describeElement(element) }
        })
        const svgs = Array.from(document.querySelectorAll('svg')).filter(svg => {
            if (isDiagnosticElement(svg)) return false
            const rect = svg.getBoundingClientRect()
            return rect.bottom > 0 && rect.top < maxTop && rect.width > 0 && rect.height > 0
        }).slice(0, 40).map(svg => ({
            svg: describeElement(svg),
            viewBox: svg.getAttribute('viewBox'),
            firstPath: svg.querySelector('path')?.getAttribute('d')?.slice(0, 160) || null,
            ancestors: ancestorChain(svg.parentElement, 8),
        }))
        const probes = Array.from({ length: 19 }, (_, index) => index * 20).map(y => ({
            y,
            stack: document.elementsFromPoint(width / 2, y)
                .filter(element => !isDiagnosticElement(element)).slice(0, 10).map(describeElement),
        }))
        const path = new URL(window.location.href).pathname
        return {
            diagnosticVersion: 1,
            timestamp: new Date().toISOString(),
            route: path === '/home' ? '/home' : '[non-home route]',
            standalone: {
                navigator: window.navigator?.standalone === true,
                displayMode: window.matchMedia?.('(display-mode: standalone)')?.matches === true,
            },
            viewport: {
                innerWidth: window.innerWidth, innerHeight: window.innerHeight,
                visualViewportHeight: window.visualViewport?.height ?? null,
                visualViewportOffsetTop: window.visualViewport?.offsetTop ?? null,
                devicePixelRatio: window.devicePixelRatio ?? null,
                safeArea: measureSafeArea(),
            },
            scroll: {
                windowY: Math.round(window.scrollY || 0),
                documentTop: Math.round(document.scrollingElement?.scrollTop || 0),
            },
            options: {
                hide_top_nav: options.hide_top_nav,
                hide_home_composer: options.hide_home_composer,
                enable_custom_layout: options.enable_custom_layout,
                center_primary_column: options.center_primary_column,
            },
            scriptInjected: document.getElementById('x-ad-blocker-style') !== null,
            topNav: nav ? { element: describeElement(nav), ancestors: ancestorChain(nav) } : null,
            primaryColumn: document.querySelector("[data-testid='primaryColumn']") ? describeElement(document.querySelector("[data-testid='primaryColumn']")) : null,
            topElements,
            svgs,
            probes,
        }
    }

    async function copyDiagnosticText(text) {
        try {
            if (window.navigator?.clipboard?.writeText) {
                await window.navigator.clipboard.writeText(text)
                return true
            }
        } catch (_) { }
        const area = document.createElement('textarea')
        area.setAttribute(diagnosticAttribute, '')
        area.value = text
        area.readOnly = true
        area.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0'
        document.body.appendChild(area)
        area.select()
        let copied = false
        try { copied = document.execCommand('copy') } catch (_) { }
        area.remove()
        return copied
    }

    function showManualCopy(text) {
        document.querySelector('[data-x-ad-diagnostic-panel]')?.remove()
        const panel = document.createElement('div')
        panel.setAttribute(diagnosticAttribute, '')
        panel.setAttribute('data-x-ad-diagnostic-panel', '')
        panel.style.cssText = 'position:fixed;inset:12px;z-index:2147483647;background:#000;border:1px solid #1d9bf0;border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:8px'
        const area = document.createElement('textarea')
        area.value = text
        area.readOnly = true
        area.style.cssText = 'flex:1;width:100%;font:11px monospace;background:#111;color:#fff;border:0'
        const close = document.createElement('button')
        close.textContent = '关闭'
        close.type = 'button'
        close.addEventListener('click', () => panel.remove())
        panel.append(area, close)
        document.body.appendChild(panel)
        area.select()
    }

    function ensureDiagnosticButton() {
        if (document.querySelector('[data-x-ad-diagnostic-button]')) return
        const button = document.createElement('button')
        button.type = 'button'
        button.textContent = '复制诊断信息'
        button.setAttribute(diagnosticAttribute, '')
        button.setAttribute('data-x-ad-diagnostic-button', '')
        button.style.cssText = 'position:fixed;right:12px;bottom:calc(env(safe-area-inset-bottom) + 76px);z-index:2147483647;border:0;border-radius:999px;padding:8px 12px;background:#1d9bf0;color:#fff;font:600 13px -apple-system,system-ui,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.35)'
        button.addEventListener('click', async () => {
            const text = JSON.stringify(collectLayoutDiagnostics(), null, 2)
            const copied = await copyDiagnosticText(text)
            button.textContent = copied ? '已复制' : '请手动复制'
            if (!copied) showManualCopy(text)
            window.setTimeout(() => { button.textContent = '复制诊断信息' }, 2500)
        })
        document.body.appendChild(button)
    }

    window.__xAdCollectLayoutDiagnostics = collectLayoutDiagnostics
    ensureDiagnosticButton()
    window.setInterval(ensureDiagnosticButton, 1000)
}

function removeAds(document, options) {
    const enabled = Object.values(options).some(value => value === true)
    if (!enabled) return false
    const script = document.createElement('script')
    const settings = JSON.stringify(options).replace(/</g, '\\u003c')
    script.textContent = `(${removeAdsCode.toString()})(${settings});`
    if (options.enable_layout_diagnostics) {
        script.textContent += `\n(${layoutDiagnosticsCode.toString()})(${settings});`
    }
    const container = document.body || document.documentElement
    container.appendChild(script)
    return true
}


async function main() {
    const options = getXOptions()
    if (!Object.values(options).some(value => value === true)) {
        $done({})
        return
    }
    switch (getScriptType()) {
        case "response":
            let url = (new URL($request.url))
            let body = getScriptResponseBody()
            let ct = Object.entries($response.headers || {}).find(([name]) => name.toLowerCase() === 'content-type')?.[1]
            if (ct && ct.toLowerCase().includes("text/html") && body) {
                echo(`url: ${url}, path: ${url.pathname}`)
                const document = new DOMParser().parseFromString(body, 'text/html')
                if (!removeAds(document, options)) {
                    $done({})
                    break
                }
                $done({ body: document.documentElement.outerHTML })
                break
            }
        default:
            $done({})
    }
}

(async () => {
    main().then(_ => {

    }).catch(error => {
        if (typeof error === 'object') {
            error = error.toString()
        }
        echo(`[Error]: ${error}`)
        $done({})
    })
})();
