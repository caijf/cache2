import { Cache } from '../src';
import MemoryStorage from '../src/MemoryStorage';

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

const o = {
  undef: undefined,
  num: 1,
  str: 'foo',
  obj: {
    foo: 'bar',
    baz: {
      x: 42
    }
  }
};

const customStorage = Object.assign({}, new MemoryStorage('unique id 1234'));

describe('basic', () => {
  const myCache = new Cache();

  afterAll(() => {
    myCache.clear();
  });

  it('should be defined', () => {
    expect(Cache).toBeDefined();
  });

  it('set key', () => {
    expect(myCache.set('undef', o.undef)).toEqual(true);
    expect(myCache.set('num', o.num)).toEqual(true);
    expect(myCache.set('str', o.str)).toEqual(true);
    expect(myCache.set('obj', o.obj)).toEqual(true);
  });

  it('get key', () => {
    expect(myCache.get('undef')).toEqual(o.undef);
    expect(myCache.get('num')).toEqual(o.num);
    expect(myCache.get('str')).toEqual(o.str);
    expect(myCache.get('obj')).toEqual(o.obj);
    expect(myCache.get('non existing key')).toBeUndefined();
  });

  it('getAll', () => {
    expect(myCache.getAll()).toEqual({
      undef: o.undef,
      num: o.num,
      str: o.str,
      obj: o.obj
    });
  });

  it('get key names', () => {
    expect(myCache.keys()).toEqual(['undef', 'num', 'str', 'obj']);
  });

  it('has key', () => {
    expect(myCache.has('undef')).toEqual(true);
    expect(myCache.has('num')).toEqual(true);
    expect(myCache.has('str')).toEqual(true);
    expect(myCache.has('obj')).toEqual(true);
    expect(myCache.has('non existing key')).toEqual(false);
  });

  it('del key', () => {
    expect(myCache.del('num')).toEqual(1);
    expect(myCache.keys()).toEqual(['undef', 'str', 'obj']);

    expect(myCache.del(['num', 'undef', 'str'])).toEqual(2);
    expect(myCache.keys()).toEqual(['obj']);
    myCache.mset([
      { key: 'undef', value: o.undef },
      { key: 'str', value: o.str }
    ]);

    expect(myCache.del('non existing key')).toEqual(0);
    expect(myCache.del('undef')).toEqual(1);
    expect(myCache.keys()).toEqual(['obj', 'str']);
  });

  it('take key', () => {
    expect(myCache.has('str')).toEqual(true);
    expect(myCache.take('str')).toEqual(o.str);
    expect(myCache.has('str')).toEqual(false);

    myCache.set('undef', o.undef);
    expect(myCache.has('undef')).toEqual(true);
    expect(myCache.take('undef')).toBeUndefined();
    expect(myCache.has('undef')).toEqual(false);

    expect(myCache.has('non existing key')).toEqual(false);
    expect(myCache.take('non existing key')).toBeUndefined();
  });

  it('update key', () => {
    expect(myCache.set('obj', { foo: 'bar' })).toEqual(true);
    expect(myCache.get('obj')).toEqual({ foo: 'bar' });
  });

  it('multiple set', () => {
    const res = myCache.mset([
      { key: 'undef', value: o.undef },
      { key: 'str', value: o.str },
      { key: 'obj', value: o.obj }
    ]);
    expect(res).toEqual(true);
    expect(myCache.keys()).toEqual(['obj', 'undef', 'str']);
  });

  it('multiple get', () => {
    const obj = myCache.mget(['obj', 'undef']);
    expect(obj).toEqual({ obj: o.obj, undef: undefined });

    // @ts-ignore
    // 非数组参数
    expect(myCache.mget('abc')).toEqual({});
  });

  it('clear', () => {
    expect(myCache.keys()).toEqual(['obj', 'undef', 'str']);
    myCache.clear();
    expect(myCache.keys()).toEqual([]);
  });
});

