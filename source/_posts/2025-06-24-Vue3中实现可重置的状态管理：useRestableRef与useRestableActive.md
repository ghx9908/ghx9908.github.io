---
title: Vue3中实现可重置的状态管理：useRestableRef与useRestableActive
author: 高红翔
date: 2025-06-24 12:29:19
categories: 前端基础
tags:
  - Vue.js
---

在 Vue 3 的 Composition API 开发中，我们经常会遇到一种需求：**在某些操作后，能够将组件状态「重置」为初始值**，比如表单还原、筛选项回退等。

本文将介绍三个实用的可重置状态封装函数，分别适用于不同场景：

- `useRestableRefFn`：适合每次初始化都需要新计算初始值的情况；
- `useRestableRef`：适合处理基本类型或非响应式对象；
- `useRestableActive`：适合处理复杂的响应式对象（如 reactive 表单对象）。

## 一、useRestableRefFn：每次初始化都执行函数

```ts
export function useRestableRefFn<T>(cb: () => T) {
  const state = ref(cb())
  const reset = () => {
    state.value = cb()
  }
  return { state, reset }
}
```

### 使用场景：

如果你的初始值是通过函数计算出来的（如当前时间、生成默认配置等），而不是一个固定值，那么每次 reset 都应该重新执行这个函数。

### 示例：

```ts
const { state, reset } = useRestableRefFn(() => new Date())
```

每次调用 `reset()`，`state.value` 都会变成新的时间对象。

---

## 二、useRestableRef：可重置的 ref 状态

```ts
export function useRestableRef<T>(value: T) {
  const inintValue = cloneDeep(value)
  const state = ref(value)
  const reset = () => {
    state.value = cloneDeep(inintValue)
  }
  return { state, reset }
}
```

### 特点：

- 初始值只会存储一份深拷贝；
- 每次重置都会重新 clone 一份新的，避免引用问题；
- 适合 ref 管理的基本数据或简单对象。

### 示例：

```ts
const { state, reset } = useRestableRef({ name: "Tom", age: 18 })
```

调用 `reset()` 后，`state.value` 会恢复为最初的 `{ name: 'Tom', age: 18 }`。

⚠️ 注意：如果你传的是引用类型，最好保证该值在初始化时是全新的对象，否则后续 reset 会出现数据共享问题。

---

## 三、useRestableActive：适用于 reactive 的响应式对象

```ts
export function useRestableActive<T extends object>(value: T, clone = cloneDeep) {
  const inintValue = clone(value)
  const state = reactive(value) as T

  const reset = () => {
    Object.keys(state).forEach((key) => delete state[key])
    Object.assign(state, clone(inintValue))
  }

  return { state, reset }
}
```

### 说明：

- 使用 `reactive` 包装整个对象，使得响应式深层可用；
- `reset()` 方法通过先清空对象，再用初始副本赋值，确保所有新字段也能被移除；
- 接受一个可选的 `clone` 方法，以支持更灵活的数据复制策略。

### 示例：

```ts
const { state, reset } = useRestableActive({ name: "Alice", tags: ["vue", "ts"] })

// 后续新增字段：
state.newField = "dynamic"

// reset 后 newField 会被删除
reset()
```

---

## 使用建议和注意事项

1. 对于 ref 和 reactive 管理的对象，不要直接将外部引用传进去，避免共享问题；
2. 推荐使用 `cloneDeep`，避免引用类型间的副作用；
3. 如果你希望 reset 的初始值是动态计算的，使用 `useRestableRefFn` 更合适；
4. `useRestableActive` 的性能比 `useRestableRef` 稍低一些，适合结构复杂的场景；
5. 多用于**表单数据管理、筛选条件恢复、数据编辑撤销**等场景。

---

## 结语

通过 `useRestableRefFn`、`useRestableRef` 和 `useRestableActive`，你可以更优雅地管理组件内部的状态重置逻辑。这不仅提高了代码的复用性，也让组件行为更加可预测、易维护。

如果你在项目中经常处理「还原状态」的需求，不妨尝试将这些工具函数加入到你的工具库中。

## useRestable.ts

```ts
import { ref, reactive } from "vue"
import { cloneDeep } from "lodash-es"

export function useRestableRefFn<T>(cb: () => T) {
  const state = ref(cb())

  const reset = () => {
    state.value = cb()
  }
  return { state, reset }
}

export function useRestableRef<T>(value: T) {
  const inintValue = cloneDeep(value)
  const state = ref(value)
  const reset = () => {
    // 这里也需要clone下，要不然reset后，第二次rest会有问题
    state.value = cloneDeep(inintValue)
  }
  return { state, reset }
}

export function useRestableActive<T extends object>(value: T, clone = cloneDeep) {
  const inintValue = clone(value)
  const state = reactive(value) as T

  const reset = () => {
    // 先删除旧的key,因为可能会新加字段
    Object.keys(state).forEach((key) => delete state[key])
    // 恢复成默认值，不能直接重新赋值，要不然就是新的reactive了
    Object.assign(state, clone(inintValue))
  }

  return { state, reset }
}
```
