# React Batch Mount

This library allows to mount components batched so browser had time to print frames. If you want to mount many huge components (mounting take a long time) and you can't use any of the standard pattens (paging, lazy load, virtualization, ets) - you can try to use this library.

## `batchMount`

The main part of the library is HOC `batchMount`.
```javascript
import {batchMount} from "react-batch-mount";

const Some = batchMount(props => {
    return <div>Some</div>
});
```

Internally `batchMount` wraps the Component in Promise, which is resolved by the scheduler in the queue. You can pass the options to `batchMount` in the second parameter.
```javascript
import {batchMount} from "react-batch-mount";

const Some = batchMount(props => {
    return <div>Some</div>
}, {
    fallback: "Loading...",
    noTrackMount: true,
    mode: "append",
});
```
Option | Type | Description
--- | --- | ---
`fallback` | ReactNode | If you pass this parameter `batchMount` wraps the passed Component in `React.Suspense` with `fallback`. If `fallback` isn't specified you must wrap in `React.Suspense` manually outside.
`noTrackMount` | true | `batchMount` adds to the wrapped Component effect by default that invoke `mounted()` from the context (bellow) after it's mount. If `noTrackMount` passed `batchMount` doesn't add effect and you must invoke the function manually when Component mount is complete.
`mode` | "append" or "prepend" | Specify where to add the Component in the mount queue - at the beginning or at the end. `append` by default.

## `BatchRenderContext`
`batchMount` uses `BatchRenderContext` internally. The context has 2 functions:
- `register` - register function that need to invoke for start mount of the Component. In `batchMount` the function is Promise's resolve function
- `mounted` - invoke when Component mount is complete. Invocation decreases internal counter and triggers mount of the next batch.

In the default context realization used the global scheduler so `BatchMountScheduler is not required. You can override the config (bellow) for component subtree using `BatchMountScheduler`.
```javascript
import {batchMount, BatchMountScheduler} from "react-batch-mount";

const Some = batchMount(props => {
    return <div>Some</div>
}, {
    fallback: "Loading...",
});

const App = () => {
    return (
        <BatchMountScheduler budget={1000}>
            {bigArray.map(x => <Some ... />)}
        </BatchMountScheduler>
    )
}
```

## Config

You can config the scheduler by specifying the batch size or the budget in ms per one batch. The global scheduler you can config by `setGlobalConfig`.

```javascript
import {batchMount, setGlobalConfig} from "react-batch-mount";

setGlobalConfig({budget: 200});

const Some = batchMount(props => {
    return <div>Some</div>
});
```
`setGlobalConfig` takes one of two objects:
- `{batchSize: number}` - explicit specify max component count in one batch
- `{budget: number}` - specify time in ms that you want to spend on mount one batch. Size of the next batch dynamically calculate by mount time and size of the previous batch.

For `BatchMountScheduler` the config is passed through props.
```javascript
import {BatchMountScheduler} from "react-batch-mount";

const App = () => (
    <>
        <BatchMountScheduler batchSize={5}>
            ...
        </BatchMountScheduler>
        <BatchMountScheduler budget={300}>
            ...
        </BatchMountScheduler>
    </>
)
```

## Performance

The library doesn't use component state, which reduce component rerender count. `React.lazy` creates special component in fiber. This component rerender when the Promise is resolved. It doesn't rerender its ancestors. In the same time, if the ancestors were rerendered when Promise is pending the component doesn't break.

The library controls only component mount and doesn't affect their update in any way. You can use built in `React.memo` with `batchMount` for contorl mount and update.
```js
import {memo} from "react";
import {batchMount} from "react-batch-mount";

const Some = memo(batchMount(props => {
    ...
}, /* batchMount options */), /* memo propsAreEquals */);
```