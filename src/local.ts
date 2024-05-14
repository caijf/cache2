import { inWindow } from './utils';
import { Storage } from './Storage';

const local = new Storage(inWindow ? window.localStorage : undefined);

export default local;
