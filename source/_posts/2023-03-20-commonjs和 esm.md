---
title: CommonJS 和 ES Modules
author: 高红翔
date: 2023-03-20 11:00:58
categories:
tags:
---

### **在使用上的差别主要有：**

- `CommonJS` 模块输出的是一个值的拷贝，ES6 模块输出的是值的引用。

- `CommonJS` 模块是运行时加载，ES6 模块是编译时输出接口（静态编译）。
- `CommonJs` 是单个值导出，`ES6 Module` 可以导出多个
- `CommonJs` 是动态语法可以写在判断里，`ES6 Module` 静态语法只能写在顶层
- `CommonJs` 的 `this` 是当前模块，`ES6 Module` 的 `this` 是 `undefined`
- `CommonJS`是服务器端模块的规范，`CommonJS`规范加载模块是同步的

**CommonJS** 和 **ES Modules (ESM)** 是两种 JavaScript 中的模块化系统，它们的主要区别在于模块的定义方式、加载机制、语法和使用场景。下面从多个维度来对比这两者的区别：

### 1. **模块定义方式和语法**

- **CommonJS**：使用 `require` 语法引入模块，用 `module.exports` 或 `exports` 导出模块。CommonJS 是模块系统的早期实现，主要用于 Node.js 服务器端开发。

  ```js
  // 导出（CommonJS）
  module.exports = {
    greet: function () {
      console.log("Hello World")
    },
  }
  // 导入（CommonJS）
  const myModule = require("./myModule")
  myModule.greet() // 输出：Hello World
  ```

- **ES Modules (ESM)**：使用 `import` 和 `export` 语法导入和导出模块。ESM 是 JavaScript 官方标准化的模块系统，原生支持浏览器和 Node.js。

  ```js
  // 导出（ES Modules）
  export function greet() {
    console.log("Hello World")
  }

  // 导入（ES Modules）
  import { greet } from "./myModule.js"
  greet() // 输出：Hello World
  ```

### 2. **加载机制**

- **CommonJS**：**同步加载**模块。这意味着在 `require` 调用时，Node.js 会立即执行并返回模块的内容，这种同步特性使得它非常适合在服务器端使用，因为服务器端代码不会受到网络延迟等因素的影响。
  - CommonJS 的模块在首次加载时会被执行，结果会被缓存，后续的 `require` 调用会直接返回缓存的结果，而不会重复执行模块代码。
- **ESM**：**异步加载**模块。ESM 的 `import` 语句是基于 Promise 的，这使得模块加载可以是异步的，尤其适用于浏览器端，避免阻塞页面的加载。
  - ESM 在加载时会进行静态分析，因此在编译阶段就能确定模块依赖关系，这样可以实现更好的优化和提前报错。

### 3. **运行时与编译时**

- **CommonJS**：是**运行时**模块解析系统。`require` 语句会在代码运行时被解释执行，依赖可以根据运行时的条件动态加载。

  ```js
  if (someCondition) {
    const moduleA = require("./moduleA")
  } else {
    const moduleB = require("./moduleB")
  }
  ```

- **ESM**：是**编译时**模块系统，导入模块的声明必须位于代码的顶层，不能在条件语句或函数中动态引入。这是为了让编译器能在编译时确定模块的依赖关系。

  ```js
  // 以下是非法的，在 ESM 中不能使用动态导入
  if (someCondition) {
    import { funcA } from "./moduleA.js" // 错误
  }
  ```

### 4. **导出机制**

- **CommonJS**：通过 `module.exports` 或 `exports` 导出对象、函数或变量。它可以导出整个对象或模块的不同部分。

  ```js
  // 导出单个对象或函数
  module.exports = function greet() {
    console.log("Hello")
  }

  // 导出多个值
  exports.greet = function () {
    console.log("Hello")
  }
  ```

- **ESM**：使用 `export` 关键字导出，可以进行**命名导出**或**默认导出**。命名导出允许导出多个变量或函数，而默认导出则只能导出一个默认值。

  ```js
  // 命名导出
  export const name = "John"
  export function greet() {
    console.log("Hello")
  }

  // 默认导出
  export default function () {
    console.log("Default Export")
  }
  ```

### 5. **模块的缓存**

- **CommonJS**：模块在第一次加载后会被缓存，后续对该模块的 `require` 调用会返回缓存的结果，而不是重新执行模块代码。

  ```js
  // 第一次 require 模块时，模块代码会执行
  const moduleA = require("./moduleA")

  // 第二次 require 相同模块时，返回的是缓存的结果
  const moduleA_again = require("./moduleA")
  ```

- **ESM**：同样会对模块进行缓存，首次加载后，模块会被缓存并复用。和 CommonJS 一样，模块只会在第一次加载时执行代码。

### 6. **顶层作用域**

