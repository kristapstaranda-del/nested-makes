export const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB
export const MAX_PROJECT_IMAGES = 5;

/** Returns an error string, or null if the file is acceptable. */
export function validateImageFile(file: File): string | null {
  if (!file.type.startsWith('image/')) {
    return 'Please choose an image file (JPG, PNG, etc.).';
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return 'That image is a bit large — try one under 2 MB.';
  }
  return null;
}

/**
 * Returns the value if it looks like a valid base64 image data URL,
 * otherwise returns undefined. Protects against corrupted localStorage values.
 */
export function sanitizeCoverImage(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  if (!value.startsWith('data:image/')) return undefined;
  if (value.length < 50) return undefined; // implausibly short — not a real image
  return value;
}

/** Reads a File into a base64 data URL string. */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read the file.'));
    reader.readAsDataURL(file);
  });
}
