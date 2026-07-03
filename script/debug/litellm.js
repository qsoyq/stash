/** @namespace http.capture */

/**
 * @typedef {Object} http.capture.HTTPResponse
 * @property {string|null} error - 错误信息，如果没有错误则为 null
 * @property {object} response - HTTP 响应对象
 * @property {string|null} data - 返回的数据，如果没有数据则为 null
 */

/**
 * @typedef {function(Error|string|null, Object, string|null): void} http.capture.HTTPCallback
 * 回调函数类型，接受错误、响应和数据作为参数。
 * @param {Error|string|null} error - 错误信息，可以是 Error 对象、字符串或者 null
 * @param {Object} response - HTTP 响应对象
 * @param {string|null} data - 返回的数据，可以是字符串或者 null
 */

/**
 * @typedef {function(Object, http.capture.HTTPCallback): http.capture.HTTPResponse} http.capture.HTTPMethod
 */

/**
 * @typedef {Object} http.capture.HttpClient
 * @property {http.capture.HTTPMethod} get - 发送 GET 请求
 * @property {http.capture.HTTPMethod} post - 发送 POST 请求
 * @property {http.capture.HTTPMethod} put - 发送 PUT 请求
 * @property {http.capture.HTTPMethod} delete - 发送 DELETE 请求
 */

/** @type {http.capture.HttpClient} */
var $httpClient;

var $request, $response, $notification, $argument, $persistentStore, $script;

/** @type {function(Object):void} */
var $done;

/**
 * 对异步回调的 HTTP 调用包装成 async 函数
 * @param {'GET'|'POST'|'PUT'|'DELETE'} method - HTTP 方法类型，支持 GET、POST、PUT 和 DELETE
 * @param {Object} params - 请求参数对象，包含请求所需的各类信息
 * @returns {Promise<http.capture.HTTPResponse>} 返回一个 Promise，解析为包含 error、response 和 data 的对象
 * @throws {Error} 如果请求失败，Promise 会被拒绝并返回错误信息
 */
