export type TStorage<T = any> = {
  getItem(key: string): T | null;
  removeItem(key: string): void;
  setItem(key: string, value: T): void;
  clear?: () => void;
  [x: string]: any;
};

export type JSON_Parse_reviver = (this: any, key: string, value: any) => any;
export type JSON_Stringify_replacer = JSON_Parse_reviver;
