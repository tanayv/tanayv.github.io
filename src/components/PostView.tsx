import type { FC } from "react";
import type { Post } from "../lib/posts";

type Props = {
  post: Post;
  onBack: () => void;
};

const PostView: FC<Props> = ({ post, onBack }) => {
  return (
    <article className="post-card">
      <div className="post-card__topbar">
        <button type="button" className="post-card__back" onClick={onBack}>
          ← back to writing
        </button>
        <p className="post-card__crumb">
          ~/writing/<b>{post.slug}</b>
        </p>
      </div>

      <div className="post-card__paper">
        <div className="post-card__inner">
          <header className="post-card__title-block">
            <h1 className="post-card__title">{post.title}</h1>
            <p className="post-card__tagline">{post.tagline}</p>
          </header>

          <figure className="post-card__cover-fig">
            <img src={post.cover} alt="" />
          </figure>

          <dl className="post-card__meta">
            <dt>type</dt>
            <dd>{post.meta.type}</dd>
            <dt>challenge</dt>
            <dd>{post.meta.challenge}</dd>
            <dt>timeline</dt>
            <dd>{post.meta.timeline}</dd>
            {post.meta.solution ? (
              <>
                <dt>solution</dt>
                <dd>{post.meta.solution}</dd>
              </>
            ) : null}
            {post.meta.awards ? (
              <>
                <dt>awards</dt>
                <dd>
                  <ul className="post-card__list">
                    {post.meta.awards.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                </dd>
              </>
            ) : null}
            {post.meta.links ? (
              <>
                <dt>links</dt>
                <dd>
                  <ul className="post-card__list">
                    {post.meta.links.map((l) => (
                      <li key={l.href}>
                        <a href={l.href} target="_blank" rel="noreferrer">
                          {l.label} →
                        </a>
                      </li>
                    ))}
                  </ul>
                </dd>
              </>
            ) : null}
          </dl>

          <div className="post-card__body">
            {post.body.map((b, i) => {
              if (b.type === "p") {
                return <p key={i} dangerouslySetInnerHTML={{ __html: b.html }} />;
              }
              if (b.type === "img") {
                return (
                  <figure key={i}>
                    <img src={b.src} alt={b.alt} />
                    <figcaption>{b.alt}</figcaption>
                  </figure>
                );
              }
              if (b.type === "more") {
                return (
                  <p key={i} className="post-card__more">
                    <a href={b.href} target="_blank" rel="noreferrer">
                      {b.label ?? "Read more"} →
                    </a>
                  </p>
                );
              }
              return null;
            })}
          </div>

          <footer className="post-card__footer">
            <button type="button" className="post-card__back" onClick={onBack}>
              ← back to writing
            </button>
          </footer>
        </div>
      </div>
    </article>
  );
};

export default PostView;
