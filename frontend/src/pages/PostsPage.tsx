import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPosts, type Post } from '../lib/api';

function formatDate(dateIso: string) {
  try {
    return new Date(dateIso).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateIso;
  }
}

export default function PostsPage() {
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const [posts, setPosts] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const data = await getPosts(1, pageSize);
        if (cancelled) return;
        setPosts(data.posts);
        setTotal(data.total);
        setPage(1);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function loadMore() {
    if (loadingMore) return;
    if (posts.length >= total) return;
    const next = page + 1;
    setLoadingMore(true);
    try {
      const data = await getPosts(next, pageSize);
      setPosts((prev) => [...prev, ...data.posts]);
      setTotal(data.total);
      setPage(next);
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="post-page-shell">
      <div className="post-page-container">
        <div className="post-page-topbar">
          <Link to="/" className="post-back-link">На главную</Link>
          <div className="post-page-title">Все статьи</div>
        </div>
        {loading ? <div className="post-loading">Загрузка...</div> : posts.length === 0 ? <div className="post-loading">Постов пока нет.</div> : (
          <>
            <div className="posts-grid" style={{ marginBottom: '2rem' }}>
              {posts.map((post) => {
                const date = formatDate(post.createdAt);
                const excerpt = post.excerpt || `${post.content.slice(0, 150)}...`;
                return (
                  <Link to={`/posts/${post.id}`} className="post-card" key={post.id} style={{ textDecoration: 'none' }}>
                    <div className="post-image">{post.imageUrl ? <img src={post.imageUrl} alt={post.title} /> : '🌍'}</div>
                    <div className="post-content">
                      <div className="post-meta">
                        <div className="post-author">
                          <div className="author-avatar">{post.user?.username?.charAt(0)?.toUpperCase() || 'U'}</div>
                          <span>{post.user?.username || 'Unknown'}</span>
                        </div>
                        <span>•</span>
                        <span className="post-date">{date}</span>
                      </div>
                      <h3 className="post-title">{post.title}</h3>
                      <p className="post-excerpt">{excerpt}</p>
                      <div className="post-footer">
                        <span className="post-date">{date}</span>
                        <span className="read-more">Читать</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
            {posts.length < total ? (
              <div className="load-more-container" style={{ paddingBottom: '2rem' }}>
                <button className="btn-load-more" type="button" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? 'Загрузка...' : 'Загрузить еще'}
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
