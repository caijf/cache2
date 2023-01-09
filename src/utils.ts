export type TStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'clear'> & Record<string, any>;

// 随机字符串
function randomString() {
  return Math.random().toString(16).substring(2);
}

// 内部自增id
let uid = 1;

// 返回唯一标识
export function uniqueId(prefix = 'cache2') {
  return `${prefix}_${randomString()}_${uid}`;
}

// 是否支持 storage
export function isStorageSupport(storage: TStorage) {
  try {
    const isSupport = typeof storage === 'object' && storage !== null && !!storage.setItem && !!storage.getItem && !!storage.removeItem && !!storage.clear;
    if (isSupport) {
      const uniqueKey = uniqueId();
      storage.setItem(uniqueKey, '1');
      storage.removeItem(uniqueKey);
    }
    return isSupport;
  } catch (e) {
    return false;
  }
}
