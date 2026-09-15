/** Keeps the owning chat selected while inspecting one of its worker or workflow runs. */
export function sidebarSessionId(pathname: string): string {
  const match = /^\/session\/([^/]+)(?:\/|$)/.exec(pathname);
  return match && match[1] !== "new" ? match[1]! : "";
}
