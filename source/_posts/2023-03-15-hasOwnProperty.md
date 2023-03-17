---
title: hasOwnProperty
author: 高红翔
date: 2023-03-15 18:03:13
categories: 前端基础
tags: javaScript
---

# Object.prototype.hasOwnProperty()

**`hasOwnProperty()`** 方法会返回一个布尔值，指示对象自身属性中是否具有指定的属性（也就是，是否有指定的键）。

```JS
const object1 = {};
object1.property1 = 42;

console.log(object1.hasOwnProperty('property1'));
// Expected output: true

console.log(object1.hasOwnProperty('toString'));
// Expected output: false

console.log(object1.hasOwnProperty('hasOwnProperty'));
// Expected output: false

```

使用案例 | 二次封装

```js
require.o = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop)
```
