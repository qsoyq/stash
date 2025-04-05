// 基于 https://raw.githubusercontent.com/xykt/RegionRestrictionCheck/main/check.sh

/**
 * 对异步回调的 http 调用包装成 async 函数
 * @param {string} method 
 * @param {object} params 请求参数
 * @returns {object} 包含 error, response, data 的对象
 */
async function request(method, params) {
    return new Promise((resolve, reject) => {
        $httpClient[method.toLowerCase()](params, (error, response, data) => {
            if (error) {
                console.log(`Error: ${error}, Response: ${JSON.stringify(response)}, Data: ${data}`);
                reject({ error, response, data });
            } else {
                resolve({ error, response, data });
            }
        });
    });
}

/**
 * 请求封装
 * @param {object} params 请求参数
 * @returns {object} 包含 error, response, data 的对象
 */
async function get(params) {
    return request('GET', params);
}

/**
 * 请求封装
 * @param {object} params 请求参数
 * @returns {object} 包含 error, response, data 的对象
 */
async function post(params) {
    return request('POST', params);
}

/**
 * 请求封装
 * @param {object} params 请求参数
 * @returns {object} 包含 error, response, data 的对象
 */
async function put(params) {
    return request('PUT', params);
}

/**
 * 请求封装
 * @param {object} params 请求参数
 * @returns {object} 包含 error, response, data 的对象
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
function write(key, val) {
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
 * @param {string|undefined} url 
 */
function notificationPost(title, subtitle, content, url) {
    const params = url ? { url } : {};
    $notification.post(title, subtitle, content, params)
}

/**
 * 判断当前请求是否来自微信
 * @returns {bool} 
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
 * @param {Date} date 
 * @returns {string} 表示当前时间的字符串
 */
