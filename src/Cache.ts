import Emitter from 'emitter-pro';
import { TStorage } from './interface';
import { Storage, StorageOptions } from './Storage';

// 命名空间缓存键前缀。
const defaultPrefix = 'cache2_';
const defaultNamespace = 'default';

type CacheData<ValueType = any> = {
  v: ValueType; // value
  t: number; // time to live
  n: number; // last modified time
};
type CacheRecord<ValueType = any> = Record<string, CacheData<ValueType>>;

export type CacheOptions = Omit<StorageOptions, 'memoryScope'> & {
  max: number;
  maxStrategy: 'limited' | 'replaced';
  stdTTL: number;
  checkperiod: number;
  storage: TStorage;
};

/**
 * 功能丰富的数据存储管理，支持 `自定义缓存` `命名空间` `数据过期时间` `限制缓存数量` `自定义事件`。
 *
 * 注意：如果你需要的是简单的基本数据存储管理，例如浏览器存储，建议使用 `import { Storage } from 'cache2'`。
 *
 * @class
 * @param {string} [namespace] 命名空间。可选。
 * @param {Object} [options] 配置项。可选。
 * @param {Object} [options.storage] 自定义缓存对象要包含 `getItem` `setItem` `removeItem` 方法。默认使用内置的内存缓存。
 * @param {number} [options.max=-1] 最大缓存数据数量。`-1` 表示无限制。默认 `-1`。
 * @param {'limited' | 'replaced'} [options.maxStrategy='limited'] 当达到最大缓存数量限制时的缓存策略。`limited` 表示达到限制数量后不存入数据，保存时返回 `false`。`replaced` 表示优先替换快过期的数据，如果都是一样的过期时间(0)，按照先入先出规则处理，保存时始终返回 `true`。默认 `limited`。
 * @param {number} [options.stdTTL=0] 相对当前时间的数据存活时间，应用于当前实例的所有缓存数据。单位为毫秒，`0` 表示无期限。默认 `0`。
 * @param {number} [options.checkperiod=0] 定时检查过期数据，单位毫秒。如果小于等于 `0` 表示不启动定时器检查。默认 `0`。
 * @param {boolean} [options.needParsed] 存取数据时是否需要序列化和解析数据。如果使用内置的内存缓存，默认 `false`，如果自定义 `storage` 默认 `true`。
 * @param {Function} [options.replacer] 数据存储时序列化的参数，透传给 [JSON.stringify](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify) 的 `replacer` 参数。仅在 `needParsed=true` 时生效。
 * @param {Function} [options.reviver] 数据获取时转换的参数，透传给 [JSON.parse](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse) 的 `reviver` 参数。仅在 `needParsed=true` 时生效。
 * @param {string} [options.prefix] 缓存键前缀。
 * @example
 * // 自定义过期时间
 * const memoryCache = new Cache({ stdTTL: 60 * 1000 });
 * memoryCache.set('foo', { baz: 42 });
 * memoryCache.get('foo');
 * // { baz: 42 }
 *
 * // 60 seconds later
 *
 * memoryCache.get('foo');
 * // undefined
 *
 * // 命名空间、自定义缓存
 * const localCache = new Cache('namespace', { storage: window.localStorage });
 * localCache.set('foo', { baz: 42 });
 * localCache.get('foo');
 * // { baz: 42 }
 *
 * localCache.del('foo');
 * localCache.get('foo');
 * // undefined
 */
class Cache<ValueType = any> extends Emitter<(key: string, value: ValueType) => void> {
  private options: Pick<CacheOptions, 'max' | 'maxStrategy' | 'stdTTL' | 'checkperiod' | 'prefix'> &
    Partial<Pick<CacheOptions, 'storage' | 'needParsed' | 'replacer' | 'reviver'>>;
  private cacheKey: string;
  private _checkTimeout: any;
  storage: Storage;

  constructor(options?: Partial<CacheOptions>); // 基础配置
  constructor(namespace: string, options?: Partial<CacheOptions>); // 自定义命名空间
  constructor(namespace?: any, options?: any) {
    super();

    let ns = defaultNamespace,
      opts: CacheOptions | undefined;
    if (typeof namespace === 'string') {
      ns = namespace || defaultNamespace;
    } else if (typeof namespace === 'object') {
      opts = namespace;
    }

    if (!opts && typeof options === 'object') {
      opts = options;
    }

    this.options = {
      max: -1,
      stdTTL: 0,
      maxStrategy: 'limited',
      checkperiod: 0,
      prefix: defaultPrefix,
      ...opts
    };
    this.storage = new Storage(this.options.storage, {
      memoryScope: ns,
      ...this.options
    });

    this.cacheKey = ns;
    this.startCheckperiod();
  }

