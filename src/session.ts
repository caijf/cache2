import { inWindow } from './utils';
import { Storage } from './Storage';

const session = new Storage(inWindow ? window.sessionStorage : undefined);

export default session;
