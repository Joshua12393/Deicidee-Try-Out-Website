import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applicationSchema, validateApplication } from '../src/lib/application.ts';
import { initialRecruitmentConfig } from '../src/lib/recruitment-config.ts';
const config = structuredClone(initialRecruitmentConfig);
config.modes.zm_hmx.maps = ['Synthetic ZM'];
config.modes.escape.maps = ['Synthetic Escape'];
const input = { ign: ' Test IGN ', first_name: '', last_name: '', rank: '', previous_clan: 'None', facebook_url: '', discord_name: 'test-only', reason: 'Synthetic test', mode: 'tdm', selected_map: '', consent: true };
test('normalizes approved required fields and preserves optional None', () => {
  const result = validateApplication(input, config);
  assert.equal(result.success, true);
  assert.equal(result.data.ign, 'Test IGN');
  assert.equal(result.data.previous_clan, 'None');
});
test('one approved mode and exact map are required', () => {
  for (const extra of [{ mode: ['tdm','escape'] }, { mode: 'tdm,escape' }, { mode: '' }, { selected_map: 'unexpected' }, { mode:'zm_hmx', selected_map:'' }, { mode:'escape', selected_map:'Synthetic ZM' }]) assert.equal(validateApplication({ ...input, ...extra }, config).success, false);
  assert.equal(validateApplication({ ...input, mode:'zm_hmx', selected_map:'Synthetic ZM' }, config).success,true);
  const unavailable = structuredClone(config); unavailable.modes.tdm.approved=false;
  assert.equal(validateApplication(input,unavailable).success,false);
});
test('rejects missing consent, blank required fields, excess data and privileged fields', () => {
  for (const extra of [{ consent:false }, { consent:'true' }, { ign:' ' }, { discord_name:'' }, { reason:'' }, { reason:'a'.repeat(2001) }, { status:'passed' }, { decided_by:'intruder' }]) assert.equal(applicationSchema.safeParse({ ...input, ...extra }).success,false);
});
test('Facebook URLs cannot use script schemes, credentials or lookalike domains', () => {
  for (const facebook_url of ['javascript:alert(1)','https://facebook.com.evil.test/a','https://secret@facebook.com/a','http://facebook.com/a','https://facebook.com:444/a']) assert.equal(applicationSchema.safeParse({ ...input, facebook_url }).success,false);
  assert.equal(applicationSchema.safeParse({ ...input, facebook_url:'https://www.facebook.com/test' }).success,true);
});
