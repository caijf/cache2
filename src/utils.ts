import { JSON_Parse_reviver, JSON_Stringify_replacer, TStorage } from './interface';

// 随机字符串
function randomString() {
  return Math.random().toString(16).substring(2, 8);
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
      const key = randomString() + new Date().getTime();
      const value = '1';
      storage.setItem(key, value);
      if (storage.getItem(key) !== value) {
        return false;
      }
      storage.removeItem(key);
    }
    return isSupport;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (err) {
    console.error(`[cache2] ${storage} is not supported. The default memory cache will be used.`);
    return false;
  }
}

export function parse(value: any, reviver?: JSON_Parse_reviver) {
  try {
    return JSON.parse(value, reviver);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (err) {
    return value;
  }
}

export function stringify(value: any, replacer?: JSON_Stringify_replacer) {
  return JSON.stringify(value, replacer);
}
