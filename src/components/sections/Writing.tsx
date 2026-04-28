import { useEffect, useRef, type FC } from "react";
import { POSTS, getPost } from "../../lib/posts";
import PostView from "../PostView";

type Props = {
  postSlug?: string | undefined;
  onOpenPost: (slug: string) => void;
  onClosePost: () => void;
};

const Writing: FC<Props> = ({ postSlug, onOpenPost, onClosePost }) => {
  const post = postSlug ? getPost(postSlug) : undefined;
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  // Reset scroll when toggling between list and post
  useEffect(() => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollTop = 0;
    }
  }, [postSlug]);

  return (
    <div className="writing-shell">
      <div className="writing-scroll" ref={scrollerRef}>
        {post ? (
          <PostView post={post} onBack={onClosePost} />
        ) : (
          <div className="writing">
            <ul className="writing__list" aria-label="Posts">
              {POSTS.map((p) => (
                <li key={p.slug}>
                  <button
                    type="button"
                    className="writing__link"
                    onClick={() => onOpenPost(p.slug)}
                  >
                    <span className="writing__num">{p.num}</span>
                    <span className="writing__body">
                      <span className="writing__title">{p.title}</span>
                      <span className="writing__tagline">{p.tagline}</span>
                    </span>
                    <span className="writing__date">{p.date}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default Writing;
