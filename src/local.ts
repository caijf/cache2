import { inWindow } from './utils';
import { Storage } from './Storage';

/**
 * @deprecated 即将废弃，请使用 `const local = new Storage(window.localStorage)`
 */
const local = new Storage(inWindow ? window.localStorage : undefined);

export default local;
