import Emitter from 'emitter-pro';
import { TStorage } from './interface';
import { Storage, StorageOptions } from './Storage';

const defaultPrefix = 'cache2_'; // 命名空间缓存键前缀，默认 cache2_ 。
const defaultNamespace = 'default';

type CacheData<ValueType = any> = {
  v: ValueType; // value
  t: number; // time to live
  n: number; // last modified time
};
type CacheRecord<ValueType = any> = Record<string, CacheData<ValueType>>;

export type CacheOptions = Omit<StorageOptions, 'memoryScope'> & {
  max: number; // 最大存储数据量，默认-1。-1表示无限制。
  maxStrategy: 'limited' | 'replaced'; // 当达到最大缓存数量限制时的缓存策略，默认 'limited' 。limited 表示达到限制数量后不存入数据，返回 false 。replaced 表示优先替换快过期的数据，如果都是一样的过期时间(0)，按照先入先出规则处理，始终返回 true。
  stdTTL: number; // 数据存活时间，单位为毫秒，默认0。0表示无期限。
  checkperiod: number; // 定时检查过期数据，单位毫秒。默认 0 。
  storage: TStorage; // 自定义数据存储器。支持 localStorage/sessionStorage 。
};

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

  // 检查当前键值是否过期，如果过期将会自动删除
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

  // 获取全部缓存数据，不处理过期数据和排序
  private get cacheValues() {
    return this.storage.get(this.cacheKey) || {};
  }

  // 设置缓存数据
  private setCacheValues(values: CacheRecord<ValueType>) {
    this.storage.set(this.cacheKey, values);
  }

  // 从缓存中获取保存的值。如果未找到或已过期，则返回 undefined 。如果找到该值，则返回该值。
  get(key: string) {
    const data = this.cacheValues[key];
    if (data && this._check(key, data)) {
      return data.v as ValueType;
    }
    return;
  }

  // 从缓存中获取多个保存的值。如果未找到或已过期，则返回一个空对象。如果找到该值，它会返回一个具有键值对的对象。
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

  // 从缓存中获取全部保存的值。返回一个具有键值对的对象。
  getAll() {
    const keys = Object.keys(this.cacheValues);
    return this.mget(keys);
  }

  // 设置键值对。设置成功返回 true 。
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

  // 设置多个键值对。全部设置成功返回 true 。
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

  // 删除一个或多个键。返回已删除条目的数量。删除永远不会失败。
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

  // 删除当前所有缓存。
  clear() {
    this.storage.del(this.cacheKey);
  }

  // 返回所有现有键的数组。
  keys(): string[] {
    const cacheValues = this.cacheValues;
    const keys = Object.keys(cacheValues);
    return keys.filter((key) => this._check(key, cacheValues[key]));
  }

  // 当前缓存是否包含某个键。
  has(key: string) {
    const data = this.cacheValues[key];
    return !!(data && this._check(key, data));
  }

  // 获取缓存值并从缓存中删除键。
  take(key: string) {
    let ret: ValueType | undefined;
    const data = this.cacheValues[key];
    if (data && this._check(key, data)) {
      ret = data.v;
      this.del(key);
    }
    return ret;
  }

  // 重新定义一个键的 ttl 。如果找到并更新成功，则返回 true 。
  ttl(key: string, ttl: number) {
    const cacheValues = this.cacheValues;
    const data = cacheValues[key];

    if (data && this._check(key, data)) {
      cacheValues[key] = this._wrap(data.v, ttl);
      return true;
    }
    return false;
  }

  // 获取某个键的 ttl 。
  // 如果未找到键或已过期，返回 undefined 。
  // 如果 ttl 为 0 ，返回 0 。
  // 否则返回一个以毫秒为单位的时间戳，表示键值将过期的时间。
  getTtl(key: string) {
    const cacheValues = this.cacheValues;
    const data = cacheValues[key];

    if (data && this._check(key, data)) {
      return cacheValues[key].t as number;
    }
    return;
  }

  // 获取某个键值的最后修改时间
  // 如果未找到键或已过期，返回 undefined 。
  // 否则返回一个以毫秒为单位的时间戳，表示键值将过期的时间。
  getLastModified(key: string) {
    const cacheValues = this.cacheValues;
    const data = cacheValues[key];

    if (data && this._check(key, data)) {
      return cacheValues[key].n as number;
    }
    return;
  }

  // 启动定时校验过期数据
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

  // 停止定时校验过期数据
  stopCheckperiod() {
    clearTimeout(this._checkTimeout);
  }
}

export default Cache;
