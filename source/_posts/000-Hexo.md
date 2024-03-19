---
title: Hexo
author: 高红翔
date: 2023-03-15 10:46:58
categories: 开发工具
keywords: hexo
tags: 工具
top: true
cover: true
password:
summary: Hexo 是一个快速、简洁且高效的博客框架。Hexo 使用 Markdown（或其他渲染引擎）解析文章，在几秒内，即可利用靓丽的主题生成静态网页。
---

## 写作 test

你可以执行下列命令来创建一篇新文章或者新的页面。

```bash
$ hexo new [layout] <title>
```

您可以在命令中指定文章的布局（layout），默认为 post，可以通过修改 `_config.yml `中的 `default_layout `参数来指定默认布局。

### 布局（Layout）

- Hexo 有三种默认布局：`post`、`page` 和 `draft`。
- 在创建这三种不同类型的文件时，它们将会被保存到不同的路径；
- 而您自定义的其他布局和 post 相同，都将储存到 `source/_posts` 文件夹。

| **布局** | **路径**        |
| -------- | --------------- |
| post     | source/\_posts  |
| page     | source          |
| draft    | source/\_drafts |

### 文件名称

Hexo 默认以标题做为文件名称，但您可编辑 `new_post_name` 参数来改变默认的文件名称，举例来说，设为 `:year-:month-:day-:title.md` 可让您更方便的通过日期来管理文章。

| 变量       | 描述                                |
| :--------- | :---------------------------------- |
| `:title`   | 标题（小写，空格将会被替换为短杠）  |
| `:year`    | 建立的年份，比如， `2015`           |
| `:month`   | 建立的月份（有前导零），比如， `04` |
| `:i_month` | 建立的月份（无前导零），比如， `4`  |
| `:day`     | 建立的日期（有前导零），比如， `07` |
| `:i_day`   | 建立的日期（无前导零），比如， `7`  |

### 草稿

刚刚提到了 Hexo 的一种特殊布局：`draft`，这种布局在建立时会被保存到 `source/_drafts` 文件夹，您可通过 `publish` 命令将草稿移动到 `source/_posts` 文件夹，该命令的使用方式与 `new` 十分类似，您也可在命令中指定 `layout` 来指定布局。

```
$ hexo publish [layout] <title>
```

草稿默认不会显示在页面中，您可在执行时加上 `--draft` 参数，或是把 `render_drafts` 参数设为 `true` 来预览草稿。

## Front-matter

`Front-matter` 选项中的所有内容均为**非必填**的。但我仍然建议至少填写 `title` 和 `date` 的值。

| 配置选项      | 默认值                         | 描述                                                                                                                                                                                       |
| ------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| title         | `Markdown` 的文件标题          | 文章标题，强烈建议填写此选项                                                                                                                                                               |
| date          | 文件创建时的日期时间           | 发布时间，强烈建议填写此选项，且最好保证全局唯一                                                                                                                                           |
| author        | 根 `_config.yml` 中的 `author` | 文章作者                                                                                                                                                                                   |
| img           | `featureImages` 中的某个值     | 文章特征图，推荐使用图床(腾讯云、七牛云、又拍云等)来做图片的路径.如: `http://xxx.com/xxx.jpg`                                                                                              |
| top           | `true`                         | 推荐文章（文章是否置顶），如果 `top` 值为 `true`，则会作为首页推荐文章                                                                                                                     |
| hide          | `false`                        | 隐藏文章，如果`hide`值为`true`，则文章不会在首页显示                                                                                                                                       |
| cover         | `false`                        | `v1.0.2`版本新增，表示该文章是否需要加入到首页轮播封面中                                                                                                                                   |
| coverImg      | 无                             | `v1.0.2`版本新增，表示该文章在首页轮播封面需要显示的图片路径，如果没有，则默认使用文章的特色图片                                                                                           |
| password      | 无                             | 文章阅读密码，如果要对文章设置阅读验证密码的话，就可以设置 `password` 的值，该值必须是用 `SHA256` 加密后的密码，防止被他人识破。前提是在主题的 `config.yml` 中激活了 `verifyPassword` 选项 |
| toc           | `true`                         | 是否开启 TOC，可以针对某篇文章单独关闭 TOC 的功能。前提是在主题的 `config.yml` 中激活了 `toc` 选项                                                                                         |
| mathjax       | `false`                        | 是否开启数学公式支持 ，本文章是否开启 `mathjax`，且需要在主题的 `_config.yml` 文件中也需要开启才行                                                                                         |
| summary       | 无                             | 文章摘要，自定义的文章摘要内容，如果这个属性有值，文章卡片摘要就显示这段文字，否则程序会自动截取文章的部分内容作为摘要                                                                     |
| categories    | 无                             | 文章分类，本主题的分类表示宏观上大的分类，只建议一篇文章一个分类                                                                                                                           |
| tags          | 无                             | 文章标签，一篇文章可以多个标签                                                                                                                                                             |
| keywords      | 文章标题                       | 文章关键字，SEO 时需要                                                                                                                                                                     |
| reprintPolicy | cc_by                          | 文章转载规则， 可以是 cc_by, cc_by_nd, cc_by_sa, cc_by_nc, cc_by_nc_nd, cc_by_nc_sa, cc0, noreprint 或 pay 中的一个                                                                        |

**tags:**

- HTML | CSS | javaScript | TypeScript | ES6 | git | npm | Node.js | webpack | Vue.js | React.js | 算法 | 设计模式 | 面试 | 微前端 | 工具 | 编程题 | nginx | docker | 基础 ｜移动端｜ echarts

**categories:**

- 开发工具

- 前端基础

- 面试宝典

- 前端框架

- 前端运维

- 工程化

- 架构

- LeetCode

- 解决方法
