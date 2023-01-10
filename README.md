# Cache2

[![npm][npm]][npm-url] ![GitHub](https://img.shields.io/github/license/caijf/cache2.svg)

一个简单的 Javascript 缓存管理，支持浏览器端和 node 端。

## 特性

- 支持最大缓存数量，及限制数量后再添加缓存数据的不同策略
- 支持过期时间，当前实例或单个数据的过期时间
- 支持自定义缓存，也可以使用 `localStorage` `sessionStorage`

## 使用

### 安装

```shell
yarn add cache2
```

```shell
npm install cache2
```

### 基础用法

默认使用内存缓存数据。

```typescript
import Cache2 from 'cache2';

const myCache = new Cache2(options);

myCache.set(key, value, ttl?);
myCache.get(key);
```

### 高级用法

自定义缓存。

```typescript
import Cache2 from 'cache2';

const myCache = new Cache2('some key', {
  storage: localStorage
  // other options
});

myCache.set(key, value, ttl?);
myCache.get(key);
```

## 配置项

| 参数 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| max | 最大缓存数据数量。`-1` 表示无限制。 | `number` | `-1` |
| maxStrategy | 当超过最大存储限制时的缓存策略。<br/> `'replaced'` 表示优先删除快过期的数据，如果过期时间相同，则按照先入先出删除缓存数据。<br/>`'limited'` 表示达到限制数量时不再存入数据，返回 false 。 | `'replaced' \| 'limited'` | `'replaced'` |
| stdTTL | 数据存活时间，应用于当前实例的所有缓存数据。单位为毫秒，`0` 表示无期限。 | `number` | `0` |
| storage | 自定义数据存储器，支持 `localStorage` `sessionStorage` 。默认使用内存缓存。 | `TStorage` | - |
| replacer | 仅在自定义数据存储器后生效。同 [JSON.stringify](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify) 的 replacer。 | `(this: any, key: string, value: any) => any` | - |
| reviver | 仅在自定义数据存储器后生效。同 [JSON.parse](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse) 的 reviver。 | `(this: any, key: string, value: any) => any` | - |

## 实例方法

```typescript
import Cache2 from 'cache2';

const myCache = new Cache2();
```

### set(key: string, value: any, ttl?: number)

设置键值对。设置成功返回 `true` 。如果是更新已存在的键值，数据有效期将重新计算。

```typescript
const obj = { foo: 'bar', baz: 42 };

myCache.set('myKey', obj, 5 * 60 * 1000);
// true
```

### mset(values: {key: string, value: any, ttl?: number}[])

设置多个键值对。设置成功返回 `true` 。如果是更新已存在的键值，数据有效期将重新计算。

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

### del(key: string)

删除某个键。返回已删除条目的数量。删除永远不会失败。

```typescript
const value = myCache.del('myKey'); // 1

myCache.del('not found'); // 0
```

### mdel(keys: string[])

删除多个键。返回已删除条目的数量。删除永远不会失败。

```typescript
const value = myCache.mdel(['myKey', 'myKey2']); // 2
```

### clear()

删除当前所有缓存。

```typescript
myCache.clear();
```

### ttl(key: string, ttl: number)

重新定义一个键的 `ttl` 。如果找到并更新成功，则返回 `true` ，数据有效期将重新计算。

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
const myCache = new Cache2({ stdTTL: 5 * 1000 });

// Date.now() = 1673330000000
myCache.set('ttlKey', 'expireData');
myCache.set('noTtlKey', 'nonExpireData', 0);

myCache.getTtl('ttlKey'); // 1673330005000
myCache.getTtl('noTtlKey'); // 0
myCache.getTtl('unknownKey'); // undefined
```

## 应用场景

TODO 缓存固定返回值的接口数据、图片等。

[npm]: https://img.shields.io/npm/v/cache2.svg
[npm-url]: https://npmjs.com/package/cache2
