import { JSON_Parse_reviver, JSON_Stringify_replacer, TStorage } from './interface';
import memoryStorage from './memoryStorage';
import { getUniqueId, isStorageSupported, parse, stringify } from './utils';

type Options = {
  prefix?: string;
  needParsed?: boolean;
  replacer?: JSON_Stringify_replacer;
  reviver?: JSON_Parse_reviver;
};

export class Storage {
  private storage: TStorage;
  private keyPrefix: string;
  private options: Options;
  private _keys: Record<string, any>;
  isMemoryStorage: boolean;

  constructor(storage?: TStorage, options?: Options) {
    const isSupported = storage ? isStorageSupported(storage) : false;
    this.keyPrefix = options?.prefix || (isSupported ? '' : getUniqueId());
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.storage = isSupported ? storage! : memoryStorage;
    this.isMemoryStorage = !isSupported || storage === memoryStorage;
    this.options = {
      needParsed: !this.isMemoryStorage,
      ...options
    };
    this._keys = {};
  }
  private getKey(key: string) {
    return this.keyPrefix + key;
  }
  get(key: string) {
    const k = this.getKey(key);
    const data = this.storage.getItem(k);
    return this.options.needParsed ? parse(data, this.options.reviver) : data;
  }
  set(key: string, data: any) {
    const k = this.getKey(key);
    this.storage.setItem(
      k,
      this.options.needParsed ? stringify(data, this.options.replacer) : data
    );
    if (this.isMemoryStorage) {
      // 内部标记
      this._keys[key] = 1;
    }
  }
  del(key: string) {
    const k = this.getKey(key);
    this.storage.removeItem(k);
    if (this.isMemoryStorage) {
      delete this._keys[key];
    }
  }
  clear() {
    if (typeof this.storage.clear === 'function') {
      this.storage.clear();
    } else if (this.isMemoryStorage) {
      const keys = Object.keys(this._keys);
      keys.forEach((key) => {
        this.del(key);
      });
    }
  }
}

export default Storage;
