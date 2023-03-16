---
title: ahooks学习
date: 2022-06-01 11:11:50
tags: ahooks
---

## aHooks

### useRequest

- 公司

  - 组建内

    ```js
    import { xxx } from "@/services/xxx"

    const {
      data: xxx,
      error,
      loading,
    } = useRequest(() => APIxxx({ merchantId }))
    ```

  - @/services/xxx

    ```js
    import { request } from "umi"

    // 判断是否创建过loyalty
    export function APIxxx(params: xxx) {
      return request(`/xxx/${params}`, {
        params,
      })
    }
    ```

  - 代理位置/config/proxy

    ```js
      '/api-xxx/': {
                target: 'http://xxx',
                changeOrigin: true,
                pathRewrite: { '^/api-xxx/': '/' },
            },
    ```

- 默认用法/自动触发

```jsx
import { useRequest } from "ahooks"
import Mock from "mockjs"
import React from "react"

function getUsername(): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(Mock.mock("@name"))
    }, 1000)
  })
}

export default () => {
  const { data, error, loading } = useRequest(getUsername)

  if (error) {
    return <div>failed to load</div>
  }
  if (loading) {
    return <div>loading...</div>
  }
  return <div>Username: {data}</div>
}
```

- 手动触发
  - run
  - runAsync

```jsx
const [state, setState] = useState("")
const { loading, runAsync } = useRequest(editUsername, {
  manual: true,
})
const onClick = async () => {
  try {
    await runAsync(state)
    setState("")
    message.success(`The username was changed to "${state}" !`)
  } catch (error) {
    message.error(error.message)
  }
}
```

- 生命周期
  - `onBefore`：请求之前触发
  - `onSuccess`：请求成功触发
  - `onError`：请求失败触发
  - `onFinally`：请求完成触发

```jsx
import { useRequest } from "ahooks"
function editUsername(username: string): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() > 0.5) {
        resolve()
      } else {
        reject(new Error("Failed to modify username"))
      }
    }, 1000)
  })
}
export default () => {
  const [state, setState] = useState("")
  const { loading, run } = useRequest(editUsername, {
    manual: true,
    onBefore: (params) => {
      message.info(`Start Request: ${params[0]}`)
    },
    onSuccess: (result, params) => {
      setState("")
      message.success(`The username was changed to "${params[0]}" !`)
    },
    onError: (error) => {
      message.error(error.message)
    },
    onFinally: (params, result, error) => {
      message.info(`Request finish`)
    },
  })
  return (
    <div>
      <input onChange={(e) => setState(e.target.value)} value={state} />
      <button disabled={loading} type="button" onClick={() => run(state)}>
        {loading ? "Loading" : "Edit"}
      </button>
    </div>
  )
}
```

- 刷新重复请求

  ```jsx
  const { data, loading, run, refresh } = useRequest(
    (id: number) => getUsername(id),
    {
      manual: true,
    }
  )

  useEffect(() => {
    run(1)
  }, [])
  ;<button onClick={refresh} type="button">
    Refresh
  </button>
  ```

- 立即变更数据

```jsx
import { message } from 'antd';
import React, { useState, useRef } from 'react';
import { useRequest } from 'ahooks';
function getUsername(): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(Mock.mock('@name'));
    }, 1000);
  });
}

function editUsername(username: string): Promise<void> {
}

export default () => {
  // store last username
  const lastRef = useRef<string>();

  const [state, setState] = useState('');

  // get username
  const { data: username, mutate } = useRequest(getUsername);

  // edit username
  const { run: edit } = useRequest(editUsername, {
    manual: true,
    onError: (error) => {
      message.error(error.message);
      mutate(lastRef.current);
    },
  });

  const onChange = () => {
    lastRef.current = username;
    mutate(state);
    edit(state);
  };

  return (
    <div>
      <p>Username: {username}</p>
      <input
        onChange={(e) => setState(e.target.value)}
        value={state}
        placeholder="Please enter username"
        style={{ width: 240, marginRight: 16 }}
      />
      <button type="button" onClick={onChange}>
        Edit
      </button>
    </div>
  );
};
```

- 取消请求

```jsx
const { loading, run, cancel } = useRequest(editUsername, {
  manual: true,
  onSuccess: (result, params) => {
    setState("")
    message.success(`The username was changed to "${params[0]}" !`)
  },
  onError: (error) => {
    message.error(error.message)
  },
})
;<button type="button" onClick={cancel} style={{ marginLeft: 16 }}>
  Cancel
</button>
```

- 参数管理

```jsx
const {
  data: username,
  run,
  params,
} = useRequest(getUsername, {
  defaultParams: ["1"],
})
;<p style={{ marginTop: 8 }}>UserId: {params[0]}</p>
```

#### Api

```ts
const {
  loading: boolean,
  data?: TData,
  error?: Error,
  params: TParams || [],
  run: (...params: TParams) => void,
  runAsync: (...params: TParams) => Promise<TData>,
  refresh: () => void,
  refreshAsync: () => Promise<TData>,
  mutate: (data?: TData | ((oldData?: TData) => (TData | undefined))) => void,
  cancel: () => void,
} = useRequest<TData, TParams>(
  service: (...args: TParams) => Promise<TData>,
  {
    manual?: boolean,
    defaultParams?: TParams,
    onBefore?: (params: TParams) => void,
    onSuccess?: (data: TData, params: TParams) => void,
    onError?: (e: Error, params: TParams) => void,
    onFinally?: (params: TParams, data?: TData, e?: Error) => void,
    loadingDelay?: number//设置 loading 变成 true 的延迟时间
    pollingInterval?:number//	轮询间隔，单位为毫秒。如果值大于 0，则启动轮询模式。通过 cancel 来停止轮询，通过 run/runAsync 来启动轮询。
    pollingWhenHidden?:boolean//	在页面隐藏时，是否继续轮询。如果设置为 false，在页面隐藏时会暂时停止轮询，页面重新显示时继续上次轮询。
    ready?:boolean//当前请求是否准备好了
    refreshDeps?:any[]//依赖数组，当数组内容变化后，发起请求。同 useEffect 的第二个参数。
		refreshOnWindowFocus?:boolean//	在屏幕重新获取焦点或重新显示时，重新发起请求	boolean	false
		focusTimespan?:number
		debounceWait?:number//防抖
    throttleWait?:number//节流
  	retryCount?:number//错误重试
    cacheKey?string//缓存
  }
);
```

### useSetState

```jsx
import React from "react"
import { useSetState } from "ahooks"

interface State {
  hello: string;
  count: number;
  [key: string]: any;
}

export default () => {
  const [state, setState] =
    useSetState <
    State >
    {
      hello: "",
      count: 0,
    }

  return (
    <div>
      <pre>{JSON.stringify(state, null, 2)}</pre>
      <p>
        <button type="button" onClick={() => setState({ hello: "world" })}>
          set hello
        </button>
        <button
          type="button"
          onClick={() => setState({ foo: "bar" })}
          style={{ margin: "0 8px" }}
        >
          set foo
        </button>
        <button
          type="button"
          onClick={() => setState((prev) => ({ count: prev.count + 1 }))}
        >
          count + 1
        </button>
      </p>
    </div>
  )
}
```

### useBoolean

```jsx
const [state, { toggle, set, setLeft, setRight }] = useToggle() //false
```

### useToggle

```jsx
const [state, { toggle, set, setLeft, setRight }] = useToggle() //false
const [state, { toggle, set, setLeft, setRight }] = useToggle("Hello", "World")
```

### LifeCycle

- useMount(fn: () => void );
- useUnmount(fn: () => void);
- useUnmount(fn: () => void);
