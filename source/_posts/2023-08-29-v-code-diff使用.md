---
title: v-code-diff使用
author: 高红翔
date: 2023-08-29 15:26:29
categories: 开发工具
tags: npm
---

## 参考：

- https://github.com/Shimada666/v-code-diff/blob/master/README-zh.md
- https://www.npmjs.com/package/v-code-diff
- https://www.npmjs.com/package/deep-parse-json

## 安装

```bash
npm i deep-parse-json # 深度解析json
npm i v-code-diff


```

## 使用

### Vue3 注册为全局组件

```js
import { createApp } from "vue"
import CodeDiff from "v-code-diff"

app.use(CodeDiff).mount("#app")
```

```vue
<template>
  <code-diff :old-string="diffData.oldString" :new-string="diffData.newString" output-format="side-by-side" />
</template>
<script lang="ts" setup>
const diffData = reactive({
  oldString: "",
  newString: "",
})

onMount(() => {
  diffData.oldString = JSON.stringify(deepParseJson("123"), null, 4)
  diffData.newString = JSON.stringify(deepParseJson("456"), null, 4)
})
</script>
```
