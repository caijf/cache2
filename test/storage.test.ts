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
});
