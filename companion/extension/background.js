const JOB_KEY = 'agrocerActiveTrolleyJob';
const SEARCH_KEY = 'agrocerProductSearch';

function isNewWorldUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && (url.hostname === 'newworld.co.nz' || url.hostname.endsWith('.newworld.co.nz'));
  } catch { return false; }
}

function validItem(item) {
  return item && typeof item.shoppingItemId === 'string' && typeof item.expectedName === 'string' &&
    Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 99 && isNewWorldUrl(item.productUrl);
}

async function loadJob() { return (await chrome.storage.session.get(JOB_KEY))[JOB_KEY]; }
async function saveJob(job) { await chrome.storage.session.set({ [JOB_KEY]: job }); }
async function clearJob() { await chrome.storage.session.remove(JOB_KEY); }

async function finish(job) {
  await clearJob();
  if (job.sourceTabId) chrome.tabs.sendMessage(job.sourceTabId, { type: 'job-results', results: job.results }).catch(() => undefined);
}

async function recordResult(job, result) {
  if (!job || job.processingIndex !== job.index) return;
  job.results.push(result);
  job.index += 1;
  await saveJob(job);
  await openCurrent(job);
}

async function openCurrent(job) {
  if (job.index >= job.items.length) return finish(job);
  const item = job.items[job.index];
  job.processingIndex = null;
  let tab;
  if (job.newWorldTabId) {
    try { tab = await chrome.tabs.update(job.newWorldTabId, { url: item.productUrl, active: true }); } catch { tab = undefined; }
  }
  if (!tab) tab = await chrome.tabs.create({ url: item.productUrl, active: true });
  job.newWorldTabId = tab.id;
  await saveJob(job);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'search-products') {
    const query = typeof message.query === 'string' ? message.query.trim().slice(0, 100) : '';
    if (!query || typeof message.shoppingItemId !== 'string') { sendResponse({ accepted: false, message: 'Invalid product search.' }); return; }
    const url = `https://www.newworld.co.nz/shop/search?pg=1&q=${encodeURIComponent(query)}&sf=products`;
    chrome.tabs.query({ url: 'https://www.newworld.co.nz/*' }).then(async (tabs) => {
      const existing = tabs.find((tab) => tab.id);
      const tab = existing ?? await chrome.tabs.create({ url: 'about:blank', active: true });
      await chrome.storage.session.set({ [SEARCH_KEY]: { sourceTabId: sender.tab?.id, newWorldTabId: tab.id, shoppingItemId: message.shoppingItemId, query, processing: false } });
      await chrome.tabs.update(tab.id, { url, active: true });
      sendResponse({ accepted: true });
    }).catch((error) => sendResponse({ accepted: false, message: error.message }));
    return true;
  }
  if (message?.type === 'queue-batch') {
    const items = Array.isArray(message.items) ? message.items.filter(validItem) : [];
    if (!items.length || items.length !== message.items.length) { sendResponse({ accepted: false, message: 'Every item needs a valid New World product URL.' }); return; }
    const job = { items, index: 0, results: [], sourceTabId: sender.tab?.id, newWorldTabId: null, processingIndex: null };
    saveJob(job).then(() => openCurrent(job)).then(() => sendResponse({ accepted: true })).catch((error) => sendResponse({ accepted: false, message: error.message }));
    return true;
  }
  if (message?.type === 'item-result') {
    loadJob().then(async (job) => {
      if (!job || sender.tab?.id !== job.newWorldTabId || job.processingIndex !== job.index) return;
      await recordResult(job, message.result);
    });
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status !== 'complete') return;
  chrome.storage.session.get(SEARCH_KEY).then(async (stored) => {
    const search = stored[SEARCH_KEY];
    if (!search || search.newWorldTabId !== tabId || search.processing) return;
    search.processing = true;
    await chrome.storage.session.set({ [SEARCH_KEY]: search });
    let response;
    try { response = await chrome.tabs.sendMessage(tabId, { type: 'extract-products', query: search.query }); }
    catch { response = { status: 'selector-failed', products: [], message: 'New World search page bridge was unavailable.' }; }
    await chrome.storage.session.remove(SEARCH_KEY);
    if (search.sourceTabId) chrome.tabs.sendMessage(search.sourceTabId, {
      type: 'search-results', shoppingItemId: search.shoppingItemId, ...response,
    }).catch(() => undefined);
  });
  loadJob().then(async (job) => {
    if (!job || job.newWorldTabId !== tabId || job.processingIndex === job.index) return;
    const item = job.items[job.index];
    if (!item) return finish(job);
    job.processingIndex = job.index;
    await saveJob(job);
    try { await chrome.tabs.sendMessage(tabId, { type: 'add-current', item }); }
    catch {
      await recordResult(job, { shoppingItemId: item.shoppingItemId, status: 'unknown-error', requestedQuantity: item.quantity, message: 'New World page bridge was unavailable.' });
    }
  });
});