async function request(method, params) {
  return new Promise((resolve, reject) => {
    /** @type {http.capture.HTTPMethod} */
    const httpMethod = $httpClient[method.toLowerCase()]; // 通过 HTTP 方法选择对应的请求函数
    httpMethod(params, (error, response, data) => {
      if (error) {
        echo(
          `[Request] Error: ${error}, Response: ${JSON.stringify(response)}, Data: ${data}`,
        );
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
 * @returns {Promise<http.capture.HTTPResponse>}
 */
async function get(params) {
  return request("GET", params);
}

/**
 * 请求封装
 * @param {object} params
 * @returns {Promise<http.capture.HTTPResponse>}
 */
async function post(params) {
  return request("POST", params);
}

/**
 * 请求封装
 * @param {object} params
 * @returns {Promise<http.capture.HTTPResponse>}
 */
async function put(params) {
  return request("PUT", params);
}

/**
 * 请求封装
 * @param {object} params
 * @returns {Promise<http.capture.HTTPResponse>}
 */
async function delete_(params) {
  return request("DELETE", params);
}

/**
 * 解析 cookies 字符串并返回对象
 * @param {string} cookie
 * @returns {object|null} 当返回为 null 表示解析失败
 */
function parseCookie(cookie) {
  if (typeof cookie !== "string") {
    console.log(`illegally cookie: ${cookie}`);
    return null;
  }
  let body = {};
  cookie.split(";").forEach((element) => {
    if (element) {
      // let arr = element.trim().split("=")
      element = element.trim();
      let index = element.indexOf("=");
      if (index === -1) {
        console.log(`illegally cookie field: ${element}`);
        return null;
      } else {
        let key = element.substring(0, index);
        let value = element.substring(index + 1);
        body[key] = value;
      }
    }
  });
  return body;
}
/**
 * 读取 stash 内部持久化存储的值
 * @param {string} key
 */
function read(key) {
  return $persistentStore.read(key);
}

/**
 * 更新 stash 内部持久化的值
 * @param {string} key
 * @param {string} val
 */
function writePersistentArgument(key, val) {
  $persistentStore.write(val, key);
}

/**
 *  基于持久化读取 Cookie
 * @param {string} key
 * @returns {string}
 */
function getCookie(key) {
  return $persistentStore.read(`Cookie.${key}`);
}

/**
 * 基于持久化写入 Cookie
 * @param {string} key
 * @param {string} val
 * @returns
 */
function setCookie(key, val) {
  return $persistentStore.write(val, `Cookie.${key}`);
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
  $notification.post(title, subtitle, content, params);
}

/**
 * 判断当前请求是否来自微信
 * @returns {Boolean}
 */
function isWechat() {
  if (typeof $request === "undefined") {
    return false;
  }
  let ua = getHeader($request.headers, "User-Agent");
  return /micromessenger/.test((ua || "").toLowerCase());
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
    String.fromCharCode(Math.floor(Math.random() * (max - min + 1)) + min),
  ).join("");
}

/**
 * 将指定日期对象转为相应的日期时间字符串
 * 默认为当前日期时间
 * @param {Date|null} [date=null]
 * @returns {string} 表示当前时间的字符串
 */
function getLocalDateString(date = null) {
  if (!date) {
    date = new Date();
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0"); // 月份从0开始，所以加1
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}.${month}.${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 遍历并输出对象字面值
 * @param {object} body
 * @param {string|undefined} prefix
 */
function visitAll(body, prefix = "", visited = new WeakSet()) {
  if (typeof body !== "object" || body === null) {
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
    if (typeof value === "object" && value !== null) {
      visitAll(value, currentPrefix, visited);
    } else {
      console.log(
        `Key: ${currentPrefix}, Value: ${value}, Type: ${typeof value}`,
      );
    }
  }
}
/**
 * 解析 json 字符串， 失败返回 null
 * @param {*} string
 * @param {{logInvalid?: boolean}} [options]
 * @returns
 */
function parseJsonBody(string, options = {}) {
  if (string === null || typeof string === "undefined" || string === "") {
    return null;
  }
  try {
    return JSON.parse(string);
  } catch (e) {
    if (options.logInvalid !== false) {
      console.log(`[Warn] invalid json: ${e}, length: ${String(string).length}`);
    }
    return null;
  }
}

/**
 * 读取脚本参数
 * @param {string} key
 * @returns {any|undefined|null}
 */
function getScriptArgument(key) {
  if (typeof $argument === "undefined" || !$argument) {
    return;
  }

  let body = parseJsonBody($argument);
  if (!body) {
    console.log(`[Warn] Invalid JSON: ${$argument}`);
    return null; // JSON 解析失败返回 null
  }
  return body[key];
}

/**
 * 从环境中读取参数， 且参数不可为空，否则抛出异常
 * @param {string} key
 * @returns {any}
 * @throws {Error} 如果找不到对应的参数值，或参数值为 `null` 或 `undefined`，则抛出一个包含错误信息的异常。*
 */
function mustGetScriptArgument(key) {
  let val = getScriptArgument(key);
  if (val === null || val === undefined) {
    console.log(`can't find value for ${key}`);
    throw `can't find value for ${key}`;
  }
  return val;
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
  return typeof $script !== "undefined" ? $script.type : "undefined";
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
    USA: "US",
    CAN: "CA",
    GBR: "GB",
    FRA: "FR",
    DEU: "DE",
    // 继续添加你需要支持的三位代码
  };

  // 如果代码长度为3，尝试查找转换表
  if (countryCode.length === 3) {
    countryCode = threeToTwo[countryCode] || countryCode.slice(0, 2);
  }

  // 将两位代码转换为相应的Unicode字符
  const codePoints = [...countryCode].map(
    (char) => 127397 + char.charCodeAt(0),
  );

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
  let body =
    typeof $response.body === "object"
      ? new TextDecoder("utf-8").decode(new Uint8Array($response.body))
      : $response.body;
  return body;
}

/**
 *  处理 telegram.sendMessage MarkdownV2 格式消息体转义
 * @param {string} text
 * @returns
 */
function telegramEscapeMarkdownV2(text) {
  const escapeChars = [
    { char: "_", replacement: "\\_" },
    { char: "*", replacement: "\\*" },
    { char: "[", replacement: "\\[" },
    { char: "]", replacement: "\\]" },
    { char: "(", replacement: "\\(" },
    { char: ")", replacement: "\\)" },
    { char: "~", replacement: "\\~" },
    { char: ">", replacement: "\\>" },
    { char: "#", replacement: "\\#" },
    { char: "+", replacement: "\\+" },
    { char: "-", replacement: "\\-" },
    { char: "=", replacement: "\\=" },
    { char: "|", replacement: "\\|" },
    { char: "{", replacement: "\\{" },
    { char: "}", replacement: "\\}" },
    { char: ".", replacement: "\\." },
    { char: "!", replacement: "\\!" },
    { char: "`", replacement: "\\`" },
  ];

  let escapedText = text;

  escapeChars.forEach(({ char, replacement }) => {
    const regex = new RegExp(`\\${char}`, "g");
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
  return params.get(key) || null;
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
function makePushMessage(
  title,
  body,
  url = null,
  group = null,
  icon = null,
  level = null,
) {
  let payload = {};

  let APNs = getScriptArgument("APNs");
  let bark = getScriptArgument("bark");
  group = getScriptArgument("group") || group || "Default";
  level = getScriptArgument("level") || level || "passive";
  icon = icon || getScriptArgument("icon");
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
          body: body,
        },
      },
    };
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
      endpoint: bark?.endpoint || "https://api.day.app/push",
    };
  }
  return payload;
}

/**
 * 推送消息
 * https://p.19940731.xyz/redoc#tag/notifications.push/operation/push_v3_api_notifications_push_v3_post
 * @param {*} message
 * @returns
 */
async function pushMessage(message) {
  let url = "https://p.19940731.xyz/api/notifications/push/v3";
  let res = await post({
    url,
    body: JSON.stringify({ messages: [message] }),
    headers: { "content-type": "application/json" },
  });
  let now = getLocalDateString();
  if (res.error || res.response.status >= 400) {
    throw `${now} [Error] push messages error: ${res.error}, ${res.response.status}, ${res.data}`;
  }
  return res;
}

/**
 * @param {...any} args - Arguments to log
 */
function echo(...args) {
  let date = getLocalDateString();
  let logMessage = `${args.join(" ")}`;
  logMessage = `[${date}] ${logMessage}`;
  console.log(logMessage);
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
  return domParser.parseFromString(body, "text/html");
}

function getHeader(headers, name) {
  if (!headers || !name) {
    return;
  }

  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === name.toLowerCase()) {
      return value;
    }
  }
}

function getBody(body) {
  if (body === null || typeof body === "undefined") {
    return body;
  }

  if (typeof body === "object") {
    return new TextDecoder("utf-8").decode(new Uint8Array(body));
  }
  return body;
}

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function compactValue(value) {
  if (typeof value === "undefined") {
    return;
  }
  if (value === null) {
    return null;
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  return JSON.stringify(value);
}

function summarizeContentBlock(block) {
  if (!isObject(block)) {
    return compactValue(block);
  }

  let result = takePresentFields(block, [
    "type",
    "text",
    "thinking",
    "signature",
    "id",
    "name",
    "input",
    "is_error",
  ]);

  if (typeof block.content !== "undefined") {
    result.content = summarizeContent(block.content);
  }
  if (block.source) {
    result.source = takePresentFields(block.source, ["type", "media_type", "url"]);
    if (typeof block.source.data !== "undefined") {
      result.source.data = `[base64:${String(block.source.data).length} chars]`;
    }
  }

  return result;
}

function summarizeContent(content) {
  if (Array.isArray(content)) {
    return content.map(summarizeContentBlock);
  }
  if (isObject(content) && content.type) {
    return summarizeContentBlock(content);
  }
  return compactValue(content);
}

function takePresentFields(body, fields) {
  let result = {};
  fields.forEach((field) => {
    if (typeof body[field] !== "undefined") {
      result[field] = body[field];
    }
  });
  return result;
}

function summarizeMessage(message) {
  if (!message) {
    return message;
  }

  let result = {
    role: message.role,
  };

  if (typeof message.name !== "undefined") {
    result.name = message.name;
  }
  if (typeof message.content !== "undefined") {
    result.content = summarizeContent(message.content);
  }
  if (typeof message.reasoning_content !== "undefined") {
    result.reasoning_content = message.reasoning_content;
  }
  if (typeof message.tool_call_id !== "undefined") {
    result.tool_call_id = message.tool_call_id;
  }
  if (typeof message.tool_calls !== "undefined") {
    result.tool_calls = message.tool_calls.map(summarizeToolCall);
  }
  if (typeof message.function_call !== "undefined") {
    result.function_call = message.function_call;
  }
  if (typeof message.refusal !== "undefined") {
    result.refusal = message.refusal;
  }

  return result;
}

function summarizeToolCall(toolCall) {
  if (!toolCall) {
    return toolCall;
  }

  let result = {
    id: toolCall.id,
    type: toolCall.type,
  };

  if (toolCall.function) {
    result.function = {
      name: toolCall.function.name,
      arguments: toolCall.function.arguments,
    };
  }

  return result;
}

function summarizeTool(tool) {
  if (!tool) {
    return tool;
  }

  if (tool.type === "function" && tool.function) {
    return {
      type: tool.type,
      function: {
        name: tool.function.name,
        description: tool.function.description,
        parameters: tool.function.parameters,
      },
    };
  }

  return tool;
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function isClaudeModel(model) {
  if (!isNonEmptyString(model)) {
    return false;
  }

  return /(^|[/.:])claude(?:[-._]|$)/.test(model.toLowerCase());
}

function inferFunctionToolShape(body) {
  if (!Array.isArray(body?.tools)) {
    return "responses";
  }

  if (
    body.tools.some(
      (tool) => tool?.type === "function" && isObject(tool.function),
    )
  ) {
    return "chat";
  }
  if (
    body.tools.some(
      (tool) => tool?.type === "function" && isNonEmptyString(tool.name),
    )
  ) {
    return "responses";
  }
  if (Array.isArray(body.input)) {
    return "responses";
  }

  return "chat";
}

function normalizeFunctionParameters(parameters) {
  if (!isObject(parameters)) {
    return parameters;
  }

  if (isNonEmptyString(parameters.type)) {
    return parameters;
  }

  return {
    type: "object",
    ...parameters,
  };
}

function canConvertNamespaceTool(tool) {
  return (
    isObject(tool) &&
    tool.type === "namespace" &&
    isNonEmptyString(tool.name) &&
    isNonEmptyString(tool.description) &&
    isObject(tool.parameters)
  );
}

function namespaceToolToFunctionTool(tool, shape) {
  let functionTool = {
    name: tool.name,
    description: tool.description,
    parameters: normalizeFunctionParameters(tool.parameters),
  };

  if (shape === "chat") {
    return {
      type: "function",
      function: functionTool,
    };
  }

  return {
    type: "function",
    ...functionTool,
  };
}

function getFunctionToolName(tool) {
  if (!isObject(tool) || tool.type !== "function") {
    return;
  }

  if (isNonEmptyString(tool.name)) {
    return tool.name;
  }
  if (isNonEmptyString(tool.function?.name)) {
    return tool.function.name;
  }
}

function getToolChoiceName(toolChoice) {
  if (!isObject(toolChoice)) {
    return;
  }

  if (isNonEmptyString(toolChoice.name)) {
    return toolChoice.name;
  }
  if (isNonEmptyString(toolChoice.function?.name)) {
    return toolChoice.function.name;
  }
}

function getToolName(tool) {
  if (!isObject(tool)) {
    return;
  }

  if (isNonEmptyString(tool.name)) {
    return tool.name;
  }
  if (isNonEmptyString(tool.function?.name)) {
    return tool.function.name;
  }
}

function getToolType(tool) {
  if (!isObject(tool)) {
    return;
  }

  if (isNonEmptyString(tool.type)) {
    return tool.type;
  }
}

function removeInvalidToolChoice(body, tools) {
  if (typeof body.tool_choice === "undefined") {
    return false;
  }

  if (!tools.length) {
    delete body.tool_choice;
    delete body.parallel_tool_calls;
    return true;
  }

  let toolChoiceName = getToolChoiceName(body.tool_choice);
  if (!toolChoiceName) {
    return false;
  }

  let availableToolNames = tools.map(getFunctionToolName).filter(Boolean);
  if (availableToolNames.includes(toolChoiceName)) {
    return false;
  }

  delete body.tool_choice;
  return true;
}

function recordSkippedTool(summary, tool) {
  let type = getToolType(tool) || "[unknown]";
  let name = getToolName(tool) || type;

  summary.skipped += 1;
  summary.skippedTools.push({ type, name });
  summary.skippedTypes[type] = (summary.skippedTypes[type] || 0) + 1;
}

function createClaudeRequestSummary(body, enabled) {
  return {
    model: body.model,
    enabled,
    shape: Array.isArray(body.tools) ? inferFunctionToolShape(body) : undefined,
    converted: 0,
    skipped: 0,
    convertedNames: [],
    skippedTools: [],
    skippedTypes: {},
    remainingTools: 0,
    removedToolChoice: false,
    removedFields: [],
  };
}

function removeClaudeUnsupportedFields(body, summary) {
  ["metadata", "client_metadata"].forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      delete body[field];
      summary.removedFields.push(field);
    }
  });
}

function adaptClaudeUnsupportedTools(body, enabled) {
  if (!enabled || !isObject(body) || !isClaudeModel(body.model)) {
    return null;
  }

  let result = {
    ...body,
  };
  let summary = createClaudeRequestSummary(body, enabled);

  removeClaudeUnsupportedFields(result, summary);

  if (!Array.isArray(body.tools)) {
    if (!summary.removedFields.length) {
      return null;
    }

    return {
      body: result,
      summary,
    };
  }

  let tools = [];

  body.tools.forEach((tool) => {
    if (!isObject(tool)) {
      tools.push(tool);
      return;
    }

    if (tool.type === "function") {
      tools.push(tool);
      return;
    }

    if (tool.type === "namespace" && canConvertNamespaceTool(tool)) {
      tools.push(namespaceToolToFunctionTool(tool, summary.shape));
      summary.converted += 1;
      summary.convertedNames.push(tool.name);
      return;
    }

    recordSkippedTool(summary, tool);
  });

  if (!summary.converted && !summary.skipped && !summary.removedFields.length) {
    return null;
  }

  if (tools.length) {
    result.tools = tools;
  } else {
    delete result.tools;
  }
  let removedToolChoice = removeInvalidToolChoice(result, tools);
  summary.remainingTools = tools.length;
  summary.removedToolChoice = removedToolChoice;

  return {
    body: result,
    summary,
  };
}

function summarizeLiteLLMRequest(body) {
  if (!isObject(body)) {
    return body;
  }

  let result = takePresentFields(body, [
    "model",
    "stream",
    "temperature",
    "top_p",
    "max_tokens",
    "max_completion_tokens",
    "reasoning_effort",
    "tool_choice",
    "parallel_tool_calls",
    "response_format",
    "user",
    "system",
    "metadata",
    "stop_sequences",
  ]);

  if (Array.isArray(body.messages)) {
    result.messages = body.messages.map(summarizeMessage);
  }
  if (typeof body.prompt !== "undefined") {
    result.prompt = compactValue(body.prompt);
  }
  if (Array.isArray(body.input)) {
    result.input = body.input.map((item) =>
      isObject(item) && item.role ? summarizeMessage(item) : summarizeContent(item),
    );
  } else if (typeof body.input !== "undefined") {
    result.input = summarizeContent(body.input);
  }
  if (Array.isArray(body.tools)) {
    result.tools = body.tools.map(summarizeTool);
  }
  if (Array.isArray(body.functions)) {
    result.functions = body.functions;
  }

  return result;
}

function summarizeChoice(choice) {
  let result = takePresentFields(choice, [
    "index",
    "finish_reason",
    "logprobs",
  ]);

  if (choice.message) {
    result.message = summarizeMessage(choice.message);
  }
  if (choice.delta) {
    result.delta = summarizeMessage(choice.delta);
  }
  if (typeof choice.text !== "undefined") {
    result.text = choice.text;
  }

  return result;
}

function summarizeAnthropicJsonResponse(body) {
  let result = takePresentFields(body, [
    "id",
    "type",
    "role",
    "model",
    "stop_reason",
    "stop_sequence",
    "usage",
  ]);

  if (Array.isArray(body.content)) {
    result.content = summarizeContent(body.content);
  }
  if (body.error) {
    result.error = body.error;
  }

  return result;
}

function summarizeLiteLLMJsonResponse(body) {
  if (!isObject(body)) {
    return body;
  }

  if (body.type === "message" && Array.isArray(body.content)) {
    return summarizeAnthropicJsonResponse(body);
  }

  let result = takePresentFields(body, [
    "id",
    "object",
    "created",
    "model",
    "system_fingerprint",
    "service_tier",
    "usage",
  ]);

  if (Array.isArray(body.choices)) {
    result.choices = body.choices.map(summarizeChoice);
  }
  if (typeof body.output_text !== "undefined") {
    result.output_text = body.output_text;
  }
  if (Array.isArray(body.output)) {
    result.output = summarizeContent(body.output);
  }
  if (Array.isArray(body.content)) {
    result.content = summarizeContent(body.content);
  }
  if (body.error) {
    result.error = body.error;
  }

  return result;
}

function appendToolCallDelta(target, toolCallDelta) {
  if (!toolCallDelta) {
    return;
  }

  let index = toolCallDelta.index || 0;
  if (!target[index]) {
    target[index] = { function: { arguments: "" } };
  }

  let toolCall = target[index];
  if (toolCallDelta.id) {
    toolCall.id = toolCallDelta.id;
  }
  if (toolCallDelta.type) {
    toolCall.type = toolCallDelta.type;
  }
  if (toolCallDelta.function) {
    toolCall.function = toolCall.function || { arguments: "" };
    if (toolCallDelta.function.name) {
      toolCall.function.name = toolCallDelta.function.name;
    }
    if (toolCallDelta.function.arguments) {
      toolCall.function.arguments = `${toolCall.function.arguments || ""}${toolCallDelta.function.arguments}`;
    }
  }
}

function ensureAnthropicContentBlock(result, index, type) {
  if (!result.content[index]) {
    result.content[index] = { type };
  }
  return result.content[index];
}

function appendAnthropicContentDelta(result, event) {
  let index = event.index || 0;
  let delta = event.delta || {};
  let block = ensureAnthropicContentBlock(result, index, delta.type || "text");

  if (delta.type === "text_delta") {
    block.type = "text";
    block.text = `${block.text || ""}${delta.text || ""}`;
  } else if (delta.type === "thinking_delta") {
    block.type = "thinking";
    block.thinking = `${block.thinking || ""}${delta.thinking || ""}`;
  } else if (delta.type === "signature_delta") {
    block.signature = `${block.signature || ""}${delta.signature || ""}`;
  } else if (delta.type === "input_json_delta") {
    block.input_json = `${block.input_json || ""}${delta.partial_json || ""}`;
  }
}

function appendAnthropicContentBlockStart(result, event) {
  let index = event.index || 0;
  let block = event.content_block || {};
  result.content[index] = summarizeContentBlock(block);
  if (block.type === "tool_use" && typeof result.content[index].input === "undefined") {
    result.content[index].input_json = "";
  }
}

function finishAnthropicStream(result) {
  result.content.forEach((block) => {
    if (block && typeof block.input_json !== "undefined") {
      let input = parseJsonBody(block.input_json);
      block.input = input === null ? block.input_json : input;
      delete block.input_json;
    }
  });
}

function appendOpenAIStreamChoice(result, choice) {
  let index = choice.index || 0;
  if (!result.choices[index]) {
    result.choices[index] = {
      index,
      message: { role: undefined, content: "", reasoning_content: "" },
      tool_calls: [],
    };
  }

  let target = result.choices[index];
  if (choice.finish_reason) {
    target.finish_reason = choice.finish_reason;
  }

  let delta = choice.delta || {};
  if (delta.role) {
    target.message.role = delta.role;
  }
  if (typeof delta.content !== "undefined" && delta.content !== null) {
    target.message.content = `${target.message.content}${delta.content}`;
  }
  if (
    typeof delta.reasoning_content !== "undefined" &&
    delta.reasoning_content !== null
  ) {
    target.message.reasoning_content = `${target.message.reasoning_content}${delta.reasoning_content}`;
  }
  (delta.tool_calls || []).forEach((toolCallDelta) => {
    appendToolCallDelta(target.tool_calls, toolCallDelta);
  });
}

function finishOpenAIStream(result) {
  result.choices.forEach((choice) => {
    if (!choice.message.reasoning_content) {
      delete choice.message.reasoning_content;
    }
    if (!choice.tool_calls.length) {
      delete choice.tool_calls;
    } else {
      choice.message.tool_calls = choice.tool_calls.map(summarizeToolCall);
      delete choice.tool_calls;
    }
  });
}

function summarizeLiteLLMStreamResponse(body) {
  let result = {
    stream: true,
    chunks: 0,
    choices: [],
    content: [],
  };

  String(body || "")
    .split("\n")
    .forEach((line) => {
      line = line.trim();
      if (!line.startsWith("data:")) {
        return;
      }

      let data = line.substring(5).trim();
      if (!data || data === "[DONE]") {
        return;
      }

      let chunk = parseJsonBody(data);
      if (!chunk) {
        return;
      }

      result.chunks += 1;
      if (chunk.model) {
        result.model = chunk.model;
      }
      if (chunk.id) {
        result.id = chunk.id;
      }
      if (chunk.usage) {
        result.usage = chunk.usage;
      }

      if (Array.isArray(chunk.choices)) {
        chunk.choices.forEach((choice) => appendOpenAIStreamChoice(result, choice));
      }

      if (chunk.type === "message_start" && chunk.message) {
        result.id = chunk.message.id || result.id;
        result.model = chunk.message.model || result.model;
        result.role = chunk.message.role;
        result.usage = chunk.message.usage || result.usage;
      } else if (chunk.type === "content_block_start") {
        appendAnthropicContentBlockStart(result, chunk);
      } else if (chunk.type === "content_block_delta") {
        appendAnthropicContentDelta(result, chunk);
      } else if (chunk.type === "message_delta") {
        result.stop_reason = chunk.delta?.stop_reason || result.stop_reason;
        result.stop_sequence = chunk.delta?.stop_sequence || result.stop_sequence;
        result.usage = chunk.usage || result.usage;
      } else if (chunk.type === "error") {
        result.error = chunk.error;
      }
    });

  finishOpenAIStream(result);
  finishAnthropicStream(result);

  if (!result.choices.length) {
    delete result.choices;
  }
  if (!result.content.length) {
    delete result.content;
  }

  return result;
}

function summarizeLiteLLMResponse(body, headers) {
  let contentType = (getHeader(headers, "Content-Type") || "").toLowerCase();
  if (contentType.includes("text/event-stream") || /^data:/m.test(body || "")) {
    return summarizeLiteLLMStreamResponse(body);
  }

  let jsonBody = parseJsonBody(body);
  if (jsonBody !== null) {
    return summarizeLiteLLMJsonResponse(jsonBody);
  }

  return body;
}

function removeContentFromSummary(value, options = {}) {
  if (Array.isArray(value)) {
    return value.map((item) => removeContentFromSummary(item, options));
  }

  if (!isObject(value)) {
    return value;
  }

  let result = {};
  Object.entries(value).forEach(([key, item]) => {
    if (["content", "messages"].includes(key)) {
      return;
    }
    if (key === "system" && !options.keepSystem) {
      return;
    }
    if (key === "tools" && !options.keepTools) {
      return;
    }
    if (key === "body" && typeof item === "string") {
      result[key] = `[raw:${item.length} chars]`;
      return;
    }
    result[key] = removeContentFromSummary(item, options);
  });
  return result;
}

function summarizeContentField(content, options = {}) {
  if (options.onlyLastArrayContent && Array.isArray(content)) {
    if (!content.length) {
      return [];
    }
    return summarizeContentBlock(content[content.length - 1]);
  }
  return summarizeContent(content);
}

function collectContentFields(value, path = "", options = {}) {
  let result = [];

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      result = result.concat(collectContentFields(item, `${path}[${index}]`, options));
    });
    return result;
  }

  if (!isObject(value)) {
    return result;
  }

  Object.entries(value).forEach(([key, item]) => {
    let currentPath = path ? `${path}.${key}` : key;
    if (key === "content") {
      result.push({
        path: currentPath,
        content: summarizeContentField(item, options),
      });
      return;
    }
    result = result.concat(collectContentFields(item, currentPath, options));
  });

  return result;
}