  /**
   * 检查当前键值是否过期，如果过期将会自动删除。
   *
   * @param key 键名称。
   * @param data 缓存数据。
   * @returns 如果键值已过期返回 `false` ，否则返回 `true`。
   */
  private _check(key: string, data: CacheData) {
    let ret = true;
    if (data.t !== 0 && data.t < Date.now()) {
      ret = false;
      this.del(key);
      this.emit('expired', key, data.v);
    }
    return ret;
  }

  private _wrap(value: ValueType, ttl?: number) {
    const now = Date.now();
    const currentTtl = typeof ttl === 'number' ? ttl : this.options.stdTTL;
    const livetime = currentTtl > 0 ? now + currentTtl : 0;
    return {
      v: value,
      t: livetime,
      n: now
    };
  }

  private _isLimited(len: number) {
    return this.options.max > -1 && len >= this.options.max;
  }

  private _getReplaceKey(keys: string[], cacheValues: CacheRecord<ValueType>) {
    let retkey = keys[0];
    keys.forEach((key) => {
      if (
        cacheValues[key].t < cacheValues[retkey].t ||
        (cacheValues[key].t === cacheValues[retkey].t && cacheValues[key].n < cacheValues[retkey].n)
      ) {
        retkey = key;
      }
    });
    return retkey;
  }

  /**
   * 获取全部缓存数据，不处理过期数据和排序
   */
  private get cacheValues() {
    return this.storage.get(this.cacheKey) || {};
  }

  // 设置缓存数据
  private setCacheValues(values: CacheRecord<ValueType>) {
    this.storage.set(this.cacheKey, values);
  }

  /**
   * 获取缓存值。
   *
   * @param {string} key 键名称。
   * @returns {*} 如果找到该值，则返回该值。如果未找到或已过期，则返回 `undefined`。
   * @example
   * myCache.set('myKey', obj, 5 * 60 * 1000);
   * myCache.get('myKey');
   * // { foo: 'bar', baz: 42 }
   *
   * myCache.get('myKey2');
   * // undefined
   */
  get(key: string) {
    const data = this.cacheValues[key];
    if (data && this._check(key, data)) {
      return data.v as ValueType;
    }
    return;
  }

  /**
   * 获取多个缓存值。
   *
   * @param {string[]} keys 多个键名称。
   * @returns {Object} 如果找到对应键名的值，返回一个具有键值对的对象。如果未找到或已过期，则返回一个空对象 `{}`。
   * @example
   * myCache.mset([
   *   { key: 'myKey', value: { foo: 'bar', baz: 42 }, ttl: 5 * 60 * 1000 },
   *   { key: 'myKey2', value: { a: 1, b: 2 } },
   *   { key: 'myKey3', value: 'abc' }
   * ]);
   *
   * myCache.mget(['myKey', 'myKey2']);
   * // {
   * //   myKey: { foo: 'bar', baz: 42 },
   * //   myKey2: { a: 1, b: 2 }
   * // }
   */
  mget(keys: string[]) {
    const ret: Record<string, ValueType> = {};
    if (!Array.isArray(keys)) {
      return ret;
    }
    const cacheValues = this.cacheValues;
    keys.forEach((key) => {
      const data = cacheValues[key];
      if (data && this._check(key, data)) {
        ret[key] = data.v;
      }
    });
    return ret;
  }

  /**
   * 获取全部缓存值。
   *
   * @returns {Object} 返回一个具有键值对的对象。
   * @example
   * myCache.mset([
   *   { key: 'myKey', value: { foo: 'bar', baz: 42 }, ttl: 5 * 60 * 1000 },
   *   { key: 'myKey2', value: { a: 1, b: 2 } },
   *   { key: 'myKey3', value: 'abc' }
   * ]);
   *
   * myCache.getAll();
   * // {
   * //   myKey: { foo: 'bar', baz: 42 },
   * //   myKey2: { a: 1, b: 2 }
   * //   myKey3: 'abc'
   * // }
   */
  getAll() {
    const keys = Object.keys(this.cacheValues);
    return this.mget(keys);
  }

