import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { getSupabaseConfig, isSupabaseConfigured } from '../src/lib/supabase/config.ts';

const names = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'];
const original = names.map(name => process.env[name]);
after(() => names.forEach((name, i) => {
  if (original[i] === undefined) delete process.env[name];
  else process.env[name] = original[i];
}));
function configure(key, url = 'https://example.supabase.co') {
  process.env.NEXT_PUBLIC_SUPABASE_URL = url;
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = key;
}
const jwt = role => ['header', Buffer.from(JSON.stringify({ role })).toString('base64url'), 'signature'].join('.');

test('public configuration accepts publishable and legacy anon keys', () => {
  for (const key of ['sb_publishable_test-key_123', jwt('anon')]) {
    configure(key);
    assert.equal(isSupabaseConfigured(), true);
    assert.equal(getSupabaseConfig().publishableKey, key);
  }
});

test('public configuration rejects privileged and malformed keys', () => {
  for (const key of ['sb_secret_private', jwt('service_role'), jwt('authenticated'), 'random-key', 'a.b.c', '']) {
    configure(key);
    assert.equal(isSupabaseConfigured(), false);
    assert.throws(getSupabaseConfig);
  }
});

test('remote URLs require HTTPS; malformed and credential-bearing URLs fail safely', () => {
  for (const url of ['invalid', 'http://example.supabase.co', 'https://user:password@example.supabase.co', 'ftp://example.test', 'https://example.test/?secret=x']) {
    configure('sb_publishable_test', url);
    assert.equal(isSupabaseConfigured(), false);
  }
  for (const url of ['http://127.0.0.1:54321', 'http://localhost:54321', 'http://[::1]:54321']) {
    configure('sb_publishable_test', url);
    assert.equal(isSupabaseConfigured(), true);
  }
});
