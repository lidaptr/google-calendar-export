export default defineBackground(() => {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'GET_AUTH_TOKEN') {
      chrome.identity.getAuthToken({ interactive: true }, (token) => {
        if (chrome.runtime.lastError || !token) {
          sendResponse({ error: chrome.runtime.lastError?.message ?? 'Failed to get token' });
          return;
        }
        chrome.storage.local.set({ auth_token: token }, () => {
          sendResponse({ token });
        });
      });
      // Return true to keep the message channel open for the async sendResponse
      return true;
    }

    if (message.type === 'SIGN_OUT') {
      chrome.storage.local.get('auth_token', (result) => {
        const token: string | undefined = result['auth_token'];
        const finish = () => {
          chrome.storage.local.clear(() => {
            sendResponse({ success: true });
          });
        };
        if (token) {
          chrome.identity.removeCachedAuthToken({ token }, finish);
        } else {
          finish();
        }
      });
      return true;
    }
  });
});
