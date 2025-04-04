/** @namespace http.rewrite */

/**
 * @typedef {Object} http.rewrite.HTTPResponse
 * @property {string|null} error - 错误信息，如果没有错误则为 null
 * @property {object} response - HTTP 响应对象
 * @property {string|null} data - 返回的数据，如果没有数据则为 null
 */

/**
 * @typedef {function(Error|string|null, Object, string|null): void} http.rewrite.HTTPCallback
 * 回调函数类型，接受错误、响应和数据作为参数。
 * @param {Error|string|null} error - 错误信息，可以是 Error 对象、字符串或者 null
 * @param {Object} response - HTTP 响应对象
 * @param {string|null} data - 返回的数据，可以是字符串或者 null
 */

/**
 * @typedef {function(Object, http.rewrite.HTTPCallback): http.rewrite.HTTPResponse} http.rewrite.HTTPMethod
 */

/**
 * @typedef {Object} http.rewrite.HttpClient
 * @property {http.rewrite.HTTPMethod} get - 发送 GET 请求
 * @property {http.rewrite.HTTPMethod} post - 发送 POST 请求
 * @property {http.rewrite.HTTPMethod} put - 发送 PUT 请求
 * @property {http.rewrite.HTTPMethod} delete - 发送 DELETE 请求
 */

/** @type {http.rewrite.HttpClient} */
var $httpClient;

var $request, $response, $notification, $argument, $persistentStore, $script

/** @type {function(Object):void} */
var $done

/**
 * 对异步回调的 HTTP 调用包装成 async 函数
 * @param {'GET'|'POST'|'PUT'|'DELETE'} method - HTTP 方法类型，支持 GET、POST、PUT 和 DELETE
 * @param {Object} params - 请求参数对象，包含请求所需的各类信息
 * @returns {Promise<http.rewrite.HTTPResponse>} 返回一个 Promise，解析为包含 error、response 和 data 的对象
 * @throws {Error} 如果请求失败，Promise 会被拒绝并返回错误信息
 */
async function request(method, params) {
    return new Promise((resolve, reject) => {
        /** @type {http.rewrite.HTTPMethod} */
        const httpMethod = $httpClient[method.toLowerCase()]; // 通过 HTTP 方法选择对应的请求函数
        httpMethod(params, (error, response, data) => {
            if (error) {
                console.log(`Error: ${error}, Response: ${JSON.stringify(response)}, Data: ${data}`);
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
 * @returns {Promise<http.rewrite.HTTPResponse>}
 */
async function get(params) {
    return request('GET', params);
}

/**
 * 请求封装
 * @param {object} params
 * @returns {Promise<http.rewrite.HTTPResponse>}
 */
async function post(params) {
    return request('POST', params);
}

/**
 * 请求封装
 * @param {object} params
 * @returns {Promise<http.rewrite.HTTPResponse>}
 */
async function put(params) {
    return request('PUT', params);
}

/**
 * 请求封装
 * @param {object} params
 * @returns {Promise<http.rewrite.HTTPResponse>}
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
 * @param {string|undefined} url 
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
 * @param {Date|null} [date=null] 
 * @returns {string} 表示当前时间的字符串
 */
function getLocalDateString(date = null) {
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
 * 解析 json 字符串， 失败返回 null
 * @param {*} string 
 * @returns 
 */
function parseJsonBody(string) {
    try {
        return JSON.parse(string)
    } catch (e) {
        console.log(`invalid json: ${e}\nraw: ${string}`)
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
    if (body) {
        return body[key]
    }
    return null
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
 * 
 * @returns {string | undefined}
 */
function getScriptResponseBody() {
    let body = (typeof $response.body === 'object') ? (new TextDecoder('utf-8')).decode(new Uint8Array($response.body)) : $response.body;
    return body
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

async function main() {
    let type = getScriptType()
    // {"rewriteHttpResponseBodyRegexps": [{"search": "a", "replace": "b"}]}                    
    let regexps = getScriptArgument("rewriteHttpResponseBodyRegexps") || []

    // {"rewriteHttpResponseBodyRegexpsArray": [["a", "b"]]}                    
    let regexpsArray = getScriptArgument("rewriteHttpResponseBodyRegexpsArray") || []

    // {"documentEvalCodes": ["console.log(1)"], "console.log(2)"]}
    let documentEvalCodes = getScriptArgument("documentEvalCodes") || []

    let debug = getScriptArgument("debug")
    let now = getLocalDateString()
    switch (type) {
        case 'request':
        case 'response':
            let body = getScriptResponseBody()
            if (debug) {
                console.log(`${now} [Debug] [Request] [Body]: ${body}`)
            }
            if (body) {
                let modified = body
                // 正则替换文本
                for (const regexp of regexps) {
                    console.log(`[DeprecationWarning]: use a rewriteHttpResponseBodyRegexpsArray of rewriteHttpResponseBodyRegexps.`)
                    let search = regexp?.search
                    let replace = regexp?.replace
                    if (search && typeof replace === 'string') {
                        origin = modified
                        modified = origin.replace(new RegExp(search, 'g'), replace);
                        if (origin !== modified) {
                            console.log(`${search} -> ${replace} ✅`)
                        } else {
                            console.log(`${search} -> ${replace} ❌ `)
                        }
                    }
                }


                for (const regexp of regexpsArray) {
                    let search = regexp[0]
                    let replace = regexp[1]
                    if (search && typeof replace === 'string') {
                        origin = modified
                        modified = origin.replace(new RegExp(search, 'g'), replace);
                        if (origin !== modified) {
                            console.log(`${search} -> ${replace} ✅`)
                        } else {
                            console.log(`${search} -> ${replace} ❌ `)
                        }
                    }
                }

                body = modified

                let context = {}
                if (documentEvalCodes) {
                    let domParser = new DOMParser();
                    context.document = domParser.parseFromString(body, 'text/html');
                }

                for (const code of documentEvalCodes) {
                    safeEval(code, { context })
                    console.log(`execute ${code} done.`)
                }

                if (documentEvalCodes) {
                    modified = context.document.documentElement.outerHTML
                }


                // html 文档
                return $done({ body: modified })
            }
            break
        default:
            break;
    }
    $done({})
}


(async () => {
    main().then(_ => {

    }).catch(error => {
        console.log(`[Error]: ${error?.message || error}`)
        $done({})
    })
})();