  /**
   * 设置缓存数据。
   *
   * 如果超出缓存数量，可能会设置失败。
   *
   * @param {string} key 键名称。
   * @param {*} value 键值。
   * @param {number} [ttl] 数据存活时间。单位毫秒 `ms`。
   * @returns {boolean} 如果设置成功返回 `true`，否则返回 `false`。
   * @example
   * myCache.set('myKey', { foo: 'bar', baz: 42 }, 5 * 60 * 1000);
   * // true
   */
  set(key: string, value: ValueType, ttl?: number) {
    if (this.options.max === 0) {
      return false;
    }

    const cacheValues = this.cacheValues;
    const keys = Object.keys(cacheValues);

    // 当前不存在该键值，并且数据量超过最大限制
    if (!cacheValues[key] && this._isLimited(keys.length)) {
      const validKeys = this.keys();
      if (this._isLimited(validKeys.length)) {
        // 如果最大限制策略是替换，将优先替换快过期的数据，如果都是一样的过期时间(0)，按照先入先出规则处理。
        if (this.options.maxStrategy === 'replaced') {
          const replaceKey = this._getReplaceKey(validKeys, cacheValues);
          this.del(replaceKey);
        } else {
          // 如果是最大限制策略是不允许添加，返回 false 。
          return false;
        }
      }
    }

    cacheValues[key] = this._wrap(value, ttl);
    this.setCacheValues(cacheValues);
    this.emit('set', key, cacheValues[key].v);
    return true;
  }

  /**
   * 设置多个缓存数据。
   *
   * @param {Object[]} keyValueSet 多个键值对数据。
   * @returns {boolean} 如果全部设置成功返回 `true`，否则返回 `false`。
   * @example
   * myCache.mset([
   *   { key: 'myKey', value: { foo: 'bar', baz: 42 }, ttl: 5 * 60 * 1000 },
   *   { key: 'myKey2', value: { a: 1, b: 2 } },
   *   { key: 'myKey3', value: 'abc' }
   * ]);
   * // true
   */
  mset(keyValueSet: { key: string; value: ValueType; ttl?: number }[]) {
    // 该处不使用数组 some 方法，是因为不能某个失败，而导致其他就不在更新。
    let ret = true;
    keyValueSet.forEach((item) => {
      const itemSetResult = this.set(item.key, item.value, item.ttl);
      if (ret && !itemSetResult) {
        ret = false;
      }
    });
    return ret;
  }

  /**
   * 删除一个或多个键。
   *
   * @param {string|string[]} key 要删除的键名。
   * @returns {number} 返回已删除的数量。
   * @example
   * myCache.set('myKey', { foo: 'bar', baz: 42 });
   * myCache.del('myKey'); // 1
   * myCache.del('not found'); // 0
   *
   * myCache.mset([
   *   { key: 'myKey', value: { foo: 'bar', baz: 42 }, ttl: 5 * 60 * 1000 },
   *   { key: 'myKey2', value: { a: 1, b: 2 } },
   *   { key: 'myKey3', value: 'abc' }
   * ]);
   * myCache.del(['myKey', 'myKey2']); // 2
   */
  del(key: string | string[]) {
    const cacheValues = this.cacheValues;
    let count = 0;
    const keys = Array.isArray(key) ? key : [key];
    keys.forEach((key) => {
      if (cacheValues[key]) {
        count++;
        const oldData = cacheValues[key];
        delete cacheValues[key];
        this.emit('del', key, oldData.v);
      }
    });
    if (count > 0) {
      this.setCacheValues(cacheValues);
    }
    return count;
  }

  /**
   * 清除全部缓存的数据。
   *
   * @example
   * myCache.set('bar', 1);
   * myCache.set('foo', 2);
   * myCache.keys(); // ['bar', 'foo']
   *
   * myCache.clear();
   * myCache.keys(); // []
   */
  clear() {
    this.storage.del(this.cacheKey);
  }

  /**
   * 获取全部键名的数组。
   *
   * @returns {string[]} 返回全部键名的数组。
   * @example
   * myCache.set('bar', 1);
   * myCache.set('foo', 2);
   *
   * myCache.keys(); // ['bar', 'foo']
   */
  keys(): string[] {
    const cacheValues = this.cacheValues;
    const keys = Object.keys(cacheValues);
    return keys.filter((key) => this._check(key, cacheValues[key]));
  }

  /**
   * 判断是否存在某个键。
   *
   * @param {string} key 键名称。
   * @returns {boolean} 如果包含该键返回 `true`，否则返回 `false`。
   * @example
   * myCache.has('foo'); // false
   *
   * myCache.set('foo', 1);
   * myCache.has('foo'); // true
   */
  has(key: string) {
    const data = this.cacheValues[key];
    return !!(data && this._check(key, data));
  }

