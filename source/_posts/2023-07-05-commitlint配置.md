---
title: commitlint配置
author: 高红翔
date: 2023-07-05 21:25:08
categories: 工程化
tags: 工具
---

# commitlint 配置

- [commitlint](https://www.npmjs.com/package/@commitlint/cli)推荐我们使用[config-conventional](https://www.npmjs.com/package/@commitlint/config-conventional)配置去写 `commit`

- 提交格式

  ```
  git commit -m <type>[optional scope]: <description>
  ```

  - `type` ：用于表明我们这次提交的改动类型，是新增了功能？还是修改了测试代码？又或者是更新了文档？
  - `optional scope`：一个可选的修改范围。用于标识此次提交主要涉及到代码中哪个模块
  - `description`：一句话描述此次提交的主要内容，做到言简意赅

## 1. type

| 类型     | 描述                                                   |
| :------- | :----------------------------------------------------- |
| build    | 编译相关的修改，例如发布版本、对项目构建或者依赖的改动 |
| chore    | 其他修改, 比如改变构建流程、或者增加依赖库、工具等     |
| ci       | 持续集成修改                                           |
| docs     | 文档修改                                               |
| feature  | 新特性、新功能                                         |
| fix      | 修改 bug                                               |
| perf     | 优化相关，比如提升性能、体验                           |
| refactor | 代码重构                                               |
| revert   | 回滚到上一个版本                                       |
| style    | 代码格式修改                                           |
| test     | 测试用例修改                                           |

## 2. 安装

https://commitlint.js.org/#/guides-local-setup?id=install-commitlint

#### 安装 commitlint

```bash
pnpm install @commitlint/cli @commitlint/config-conventional -D
```

#### 安装 husky

```sh
# Install Husky v6
npm install husky --save-dev
# or
yarn add husky --dev

# Activate hooks
npx husky install
# or
yarn husky install

```

#### Add hook

```bash
npx husky add .husky/commit-msg  'npx --no-install commitlint --edit ${1}'
```

8.2.3 配置

```js
npx husky add .husky/commit-msg "npx --no-install commitlint --edit $1"
```

## 3. 配置

https://commitlint.js.org/#/reference-configuration

commitlint.config.js

```js
module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "build",
        "chore",
        "ci",
        "docs",
        "feature",
        "fix",
        "perf",
        "refactor",
        "revert",
        "style",
        "test",
      ],
    ],
  },
}
```

### 4. 详细案例

```js
module.exports = {
  ignores: [(commit) => commit.includes("init")],
  extends: ["@commitlint/config-conventional"],
  parserPreset: {
    parserOpts: {
      headerPattern:
        /^(\w*|[\u4e00-\u9fa5]*)(?:[\(\（](.*)[\)\）])?[\:\：] (.*)/,
      headerCorrespondence: ["type", "scope", "subject"],
      referenceActions: [
        "close",
        "closes",
        "closed",
        "fix",
        "fixes",
        "fixed",
        "resolve",
        "resolves",
        "resolved",
      ],
      issuePrefixes: ["#"],
      noteKeywords: ["BREAKING CHANGE"],
      fieldPattern: /^-(.*?)-$/,
      revertPattern: /^Revert\s"([\s\S]*)"\s*This reverts commit (\w*)\./,
      revertCorrespondence: ["header", "hash"],
      warn() {},
      mergePattern: null,
      mergeCorrespondence: null,
    },
  },
  rules: {
    "body-leading-blank": [2, "always"],
    "footer-leading-blank": [1, "always"],
    "header-max-length": [2, "always", 108],
    "subject-empty": [2, "never"],
    "type-empty": [2, "never"],
    "type-enum": [
      2,
      "always",
      [
        "feat", // 新特性
        "fix", // 修复bug
        "perf", // 优化（性能）
        "style", // 样式
        "docs", // 文档
        "test", // 单元测试
        "refactor", // 重构
        "build", // 依赖打包相关
        "ci", // 持续集成
        "chore", // 日常
        "revert", // 回滚
        "wip", // 开发中
        "workflow", // 工作流
        "types", // 类型定义
        "release", // 发布
        "improvement", // 改进
      ],
    ],
  },
}
```

## 5. 常见问题

**问题 1**

```js
hint: The '.husky/pre-commit' hook was ignored because it's not set as executable.
hint: You can disable this warning with `git config advice.ignoredHook false`.
hint: The '.husky/commit-msg' hook was ignored because it's not set as executable.
hint: You can disable this warning with `git config advice.ignoredHook false`.
```

这些提示的意思是：Husky 预提交钩子和提交消息钩子没有被设置为可执行文件，所以 Git 忽略了它们。

具体原因是:使用 Husky 时，它需要在 .husky 目录下创建一些钩子脚本文件，如:

- .husky/pre-commit

- .husky/commit-msg

  但这些文件默认情况下不是可执行的。需要使用以下命令设置为可执行:

```bash
# 设置为可执行
chmod +x .husky/pre-commit
chmod +x .husky/commit-msg
```

毕竟只有可执行文件才能被 Git 用作钩子执行。
