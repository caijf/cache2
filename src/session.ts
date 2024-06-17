import { inWindow } from './utils';
import { Storage } from './Storage';

/**
 * @deprecated 即将废弃，请使用 `const local = new Storage(window.sessionStorage)`
 */
const session = new Storage(inWindow ? window.sessionStorage : undefined);

export default session;
