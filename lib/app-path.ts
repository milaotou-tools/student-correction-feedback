export const APP_BASE_PATH = "";

export function withAppBasePath(path: string) {
  if (!path.startsWith("/")) {
    return path;
  }

  return path;
}