describe('namespace', () => {
  it('default', () => {
    const myCache = new Cache({
      storage: customStorage
    });
    // @ts-ignore
    expect(myCache.cacheKey).toBe('cache2_default');

    const myCache2 = new Cache({
      prefix: ''
    });
    // @ts-expect-error
    expect(myCache2.cacheKey).toBe('default');

    const myCache3 = new Cache('', {
      prefix: ''
    });
    // @ts-expect-error
    expect(myCache3.cacheKey.length).toBe(8);
  });

  it('same namespace', () => {
    const myCache1 = new Cache('namespace');

    myCache1.set('a', 1);
    myCache1.set('b', 2);

    expect(myCache1.get('a')).toBe(1);
    expect(myCache1.keys()).toEqual(['a', 'b']);

    const myCache2 = new Cache('namespace');

    myCache2.set('a', 5);
    myCache2.del('b');

    expect(myCache2.get('a')).toBe(5);
    expect(myCache2.keys()).toEqual(['a']);

    expect(myCache1.get('a')).toBe(5);
    expect(myCache1.keys()).toEqual(['a']);
  });

  it('difference namespace', () => {
    const myCache1 = new Cache('namespace1');

    myCache1.set('a', 1);
    myCache1.set('b', 2);

    expect(myCache1.get('a')).toBe(1);
    expect(myCache1.keys()).toEqual(['a', 'b']);

    const myCache2 = new Cache('namespace2');

    myCache2.set('a', 5);
    myCache2.del('b');

    expect(myCache2.get('a')).toBe(5);
    expect(myCache2.keys()).toEqual(['a']);

    expect(myCache1.get('a')).toBe(1);
    expect(myCache1.keys()).toEqual(['a', 'b']);
  });
});

describe('expired & checkperiod', () => {
  it('stdTTL', () => {
    const myCache = new Cache('expired & checkperiod', { stdTTL: 5000 });
    myCache.set('num', o.num);
    myCache.set('str', o.str, 1000);

    expect(myCache.keys()).toEqual(['num', 'str']);

    jest.advanceTimersByTime(1001);
    expect(myCache.get('str')).toBeUndefined();
    expect(myCache.keys()).toEqual(['num']);

    jest.advanceTimersByTime(4000);
    expect(myCache.get('num')).toBeUndefined();
    expect(myCache.keys()).toEqual([]);
  });

  it('ttl & getTtl', () => {
    const now = Date.now();
    const myCache = new Cache({ stdTTL: 5000 });
    myCache.set('num', o.num);
    myCache.set('str', o.str, 1000);

    expect(myCache.getTtl('num')).toEqual(now + 5000);
    expect(myCache.getTtl('str')).toEqual(now + 1000);

    expect(myCache.ttl('str', 0)).toEqual(true);
    expect(myCache.getTtl('str')).toEqual(0);

    jest.advanceTimersByTime(5001);
    expect(myCache.get('num')).toBeUndefined();
    expect(myCache.get('str')).toEqual(o.str);
    expect(myCache.keys()).toEqual(['str']);

    expect(myCache.ttl('non existing key', 0)).toEqual(false);
    expect(myCache.getTtl('non existing key')).toBeUndefined();
  });

  it('checkperiod', () => {
    const myCache = new Cache('checkperiod', { stdTTL: 5000, checkperiod: 10 * 60 * 1000 });
    myCache.set('num', o.num);
    myCache.set('str', o.str, 10 * 60 * 1000);

    expect(myCache.keys()).toEqual(['num', 'str']);

    jest.advanceTimersByTime(10 * 60 * 1000);
    expect(myCache.del('num')).toEqual(0); // 过期自动被清除

    myCache.stopCheckperiod(); // 停止自动检测过期
    jest.advanceTimersByTime(1);
    expect(myCache.del('str')).toEqual(1);
  });

  it('getLastModified', () => {
    const now = Date.now();
    const myCache = new Cache();
    myCache.set('num', o.num);
    expect(myCache.getLastModified('num')).toEqual(now);

    jest.advanceTimersByTime(1000);
    myCache.set('num', o.num);
    expect(myCache.getLastModified('num')).toEqual(now + 1000);

    myCache.del('num');
    expect(myCache.getLastModified('num')).toBeUndefined();
  });
});

