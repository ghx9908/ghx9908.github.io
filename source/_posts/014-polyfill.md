---
title: polyfill 实践
date: 2023-03-10 18:00:00
tags: webpack
categories: 工程化
author: 高红翔
---

## 1. babel-polyfill

- `Babel`默认只转换新的`Javascript`语法，而不转换新的 API，比如

  - Iterator, Generator, Set, Maps, Proxy, Reflect,Symbol,Promise 等全局对象

  - 在全局对象上的方法,比如说 ES6 在 Array 对象上新增了`Array.find`方法，Babel 就不会转码这个方法

- 如果想让这个方法运行，必须使用 `babel-polyfill`来转换等
- Babel 7.4 之后不再推荐使用@babel/polyfill
- babel v7 推荐使用@babel/preset-env 代替以往的诸多 polyfill 方案

```js
 npm install --save core-js@2    core-js@3  @babel/polyfill
```

### 1.1、 useBuiltIns: false

- `babel-polyfill` 它是通过**向全局对象和内置对象的`prototype`上添加方法来实现的**。比如运行环境中不支持`Array.prototype.find`方法，引入`polyfill`, 我们就可以使用`ES6`方法来编写了，但是**缺点就是会造成全局空间污染**

- `useBuiltIns: false` 此时不对 `polyfill` 做操作。如果引入 `@babel/polyfill`，则**无视配置的浏览器兼容，引入所有的 `polyfill`**

- `@babel/preset-env`默认只支持语法转化，需要开启`useBuiltIns`配置才能转化 API 和实例方法

### 1.2、useBuiltIns: "entry"

- 在项目入口引入一次（多次引入会报错）
- "useBuiltIns": "entry" 根据配置的浏览器兼容，引入浏览器不兼容的 polyfill。需要在入口文件手动添加 `import '@babel/polyfill'`，会自动根据 browserslist 替换成浏览器不兼容的所有 polyfill
- 这里需要指定 core-js 的版本,`corejs`默认是 2,
- 如果配置 `corejs: 3`, 则`import '@babel/polyfill'` 需要改成 `import 'core-js/stable';import 'regenerator-runtime/runtime';`
- - `corejs`默认是 2

### 1.3、 "useBuiltIns": "usage"

- "useBuiltIns": "usage" `usage` 会根据配置的浏览器兼容，以及你代码中用到的 API 来进行 polyfill，实现了按需添加
- 当设置为 usage 时，polyfill 会自动按需添加，不再需要手工引入`@babel/polyfill`

## 2. babel-runtime

- Babel 为了解决全局空间污染的问题，提供了单独的包[babel-runtime](https://babeljs.io/docs/en/babel-runtime)用以提供编译模块的工具函数
- 简单说 `babel-runtime` 更像是一种按需加载的实现，比如你哪里需要使用 `Promise`，只要在这个文件头部`import Promise from 'babel-runtime/core-js/promise'`就行了

## 3. babel-plugin-transform-runtime

- @babel/plugin-transform-runtime 插件是为了解决

  - 多个文件重复引用 相同 helpers(帮助函数)=>提取运行时
  - 新 API 方法全局污染 -> 局部引入

- 启用插件`babel-plugin-transform-runtime`后，Babel 就会使用`babel-runtime`下的工具函数

- `babel-plugin-transform-runtime`插件能够将这些工具函数的代码转换成`require`语句，指向为对`babel-runtime`的引用

- ` babel-plugin-transform-runtime`就是可以在我们使用新 API 时自动 import
  `babel-runtime`里面的`  polyfill`

  - 当我们使用 `async/await` 时，自动引入 `babel-runtime/regenerator`

  - 当我们使用 ES6 的静态事件或内置对象时，自动引入 `babel-runtime/core-js`

  - 移除内联`babel helpers`并替换使用`babel-runtime/helpers` 来替换

**helpers: true**

- 移除内联 babel helpers 并替换使用`babel-runtime/helpers` 来替换
- 避免内联的 helper 代码在多个文件重复出现

  **regenerator: true**

- 是否开启`generator`函数转换成使用`regenerator runtime`来避免污染全局域

## 4. 最佳实践

- @babel/preset-env 和 plugin-transform-runtime 二者都可以设置使用 corejs 来处理 polyfill

### 4.1 项目开发

- useBuiltIns 使用 usage

- plugin-transform-runtime 只使用其移除内联复用的辅助函数的特性，减小打包体积

  ```json
  {
    "presets": [
        [
            "@babel/preset-env",
            {
                "useBuiltIns": "usage",//实现polyfill 项目中不用担心会污染全局作用域
                "corejs": 3
            }
        ]
    ],
    "plugins": [
        [
            "@babel/plugin-transform-runtime",
            {
                "corejs": false，//不属于此插件提供的polyfill
                 helpers:true,//使用此插件,复用帮助 方法，减少文件体积
                regenerator:false
            }
        ]
    ]
  }
  ```

### 4.2 类库开发

- 类库开发尽量不使用污染全局环境的`polyfill`，因此`@babel/preset-env`只发挥语法转换的功能
- polyfill 由`@babel/plugin-transform-runtime`来处理，推荐使用 core-js@3

```js
{
    "presets": [
        [
            "@babel/preset-env"
        ]
    ],
    "plugins": [
        [
             "@babel/plugin-transform-runtime",
                                    {
                                        corejs:3,//使用此插件提供的polyfill,此插件不会污染全局环境
                                        helpers:true,//使用此插件,复用帮助 方法，减少文件体积
                                        regenerator:false
                                    }
        ]
    ]
}

```

## 5. polyfill-service

- [polyfill.io](https://polyfill.io/v3/)自动化的 JavaScript Polyfill 服务
- [polyfill.io](https://polyfill.io/v3/)通过分析请求头信息中的 UserAgent 实现自动加载浏览器所需的 polyfills

```js
<script src="https://polyfill.io/v3/polyfill.min.js"></script>
```

## 总结

**babel-polyfill**

```js
useBuiltIns: false

- 在项目入口引入一次（多次引入会报错)
- 则无视配置的浏览器兼容，引入所有的 `polyfill`
- `babel-polyfill` 它是通过向全局对象和内置对象的`prototype`上添加方法来实现的

useBuiltIns: "entry" + corejs

- 在项目入口引入一次（多次引入会报错
- 根据配置的浏览器兼容，引入浏览器不兼容的 polyfill


 useBuiltIns: "usage"

- 根据配置的浏览器兼容，以及你代码中用到的 API 来进行 polyfill，实现了按需添加
- 无需手动引入



```

- 缺点 污染全局

**babel-runtime**

- Babel 为了解决全局空间污染的问题，提供了单独的包[babel-runtime](https://babeljs.io/docs/en/babel-runtime)用以提供编译模块的工具函数
- 缺点代码中每个头部都需要手动引入需要的模块

**babel-plugin-transform-runtime**

- 多个文件重复引用 相同 helpers(帮助函数)=>提取运行时
- 新 API 方法全局污染 -> 局部引入
