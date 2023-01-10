import memoryStorage from './memoryStorage';
import { isStorageSupport, uniqueId, TStorage } from './utils';

type JSON_Parse_reviver = (this: any, key: string, value: any) => any;
type JSON_Stringify_replacer = JSON_Parse_reviver;

type CacheData<ValueType = any> = {
  k: string;
  v: ValueType;
  t: number;
  ttl?: number;
};

// 基础配置，不需要设置 key 和 storage
type BaseOptions = {
  max?: number; // 最大存储数据量，默认-1。-1表示无限制。
  maxStrategy?: 'replaced' | 'limited'; // 当超过最大存储限制时的缓存策略，默认 'replaced' 。 replaced 表示优先删除快过期的数据，如果过期时间相同，则按照先入先出删除缓存数据。 limited 表示不存入数据返回 false
  stdTTL?: number; // 数据存活时间，单位为毫秒，默认0。0表示无期限。
};

// 高级配置，支持自定义设置 key 和 storage
// 直接使用内存缓存，不需要用到 replacer reviver
type AdvancedOptions = {
  storage: TStorage; // 自定义数据存储器。支持 localStorage/sessionStorage 。
  replacer?: JSON_Stringify_replacer; // 仅在自定义数据存储器后生效。同 JSON.stringify 的 replacer
  reviver?: JSON_Parse_reviver; // 仅在自定义数据存储器后生效。同 JSON.parse 的 reviver
};

class Cache2<ValueType = any> {
  private options!: Required<BaseOptions> & AdvancedOptions;
  private cacheKey!: string;
  private _tempCacheValues?: CacheData<ValueType>[]; // 临时存储缓存数据，提高遍历操作性能。

  constructor(options?: BaseOptions); // 基础配置，默认使用内存缓存
  constructor(key: string, options: BaseOptions & Partial<AdvancedOptions>); // 高级配置，需要设置key和storage。该方式适用于 localStorage 或 sessionStorage 。
  constructor(key?: any, options?: any) {
    let k: string | undefined, opts: (BaseOptions & AdvancedOptions) | undefined;
    if (typeof key === 'string') {
      k = key;
    } else if (typeof key === 'object') {
      opts = key;
    }
    if (!opts && typeof options === 'object') {
      opts = options;
    }

    this.options = {
      max: -1,
      stdTTL: 0,
      storage: memoryStorage,
      maxStrategy: 'replaced',
      ...opts
    };

    // iOS Safari 开启隐身模式下使用 localStorage 可能报错
    if (this.options.storage !== memoryStorage && !isStorageSupport(this.options.storage)) {
      this.options.storage = memoryStorage;
    }

    this.cacheKey = k || uniqueId();

    // 如果没有使用 new 操作符
    // if (!(this instanceof Cache2)) {
    //   return new Cache2(key, options);
    // }
  }

  private get _storage() {
    return this.options.storage;
  }
  private get _max() {
    return this.options.max;
  }
  private get _maxStrategy() {
    return this.options.maxStrategy;
  }
  private get _stdTTL() {
    return this.options.stdTTL;
  }
  private parse(value: any): CacheData<ValueType>[] {
    // 缓存在内存不需要转换
    if (this._storage === memoryStorage) {
      return value;
    }
    try {
      return JSON.parse(value, this.options.reviver);
    } catch (e) {
      return value;
    }
  }
  private stringify(value: any) {
    // 缓存在内存不需要转换
    if (this._storage === memoryStorage) {
      return value;
    }
    return value === undefined || typeof value === 'function'
      ? value + ''
      : JSON.stringify(value, this.options.replacer);
  }
  private _getTtl(data: CacheData<ValueType>) {
    const ttl = typeof data.ttl === 'undefined' ? this._stdTTL : data.ttl;
    if (ttl > 0) {
      return data.t + ttl;
    }
    return 0;
  }
  private get cacheValues() {
    let values = this.parse(this._storage.getItem(this.cacheKey)) || [];
    const now = Date.now();

    // 过滤过期数据
    values = values.filter((item) => {
      const ttl = this._getTtl(item);
      return ttl === 0 || ttl > now;
    });

    return values;
  }
  private get sortCacheValues() {
    const cacheValues = this.cacheValues;

    // 根据过期时间排序，临近过期的排在前面，先添加的排在前面
    if (this._maxStrategy === 'replaced') {
      cacheValues.sort((a, b) => {
        const ttl_a = this._getTtl(a);
        const ttl_b = this._getTtl(b);
        if (ttl_a === ttl_b) {
          return 0;
        } else if (ttl_b === 0 || ttl_a === 0) {
          return ttl_b === 0 ? -1 : 1;
        } else {
          return ttl_a - ttl_b;
        }
      });
    }
    return cacheValues;
  }
  private setCacheValues(values: CacheData<ValueType>[]) {
    this._storage.setItem(this.cacheKey, this.stringify(values));
  }

