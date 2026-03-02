import { JSON_Parse_reviver, JSON_Stringify_replacer, TStorage } from './interface';

const pkgName = 'cache2';

/**缓存命名空间缓存键前缀。 */
export const CACHE_DEFAULT_PREFIX = `${pkgName}_`;
/**缓存默认命名空间。 */
export const CAHCE_DEFAULT_NAMESPACE = 'default';

/**
 * 是否支持 storage。
 *
 * @param storage 存储对象。
 * @returns 如果支持 storage 返回 `true`，否则返回 `false`。
 */
export function isStorageSupported(storage: TStorage) {
  try {
    const isSupport =
      typeof storage === 'object' &&
      storage !== null &&
      !!storage.setItem &&
      !!storage.getItem &&
      !!storage.removeItem;
    if (isSupport) {
      const randomStr = Math.random().toString(16).substring(2, 8);
      const key = `___${pkgName}_test_${randomStr}_${Date.now()}___`;
      const value = '1';
      storage.setItem(key, value);
      storage.removeItem(key);
    }
    return isSupport;
  } catch (err) {
    console.error(
      `[${pkgName}] Storage operation failed:`,
      err instanceof Error ? err.message : err
    );
    console.warn(`[${pkgName}] The default memory cache will be used.`);
    return false;
  }
}

export function parse(value: any, reviver?: JSON_Parse_reviver) {
  try {
    return JSON.parse(value, reviver);
  } catch (err) {
    console.warn(
      `[${pkgName}] JSON parse failed, returning original value:`,
      err instanceof Error ? err.message : err
    );
    return value;
  }
}

export function stringify(value: any, replacer?: JSON_Stringify_replacer) {
  try {
    return JSON.stringify(value, replacer);
  } catch (err) {
    console.error(`[${pkgName}] JSON stringify failed:`, err instanceof Error ? err.message : err);
    throw err;
  }
}
