import assert from 'node:assert/strict';
import { test } from 'node:test';
import { initialRecruitmentConfig, parseSettingsSubmission } from '../src/lib/recruitment-config.ts';

function form(intent, content = JSON.stringify(initialRecruitmentConfig), revision = '7') {
  const data = new FormData();
  data.set('intent', intent);
  if (content !== null) data.set('content', content);
  if (revision !== null) data.set('revision', revision);
  return data;
}

test('unpublish does not depend on an invalid or missing unsaved draft', () => {
  for (const raw of [null, '{invalid', JSON.stringify({ ...initialRecruitmentConfig, discordUrl: 'invalid' })]) {
    const parsed = parseSettingsSubmission(form('unpublish', raw));
    assert.equal(parsed.success, true);
    assert.equal(parsed.content, null);
    assert.equal(parsed.revision, 7);
  }
});

test('draft and publish reject invalid documents but accept confirmed rules', () => {
  for (const intent of ['draft', 'publish']) {
    for (const raw of [null, '{invalid', JSON.stringify({ ...initialRecruitmentConfig, discordUrl: 'javascript:alert(1)' })]) {
      assert.equal(parseSettingsSubmission(form(intent, raw)).success, false);
    }
    assert.equal(parseSettingsSubmission(form(intent)).success, true);
  }
});

test('all actions reject missing, fractional, negative or out-of-range revisions', () => {
  for (const intent of ['draft', 'publish', 'unpublish']) {
    for (const revision of [null, '', ' ', '-1', '1.5', '1e2', '2147483648', 'NaN']) {
      assert.equal(parseSettingsSubmission(form(intent, null, revision)).success, false);
    }
  }
  assert.equal(parseSettingsSubmission(form('invented')).success, false);
});
