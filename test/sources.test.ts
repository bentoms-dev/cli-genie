import { describe, expect, it } from 'vitest';
import { fromArgv, fromEnv } from '../src/index.js';

describe('fromArgv', () => {
  it('parses flags into camelCased answers', () => {
    expect(
      fromArgv([
        'positional',
        '--first-name=Ben',
        '--city',
        'Bath',
        '--verbose',
        '--no-color',
        '--tag=a',
        '--tag=b',
        '--',
        '--ignored',
      ]),
    ).toEqual({ firstName: 'Ben', city: 'Bath', verbose: true, color: false, tag: ['a', 'b'] });
  });
});

describe('fromEnv', () => {
  it('reads prefixed variables', () => {
    expect(fromEnv('APP_', { APP_FIRST_NAME: 'Ben', OTHER: 'x', APP_: 'y' })).toEqual({
      firstName: 'Ben',
    });
  });
});
