/** @namespace youtube */

/**
 * @typedef {Object} youtube.HTTPResponse
 * @property {string|null} error - 错误信息，如果没有错误则为 null
 * @property {object} response - HTTP 响应对象
 * @property {string|null} data - 返回的数据，如果没有数据则为 null
 */

/**
 * @typedef {function(Error|string|null, Object, string|null): void} youtube.HTTPCallback
 * 回调函数类型，接受错误、响应和数据作为参数。
 * @param {Error|string|null} error - 错误信息，可以是 Error 对象、字符串或者 null
 * @param {Object} response - HTTP 响应对象
 * @param {string|null} data - 返回的数据，可以是字符串或者 null
 */

/**
 * @typedef {function(Object, youtube.HTTPCallback): youtube.HTTPResponse} youtube.HTTPMethod
 */

/**
 * @typedef {Object} youtube.HttpClient
 * @property {youtube.HTTPMethod} get - 发送 GET 请求
 * @property {youtube.HTTPMethod} post - 发送 POST 请求
 * @property {youtube.HTTPMethod} put - 发送 PUT 请求
 * @property {youtube.HTTPMethod} delete - 发送 DELETE 请求
 */

/** @type {youtube.HttpClient} */
var $httpClient;

var $request, $response, $notification, $argument, $persistentStore, $script

/** @type {function(Object):void} */
var $done

/**
 * 对异步回调的 HTTP 调用包装成 async 函数
 * @param {'GET'|'POST'|'PUT'|'DELETE'} method - HTTP 方法类型，支持 GET、POST、PUT 和 DELETE
 * @param {Object} params - 请求参数对象，包含请求所需的各类信息
 * @returns {Promise<youtube.HTTPResponse>} 返回一个 Promise，解析为包含 error、response 和 data 的对象
 * @throws {Error} 如果请求失败，Promise 会被拒绝并返回错误信息
 */
