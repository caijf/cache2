import { CAHCE_DEFAULT_NAMESPACE } from './utils';

type Key = string | symbol;

// 全局内存缓存存储
const cache: Record<Key, Record<string, any>> = {};

/**
 * 内存存储实现
 * 用于提供基于内存的缓存功能
 */
class MemoryStorage {
  private scope: Key;
  data: Record<string, any>;

  /**
   * 创建内存存储实例
   * @param scope 存储作用域，默认为 'default'
   */
  constructor(scope: Key = CAHCE_DEFAULT_NAMESPACE) {
    this.scope = scope;
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
}

export default MemoryStorage;
