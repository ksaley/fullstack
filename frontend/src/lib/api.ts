export type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
};

export type User = {
  id: number;
  email: string;
  username: string;
  firstName?: string | null;
  lastName?: string | null;
  avatar?: string | null;
  bio?: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
};

export type Post = {
  id: number;
  title: string;
  content: string;
  excerpt?: string | null;
  imageUrl?: string | null;
  userId: number;
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
  user?: User;
};

export type Comment = {
  id: number;
  content: string;
  postId: number;
  userId: number;
  parentId?: number | null;
  createdAt: string;
  updatedAt: string;
  user?: User;
  replies?: Comment[];
};

export type PostsList = {
  posts: Post[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type CommentsList = {
  comments: Comment[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? 'http://127.0.0.1:8080/api' : '/api');

function getAccessToken(): string {
  return localStorage.getItem('accessToken') || '';
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers || {});
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  const token = getAccessToken();
  if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const text = await res.text();
  const json = text ? (JSON.parse(text) as ApiResponse<T>) : ({ success: false } as ApiResponse<T>);

  if (!res.ok || !json.success) {
    throw new Error(json.error || `HTTP ${res.status}`);
  }

  if (json.data === undefined) {
    // Some endpoints return only message
    return undefined as unknown as T;
  }
  return json.data;
}

export async function getPosts(page = 1, pageSize = 9): Promise<PostsList> {
  return request<PostsList>(`/posts?page=${page}&pageSize=${pageSize}`);
}

export async function getPostsByUser(userId: number, page = 1, pageSize = 12): Promise<PostsList> {
  return request<PostsList>(`/posts/user/${userId}?page=${page}&pageSize=${pageSize}`);
}

export async function getPost(id: number): Promise<Post> {
  return request<Post>(`/posts/${id}`);
}

export async function getComments(postId: number, page = 1, pageSize = 10): Promise<CommentsList> {
  // Note: backend routes comments under /comments/post/:postId
  return request<CommentsList>(`/comments/post/${postId}?page=${page}&pageSize=${pageSize}`);
}

export type CreateCommentRequest = {
  content: string;
  parentId?: number | null;
};

export async function createComment(postId: number, req: CreateCommentRequest): Promise<Comment> {
  return request<Comment>(`/comments/post/${postId}`, { method: 'POST', body: JSON.stringify(req) });
}

export async function getCommentsTotal(): Promise<number> {
  const data = await request<{ total: number }>('/comments/count');
  return data.total;
}

export type CreatePostRequest = {
  title: string;
  content: string;
  excerpt?: string | null;
  imageUrl?: string | null;
  status?: 'draft' | 'published';
};

export async function createPost(req: CreatePostRequest): Promise<Post> {
  return request<Post>('/posts', { method: 'POST', body: JSON.stringify(req) });
}

export type UpdatePostRequest = {
  title?: string;
  content?: string;
  excerpt?: string | null;
  imageUrl?: string | null;
  status?: 'draft' | 'published';
};

export async function updatePost(id: number, req: UpdatePostRequest): Promise<Post> {
  return request<Post>(`/posts/${id}`, { method: 'PUT', body: JSON.stringify(req) });
}

export async function deletePost(id: number): Promise<void> {
  return request<void>(`/posts/${id}`, { method: 'DELETE' });
}

export type LoginRequest = { email: string; password: string };
export type RegisterRequest = {
  email: string;
  username: string;
  password: string;
  firstName?: string | null;
  lastName?: string | null;
};

export type TokenResponse = {
  accessToken: string;
  refreshToken: string;
  user: User;
};

export async function login(req: LoginRequest): Promise<TokenResponse> {
  return request<TokenResponse>('/auth/login', { method: 'POST', body: JSON.stringify(req) });
}

export async function register(req: RegisterRequest): Promise<TokenResponse> {
  return request<TokenResponse>('/auth/register', { method: 'POST', body: JSON.stringify(req) });
}

export async function logout(refreshToken: string): Promise<void> {
  return request<void>('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) });
}

export async function getMe(): Promise<User> {
  return request<User>('/auth/me');
}

export async function getUsersTotal(): Promise<number> {
  const data = await request<{ total: number }>('/users/count');
  return data.total;
}


