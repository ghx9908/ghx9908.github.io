---
title: Object.prototype.hasOwnProperty()和 Object.hasOwn()
date: 2022-07-09 16:00:00
tags: javaScript
---

# Object.prototype.hasOwnProperty()和 Object.hasOwn()

### `Object.prototype.hasOwnProperty()`

`hasOwnProperty()` 方法会返回一个布尔值，指示对象自身属性中是否具有指定的属性（也就是，是否有指定的键）。

```js
const object1 = {}
object1.property1 = 42

console.log(object1.hasOwnProperty("property1"))
// expected output: true

console.log(object1.hasOwnProperty("toString"))
// expected output: false

console.log(object1.hasOwnProperty("hasOwnProperty"))
// expected output: false
```

### `Object.hasOwn()`

> **注意：** `Object.hasOwn()`旨在替代[`Object.hasOwnProperty()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/hasOwnProperty).

#### 用法

`hasOwn(instance, prop)`

```js
const object1 = {
  prop: "exists",
}

console.log(Object.hasOwn(object1, "prop"))
// expected output: true

console.log(Object.hasOwn(object1, "toString"))
// expected output: false

console.log(Object.hasOwn(object1, "undeclaredPropertyValue"))
// expected output: false
```

#### `hasOwn`和 in 的区别

> 以下示例区分直接属性和通过原型链继承的属性：

```javascript
const example = {}
example.prop = "exists"

// `hasOwn` will only return true for direct properties:
Object.hasOwn(example, "prop") // returns true
Object.hasOwn(example, "toString") // returns false
Object.hasOwn(example, "hasOwnProperty") // returns false

// The `in` operator will return true for direct or inherited properties:
"prop" in example // returns true
"toString" in example // returns true
"hasOwnProperty" in example // returns true
```

### `hasOwnProperty` 存在的问题

```js
const foo = Object.create(null);
foo.prop = 'exists';
if (Object.hasOwn(foo, 'prop')) {
  console.log(foo.prop); //true - 与该对象怎么创建的没关系
if (foo.hasOwnProperty('prop')) {//  TypeError: foo.hasOwnProperty is not a function
   console.log(foo.prop);
}
```

> [`Object.create(null)`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/create). 这些不继承自`Object.prototype`，因此`hasOwnProperty()`无法访问。
