---
title: 如何将template转换成render函数
author: 高红翔
date: 2024-03-22 11:38:37
categories: 面试宝典
tags: Vue.js
---

Vue 中含有模版编译的功能，它的主要作用是将用户编写的 template 编译为 js 中可执行的 render 函数。

## Vue 中的模版转化流程

1. 将 template 模板转换成 ast 语法树 - parserHTML (ast 描述语法的，虚拟 dom 描述的 Dom 结构的)
2. Vue2 对静态语法做静态标记 - optimize / Vue3 对 ast 语法进行转化 - transform（更细致）
3. 重新生成代码 - codeGen

[Vue2 模板编译的过程](https://github1s.com/vuejs/vue/blob/main/src/platforms/web/runtime-with-compiler.ts#L21-L22)

[Vue3 模版编译的过程](https://github.com/vuejs/core/blob/main/packages/compiler-core/src/compile.ts#L61)

> Vue3 中的模版转化，做了更多的优化操作。Vue2 仅仅是标记了静态节点而已~
