---
title: cookie和session原理
author: 高红翔
date: 2024-09-27 18:28:27
categories:
tags:
---

### **Cookie 与 Session 的区别与理解**

#### **1. Cookie：**

**Cookie** 是存储在客户端（浏览器）上的小数据文件，用来保持用户的状态和信息。它由服务器生成，并通过 HTTP 响应头发送到客户端，客户端每次请求都会将该 Cookie 发送给服务器。

- **用途**：主要用于识别用户、保存登录状态、记录用户偏好、跟踪用户行为等。
- **存储位置**：保存在用户的浏览器中。
- **大小限制**：每个 Cookie 的大小一般不超过 4KB。
- **生命周期**：可以设置 `expires` 或 `max-age` 来定义 Cookie 的有效期。短期的 Cookie 可能会在关闭浏览器时删除，长期的 Cookie 则会存储在客户端直到过期或被手动删除。
- **安全性**：由于保存在客户端，安全性较低，容易被篡改或拦截，因此敏感信息不应该直接存储在 Cookie 中。可以通过设置 `HttpOnly` 和 `Secure` 属性增强安全性。
- **跨域问题**：浏览器同源策略限制了 Cookie 的跨域使用，一般只有相同域名的服务器才能读取该域名下的 Cookie。

#### **2. Session：**

**Session** 是存储在服务器端的用户会话数据，用于在多个请求中保持用户的状态。与 Cookie 配合使用，通常会将一个唯一的 Session ID 存储在 Cookie 中，服务器通过该 ID 识别客户端的 Session 数据。

- **用途**：用于存储用户的登录信息、购物车状态等需要保留在服务器上的数据。
- **存储位置**：保存在服务器端，每个用户的 Session 都有一个独立的 ID。
- **大小限制**：Session 的大小没有严格限制，具体取决于服务器的存储能力。
- **生命周期**：Session 一般是短期的，当用户关闭浏览器或会话超时，Session 会自动失效。服务端也可以通过配置来设置 Session 的过期时间。
- **安全性**：由于数据保存在服务器端，安全性比 Cookie 更高，但如果 Session ID 泄露，也可能导致安全问题。
- **跨域问题**：Session 通常不涉及跨域问题，Session 数据保存在服务器端，客户端通过同一域下的 Cookie 中的 Session ID 来保持会话。

#### **Cookie 与 Session 的对比**：

| 特性     | Cookie                       | Session                          |
| -------- | ---------------------------- | -------------------------------- |
| 存储位置 | 客户端浏览器                 | 服务器端                         |
| 数据大小 | 一般不超过 4KB               | 没有严格限制，依赖服务器存储     |
| 生命周期 | 可以手动设置，长期或短期     | 一般在关闭浏览器或超时后失效     |
| 安全性   | 较低，容易被篡改             | 较高，数据存储在服务器端         |
| 性能影响 | 占用客户端存储空间，影响较小 | 占用服务器资源，用户量大时需优化 |
| 跨域访问 | 受限于浏览器同源策略         | 与 Cookie 配合使用，不直接受限   |

#### **应用场景**：

- **Cookie** 更适合保存一些不太敏感的用户偏好、网站设置、非敏感的标识符等信息。
- **Session** 更适合保存用户登录状态、购物车信息等需要较高安全性的内容。

#### **Cookie 与 Session 的结合**：

通常会使用 **Session + Cookie** 的方式来实现登录等功能。服务器创建 Session 并将 Session ID 存放在客户端的 Cookie 中，客户端每次请求时都会携带该 Cookie，服务器通过 Session ID 识别用户身份。

### cookie 签名 核心代码

