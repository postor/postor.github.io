
import { LevelConfig } from '../types';
import { levels001to010 } from './001-010';
import { levels011to020 } from './011-020';
import { levels021to030 } from './021-030';
import { levels031to040 } from './031-040';
import { levels041to050 } from './041-050';
import { levels051to060 } from './051-060';
import { levels061to070 } from './061-070';
import { levels071to080 } from './071-080';
import { levels081to090 } from './081-090';
import { levels091to100 } from './091-100';
import { levels101to120 } from './101-120';

export const LEVELS: LevelConfig[] = [
    ...levels001to010,
    ...levels011to020,
    ...levels021to030,
    ...levels031to040,
    ...levels041to050,
    ...levels051to060,
    ...levels061to070,
    ...levels071to080,
    ...levels081to090,
    ...levels091to100,
    ...levels101to120
];
