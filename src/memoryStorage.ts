const cache: Record<string, any> = {};

const memoryStorage = {
  getItem(key: string) {
    return key in cache ? cache[key] : null;
  },
  setItem(key: string, value: any) {
    cache[key] = value;
  },
  removeItem(key: string) {
    delete cache[key];
  }
};

export default memoryStorage;
