type Key = string | symbol;
const cache: Record<Key, Record<string, any>> = {};

class MemoryStorage {
  private scope: Key;
  data: Record<string, any>;

  constructor(scope: Key = 'default') {
    this.scope = scope;
    if (!cache[this.scope]) {
      cache[this.scope] = {};
    }
    this.data = cache[this.scope];
  }

  getItem(key: string) {
    return key in this.data ? this.data[key] : null;
  }

  setItem(key: string, value: any) {
    this.data[key] = value;
  }

  removeItem(key: string) {
    delete this.data[key];
  }

  clear() {
    cache[this.scope] = {};
    this.data = cache[this.scope];
  }
}

export default MemoryStorage;
