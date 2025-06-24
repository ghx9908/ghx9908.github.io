---
title: React中的diff算法？
author: 高红翔
date: 2024-05-11 17:26:30
categories: 前端框架
tags: React
---

React 的 diff 算法是 React 在更新 DOM 时使用的算法。它的目的是最小化页面的重新渲染，以便提高性能。

当 React 渲染组件时，它会在内存中生成虚拟 DOM 树。然后，它会对比新的虚拟 DOM 树和之前的树的差异，找出最小的变化集合。这些变化会被打包成一组操作，用来更新真正的 DOM。

React 的 diff 算法遵循以下规则：

- 同级比较：React 会把新的虚拟 DOM 树中的每一个节点与之前的树中的节点进行比较。如果节点类型不同或者属性不同，React 会直接替换掉原来的节点。如果节点类型相同，React 会继续递归比较这两个节点的子节点。

- 先序深度优先搜索：React 会按照节点的先序深度优先搜索的顺序，对比新旧两棵虚拟 DOM 树。这意味着，如果节点 A 在虚拟 DOM 中出现在节点 B 之前，那么在比较过程中，A 也会先于 B 被比较。

  在比较同级节点时，React 会尽可能多地保留原来的节点。如果新的虚拟 DOM 中有多余的节点，它会把多余的节点插入到相应的位置；如果新的虚拟 DOM 中少了某些节点，它会把多余的节点删除。

  在比较过程中，React 会把节点分成四类：新增、删除、修改、移动。对于新增、删除、修改的节点，React 会直接在 DOM 中进行对应的操作。对于移动的节点，React 会先将节点从原来的位置删除，然后再将节点插入到新的位置。

  通过这样的方式，React 的 diff 算法可以最小化页面的重新渲染，提高性能。

## 单节点的 diff