describe('max & maxStrategy', () => {
  it('max = 0', () => {
    const myCache = new Cache('max', { max: 0 });
    expect(myCache.set('num', o.num)).toEqual(false);
    expect(
      myCache.mset([
        { key: 'str', value: o.str },
        { key: 'undef', value: o.undef }
      ])
    ).toEqual(false);
    expect(myCache.getAll()).toEqual({});
  });

  it('limited', () => {
    const myCache = new Cache('limited', { max: 1, stdTTL: 1000 });
    expect(myCache.set('num', o.num)).toEqual(true);
    expect(myCache.keys()).toEqual(['num']);

    expect(myCache.set('str', o.str)).toEqual(false);
    expect(myCache.keys()).toEqual(['num']);

    jest.advanceTimersByTime(1001);
    expect(myCache.set('str', o.str)).toEqual(true);
    expect(myCache.keys()).toEqual(['str']);
  });

  it('replaced', () => {
    const myCache = new Cache('replaced', { max: 2, stdTTL: 1000, maxStrategy: 'replaced' });
    expect(myCache.set('num', o.num)).toEqual(true);
    expect(myCache.set('str', o.str, 500)).toEqual(true);

    expect(myCache.keys()).toEqual(['num', 'str']);

    // 优先删除临近过期的数据 str
    expect(myCache.set('obj', o.obj)).toEqual(true);
    expect(myCache.keys()).toEqual(['num', 'obj']);
  });

  it('expired', () => {
    const myCache = new Cache('expired', { max: 2, stdTTL: 5000 });
    expect(myCache.set('num', o.num)).toEqual(true);
    expect(myCache.set('str', o.str, 1000)).toEqual(true);
    expect(myCache.set('obj', o.obj)).toEqual(false);

    expect(myCache.keys()).toEqual(['num', 'str']);

    jest.advanceTimersByTime(1001);
    expect(myCache.set('obj', o.obj)).toEqual(true);
    expect(myCache.keys()).toEqual(['num', 'obj']);

    jest.advanceTimersByTime(4000);
    expect(myCache.keys()).toEqual(['obj']);

    jest.advanceTimersByTime(1001);
    expect(myCache.keys()).toEqual([]);
  });
});

