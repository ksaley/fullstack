import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { createComment, deletePost, getComments, getMe, getPost, updatePost, type Comment, type Post, type User } from '../lib/api';

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

export default function PostPage() {
  const params = useParams();
  const id = Number(params.id);
  const [post, setPost] = useState<Post | null>(null);
  const [me, setMe] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editExcerpt, setEditExcerpt] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editStatus, setEditStatus] = useState<'published' | 'draft'>('published');
  const [editContent, setEditContent] = useState('');
  const commentsPageSize = 10;
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsTotal, setCommentsTotal] = useState<number>(0);
  const [commentsPage, setCommentsPage] = useState<number>(1);
  const [commentsLoading, setCommentsLoading] = useState<boolean>(false);
  const [commentsLoadingMore, setCommentsLoadingMore] = useState<boolean>(false);
  const [commentText, setCommentText] = useState<string>('');
  const [commentSubmitting, setCommentSubmitting] = useState<boolean>(false);
  const [commentError, setCommentError] = useState<string>('');

  const canEdit = useMemo(() => {
    if (!me || !post) return false;
    return me.role === 'admin' || me.id === post.userId;
  }, [me, post]);

  const canComment = useMemo(() => {
    const token = localStorage.getItem('accessToken') || '';
    return Boolean(token);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError('');
        if (!Number.isFinite(id)) throw new Error('Некорректный ID поста');
        const token = localStorage.getItem('accessToken') || '';
        const [postData, meData] = await Promise.all([
          getPost(id),
          token ? getMe().catch(() => null) : Promise.resolve(null),
        ]);
        if (cancelled) return;
        setPost(postData);
        setMe(meData);
        setEditTitle(postData.title);
        setEditExcerpt(postData.excerpt || '');
        setEditImageUrl(postData.imageUrl || '');
        setEditStatus(postData.status);
        setEditContent(postData.content);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Ошибка загрузки');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!Number.isFinite(id)) return;
      setCommentsLoading(true);
      setCommentError('');
      try {
        const data = await getComments(id, 1, commentsPageSize);
        if (cancelled) return;
        setComments(data.comments);
        setCommentsTotal(data.total);
        setCommentsPage(1);
      } catch (e) {
        if (!cancelled) setCommentError(e instanceof Error ? e.message : 'Ошибка загрузки комментариев');
      } finally {
        if (!cancelled) setCommentsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function loadMoreComments() {
    if (commentsLoadingMore) return;
    if (comments.length >= commentsTotal) return;
    const next = commentsPage + 1;
    setCommentsLoadingMore(true);
    setCommentError('');
    try {
      const data = await getComments(id, next, commentsPageSize);
      setComments((prev) => [...prev, ...data.comments]);
      setCommentsTotal(data.total);
      setCommentsPage(next);
    } catch (e) {
      setCommentError(e instanceof Error ? e.message : 'Ошибка загрузки комментариев');
    } finally {
      setCommentsLoadingMore(false);
    }
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) return;
    if (!canComment) {
      setCommentError('Нужна авторизация, чтобы оставлять комментарии.');
      return;
    }
    setCommentSubmitting(true);
    setCommentError('');
    try {
      await createComment(id, { content: commentText.trim() });
      setCommentText('');
      const data = await getComments(id, 1, commentsPageSize);
      setComments(data.comments);
      setCommentsTotal(data.total);
      setCommentsPage(1);
    } catch (e2) {
      setCommentError(e2 instanceof Error ? e2.message : 'Ошибка отправки комментария');
    } finally {
      setCommentSubmitting(false);
    }
  }

  async function onSave() {
    if (!post) return;
    setSaving(true);
    setError('');
    try {
      const updated = await updatePost(post.id, {
        title: editTitle.trim(),
        excerpt: editExcerpt.trim() ? editExcerpt.trim() : null,
        imageUrl: editImageUrl.trim() ? editImageUrl.trim() : null,
        status: editStatus,
        content: editContent,
      });
      setPost(updated);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!post) return;
    const ok = confirm('Удалить пост? Это действие нельзя отменить.');
    if (!ok) return;
    setDeleting(true);
    setError('');
    try {
      await deletePost(post.id);
      window.location.href = '/posts';
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка удаления');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="post-page-shell">
      <div className="post-page-container">
        <div className="post-page-topbar">
          <Link to="/" className="post-back-link">На главную</Link>
          <Link to="/posts" className="post-back-link">Все статьи</Link>
        </div>
        {loading ? <div className="post-loading">Загрузка...</div> : error ? (
          <div className="post-error">
            <div>Не удалось загрузить пост.</div>
            <div className="post-error-sub">{error}</div>
          </div>
        ) : !post ? <div className="post-loading">Пост не найден.</div> : (
          <article className="post-article">
            {canEdit ? (
              <div className="post-owner-actions">
                <button className="post-action-btn" type="button" onClick={() => setEditing((v) => !v)} disabled={saving || deleting}>
                  {editing ? 'Закрыть редактирование' : 'Редактировать'}
                </button>
                <button className="post-action-btn danger" type="button" onClick={onDelete} disabled={saving || deleting}>
                  {deleting ? 'Удаление...' : 'Удалить'}
                </button>
              </div>
            ) : null}
            {editing ? (
              <div className="post-edit">
                <div className="post-edit-title">Редактирование</div>
                <label className="post-edit-label">
                  Заголовок
                  <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                </label>
                <div className="post-edit-row">
                  <label className="post-edit-label">
                    Статус
                    <select value={editStatus} onChange={(e) => setEditStatus(e.target.value as 'published' | 'draft')}>
                      <option value="published">Опубликован</option>
                      <option value="draft">Черновик</option>
                    </select>
                  </label>
                  <label className="post-edit-label">
                    Image URL
                    <input value={editImageUrl} onChange={(e) => setEditImageUrl(e.target.value)} placeholder="https://..." />
                  </label>
                </div>
                <label className="post-edit-label">
                  Краткое описание
                  <textarea value={editExcerpt} onChange={(e) => setEditExcerpt(e.target.value)} rows={3} />
                </label>
                <label className="post-edit-label">
                  Текст
                  <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={10} />
                </label>
                <div className="post-edit-actions">
                  <button className="btn-load-more" type="button" onClick={onSave} disabled={saving}>
                    {saving ? 'Сохраняем...' : 'Сохранить'}
                  </button>
                  <button className="post-action-link" type="button" onClick={() => setEditing(false)} disabled={saving}>
                    Отмена
                  </button>
                </div>
              </div>
            ) : null}
            <header className="post-hero">
              <div className="post-hero-bg">{post.imageUrl ? <img src={post.imageUrl} alt={post.title} /> : null}</div>
              <div className="post-hero-overlay" />
              <div className="post-hero-content">
                <div className="post-hero-meta">
                  <span className="post-chip">{post.user?.username || 'Unknown'}</span>
                  <span className="post-chip">{formatDate(post.createdAt)}</span>
                </div>
                <h1 className="post-hero-title">{post.title}</h1>
                {post.excerpt ? <p className="post-hero-subtitle">{post.excerpt}</p> : null}
              </div>
            </header>
            <div className="post-body">
              <div className="post-content-text">{post.content}</div>
            </div>
            <section className="comments-section">
              <div className="comments-header">
                <div className="comments-title">Комментарии</div>
                <div className="comments-count">{commentsTotal}</div>
              </div>
              <div className="comments-compose">
                <form onSubmit={submitComment} className="comments-form">
                  <textarea placeholder={canComment ? 'Напишите комментарий...' : 'Войдите, чтобы комментировать'} value={commentText} onChange={(e) => setCommentText(e.target.value)} disabled={!canComment || commentSubmitting} rows={3} />
                  <div className="comments-actions">
                    <button className="btn-load-more" type="submit" disabled={!canComment || commentSubmitting || !commentText.trim()}>
                      {commentSubmitting ? 'Отправляем...' : 'Отправить'}
                    </button>
                    {!canComment ? <Link to="/" className="comments-login-link">Войти</Link> : null}
                  </div>
                </form>
                {commentError ? <div className="comments-error">{commentError}</div> : null}
              </div>
              {commentsLoading ? <div className="comments-loading">Загрузка комментариев...</div> : comments.length === 0 ? <div className="comments-loading">Комментариев пока нет — будьте первым.</div> : (
                <div className="comments-list">
                  {comments.map((c) => (
                    <div className="comment" key={c.id}>
                      <div className="comment-meta">
                        <div className="comment-author">{c.user?.username || 'Unknown'}</div>
                        <div className="comment-date">
                          {new Date(c.createdAt).toLocaleString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                      </div>
                      <div className="comment-content">{c.content}</div>
                      {c.replies && c.replies.length > 0 ? (
                        <div className="comment-replies">
                          {c.replies.map((r) => (
                            <div className="comment reply" key={r.id}>
                              <div className="comment-meta">
                                <div className="comment-author">{r.user?.username || 'Unknown'}</div>
                                <div className="comment-date">
                                  {new Date(r.createdAt).toLocaleString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' })}
                                </div>
                              </div>
                              <div className="comment-content">{r.content}</div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
              {comments.length < commentsTotal ? (
                <div className="comments-more">
                  <button className="btn-load-more" type="button" onClick={loadMoreComments} disabled={commentsLoadingMore}>
                    {commentsLoadingMore ? 'Загрузка...' : 'Показать еще'}
                  </button>
                </div>
              ) : null}
            </section>
          </article>
        )}
      </div>
    </div>
  );
}
