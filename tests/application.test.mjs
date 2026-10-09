import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applicationSchema, validateApplication, readApplicationForm, preserveApplicationForm } from '../src/lib/application.ts';
import { initialRecruitmentConfig } from '../src/lib/recruitment-config.ts';
const config = structuredClone(initialRecruitmentConfig);
config.modes.zm_hmx.maps = ['Synthetic ZM'];
config.modes.escape.maps = ['Synthetic Escape'];
const input = { ign: ' Test IGN ', first_name: '', last_name: '', rank: '', previous_clan: 'None', facebook_url: '', discord_name: 'test-only', reason: 'Synthetic test', mode: 'tdm', selected_map: '', consent: true };
const formData = () => {
  const form = new FormData();
  for (const [name, value] of Object.entries(input)) form.set(name, name === 'consent' ? 'on' : value);
  form.set('submission_key', '66666666-6666-4666-8666-666666666666');
  form.set('revision', '5');
  return form;
};

test('actual FormData rejects repeated modes and ignores privileged fields', () => {
  const form = formData();
  form.set('status', 'passed');
  assert.equal(validateApplication(readApplicationForm(form), config).success, true);
  assert.equal('status' in readApplicationForm(form), false);
  form.append('mode', 'escape');
  assert.equal(validateApplication(readApplicationForm(form), config).success, false);
  form.set('mode', 'tdm'); form.append('consent', 'on');
  assert.equal(validateApplication(readApplicationForm(form), config).success, false);
});

test('recoverable responses retain original details, consent, key and acknowledgement revision', () => {
  const form = formData();
  const restored = preserveApplicationForm(form);
  assert.equal(restored.values.ign, input.ign);
  assert.equal(restored.values.reason, input.reason);
  assert.equal(restored.consent, true);
  assert.equal(restored.submissionKey, form.get('submission_key'));
  assert.equal(restored.revision, 5);
  form.set('mode', 'invented'); form.set('submission_key', 'invalid'); form.set('revision', '-1');
  const invalid = preserveApplicationForm(form);
  assert.equal(invalid.values.mode, '');
  assert.equal(invalid.submissionKey, undefined);
  assert.equal(invalid.revision, undefined);
});
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
