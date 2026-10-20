import { DOWNLOAD_URL_MS } from '../../data/save';

// File download and the file picker (042: Export save, Export damaged save, Import save), in the browser only.

/** Downloads `text` as a file named `name`. */
export function download(name: string, text: string, type = 'application/json'): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), DOWNLOAD_URL_MS);
}

/** Opens the browser's file picker for a save file; resolves with its text, or null if none was picked. */
export function pickFile(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json,text/plain';
    input.style.display = 'none';
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      input.remove();
      if (!file) return resolve(null);
      file.text().then(resolve, () => resolve(null));
    });
    input.addEventListener('cancel', () => {
      input.remove();
      resolve(null);
    });
    document.body.appendChild(input);
    input.click();
  });
}

/** Two digits: 7 → "07". */
export const pad2 = (n: number): string => String(n).padStart(2, '0');

/** Today as YYYY-MM-DD in the player's own time zone, for file names. */
export function isoDate(now: Date): string {
  const pad = pad2;
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
