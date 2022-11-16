---
title: sentry监控
date: 2022-11-16 16:00:00
tags: 性能
categories: 性能
---

## 基本原理

- https://github.com/zhilinYu/zhufeng-public/tree/master/%E5%89%8D%E7%AB%AF%E7%9B%91%E6%8E%A7monitor/monitor

- https://retechus.atlassian.net/browse/EW-1744

- https://juejin.cn/post/6856366626750038023

- https://juejin.cn/post/6844903984457580551

## 部署

- https://juejin.cn/post/6914530201430917128

- https://juejin.cn/post/6844904088866390024?share_token=72af2173-7dc5-4301-b2a4-35818b82813b

## 上报 SourceMap 版本号

- https://juejin.cn/post/6954303116783124487?share_token=fdac6d5d-73fe-43be-aa02-2930cca74729

- https://juejin.cn/post/7123518368631652382

## 手动上报

- https://juejin.cn/post/6957475955858210823

## 主动捕获错误

```js
axios
  .post(url)
  .then(function (response) {
    console.log(response)
  })
  .catch(function (error) {
    Sentry.captureException(new Error("something went wrong"), scope)
  })
```

## Transactions

- https://juejin.cn/post/6919856296522989582

## 微前端区分项目

- https://juejin.cn/post/7139452175088320520

## 性能

- https://juejin.cn/post/7148364027817623589?share_token=387017f7-9c88-4765-b069-b5a6aff3c36d

- https://juejin.cn/post/7151753139052347399?share_token=474df17d-1139-403e-b351-766e3ad65ab5

## 推送

- https://juejin.cn/post/7143142055294795807

## 源码

- https://github.com/getsentry/sentry-javascript