![](https://raw.githubusercontent.com/ghx9908/image-hosting/master/img/20230220164823.png)

### 1、单节点 key 和类型相同

**核心复用老 Fiber 并返回**

- 在 begin 阶段调用 useFiber 传入老 fiber 和新的虚拟 dom 的 props 创建 WorkInProgress 的新 fiber

main.jsx

```js
function FunctionComponent() {
  const [number, setNumber] = React.useState(0)
  return number === 0 ? (
    <div onClick={() => setNumber(number + 1)} key="title1" id="title">
      title
    </div>
  ) : (
    <div onClick={() => setNumber(number + 1)} key="title" id="title2">
      title2
    </div>
  )
}
```

src\react-reconciler\src\ReactChildFiber.js

```js
/**
 *
 * @param {*} returnFiber 根fiber div#root对应的fiber
 * @param {*} currentFirstChild 老的FunctionComponent对应的fiber
 * @param {*} element 新的虚拟DOM对象
 * @returns 返回新的第一个子fiber
 */
function reconcileSingleElement(returnFiber, currentFirstChild, element) {
  const key = element.key
  let child = currentFirstChild
  while (child !== null) {
    if (child.key === key) {
      if (child.type === element.type) {
        //如果key一样，类型也一样，则认为此节点可以复用
        const existing = useFiber(child, element.props)
        existing.return = returnFiber
        return existing
      }
    }
  }
}

function useFiber(fiber, pendingProps) {
  const clone = createWorkInProgress(fiber, pendingProps)
  clone.index = 0
  clone.sibling = null
  return clone
}
```

### 2、**单节点 key 不同,类型相同，**

**核心删除老节点，添加新节点**

- begin work 阶段 当检测到 key 不同的时候，给父 fiber 的 deletions=[deletedFiber]赋值和 flags 做上删除的标记；
- 在 commit 阶段 从根节点递归遍历处理变更的时候，先通过父 fiber，找到最近真实的 DOM 节点，然后递归从里向外删除它的真实 dom，目的是为了处理一些组件销毁时候如 uesEffect 的副作用。

main.jsx

```jsx
function FunctionComponent() {
  const [number, setNumber] = React.useState(0)
  return number === 0 ? (
    <div onClick={() => setNumber(number + 1)} key="title1" id="title">
      title
    </div>
  ) : (
    <div onClick={() => setNumber(number + 1)} key="title2" id="title2">
      title2
    </div>
  )
}
```

src\react-reconciler\src\ReactChildFiber.js

```jsx
/**
   *
   * @param {*} returnFiber 根fiber div#root对应的fiber
   * @param {*} currentFirstChild 老的FunctionComponent对应的fiber
   * @param {*} element 新的虚拟DOM对象
   * @returns 返回新的第一个子fiber
   */
  function reconcileSingleElement(returnFiber, currentFirstChild, element) {
        const key = element.key;
    	let child = currentFirstChild;
    while (child !== null) {
      	if (child.key === key) {
      //...
        }
     } else {
       deleteChild(returnFiber, child);//给fiber上做标记
     }
      child = child.sibling;
    }



   /**
   *给父fiber的deletions和flags赋值
   * @param {*} returnFiber 父fiber
   * @param {*} childToDelete 将要删除的老节点
   * @returns
   */
  function deleteChild(returnFiber, childToDelete) {
    if (!shouldTrackSideEffects) return
    const deletions = returnFiber.deletions
    if (deletions === null) {
      returnFiber.deletions = [childToDelete]
      returnFiber.flags |= ChildDeletion
    } else {
      returnFiber.deletions.push(childToDelete)
    }
  }
```

src\react-reconciler\src\ReactFiberCommitWork.js

```js
/**
 * 递归遍历处理变更的作用
 * @param {*} root 根节点
 * @param {*} parentFiber  父fiber
 */
function recursivelyTraverseMutationEffects(root, parentFiber) {
  //先把父fiber上该删除的节点都删除
  const deletions = parentFiber.deletions
  if (deletions !== null) {
    for (let i = 0; i < deletions.length; i++) {
      const childToDelete = deletions[i]
      //提交删除副作用
      commitDeletionEffects(root, parentFiber, childToDelete)
    }
  }
  //再去处理剩下的子节点
  //判断是否有副作用...
}
let hostParent = null // 真实的父fiber对应的DOM
/**
 * 提交删除副作用
 * @param {*} root 根节点
 * @param {*} returnFiber 父fiber
 * @param {*} deletedFiber 删除的fiber
 */
function commitDeletionEffects(root, returnFiber, deletedFiber) {
  let parent = returnFiber
  //一直向上找，找到真实的DOM节点为此
  findParent: while (parent !== null) {
    switch (parent.tag) {
      case HostComponent: {
        hostParent = parent.stateNode
        break findParent
      }
      case HostRoot: {
        hostParent = parent.stateNode.containerInfo
        break findParent
      }
    }
    parent = parent.return
  }
  commitDeletionEffectsOnFiber(root, returnFiber, deletedFiber)
  hostParent = null
}

/**
 * 删除真实Dom
 * @param {*} finishedRoot 跟biber
 * @param {*} nearestMountedAncestor 最近的父fiber
 * @param {*} deletedFiber 要删除的fiber
 */
function commitDeletionEffectsOnFiber(finishedRoot, nearestMountedAncestor, deletedFiber) {
  switch (deletedFiber.tag) {
    case HostComponent:
    case HostText: {
      //当要删除一个节点的时候，要先删除它的子节点
      recursivelyTraverseDeletionEffects(finishedRoot, nearestMountedAncestor, deletedFiber)
      //再把自己删除
      if (hostParent !== null) {
        removeChild(hostParent, deletedFiber.stateNode)
      }
      break
    }
    default:
      break
  }
}
//递归遍历
function recursivelyTraverseDeletionEffects(finishedRoot, nearestMountedAncestor, parent) {
  let child = parent.child
  while (child !== null) {
    commitDeletionEffectsOnFiber(finishedRoot, nearestMountedAncestor, child)
    child = child.sibling
  }
}
```

src\react-dom-bindings\src\client\ReactDOMHostConfig.js

```js
export function removeChild(parentInstance, child) {
  parentInstance.removeChild(child)
}
```

### 3、单节点 key 相同,类型不同

**核心删除包括当前 fiber 在内的所有的老 fiber**

main.jsx

```js
function FunctionComponent() {
  const [number, setNumber] = React.useState(0)
  return number === 0 ? (
    <div onClick={() => setNumber(number + 1)} key="title1" id="title1">
      title1
    </div>
  ) : (
    <p onClick={() => setNumber(number + 1)} key="title1" id="title1">
      title1
    </p>
  )
}
```

src\react-reconciler\src\ReactChildFiber.js

```js
/**
 *
 * @param {*} returnFiber 根fiber div#root对应的fiber
 * @param {*} currentFirstChild 老的FunctionComponent对应的fiber
 * @param {*} element 新的虚拟DOM对象
 * @returns 返回新的第一个子fiber
 */
function reconcileSingleElement(returnFiber, currentFirstChild, element) {
  const key = element.key
  let child = currentFirstChild
  while (child !== null) {
    if (child.key === key) {
      if (child.type === element.type) {
        //...
      } else {
        deleteRemai·ningChildren(returnFiber, child)
        break
      }
    }
  }
}

//删除从currentFirstChild之后所有的fiber节点
function deleteRemainingChildren(returnFiber, currentFirstChild) {
  if (!shouldTrackSideEffects) return
  let childToDelete = currentFirstChild
  while (childToDelete !== null) {
    deleteChild(returnFiber, childToDelete)
    childToDelete = childToDelete.sibling
  }
  return null
}

function deleteChild(returnFiber, childToDelete) {
  if (!shouldTrackSideEffects) return
  const deletions = returnFiber.deletions
  if (deletions === null) {
    returnFiber.deletions = [childToDelete]
    returnFiber.flags |= ChildDeletion
  } else {
    returnFiber.deletions.push(childToDelete)
  }
}
```

### 4、原来多个节点，现在只有一个节点

**核心删除多余节点**

- 没有老 fiber 直接返回全新的 fiber,如果有老 fiber，看 key 是否相同，key 不同删除当前 fiber 并查找下一个 fiber，key 相同类型不同,删除当前 fiber 在内的所有老 fiebr 并返回新的 fiber，如果类型相同复删除剩下的其他老 fiber 并复用老 fiber 返回

main.jsx

```js
function FunctionComponent() {
  const [number, setNumber] = React.useState(0)
  return number === 0 ? (
    <ul key="container" onClick={() => setNumber(number + 1)}>
      <li key="A">A</li>
      <li key="B" id="B">
        B
      </li>
      <li key="C">C</li>
    </ul>
  ) : (
    <ul key="container" onClick={() => setNumber(number + 1)}>
      <li key="B" id="B2">
        B2
      </li>
    </ul>
  )
}
```

src\react-reconciler\src\ReactChildFiber.js

```js
/**
 *
 * @param {*} returnFiber 根fiber div#root对应的fiber
 * @param {*} currentFirstChild 老的FunctionComponent对应的fiber
 * @param {*} element 新的虚拟DOM对象
 * @returns 返回新的第一个子fiber
 */
function reconcileSingleElement(returnFiber, currentFirstChild, element) {
  //新的虚拟DOM的key,也就是唯一标准
  debugger
  const key = element.key // null
  let child = currentFirstChild //老的FunctionComponent对应的fiber

  while (child !== null) {
    //有老fiber
    //判断此老fiber对应的key和新的虚拟DOM对象的key是否一样 null===null
    if (child.key === key) {
      //判断老fiber对应的类型和新虚拟DOM元素对应的类型是否相同
      if (child.type === element.type) {
        // p div
        deleteRemainingChildren(returnFiber, child.sibling)
        //如果key一样，类型也一样，则认为此节点可以复用
        const existing = useFiber(child, element.props)
        existing.return = returnFiber
        return existing
      } else {
        //如果找到一key一样老fiber,但是类型不一样，不能此老fiber,把剩下的全部删除
        deleteRemainingChildren(returnFiber, child)
      }
    } else {
      deleteChild(returnFiber, child)
    }
    child = child.sibling
  }

  //因为我们现实的初次挂载，老节点currentFirstChild肯定是没有的，所以可以直接根据虚拟DOM创建新的Fiber节点
  const created = createFiberFromElement(element)
  created.return = returnFiber
  return created
}
```

## 多节点的 diff

- DOM DIFF 的三个规则
  - 只对同级元素进行比较，不同层级不对比
  - 不同的类型对应不同的元素
  - 可以通过 key 来标识同一个节点
- 第 1 轮遍历
  - 如果 key 不同则直接结束本轮循环
  - newChildren 或 oldFiber 遍历完，结束本轮循环
  - key 相同而 type 不同，标记老的 oldFiber 为删除，继续循环
  - key 相同而 type 也相同，则可以复用老节 oldFiber 节点，继续循环
- 第 2 轮遍历
  - newChildren 遍历完而 oldFiber 还有，遍历剩下所有的 oldFiber 标记为删除，DIFF 结束
  - oldFiber 遍历完了，而 newChildren 还有，将剩下的 newChildren 标记为插入，DIFF 结束
  - newChildren 和 oldFiber 都同时遍历完成，diff 结束
  - newChildren 和 oldFiber 都没有完成，则进行`节点移动`的逻辑
- 第 3 轮遍历
  - 处理节点移动的情况

### 1、多个节点的数量和 key 相同，有的 type 不同

![](https://raw.githubusercontent.com/ghx9908/image-hosting/master/img/20230220164902.png)

```js
function FunctionComponent() {
  const [number, setNumber] = React.useState(0)
  return number === 0 ? (
    <ul key="container" onClick={() => setNumber(number + 1)}>
      <li key="A">A</li>
      <li key="B" id="B">
        B
      </li>
      <li key="C" id="C">
        C
      </li>
    </ul>
  ) : (
    <ul key="container" onClick={() => setNumber(number + 1)}>
      <li key="A">A2</li>
      <p key="B" id="B2">
        B2
      </p>
      <li key="C" id="C2">
        C2
      </li>
    </ul>
  )
}
```

### 2、多个节点的类型和 key 全部相同，有新增元素

```js
function FunctionComponent() {
  const [number, setNumber] = React.useState(0)
  return number === 0 ? (
    <ul key="container" onClick={() => setNumber(number + 1)}>
      <li key="A">A</li>
      <li key="B" id="B">
        B
      </li>
      <li key="C" id="C">
        C
      </li>
    </ul>
  ) : (
    <ul key="container" onClick={() => setNumber(number + 1)}>
      <li key="A">A2</li>
      <p key="B" id="B2">
        B2
      </p>
      <li key="C" id="C2">
        C2
      </li>
      <li key="D">D</li>
    </ul>
  )
}
```

### 3.多个节点的类型和 key 全部相同，有删除老元素

```js
function FunctionComponent() {
  const [number, setNumber] = React.useState(0)
  return number === 0 ? (
    <ul key="container" onClick={() => setNumber(number + 1)}>
      <li key="A">A</li>
      <li key="B" id="B">
        B
      </li>
      <li key="C" id="C">
        C
      </li>
    </ul>
  ) : (
    <ul key="container" onClick={() => setNumber(number + 1)}>
      <li key="A">A2</li>
      <p key="B" id="B2">
        B2
      </p>
    </ul>
  )
}
```

### 4.多个节点数量不同、key 不同

- 多个节点数量不同、key 不同
- 第一轮比较 A 和 A，相同可以复用，更新，然后比较 B 和 C，key 不同直接跳出第一个循环
- 把剩下 oldFiber 的放入 existingChildren 这个 map 中
- 然后声明一个`lastPlacedIndex`变量，表示不需要移动的老节点的索引
- 继续循环剩下的虚拟 DOM 节点
- 如果能在 map 中找到相同 key 相同 type 的节点则可以复用老 fiber,并把此老 fiber 从 map 中删除
- 如果能在 map 中找不到相同 key 相同 type 的节点则创建新的 fiber
- 如果是复用老的 fiber,则判断老 fiber 的索引是否小于 lastPlacedIndex，如果是要移动老 fiber，不变
- 如果是复用老的 fiber,则判断老 fiber 的索引是否小于 lastPlacedIndex，如果否则更新 lastPlacedIndex 为老 fiber 的 index
- 把所有的 map 中剩下的 fiber 全部标记为删除
- (删除#li#F)=>(添加#li#B)=>(添加#li#G)=>(添加#li#D)=>null

![](https://raw.githubusercontent.com/ghx9908/image-hosting/master/img/20230220164329.png)

![image-20230220164410416](C:\Users\哗啦啦\AppData\Roaming\Typora\typora-user-images\image-20230220164410416.png)

```js
function FunctionComponent() {
  const [number, setNumber] = React.useState(0)
  return number === 0 ? (
    <ul key="container" onClick={() => setNumber(number + 1)}>
      <li key="A">A</li>
      <li key="B" id="b">
        B
      </li>
      <li key="C">C</li>
      <li key="D">D</li>
      <li key="E">E</li>
      <li key="F" id="F">
        F
      </li>
    </ul>
  ) : (
    <ul key="container" onClick={() => setNumber(number + 1)}>
      <li key="A">A2</li>
      <li key="C">C2</li>
      <li key="E">E2</li>
      <li key="B" id="b2">
        B2
      </li>
      <li key="G">G</li>
      <li key="D">D2</li>
    </ul>
  )
}
```