  // 从缓存中获取保存的值。如果未找到或已过期，则返回 undefined 。如果找到该值，则返回该值。
  get(key: string) {
    return this.cacheValues.find((item) => item.k === key)?.v;
  }

  // 从缓存中获取多个保存的值。如果未找到或已过期，则返回一个空对象。如果找到该值，它会返回一个具有键值对的对象。
  mget(keys: string[]) {
    const cacheValues = this.cacheValues;
    const values: Record<string, ValueType> = {};
    keys.forEach((key) => {
      const val = cacheValues.find((item) => item.k === key)?.v;
      if (val) {
        values[key] = val;
      }
    });
    return values;
  }

  // 从缓存中获取全部保存的值。返回一个具有键值对的对象。
  getAll() {
    const values: Record<string, ValueType> = {};
    this.cacheValues.forEach((item) => {
      values[item.k] = item.v;
    });
    return values;
  }

  // 设置键值对。设置成功返回 true 。
  set(key: string, value: ValueType, ttl?: number) {
    const newCacheValues = this._tempCacheValues || this.sortCacheValues;
    const isLimited = this._max > -1 && newCacheValues.length > this._max;

    if (this._maxStrategy === 'limited') {
      if (isLimited) {
        return false;
      }
    } else if (this._maxStrategy === 'replaced') {
      // 过期优先，再则先进先出
      newCacheValues.shift();
    }

    newCacheValues.push({
      k: key,
      v: value,
      t: Date.now(),
      ttl
    });
    this.setCacheValues(newCacheValues);
    return true;
  }

  // 设置多个键值对。设置成功返回 true 。
  mset(values: { key: string; value: ValueType; ttl?: number }[]) {
    this._tempCacheValues = this.sortCacheValues;
    const result = values.some((item) => {
      return !this.set(item.key, item.value, item.ttl);
    });
    this._tempCacheValues = undefined;
    return result;
  }

  // 删除某个键。返回已删除条目的数量。删除永远不会失败。
  del(key: string) {
    let count = 0;
    const newCacheValues = this.cacheValues.filter((item) => {
      if (item.k === key) {
        count += 1;
        return false;
      }
      return true;
    });
    this.setCacheValues(newCacheValues);
    return count;
  }

  // 删除多个键。返回已删除条目的数量。删除永远不会失败。
  mdel(keys: string[]) {
    let count = 0;
    const newCacheValues = this.cacheValues.filter((item) => {
      if (keys.indexOf(item.k) > -1) {
        count += 1;
        return false;
      }
      return true;
    });
    this.setCacheValues(newCacheValues);
    return count;
  }

  // 删除当前所有缓存。
  clear() {
    this.setCacheValues([]);
    this._storage.removeItem(this.cacheKey);
  }

  // 返回所有现有键的数组。
  keys() {
    return this.cacheValues.map((item) => item.k);
  }

  // 当前缓存是否包含某个键。
  has(key: string) {
    return !!this.cacheValues.find((item) => item.k === key);
  }

  // 获取缓存值并从缓存中删除键。
  take(key: string) {
    let ret: ValueType | undefined;
    const newCacheValues = this.cacheValues;
    const currIndex = newCacheValues.findIndex((item) => item.k === key);
    if (currIndex !== -1) {
      ret = newCacheValues[currIndex].v;
      newCacheValues.splice(currIndex, 1);
      this.setCacheValues(newCacheValues);
    }
    return ret;
  }

  // 重新定义一个键的 ttl 。如果找到并更新成功，则返回 true 。
  ttl(key: string, ttl: number) {
    let ret = false;
    const newCacheValues = this.cacheValues;
    const currItem = newCacheValues.find((item) => item.k === key);

    if (currItem) {
      ret = true;
      currItem.t = Date.now();
      currItem.ttl = ttl;
      this.setCacheValues(newCacheValues);
    }
    return ret;
  }

  // 获取某个键的 ttl 。
  // 如果未找到键或已过期，返回 undefined 。
  // 如果 ttl 为 0 ，返回 0 。
  // 否则返回一个以毫秒为单位的时间戳，表示键值将过期的时间。
  getTtl(key: string) {
    const currItem = this.cacheValues.find((item) => item.k === key);
    if (currItem) {
      return this._getTtl(currItem);
    }
    return currItem;
  }
}

export default Cache2;
