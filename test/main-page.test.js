const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const expectId = (id) => {
  const pattern = new RegExp(`id=["']${id}["']`);
  assert.match(html, pattern, `Expected element with id="${id}"`);
};

const expectClass = (className) => {
  const pattern = new RegExp(`class=["'][^"']*${className}[^"']*["']`);
  assert.match(html, pattern, `Expected element with class "${className}"`);
};

test('main page keeps critical structure', () => {
  expectId('feed-container');
  expectId('feed');
  expectId('pull-spacer');
  expectId('pull-indicator');
  expectId('load-older-footer');
  expectId('date-range');
  expectId('following-modal');
  expectId('following-trigger');
  expectId('accounts-list');
  expectId('actions-menu');
  expectId('actions-trigger');
  expectId('actions-popover');
  expectId('status');
  expectClass('app-logo');
  expectClass('post');
});