```js
function Cookies(request, response, options) {
  if (!(this instanceof Cookies)) return new Cookies(request, response, options)

  this.secure = undefined
  this.request = request
  this.response = response

  // 创建Keygrip实例
  if (options) {
    if (Array.isArray(options)) {
      // array of key strings
      deprecate('"keys" argument; provide using options {"keys": [...]}')
      this.keys = new Keygrip(options)
    } else if (options.constructor && options.constructor.name === "Keygrip") {
      // any keygrip constructor to allow different versions
      deprecate('"keys" argument; provide using options {"keys": keygrip}')
      this.keys = options
    } else {
      this.keys = Array.isArray(options.keys) ? new Keygrip(options.keys) : options.keys
      this.secure = options.secure
    }
  }
}

Cookies.prototype.set = function (name, value, opts) {
  var res = this.response,
    req = this.request,
    headers = res.getHeader("Set-Cookie") || [],
    cookie = new Cookie(name, value, opts),
    signed = opts && opts.signed !== undefined ? opts.signed : !!this.keys

  if (typeof headers == "string") headers = [headers]

  pushCookie(headers, cookie) // 保存当前 cookie

  //签名
  if (opts && signed) {
    if (!this.keys) throw new Error(".keys required for signed cookies")
    cookie.value = this.keys.sign(cookie.toString()) // 钓鱼 sign 方法签名
    cookie.name += ".sig"
    pushCookie(headers, cookie)
  }

  var setHeader = res.set ? http.OutgoingMessage.prototype.setHeader : res.setHeader
  setHeader.call(res, "Set-Cookie", headers)
  return this
}

function getPattern(name) {
  if (cache[name]) return cache[name]

  return (cache[name] = new RegExp("(?:^|;) *" + name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&") + "=([^;]*)"))
}
Cookies.prototype.get = function (name, opts) {
  var sigName = name + ".sig",
    header,
    match,
    value,
    remote,
    data,
    index,
    signed = opts && opts.signed !== undefined ? opts.signed : !!this.keys

  header = this.request.headers["cookie"]
  if (!header) return

  //匹配对应的value
  match = header.match(getPattern(name))
  if (!match) return

  value = match[1]
  // 判断是否需要签名
  if (!opts || !signed) return value
  //获取签名后的 cookie
  remote = this.get(sigName)
  if (!remote) return

  data = name + "=" + value
  if (!this.keys) throw new Error(".keys required for signed cookies")
  // 对数据进行再次签名比较 返回索引
  index = this.keys.index(data, remote)

  if (index < 0) {
    // 签名不匹配的话就把签名coolie 置为 null
    this.set(sigName, null, { path: "/", signed: false })
  } else {
    // 成功的话再次签名
    index && this.set(sigName, this.keys.sign(data), { signed: false })
    return value
  }
}

Cookie.prototype.toString = function () {
  return this.name + "=" + this.value
}

Cookie.prototype.toHeader = function () {
  var header = this.toString()

  if (this.maxAge) this.expires = new Date(Date.now() + this.maxAge)

  if (this.path) header += "; path=" + this.path
  if (this.expires) header += "; expires=" + this.expires.toUTCString()
  if (this.domain) header += "; domain=" + this.domain
  if (this.sameSite) header += "; samesite=" + (this.sameSite === true ? "strict" : this.sameSite.toLowerCase())
  if (this.secure) header += "; secure"
  if (this.httpOnly) header += "; httponly"

  return header
}

function pushCookie(headers, cookie) {
  if (cookie.overwrite) {
    for (var i = headers.length - 1; i >= 0; i--) {
      if (headers[i].indexOf(cookie.name + "=") === 0) {
        headers.splice(i, 1)
      }
    }
  }

  headers.push(cookie.toHeader())
}
```

#### Keygrip

