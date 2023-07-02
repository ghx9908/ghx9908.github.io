---
title: react-router源码深度解刨
author: 高红翔
date: 2023-07-01 19:04:19
categories: 前端框架
tags: React.js
---

代码地址：

- https://github.com/ghx9908/react-router
- https://github.com/remix-run/react-router
- https://create-react-app.dev/
- https://reactrouter.com/

## 1. React 路由原理

- 不同的路径渲染不同的组件
- 有两种实现方式
  - HashRouter:利用 hash 实现路由切换
  - BrowserRouter:实现 h5 Api 实现路由的切换

### 1.1 HashRouter

- 利用 hash 实现路由切换

```html
<body>
  <div id="root"></div>
  <ul>
    <li><a href="#/a">/a</a></li>
    <li><a href="#/b">/b</a></li>
  </ul>
  <script>
    window.addEventListener("hashchange", () => {
      //把最前面的那个# 删除
      let pathname = window.location.hash.slice(1)
      root.innerHTML = pathname
    })
  </script>
</body>
```

### 1.2 BrowserRouter

- 利用 h5 Api 实现路由的切换

#### 1.2.1 history

- HTML5 规范给我们提供了一个[history](https://developer.mozilla.org/zh-CN/docs/Web/API/Window/history)接口
- HTML5 History API 包括 2 个方法：`history.pushState()`和`history.replaceState()`，和 1 个事件`window.onpopstate`

##### 1.2.1.1 pushState

- history.pushState(stateObject, title, url)，包括三个参数
  - 第一个参数用于存储该 url 对应的状态对象，该对象可在 onpopstate 事件中获取，也可在 history 对象中获取
  - 第二个参数是标题，目前浏览器并未实现
  - 第三个参数则是设定的 url
- pushState 函数向浏览器的历史堆栈压入一个 url 为设定值的记录，并改变历史堆栈的当前指针至栈顶

##### 1.2.1.2 replaceState

- 该接口与 pushState 参数相同，含义也相同
- 唯一的区别在于`replaceState`是替换浏览器历史堆栈的当前历史记录为设定的 url
- 需要注意的是`replaceState`不会改动浏览器历史堆栈的当前指针

##### 1.2.1.3 onpopstate

- 该事件是 window 的属性
- 该事件会在调用浏览器的前进、后退以及执行`history.forward`、`history.back`、和`history.go`触发，因为这些操作有一个共性，即**修改了历史堆栈的当前指针**
- 在不改变 document 的前提下，一旦当前指针改变则会触发`onpopstate`事件

```html
<body>
  <div id="root"></div>
  <ul>
    <li><a onclick="go('/a')">/a</a></li>
    <li><a onclick="go('/b')">/b</a></li>
    <li><a onclick="go('/c')">/c</a></li>
    <li><a onclick="forward()">前进</a></li>
    <li><a onclick="back()">后退</a></li>
  </ul>
  <script>
    function render() {
      root.innerHTML = window.location.pathname
    }
    //只有当你前进后退的时候会触发，pushState不会触发
    window.onpopstate = render
    let historyObj = window.history
    let oldPushState = historyObj.pushState
    historyObj.pushState = function (state, title, url) {
      oldPushState.apply(history, arguments)
      render()
    }
    function go(path) {
      historyObj.pushState({}, null, path)
    }
    function forward() {
      historyObj.go(1)
      //historyObj.forward();
    }
    function back(path) {
      historyObj.go(-1)
      //historyObj.back();
    }
  </script>
</body>
```

## 2.使用基本路由

- `HashRouter` 是一个使用 URL 的哈希部分（# 之后的部分）来实现客户端路由的路由器。它的主要优势是可以在不需要服务器端配置的情况下支持浏览器的历史记录功能。这在一些特定场景下（例如 GitHub Pages）非常实用
- `BrowserRouter` 是一个使用 HTML5 历史记录 API（pushState、replaceState 和 popstate 事件）的路由器。它可以帮助你创建更美观的 URL（没有哈希部分）以及更好地支持服务器端渲染的单页面应用（SPA）
- `Routes`组件是一个重要的组成部分，它负责定义和组织路由规则
- `Route` 组件用于定义应用程序的路由规则。Route 组件需要指定一个 URL 路径（通过 path 属性）和与该路径关联的组件（通过 element 属性）。当用户访问与某个 Route 定义的路径相匹配的 URL 时，React Router 会渲染与该路径关联的组件,如果您希望为嵌套路由提供支持，可以在 Route 的 element 属性中使用 Outlet 组件。当子路由匹配时，Outlet 组件将被替换为对应的子路由组件

```jsx
    <BrowserRouter>
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/user" element={<User />} />
            <Route path="/profile" element={<Profile />} />
        </Routes>
    </BrowserRouter>);

```

## 3.实现基本路由

-

![](https://raw.githubusercontent.com/ghx9908/image-hosting/master/img20230630164132.png)

### 3.1**BrowserRouter**组件的实现

- 创建一个 history 对象保存路由历史记录
- 存储 history 的 location 和 action 信息到状态 state 中
- 当 history 发生变化时,监听更新状态
- 最终将状态 state 和 history 作为 props 传递给 <Router> 组件

```jsx
// 使用 useRef 缓存 history 对象,避免重复创建
// 状态 state 存储 location 和 action
// 在 useLayoutEffect 中监听 history 变化,并更新状态
// 将状态和 history 对象作为 Router 组件的 props 传递
// 以达到与 Router 组件高效同步的目的

export function BrowserRouter({ children }) {
  // 使用 Ref 存取 history 对象,只在第一次渲染时创建
  const historyRef = useRef()
  if (historyRef.current == null) {
    historyRef.current = createBrowserHistory()
  }
  const history = historyRef.current
  // 状态 state 存储 location 和 action 信息
  const [state, setState] = useState({
    location: history.location,
    action: history.action,
  })
  // 在 useLayoutEffect 中监听 history 变化,并更新状态
  useLayoutEffect(() => history.listen(setState), [history])
  // 返回 Router 组件,并使用状态及 history 对象作为 props
  return (
    <Router
      children={children}
      location={state.location}
      navigator={history}
      navigationType={state.action}
    />
  )
}
```

### 3.2**HashRouter**组件的实现

- 通过 createHashHistory() 创建一个保存 hash 变化记录的 history 对象
- 使用 useRef 来缓存 history 对象,避免重复创建
- 状态 state 中存储 location 和 action 信息
- 在 useLayoutEffect 中监听 history 变化,更新状态
- 将状态 state 和 history 对象作为 props 传给 <Router/>组件,从而实现 hash 路由功能

```jsx
export function HashRouter({ children }) {
  //  使用 Ref 缓存 history 对象,只在第一次渲染时创建
  const historyRef = useRef()
  if (historyRef.current == null) {
    historyRef.current = createHashHistory()
  }
  const history = historyRef.current
  //   状态 state 存储 location 和 action 信息
  const [state, setState] = useState({
    location: history.location,
    action: history.action,
  })
  //   在 useLayoutEffect 中监听 history 变化,并更新状态
  useLayoutEffect(() => {
    history.listen(setState)
  }, [history])
  //  返回 Router 组件,并使用状态及 history 对象作为 props
  return (
    <Router
      children={children}
      location={state.location}
      navigator={history}
      navigationType={state.action}
    />
  )
}
// 使用 useRef 来缓存 history 对象,避免重复创建
// 状态 state 存储 location 和 action 保存历史记录信息
// 在 useLayoutEffect 中监听 history 变化,并更新状态
// 将状态和 history对象作为 props 传递给<Router />组件,实现hash路由
```

### 3.3 Router 的实现

**创建三个全局上下文:**

1. NavigationContext : 提供 history 对象

2. LocationContext : 提供 location(地址)信息
3. RouteContext : 提供与当前路由有关的信息

**Router 组件:**

- 从 props 中获取 children(子路由)、location 和 history
- 分别将 history 和 location 信息放入 NavigationContext 和 LocationContext 中
- 从而让后代组件都可以通过 context 获取这两个变量

```jsx
// 创建 NavigationContext,存储 history 对象
export const NavigationContext = React.createContext(null)
// 创建 LocationContext,存储 location 信息
export const LocationContext = React.createContext(null)
// 创建 RouteContext,存储与当前路由相关的上下文
export const RouteContext = React.createContext({
  outlet: null,
  matches: [],
})
/**
 * 路由器组件
  @param {} children  子路由组件  
  @param {} location  当前地址
  @param {} navigator history 对象
 * @returns
 */
export function Router({ children, location, navigator, navigationType }) {
  // 往全局上下文中分别提供 history 对象和 location 信息
  return (
    <NavigationContext.Provider value={navigator}>
      <LocationContext.Provider value={location}>
        {children}
      </LocationContext.Provider>
    </NavigationContext.Provider>
  )
}
```

### 3.4 Routes 组件的实现

Routes 组件做了以下工作:

1. 从 children 中遍历所有的 Route 组件
2. 根据每个 Route 的 path 属性,生成一个路由表 routes
3. 调用 useRoutes(routes) ,根据当前路径,匹配出对应的 Route
4. 渲染匹配的 Route 组件

```jsx 
 /**
 * 读取当前的路径，和每一个孩子的path做匹配，渲染匹配的组件
 */
export function Routes({ children }) {
  // 从子节点 Route 中创建路由表
  const routes = createRoutesFromChildren(children)
  // 调用 useRoutes,根据当前路径匹配路由
  // 核心
  return useRoutes(routes)
}
export function Route() {

}

function createRoutesFromChildren(children) {
  const routes = []
  React.Children.forEach(children, (element) => {
    let route = {
      path: element.props.path,
      element: element.props.element,
    }
    // 如果有子节点 Route,则递归创建路由
    if (element.props.children) {
      route.children = createRoutesFromChildren(element.props.children)
    }
    routes.push(route)
  })

  return routes
}
```

### 3.5 **useRoutes**简单版的实现

**useRoutes 函数的作用是:**

1. 获取当前 URL 地址
2. 遍历路由表 routes
3. 如果有匹配的路由,则渲染该路由对应的组件

```jsx 
export function useRoutes(routes) {
// 从 LocationContext 中获取当前地址
  let location = useLocation();
// 获取 pathname
  let pathname = location.pathname || "/";
// 遍历路由表
  for (let i = 0; i < routes.length; i++) {
     let route = routes[i];
// 如果当前路径匹配路由
     if (route.path === pathname) {
// 渲染该路由的组件
        return (
           route.element
        )
     }
  }
}

```

### 3.6 useLocation 的实现

```js
// 获取 LocationContext 中的 location 对象
export function useLocation() {
  const location = React.useContext(LocationContext)
  return location
}
```

## 4.实现 history

### 4.1 createBrowserHistory 的实现

1. 定义了获取 location 信息的函数 getBrowserLocation()
2. 定义创建路由 href 的函数 createBrowserHref()
3. 调用 getUrlBashHistory() 来实现具体的 history 对象

```js
export function createBrowserHistory() {
  // 获取当前 location 信息的函数
  function getBrowserLocation(window, globalHistory) {
    const { pathname } = window.location
    const state = globalHistory.state || {}
    return { pathname, state: state.usr }
  }
  // 创建具体 href 的函数
  function createBrowserHref(to) {
    return to
  }
  // 调用封装函数创建 history 对象
  return getUrlBashHistory(getBrowserLocation, createBrowserHref)
}
```

### 4.2 createHashHistory 的实现

1. 如果没有 hash 初始为
2. 定义了获取 location 信息的函数 getHashLocation()
3. 定义创建路由 href 的函数 createHashHref(). 调用 getUrlBashHistory() 来实现具体的 history 对象

```js
export function createHashHistory() {
  // 如果没有hash,初始化为#/
  if (!window.location.hash) {
    window.location.hash = "/"
  }
  // 获取当前 hash 信息的函数
  function getHashLocation(window, globalHistory) {
    const pathname = window.location.hash.substr(1)
    const state = globalHistory.state || {}
    return { pathname, state: state.usr }
  }
  // 创建具体hash href的函数
  function createHashHref(to) {
    let url = window.location.href
    let hashIndex = url.indexOf("#")
    // 对url做处理,获得#之前的部分
    let href = hashIndex !== -1 ? url : url.slice(0, hashIndex)
    // 然后添加#
    return href + "#" + to
  }
  // 调用封装函数创建 history 对象
  return getUrlBashHistory(getHashLocation, createHashHref)
}
```

### 4.3 getUrlBashHistory 的实现

```js
/**
 * 创建路由history
 * @param {*} getLocation  获取当前 location 信息的函数
 * @param {*} createHarf 创建具体 href 的函数
 * @returns
 */
function getUrlBashHistory(getLocation, createHarf) {
  // 获取全局history对象
  const globalHistory = window.history
  // 存储监听函数
  let listener = null
  // 当前索引
  let index = getIndex()
  // 如果index为空,初始化为0
  if (index === null) {
    index = 0
    // 使用replaceState初始化
    globalHistory.replaceState(
      {
        usr: globalHistory.state,
        idx: index, // 在原来的基础上添加一个索引
      },
      ""
    )
  }
  // 获取索引的函数
  function getIndex() {
    let state = globalHistory.state || { idx: null }
    return state.idx
  }

  // popstate事件(也就是路由变化)时调用监听函数
  function handlePop() {
    // 设置action类型为 Pop
    action = Action.Pop
    // 获取最新索引
    let nextIndex = getIndex()
    // 计算索引变化量
    let delta = nextIndex == null ? null : nextIndex - index
    // 更新索引
    index = nextIndex
    // 调用监听函数,传递action、location和索引变化量
    if (listener) {
      listener({
        action,
        location: history.location,
        delta,
      })
    }
  }

  /**
   *  通过pushState()方法改变路由历史记录 调用监听函数,传入变更信息
   * @param {*} to
   * @param {*} state
   */
  function push(to, state) {
    // 将索引 +1
    index = getIndex() + 1
    // 设置action为Push类型
    action = Action.Push
    // 根据路径创建url
    const url = createHarf(to)
    // 使用pushState方法改变历史
    globalHistory.pushState({ idx: index, usr: state }, "", url)
    if (listener) {
      // 调用监听函数,传递action、location和变更索引(delta为1)
      listener({ action, location: history.location, delta: 1 })
    }
  }

  function replace(to, state) {
    // 设置action为Replace类型
    action = Action.Replace
    // 获取当前索引
    index = getIndex()
    // 根据路径创建URL
    let url = history.createHref(to)
    // 使用replaceState()替换历史记录
    globalHistory.replaceState(
      {
        idx: index,
        usr: state,
      },
      "",
      url
    )
    // 如果有监听函数
    if (listener) {
      // 传递变更信息给监听函数
      listener({
        action,
        location: history.location,
        delta: 0,
      })
    }
  }
  let history = {
    get index() {
      return index
    },
    get action() {
      return action
    },
    get location() {
      return getLocation(window, globalHistory)
    },
    push,
    replace,
    listen(fn) {
      // 订阅popstate事件
      window.addEventListener(PopstateEventType, handlePop)
      // 存储监听函数
      listener = fn
      // 返回移除监听功能的函数
      return () => {
        // 移除事件监听
        window.removeEventListener(PopstateEventType, handlePop)
        // 清空监听函数
        listener = null
      }
    },
    go(n) {
      return globalHistory.go(n)
    },
  }
  return history
}
```

#### **push()函数**:

- 通过 pushState()方法改变路由历史记录
- 调用监听函数,传入变更信息
  - action 类型
  - 最新 location 信息
  - 索引变化量(delta 为 1)

当调用 push()方法导航到新的路由时,会触发监听函数,我们可以在函数内进行相关的路由切换操作。

#### **replace()函数**

- 通过 replaceState()方法替换路由历史记录

- 调用监听函数,传入变更信息

  - action 类型

  - 最新 location 信息

  - 索引变化量(delta 为 0)

当调用 replace()方法导航到新的路由时,会触发监听函数,我们可以在函数内进行相关的路由切换操作。

#### **listen()方法**

作用

- 订阅 popstate 事件,监听路由变化
- 接收一个回调函数 fn ,用作监听函数
- 返回一个销毁监听器的函数

整体流程是：

1. 调用 listen() 订阅事件
2. 封装 fn 函数来处理路由变化逻辑
3. 调用 remover() 移除事件监听

## 5. 路径参数

```jsx
<Route path="/post/:id" element={<Post />} />
```

### 5.1useRoutes

```diff
// 根据 routes 配置的路由表匹配当前 location,并渲染匹配的路由元素
export function useRoutes(routes) {
  const location = useLocation() // 获取当前 location 对象
  let pathname = location.pathname || "/" // 取 pathname,如果不存在则默认为 /
+ let matches = matchRoutes(routes, { pathname }) // 使用 pathname 匹配 routes 路由表
  console.log("matches=>", matches)
  if (matches) return match.route.element // 匹配成功则渲染路由组件
}
```

### 5.2matchRoutes

- 根据 location 和 routes 获取当前应该匹配的具体路由

匹配信息包含:

- 路径匹配的参数值
- 匹配成功的具体路由

```jsx
//根据 location 和 routes获取当前应该匹配的具体路由
export function matchRoutes(routes, location) {
  // 获取地址中的路径
  let { pathname } = location
  // 最终匹配结果
  let match = null
  // 遍历路由表
  for (let i = 0; i < routes.length; ++i) {
    // 尝试使用 matchPath 匹配路径
    match = matchPath(routes[i].path, pathname)
    // 如果匹配成功
    if (match) {
      // 设置匹配的路由信息
      match.route = routes[i]
      // 返回匹配结果
      return match
    }
  }
}

//根据提供的路由模式和路径尝试匹配路径,
//如果匹配成功则返回:匹配路由的参数对象 params
export function matchPath(pattern, pathname) {
  // 使用 compilePath 解析路由模式
  let [matcher, paramNames] = compilePath(pattern, true)
  // 使用 matcher 尝试匹配路径
  let match = pathname.match(matcher)
  // 如果不匹配则返回 null
  if (!match) return null
  // 获取匹配后的组团
  let captureGroups = match.slice(1)
  // 创建params对象
  let params = paramNames.reduce((memo, paramName, index) => {
    memo[paramName] = captureGroups[index]
    return memo
  }, {})
  // 返回匹配结果,包括params
  return {
    params,
  }
}

// 根据一个路径字符串,构建一个匹配该路径的正则表达式。
// 同时记录路径定义的参数名称
function compilePath(path, end) {
  // paramNames 用于存储匹配的参数
  let paramNames = []
  //  构建正则表达式的源码 regexpSource
  // 通过调用 .replace() 处理 path
  let regexpSource =
    "^" +
    path
      // 处理path
      .replace(/\/\?$/, "")
      .replace(/^\/*/, "/")
      .replace(/\/:(\w+)/g, (_, paramName) => {
        // 当匹配到 :param 时,将其替换为捕获组
        // 同时 push 到 paramNames
        paramNames.push(paramName)
        return "/([^\\/]+)"
      })
  // 如果是完整匹配
  if (end) {
    regexpSource += "$"
  }
  // 编译 regexpSource 成RegExp对象
  let matcher = new RegExp(regexpSource)
  // 返回匹配器和参数名list
  return [matcher, paramNames]
}
```

#### matchPath 函数

根据提供的路由模式和路径尝试匹配路径,如果匹配成功则返回:

- 匹配路由的参数对象 params

params 对象包含:

- 路由路径中定义的参数的值

所以,通过调用这个函数,我们可以获得:

- 路径是否匹配
- 匹配路由的参数

从而可以提取匹配到的路由的参数,用于后续操作。

#### compilePath 函数

通过调用这个函数,我们可以获得: **[matcher, paramNames]**

- matcher:匹配路径的正则表达式

- paramNames:路径定义的参数名称列表

从而我们可以根据 matcher 来匹配路径,根据 paramNames 来提取匹配到的参数。

## 6. Link 导航

```jsx
<ul>
  <li>
    <Link to="/">首页</Link>
  </li>
  <li>
    <Link to="/user">用户管理</Link>
  </li>
  <li>
    <Link to="/profile">个人中心</Link>
  </li>
</ul>
```

### 6.1 Link 组件的实现

Link 组件就是一个包装好点击跳转行为的 a 标签。

- 捕获点击事件
- 阻止默认行为
- 调用 navigate(to, state)跳转到指定路由

```js
export const Link = function (props) {
  // 提取 to 和 state 属性
  const { to, state, ...rest } = props
  //使用useNavigate获取navigate函数
  const navigate = useNavigate()
  // 点击时触发 navigate
  function handleClick(event) {
    event.preventDefault()
    navigate(to, state)
  }
  // 返回a标签,绑定点击事件
  return <a {...rest} onClick={handleClick} />
}
```

### 6.2 useNavigate 的实现

返回一个 navigate() 函数

navigate() 内部会调用 `navigator.push()`来实现路由跳转

```js
export function useNavigate() {
  // 从 NavigationContext中读取路由导航器
  let navigator = React.useContext(NavigationContext)
  // 定义navigate函数
  let navigate = React.useCallback(
    (to, state) => {
      // 调用navigator的push方法
      navigator.push(to, state)
    },
    // 使navigate依赖navigator,只在它改变时更新
    [navigator]
  )
  // 返回navigate函数
  return navigate
}
```

## 7. 嵌套路由（核心）

```jsx

  <Route path="/user" element={<User />}>
    <Route path="add" element={<UserAdd />} />
    <Route path="list" element={<UserList />} />
    <Route path="detail/:id" element={<UserDetail />} />
  </Route>

  //User -----
  <div>
    <ul>
      <li>
        <Link to="/user/list">用户列表</Link>
      </li>
      <li>
        <Link to="/user/add">添加用户</Link>
      </li>
    </ul>
    <Outlet />
  </div>

```

### 7.1 数据结构

#### 7.1.1 routes

```js
const routes = [
  { path: "/", element: <Home /> },
  {
    path: "user",
    element: <User />,
    children: [
      { path: "add", element: <UserAdd /> },
      { path: "list", element: <UserList /> },
      { path: "detail/:id", element: <UserDetail /> },
    ],
  },
  { path: "*", element: <NotFound /> },
]
```

#### 7.1.1branches

简介版

```js
const branches = [
  { path: "/user/*/add", routesMeta: [user * Meta, addMeta] },
  { path: "/user/*/list", routesMeta: [user * Meta, listMeta] },
  { path: "/user/*/detail", routesMeta: [user * Meta, detailMeta] },
  { path: "/user/*", routesMeta: [user * Meta] },
]
```

复杂版

```js
const branches = [
  {
    path: "/user/detail/:id",
    routesMeta: [
      {
        relativePath: "user",
        childrenIndex: 1,
        route: {
          path: "user",
          element: {
            $$typeof: Symbol(react.element),
            type: Profile,
            props: {},
          },
          children: [
            {
              path: "add",
              element: {
                $$typeof: Symbol(react.element),
                type: Profile,
                props: {},
              },
            },
            {
              path: "list",
              element: {
                $$typeof: Symbol(react.element),
                type: Profile,
                props: {},
              },
            },
            {
              path: "detail/:id",
              element: {
                $$typeof: Symbol(react.element),
                type: Profile,
                props: {},
              },
            },
          ],
        },
      },
      {
        relativePath: "detail/:id",
        childrenIndex: 2,
        route: {
          path: "detail/:id",
          element: {
            $$typeof: Symbol(react.element),
            type: Profile,
            props: {},
          },
        },
      },
    ],
    score: 28,
  },
  {
    path: "/user/add",
    routesMeta: [
      {
        relativePath: "user",
        childrenIndex: 1,
        route: {
          path: "user",
          element: {
            $$typeof: Symbol(react.element),
            type: Profile,
            props: {},
          },
          children: [
            {
              path: "add",
              element: {
                $$typeof: Symbol(react.element),
                type: Profile,
                props: {},
              },
            },
            {
              path: "list",
              element: {
                $$typeof: Symbol(react.element),
                type: Profile,
                props: {},
              },
            },
            {
              path: "detail/:id",
              element: {
                $$typeof: Symbol(react.element),
                type: Profile,
                props: {},
              },
            },
          ],
        },
      },
      {
        relativePath: "add",
        childrenIndex: 0,
        route: {
          path: "add",
          element: {
            $$typeof: Symbol(react.element),
            type: Profile,
            props: {},
          },
        },
      },
    ],
    score: 24,
  },
  {
    path: "/user/list",
    routesMeta: [
      {
        relativePath: "user",
        childrenIndex: 1,
        route: {
          path: "user",
          element: {
            $$typeof: Symbol(react.element),
            type: Profile,
            props: {},
          },
          children: [
            {
              path: "add",
              element: {
                $$typeof: Symbol(react.element),
                type: Profile,
                props: {},
              },
            },
            {
              path: "list",
              element: {
                $$typeof: Symbol(react.element),
                type: Profile,
                props: {},
              },
            },
            {
              path: "detail/:id",
              element: {
                $$typeof: Symbol(react.element),
                type: Profile,
                props: {},
              },
            },
          ],
        },
      },
      {
        relativePath: "list",
        childrenIndex: 1,
        route: {
          path: "list",
          element: {
            $$typeof: Symbol(react.element),
            type: Profile,
            props: {},
          },
        },
      },
    ],
    score: 24,
  },
  {
    path: "/user",
    routesMeta: [
      {
        relativePath: "user",
        childrenIndex: 1,
        route: {
          path: "user",
          element: {
            $$typeof: Symbol(react.element),
            type: Profile,
            props: {},
          },
          children: [
            {
              path: "add",
              element: {
                $$typeof: Symbol(react.element),
                type: Profile,
                props: {},
              },
            },
            {
              path: "list",
              element: {
                $$typeof: Symbol(react.element),
                type: Profile,
                props: {},
              },
            },
            {
              path: "detail/:id",
              element: {
                $$typeof: Symbol(react.element),
                type: Profile,
                props: {},
              },
            },
          ],
        },
      },
    ],
    score: 13,
  },
  {
    path: "/",
    routesMeta: [
      {
        relativePath: "/",
        childrenIndex: 0,
        route: {
          path: "/",
          element: {
            $$typeof: Symbol(react.element),
            type: Profile,
            props: {},
          },
        },
      },
    ],
    score: 4,
  },
  {
    path: "/*",
    routesMeta: [
      {
        relativePath: "*",
        childrenIndex: 2,
        route: {
          path: "*",
          element: {
            $$typeof: Symbol(react.element),
            type: Profile,
            props: {},
          },
        },
      },
    ],
    score: 1,
  },
]
```

#### 7.1.2 matches

```js
const matches = [
  {
    pathname: "/user",
    route: {
      element: {
        type: User,
      },
      path: "/user",
    },
  },
  {
    pathname: "/user/list",
    route: {
      element: {
        type: UserList,
      },
      path: "list",
    },
  },
]
```

#### 7.1.3 renderMatches

```js
let element = {
  $$typeof: Symbol(react.element),
  type: {
    $$typeof: Symbol(react.provider),
  },
  props: {
    value: {
      outlet: {
        $$typeof: Symbol(react.element),
        type: {
          $$typeof: Symbol(react.provider),
        },
        props: {
          value: {
            outlet: null,
            matches: [
              {
                params: {},
                pathname: "/user",
                route: {
                  element: {
                    $$typeof: Symbol(react.element),
                    type: User,
                    props: {},
                  },
                  path: "/user",
                },
              },
              {
                params: {},
                pathname: "/user/list",
                route: {
                  element: {
                    $$typeof: Symbol(react.element),
                    type: User,
                    props: {},
                  },
                  path: "list",
                },
              },
            ],
          },
        },
      },
      matches: [
        {
          params: {},
          pathname: "/user",
          route: {
            element: {
              $$typeof: Symbol(react.element),
              type: User,
              props: {},
            },
            path: "/user",
          },
        },
      ],
    },
  },
}
```

### 7.2useRoutes（完整版）

- 根据当前地址
- 从路由表中匹配路径
- 如果匹配成功则渲染匹配的路由

```js
export function useRoutes(routes) {
  // 从 LocationContext 中读取地址
  let location = useLocation()
  // 获取路径
  let pathname = location.pathname || "/"
  // 调用matchRoutes匹配路径
  let matches = matchRoutes(routes, { pathname })
  // 如果匹配成功
  if (matches)
    // 渲染匹配结果
    return renderMatches(matches)
}
```

#### matchRoutes

> 根据提供的 location 和 routes，将路由扁平化并分级为多个分支，遍历每个分支尝试匹配，返回第一个匹配成功的结果

```jsx
export function matchRoutes(routes, location) {
  // 从地址中获取路径
  let { pathname } = location
  // 将嵌套路由扁平化为一个数组
  let branches = flattenRoutes(routes)
  // 给路由分级
  rankRouteBranches(branches)
  // 初始化matches为null
  let matches = null
  // 遍历扁平后的路由数组
  for (let i = 0; matches == null && i < branches.length; ++i) {
    // 尝试匹配当前分支
    matches = matchRouteBranch(branches[i], pathname)
  }
  // 返回匹配结果
  return matches
}
```

### 7.3flattenRoutes

- 将一个嵌套的路由数组:扁平化为一个单层的路由数组,同时记录每个路由的元数据(子路由索引、完整路径等)

```jsx
export const joinPaths = (paths) => paths.join("/").replace(/\/\/+/g, "/")

// 定义一个函数，将嵌套的路由数组扁平化
function flattenRoutes(
  routes,
  branches = [],
  parentsMeta = [],
  parentPath = ""
) {
  // 定义一个内部函数，处理单个路由对象
  let flattenRoute = (route, index) => {
    // 定义一个元数据对象，存储路由相关信息
    let meta = {
      relativePath: route.path,
      childrenIndex: index,
      route,
    }
    // 使用 joinPaths 函数将父路径与当前相对路径组合，生成完整路径
    let path = joinPaths([parentPath, meta.relativePath])
    // 将当前路由元数据添加到父级元数据数组中
    let routesMeta = parentsMeta.concat(meta)
    // 如果当前路由对象有子路由，则递归处理
    if (route.children && route.children.length > 0) {
      flattenRoutes(route.children, branches, routesMeta, path)
    }
    // 将路径和元数据对象添加到结果数组中
    branches.push({ path, routesMeta, score: computeScore(path, route.index) })
  }
  // 遍历路由数组，调用内部函数处理每个路由对象
  routes.forEach((route, index) => {
    flattenRoute(route, index)
  })
  // 返回扁平化后的路由数组
  return branches
}
```

#### computeScore

根据 path 计算一个分数主要根据路径中的静态片断、参数、通配符等根据这些特征来给予不同的"分数"分数较高的路径匹配程度较好

```jsx
// 如果路径中有通配符*就减少2分
const splatPenalty = -2
// 作为indexRoute增加2分
const indexRouteValue = 2
// 定义参数正则
const paramRegexp = /^:\w+$/
// 动态片断增加3分
const dynamicSegmentValue = 3
// 空片断增加1分
const emptySegmentValue = 1
// 静态片断增加10分
const staticSegmentValue = 10
// 判断是否有*
const isSplat = (s) => s === "*"

function computeScore(path, index) {
  // 初始分数
  let initialScore = segments.length
  // 如果有*,减少2分
  if (segments.some(isSplat)) {
    initialScore += splatPenalty
  }
  // 如果是indexRoute,增加2分
  if (typeof index !== "undefined") {
    initialScore += indexRouteValue
  }
  // 返回每个片断计算后的分数
  return segments.filter(isSplat).reduce((score, segment) => {
    // 当前片断的分数
    let currentScope = 0
    // 如果是路径参数,增加3分
    if (paramRegexp.test(segment)) {
      currentScope += dynamicSegmentValue
    }
    // 如果是空片断,增加1分
    // 如果是静态片断,增加10分
    // ...
    // 总分+当前片断的分数
    score += currentScope
    // 返回总分
    return score
  }, initialScore)
}
```

#### rankRouteBranches

将路由数组根据 score 进行排序，score 高的分支排在前面，如果 score 相同则根据子路由 index 排序

```js
function rankRouteBranches(branches) {
  // 根据 score 排序 branches
  branches.sort((a, b) => {
    // 比较 score
    if (a.score !== b.score) {
      return b.score - a.score
    }
    // 如果 score 相同
    else {
      // 比较子路由的 index
      return compareIndexes(
        a.routesMeta.map((meta) => meta.childrenIndex),
        b.routesMeta.map((meta) => meta.childrenIndex)
      )
    }
  })
}
```

### 7.4 matchRouteBranch

> 根据提供的 branch 和 pathname，遍历 branch 中的路由元数据，尝试匹配每个路由路径，如果匹配成功则收集匹配信息，最终返回所有匹配成功的结果

```jsx
/**
 * 定义matchRouteBranch函数，用于匹配路由分支和路径名
 * @param {*} branch 分支
 * @param {*} pathname 路径名
 * @returns
 */
function matchRouteBranch(branch, pathname) {
  // 从branch中解构routesMeta
  let { routesMeta } = branch
  // 初始化匹配参数、匹配路径名、匹配数组
  let matchedParams = {}
  let matchedPathname = "/"
  let matches = []
  // 遍历routesMeta
  for (let i = 0; i < routesMeta.length; ++i) {
    // 获取当前元素的meta
    let meta = routesMeta[i]
    // 判断是否为最后一个元素
    let end = i === routesMeta.length - 1
    // 获取剩余路径名
    let remainingPathname =
      matchedPathname === "/"
        ? pathname
        : pathname.slice(matchedPathname.length) || "/"
    // 获取当前路径匹配结果
    let match = matchPath({ path: meta.relativePath, end }, remainingPathname)
    // 若没有匹配结果，返回null
    if (!match) return null
    // 将当前匹配参数合并到matchedParams
    Object.assign(matchedParams, match.params)
    // 获取当前路由
    let route = meta.route
    // 将匹配结果添加到matches数组
    matches.push({
      params: matchedParams,
      pathname: joinPaths([matchedPathname, match.pathname]),
      route,
    })
    // 更新匹配路径名
    matchedPathname = joinPaths([matchedPathname, match.pathname])
  }
  // 返回匹配结果数组
  return matches
}

export const joinPaths = (paths) => paths.join("/").replace(/\/\/+/g, "/")
```

#### matchPath

##### matchPath 函数

根据提供的路由模式和路径尝试匹配路径,如果匹配成功则返回:

- 匹配路由的参数对象 params

params 对象包含:

- 路由路径中定义的参数的值

所以,通过调用这个函数,我们可以获得:

- 路径是否匹配
- 匹配路由的参数

从而可以提取匹配到的路由的参数,用于后续操作。

##### compilePath 函数

通过调用这个函数,我们可以获得: **[matcher, paramNames]**

- matcher:匹配路径的正则表达式

- paramNames:路径定义的参数名称列表

从而我们可以根据 matcher 来匹配路径,根据 paramNames 来提取匹配到的参数。

```js
//根据提供的路由模式和路径尝试匹配路径,
//如果匹配成功则返回:匹配路由的参数对象 params
export function matchPath({ path, end }, pathname) {
  // 调用compilePath解析路由
  let [matcher, paramNames] = compilePath(path, end)
  // 使用 matcher 尝试匹配路径
  let match = pathname.match(matcher)
  // 如果不匹配则返回null
  if (!match) return null
  // 获取已匹配的路径
  let matchedPathname = match[0]
  // 获取匹配组团
  let captureGroups = match.slice(1)
  // 创建params对象
  let params = paramNames.reduce((memo, paramName, index) => {
    memo[paramName] = captureGroups[index]
    return memo
  }, {})
  // 返回匹配结果
  return {
    params,
    pathname: matchedPathname,
  }
}

function compilePath(path, end = true) {
  // 保存路径参数名称
  let paramNames = []
  // 保存正则表达式源码
  let regexpSource =
    "^" +
    path
      // 去掉路径末尾的 *、**
      .replace(/\/\?$/, "")
      // 确保路径以/开始
      .replace(/^\/*/, "/")
      // 当匹配 :param 时,将其替换为捕获组
      .replace(/\/:(\w+)/g, (_, paramName) => {
        paramNames.push(paramName)
        return "/([^\\/]+)"
      })
  // 如果路径为*时,将*加入名称列表,并使正则匹配任意内容
  if (path === "*") {
    paramNames.push("*")
    regexpSource += "(.*)$"
  }
  // 如果需要完整匹配,添加$
  if (end) {
    regexpSource += "$"
  }
  // 编译正则表达式
  let matcher = new RegExp(regexpSource)
  // 返回匹配器和参数名称
  return [matcher, paramNames]
}
```

### 7.5renderMatches 函数的实现

1. 创建了一个 RouteContext
2. renderMatches 函数的作用是:

将匹配结果数组从右向左渲染，为 每个 match 渲染对应路由时，通过 RouteContext.Provider 提供完整的 matches 及 outlet 给下级组件，通过这种方式，下一级组件就可以访问完整的 matches 数组和 outlet。

```jsx
// 创建RouteContext这个context
export const RouteContext = React.createContext({
  outlet: null,
  matches: [],
})
// 定义渲染匹配结果的函数
export function renderMatches(renderedMatches) {
  // 使用 reduceRight 从右向左遍历数组
  return renderedMatches.reduceRight((outlet, match, index) => {
    // 获取当前元素匹配结果之前的数组
    let matches = renderedMatches.slice(0, index + 1)
    // 返回RouteContext.Provider组件
    return (
      <RouteContext.Provider value={{ outlet, matches }}>
        // 渲染当前match对应的route
        {match.route.element}
      </RouteContext.Provider>
    )
  }, null)
}
```

### 7.6 useOutlet 的实现

```jsx
export function useOutlet() {
  let { outlet } = React.useContext(RouteContext)
  return outlet
}
```

### 7.7 useParams 的实现

```jsx
export function useParams() {
  let { matches } = React.useContext(RouteContext)
  let routeMatch = matches[matches.length - 1]
  return routeMatch ? routeMatch.params : {}
}
```

## 8. 实现 NavLink

```js
const activeStyle = { backgroundColor: 'green' };
const activeClassName = 'active';
const activeNavProps = {
    style: ({ isActive }) => isActive ? activeStyle : {},
    className: ({ isActive }) => isActive ? activeClassName : ''
}
<li><NavLink end={true} to="/" {...activeNavProps}>首页</NavLink></li>
<li><NavLink to="/user/list" {...activeNavProps}>用户管理</NavLink></li>
<li><NavLink to="/profile" {...activeNavProps}>个人中心</NavLink></li>
```

> 创建一个自动高亮的链接组件，当被点击且匹配路径时,会自动添加 active 类名

```jsx
export function NavLink({
  // 样式名
  className: classNameProp = "",
  // 是否完整匹配
  end = false,
  // 样式对象
  style: styleProp = {},
  // 跳转路径
  to,
  // 子元素
  children,
  ...rest
}) {
  // 从context获取location
  let location = useLocation()
  // 需要跳转的路径
  let path = { pathname: to }
  // 当前的路径
  let locationPathname = location.pathname
  // 跳转的路径
  let toPathname = path.pathname
  // 判断是否高亮
  let isActive =
    locationPathname === toPathname ||
    (!end &&
      locationPathname.startsWith(toPathname) &&
      locationPathname.charAt(toPathname.length) === "/")
  // 根据样式名 参数获取最终的 className
  let className
  // 根据样式对象(函数|对象)获取最终的 style
  let style
  // 返回Link组件,绑定className和style
  return (
    <Link {...rest} to={to} className={className} style={style}>
      {children}
    </Link>
  )
}
```

## 9.实现 Navigate

**实现路由跳转和重定向**

```jsx
<Route path="*" element={<Navigate to="/" />} />
```

### 实现

```jsx
export function Navigate({ to, state }) {
  let navigate = useNavigate()
  React.useEffect(() => {
    navigate(to, state)
  })
  return null
}
```

## 10. 受保护路由（权限）

```jsx
<Route path="/profile" element={<Protected component={Profile} path="/profile" />} />
<Route path="/login" element={<Login />} />
```

Protected

```jsx
import React from "react"
import { Navigate } from "../react-router-dom"
function Protected(props) {
  let { component: RouteComponent, path } = props
  return localStorage.getItem("login") ? (
    <RouteComponent />
  ) : (
    <Navigate to="/login" state={{ from: path }} />
  )
}
export default Protected
```

## 13. 配置式路由和懒加载

```jsx
import React from "react"
import ReactDOM from "react-dom/client"
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  Navigate,
  useRoutes,
} from "./react-router-dom"
import routesConfig from "./routesConfig"
const LazyPost = React.lazy(() => import("./components/Post"))
function App() {
  let [routes, setRoutes] = React.useState(routesConfig)
  const addRoute = () => {
    setRoutes([
      ...routes,
      {
        path: "/post",
        element: (
          <React.Suspense fallback={<div>loading...</div>}>
            <LazyPost />
          </React.Suspense>
        ),
      },
    ])
  }
  return (
    <div>
      {useRoutes(routes)}
      <button onClick={addRoute}>addRoute</button>
    </div>
  )
}
const activeStyle = { backgroundColor: "green" }
const activeClassName = "active"
const activeNavProps = {
  style: ({ isActive }) => (isActive ? activeStyle : {}),
  className: ({ isActive }) => (isActive ? activeClassName : ""),
}
ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <ul>
      <li>
        <NavLink end={true} to="/" {...activeNavProps}>
          首页
        </NavLink>
      </li>
      <li>
        <NavLink to="/user/list" {...activeNavProps}>
          用户管理
        </NavLink>
      </li>
      <li>
        <NavLink to="/profile" {...activeNavProps}>
          个人中心
        </NavLink>
      </li>
      <li>
        <NavLink to="/post" {...activeNavProps}>
          post
        </NavLink>
      </li>
    </ul>
    <App />
  </BrowserRouter>
)
```

src\routesConfig.js

```jsx
import React from "react"
import Home from "./components/Home"
import User from "./components/User"
import Profile from "./components/Profile"
import UserAdd from "./components/UserAdd"
import UserDetail from "./components/UserDetail"
import UserList from "./components/UserList"
import NotFound from "./components/NotFound"
import Login from "./components/Login"
import Protected from "./components/Protected"
const routes = [
  { path: "/", element: <Home /> },
  { path: "/profile", element: <Profile /> },
  {
    path: "user",
    element: <User />,
    children: [
      { path: "add", element: <UserAdd /> },
      { path: "list", element: <UserList /> },
      { path: "detail/:id", element: <UserDetail /> },
    ],
  },
  { path: "/profile", element: <Protected component={Profile} /> },
  { path: "/login", element: <Login /> },
  { path: "*", element: <NotFound /> },
]
export default routes
```
