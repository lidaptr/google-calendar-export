export async function getCachedToken(): Promise<string | null> {
  const result = await chrome.storage.local.get('auth_token');
  return (result['auth_token'] as string) ?? null;
}
