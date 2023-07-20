---
title: Vue3-ace-editor的使用
author: 高红翔
date: 2023-07-19 14:12:25
categories: 开发工具
tags: npm
---

## 参考文档

npm 地址：https://www.npmjs.com/package/vue3-ace-editor

官网地址：[Ace - The High Performance Code Editor for the Web](https://ace.c9.io/)
Github: [GitHub - ajaxorg/ace: Ace (Ajax.org Cloud9 Editor)](https://github.com/ajaxorg/ace/)
vue2 版：[GitHub - chairuosen/vue2-ace-editor](https://github.com/chairuosen/vue2-ace-editor)
vue3 版：[GitHub - CarterLi/vue3-ace-editor](https://github.com/CarterLi/vue3-ace-editor)

## 使用

安装

```bash
npm i vue3-ace-editor
npm i ace-builds
```

**或者**

```bash
npm i vue3-ace-editor
```

.npmrc

```js
shamefully-hoist=true
```

app.vue

```vue
<template>
  <header>
    <select v-model="states.lang">
      <option v-for="lang of langs" :value="lang">{{ lang }}</option>
    </select>
    <select v-model="states.theme">
      <option v-for="theme of themes" :value="theme">{{ theme }}</option>
    </select>
  </header>
  <main style="height: 0">
    <VAceEditor
      ref="aceRef"
      v-model:value="states.content"
      class="vue-ace-editor"
      :lang="states.lang"
      :theme="states.theme"
      :options="{
        useWorker: true,
        enableBasicAutocompletion: true,
        enableSnippets: true,
        enableLiveAutocompletion: true,
      }"
    />
  </main>
</template>

<script setup lang="ts">
import { reactive, watch } from "vue"
import { VAceEditor } from "vue3-ace-editor"
import "./ace-config"
const langs = ["json", "javascript", "html", "yaml"]
const themes = ["github", "chrome", "monokai"]

const states = reactive({
  lang: "yaml",
  theme: "github",
  content: "",
})

watch(
  () => states.lang,
  async (lang) => {
    states.content = (
      await {
        json: import("../package.json?raw"),
        javascript: import("./ace-config.js?raw"),
        html: import("../index.html?raw"),
        yaml: import("../pnpm-lock.yaml?raw"),
      }[lang]
    ).default
  },
  { immediate: true }
)
</script>

<style lang="scss" scoped>
header {
  display: flex;
}

select {
  margin-right: 15px;
}

main {
  flex: 1;
  margin-top: 15px;
  display: flex;
}

.vue-ace-editor {
  font-size: 16px;
  border: 1px solid;
  flex: 1;
}

.outline-tree {
  width: 500px;
  margin-left: 15px;
  border: 1px solid;
  font-size: 16px;
}
</style>
```

ace-config.ts

```ts
import ace from "ace-builds"

import modeJsonUrl from "ace-builds/src-noconflict/mode-json?url"
ace.config.setModuleUrl("ace/mode/json", modeJsonUrl)

import modeJavascriptUrl from "ace-builds/src-noconflict/mode-javascript?url"
ace.config.setModuleUrl("ace/mode/javascript", modeJavascriptUrl)

import modeHtmlUrl from "ace-builds/src-noconflict/mode-html?url"
ace.config.setModuleUrl("ace/mode/html", modeHtmlUrl)

import modeYamlUrl from "ace-builds/src-noconflict/mode-yaml?url"
ace.config.setModuleUrl("ace/mode/yaml", modeYamlUrl)

import themeGithubUrl from "ace-builds/src-noconflict/theme-github?url"
ace.config.setModuleUrl("ace/theme/github", themeGithubUrl)

import themeChromeUrl from "ace-builds/src-noconflict/theme-chrome?url"
ace.config.setModuleUrl("ace/theme/chrome", themeChromeUrl)

import themeMonokaiUrl from "ace-builds/src-noconflict/theme-monokai?url"
ace.config.setModuleUrl("ace/theme/monokai", themeMonokaiUrl)

import workerBaseUrl from "ace-builds/src-noconflict/worker-base?url"
ace.config.setModuleUrl("ace/mode/base", workerBaseUrl)

import workerJsonUrl from "ace-builds/src-noconflict/worker-json?url"
ace.config.setModuleUrl("ace/mode/json_worker", workerJsonUrl)

import workerJavascriptUrl from "ace-builds/src-noconflict/worker-javascript?url"
ace.config.setModuleUrl("ace/mode/javascript_worker", workerJavascriptUrl)

import workerHtmlUrl from "ace-builds/src-noconflict/worker-html?url"
ace.config.setModuleUrl("ace/mode/html_worker", workerHtmlUrl)

import workerYamlUrl from "ace-builds/src-noconflict/worker-yaml?url"
ace.config.setModuleUrl("ace/mode/yaml_worker", workerYamlUrl)

import snippetsHtmlUrl from "ace-builds/src-noconflict/snippets/html?url"
ace.config.setModuleUrl("ace/snippets/html", snippetsHtmlUrl)

import snippetsJsUrl from "ace-builds/src-noconflict/snippets/javascript?url"
ace.config.setModuleUrl("ace/snippets/javascript", snippetsJsUrl)

import snippetsYamlUrl from "ace-builds/src-noconflict/snippets/yaml?url"
ace.config.setModuleUrl("ace/snippets/javascript", snippetsYamlUrl)

import snippetsJsonUrl from "ace-builds/src-noconflict/snippets/json?url"
ace.config.setModuleUrl("ace/snippets/json", snippetsJsonUrl)

import "ace-builds/src-noconflict/ext-language_tools"
ace.require("ace/ext/language_tools")
```

这一组导入和配置代码是用于自定义配置 Ace 编辑器的各个模块,主要包括:

1. 导入不同语言的语法模式模块,并设置对应 URL:

- json
- javascript
- html
- yaml

2. 导入不同的主题模块,并设置对应 URL:

- github
- chrome
- monokai

3. 导入基础 worker 和不同语言 worker,并设置对应 URL:

- base worker
- json worker
- javascript worker
- html worker
- yaml worker

4. 导入不同语言的代码片段,并设置对应 URL:

- html
- javascript
- yaml
- json

5. 导入语言工具扩展模块通过这种方式,可以从 Ace 构建版本中导入所需的模块,并通过 setModuleUrl 方法自定义它们的加载地址。

这样做的主要优点是:

- 可以将这些模块存储在自己的服务器上,而不是从 Ace CDN 加载。
- 可以自定义需要加载的模块,只导入应用需要的部分。
- 可以避免和其他版本的 Ace 冲突。
- 可以自定义模块的路径和名称。

总而言之,这些配置可以高度自定义 Ace 在该应用中的资源加载方式,做到精简、去冲突和可控。

## API 介绍说明

### 语法模式(mode)模块:

语法模式模块用于定义不同语言的语法规则,包括语法高亮、代码折叠、缩进等。
导入不同语言的 mode 模块可以让 Ace 编辑器支持对应的语言语法。比如导入 json mode 可以高亮 JSON 语法。

### Worker 模块:

Worker 模块用于完成语法检查、代码提示、自动补全等代码编辑功能。
其中:

- base worker 提供最基本的编辑功能
- 语言特定的 worker,如 json worker,可以提供对应的智能语法功能
  Worker 模块需要结合对应的 mode 模块才能发挥作用。
  例如 json worker 结合 json mode 才能实现 JSON 文件的智能提示、语法检查等功能。

### 代码片段

在 Ace 编辑器中,导入不同语言的代码片段(snippets)的作用是提供代码自动补全和代码块功能。
代码片段为不同语言提供了常用代码块,用户可以通过触发关键字快速插入预定义的代码模板。
例如在 JavaScript 代码中输入 “for” 并触发补全,可以自动插入一个 for 循环代码块。
主要作用包括:

1. 提高编程效率,通过代码片段可以快速插入常用代码块,不用每次都重新编写重复代码。
2. 减少编码错误,代码片段已定义好语法结构,使用后可以避免语法错误。
3. 标准化代码风格,开发团队可以定义统一的代码片段,维持一致的代码风格。
4. 支持不同语言,导入 html、js、yaml 等语言的片段可以分别编写对应的文件类型。
5. 方便新手学习编程语言,可以通过代码片段查看语言代码结构和语法样例。
6. 可以自定义代码片段,开发者可以根据项目需要自行定义额外的代码片段。

### ext-language_tools 模块

**ext-language_tools 模块:启用自动补全等高级编辑支持。**

它们之间的关系是:

- 语法模式模块提供基础的语法和编辑能力。

- Worker 模块基于语法模式实现智能编辑功能。

- ext-language_tools 模块利用语法模式和 Worker 提供的能力,呈现自动补全等高级功能。

也就是说,语法模式和 Worker 模块为 ext-language_tools 提供了必要的语法树分析和处理能力。
而 ext-language_tools 基于它们展示出自动补全、构建语法树等高级功能。

### option 配置

```js
options = {
  useWorker: true,
  enableBasicAutocompletion: true,
  enableSnippets: true,
  enableLiveAutocompletion: true,
}
```

1. useWorker 是否使用 Worker 线程,启用语法检查和自动补全等功能,默认为 false,应设置为 true 以启用增强编辑功能。
2. enableBasicAutocompletion 启用基本自动补全功能,插入匹配的变量、方法名等,默认为 false。
3. enableSnippets 启用代码段(snippets)补全功能,允许插入预定义的代码片段,默认为 false。
4. enableLiveAutocompletion 实时自动补全,输入代码时即时显示补全建议,默认为 false。

综合而言:

- useWorker 启用语法检查和编辑增强-

- enableBasicAutocompletion 和 enableSnippets 启用基本补全和代码片段补全

- enableLiveAutocompletion 实时补全,提供更好的用户体验

建议都设置为 true,启用 Ace 编辑器的智能编辑功能,包括实时自动补全、代码检查、代码段插入等,可以大大提高开发效率。

需要与导入 language_tools 等模块配合使用,为 Ace 提供必要的语法分析和处理能力,才能发挥最大效果

## 简单使用

```js
 <VAceEditor
      ref="aceRef"
      v-model:value="states.content"
      class="vue-ace-editor"
      :lang="states.lang"
      :theme="states.theme"
      :options="{
        enableBasicAutocompletion: true,
        enableSnippets: true,
        enableLiveAutocompletion: true,
      }"
    />


import { VAceEditor } from 'vue3-ace-editor'
import 'ace-builds'
import 'ace-builds/src-noconflict/mode-json'
import 'ace-builds/src-noconflict/theme-chrome'
import 'ace-builds/src-noconflict/snippets/json'
import 'ace-builds/src-noconflict/ext-language_tools'
```
