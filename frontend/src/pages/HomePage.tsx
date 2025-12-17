import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCommentsTotal, getPosts, getUsersTotal, login, logout, register, type Post } from '../lib/api';
import aboutImg from '../assets/about.png';
import { ruPlural } from '../lib/ruPlural';

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

function getAuthorInitial(post: Post) {
  const ch = post.user?.username?.charAt(0)?.toUpperCase();
  return ch || 'U';
}

type ModalType = 'login' | 'register' | null;

export default function HomePage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const pageSize = 9;
  const [posts, setPosts] = useState<Post[]>([]);
  const [totalPosts, setTotalPosts] = useState<number>(0);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [totalComments, setTotalComments] = useState<number>(0);
  const [loadingPosts, setLoadingPosts] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [modal, setModal] = useState<ModalType>(null);
  const [authToken, setAuthToken] = useState<string>(() => localStorage.getItem('accessToken') || '');

  const canLoadMore = useMemo(() => posts.length < totalPosts, [posts.length, totalPosts]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingPosts(true);
        const data = await getPosts(1, pageSize);
        if (cancelled) return;
        setPosts(data.posts);
        setTotalPosts(data.total);
      } finally {
        if (!cancelled) setLoadingPosts(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const total = await getUsersTotal();
        if (!cancelled) setTotalUsers(total);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const total = await getCommentsTotal();
        if (!cancelled) setTotalComments(total);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function loadMore() {
    if (loadingMore || !canLoadMore) return;
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const data = await getPosts(nextPage, pageSize);
      setPosts((prev) => [...prev, ...data.posts]);
      setTotalPosts(data.total);
      setPage(nextPage);
    } finally {
      setLoadingMore(false);
    }
  }

  function scrollToId(id: string) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function onLogout() {
    const refreshToken = localStorage.getItem('refreshToken') || '';
    if (refreshToken) {
      void logout(refreshToken).catch(() => undefined);
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setAuthToken('');
    alert('Вы вышли из системы');
  }

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;
    const data = await login({ email, password });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setAuthToken(data.accessToken);
    setModal(null);
    alert('Вы успешно вошли!');
  }

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const username = (form.elements.namedItem('username') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;
    const firstName = (form.elements.namedItem('firstName') as HTMLInputElement).value || null;
    const lastName = (form.elements.namedItem('lastName') as HTMLInputElement).value || null;
    const data = await register({ email, username, password, firstName, lastName });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setAuthToken(data.accessToken);
    setModal(null);
    alert('Регистрация успешна!');
  }

  return (
    <>
      <nav className="navbar">
        <div className="nav-container">
          <div className="logo">
            <span className="logo-text">Блог о путешествиях</span>
          </div>
          <div className="nav-links">
            <button className="nav-link active" onClick={() => scrollToId('home')} type="button">Главная</button>
            <Link className="nav-link" to="/posts">Статьи</Link>
            <button className="nav-link" onClick={() => scrollToId('about')} type="button">О нас</button>
            {authToken ? (
              <>
                <button className="btn-login" type="button" onClick={onLogout}>Выйти</button>
                <Link className="btn-register" to="/profile">Профиль</Link>
              </>
            ) : (
              <>
                <button className="btn-login" type="button" onClick={() => setModal('login')}>Войти</button>
                <button className="btn-register" type="button" onClick={() => setModal('register')}>Регистрация</button>
              </>
            )}
          </div>
        </div>
      </nav>
      <section className="hero" id="home">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <h1 className="hero-title">Открой мир<br />путешествий</h1>
          <p className="hero-subtitle">Исследуй удивительные места, делись впечатлениями и вдохновляй других на новые приключения</p>
          <div className="hero-buttons">
            <button className="btn-primary" type="button" onClick={() => scrollToId('posts')}>Исследовать</button>
            <button className="btn-secondary" type="button" onClick={() => { if (authToken) navigate('/posts/new'); else setModal('login'); }}>Поделиться историей</button>
          </div>
        </div>
      </section>
      <section className="featured-posts" id="posts">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Популярные статьи</h2>
            <p className="section-subtitle">Откройте для себя самые интересные истории путешественников</p>
          </div>
          <div className="posts-grid">
            {loadingPosts ? <div className="loading">Загрузка статей...</div> : posts.length === 0 ? <div className="loading">Статей пока нет. Будьте первым, кто поделится историей!</div> : posts.map((post) => {
              const date = formatDate(post.createdAt);
              const excerpt = post.excerpt || `${post.content.slice(0, 150)}...`;
              const initial = getAuthorInitial(post);
              return (
                <Link to={`/posts/${post.id}`} className="post-card" key={post.id} style={{ textDecoration: 'none' }}>
                  <div className="post-image">{post.imageUrl ? <img src={post.imageUrl} alt={post.title} /> : '🌍'}</div>
                  <div className="post-content">
                    <div className="post-meta">
                      <div className="post-author">
                        <div className="author-avatar">{initial}</div>
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
          {canLoadMore ? <div className="load-more-container"><button className="btn-load-more" type="button" onClick={loadMore} disabled={loadingMore}>{loadingMore ? 'Загрузка...' : 'Загрузить еще'}</button></div> : null}
        </div>
      </section>
      <section className="stats">
        <div className="container">
          <div className="stats-grid">
            <div className="stat-item"><div className="stat-number">{totalPosts}</div><div className="stat-label">{ruPlural(totalPosts, 'Статья', 'Статьи', 'Статей')}</div></div>
            <div className="stat-item"><div className="stat-number">{totalUsers}</div><div className="stat-label">{ruPlural(totalUsers, 'Путешественник', 'Путешественника', 'Путешественников')}</div></div>
            <div className="stat-item"><div className="stat-number">{totalComments}</div><div className="stat-label">{ruPlural(totalComments, 'Комментарий', 'Комментария', 'Комментариев')}</div></div>
          </div>
        </div>
      </section>
      <section className="about" id="about">
        <div className="container">
          <div className="about-content">
            <div className="about-text">
              <h2 className="section-title">О нашем блоге</h2>
              <p>Мы создали это пространство для всех, кто любит путешествовать и делиться своими впечатлениями. Здесь вы найдете вдохновляющие истории, полезные советы и незабываемые моменты из разных уголков мира.</p>
              <p>Присоединяйтесь к нашему сообществу путешественников и откройте для себя новые горизонты!</p>
              {!authToken ? <button className="btn-primary" type="button" onClick={() => setModal('register')}>Присоединиться</button> : null}
            </div>
            <div className="about-image">
              <div className="about-illustration"><img src={aboutImg} alt="О нашем блоге" /></div>
            </div>
          </div>
        </div>
      </section>
      <div className="modal" style={{ display: modal === 'login' ? 'block' : 'none' }} onClick={() => setModal(null)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <span className="modal-close" onClick={() => setModal(null)}>&times;</span>
          <h2>Вход</h2>
          <form onSubmit={handleLogin}>
            <input name="email" type="email" placeholder="Email" required />
            <input name="password" type="password" placeholder="Password" required />
            <button type="submit" className="btn-primary">Войти</button>
          </form>
        </div>
      </div>
      <div className="modal" style={{ display: modal === 'register' ? 'block' : 'none' }} onClick={() => setModal(null)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <span className="modal-close" onClick={() => setModal(null)}>&times;</span>
          <h2>Регистрация</h2>
          <form onSubmit={handleRegister}>
            <input name="email" type="email" placeholder="Email" required />
            <input name="username" type="text" placeholder="Username" required />
            <input name="password" type="password" placeholder="Password" required minLength={6} />
            <input name="firstName" type="text" placeholder="First Name (optional)" />
            <input name="lastName" type="text" placeholder="Last Name (optional)" />
            <button type="submit" className="btn-primary">Зарегистрироваться</button>
          </form>
        </div>
      </div>
    </>
  );
}