function summarizeBodyFields(body, options = {}) {
  if (typeof body === "string") {
    return `[raw:${body.length} chars]`;
  }
  return removeContentFromSummary(body, options);
}

function logLiteLLMContent(prefix, scriptType, contentFields, extra = {}) {
  if (!contentFields.length && !Object.keys(extra).length) {
    return;
  }

  console.log(
    `[${prefix}]:${JSON.stringify(
      {
        scriptType,
        ...extra,
        content: contentFields,
      },
      null,
      4,
    )}`,
  );
}

function isTruthyArgument(value) {
  return value === true || value === "true" || value === 1 || value === "1";
}

async function main() {
  let type = getScriptType();
  let ts = Math.floor(Date.now() / 1000);
  if (["request", "response"].includes(type)) {
    let keepRequestSystem = isTruthyArgument(
      getScriptArgument("keepRequestSystem"),
    );
    let keepRequestTools = isTruthyArgument(
      getScriptArgument("keepRequestTools"),
    );
    let filterClaudeNamespaceTools = isTruthyArgument(
      getScriptArgument("filterClaudeNamespaceTools"),
    );
    let filterClaudeUnsupportedTools =
      filterClaudeNamespaceTools ||
      isTruthyArgument(getScriptArgument("filterClaudeUnsupportedTools"));
    let requestBody = getBody($request.body);
    let requestJson = parseJsonBody(requestBody, { logInvalid: false });
    let claudeToolsResult =
      type === "request"
        ? adaptClaudeUnsupportedTools(requestJson, filterClaudeUnsupportedTools)
        : null;
    if (claudeToolsResult) {
      requestJson = claudeToolsResult.body;
      requestBody = JSON.stringify(requestJson);
    }

    let data = {
      type: "litellm",
      scriptType: type,
      timestamp: ts,
      request: {
        url: $request.url,
        method: $request.method,
        path: new URL($request.url).pathname,
        body: summarizeLiteLLMRequest(requestJson || requestBody),
      },
    };

    if (typeof $response !== "undefined") {
      let responseBody = getBody($response.body);
      data.response = {
        status: $response.status,
        body: summarizeLiteLLMResponse(responseBody, $response.headers),
      };
    }

    if (type === "request") {
      logLiteLLMContent(
        "LiteLLMReqContent",
        type,
        collectContentFields(data.request.body, "", {
          onlyLastArrayContent: true,
        })
          .filter((item) => item.path.includes("message"))
          .filter(
            (item) => !["tool_result", "tool_use"].includes(item.content?.type),
          )
          .slice(-3),
        {
          request: {
            url: data.request.url,
            method: data.request.method,
            path: data.request.path,
            body: summarizeBodyFields(data.request.body, {
              keepSystem: keepRequestSystem,
              keepTools: keepRequestTools,
            }),
          },
          claudeTools: claudeToolsResult?.summary,
        },
      );
    }

    if (type === "response" && typeof data.response !== "undefined") {
      logLiteLLMContent(
        "LiteLLMResContent",
        type,
        collectContentFields(data.response.body),
        { body: summarizeBodyFields(data.response.body) },
      );
    }

    if (claudeToolsResult) {
      return { body: requestBody };
    }
  }

  return {};
}

(async () => {
  main()
    .then((result) => {
      $done(result || {});
    })
    .catch((error) => {
      console.log(`[Error]: ${error?.message || error}`);
      $done({});
    });
})();
