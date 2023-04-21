---
title: Proxy和Reflect的使用
author: 高红翔
date: 2023-04-21 15:58:28
categories: 前端基础
tags:
  - ES6
  - javaScript
---

## 不使用 Reflect

```js
let person = {
  name: "John Doe",
  get aliasName() {
    return "**" + this.name
  },
  set aliasName(value) {
    this.name = value
  },
}
//代理对象
const proxyPerson = new Proxy(person, {
  get(target, key, receiver) {
    console.log("获取" + key)
    return target[key] //target 为person
  },
  set(target, key, value, receiver) {
    console.log("通知页面" + key + "改变了")
    return (target[key] = value)
  },
})

console.log("proxyPerson.aliasName=>", proxyPerson.aliasName)
proxyPerson.name = "张三"
// 获取aliasName
// proxyPerson.aliasName=> **John Doe
// 通知页面name改变了
```

**问题**

1. 取 aliasName 的时候中里面同过 this.name, 此时 this 为 person， 当调用 this.name 的时候没有触发代理对象的获取

2. 假如页面中使用的 aliasName ，会有 aliasName 对应的页面，没有创建 name 和页面的对应关系

3. 当后面修改的 name 属性的时候，不会触发页面的更新

4. 希望获取 aliasName 的时候，name 属性也触发 get

## 使用 Reflect

使用 Reflect 进行操作，保证 this 指向永远指向代理对象

```js
let person = {
  name: "John Doe",
  age: 20,
  get aliasName() {
    return "**" + this.name
  },
  set aliasName(value) {
    this.name = value
  },
}
const proxyPerson = new Proxy(person, {
  get(target, key, receiver) {
    console.log("获取" + key)
    //为了解决this问题，增加一层映射
    return Reflect.get(target, key, receiver)
  },
  set(target, key, value, receiver) {
    console.log("通知页面" + key + "改变了")
    return Reflect.set(target, key, value, receiver)
  },
})
proxyPerson.aliasName
proxyPerson.aliasName = "zhangsan"

//获取aliasName
//获取name
//通知页面aliasName改变了
//通知页面name改变了
```
