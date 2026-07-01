import type { Spreadsheet } from '../types';

interface GoogleDriveFile {
  id: string;
  name: string;
}

interface GoogleDriveFilesResponse {
  files?: GoogleDriveFile[];
}

export async function listSpreadsheets(token: string): Promise<Spreadsheet[]> {
  const response = await fetch(
    'https://www.googleapis.com/drive/v3/files?q=mimeType%3D%27application%2Fvnd.google-apps.spreadsheet%27+and+trashed%3Dfalse&fields=files(id%2Cname)&orderBy=modifiedTime+desc&pageSize=50',
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to list spreadsheets: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as GoogleDriveFilesResponse;

  return (data.files ?? []).map((file) => ({
    id: file.id,
    name: file.name,
  }));
}
