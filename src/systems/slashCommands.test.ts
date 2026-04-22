import { describe, expect, it } from 'vitest';

import { getSlashSuggestions, routeSlashCommand } from './slashCommands';

describe('routeSlashCommand', () => {
  it('routes level 2 aliases', () => {
    expect(routeSlashCommand('/level-2')).toBe('zone2');
    expect(routeSlashCommand('/level2')).toBe('zone2');
    expect(routeSlashCommand('/zone-2')).toBe('zone2');
    expect(routeSlashCommand('/word-woods')).toBe('zone2');
  });

  it('routes level 1 aliases', () => {
    expect(routeSlashCommand('/level-1')).toBe('world');
    expect(routeSlashCommand('/zone1')).toBe('world');
  });

  it('routes dungeon aliases', () => {
    expect(routeSlashCommand('/dungeon')).toBe('dungeon');
    expect(routeSlashCommand('/cursor-shrine')).toBe('dungeon');
  });

  it('routes help aliases', () => {
    expect(routeSlashCommand('/help')).toBe('help');
    expect(routeSlashCommand('/?')).toBe('help');
  });

  it('returns unknown for invalid commands', () => {
    expect(routeSlashCommand('/something-else')).toBe('unknown');
    expect(routeSlashCommand('')).toBe('unknown');
  });
});

describe('getSlashSuggestions', () => {
  it('returns all canonical commands for empty input', () => {
    const commands = getSlashSuggestions('').map((item) => item.command);
    expect(commands).toEqual(['/level-2', '/level-1', '/dungeon', '/help']);
  });

  it('filters by canonical prefix', () => {
    const commands = getSlashSuggestions('/lev').map((item) => item.command);
    expect(commands).toEqual(['/level-2', '/level-1']);
  });

  it('filters by alias prefix and keeps canonical result', () => {
    const commands = getSlashSuggestions('/word').map((item) => item.command);
    expect(commands).toEqual(['/level-2']);
  });

  it('returns no suggestions for unknown prefix', () => {
    expect(getSlashSuggestions('/does-not-exist')).toEqual([]);
  });
});
