import { local, session, Storage } from '../src';

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

  it('内存缓存前缀为空字符串', () => {
    const memoryStorage1 = new Storage(undefined, {
      prefix: ''
    });
    const memoryStorage2 = new Storage();

    memoryStorage1.set('a', 1);
    memoryStorage2.set('a', 2);
    expect(memoryStorage1.get('a')).toBe(1);
    expect(memoryStorage2.get('a')).toBe(2);

    // @ts-ignore
    expect(memoryStorage1.getKey('a')).toBe('a');
    // @ts-ignore
    expect(memoryStorage2.getKey('a')).not.toBe('a');
  });
});
