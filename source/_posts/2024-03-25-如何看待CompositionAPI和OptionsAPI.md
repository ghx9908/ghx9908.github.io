---
title: 如何看待CompositionAPI和OptionsAPI
author: 高红翔
date: 2024-03-25 16:39:06
categories: 面试宝典
tags: Vue.js
---



- 在 Vue2 中采用的是 OptionsAPI, 用户提供的 data,props,methods,computed,watch 等属性 (用户编写复杂业务逻辑会出现反复横跳问题)
- Vue2 中所有的属性都是通过`this`访问，`this`存在指向明确问题
- Vue2 中很多未使用方法或属性依旧会被打包，并且所有全局 API 都在 Vue 对象上公开。Composition API 对 tree-shaking 更加友好，代码也更容易压缩。
- 组件逻辑共享问题， Vue2 采用 mixins 实现组件之间的逻辑共享； 但是会有数据来源不明确，命名冲突等问题。 Vue3 采用 CompositionAPI 提取公共逻辑非常方便

> 将同一个逻辑的相关代码收集在一起，并且可复用。
