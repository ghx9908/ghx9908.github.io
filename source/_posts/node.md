---
title: node 工具使用
date: 2022-08-17 12:00:00
tags: 前端工具
---

## nvm 安装和使用

- [nvm 一个 nodejs 版本管理工具！](http://nvm.uihtm.com/)
- [node 官网](https://nodejs.org/en/)
- [nvm 的简介、安装、使用（简单明了）](https://blog.csdn.net/QWERTYQ16/article/details/124497532)
- [安装后，每个命令都失败并显示消息“C:\Users\%username%\AppData\Roaming\nvm 找不到或不存在。退出。”](https://github.com/coreybutler/nvm-windows/issues/145)

> 常用命令

```yml
# 显示可下载版本的部分列表
$ nvm list available

# 安装最新版本 ( 安装时可以在上面看到 node.js 、 npm 相应的版本号 ，不建议安装最新版本)
$ nvm install latest

# 安装指定的版本的nodejs
$ nvm install 版本号

# 查看目前已经安装的版本 （ 当前版本号前面没有 * ， 此时还没有使用任何一个版本，这时使用 node.js 时会报错 ）
$ nvm list或 $ nvm ls

# 使用指定版本的nodejs （ 这时会发现在启用的 node 版本前面有 * 标记，这时就可以使用 node.js ）
$ nvm use 版本号

```

### nvm 常见问题

**查看 nvm 路径** `nvm root`

> 如果下载 node 过慢，请更换国内镜像源, 在 nvm 的安装路径下，找到 settings.txt，设置 node_mirro 与 npm_mirror 为国内镜像地址。下载就飞快了~~

```scala
root: D:\nvm
path: D:\nodejs
node_mirror: https://npm.taobao.org/mirrors/node/
npm_mirror: https://npm.taobao.org/mirrors/npm/
```
