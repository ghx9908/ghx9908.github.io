---
title: umi4升级
date: 2022-08-09 18:00:00
categories: 前端框架
tags: umi
---

 工程已经升级到了 umi4（需要安装pnpm, 然后 pnpm install），下面罗列了一些变动须知：

### 1、关于包管理器

1. 换成了 pnpm  [理由](https://juejin.cn/post/7077918263954374670)
2.  和 npm 使用方式一致

### 2、关于 @umijs/max

1. umi 和 @umijs/max 都是 umi，只不过 @umijs/max 带业务需要的插件，所以需要使用 @umijs/max

### 3、关于路由

1. 路由从 react-router-dom@5 升级到了 react-router-dom@6  [链接](https://reactrouter.com/docs/en/v6)

### 4、关于 history 和 pathname  [链接](https://umijs.org/docs/api/api#history)

1. umi 中的 history 是静态的，所以获取到的参数有问题。
2. pathname/search/hash 通过 window 来取值
3. 采用 const navigate = useNavigate();  [链接](https://umijs.org/docs/api/api#usenavigate)

### 5、关于 query 参数（search）

1. const params = useParams();  [链接](https://umijs.org/docs/api/api#useparams)
2. createSearchParams(location.search)  [链接](https://umijs.org/docs/api/api#createsearchparams)

**UmiJS 的文档，除了「开发一个 Blog」不看，剩下的都需要过一遍  [链接](https://umijs.org/docs/tutorials/getting-started)**
