---
title: Reactivity方法的实现
author: 高红翔
date: 2023-04-21 16:01:41
categories: 前端框架
tags:
  - Vue.js
---

> `reactive`方法会将对象变成 proxy 对象

### 基本实现

- reactivity.ts

```js
import { isObject } from "@vue/shared"

export function reactive(target: object) {
  // reactive 只能处理对象类型的数据，不是对象不处理
  if (!isObject(target)) return target

  const proxy = new Proxy(target, muableHandlers) // 没有代理过创建代理

  return proxy
}
```

- @vue/shared

```ts
export const isObject = (value: unknown): value is Record<any, any> => {
  // return Object.prototype.toString.call(value) === '[object Object]';
  return value !== null && typeof value === "object"
}
```

- handler.ts

```js
export const muableHandlers: ProxyHandler<object> = {
  // receiver相当于代理对象
  get(target, key, receiver) {
    //取值的时候，让属性和effect产生关系
    return Reflect.get(target, key, receiver)
  },
  set(target, key, value, receiver) {
    //设置的时候，让属性对应的effect执行
    Reflect.set(target, key, value, receiver)
    return true
  },
}
```

### 增加缓冲

**问题:** 同一个对象被代理多次

```js
import { reactive } from "./reactivity.js"
const obj = { name: "ghx", age: 22 }
const state1 = reactive(obj)
const state2 = reactive(obj)
console.log("state=>", state1 === state2) //false
```

**优化**：采用映射表

- reactivity.ts

```diff
import { isObject } from "@vue/shared";
import { muableHandlers } from "./handler";

+ const reactiveMap = new WeakMap()
export function reactive(target: object) {
  // reactive 只能处理对象类型的数据，不是对象不处理
  if (!isObject(target)) return target

+  // 缓存可以采用映射表 {{target} -> proxy}
+  let existingProxy = reactiveMap.get(target)// 看一下这个对象是否有被代理过
+  if (existingProxy) return existingProxy// 代理过直接返回

  //防止对象重复被代理
  if (target[ReactiveFlags.IS_REACTIVE]) {
    return target;
  }

  const proxy = new Proxy(target, muableHandlers)// 没有代理过创建代理
+  reactiveMap.set(target, proxy) // 缓存代理结果
  return proxy
}

```

### 唯一标识

**问题：**把已经代理过的对象继续代理

```js
import { reactive } from "./reactivity.js"
const obj = { name: "ghx", age: 22 }
const state1 = reactive(obj)
const state2 = reactive(state1)
console.log("state=>", state1 === state2) //false
```

以前的方案

- 在 vue3.0 的时候 会创造一个反向映射表 {代理的结果 -》 原内容}】

**优化：** 采用唯一标识

reactivity.ts

```diff
import { isObject } from "@vue/shared";
import { muableHandlers } from "./handler";

+export const enum ReactiveFlags { // 对象
+  IS_REACTIVE = "__v_isReactive",
+}
const reactiveMap = new WeakMap()
export function reactive(target: object) {
  // reactive 只能处理对象类型的数据，不是对象不处理
  if (!isObject(target)) return target

  // 缓存可以采用映射表 target -> proxy
  let existingProxy = reactiveMap.get(target)// 看一下这个对象是否有被代理过
  if (existingProxy) return existingProxy// 代理过直接返回

+  //防止对象重复被代理
+  if (target[ReactiveFlags.IS_REACTIVE]) {
+    return target;
+  }

  const proxy = new Proxy(target, muableHandlers)// 没有代理过创建代理
  reactiveMap.set(target, proxy) // 缓存代理结果
  return proxy
}
```

handler.ts

```diff
+import { ReactiveFlags } from "./reactivity";

export const muableHandlers: ProxyHandler<object> = {
  // receiver相当于代理对象
  get(target, key, receiver) {
    //取值的时候，让属性和effect产生关系
+    if (key === ReactiveFlags.IS_REACTIVE) {
+      return true;
+    }
    return Reflect.get(target, key, receiver)
  },
  set(target, key, value, receiver) {
    //设置的时候，让属性对应的effect执行
    Reflect.set(target, key, value, receiver)
    return true
  },
}
```
