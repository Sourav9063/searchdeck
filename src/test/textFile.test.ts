import assert from 'node:assert/strict';
import test from 'node:test';
import { decodeText, languageIdForUri } from '../textFile';

test('decodeText accepts UTF-8 text', () => {
  assert.equal(decodeText(new TextEncoder().encode('hello\nworld')), 'hello\nworld');
});

test('decodeText rejects binary data', () => {
  assert.equal(decodeText(Uint8Array.from([1, 0, 2])), undefined);
});

test('languageIdForUri recognizes Dockerfiles without opening a document', () => {
  assert.equal(languageIdForUri({ path: '/workspace/Dockerfile' }), 'dockerfile');
  assert.equal(languageIdForUri({ path: '/workspace/Dockerfile.dev' }), 'dockerfile');
});
