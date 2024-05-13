import { JSON_Parse_reviver, JSON_Stringify_replacer, TStorage } from './interface';
import memoryStorage from './memoryStorage';
import { getUniqueId, isStorageSupported, parse, stringify } from './utils';

export type StorageOptions = {
  prefix: string;
  needParsed: boolean; // 存取数据时是否需要解析和序列化数据。如果使用内存缓存，默认为 false ，如果自定义 storage 默认为 true。
  replacer: JSON_Stringify_replacer; // 仅在自定义数据存储器后生效。同 JSON.stringify 的 replacer
  reviver: JSON_Parse_reviver; // 仅在自定义数据存储器后生效。同 JSON.parse 的 reviver
};

export class Storage {
  private storage: TStorage;
  private keyPrefix: string;
  private options: Partial<StorageOptions>;
  private _keys: string[];
  isMemoryStorage: boolean;

  constructor(storage?: TStorage, options: Partial<StorageOptions> = {}) {
    const isSupported = storage ? isStorageSupported(storage) : false;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.storage = isSupported ? storage! : memoryStorage;
    this.isMemoryStorage = !isSupported || storage === memoryStorage;
    this.options = {
      needParsed: !this.isMemoryStorage,
      ...options
    };

    this.keyPrefix =
      'prefix' in options ? String(options.prefix) : isSupported ? '' : getUniqueId();
    this._keys = [];
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
      this._keys.push(key);
    }
  }
  del(key: string) {
    const k = this.getKey(key);
    this.storage.removeItem(k);
    if (this.isMemoryStorage) {
      this._keys = this._keys.filter((item) => item !== key);
    }
  }
  clear() {
    if (typeof this.storage.clear === 'function') {
      this.storage.clear();
    } else if (this.isMemoryStorage) {
      this._keys.forEach((key) => {
        this.del(key);
      });
    }
  }
}

export default Storage;
