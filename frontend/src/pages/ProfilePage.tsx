import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { getMe, getPostsByUser, logout as apiLogout, type Post, type User } from '../lib/api';

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

function initials(u: User) {
  const a = u.username?.charAt(0)?.toUpperCase();
  return a || 'U';
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const token = localStorage.getItem('accessToken') || '';
  const [me, setMe] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const displayName = useMemo(() => {
    if (!me) return '';
    const parts = [me.firstName, me.lastName].filter(Boolean);
    return parts.length ? String(parts.join(' ')) : me.username;
  }, [me]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) return;
      setLoading(true);
      setError('');
      try {
        const meData = await getMe();
        if (cancelled) return;
        setMe(meData);
        const postsData = await getPostsByUser(meData.id, 1, pageSize);
        if (cancelled) return;
        setPosts(postsData.posts);
        setTotal(postsData.total);
        setPage(1);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Ошибка загрузки');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function loadMore() {
    if (!me) return;
    if (loadingMore) return;
    if (posts.length >= total) return;
    const next = page + 1;
    setLoadingMore(true);
    setError('');
    try {
      const data = await getPostsByUser(me.id, next, pageSize);
      setPosts((prev) => [...prev, ...data.posts]);
      setTotal(data.total);
      setPage(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoadingMore(false);
    }
  }

  function onLogout() {
    const refreshToken = localStorage.getItem('refreshToken') || '';
    if (refreshToken) {
      void apiLogout(refreshToken).catch(() => undefined);
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    navigate('/');
  }

  if (!token) return <Navigate to="/" replace />;

  return (
    <div className="post-page-shell">
      <div className="post-page-container">
        <div className="post-page-topbar">
          <Link to="/" className="post-back-link">На главную</Link>
          <Link to="/posts" className="post-back-link">Все статьи</Link>
        </div>
        {loading ? <div className="post-loading">Загрузка...</div> : error ? (
          <div className="post-error">
            <div>Не удалось загрузить профиль.</div>
            <div className="post-error-sub">{error}</div>
          </div>
        ) : !me ? <div className="post-loading">Профиль недоступен.</div> : (
          <>
            <div className="profile-card">
              <div className="profile-header">
                {me.avatar ? <img className="profile-avatar" src={me.avatar} alt={me.username} /> : <div className="profile-avatar-fallback">{initials(me)}</div>}
                <div className="profile-meta">
                  <div className="profile-name">{displayName}</div>
                  <div className="profile-sub">
                    <span>{me.email}</span>
                    <span className="profile-dot">•</span>
                    <span>{me.role}</span>
                    <span className="profile-dot">•</span>
                    <span>с {formatDate(me.createdAt)}</span>
                  </div>
                  {me.bio ? <div className="profile-bio">{me.bio}</div> : null}
                </div>
                <div className="profile-actions">
                  <Link to="/posts/new" className="btn-load-more" style={{ textDecoration: 'none', display: 'inline-block' }}>
                    Создать пост
                  </Link>
                  <button className="post-action-btn danger" type="button" onClick={onLogout}>
                    Выйти
                  </button>
                </div>
              </div>
            </div>
            <div className="profile-posts-title">Мои статьи</div>
            {posts.length === 0 ? (
              <div className="post-loading">
                У вас пока нет статей. <Link to="/posts/new">Создать первую</Link>
              </div>
            ) : (
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
                              <div className="author-avatar">{me.username?.charAt(0)?.toUpperCase() || 'U'}</div>
                              <span>{me.username}</span>
                            </div>
                            <span>•</span>
                            <span className="post-date">{date}</span>
                          </div>
                          <h3 className="post-title">{post.title}</h3>
                          <p className="post-excerpt">{excerpt}</p>
                          <div className="post-footer">
                            <span className="post-date">{date}</span>
                            <span className="read-more">Открыть</span>
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
          </>
        )}
      </div>
    </div>
  );
}
