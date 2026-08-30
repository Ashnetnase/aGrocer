const SOURCE = 'agrocer-new-world-extension';

function reply(type, detail = {}) {
  window.postMessage({ source: SOURCE, type, ...detail }, window.location.origin);
}

window.addEventListener('message', (event) => {
  if (event.source !== window || event.origin !== window.location.origin) return;
  if (event.data?.source !== 'agrocer-web') return;
  if (event.data.type === 'AGROCER_NEW_WORLD_PING') {
    reply('AGROCER_NEW_WORLD_READY');
    return;
  }
  if (event.data.type === 'AGROCER_NEW_WORLD_SEARCH') {
    chrome.runtime.sendMessage({
      type: 'search-products',
      shoppingItemId: event.data.shoppingItemId,
      query: event.data.query,
    }, (response) => {
      if (chrome.runtime.lastError || !response?.accepted) reply('AGROCER_NEW_WORLD_ERROR', { message: chrome.runtime.lastError?.message || response?.message || 'Search was rejected.' });
    });
    return;
  }
  if (event.data.type !== 'AGROCER_NEW_WORLD_BATCH' || !Array.isArray(event.data.items)) return;
  chrome.runtime.sendMessage({ type: 'queue-batch', items: event.data.items }, (response) => {
    if (chrome.runtime.lastError || !response?.accepted) {
      reply('AGROCER_NEW_WORLD_ERROR', { message: chrome.runtime.lastError?.message || response?.message || 'Extension rejected the trolley.' });
      return;
    }
    reply('AGROCER_NEW_WORLD_ACCEPTED', { count: event.data.items.length });
  });
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'job-results') reply('AGROCER_NEW_WORLD_RESULTS', { results: message.results });
  if (message?.type === 'search-results') reply('AGROCER_NEW_WORLD_SEARCH_RESULTS', message);
});

reply('AGROCER_NEW_WORLD_READY');
