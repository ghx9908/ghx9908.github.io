---
title: webpack 编译流程
author: 高红翔
date: 2023-03-20 11:59:15
categories: 工程化
tags: webpack
---

## webpack 编译流程

1. 初始化参数：从配置文件和 Shell 语句中读取并合并参数,得出最终的配置对象
2. 用上一步得到的参数初始化 Compiler 对象
3. 加载所有配置的插件
4. 执行对象的 run 方法开始执行编译
5. 根据配置中的`entry`找出入口文件
6. 从入口文件出发,调用所有配置的`Loader`对模块进行编译
7. 再找出该模块依赖的模块，再递归本步骤直到所有入口依赖的文件都经过了本步骤的处理
8. 根据入口和模块之间的依赖关系，组装成一个个包含多个模块的 Chunk
9. 再把每个 Chunk 转换成一个单独的文件加入到输出列表
10. 在确定好输出内容后，根据配置确定输出的路径和文件名，把文件内容写入到文件系统

> 在以上过程中，Webpack 会在特定的时间点广播出特定的事件，插件在监听到感兴趣的事件后会执行特定的逻辑，并且插件可以调用 Webpack 提供的 API 改变 Webpack 的运行结果

![](https://raw.githubusercontent.com/ghx9908/image-hosting/master/img/20230302105130.png)

### 1.1entry

src\entry1.js

```js
let title = require("./title")
console.log("entry12", title)
```

src\entry2.js

```js
let title = require("./title.js")
console.log("entry2", title)
```

src\title.js

```js
module.exports = "title"
```

### 1.2loader.js

- loader 的本质就是一个函数，一个用于转换或者说翻译的函数

- 把那些 webpack 不认识的模块 less sass baxx 转换为 webpack 能认识的模块 js json

loaders\logger1-loader.js

```js
function loader1(source) {
  //let name= 'entry1';
  return source + "//logger1" //let name= 'entry1';//logger1
}
module.exports = loader1
```

loaders\logger2-loader.js

```js
function loader2(source) {
  //let name= 'entry1';
  return source + "//logger2" //let name= 'entry1';//logger2
}
module.exports = loader2
```

### 1.3 plugin.js

plugins\done-plugin.js

```js
class DonePlugin {
  apply(compiler) {
    compiler.hooks.done.tap("DonePlugin", () => {
      console.log("done:结束编译")
    })
  }
}
module.exports = DonePlugin
```

plugins\run1-plugin.js

```js
class RunPlugin {
  apply(compiler) {
    //在此插件里可以监听run这个钩子
    compiler.hooks.run.tap("Run1Plugin", () => {
      console.log("run1:开始编译")
    })
  }
}
module.exports = RunPlugin
```

plugins\run2-plugin.js

```js
class RunPlugin {
  apply(compiler) {
    compiler.hooks.run.tap("Run2Plugin", () => {
      console.log("run2:开始编译")
    })
  }
}
module.exports = RunPlugin
```

### 1.4 webpack.config.js

webpack.config.js

```js
const path = require("path")
const Run1Plugin = require("./plugins/run1-plugin")
const Run2Plugin = require("./plugins/run2-plugin")
const DonePlugin = require("./plugins/done-plugin")
module.exports = {
  mode: "development",
  devtool: false,
  context: process.cwd,
  entry: {
    entry1: "./src/entry1.js",
    entry2: "./src/entry2.js",
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
  },
  resolve: {
    extensions: [".js", ".jsx", ".tx", ".tsx"],
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: [path.resolve(__dirname, "loaders/loader2.js"), path.resolve(__dirname, "loaders/loader1.js")],
      },
    ],
  },
  plugins: [new DonePlugin(), new Run2Plugin(), new Run1Plugin()],
}
```

### 1.5debugger.js

debugger.js

```js
const fs = require("fs")
const webpack = require("./webpack2")
// const webpack = require("webpack")
const webpackConfig = require("./webpack.config")
debugger
const compiler = webpack(webpackConfig)
//4.执行`Compiler`对象的 run 方法开始执行编译
compiler.run((err, stats) => {
  if (err) {
    console.log(err)
  } else {
    //stats代表统计结果对象
    const statsJson = JSON.stringify(
      stats.toJson({
        // files: true, //代表打包后生成的文件
        assets: true, //其实是一个代码块到文件的对应关系
        chunks: true, //从入口模块出发，找到此入口模块依赖的模块，或者依赖的模块依赖的模块，合在一起组成一个代码块
        modules: true, //打包的模块 每个文件都是一个模块
      })
    )

    fs.writeFileSync("./statsJson.json", statsJson)
  }
})
```

### 1.6 webpack.js

webpack2.js

```js
const Compiler = require("./Compiler")
function webpack(options) {
  // 1.初始化参数：从配置文件和 Shell 语句中读取并合并参数,得出最终的配置对象
  //argv[0]是Node程序的绝对路径 argv[1] 正在运行的脚本
  // node debugger --mode=production
  const argv = process.argv.slice(2)
  const shellOptions = argv.reduce((shellOptions, options) => {
    // options = '--mode=development'
    const [key, value] = options.split("=")
    shellOptions[key.slice(2)] = value
    return shellOptions
  }, {})
  console.log("shellOptions=>", shellOptions)
  const finalOptions = { ...options, ...shellOptions }
  //2.用上一步得到的参数初始化 `Compiler` 对象
  const compiler = new Compiler(finalOptions)
  //3.加载所有配置的插件
  const { plugins } = finalOptions
  for (let plugin of plugins) {
    //订阅钩子
    plugin.apply(compiler)
  }
  return compiler
}
module.exports = webpack
```

### 1.7 Compilation

Compiler.js

```js
const { SyncHook } = require("tapable")
const Compilation = require("./Compilation")
const fs = require("fs")
const path = require("path")
// Compiler 模块是 webpack 的主要引擎
class Compiler {
  constructor(options) {
    this.options = options
    this.hooks = {
      run: new SyncHook(), //在开始编译之前调用
      done: new SyncHook(), //在编译完成时执行
    }
  }
  run(callback) {
    this.hooks.run.call() //在编译开始前触发run钩子执行
    //在编译的过程中会收集所有的依赖的模块或者说文件
    //stats指的是统计信息 modules chunks  files=bundle assets指的是文件名和文件内容的映射关系
    const onCompiled = (err, stats, fileDependencies) => {
      // 10.在确定好输出内容后，根据配置确定输出的路径和文件名，把文件内容写入到文件系统
      for (let filename in stats.assets) {
        let filePath = path.join(this.options.output.path, filename)
        fs.writeFileSync(filePath, stats.assets[filename], "utf8")
      }
      callback(err, { toJson: () => stats })
      for (let fileDependency of fileDependencies) {
        //监听依赖的文件变化，如果依赖的文件变化后会开始一次新的编译
        fs.watch(fileDependency, () => this.compile(onCompiled))
      }
    }
    this.hooks.done.call() //在编译完成时触发done钩子执行
    //调用compile方法进行编译  开始一次新的编译
    this.compile(onCompiled)
  }
  //开启一次新的编译
  compile(callback) {
    //每次编译 都会创建一个新的Compilation实例
    let compilation = new Compilation(this.options, this)
    compilation.build(callback)
  }
}
module.exports = Compiler
```

### 1.8 Compilation

Compilation.js

```js
const path = require("path")
const fs = require("fs")
const parser = require("@babel/parser")
const types = require("@babel/types")
const traverse = require("@babel/traverse").default
const generator = require("@babel/generator").default
const baseDir = normalizePath(process.cwd())
function normalizePath(path) {
  return path.replace(/\\/g, "/")
}
class Compilation {
  constructor(options, compiler) {
    this.options = options // 配置参数
    this.options.context = this.options.context || normalizePath(process.cwd())
    this.compiler = compiler
    this.modules = [] //这里放置本次编译涉及的所有的模块
    this.chunks = [] //本次编译所组装出的代码块
    this.assets = {} // 存放输出的文件 key是文件名,值是文件内容
    this.files = [] //代表本次打包出来的文件
    this.fileDependencies = new Set() //本次编译依赖的文件或者说模块
  }
  build(callback) {
    //5.根据配置中的entry找出入口文件
    let entry = {}
    //格式化入口文件
    if (typeof this.options.entry === "string") {
      entry.main = this.options.entry
    } else {
      entry = this.options.entry
    }
    // 对入口进行遍历
    for (let entryName in entry) {
      //获取入口文件的绝对路径
      let entryFilePath = path.posix.join(baseDir, entry[entryName])
      //把此入口文件添加到文件依赖列表中
      this.fileDependencies.add(entryFilePath)
      //6.从入口文件出发,调用所有配置的Loader对模块进行编译
      let entryModule = this.buildModule(entryName, entryFilePath)
      // this.modules.push(entryModule)
      // 8.根据入口和模块之间的依赖关系，组装成一个个包含多个模块的 Chunk
      let chunk = {
        name: entryName, //入口名称
        entryModule, //入口的模块 ./src/entry.js
        modules: this.modules.filter((module) => module.names.includes(entryName)), //此入口对应的模块
      }
      this.chunks.push(chunk)
    }

    // 9.再把每个 Chunk 转换成一个单独的文件加入到输出列表
    this.chunks.forEach((chunk) => {
      const filename = this.options.output.filename.replace("[name]", chunk.name)
      this.files.push(filename)
      //组装chunk
      this.assets[filename] = getSource(chunk)
    })
    callback(
      null,
      {
        modules: this.modules,
        chunks: this.chunks,
        assets: this.assets,
        files: this.files,
      },
      this.fileDependencies
    )
  }
  /**
   * 编译模块
   * @param {*} name 模块所属的代码块(chunk)的名称，也就是entry的name entry1 entry2
   * @param {*} modulePath 模块的绝对路径
   */
  buildModule(entryName, modulePath) {
    //1.读取文件的内容
    let rawSourceCode = fs.readFileSync(modulePath, "utf8")
    //获取loader的配置规则
    let { rules } = this.options.module
    //根据规则找到所有的匹配的loader 适用于此模块的所有loader
    let loaders = []
    rules.forEach((rule) => {
      //用模块路径匹配正则表达式
      if (modulePath.match(rule.test)) {
        loaders.push(...rule.use)
      }
    })
    //调用所有配置的Loader对模块进行转换

    let transformedSourceCode = loaders.reduceRight((sourceCode, loaderPath) => {
      const loaderFn = require(loaderPath)
      return loaderFn(sourceCode)
    }, rawSourceCode)

    //7.再找出该模块依赖的模块，再递归本步骤直到所有入口依赖的文件都经过了本步骤的处理
    //获取当前模块，也就是 ./src/entry1.js的模块ID
    let moduleId = "./" + path.posix.relative(baseDir, modulePath)
    //创建一个模块ID就是相对于根目录的相对路径 dependencies就是此模块依赖的模块
    //name是模块所属的代码块的名称,如果一个模块属于多个代码块，那么name就是一个数组
    let module = { id: moduleId, dependencies: new Set(), names: [entryName] }
    this.modules.push(module)
    let ast = parser.parse(transformedSourceCode, { sourceType: "module" })
    //Visitor是babel插件中的概念，此处没有
    traverse(ast, {
      CallExpression: ({ node }) => {
        //如果调用的方法名是require的话，说明就要依赖一个其它模块
        if (node.callee.name === "require") {
          // .代表当前的模块所有的目录，不是工作目录
          let depModuleName = node.arguments[0].value //"./title"
          let depModulePath
          //获取当前的模块所在的目录
          if (depModuleName.startsWith(".")) {
            //暂时先不考虑node_modules里的模块，先只考虑相对路径
            const currentDir = path.posix.dirname(modulePath)
            //要找当前模块所有在的目录下面的相对路径
            depModulePath = path.posix.join(currentDir, depModuleName)
            //此绝对路径可能没有后续，需要尝试添加后缀
            // 获取配置的扩展名后缀
            const extensions = this.options.resolve.extensions
            //尝试添加后缀 返回最终的路径
            depModulePath = tryExtensions(depModulePath, extensions)
          } else {
            //如果不是以.开头的话，就是第三方模块
            depModulePath = require.resolve(depModuleName)
          }
          //把依赖的模块路径添加到文件依赖列表
          this.fileDependencies.add(depModulePath)
          //获取此依赖的模块的ID, 也就是相对于根目录的相对路径
          let depModuleId = "./" + path.posix.relative(baseDir, depModulePath)
          //修改语法树，把依赖的模块名换成模块ID
          node.arguments[0] = types.stringLiteral(depModuleId)
          //把依赖的模块ID和依赖的模块路径放置到当前模块的依赖数组中
          module.dependencies.add({ depModuleId, depModulePath })
        }
      },
    })
    //转换源代码,把转换后的源码放在_source属性,用于后面写入文件
    let { code } = generator(ast)
    module._source = code
    ;[...module.dependencies].forEach(({ depModuleId, depModulePath }) => {
      //判断此依赖的模块是否已经打包过了或者说编译 过了
      let existModule = this.modules.find((module) => module.id === depModuleId)
      if (existModule) {
        existModule.names.push(entryName)
      } else {
        let depModule = this.buildModule(entryName, depModulePath)
        this.modules.push(depModule)
      }
    })
    return module
  }
}
/**
 *
 * @param {*} modulePath
 * @param {*} extensions
 * @returns
 */
function tryExtensions(modulePath, extensions) {
  if (fs.existsSync(modulePath)) {
    return modulePath
  }
  for (let i = 0; i < extensions.length; i++) {
    let filePath = modulePath + extensions[i]
    if (fs.existsSync(filePath)) {
      return filePath
    }
  }
  throw new Error(`找不到${modulePath}`)
}
function getSource(chunk) {
  return `
  (() => {
    var modules = {
      ${chunk.modules
        .filter((module) => module.id !== chunk.entryModule.id)
        .map(
          (module) => `
          "${module.id}": module => {
            ${module._source}
          }
        `
        )
        .join(",")}
    };
    var cache = {};
    function require(moduleId) {
      var cachedModule = cache[moduleId];
      if (cachedModule !== undefined) {
        return cachedModule.exports;
      }
      var module = cache[moduleId] = {
        exports: {}
      };
      modules[moduleId](module, module.exports, require);
      return module.exports;
    }
    var exports = {};
    (() => {
      ${chunk.entryModule._source}
    })();
  })();
  `
}
module.exports = Compilation
```

webpack2.js

## 总结

### 1. 文件作用

#### **webpack.js 文件**

webpack 方法

1. 接收 webpack.config.js 参数，返回 compiler 实例
2. 初始化参数
3. 始化 Compiler 对象实例
4. 加载所有配置的插件

#### **Compiler**文件

- Compiler 模块是 **webpack 的主要引擎**

- **constructor 方法**： 初始化一些 hooks
- **run 方法**
  - 执行插件订阅的一系列 hooks
  - 创建 Compilation 实例并执行实例的 build（onCompiled）方法（开启一次新的编译）
  - onCompiled 回调
    - 在确定好输出内容后，根据配置确定输出的路径和文件名，把文件内容写入到文件系统
    - 执行 compiler.run 方法的回调，传入 info
    - 监听依赖的文件变化，如果依赖的文件变化后会开始一次新的编译

#### Compilation 文件

**build 方法**

1. .根据配置中的 entry 找出入口文件
2. 从入口文件出发,调用所有配置的 Loader 对模块进行编译
3. 再找出该模块依赖的模块，再递归本步骤直到所有入口依赖的文件都经过了本步骤的处理
4. 根据入口和模块之间的依赖关系，组装成一个个包含多个模块的 Chunk
5. 再把每个 Chunk 转换成一个单独的文件加入到输出列表
6. 执行成功后的回调

### 2. 流程总结

#### **初始化参数：**

1. **初始化参数**：从配置文件和 Shell 语句中读取并合并参数,得出最终的配置对象（命令行优先级高）

#### **开始编译**

2. 用上一步得到的参数**初始化 Compiler 对象**

   1. 初始化 options 参数和 hooks （` run: new SyncHook()`, //在开始编译之前调用...）

3. **加载**所有配置的**插件**：

   1. 在配置中找到 plugins 数组
   2. 遍历 plugins 执行每个插件的 apply 方法，并把 compiler 实例传进去（每个插件都有一个 apply 方法）
   3. 执行` compiler.hooks.run.tap`等方法注册事件

4. **执行**`compiler`实例的 **run 方法**开始执行编译
   1. 整个过程伴随着触发插件的注册个各种钩子函数` this.hooks.done.call()`...
   2. 开启一次新的编译，创建一个新的 Compilation 实例
   3. 执行实例的 build 方法，传入完成的回调

#### **编译模块**

5. 根据配置中的 entry 找出入口文件

   1. 格式化入口文件，变成对象形式
   2. 对入口进行遍历，获取入口文件的绝对路径，添加到文件依赖列表中

6. **loader 转换**：从入口文件出发,调用所有配置的 Loader 对模块进行转换 （最终返回 module 对象）

   1. 读取处理文件的内容

   2. 根据规则找到所有的匹配的 loader

   3. 调用所有配置的 Loader 对模块进行转换（从上到下，从右向左）

   4. 获取当前模块模块 id，相对于根目录的相对路径

   5. 创建一个 module 对象

      ```js
      const module = {
          id:'./src/entry1.js',//相对于根目录的相对路径
           dependencies:[{depModuleId:./src/title.js,depModulePath:'xxx'}],//dependencies就是此模块依赖的模块
          names:['entry1'],// name是模块所属的代码块的名称,如果一个模块属于多个代码块，那么name就是一个数组
      2.
           _source:'xxx',//存放对应的源码
      }
      ```

7. **编译模块分析依赖**，再**递归遍历**本步骤直到所有入口**依赖模块**的文件都经过了本步骤的处理
   1. 将 loader 编译后的代码调用 parse 转换为 ast
   2. 遍历语法树，如果存在 require 或者 import，说明就要依赖一个其它模块
   3. 获取依赖模块的绝对路径，添加到文件依赖列表中
   4. 获取此依赖的模块的 ID, 也就是相对于根目录的相对路径
   5. 修改语法树，把依赖的模块名换成模块 ID
   6. 把依赖的模块 ID 和依赖的模块路径放置到当前模块 module 的依赖数组中
   7. 调用 generator（ast），把转换后的源码放在 module.\_source 属性,用于后面写入文件
   8. 遍历`module.dependencies`，递归构建 module，构建好的存储到 this.modules 上，如果第二个入口也依赖该模块，直接取用，只需要给该模块的 name 属性上添加上入口信息

#### **输出资源**

8. **组装 chuck 对象：**

   1. 组装

   ```js
   const chuck = {
     name: "entry1", //入口名称
     entryModule, //入口的模块的module {id,name,dependencies,_source}
     modules: [{}], // 入口依赖模块的集合
   }
   ```

   2. `this.chunks.push(chunk)`

#### 生成 bundle 文件

9.  把每个 Chunk 转换成一个单独的文件加入到输出列表
    1. 获取要生成的文件名称并把文件名添加到 this.files 中
    2. 获取文件内容并给 this.assets 对象
    3. 执行 `compilation.build` 方法的回调

#### 写入文件

10. 在确定好输出内容后，根据配置确定输出的路径和文件名，把文件内容写入到文件系统
