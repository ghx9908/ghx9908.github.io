---
title: for...of循环和for...in循环区别
date: 2022-07-09 11:11:50
tags: 面试  es6
---

# for...of 循环和 for...in 循环区别

### for...of 循环

#### 概念

一个数据结构只要部署了`Symbol.iterator`属性，就被视为具有 iterator 接口，就可以用`for...of`循环遍历它的成员。也就是说，`for...of`循环内部调用的是数据结构的`Symbol.iterator`方法。

`for...of`循环可以使用的范围包括数组、Set 和 Map 结构、某些类似数组的对象（比如`arguments`对象、`DOM NodeList` 对象、Generator 对象，以及字符串。

```js
const arr = ["red", "green", "blue"]
console.log(arr) // 原型链上  Symbol(Symbol.iterator): ƒ values()
```

#### 注意

`for...of`循环调用遍历器接口，数组的遍历器接口只返回具有数字索引的属性。这一点跟`for...in`循环也不一样。

```
let arr = [3, 5, 7];
arr.foo = 'hello';

for (let i in arr) {
  console.log(i); // "0", "1", "2", "foo"
}

for (let i of arr) {
  console.log(i); //  "3", "5", "7"
}
```

### for...in 循环

#### 概念

`for...in` 语句以任意顺序迭代对象的可枚举属性，会遍历手动添加的其他键，甚至包括原型链上的键，只能获得对象的键名，不能直接获取键，为遍历对象而设计。

```javascript
Object.prototype.objCustom = function () {}
Array.prototype.arrCustom = function () {}

let iterable = [3, 5, 7]
iterable.foo = "hello"

for (let i in iterable) {
  console.log(i) // "0"、"1"、"2", "foo", "arrCustom", "objCustom"
}
```

### 总结

`for...in`循环有几个缺点。

- 数组的键名是数字，但是`for...in`循环是以字符串作为键名“0”、“1”、“2”等等。
- `for...in`循环不仅遍历数字键名，还会遍历手动添加的其他键，甚至包括原型链上的键。
- 某些情况下，`for...in`循环会以任意顺序遍历键名。

总之，`for...in`循环主要是为遍历对象而设计的，不适用于遍历数组。

`for...of`循环相比上面几种做法，有一些显著的优点。

```javascript
for (let value of myArray) {
  console.log(value)
}
```

- 有着同`for...in`一样的简洁语法，但是没有`for...in`那些缺点。
- 不同于`forEach`方法，它可以与`break`、`continue`和`return`配合使用。
- 提供了遍历所有数据结构的统一操作接口。

下面是一个使用 break 语句，跳出`for...of`循环的例子。

```javascript
for (var n of fibonacci) {
  if (n > 1000) break
  console.log(n)
}
```

上面的例子，会输出斐波纳契数列小于等于 1000 的项。如果当前项大于 1000，就会使用`break`语句跳出`for...of`循环。