- **CommonJS**：每个模块都有自己的**独立作用域**，而不是全局作用域。模块内部的变量和函数默认是私有的，只有通过 `module.exports` 或 `exports` 公开的部分才对外可见。
- **ESM**：同样具有模块作用域，默认情况下，模块内部的变量、函数等都是私有的，只有通过 `export` 导出的部分才对外可见。

### 7. **模块循环依赖**

- **CommonJS**：允许并且能够处理循环依赖问题，但在循环依赖的情况下，只有模块的部分代码会被导入（即已执行的部分）。

  ```js
  // moduleA.js
  const moduleB = require("./moduleB")
  console.log("Module A")

  // moduleB.js
  const moduleA = require("./moduleA")
  console.log("Module B")
  ```

- **ESM**：也允许循环依赖，但 ESM 会确保模块的所有依赖关系都被初始化，在加载时会执行一部分已解析的模块代码。因此 ESM 更适合处理循环依赖。

### 8. **浏览器支持**

- **CommonJS**：主要用于 Node.js 环境，浏览器原生不支持 CommonJS 模块化系统。在浏览器中使用 CommonJS 通常需要通过打包工具（如 Webpack 或 Browserify）将模块转换成浏览器可执行的代码。

- **ESM**：浏览器原生支持 ES Modules，尤其是在现代浏览器中，使用 `<script type="module">` 标签可以直接加载 ES 模块，无需额外的打包工具。

  ```html
  <script type="module" src="app.js"></script>
  ```

### 9. **使用场景**

- **CommonJS**：由于它是 Node.js 的标准模块系统，主要用于服务器端开发。
- **ESM**：逐渐成为 JavaScript 的标准模块系统，被广泛应用于浏览器和 Node.js 环境中。

### 10. **默认导出与命名导出**

- **CommonJS**：没有默认导出的概念，模块可以导出单个对象或多个属性，但没有专门的语法区分默认导出和命名导出。
- **ESM**：支持**默认导出**和**命名导出**。一个模块可以有多个命名导出，但只能有一个默认导出。

### 11 值得引用和拷贝

- **CommonJS 模块输出的是值的拷贝**：当使用 CommonJS `require` 引入一个模块时，模块中的值会被**拷贝**到引入模块的地方。也就是说，模块的导出值是**在模块首次加载时计算并返回**的，而后续对该模块的 `require` 调用都会返回相同的拷贝。**如果模块内部的值发生变化，这种变化不会影响到已经引入的拷贝**。

- **ES6 模块输出的是值的引用**：当使用 ES Modules (`import/export`) 引入一个模块时，模块中的导出值是**引用**，即导出的是一个“绑定”，不会被拷贝。如果模块内部的值发生变化，**在其他模块中通过 `import` 导入的值也会随之更新**，因为它们引用的是同一个内存地址。

#### 1. **CommonJS 模块输出的是值的拷贝**

CommonJS 的模块机制是运行时加载，模块在首次被 `require` 时会执行整个模块代码，并缓存导出的结果。后续的 `require` 操作不会重新执行模块代码，而是直接使用缓存的拷贝。

```js
// counter.js (CommonJS 模块)
let count = 0

function increment() {
  count++
}

module.exports = {
  count,
  increment,
}
```

```js
// main.js (CommonJS 导入)
const counter = require("./counter")

console.log(counter.count) // 输出 0
counter.increment()
console.log(counter.count) // 输出 0 （模块导出的 count 是拷贝，值不会更新）
```

在这个例子中，`counter.js` 模块导出的 `count` 值在 `require` 时就被固定下来。即使 `counter.increment()` 修改了模块内部的 `count`，但由于 `require` 返回的是**初始值的拷贝**，所以 `main.js` 中的 `count` 不会更新。

#### 2. **ES Modules 输出的是值的引用**

ES6 的模块机制是编译时加载，`import` 导入的是一个对原模块的**引用**，即使原模块中的变量发生变化，导入模块中的值也会实时更新。

```js
// counter.js (ES Modules)
let count = 0

export function increment() {
  count++
}

export { count }
```

```js
// main.js (ES Modules 导入)
import { count, increment } from "./counter.js"

console.log(count) // 输出 0
increment()
console.log(count) // 输出 1 （模块导出的 count 是引用，值会更新）
```

在这个例子中，`count` 是通过 `export` 导出的，它是一个引用。当 `increment()` 被调用时，`count` 的值更新了，而 `main.js` 中的 `count` 也随之更新，因为它引用的是同一个内存地址。

#### 总结

- **CommonJS** 导出的是**值的拷贝**，模块首次加载时会执行并缓存，后续使用的都是这个缓存的结果，模块内部变量的变化不会影响到其他文件。
- **ES Modules** 导出的是**值的引用**，模块导入时会动态引用模块的内部值，如果模块内部的值发生变化，导入的地方也会感知到这些变化。

所以，ES Modules 的 `import` 具有动态性，而 CommonJS 的 `require` 更像是静态的快照。
