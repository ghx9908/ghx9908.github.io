---
title: react 虚拟列表之 FixedSizeList 封装
date: 2023-01-06 18:00:00
tags: react组件
categories: react全家桶
author: 高红翔
---

## 1. 长列表渲染

- 如果有海量数据在浏览器里一次性渲染会有以下问题
  - 计算时间过长，用户需要长时间等待，体验差
  - CPU 处理时间过长，滑动过程中可能卡顿
  - GPU 负载过高，渲染不过来会出现闪动
  - 内存占用过多，严重会引起浏览器卡死和崩溃
- 优化方法
  - 下拉底部加载更多实现懒加载，此方法随着内容越来越多，会引起大量的重排和重绘，依赖可能会卡顿
  - 虚拟列表 其实我们的屏幕可视区域是有限的，能看到的数据也是有限的,所以可以在用户滚动时，只渲染可视区域内的内容即可,不可见区域用空白占位填充, 这样的话页面中的 DOM 元素少，CPU、GPU 和内存负载小

## 2.长列表组件

- [react-virtualized](https://github.com/bvaughn/react-virtualized)
- [react-window](https://github.com/bvaughn/react-window)
- [react-window.vercel.app](https://react-window.vercel.app/#/examples/list/fixed-size)

```js
npm i react-window --save
```

## 3. 固定高度列表实战

### 3.1 src\index.js

> src\index.js

```js
import React from "react"
import ReactDOM from "react-dom/client"
import FixedSizeList from "./fixed-size-list"
const root = ReactDOM.createRoot(document.getElementById("root"))
root.render(<FixedSizeList />)
```

### 3.2 fixed-size-list.js

> src\fixed-size-list.js

```js
import { FixedSizeList } from "react-window"
import "./fixed-size-list.css"
const Row = ({ index, style }) => (
  <div className={index % 2 ? "ListItemOdd" : "ListItemEven"} style={style}>
    Row{index}
  </div>
)
function App() {
  return (
    <FixedSizeList
      className="List"
      height={200}
      width={200}
      itemSize={50}
      itemCount={1000}
    >
      {Row}
    </FixedSizeList>
  )
}
export default App
```

### 3.3 fixed-size-list.css

> src\fixed-size-list.css

```css
.List {
  border: 1px solid gray;
}

.ListItemEven,
.ListItemOdd {
  display: flex;
  align-items: center;
  justify-content: center;
}
.ListItemOdd {
  background-color: lightcoral;
}
.ListItemEven {
  background-color: lightblue;
}
```

## 4.`FixedSizeList`实现

### 4. 1 全部渲染

> 首先实现传入的数据页面全部渲染

![原理](https://static.zhufengpeixun.com/reactwindowfixed_1651225094542.jpg)

#### 4.1 .1fixed-size-list.js

src\fixed-size-list.js

```jsx
import { FixedSizeList } from "./react-window"
import "./fixed-size-list.css"
const Row = ({ index, style }) => (
  <div className={index % 2 ? "ListItemOdd" : "ListItemEven"} style={style}>
    Row{index}
  </div>
)
function App() {
  return (
    <FixedSizeList
      className="List"
      height={200}
      width={200}
      itemSize={50}
      itemCount={1000}
    >
      {Row}
    </FixedSizeList>
  )
}
export default App
```

#### 4.1.2 react-window\index.js

src\react-window\index.js

```js
export { default as FixedSizeList } from "./FixedSizeList"
```

#### 4.1.3 FixedSizeList.js

src\react-window\FixedSizeList.js

```js
import createListComponent from "./createListComponent"
const FixedSizeList = createListComponent({
  getItemSize: ({ itemSize }) => itemSize, //每个条目的高度
  getEstimatedTotalSize: ({ itemSize, itemCount }) => itemSize * itemCount, //获取预计的总高度
  getItemOffset: ({ itemSize }, index) => itemSize * index, //获取每个条目的偏移量
})
export default FixedSizeList
```

#### 4.1.4 createListComponent.js

src\react-window\createListComponent.js

```js
import React from "react"
export default function createListComponent({
  getEstimatedTotalSize, //获取预计的总高度
  getItemSize, //每个条目的高度
  getItemOffset, //获取每个条目的偏移量
}) {
  return class extends React.Component {
    render() {
      const { width, height, itemCount, children: ComponentType } = this.props
      const containerStyle = {
        position: "relative",
        width,
        height,
        overflow: "auto",
        willChange: "transform",
      }
      const contentStyle = {
        height: getEstimatedTotalSize(this.props),
        width: "100%",
      }
      const items = []
      if (itemCount > 0) {
        for (let index = 0; index < itemCount; index++) {
          items.push(
            <ComponentType
              key={index}
              index={index}
              style={this._getItemStyle(index)}
            />
          )
        }
      }
      return (
        <div style={containerStyle}>
          <div style={contentStyle}>{items}</div>
        </div>
      )
    }
    //获取每个item的样式
    _getItemStyle = (index) => {
      const style = {
        position: "absolute",
        width: "100%",
        height: getItemSize(this.props),
        top: getItemOffset(this.props, index),
      }
      return style
    }
  }
}
```

## 4.2. 渲染首屏

### 4.2.1 FixedSizeList.js

src\react-window\FixedSizeList.js

```diff
import createListComponent from './createListComponent';
const FixedSizeList = createListComponent({
    getItemSize: ({ itemSize }) => itemSize,//每个条目的高度
    getEstimatedTotalSize: ({ itemSize, itemCount }) => itemSize * itemCount, //获取预计的总高度
    getItemOffset: ({ itemSize }, index) => itemSize * index, //获取每个条目的偏移量
+   getStartIndexForOffset: ({ itemSize }, offset) => Math.floor(offset / itemSize),//获取起始索引
+   getStopIndexForStartIndex: ({ height, itemSize }, startIndex) => {//获取结束索引
+       const numVisibleItems = Math.ceil(height / itemSize);
+       return startIndex + numVisibleItems - 1;
    }
});
export default FixedSizeList;
```

### 4.2.2 createListComponent.js

src\react-window\createListComponent.js

```diff
import React from 'react';
export default function createListComponent({
    getEstimatedTotalSize,//获取预计的总高度
    getItemSize,//每个条目的高度
    getItemOffset,//获取每个条目的偏移量
+   getStartIndexForOffset,
+   getStopIndexForStartIndex
}) {
    return class extends React.Component {
+       state = { scrollOffset: 0 }
        render() {
            const { width, height, itemCount, children: ComponentType } = this.props;
            const containerStyle = { position: 'relative', width, height, overflow: 'auto', willChange: 'transform' };
            const contentStyle = { height: getEstimatedTotalSize(this.props), width: '100%' };
            const items = [];
            if (itemCount > 0) {
+               const [startIndex, stopIndex] = this._getRangeToRender();
+               for (let index = startIndex; index <= stopIndex; index++) {
                    items.push(
                        <ComponentType key={index} index={index} style={this._getItemStyle(index)} />
                    );
                }
            }
            return (
                <div style={containerStyle}>
                    <div style={contentStyle}>
                        {items}
                    </div>
                </div>
            )
        }
        _getItemStyle = (index) => {
            const style = {
                position: 'absolute',
                width: '100%',
                height: getItemSize(this.props),
                top: getItemOffset(this.props, index)
            };
            return style;
        }
+       _getRangeToRender = () => {
+           const { scrollOffset } = this.state;
+           const startIndex = getStartIndexForOffset(this.props, scrollOffset);
+           const stopIndex = getStopIndexForStartIndex(this.props, startIndex);
+           return [startIndex, stopIndex];
+       }
    }
}
```

## 4.3. 监听滚动

### 4.3.1 createListComponent.js

src\react-window\createListComponent.js

```diff
import React from 'react';
export default function createListComponent({
    getEstimatedTotalSize,//获取预计的总高度
    getItemSize,//每个条目的高度
    getItemOffset,//获取每个条目的偏移量
    getStartIndexForOffset,
    getStopIndexForStartIndex
}) {
    return class extends React.Component {
        state = { scrollOffset: 0 }
        render() {
            const { width, height, itemCount, children: ComponentType } = this.props;
            const containerStyle = { position: 'relative', width, height, overflow: 'auto', willChange: 'transform' };
            const contentStyle = { height: getEstimatedTotalSize(this.props), width: '100%' };
            const items = [];
            if (itemCount > 0) {
                const [startIndex, stopIndex] = this._getRangeToRender();
                for (let index = startIndex; index <= stopIndex; index++) {
                    items.push(
                        <ComponentType key={index} index={index} style={this._getItemStyle(index)} />
                    );
                }
            }
            return (
+               <div style={containerStyle} onScroll={this.onScroll}>
                    <div style={contentStyle}>
                        {items}
                    </div>
                </div>
            )
        }
+       onScroll = event => {
+           const { scrollTop } = event.currentTarget;
+           this.setState({ scrollOffset: scrollTop });
+       }
        _getItemStyle = (index) => {
            const style = {
                position: 'absolute',
                width: '100%',
                height: getItemSize(this.props),
                top: getItemOffset(this.props, index)
            };
            return style;
        }
        _getRangeToRender = () => {
            const { scrollOffset } = this.state;
            const startIndex = getStartIndexForOffset(this.props, scrollOffset);
            const stopIndex = getStopIndexForStartIndex(this.props, startIndex);
            return [startIndex, stopIndex]
        }
    }
}
```

## 4.4. overscan (增加缓存区域)

- 过扫描实质上是切断图片的边缘，以确保所有重要的东西显示在屏幕上 ![img](https://static.zhufengpeixun.com/Overscan_1651392914894.png)

### 4.4.1 createListComponent.js

src\react-window\createListComponent.js

```diff
import React from 'react';
export default function createListComponent({
    getEstimatedTotalSize,//获取预计的总高度
    getItemSize,//每个条目的高度
    getItemOffset,//获取每个条目的偏移量
    getStartIndexForOffset,
    getStopIndexForStartIndex
}) {
    return class extends React.Component {
+       static defaultProps = {
+           overscanCount: 2
+       }
        state = { scrollOffset: 0 }
        render() {
            const { width, height, itemCount, children: ComponentType } = this.props;
            const containerStyle = { position: 'relative', width, height, overflow: 'auto', willChange: 'transform' };
            const contentStyle = { height: getEstimatedTotalSize(this.props), width: '100%' };
            const items = [];
            if (itemCount > 0) {
                const [startIndex, stopIndex] = this._getRangeToRender();
                for (let index = startIndex; index <= stopIndex; index++) {
                    items.push(
                        <ComponentType key={index} index={index} style={this._getItemStyle(index)} />
                    );
                }
            }
            return (
                <div style={containerStyle} onScroll={this.onScroll}>
                    <div style={contentStyle}>
                        {items}
                    </div>
                </div>
            )
        }
        onScroll = event => {
            const { scrollTop } = event.currentTarget;
            this.setState({ scrollOffset: scrollTop });
        }
        _getItemStyle = (index) => {
            const style = {
                position: 'absolute',
                width: '100%',
                height: getItemSize(this.props),
                top: getItemOffset(this.props, index)
            };
            return style;
        }
        _getRangeToRender = () => {
            const { scrollOffset } = this.state;
+           const { itemCount, overscanCount } = this.props;
            const startIndex = getStartIndexForOffset(this.props, scrollOffset);
            const stopIndex = getStopIndexForStartIndex(this.props, startIndex);
            return [
+               Math.max(0, startIndex - overscanCount),
+               Math.max(0, Math.min(itemCount - 1, stopIndex + overscanCount)),
                startIndex, stopIndex]
        }
    }
}
```