```js
/*!
 * keygrip
 * Copyright(c) 2011-2014 Jed Schmidt
 * MIT Licensed
 */

"use strict"

// 引入用于安全字符串比较的tsscmp库
var compare = require("tsscmp")
// 引入Node.js的crypto模块，用于加密操作
var crypto = require("crypto")

// Keygrip类用于创建基于HMAC的签名和验证工具
// keys是用于签名的密钥数组，algorithm是加密算法，encoding是编码方式
function Keygrip(keys, algorithm, encoding) {
  // 如果没有指定算法，则默认为"sha1"
  if (!algorithm) algorithm = "sha1"
  // 如果没有指定编码方式，则默认为"base64"
  if (!encoding) encoding = "base64"
  // 如果调用时没有使用new关键字，自动返回新实例
  if (!(this instanceof Keygrip)) return new Keygrip(keys, algorithm, encoding)

  // 确保传入的keys数组不为空，并且有至少一个密钥
  if (!keys || !(0 in keys)) {
    throw new Error("Keys must be provided.") // 如果未提供keys则抛出错误
  }

  // 内部的sign函数，用于对数据进行HMAC签名
  // data是要签名的数据，key是用于签名的密钥
  function sign(data, key) {
    return crypto
      .createHmac(algorithm, key) // 使用指定的算法和密钥创建HMAC对象
      .update(data) // 用数据更新HMAC对象
      .digest(encoding) // 生成HMAC的摘要，按指定编码返回
      .replace(/\/|\+|=/g, function (x) {
        // 将生成的签名中的特殊字符进行替换
        return { "/": "_", "+": "-", "=": "" }[x] // "/"替换为"_"，"+"替换为"-"，"="去掉
      })
  }

  // 对外暴露的签名方法，默认使用keys数组的第一个密钥
  this.sign = function (data) {
    return sign(data, keys[0]) // 使用第一个密钥对数据签名
  }

  // verify方法，用于验证数据和其签名是否匹配
  // data是原始数据，digest是待验证的签名
  this.verify = function (data, digest) {
    return this.index(data, digest) > -1 // 如果数据的签名匹配keys数组中的任一密钥，则返回true
  }

  // index方法，用于查找匹配的数据签名的密钥索引
  // 返回匹配密钥的索引，若找不到则返回-1
  this.index = function (data, digest) {
    // 遍历所有keys，用每一个key进行签名，然后和传入的digest进行比较
    for (var i = 0, l = keys.length; i < l; i++) {
      // 使用tsscmp库进行安全比较，防止时间攻击
      if (compare(digest, sign(data, keys[i]))) {
        return i // 如果找到匹配的签名，返回该密钥的索引
      }
    }

    // 如果没有找到匹配的密钥，返回-1
    return -1
  }
}

// 防止用户直接调用Keygrip的类方法（sign、verify、index），提示正确用法
Keygrip.sign =
  Keygrip.verify =
  Keygrip.index =
    function () {
      throw new Error("Usage: require('keygrip')(<array-of-keys>)") // 抛出错误，提示正确用法
    }

// 导出Keygrip模块，供其他模块使用
module.exports = Keygrip
```

#### Cookie 签名的核心过程总结

1. **初始化`Keygrip`实例**：
   - `Cookies`类在初始化时，会根据传入的`options`创建一个`Keygrip`实例，用于对 cookie 进行签名和验证。如果`options`中包含`keys`数组，则使用该数组初始化`Keygrip`；如果`options`已经是`Keygrip`实例，直接使用该实例。
2. **设置 Cookie 时的签名流程 (`set`方法)**：
   - 当通过`set`方法设置 Cookie 时，先将 Cookie 添加到`Set-Cookie`响应头中。
   - 如果`signed`选项被启用，系统会对 Cookie 的值进行签名。签名过程通过调用`Keygrip`实例的`sign`方法实现，将生成的签名添加到新的 Cookie 项中（名称为`cookieName.sig`）。
   - 签名的原理是使用 HMAC 加密算法（默认是`SHA1`）对 Cookie 数据进行加密处理，生成签名。此签名确保 Cookie 值没有被篡改。
3. **获取 Cookie 时的签名验证 (`get`方法)**：
   - 通过`get`方法获取 Cookie 时，首先匹配请求头中的`cookie`字段，查找特定 Cookie 的值。
   - 如果该 Cookie 是签名的，系统会查找对应的签名 Cookie（名称为`cookieName.sig`），并使用`Keygrip`实例的`index`方法验证该签名是否合法。
   - 验证时，会重新对 Cookie 的数据进行签名，并与客户端传回的签名进行比较。若匹配成功，则表示该 Cookie 没有被篡改，返回 Cookie 值；否则将签名的 Cookie 值置为`null`。
4. **签名与验证的具体实现 (`Keygrip` 类)**：
   - `Keygrip`使用 HMAC 算法对数据进行加密，并通过`compare`库来进行安全比较，防止时间攻击。
   - `sign`方法用于对数据进行签名，并将生成的摘要进行编码处理。
   - `verify`方法用于验证签名，通过遍历密钥数组对数据进行签名，检查是否有匹配的密钥。
   - `index`方法用于返回匹配的密钥索引，若找到匹配的签名则返回密钥的位置，否则返回`-1`。

#### 总结

整个过程的核心是通过 HMAC 签名和验证机制保证 Cookie 的完整性和安全性。在设置 Cookie 时会生成一个基于密钥的签名，并将其附加到 Cookie 响应中。在客户端返回 Cookie 时，通过验证签名，确保 Cookie 的值未被篡改。如果签名不匹配，系统会自动删除该签名的 Cookie
