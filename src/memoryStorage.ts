let cache: Record<string, any> = {};

const memoryStorage = {
  __memory__: true,
  getItem(key: string) {
    return cache[key] || null;
  },
  setItem(key: string, value: any) {
    cache[key] = value;
  },
  removeItem(key: string) {
    delete cache[key];
  },
  clear() {
    cache = {};
  }
}

export default memoryStorage;