  /**
   * 获取缓存值并从缓存中删除键。
   *
   * @param {string} key 键名称。
   * @returns {*} 如果找到该值，则返回该值，并从缓存中删除该键。如果未找到或已过期，则返回 `undefined`。
   * @example
   * myCache.set('myKey', 'myValue');
   * myCache.has('myKey'); // true
   *
   * myCache.take('myKey'); // 'myValue'
   * myCache.has('myKey'); // false
   */
  take(key: string) {
    let ret: ValueType | undefined;
    const data = this.cacheValues[key];
    if (data && this._check(key, data)) {
      ret = data.v;
      this.del(key);
    }
    return ret;
  }

  /**
   * 更新缓存键值的数据存活时间。
   *
   * @param {string} key 键名称。
   * @param {number} ttl 数据存活时间。
   * @returns {boolean} 如果找到并更新成功，则返回 `true`，否则返回 `false`。
   * @example
   * myCache.set('myKey', { foo: 'bar', baz: 42 }, 5 * 60 * 1000);
   * myCache.ttl('myKey', 60 * 1000);
   * // true
   *
   * myCache.ttl('not found', 1000);
   * // false
   */
  ttl(key: string, ttl: number) {
    const cacheValues = this.cacheValues;
    const data = cacheValues[key];

    if (data && this._check(key, data)) {
      cacheValues[key] = this._wrap(data.v, ttl);
      return true;
    }
    return false;
  }

  /**
   * 获取某个键的过期时间戳。
   *
   * @param {string} key 键名称。
   * @returns {number | undefined} 如果未找到键或已过期，返回 `undefined`。如果 `ttl` 为 `0`，返回 `0`，否则返回一个以毫秒为单位的时间戳，表示键值将过期的时间。
   * @example
   * const myCache = new Cache({ stdTTL: 5 * 1000 });
   *
   * // 假如 Date.now() = 1673330000000
   * myCache.set('ttlKey', 'expireData');
   * myCache.set('noTtlKey', 'nonExpireData', 0);
   *
   * myCache.getTtl('ttlKey'); // 1673330005000
   * myCache.getTtl('noTtlKey'); // 0
   * myCache.getTtl('unknownKey'); // undefined
   */
  getTtl(key: string) {
    const cacheValues = this.cacheValues;
    const data = cacheValues[key];

    if (data && this._check(key, data)) {
      return cacheValues[key].t as number;
    }
    return;
  }

  /**
   * 获取某个键值的最后修改时间。
   *
   * @param {string} key 键名称。
   * @returns {number | undefined} 如果未找到键或已过期，返回 `undefined`，否则返回一个以毫秒时间戳，表示键值最后修改时间。
   * @example
   * const myCache = new Cache();
   *
   * // 假如 Date.now() = 1673330000000
   * myCache.set('myKey', 'foo');
   * myCache.getLastModified('myKey'); // 1673330000000
   *
   * // 5000ms later
   * myCache.set('myKey', 'bar');
   * myCache.getLastModified('myKey'); // 1673330005000
   */
  getLastModified(key: string) {
    const cacheValues = this.cacheValues;
    const data = cacheValues[key];

    if (data && this._check(key, data)) {
      return cacheValues[key].n as number;
    }
    return;
  }

  /**
   * 启动定时校验过期数据。
   *
   * 注意，如果没有设置 `checkperiod` 将不会触发定时器。
   *
   * @example
   * // 设置 checkperiod 之后自动生效
   * const myCache = new Cache({
   *   checkperiod: 10 * 60 * 1000 // 10分钟检查一次数据是否过期
   * });
   *
   * // 停止定时校验过期数据
   * myCache.stopCheckperiod();
   *
   * // 启动定时校验过期数据
   * myCache.startCheckperiod();
   */
  startCheckperiod() {
    // 触发全部缓存数据是否过期校验
    this.keys();

    if (this.options.checkperiod > 0) {
      clearTimeout(this._checkTimeout);
      this._checkTimeout = setTimeout(() => {
        this.startCheckperiod();
      }, this.options.checkperiod);
    }
  }

  /**
   * 停止定时校验过期数据。
   *
   * @example
   * // 设置 checkperiod 之后自动生效
   * const myCache = new Cache({
   *   checkperiod: 10 * 60 * 1000 // 10分钟检查一次数据是否过期
   * });
   *
   * // 停止定时校验过期数据
   * myCache.stopCheckperiod();
   */
  stopCheckperiod() {
    clearTimeout(this._checkTimeout);
  }
}

export default Cache;