function getLocalDateString(date) {
    if (!date) {
        date = new Date()
    }
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds()
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
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
 * 读取脚本参数
 * @param {string} key 
 * @returns {string}
 */
function getScriptArgument(key) {
    if (typeof $argument === "undefined") {
        return;
    }

    let body;
    try {
        body = JSON.parse($argument);
    } catch (error) {
        console.log("Invalid JSON:", error);
        return null; // JSON 解析失败返回 null
    }
    return body[key]
}

/**
 * 读取本地持久化参数
 * @param {string} key 
 * @returns {string}
 */
function getPersistentArgument(key) {
    return body?.[key] ?? $persistentStore.read(key);
}

/**
 * 返回当前的脚本类型
 * @returns 
 */
function getScriptType() {
    return typeof $script !== 'undefined' ? $script.type : 'undefined'
}

/**
 * 将地区代码转换为对应的 emoji
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
    const codePoints = [...countryCode].map(char => 127397 + char.charCodeAt());

    // 将Unicode字符转换为emoji
    return String.fromCodePoint(...codePoints);
}

async function parseBilibiliChinaMainland() {
    let res = await get("https://api.bilibili.com/pgc/player/web/playurl?avid=82846771&qn=0&type=&otype=json&ep_id=307247&fourk=1&fnver=0&fnval=16&module=bangumi")
    if (res.error) {
        console.log(res.error)
        printObj(res)
        return '哔哩哔哩大陆: Failed'
    } else {
        let body = JSON.parse(res.data)
        if (body.code === 0) {
            return '哔哩哔哩大陆: Yes'
        } else if (body.code === -10403) {
            return '哔哩哔哩大陆: No'
        } else {
            return '哔哩哔哩大陆: Failed'
        }
    }
}

async function parseBilibiliHKMCTW() {
    let res = await get("https://api.bilibili.com/pgc/player/web/playurl?avid=18281381&cid=29892777&qn=0&type=&otype=json&ep_id=183799&fourk=1&fnver=0&fnval=16&module=bangumi")
    if (res.error) {
        console.log(res.error)
        visitAll(res)
        return '哔哩哔哩港澳台: Failed'
    }
    let body = JSON.parse(res.data)

    if (body.code === 0) {
        return '哔哩哔哩港澳台: Yes'
    } else if (body.code === -10403) {
        return '哔哩哔哩港澳台: No'
    } else {
        return '哔哩哔哩港澳台: Failed'
    }
}

async function parseTiktok() {
    // let res = await get("https://www.tiktok.com/")
    return `Tiktok: 待实现`
}

async function getChatGPTCountryCode() {
    let url = 'https://chat.openai.com/cdn-cgi/trace'
    let res = await get(url)
    let map = {}
    res.data.split('\n').forEach(element => {
        let key = element.split('=')[0]
        let value = element.split('=')[1]
        map[key] = value
    })
    return `ChatGPT: ${countryCodeToEmoji(map['loc'])}${map['loc']}`
}

async function parseChatGPTiOS() {
    let url = 'https://ios.chat.openai.com/'
    let res = await get(url)
    if (typeof res.data === 'string') {
        // visitAll(res)
        console.log(`parseChatGPTiOS result: ${res.response.status}, ${res.data}`)
        if (res.data.toLowerCase().includes("You may be connected to a disallowed ISP".toLowerCase())) {
            return 'ChatGPT iOS: Disallowed ISP'
        } else if (res.data.toLowerCase().includes("Request is not allowed. Please try again later.".toLowerCase())) {
            return 'ChatGPT iOS: Yes'
        } else if (res.data.toLowerCase().includes("Sorry, you have been blocked".toLowerCase())) {
            return 'ChatGPT iOS: Blocked'
        } else {
            return 'ChatGPT iOS: Failed'
        }
    } else {
        return 'ChatGPT iOS: Failed'
    }
}

async function parseChatGPTWeb() {
    let url = 'https://api.openai.com/compliance/cookie_requirements'
    let res = await get(url)
    if (typeof res.data === 'string') {
        // visitAll(res)
        console.log(`parseChatGPTWeb result: ${res.response.status}, ${res.data}`)
        if (res.data.toLowerCase().includes("unsupported_country".toLowerCase())) {
            return 'ChatGPT Web: Unsupported Country'
        } else {
            return 'ChatGPT Web: Yes'
        }
    } else {
        return 'ChatGPT Web: Failed'
    }
}

async function parseGemini() {
    let url = 'https://gemini.google.com'
    let res = await get(url)

    if (typeof res.data !== 'string') {
        return 'Gemini: Failed'
    }
    let isOk = res.data.includes('45631641,null,true') ? "Yes" : "";

    // Equivalent of grep -o ',2,1,200,"[A-Z]\{3\}"' | sed 's/,2,1,200,"//;s/"//' || echo ""
    let countrycode = "";
    const regex = /,2,1,200,"([A-Z]{3})"/;
    const match = res.data.match(regex);
    let result = isOk ? "Yes" : "No"
    if (match) {
        countrycode = match[1];  // Extract the country code (3-letter code)
        return `Gemini: ${result} ${countryCodeToEmoji(countrycode)}${countrycode}`
    } else {
        return `Gemini: ${result}`
    }
}

async function parseYoutubePremium() {
    /**
     * 从网页中提取 country-code
     * @returns
     * @param {string} htmlString
     */
    function parseYoutubePremiumCountryCode(htmlString) {
        try {
            let parser = new DOMParser();
            let doc = parser.parseFromString(htmlString, 'text/html');
            let ele = doc.getElementById("country-code")
            if (ele && ele.textContent) {
                return ele.textContent.trim()
            }
        } catch (error) {
            console.log(`parseCountryCode error: ${error}`)
        }
    }
    let url = 'https://www.youtube.com/premium'
    let res = await get(url)

    if (typeof res.data !== 'string') {
        return 'Youtube Premium: Failed'
    }

    if (res.data.toLowerCase().includes('YouTube Premium is not available in your country'.toLowerCase())) {
        return `Youtube Premium: No`

    } else if (res.data.toLowerCase().includes("ad-free")) {
        let countryCode = parseYoutubePremiumCountryCode(res.data)
        // @ts-ignore
        let region = `, Region: ${countryCodeToEmoji(countryCode)}${countryCode}` ? countryCode : ``
        return `Youtube Premium: Yes${region}`
    }
    return 'Youtube Premium: Failed'
}

async function main() {
    try {
        console.log("Starting the parallel execution...");
        let contents = await Promise.all([
            parseBilibiliHKMCTW(),
            // parseTiktok(),
            getChatGPTCountryCode(),
            parseChatGPTiOS(),
            parseChatGPTWeb(),
            parseGemini(),
            parseYoutubePremium(),
        ]);

        console.log("All promises resolved.");

        let content = contents.join('\n');
        content += `\n执行时间: ${getLocalDateString(new Date())}`;

        console.log("Final content prepared:");
        console.log(content);

        const panel = {
            title: `流媒体解锁检测`,
            content: content
        };

        $done(panel);
    } catch (error) {
        console.error(`Error caught: ${error}`);
        $done({});
    }
}

main();
