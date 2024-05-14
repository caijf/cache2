import { JSON_Parse_reviver, JSON_Stringify_replacer, TStorage } from './interface';

// 随机字符串
function randomString() {
  return Math.random().toString(16).substring(2, 8);
}

// 内部自增id
let uid = 1;

// 返回唯一标识
export function getUniqueId() {
  return `${randomString()}_${uid++}`;
}

// 是否支持 storage
export function isStorageSupported(storage: TStorage) {
  try {
    const isSupport =
      typeof storage === 'object' &&
      storage !== null &&
      !!storage.setItem &&
      !!storage.getItem &&
      !!storage.removeItem;
    if (isSupport) {
      const key = getUniqueId();
      const value = '1';
      storage.setItem(key, value);
      if (storage.getItem(key) !== value) {
        return false;
      }
      storage.removeItem(key);
    }
    return isSupport;
  } catch (e) {
    console.error(`[cache2] ${storage} is not supported. The default memory cache will be used.`);
    return false;
  }
}

export function parse(value: any, reviver?: JSON_Parse_reviver) {
  try {
    return JSON.parse(value, reviver);
  } catch (e) {
    return value;
  }
}

export function stringify(value: any, replacer?: JSON_Stringify_replacer) {
  return JSON.stringify(value, replacer);
}

export const inWindow =
  typeof window !== 'undefined' && typeof window === 'object' && window.window === window;
