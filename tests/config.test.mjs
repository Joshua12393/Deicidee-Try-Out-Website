import assert from 'node:assert/strict';
import { test } from 'node:test';
import { defaultRecruitmentConfig, recruitmentConfigSchema } from '../src/lib/recruitment-config.ts';

test('empty configuration is safe and no mode starts approved', () => {
  assert.ok(recruitmentConfigSchema.safeParse(defaultRecruitmentConfig).success);
  assert.ok(Object.values(defaultRecruitmentConfig.modes).every(mode => !mode.approved));
});
test('links reject executable protocols, spoofed domains, credentials, and unknown keys', () => {
  for (const discordUrl of ['javascript:alert(1)', 'http://discord.gg/example', 'https://discord.gg.evil.test/x', 'https://user:pass@discord.gg/example', 'https://discord.gg:444/example']) {
    assert.equal(recruitmentConfigSchema.safeParse({ ...defaultRecruitmentConfig, discordUrl }).success, false);
  }
  assert.equal(recruitmentConfigSchema.safeParse({ ...defaultRecruitmentConfig, role: 'admin' }).success, false);
  assert.ok(recruitmentConfigSchema.safeParse({ ...defaultRecruitmentConfig, discordUrl: 'https://discord.gg/example', facebookUrl: 'https://www.facebook.com/groups/example' }).success);
});
test('mode approval needs rules; maps normalize whitespace and reject duplicates', () => {
  const config = structuredClone(defaultRecruitmentConfig);
  config.modes.tdm.approved = true;
  assert.equal(recruitmentConfigSchema.safeParse(config).success, false);
  config.modes.tdm.rules = 'Synthetic rule';
  config.modes.tdm.maps = [' Test map ', ''];
  assert.deepEqual(recruitmentConfigSchema.parse(config).modes.tdm.maps, ['Test map']);
  config.modes.tdm.maps = ['Test map', 'test map'];
  assert.equal(recruitmentConfigSchema.safeParse(config).success, false);
});
