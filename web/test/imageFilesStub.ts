// Jest cannot run import.meta.glob, so tests use this stub in place of web/src/data/imageFiles.ts.
export const imageUrl = (file: string) => `/images/${file}`;
