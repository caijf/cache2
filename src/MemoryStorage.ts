import { CACHE_DEFAULT_NAMESPACE } from './utils';

type Key = string | symbol;

// 全局内存缓存存储
const cache: Record<Key, Record<string, any>> = {};
// 各作用域的实例引用计数，用于在全部实例销毁后回收全局存储
const refs: Record<Key, number> = {};

/**
 * 内存存储实现
 * 用于提供基于内存的缓存功能
 */
class MemoryStorage {
  private scope: Key;
  private _destroyed = false;
  data: Record<string, any>;

  /**
   * 创建内存存储实例
   * @param scope 存储作用域，默认为 'default'
   */
  constructor(scope: Key = CACHE_DEFAULT_NAMESPACE) {
    this.scope = scope;
    refs[this.scope] = (refs[this.scope] || 0) + 1;
    // 初始化作用域缓存
    if (!cache[this.scope]) {
      cache[this.scope] = {};
    }
    this.data = cache[this.scope];
  }

  /**
   * 获取存储的值
   * @param key 键名
   * @returns 存储的值，如果不存在则返回 null
   */
  getItem(key: string) {
    return key in this.data ? this.data[key] : null;
  }

  /**
   * 设置存储的值
   * @param key 键名
   * @param value 要存储的值
   */
  setItem(key: string, value: any) {
    this.data[key] = value;
  }

  /**
   * 删除存储的值
   * @param key 键名
   */
  removeItem(key: string) {
    delete this.data[key];
  }

  /**
   * 清空当前作用域的所有存储
   */
  clear() {
    cache[this.scope] = {};
    this.data = cache[this.scope];
  }

  /**
   * 销毁存储实例，并将作用域的引用计数减一。
   *
   * 当作用域的引用计数归零时，该作用域的数据将从全局存储中删除，以避免内存泄漏。重复调用无效。
   */
  destroy() {
    if (this._destroyed) {
      return;
    }
    this._destroyed = true;
    // 断开与全局存储的关联，销毁后的实例不再可读写字身作用域数据
    this.data = {};
    refs[this.scope]--;
    if (refs[this.scope] <= 0) {
      delete refs[this.scope];
      delete cache[this.scope];
    }
  }
}

export default MemoryStorage;
