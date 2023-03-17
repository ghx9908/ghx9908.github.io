---
title: defineProperty 和 toStringTag
author: 高红翔
date: 2023-03-15 10:48:01
categories: 前端基础
tags: javaScript
---

### 1. toStringTag

- `Symbol.toStringTag` 是一个内置 symbol，它通常作为对象的属性键使用，对应的属性值应该为字符串类型，这个字符串用来表示该对象的自定义类型标签
- 通常只有内置的 `Object.prototype.toString()` 方法会去读取这个标签并把它包含在自己的返回值里。

```js
console.log(Object.prototype.toString.call("foo")) // "[object String]"
console.log(Object.prototype.toString.call([1, 2])) // "[object Array]"
console.log(Object.prototype.toString.call(3)) // "[object Number]"
console.log(Object.prototype.toString.call(true)) // "[object Boolean]"
console.log(Object.prototype.toString.call(undefined)) // "[object Undefined]"
console.log(Object.prototype.toString.call(null)) // "[object Null]"
let myExports = {}
Object.defineProperty(myExports, Symbol.toStringTag, { value: "Module" })
console.log(Object.prototype.toString.call(myExports)) //[object Module]
```

### 2. defineProperty

- defineProperty 方法会直接在一个对象上定义一个新属性，或者修改一个对象的现有属性， 并返回这个对象。
  - obj 要在其上定义属性的对象。
  - prop 要定义或修改的属性的名称。
  - descriptor 将被定义或修改的属性描述符。

```js
let obj = {}
var ageValue = 10

Object.defineProperty(obj, "age", {
  //writable: true, //是否可修改
  //value: 10, //writeable 和 set不能混用
  get() {
    return ageValue
  },
  set(newValue) {
    ageValue = newValue
  },

  enumerable: true, //是否可枚举
  configurable: true, //是否可配置可删除
})

console.log(obj.age)
obj.age = 20
console.log(obj.age)
```
