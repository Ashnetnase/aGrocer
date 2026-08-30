import assert from 'node:assert/strict';
import path from 'node:path';
import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage();
  await page.setContent(`
    <base href="https://newworld.co.nz/shop/search?pg=1&q=milk&sf=products">
    <main>
      <div class="results-grid">
        <div class="tile-layout-that-can-change">
          <div><a href="/shop/product/5000520_ea_000nw?name=anchor-trim-milk"><img data-src="https://images.example/anchor.jpg" alt="Anchor Trim Milk 1l image 1"></a></div>
          <div><a href="/shop/product/5000520_ea_000nw?name=anchor-trim-milk">Anchor Trim Milk 1l</a></div>
          <span>$3.73 ea</span><button>Add</button>
        </div>
      </div>
    </main>
  `);
  await page.evaluate(() => {
    globalThis.chrome = { runtime: { onMessage: { addListener() {} }, sendMessage() {} } };
  });
  await page.addScriptTag({ path: path.resolve('companion/extension/newworld-trolley.js') });
  const result = await page.evaluate(() => extractProducts('milk'));
  assert.equal(result.status, 'ok');
  assert.equal(result.products.length, 1);
  assert.deepEqual(result.products[0], {
    retailer: 'new-world',
    name: 'Anchor Trim Milk 1l',
    productUrl: 'https://newworld.co.nz/shop/product/5000520_ea_000nw?name=anchor-trim-milk',
    externalProductId: '5000520_ea_000nw',
    availability: 'unknown',
    imageUrl: 'https://images.example/anchor.jpg',
    price: 3.73,
  });
  await page.setContent(`
    <main>
      <h1>Anchor Trim Milk 1l</h1>
      <div id="purchase"><button>Add</button></div>
    </main>
  `);
  await page.evaluate(() => {
    document.querySelector('button').addEventListener('click', () => {
      document.querySelector('#purchase').innerHTML = '<label>Quantity <input aria-label="Quantity" value="1"></label>';
    });
  });
  const addResult = await page.evaluate(() => addCurrent({
    shoppingItemId: 'milk-item', expectedName: 'Anchor Trim Milk 1l', quantity: 1,
  }));
  assert.deepEqual(addResult, {
    shoppingItemId: 'milk-item', status: 'added', requestedQuantity: 1,
    confirmedQuantity: 1, confirmedProductName: 'Anchor Trim Milk 1l',
  });
  console.log('Extension product extraction and verified Add smoke checks passed.');
} finally {
  await browser.close();
}
