import { JSON_Parse_reviver, JSON_Stringify_replacer, TStorage } from './interface';
import MemoryStorage from './MemoryStorage';
import { isStorageSupported, parse, stringify } from './utils';

export type StorageOptions = {
  needParsed: boolean;
  replacer: JSON_Stringify_replacer;
  reviver: JSON_Parse_reviver;
  memoryScope?: string; // 内存缓存域
  prefix?: string;
};

/**
 * 数据存储管理。
 *
 * @class
 * @param {Object} [storage] 自定义缓存对象要包含 `getItem` `setItem` `removeItem` 方法。默认使用内存缓存。
 * @param {Object} [options] 配置项。可选。
 * @param {boolean} [options.needParsed] 存取数据时是否需要序列化和解析数据。如果使用内置的内存缓存，默认 `false`，如果自定义 `storage` 默认 `true`。
 * @param {Function} [options.replacer] 数据存储时序列化的参数，透传给 [JSON.stringify](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify) 的 `replacer` 参数。仅在 `needParsed=true` 时生效。
 * @param {Function} [options.reviver] 数据获取时转换的参数，透传给 [JSON.parse](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse) 的 `reviver` 参数。仅在 `needParsed=true` 时生效。
 * @param {string} [options.prefix] 缓存键前缀。便于管理同域名下的不同项目缓存。
 * @example
 * // 使用内存缓存
 * const memory = new Storage();
 * memory.set('foo', { baz: 42 });
 * memory.get('foo');
 * // { baz: 42 }
 *
 * // 自定义缓存 sessionStorage 。
 * const session = new Storage(window.sessionStorage);
 * session.set('foo', { a: 1, b: ['bar'], c: ['x', 2, 3] });
 * session.get('foo');
 * // { a: 1, b: ['bar'], c: ['x', 2, 3] }
 *
 * session.del('foo'); // 删除缓存
 * session.get('foo');
 * // null
 *
 * // 使用缓存键前缀。
 * // 如果要使用内存缓存， storage 传 `undefined`。
 * const local = new Storage(window.localStorage, { prefix: 'project_name' });
 * local.set('foo', { baz: 42 });
 * local.get('foo');
 * // { baz: 42 }
 */
export class Storage<ValueType = any> {
  private storage: TStorage;
  private options: Partial<StorageOptions>;

  constructor(storage?: TStorage, options: Partial<StorageOptions> = {}) {
    const isSupported = storage ? isStorageSupported(storage) : false;
    this.options = {
      needParsed: isSupported,
      prefix: '',
      ...options
    };

    this.storage = isSupported ? storage! : new MemoryStorage(this.options.memoryScope);
  }

  /**
   * 内部用于获取存储的键名称。
   *
   * 如果实例有设置 `prefix`，返回 `prefix + key`。
   *
   * @protected
   * @param key 原键名称
   * @returns 存储的键名称
   */
  protected getKey(key: string) {
    return this.options.prefix + key;
  }

  /**
   * 获取存储的数据。
   *
   * @param {string} key 键名称。
   * @returns 如果键值存在返回键值，否则返回 `null`。
   * @example
   * const local = new Storage(window.localStorage);
   * local.set('foo', { baz: 42 });
   * local.get('foo');
   * // { baz: 42 }
   */
  get<T extends ValueType = ValueType>(key: string): T | null {
    const value = this.storage.getItem(this.getKey(key));
    return this.options.needParsed ? parse(value, this.options.reviver) : value;
  }

  /**
   * 存储数据。
   *
   * @param key 键名称。
   * @param value 键值。
   * @example
   * const local = new Storage(window.localStorage);
   * local.set('foo', { baz: 42 });
   * local.get('foo');
   * // { baz: 42 }
   */
  set<T extends ValueType = ValueType>(key: string, value: T) {
    this.storage.setItem(
      this.getKey(key),
      this.options.needParsed ? stringify(value, this.options.replacer) : value
    );
  }

  /**
   * 删除存储的数据。
   *
   * @param key 键名称。
   * @example
   * const local = new Storage(window.localStorage);
   * local.set('foo', { baz: 42 });
   * local.get('foo');
   * // { baz: 42 }
   *
   * local.del('foo');
   * local.get('foo');
   * // null
   */
  del(key: string) {
    this.storage.removeItem(this.getKey(key));
  }

  /**
   * 清除存储的所有键。
   *
   * 注意：该方法调用 `storage.clear()`，可能会将同域下的不同实例的所有键都清除。如果要避免这种情况，建议使用 `import { Cache } 'cache2'`。
   *
   * @example
   * const local = new Storage(window.localStorage);
   * local.set('foo', { baz: 42 });
   * local.get('foo');
   * // { baz: 42 }
   *
   * local.clear();
   * local.get('foo');
   * // null
   */
  clear() {
    if (typeof this.storage.clear === 'function') {
      this.storage.clear();
    }
  }
}
