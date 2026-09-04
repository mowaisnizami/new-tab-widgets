import { access, readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const manifest = JSON.parse(await readFile('manifest.json', 'utf8'));
assert.equal(manifest.manifest_version, 3, 'extension must use Manifest V3');
assert.equal(manifest.chrome_url_overrides.newtab, 'newtab.html');
assert.deepEqual(manifest.permissions, ['storage'], 'request only the storage permission');
assert.match(manifest.version, /^\d+\.\d+\.\d+$/);

const required = [
  manifest.chrome_url_overrides.newtab,
  'newtab.js',
  'styles.css',
  'lib/bootstrap.min.css',
  'lib/bootstrap.bundle.min.js',
  ...Object.values(manifest.icons),
];
await Promise.all(required.map((file) => access(file)));

const html = await readFile('newtab.html', 'utf8');
for (const asset of ['styles.css', 'newtab.js', 'lib/bootstrap.min.css', 'lib/bootstrap.bundle.min.js']) {
  assert.ok(html.includes(asset), `${asset} must be referenced by newtab.html`);
}
assert.ok(
  !/<(?:script|link)[^>]+(?:src|href)=["']https?:\/\//i.test(html),
  'the new-tab page must not load remote scripts or styles',
);
console.log(`Extension ${manifest.version}: manifest and ${required.length} packaged assets verified.`);
