import { useCallback, useEffect, useRef, useState, type FC } from "react";
import Header from "./Header";
import Taskbar from "./Taskbar";
import Window from "./Window";
import ContactDialog from "./ContactDialog";
import About from "./sections/About";
import Photography from "./sections/Photography";
import Writing from "./sections/Writing";
import { WINDOWS, DEFAULT_FOCUS, type WindowId } from "../lib/windows";
import { pathFromRoute, routeFromPath, type AppRoute } from "../lib/router";

type Props = {
  initialFocus?: WindowId;
  initialRollId?: string;
  initialPostSlug?: string;
};

const Desktop: FC<Props> = ({ initialFocus, initialRollId, initialPostSlug }) => {
  const [focused, setFocused] = useState<WindowId>(initialFocus ?? DEFAULT_FOCUS);
  const [rollId, setRollId] = useState<string | undefined>(initialRollId);
  const [postSlug, setPostSlug] = useState<string | undefined>(initialPostSlug);
  const [contactOpen, setContactOpen] = useState<boolean>(false);

  const lastPushedPath = useRef<string | null>(null);

  const applyRoute = useCallback((r: AppRoute) => {
    setFocused(r.focused);
    setRollId(r.rollId);
    setPostSlug(r.postSlug);
  }, []);

  useEffect(() => {
    const route: AppRoute = {
      focused,
      rollId: focused === "photography" ? rollId : undefined,
      postSlug: focused === "writing" ? postSlug : undefined,
    };
    const path = pathFromRoute(route);
    if (typeof window === "undefined") return;
    if (window.location.pathname.replace(/\/+$/g, "/") === path) {
      lastPushedPath.current = path;
      return;
    }
    if (lastPushedPath.current === path) return;
    window.history.pushState({}, "", path);
    lastPushedPath.current = path;
  }, [focused, rollId, postSlug]);

  useEffect(() => {
    const onPop = () => {
      const r = routeFromPath(window.location.pathname);
      lastPushedPath.current = pathFromRoute(r);
      applyRoute(r);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [applyRoute]);

  const handleFocus = useCallback((id: WindowId) => {
    setFocused((prev) => {
      if (prev === id) return prev;
      // when switching tabs from chrome, drop deep state for non-target sections
      if (id !== "writing") setPostSlug(undefined);
      if (id !== "photography") setRollId(undefined);
      return id;
    });
  }, []);

  return (
    <div className="desktop">
      <Header onContact={() => setContactOpen(true)} />

      <main className="workspace">
        {WINDOWS.map((w) => {
          const isFocused = focused === w.id;
          const Icon = w.icon;
          return (
            <Window
              key={w.id}
              title={w.title.toLowerCase()}
              icon={<Icon />}
              hidden={!isFocused}
            >
              {w.id === "about" && <About />}
              {w.id === "photography" && (
                <Photography
                  rollId={rollId}
                  onRollChange={(id) => setRollId(id)}
                />
              )}
              {w.id === "writing" && (
                <Writing
                  postSlug={postSlug}
                  onOpenPost={(slug) => setPostSlug(slug)}
                  onClosePost={() => setPostSlug(undefined)}
                />
              )}
            </Window>
          );
        })}
      </main>

      <Taskbar focused={focused} onFocus={handleFocus} />

      <ContactDialog open={contactOpen} onClose={() => setContactOpen(false)} />
    </div>
  );
};

export default Desktop;