async function request(method, params) {
    return new Promise((resolve, reject) => {
        /** @type {youtube.HTTPMethod} */
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
 * @returns {Promise<youtube.HTTPResponse>}
 */
async function get(params) {
    return request('GET', params);
}

/**
 * 请求封装
 * @param {object} params
 * @returns {Promise<youtube.HTTPResponse>}
 */
async function post(params) {
    return request('POST', params);
}

/**
 * 请求封装
 * @param {object} params
 * @returns {Promise<youtube.HTTPResponse>}
 */
async function put(params) {
    return request('PUT', params);
}

/**
 * 请求封装
 * @param {object} params
 * @returns {Promise<youtube.HTTPResponse>}
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

function inner() {
    function translateComment() {
        document.querySelectorAll("ytd-tri-state-button-view-model").forEach(e => {
            let button = e.querySelector("tp-yt-paper-button")
            if (button) {
                if (button.textContent.includes("查看原文")) {

                } else {
                    // @ts-ignore
                    button.click()
                }
            }
        })
    }

    const url = new URL(window.location.href)
    switch (url.pathname) {
        case '/':
            // @ts-ignore
            let tabs = window?.ytInitialData?.contents?.twoColumnBrowseResultsRenderer?.tabs
            if (tabs) {
                for (const tab of tabs) {
                    let contents = tab?.tabRenderer?.content?.richGridRenderer?.contents
                    if (contents) {
                        tab.tabRenderer.content.richGridRenderer.contents = tab.tabRenderer.content.richGridRenderer.contents.filter(e => {
                            // 赞助商广告
                            if (e?.richItemRenderer?.content?.adSlotRenderer) {
                                return false
                            }
                            // 短视频
                            if (e?.richSectionRenderer?.content?.richShelfRenderer?.title?.runs[0]?.text === 'Shorts') {
                                return false
                            }
                            return true
                        })
                    }
                }
            }
            setInterval(() => {
                let queryList = [
                    // "#dismissible.style-scope.ytd-statement-banner-renderer", //会员订阅介绍: 6 位家庭成员，1 笔费用，超实惠
                    // "#dismissible.style-scope.ytd-rich-shelf-renderer", // Shorts
                ]
                queryList.forEach(query => {
                    let tag = document.querySelector(query)
                    if (tag) {
                        tag.remove()
                        console.log(`remove ${query}`)
                    }
                })
            }, 100)
            break
        case "/watch":

            console.log("enter /watch")
            const CONFIG = {
                // 画质相关配置
                setQuality: true, // 是否启用自动画质选择功能
                // preferredQualities: ['highres', 'hd2160', 'hd1440', 'hd1080', 'hd720'], // 优先画质列表
                preferredQualities: ['hd2160', 'hd1440', 'hd1080', 'hd720'], // 优先画质列表 移除 8k

                // 广告相关配置
                skipAds: true, // 是否启用自动跳过广告功能
                adCheckInterval: 100, // 检查广告的频率 (毫秒)

                // 调试模式
                debug: true // 设置为 true 可在控制台看到详细日志
            };



            const log = (...args) => {
                if (CONFIG.debug) {
                    console.log('[YT-Ultimate]', ...args);
                }
            };

            // --- 模块一：画质选择 ---

            /**
             * 设置画质的核心函数
             * @param {object} player - YouTube 播放器实例
             * @returns {boolean} - 是否成功设置或检查完毕
             */
            function setBestQuality(player) {
                if (!player || typeof player.getAvailableQualityLevels !== 'function') {
                    log('画质模块: 播放器或 API 不可用。');
                    return false;
                }

                const availableQualities = player.getAvailableQualityLevels();
                if (availableQualities.length === 0) {
                    log('画质模块: 画质列表为空（可能是广告），等待下一次机会。');
                    return false;
                }

                log('画质模块: 可用画质:', availableQualities);

                // 如果当前画质自动分配到最高，无需降级
                if (player.getPlaybackQuality() === "highres") {
                    log(`👍 当前画质 (highres) 已是最佳，无需更改。`);
                    return true
                }

                for (const quality of CONFIG.preferredQualities) {
                    if (availableQualities.includes(quality)) {
                        const currentQuality = player.getPlaybackQuality();
                        if (currentQuality !== quality) {
                            player.setPlaybackQualityRange(quality);
                            player.setPlaybackQuality(quality);
                            log(`✅ 画质已成功切换到 -> ${quality}`);
                        } else {
                            log(`👍 当前画质 (${currentQuality}) 已是最佳，无需更改。`);
                        }
                        return true;
                    }
                }

                log('🤷‍♂️ 未找到偏好的画质选项。');
                return true;
            }

            /**
             * 轮询检查播放器是否准备就绪并设置画质
             */
            function pollingCheckQuality() {
                let attempts = 0;
                const maxAttempts = 15;

                const intervalId = setInterval(() => {
                    const player = document.getElementById('movie_player');
                    attempts++;

                    // @ts-ignore
                    if (player && typeof player.getAvailableQualityLevels === 'function') {
                        if (setBestQuality(player)) {
                            clearInterval(intervalId);
                            attachStateChangeListener(player);
                        }
                    }

                    if (attempts >= maxAttempts) {
                        log('画质模块: 超时，未能找到播放器或设置画质。');
                        clearInterval(intervalId);
                    }
                }, 1000);
            }
            /**
             * 附加 onStateChange 监听器，用于在广告后快速恢复画质
             */
            function attachStateChangeListener(player) {
                if (player.dataset.qualityListenerAttached === 'true') return;
                player.addEventListener('onStateChange', (state) => {
                    if (state === 1) { // 1 = 正在播放
                        log('▶️ 播放状态改变，重新检查画质...');
                        setTimeout(() => setBestQuality(player), 250);
                    }
                });
                player.dataset.qualityListenerAttached = 'true';
                log('画质模块: 事件监听器已附加。');
            }
            // --- 模块二：广告处理 ---

            /**
             * 检查并处理广告的函数
             */
            function handleAds() {
                // 1. 寻找并点击“跳过广告”按钮 (包括新旧两种样式)
                const skipButton = document.querySelector('.ytp-ad-skip-button-modern, .ytp-ad-skip-button');
                if (skipButton) {
                    log('广告模块: 发现可跳过广告，点击！');
                    // @ts-ignore
                    skipButton.click();
                }

                // 2. 寻找并关闭视频上方的“横幅广告”
                const closeButton = document.querySelector('.ytp-ad-overlay-close-button');
                if (closeButton) {
                    log('广告模块: 发现横幅广告，关闭！');
                    // @ts-ignore
                    closeButton.click();
                }

                // 3. 加速无法跳过的广告（高级技巧）
                // .ad-showing 选择器表示广告正在播放
                const adVideo = document.querySelector('.ad-showing .html5-main-video');
                if (adVideo) {
                    // 将广告静音并以16倍速快进，让它光速结束
                    // @ts-ignore
                    adVideo.muted = true;
                    // @ts-ignore
                    adVideo.playbackRate = 16;
                }
            }


            // https://www.nodeseek.com/post-416712-1
            // https://greasyfork.org/zh-CN/scripts/544945-youtube-%E8%87%AA%E5%8A%A8%E9%80%89%E6%8B%A9%E6%9C%80%E9%AB%98%E7%94%BB%E8%B4%A8-%E8%87%AA%E5%8A%A8%E8%B7%B3%E8%BF%87%E5%B9%BF%E5%91%8A
            // 画质自动选择和部分去广告作者 @ceocok
            // 启用画质自动选择和去广告
            // 启动画质选择功能
            if (CONFIG.setQuality) {
                log('画质选择功能已启用。');
                window.addEventListener('yt-navigate-finish', () => {
                    log('--- 页面导航完成，启动画质检查 ---');
                    pollingCheckQuality();
                });
                pollingCheckQuality(); // 首次加载时执行
            }

            // 启动广告处理功能
            if (CONFIG.skipAds) {
                log('广告处理功能已启用。');
                // 使用 setInterval 持续检查广告，这是最可靠的方式
                setInterval(handleAds, CONFIG.adCheckInterval);
            }


            // 这是啥来着? 忘了
            Array.from(document.querySelectorAll('#panels')).forEach(e => {
                e.remove()
            })

            // 自动翻译评论
            window.addEventListener('scroll', () => {
                translateComment()
            });

            let removedCount = 1
            let timer = setInterval(() => {
                // 移除频道订阅水印
                let tag = document.querySelector(".branding-img.iv-click-target")
                if (tag) {
                    tag.remove()
                    removedCount -= 1
                    console.log("频道订阅水印已移除")
                }
                if (removedCount === 0) {
                    clearInterval(timer)
                }
            }, 100)




            break
        case "/results":
            // @ts-ignore
            // 广告
            if (window?.ytInitialData?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents[0]?.itemSectionRenderer?.contents) {
                // @ts-ignore
                let contents = window.ytInitialData.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents[0].itemSectionRenderer.contents
                for (const content of contents) {
                    if (content?.searchPyvRenderer) {
                        content.searchPyvRenderer.ads = []
                    }

                    if (content?.adSlotRenderer) {
                        content.adSlotRenderer = {}
                    }
                }
            }
            // 短视频
            // @ts-ignore
            if (window?.ytInitialData?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents[0]?.itemSectionRenderer?.contents) {
                // @ts-ignore
                window.ytInitialData.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents[0].itemSectionRenderer.contents = window.ytInitialData.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents[0].itemSectionRenderer.contents.filter(e => {
                    if (e?.gridShelfViewModel) {
                        return false
                    }
                    return true
                })
            }
            break
    }

    // @ts-ignore
    if (window?.ytInitialData) {
        // @ts-ignore
        // console.log(`ytInitialData: ${JSON.stringify(window?.ytInitialData)}`)
    }

}

function removeAds(document) {
    let code = `
    ${inner.toString()};
    inner();
    `
    let script = document.createElement('script');
    script.textContent = code
    document['body'].appendChild(script);
    const url = new URL($request.url)
    if (url.pathname === '/') {
    }

    addCss(document)
}

function addCss(document) {
    let style = document.createElement("style")
    style.innerHTML = `
    // 本周新上线的音乐视频
    //.ytd-brand-video-shelf-renderer {
        display: none; 
    }

    // 会员订阅介绍: 6 位家庭成员，1 笔费用，超实惠
    #dismissible.style-scope.ytd-statement-banner-renderer  {
        display: none;
    }

    // 你对这个视频有何看法
    #star-survey {
        display: none;
    }

    #footer {
        display: none;
    }
    `
    document.head.appendChild(style)
}


async function main() {
    switch (getScriptType()) {
        case "response":
            let url = (new URL($request.url))
            let body = getScriptResponseBody()
            let ct = $response.headers['Content-Type']
            if (ct && ct.includes("text/html") && body) {
                echo(`url: ${url}, path: ${url.pathname}`)
                const document = new DOMParser().parseFromString(body, 'text/html')
                removeAds(document)
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
