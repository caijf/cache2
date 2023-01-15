export type TStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> & Record<string, any>;

// 随机字符串
function randomString() {
  return Math.random().toString(16).substring(2, 8);
}

// 内部自增id
let uid = 1;

// 返回唯一标识
export function uniqueId(id = '', prefix = 'cache2') {
  const str = typeof id === 'string' && id ? id : `${randomString()}_${uid++}`;
  return `${prefix}_${str}`;
}

// 是否支持 storage
export function isStorageSupport(storage: TStorage) {
  try {
    const isSupport =
      typeof storage === 'object' &&
      storage !== null &&
      !!storage.setItem &&
      !!storage.getItem &&
      !!storage.removeItem;
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
