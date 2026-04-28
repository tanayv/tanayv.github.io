import type { WindowId } from "./windows";

export type AppRoute = {
  focused: WindowId;
  rollId?: string | undefined;
  postSlug?: string | undefined;
};

export function pathFromRoute(r: AppRoute): string {
  if (r.focused === "about") return "/";
  if (r.focused === "photography") {
    return r.rollId ? `/photography/${r.rollId}/` : "/photography/";
  }
  if (r.focused === "writing") {
    return r.postSlug ? `/writing/${r.postSlug}/` : "/writing/";
  }
  return "/";
}

export function routeFromPath(path: string): AppRoute {
  const p = path.replace(/\/+$/g, "") || "/";
  if (p === "/" || p === "/about") return { focused: "about" };
  if (p === "/photography") return { focused: "photography" };
  const photoMatch = p.match(/^\/photography\/([^/]+)$/);
  if (photoMatch) return { focused: "photography", rollId: photoMatch[1] };
  if (p === "/writing") return { focused: "writing" };
  const writeMatch = p.match(/^\/writing\/([^/]+)$/);
  if (writeMatch) return { focused: "writing", postSlug: writeMatch[1] };
  return { focused: "about" };
}