describe('events', () => {
  it('set', () => {
    // const fn1 = jest.fn((key, value) => {
    //   console.log(key + ': ' + value);
    // });
    const fn1 = jest.fn();
    const fn2 = jest.fn();
    const myCache = new Cache('set');

    myCache.on('set', fn1);
    myCache.once('set', fn2);

    expect(fn1).toHaveBeenCalledTimes(0);
    expect(fn2).toHaveBeenCalledTimes(0);

    myCache.set('num', o.num);
    expect(fn1).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenCalledTimes(1);

    myCache.set('str', o.str);
    expect(fn1).toHaveBeenCalledTimes(2);
    expect(fn2).toHaveBeenCalledTimes(1);

    myCache.mset([
      { key: 'undef', value: o.undef },
      { key: 'obj', value: o.obj }
    ]);
    expect(fn1).toHaveBeenCalledTimes(4);
    expect(fn2).toHaveBeenCalledTimes(1);
  });

  it('set & limited', () => {
    const fn = jest.fn();
    const myCache = new Cache('event set & limited', { max: 1 });
    myCache.on('set', fn);
    expect(fn).toHaveBeenCalledTimes(0);

    expect(myCache.set('num', o.num)).toEqual(true);
    expect(fn).toHaveBeenCalledTimes(1);

    expect(myCache.set('str', o.str)).toEqual(false);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('del', () => {
    // const fn1 = jest.fn((key, value) => {
    //   console.log(key + ': ' + value);
    // });
    const fn1 = jest.fn();
    const fn2 = jest.fn();
    const myCache = new Cache('event del');

    myCache.on('del', fn1);
    myCache.once('del', fn2);

    expect(fn1).toHaveBeenCalledTimes(0);
    expect(fn2).toHaveBeenCalledTimes(0);

    myCache.mset([
      { key: 'undef', value: o.undef },
      { key: 'obj', value: o.obj },
      { key: 'str', value: o.str },
      { key: 'num', value: o.num }
    ]);

    myCache.del('num');
    expect(fn1).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenCalledTimes(1);

    myCache.del(['str', 'undef', 'obj']);
    expect(fn1).toHaveBeenCalledTimes(4);
    expect(fn2).toHaveBeenCalledTimes(1);

    myCache.del('non existing key');
    expect(fn1).toHaveBeenCalledTimes(4);
    expect(fn2).toHaveBeenCalledTimes(1);
  });

  it('expired', () => {
    const delFn = jest.fn();
    const expiredFn = jest.fn();
    const myCache = new Cache('event expired', { stdTTL: 1000 });

    myCache.on('del', delFn);
    myCache.on('expired', expiredFn);

    expect(delFn).toHaveBeenCalledTimes(0);
    expect(expiredFn).toHaveBeenCalledTimes(0);

    myCache.set('num', o.num);
    myCache.set('str', o.str, 5000);

    jest.advanceTimersByTime(1001);

    // 这里需要调用任意方法，触发过期检查方法
    expect(myCache.mget(['num', 'str'])).toEqual({ str: o.str });

    expect(delFn).toHaveBeenCalledTimes(1);
    expect(expiredFn).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(4000);

    myCache.del('str'); // 删除键时不判断是否过期

    expect(delFn).toHaveBeenCalledTimes(2);
    expect(expiredFn).toHaveBeenCalledTimes(1);
  });
});

describe('use cache key & storage', () => {
  it('same the cache key', () => {
    const myCache1 = new Cache('test');
    const myCache2 = new Cache('test');

    myCache1.set('num', o.num);
    expect(myCache1.keys()).toEqual(['num']);
    expect(myCache2.keys()).toEqual(['num']);
  });

  it('mock localStorage or sessionStorage', () => {
    const cache: Record<string, any> = {};
    const myCache = new Cache('test2', {
      storage: {
        setItem(key, value) {
          cache[key] = value;
        },
        getItem(key) {
          return cache[key];
        },
        removeItem(key) {
          delete cache[key];
        }
      },
      replacer(key, value) {
        // console.log('replacer: ', 'key: ', key, 'value: ', value, typeof value);
        return value;
      },
      reviver(key, value) {
        // console.log('reviver: ', 'key: ', key, 'value: ', value, typeof value);
        return value;
      }
    });
    expect(myCache.set('num', o.num)).toEqual(true);
    expect(myCache.get('num')).toEqual(o.num);
    expect(myCache.set('undef', o.undef)).toEqual(true);
    expect(myCache.get('undef')).toEqual(o.undef);
  });

  it('mock wx snycStorage needParsed=false', () => {
    const cache: Record<string, any> = {};
    const myCache = new Cache('test3', {
      storage: {
        setItem(key, value) {
          cache[key] = value;
        },
        getItem(key) {
          return cache[key];
        },
        removeItem(key) {
          delete cache[key];
        }
      },
      needParsed: false
    });
    expect(myCache.set('num', o.num)).toEqual(true);
    expect(myCache.get('num')).toEqual(o.num);
  });

  it('unsopported storage', () => {
    const myCache = new Cache('test4', {
      storage: {} as any
    });
    expect(myCache.set('num', o.num)).toEqual(true);
    expect(myCache.get('num')).toEqual(o.num);
  });

  it('storage setItem throw  error', () => {
    const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(jest.fn);

    const myCache = new Cache('test5', {
      storage: {
        setItem() {
          throw 'some error';
        },
        getItem() {
          return '';
        },
        removeItem() {
          return '';
        }
      }
    });
    expect(myCache.set('num', o.num)).toEqual(true);
    expect(myCache.get('num')).toEqual(o.num);

    mockConsoleError.mockRestore();
  });

  it('storage removeItem throw  error', () => {
    const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(jest.fn);

    const myCache = new Cache('test6', {
      storage: {
        setItem() {
          return '';
        },
        getItem() {
          return '';
        },
        removeItem() {
          throw 'some error';
        }
      }
    });
    expect(myCache.set('num', o.num)).toEqual(true);
    expect(myCache.get('num')).toEqual(o.num);

    mockConsoleError.mockRestore();
  });
});
