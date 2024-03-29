---
title: Vue.extend方法的作用
author: 高红翔
date: 2024-03-28 17:20:09
categories: 面试宝典
tags: Vue.js
---

## 1.1 Vue.extend 概念

使用基础 Vue 构造器，创建一个“子类”。参数是一个包含组件选项的对象。

`data` 选项是特例，需要注意 - 在 `Vue.extend()` 中它必须是函数



```js
var Profile = Vue.extend({
  template: "<p>{{firstName}} {{lastName}} aka {{alias}}</p>",
  data: function () {
    return {
      firstName: "Walter",
      lastName: "White",
      alias: "Heisenberg",
    };
  },
});
// 创建 Profile 实例，并挂载到一个元素上。
new Profile().$mount("#mount-point");

new Vue().$mount();
```

## 1.2 分析

- 所有的组件创建时都会调用`Vue.extend`方法进行创建
- 有了此方法我们可以用于手动挂载组件。
- 后端存储的字符串模板我们可以通过 Vue.extend 方法将其进行渲染，但是需要引入编译时。

## 1.3 Vue3 中手动挂载

> Vue3 中不在使用 `Vue.extend` 方法，而是采用`render`方法进行手动渲染。

```html
<div id="app"></div>
<script type="module">
  import { render, h, ref } from "./vue.esm-browser.js";
  const App = {
    template: `<div id="counter">{{ count }}</div>`,
    setup() {
      const count = ref(0);
      return { count };
    },
  };
  const app = render(h(App), document.getElementById("app"));
</script>
```
