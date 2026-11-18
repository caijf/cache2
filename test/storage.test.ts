import { Storage } from '../src';

const inWindow =
  typeof window !== 'undefined' && typeof window === 'object' && window.window === window;
const local = new Storage(inWindow ? window.localStorage : undefined);
const session = new Storage(inWindow ? window.sessionStorage : undefined);

describe('Storage', () => {
  it('basic', () => {
    local.set('a', 1);
    local.set('b', { foo: 'bar', baz: [] });
    expect(local.get('a')).toBe(1);
    expect(local.get('b')).toEqual({ foo: 'bar', baz: [] });

    local.clear();
    // console.log(local.get('a'));
    expect(local.get('a')).toBeNull();
    expect(local.get('b')).toBeNull();

    session.set('a', 1);
    session.set('b', { foo: 'bar', baz: [] });
    expect(session.get('a')).toBe(1);
    expect(session.get('b')).toEqual({ foo: 'bar', baz: [] });
    session.clear();
    expect(session.get('a')).toBeNull();
    expect(session.get('b')).toBeNull();
  });

  it('相同的内存缓存域', () => {
    const memoryStorage1 = new Storage();
    const memoryStorage2 = new Storage();

    memoryStorage1.set('a', 1);
    expect(memoryStorage1.get('a')).toBe(1);
    expect(memoryStorage2.get('a')).toBe(1);

    memoryStorage2.set('a', 2);
    expect(memoryStorage1.get('a')).toBe(2);
    expect(memoryStorage2.get('a')).toBe(2);
  });

  it('不同的内存缓存域', () => {
    const memoryStorage1 = new Storage(undefined, { memoryScope: 'n1' });
    const memoryStorage2 = new Storage(undefined, { memoryScope: 'n2' });

    memoryStorage1.set('a', 1);
    memoryStorage2.set('a', 2);
    expect(memoryStorage1.get('a')).toBe(1);
    expect(memoryStorage2.get('a')).toBe(2);
  });

  it('prefix', () => {
    const store1 = new Storage();

    // @ts-ignore
    expect(store1.getKey('abc')).toBe('abc');

    const store2 = new Storage(undefined, {
      prefix: 'cache2'
    });
    // @ts-ignore
    expect(store2.getKey('abc')).toBe('cache2abc');
  });

  it('custom storage and no clear method', () => {
    const o: Record<string, any> = {};
    const store1 = new Storage(
      {
        getItem: (k: string) => {
          return o[k];
        },
        removeItem: (k: string) => {
          delete o[k];
        },
        setItem: (k: string, v: any) => {
          o[k] = v;
        }
      },
      {
        needParsed: false
      }
    );
    expect(store1.get('abc')).toBeUndefined();
    store1.set('abc', 123);
    expect(store1.get('abc')).toBe(123);

    // 不生效，因为自定义的 storage 没有实现 clear 方法
    store1.clear();
    expect(store1.get('abc')).toBe(123);
  });

  it('内存缓存 clear', () => {
    const memory = new Storage(undefined, { memoryScope: 'memory clear' });
    memory.set('a', 1);
    memory.clear();
    expect(memory.get('a')).toBeNull();
  });

  it('内存缓存 clear 后同作用域实例仍共享数据', () => {
    const storage1 = new Storage(undefined, { memoryScope: 'clear shared' });
    const storage2 = new Storage(undefined, { memoryScope: 'clear shared' });
    storage1.set('a', 1);

    storage1.clear();
    expect(storage2.get('a')).toBeNull(); // 清理对其他实例同样生效

    storage2.set('b', 2);
    expect(storage1.get('b')).toBe(2); // 实例间引用不分叉
  });

  it('destroy 后 clear 仅重置实例自身', () => {
    const memory = new Storage(undefined, { memoryScope: 'clear after destroy' });
    memory.set('a', 1);
    memory.destroy(); // 引用计数归零，作用域已回收

    memory.clear();
    expect(memory.get('a')).toBeNull();

    // 不应复活已回收的作用域：新实例为独立空存储
    const fresh = new Storage(undefined, { memoryScope: 'clear after destroy' });
    expect(fresh.get('a')).toBeNull();
    fresh.destroy();
  });

  it('destroy 不影响自定义 storage', () => {
    const removeItem = jest.fn();
    const storage = new Storage(
      {
        getItem: () => null,
        setItem: () => {},
        removeItem
      },
      { needParsed: false }
    );
    removeItem.mockClear(); // 清除构造时的探测调用

    storage.destroy();
    expect(removeItem).not.toHaveBeenCalled();
  });

  it('重复实例化同一 storage 不再写入探测键', () => {
    const calls: string[] = [];
    const store = {
      getItem() {
        return null;
      },
      setItem(key: string) {
        calls.push(key);
      },
      removeItem(key: string) {
        calls.push(key);
      }
    };
    new Storage(store);
    new Storage(store);
    // 探测键仅在首次写入（setItem + removeItem 共 2 次调用）
    expect(calls).toHaveLength(2);
    expect(calls[0].startsWith('___cache2_test_')).toBe(true);
  });
});
