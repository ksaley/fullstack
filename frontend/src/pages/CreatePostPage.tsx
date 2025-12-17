import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPost } from '../lib/api';

function hasToken() {
  return Boolean(localStorage.getItem('accessToken'));
}

export default function CreatePostPage() {
  const navigate = useNavigate();
  const authed = useMemo(() => hasToken(), []);
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<'published' | 'draft'>('published');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!hasToken()) {
      setError('Нужна авторизация: войдите или зарегистрируйтесь на главной странице.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const post = await createPost({
        title: title.trim(),
        content: content.trim(),
        excerpt: excerpt.trim() ? excerpt.trim() : null,
        imageUrl: imageUrl.trim() ? imageUrl.trim() : null,
        status,
      });
      navigate(`/posts/${post.id}`);
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : 'Ошибка создания поста');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="post-page-shell">
      <div className="post-page-container">
        <div className="post-page-topbar">
          <Link to="/" className="post-back-link">На главную</Link>
          <Link to="/posts" className="post-back-link">Все статьи</Link>
        </div>
        <div className="create-card">
          <h1 className="create-title">Создать пост</h1>
          <p className="create-subtitle">Заполните форму и опубликуйте историю путешествия.</p>
          {!authed ? (
            <div className="create-warning">
              Для создания поста нужна авторизация. Вернитесь на <Link to="/">главную</Link> и войдите/зарегистрируйтесь.
            </div>
          ) : null}
          {error ? (
            <div className="create-error">
              <div>Ошибка:</div>
              <div className="create-error-sub">{error}</div>
            </div>
          ) : null}
          <form className="create-form" onSubmit={onSubmit}>
            <label className="create-label">
              Заголовок
              <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} />
            </label>
            <div className="create-row">
              <label className="create-label">
                Статус
                <select value={status} onChange={(e) => setStatus(e.target.value as 'published' | 'draft')}>
                  <option value="published">Опубликован</option>
                  <option value="draft">Черновик</option>
                </select>
              </label>
              <label className="create-label">
                Image URL (опционально)
                <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
              </label>
            </div>
            <label className="create-label">
              Краткое описание (опционально)
              <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={3} />
            </label>
            <label className="create-label">
              Текст поста
              <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={10} required />
            </label>
            <div className="create-actions">
              <button className="btn-load-more" type="submit" disabled={submitting || !title.trim() || !content.trim()}>
                {submitting ? 'Создаём...' : 'Создать'}
              </button>
              <Link to="/posts" className="create-secondary">Отмена</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
