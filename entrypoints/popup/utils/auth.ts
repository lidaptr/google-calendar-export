export async function getAuthToken(): Promise<string> {
  const response = await chrome.runtime.sendMessage({ type: 'GET_AUTH_TOKEN' });
  if (response?.error) {
    throw new Error(response.error);
  }
  return response.token as string;
}

export async function signOut(): Promise<void> {
  await chrome.runtime.sendMessage({ type: 'SIGN_OUT' });
}
