# Agrocer New World Chrome extension

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select this `companion/extension` directory.
4. Keep the extension enabled, open Agrocer, and prepare a trolley.

The extension runs only on Agrocer's documented origins and `newworld.co.nz`. It receives a batch
only after the user presses the Agrocer send button. It never enters checkout or payment screens.

The live New World Add/quantity flow remains fail-closed: any unverified operation returns an error
instead of claiming that an item was added.

Version 0.1.5 waits up to 30 seconds for New World's client-rendered product cards, supports nested
card layouts and either New World hostname, reads lazy-loaded image URLs,
accepts only `/shop/product/…` search results, and verifies the opened page's product
heading before clicking New World's attributed or plain-text **Add** control, and reads the visible
quantity stepper. Search/category links
such as “View all Milk” are deliberately rejected. Reload the unpacked extension after updating.

Product-page identity matching recognises headings outside `h1`, normalises joined size text such
as `Milk2l`, and ignores size tokens only for the identity comparison. A different product name is
still rejected before **Add** can be clicked.
