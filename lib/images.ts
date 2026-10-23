export const MAX_EDGE = 1600;

/** Read a dropped file, shrink it, and return a data URL the app can send to Gemini. */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn't read that file."));
    reader.onload = () => {
      const src = String(reader.result);
      const image = new Image();
      image.onerror = () => reject(new Error("That file isn't an image."));
      image.onload = () => {
        const scale = Math.min(1, MAX_EDGE / Math.max(image.width, image.height));
        const width = Math.round(image.width * scale);
        const height = Math.round(image.height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        if (!context) {
          resolve(src);
          return;
        }
        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      image.src = src;
    };
    reader.readAsDataURL(file);
  });
}

export function isImage(file: File): boolean {
  return file.type.startsWith("image/");
}
