# Cache2

[![npm][npm]][npm-url] [![codecov](https://codecov.io/gh/caijf/cache2/graph/badge.svg?token=00EFPCEHYH)](https://codecov.io/gh/caijf/cache2) ![npm](https://img.shields.io/npm/dt/cache2) ![GitHub](https://img.shields.io/github/license/caijf/cache2.svg)

一个简单的 JavaScript 缓存管理，支持浏览器端和 node 端。

## 特性

- 支持最大缓存数量，及限制数量后再添加缓存数据的不同策略
- 支持过期时间，当前实例或单个数据的过期时间
- 支持自定义缓存，比如 `localStorage` `sessionStorage`
- 提供简单的浏览器存储 `local` `session`

## 使用

### 安装

```shell
npm install cache2
```

```shell
yarn add cache2
```

```shell
pnpm add cache2
```

### 基础用法

默认使用内存缓存数据。

```typescript
import { Cache } from 'cache2';

const myCache = new Cache(options); // 默认命名空间为 'default'，等同于 new Cache('default', options)

myCache.set(key, value, ttl?);
myCache.get(key);
```

### 高级用法

自定义命名空间和缓存。

```typescript
import { Cache } from 'cache2';

const myCache = new Cache('namespace', {
  storage: localStorage
});

myCache.set(key, value, ttl?);
myCache.get(key);
```

### 浏览器存储

如果你只需要简单的浏览器存储，不需要命名空间、控制数据存活时间和最大数量，可以使用 `Storage` 。

`Storage` 内部做了一些处理，比如存储数据时自动序列化，读取数据自动解析。其余行为如同传入的浏览器存储 API 。注意，方法名称是 `get` `set` `del` 而不是 `getItem` `setItem` `removeItem` 。

```typescript
import { Storage } from 'cache2';

// const session = new Storage(window.sessionStorage);
const local = new Storage(window.localStorage);

local.set('foo', { a: 1, b: ['bar'], c: ['x', 2, 3] });
local.get('foo');
// { a: 1, b: ['bar'], c: ['x', 2, 3] }

local.del('foo');
local.get('foo');
// undefined
```

<mark>**⚠️ 注意：同一个命名空间的缓存是共享的。意味着命名空间名称相同的情况下，不同实例之间共用同一份缓存数据。建议自定义命名空间名称，避免不同实例的缓存数据冲突**</mark>

## Cache 配置项

| 参数 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| max | 最大缓存数据数量。`-1` 表示无限制。 | `number` | `-1` |
| maxStrategy | 当达到最大缓存数量限制时的缓存策略。<br/>`'limited'` 表示达到限制数量后不存入数据，保存时返回 `false` 。<br/> `'replaced'` 表示优先替换快过期的数据，如果都是一样的过期时间(0)，按照先入先出规则处理，保存时始终返回 `true` 。 | `'limited' \| 'replaced'` | `'limited'` |
| stdTTL | 相对当前时间的数据存活时间，应用于当前实例的所有缓存数据。单位为毫秒，`0` 表示无期限。 | `number` | `0` |
| checkperiod | 定时检查过期数据，单位毫秒。如果小于等于 `0` 表示不启动定时器检查。 | `number` | `0` |
| prefix | 缓存键前缀。 | `string` | `cache2_` |
| storage | 自定义数据存储器，支持 `localStorage` `sessionStorage` 。默认使用内存缓存。 | `TStorage` | - |
| needParsed | 存取数据时是否需要解析和序列化数据。如果使用内存缓存，默认为 `false` ，如果自定义 storage 默认为 `true` 。 | `boolean` | - |
| replacer | 仅在自定义数据存储器后生效。同 [JSON.stringify](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify) 的 replacer。 | `(key: string, value: any) => any` | - |
| reviver | 仅在自定义数据存储器后生效。同 [JSON.parse](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse) 的 reviver。 | `(key: string, value: any) => any` | - |

## 实例方法

```typescript
import { Cache } from 'cache2';
const myCache = new Cache(namespace?, options?);
```

### set(key: string, value: any, ttl?: number)

设置键值对。设置成功返回 `true` 。

```typescript
const obj = { foo: 'bar', baz: 42 };

myCache.set('myKey', obj, 5 * 60 * 1000);
// true
```

### mset(values: {key: string, value: any, ttl?: number}[])

设置多个键值对。设置成功返回 `true` 。

```typescript
const obj = { foo: 'bar', baz: 42 };
const obj2 = { a: 1, b: 2 };

myCache.mset([
  { key: 'myKey', value: obj, ttl: 5 * 60 * 1000 },
  { key: 'myKey2', value: obj2 }
]);
// true
```

### get(key: string)

从缓存中获取保存的值。如果未找到或已过期，则返回 `undefined` 。如果找到该值，则返回该值。

```typescript
const value = myCache.get('myKey');

if (value === undefined) {
  // 未找到或已过期
}
// { foo: 'bar', baz: 42 }
```

### take(key: string)

获取缓存值并从缓存中删除键。

```typescript
myCache.set('myKey', 'myValue'); // true
myCache.has('myKey'); // true
const value = myCache.take('myKey'); // 'myValue'
myCache.has('myKey'); // false
```

### mget(keys: string[])

从缓存中获取多个保存的值。如果未找到或已过期，则返回一个空对象 `{}` 。如果找到该值，它会返回一个具有键值对的对象。

```typescript
const value = myCache.mget(['myKey', 'myKey2']);

// {
//   myKey: { foo: 'bar', baz: 42 },
//   myKey2: { a: 1, b: 2 }
// }
```

### getAll()

从缓存中获取全部保存的值。返回一个具有键值对的对象。

```typescript
const value = myCache.getAll();

// {
//   myKey: { foo: 'bar', baz: 42 },
//   myKey2: { a: 1, b: 2 }
// }
```

### keys()

返回当前所有现有键的数组。

```typescript
myCache.set('bar', 1);
myCache.set('foo', 2);

myCache.keys(); // ['bar', 'foo']
```

### has(key: string)

当前缓存是否包含某个键。

```typescript
myCache.has('foo'); // false

myCache.set('foo', 1);
myCache.has('foo'); // true
```

### del(key: string|string[])

删除一个或多个键值。返回已删除条目的数量。删除永远不会失败。

```typescript
myCache.del('myKey'); // 1
myCache.del('not found'); // 0

myCache.set('myKey', { foo: 'bar', baz: 42 });
myCache.del(['myKey', 'myKey2']); // 2
```

### clear()

删除当前所有缓存。

```typescript
myCache.set('bar', 1);
myCache.set('foo', 2);
myCache.keys(); // ['bar', 'foo']

myCache.clear();

myCache.keys(); // []
```

### ttl(key: string, ttl: number)

重新定义一个键的 `ttl` 。如果找到并更新成功，则返回 `true` 。

```typescript
const obj = { foo: 'bar', baz: 42 };
myCache.set('myKey', obj, 5 * 60 * 1000);

myCache.ttl('myKey', 2 * 60 * 1000);
// true

myCache.ttl('not found', 1000);
// false
```

### getTtl(key: string)

获取某个键的过期时间戳。它有以下返回值：

- 如果未找到键或已过期，返回 `undefined` 。
- 如果 `ttl` 为 `0` ，返回 `0` 。
- 否则返回一个以毫秒为单位的时间戳，表示键值将过期的时间。

```typescript
const myCache = new Cache({ stdTTL: 5 * 1000 });

// Date.now() = 1673330000000
myCache.set('ttlKey', 'expireData');
myCache.set('noTtlKey', 'nonExpireData', 0);

myCache.getTtl('ttlKey'); // 1673330005000
myCache.getTtl('noTtlKey'); // 0
myCache.getTtl('unknownKey'); // undefined
```

### getLastModified(key: string)

获取某个键值的最后修改时间。它有以下返回值：

- 如果未找到键或已过期，返回 `undefined` 。
- 否则返回一个以毫秒时间戳，表示键值最后修改时间。

```typescript
const myCache = new Cache();

// Date.now() = 1673330000000
myCache.set('myKey', 'foo');
myCache.getLastModified('myKey'); // 1673330000000

// Date.now() = 1673330005000
myCache.set('myKey', 'bar');
myCache.getLastModified('myKey'); // 1673330005000
```

### startCheckperiod()

启动定时校验过期数据。

注意，如果没有设置 `checkperiod` 将不会触发定时器。

```typescript
// 设置 checkperiod 之后自动生效
const myCache = new Cache({
  checkperiod: 10 * 60 * 1000 // 10分钟检查一次数据是否过期
});

// 停止定时校验过期数据
myCache.stopCheckperiod();

// 启动定时校验过期数据
myCache.startCheckperiod();
```

### stopCheckperiod()

停止定时校验过期数据。参考 `startCheckperiod` 示例。

## 自定义事件

### set

成功设置键值后触发。

```typescript
myCache.on('set', (key, value) => {
  // do something
});
```

### del

删除键值后触发。

```typescript
myCache.on('del', (key, value) => {
  // do something
});
```

### expired

校验数据过期后触发。

注意，如果校验数据过期，会先删除数据触发 `del` 事件，然后再触发 `expired` 事件。

```typescript
myCache.on('expired', (key, value) => {
  // do something
});
```

## 应用场景

### 缓存接口数据

```typescript
import { Cache } from 'cache2';

const responseCache = new Cache('namespace', { max: 10, maxStrategy: 'replaced' });
// ...
```

### 缓存 URL.createObjectURL 预览文件，删除时 URL.revokeObjectURL 释放缓存

```typescript
import { Cache } from 'cache2';

const fileCache = new Cache('namespace', { max: 20, maxStrategy: 'replaced' });
fileCache.on('del', (key, value) => {
  URL.revokeObjectURL(value);
});

fileCache.set(fssid, URL.createObjectURL(file));
```

### `sessionStorage`、`localStorage` 支持过期时间

```typescript
import { Cache } from 'cache2';

const localCache = new Cache({
  storage: localStorage,
  stdTTL: 5 * 60 * 1000 // 默认数据留存时间为5分钟
});

localCache.set('num', 1); // 该数据默认留存5分钟
localCache.set('str', 'foo', 10 * 60 * 1000); // 该数据留存10分钟
```

### 如何自定义一个 storage

自定义 `storage` 对象需要包含 `getItem` `setItem` `removeItem` 。

例如，微信端的同步缓存等。

```typescript
import { Cache } from 'cache2';

const wxStorage = {
  getItem(key: string) {
    return wx.getStorageSync(key);
  },
  setItem(key: string, value: any) {
    wx.setStorageSync(key, value);
  },
  removeItem(key: string) {
    wx.removeStorageSync(key);
  }
};
const wxCache = new Cache('namespace', {
  storage: wxStorage,
  needParsed: false,
  stdTTL: 5 * 60 * 1000 // 设置默认数据留存时间为5分钟
});

wxCache.set('num', 1); // 该数据默认留存5分钟
wxCache.set('str', 'foo', 10 * 60 * 1000); // 该数据留存10分钟
```

### 使用对象作为缓存键

可以单独实现一个获取缓存键的方法。

```typescript
const wm = new WeakMap();
const getCacheKey = (obj: string | Blob) => {
  if (typeof obj === 'string') {
    return obj;
  }
  if (!wm.get(obj)) {
    wm.set(obj, uniqueId());
  }
  return wm.get(obj) as string;
};

const myCache = new Cache('namespace');

myCache.set(getCacheKey(someKey), someValue);
myCache.get(getCacheKey(someKey));
```

[npm]: https://img.shields.io/npm/v/cache2.svg
[npm-url]: https://npmjs.com/package/cache2
