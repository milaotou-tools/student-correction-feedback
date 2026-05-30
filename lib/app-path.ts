export const APP_BASE_PATH = "/student-correction-feedback";

export function withAppBasePath(path: string) {
  if (!path.startsWith("/")) {
    return path;
  }

  if (path.startsWith(APP_BASE_PATH)) {
    return path;
  }

  return `${APP_BASE_PATH}${path}`;
}
