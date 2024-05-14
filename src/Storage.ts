import { JSON_Parse_reviver, JSON_Stringify_replacer, TStorage } from './interface';
import MemoryStorage from './MemoryStorage';
import { isStorageSupported, parse, stringify } from './utils';

export type StorageOptions = {
  needParsed: boolean; // 存取数据时是否需要解析和序列化数据。如果使用内存缓存，默认为 false ，如果自定义 storage 默认为 true。
  replacer: JSON_Stringify_replacer; // 仅在自定义数据存储器后生效。同 JSON.stringify 的 replacer
  reviver: JSON_Parse_reviver; // 仅在自定义数据存储器后生效。同 JSON.parse 的 reviver
  memoryScope?: string; // 内存缓存域
};

export class Storage {
  private storage: TStorage;
  private options: Partial<StorageOptions>;

  constructor(storage?: TStorage, options: Partial<StorageOptions> = {}) {
    const isSupported = storage ? isStorageSupported(storage) : false;
    this.options = {
      needParsed: isSupported,
      ...options
    };

    this.storage = isSupported ? storage! : new MemoryStorage(this.options.memoryScope);
  }
  get(key: string) {
    const data = this.storage.getItem(key);
    return this.options.needParsed ? parse(data, this.options.reviver) : data;
  }
  set(key: string, data: any) {
    this.storage.setItem(
      key,
      this.options.needParsed ? stringify(data, this.options.replacer) : data
    );
  }
  del(key: string) {
    this.storage.removeItem(key);
  }
  clear() {
    if (typeof this.storage.clear === 'function') {
      this.storage.clear();
    }
  }
}
