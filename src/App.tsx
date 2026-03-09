import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useParams } from "react-router-dom";
import React, { useState, useEffect, FormEvent, useRef } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import mermaid from "mermaid";
import { 
  LayoutDashboard, 
  FileText, 
  BarChart3, 
  LogOut, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  ThumbsUp, 
  MessageSquare,
  ChevronRight,
  User,
  Calendar,
  ArrowLeft,
  Search,
  Menu,
  X,
  Bold,
  Italic,
  List,
  Link as LinkIcon,
  Code as CodeIcon,
  Image as ImageIcon,
  GitGraph
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "./lib/utils";

// --- Types ---
interface Article {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  featured_image?: string;
  published_at: string;
  updated_at: string;
  views: number;
  comment_count: number;
  like_count: number;
}

interface Comment {
  id: number;
  author_name: string;
  content: string;
  created_at: string;
}

interface AnalyticsData {
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  topArticles: { title: string; views: number }[];
}

// --- Components ---

const MarkdownRenderer = ({ content }: { content: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mermaid.initialize({ startOnLoad: true, theme: 'neutral' });
    if (containerRef.current) {
      mermaid.contentLoaded();
    }
  }, [content]);

  return (
    <div ref={containerRef} className="markdown-body prose prose-zinc max-w-none text-zinc-600 leading-relaxed text-lg space-y-6">
      <Markdown 
        remarkPlugins={[remarkGfm]} 
        rehypePlugins={[rehypeHighlight]}
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const lang = match ? match[1] : '';
            
            if (lang === 'mermaid') {
              return <div className="mermaid my-8 flex justify-center">{children}</div>;
            }
            
            return !inline && match ? (
              <pre className={cn("rounded-xl p-4 overflow-x-auto", className)}>
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            ) : (
              <code className={cn("bg-zinc-100 px-1.5 py-0.5 rounded text-sm font-mono text-zinc-900", className)} {...props}>
                {children}
              </code>
            );
          },
          img({ src, alt }: any) {
            return (
              <img 
                src={src} 
                alt={alt} 
                className="rounded-2xl border border-zinc-100 shadow-lg my-8" 
                referrerPolicy="no-referrer" 
              />
            );
          }
        }}
      >
        {content}
      </Markdown>
    </div>
  );
};

const Navbar = ({ isAdmin, onLogout }: { isAdmin: boolean; onLogout?: () => void }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-zinc-900">ModernBlog</span>
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors">Home</Link>
            {isAdmin ? (
              <>
                <Link to="/admin" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors">Dashboard</Link>
                <button 
                  onClick={onLogout}
                  className="flex items-center space-x-2 text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <Link to="/admin/login" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors">Admin Login</Link>
            )}
          </div>

          <button 
            className="md:hidden p-2 text-zinc-600"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-zinc-100 overflow-hidden"
          >
            <div className="px-4 pt-2 pb-6 space-y-4">
              <Link to="/" className="block text-base font-medium text-zinc-600" onClick={() => setIsMenuOpen(false)}>Home</Link>
              {isAdmin ? (
                <>
                  <Link to="/admin" className="block text-base font-medium text-zinc-600" onClick={() => setIsMenuOpen(false)}>Dashboard</Link>
                  <button 
                    onClick={() => { onLogout?.(); setIsMenuOpen(false); }}
                    className="flex items-center space-x-2 text-base font-medium text-red-600"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                <Link to="/admin/login" className="block text-base font-medium text-zinc-600" onClick={() => setIsMenuOpen(false)}>Admin Login</Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const BlogCard = ({ article }: { article: Article, key?: any }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="group relative bg-white border border-zinc-100 rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-zinc-200/50 transition-all duration-300"
  >
    {article.featured_image && (
      <div className="aspect-video w-full overflow-hidden">
        <img 
          src={article.featured_image} 
          alt={article.title} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          referrerPolicy="no-referrer"
        />
      </div>
    )}
    <div className="p-6">
      <div className="flex items-center space-x-3 mb-4">
        <div className="px-2.5 py-0.5 rounded-full bg-zinc-100 text-[10px] font-bold uppercase tracking-wider text-zinc-600">
          Article
        </div>
        <span className="text-xs text-zinc-400 font-medium">
          {new Date(article.published_at).toLocaleDateString()}
        </span>
      </div>
      <Link to={`/article/${article.slug}`}>
        <h3 className="text-xl font-bold text-zinc-900 mb-3 group-hover:text-zinc-600 transition-colors leading-tight">
          {article.title}
        </h3>
      </Link>
      <p className="text-zinc-500 text-sm leading-relaxed mb-6 line-clamp-2">
        {article.excerpt}
      </p>
      <div className="flex items-center justify-between pt-6 border-t border-zinc-50">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1.5 text-zinc-400">
            <ThumbsUp className="w-4 h-4" />
            <span className="text-xs font-medium">{article.like_count}</span>
          </div>
          <div className="flex items-center space-x-1.5 text-zinc-400">
            <MessageSquare className="w-4 h-4" />
            <span className="text-xs font-medium">{article.comment_count}</span>
          </div>
          <div className="flex items-center space-x-1.5 text-zinc-400">
            <Eye className="w-4 h-4" />
            <span className="text-xs font-medium">{article.views}</span>
          </div>
        </div>
        <Link 
          to={`/article/${article.slug}`}
          className="text-sm font-bold text-zinc-900 flex items-center space-x-1 group/link"
        >
          <span>Read More</span>
          <ChevronRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  </motion.div>
);

// --- Pages ---

const HomePage = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/articles")
      .then(res => res.json())
      .then(data => {
        setArticles(data);
        setLoading(false);
      });
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-16 text-center">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl md:text-7xl font-black tracking-tighter text-zinc-900 mb-6"
        >
          Insights for the <br />
          <span className="text-zinc-400">Modern Developer</span>
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-lg text-zinc-500 max-w-2xl mx-auto"
        >
          Explore the latest in technology, design, and software engineering. 
          Fresh perspectives delivered weekly.
        </motion.p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 bg-zinc-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {articles.map(article => (
            <BlogCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </div>
  );
};

const ArticlePage = () => {
  const { slug } = useParams();
  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [commentName, setCommentName] = useState("");
  const [commentContent, setCommentContent] = useState("");
  const [isLiking, setIsLiking] = useState(false);

  const fetchArticle = () => {
    fetch(`/api/articles/${slug}`)
      .then(res => res.json())
      .then(data => {
        setArticle(data);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchArticle();
  }, [slug]);

  const handleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);
    try {
      const res = await fetch(`/api/articles/${article.id}/like`, { method: "POST" });
      if (res.ok) fetchArticle();
    } finally {
      setIsLiking(false);
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentName || !commentContent) return;
    const res = await fetch(`/api/articles/${article.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ author_name: commentName, content: commentContent })
    });
    if (res.ok) {
      setCommentName("");
      setCommentContent("");
      fetchArticle();
    }
  };

  if (loading) return <div className="max-w-3xl mx-auto py-20 px-4 animate-pulse bg-zinc-50 h-screen" />;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <Link to="/" className="inline-flex items-center space-x-2 text-zinc-400 hover:text-zinc-900 transition-colors mb-12 group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span className="text-sm font-medium">Back to feed</span>
      </Link>

      <article>
        <div className="flex items-center space-x-3 mb-6">
          <div className="px-2.5 py-0.5 rounded-full bg-zinc-100 text-[10px] font-bold uppercase tracking-wider text-zinc-600">
            Article
          </div>
          <span className="text-xs text-zinc-400 font-medium">
            {new Date(article.published_at).toLocaleDateString()}
          </span>
          <span className="text-zinc-200">•</span>
          <span className="text-xs text-zinc-400 font-medium">{article.views} views</span>
        </div>

        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-zinc-900 mb-8 leading-tight">
          {article.title}
        </h1>

        {article.featured_image && (
          <div className="mb-12 rounded-3xl overflow-hidden border border-zinc-100 shadow-xl shadow-zinc-200/50">
            <img 
              src={article.featured_image} 
              alt={article.title} 
              className="w-full h-auto"
              referrerPolicy="no-referrer"
            />
          </div>
        )}

        <div className="mt-8">
          <MarkdownRenderer content={article.content} />
        </div>

        <div className="mt-16 pt-8 border-t border-zinc-100 flex items-center justify-between">
          <button 
            onClick={handleLike}
            className={cn(
              "flex items-center space-x-2 px-6 py-3 rounded-full border transition-all active:scale-95",
              isLiking ? "opacity-50 cursor-not-allowed" : "hover:bg-zinc-50 border-zinc-200"
            )}
          >
            <ThumbsUp className="w-5 h-5" />
            <span className="font-bold">{article.like_count} Likes</span>
          </button>
        </div>
      </article>

      <section className="mt-20">
        <h3 className="text-2xl font-bold text-zinc-900 mb-8">Comments ({article.comments.length})</h3>
        
        <form onSubmit={handleComment} className="bg-zinc-50 rounded-2xl p-6 mb-12">
          <div className="grid grid-cols-1 gap-4">
            <input 
              type="text" 
              placeholder="Your Name"
              value={commentName}
              onChange={e => setCommentName(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/5 transition-all"
            />
            <textarea 
              placeholder="What are your thoughts?"
              value={commentContent}
              onChange={e => setCommentContent(e.target.value)}
              rows={4}
              className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/5 transition-all resize-none"
            />
            <button 
              type="submit"
              className="bg-zinc-900 text-white font-bold py-3 rounded-xl hover:bg-zinc-800 transition-colors"
            >
              Post Comment
            </button>
          </div>
        </form>

        <div className="space-y-8">
          {article.comments.map((comment: Comment) => (
            <div key={comment.id} className="flex space-x-4">
              <div className="w-10 h-10 rounded-full bg-zinc-200 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-zinc-500" />
              </div>
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-bold text-zinc-900">{comment.author_name}</span>
                  <span className="text-zinc-300">•</span>
                  <span className="text-xs text-zinc-400">{new Date(comment.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-zinc-600 text-sm leading-relaxed">{comment.content}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

const AdminLoginPage = ({ onLogin }: { onLogin: (token: string) => void }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (res.ok) {
      onLogin(data.token);
      navigate("/admin");
    } else {
      setError(data.error);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white border border-zinc-100 rounded-3xl p-8 shadow-2xl shadow-zinc-200/50"
      >
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <LayoutDashboard className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-black text-zinc-900">Admin Portal</h2>
          <p className="text-zinc-500 text-sm mt-2">Enter your credentials to manage the blog</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2 px-1">Username</label>
            <input 
              type="text" 
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/5 transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2 px-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/5 transition-all"
              required
            />
          </div>
          {error && <p className="text-red-500 text-xs font-medium px-1">{error}</p>}
          <button 
            type="submit"
            className="w-full bg-zinc-900 text-white font-bold py-4 rounded-xl hover:bg-zinc-800 transition-all active:scale-[0.98] mt-4 shadow-lg shadow-zinc-900/10"
          >
            Sign In
          </button>
        </form>
      </motion.div>
    </div>
  );
};

const AdminDashboard = ({ token }: { token: string }) => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchData = async () => {
    const [artRes, anaRes] = await Promise.all([
      fetch("/api/articles"),
      fetch("/api/admin/analytics", { headers: { Authorization: `Bearer ${token}` } })
    ]);
    const articles = await artRes.json();
    const analytics = await anaRes.json();
    setArticles(articles);
    setAnalytics(analytics);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this article?")) return;
    const res = await fetch(`/api/admin/articles/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) fetchData();
  };

  if (loading) return <div className="p-8 animate-pulse space-y-8"><div className="h-32 bg-zinc-100 rounded-2xl" /><div className="h-64 bg-zinc-100 rounded-2xl" /></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex justify-between items-end mb-12">
        <div>
          <h1 className="text-4xl font-black text-zinc-900 tracking-tight">Dashboard</h1>
          <p className="text-zinc-500 mt-2">Manage your content and track performance</p>
        </div>
        <Link 
          to="/admin/editor"
          className="bg-zinc-900 text-white px-6 py-3 rounded-xl font-bold flex items-center space-x-2 hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-900/10"
        >
          <Plus className="w-5 h-5" />
          <span>New Article</span>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {[
          { label: "Total Views", value: analytics?.totalViews, icon: Eye, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Total Likes", value: analytics?.totalLikes, icon: ThumbsUp, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Total Comments", value: analytics?.totalComments, icon: MessageSquare, color: "text-violet-600", bg: "bg-violet-50" },
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white border border-zinc-100 rounded-3xl p-8 flex items-center space-x-6"
          >
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center", stat.bg)}>
              <stat.icon className={cn("w-7 h-7", stat.color)} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">{stat.label}</p>
              <p className="text-3xl font-black text-zinc-900">{stat.value?.toLocaleString()}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Articles Table */}
      <div className="bg-white border border-zinc-100 rounded-3xl overflow-hidden shadow-sm">
        <div className="px-8 py-6 border-b border-zinc-50 flex items-center justify-between">
          <h3 className="font-bold text-zinc-900">Recent Articles</h3>
          <div className="flex items-center space-x-2 text-xs font-bold text-zinc-400">
            <BarChart3 className="w-4 h-4" />
            <span>Live Stats</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-50/50">
                <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-zinc-400">Article</th>
                <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-zinc-400">Views</th>
                <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-zinc-400">Engagement</th>
                <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-zinc-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {articles.map(article => (
                <tr key={article.id} className="hover:bg-zinc-50/30 transition-colors">
                  <td className="px-8 py-5">
                    <p className="font-bold text-zinc-900 mb-1">{article.title}</p>
                    <p className="text-xs text-zinc-400">{new Date(article.published_at).toLocaleDateString()}</p>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-sm font-medium text-zinc-600">{article.views}</span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1 text-zinc-400">
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span className="text-xs">{article.like_count}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-zinc-400">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span className="text-xs">{article.comment_count}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => navigate(`/admin/editor/${article.id}`)}
                        className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(article.id)}
                        className="p-2 text-zinc-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const ArticleEditor = ({ token }: { token: string }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [featuredImage, setFeaturedImage] = useState("");
  const [loading, setLoading] = useState(!!id);
  const [previewMode, setPreviewMode] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (id) {
      fetch("/api/articles")
        .then(res => res.json())
        .then(data => {
          const article = data.find((a: any) => a.id === parseInt(id));
          if (article) {
            setTitle(article.title);
            setSlug(article.slug);
            setExcerpt(article.excerpt);
            setContent(article.content);
            setFeaturedImage(article.featured_image || "");
          }
          setLoading(false);
        });
    }
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const url = id ? `/api/admin/articles/${id}` : "/api/admin/articles";
    const method = id ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ title, slug, excerpt, content, featured_image: featuredImage })
    });
    const data = await res.json();
    if (res.ok) {
      navigate("/admin");
    } else {
      setError(data.error || "Something went wrong. Please try again.");
    }
  };

  if (loading) return <div className="p-8 animate-pulse bg-zinc-50 h-screen" />;

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-12">
        <div>
          <h1 className="text-3xl font-black text-zinc-900 tracking-tight">
            {id ? "Edit Article" : "Write New Article"}
          </h1>
          <p className="text-zinc-500 text-sm mt-1">Markdown, Code, and Flowcharts supported</p>
        </div>
        <div className="flex items-center space-x-4">
          <button 
            type="button"
            onClick={() => setPreviewMode(!previewMode)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-bold transition-all",
              previewMode ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            )}
          >
            {previewMode ? "Edit Mode" : "Preview Mode"}
          </button>
          <button 
            onClick={() => navigate("/admin")}
            className="text-sm font-bold text-zinc-400 hover:text-zinc-900 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm font-medium">
            {error}
          </div>
        )}
        {!previewMode ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 px-1">Title</label>
                <input 
                  type="text" 
                  value={title}
                  onChange={e => {
                    setTitle(e.target.value);
                    if (!id) setSlug(e.target.value.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''));
                  }}
                  className="w-full bg-white border border-zinc-200 rounded-2xl px-5 py-4 text-lg font-bold focus:outline-none focus:ring-4 focus:ring-zinc-900/5 transition-all"
                  placeholder="Enter a catchy title..."
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 px-1">URL Slug</label>
                <input 
                  type="text" 
                  value={slug}
                  onChange={e => setSlug(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded-2xl px-5 py-4 text-zinc-600 focus:outline-none focus:ring-4 focus:ring-zinc-900/5 transition-all"
                  placeholder="article-url-slug"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 px-1">Featured Image URL</label>
              <input 
                type="url" 
                value={featuredImage}
                onChange={e => setFeaturedImage(e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded-2xl px-5 py-4 text-zinc-600 focus:outline-none focus:ring-4 focus:ring-zinc-900/5 transition-all"
                placeholder="https://images.unsplash.com/photo-..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 px-1">Excerpt</label>
              <textarea 
                value={excerpt}
                onChange={e => setExcerpt(e.target.value)}
                rows={2}
                className="w-full bg-white border border-zinc-200 rounded-2xl px-5 py-4 text-zinc-600 focus:outline-none focus:ring-4 focus:ring-zinc-900/5 transition-all resize-none"
                placeholder="A brief summary for the feed..."
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Content</label>
                <div className="flex items-center space-x-2 bg-zinc-100 p-1 rounded-lg">
                  {[
                    { icon: Bold, action: () => setContent(c => c + "****"), label: "Bold" },
                    { icon: Italic, action: () => setContent(c => c + "__"), label: "Italic" },
                    { icon: List, action: () => setContent(c => c + "\n- "), label: "List" },
                    { icon: LinkIcon, action: () => setContent(c => c + "[]()"), label: "Link" },
                    { icon: CodeIcon, action: () => setContent(c => c + "\n```\n\n```"), label: "Code" },
                    { icon: ImageIcon, action: () => setContent(c => c + "![]()"), label: "Image" },
                    { icon: GitGraph, action: () => setContent(c => c + "\n```mermaid\ngraph TD\n  A --> B\n```"), label: "Flowchart" },
                  ].map((tool, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={tool.action}
                      title={tool.label}
                      className="p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-white rounded transition-all"
                    >
                      <tool.icon className="w-4 h-4" />
                    </button>
                  ))}
                </div>
              </div>
              <textarea 
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={15}
                className="w-full bg-white border border-zinc-200 rounded-2xl px-5 py-4 text-zinc-600 focus:outline-none focus:ring-4 focus:ring-zinc-900/5 transition-all font-mono text-sm leading-relaxed"
                placeholder="Write your story here... Use the toolbar for quick formatting."
                required
              />
            </div>
          </>
        ) : (
          <div className="bg-white border border-zinc-100 rounded-3xl p-8 min-h-[600px] shadow-sm">
            <h1 className="text-4xl font-black text-zinc-900 mb-8">{title || "Untitled Article"}</h1>
            {featuredImage && (
              <div className="mb-12 rounded-3xl overflow-hidden border border-zinc-100 shadow-xl shadow-zinc-200/50">
                <img 
                  src={featuredImage} 
                  alt={title} 
                  className="w-full h-auto"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
            <MarkdownRenderer content={content || "*No content to preview*"} />
          </div>
        )}

        <button 
          type="submit"
          className="w-full bg-zinc-900 text-white font-black py-5 rounded-2xl hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-900/10 active:scale-[0.99]"
        >
          {id ? "Update Article" : "Publish Article"}
        </button>
      </form>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem("admin_token"));

  const handleLogin = (newToken: string) => {
    setToken(newToken);
    localStorage.setItem("admin_token", newToken);
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem("admin_token");
  };

  return (
    <Router>
      <div className="min-h-screen bg-white text-zinc-900 font-sans selection:bg-zinc-900 selection:text-white">
        <Navbar isAdmin={!!token} onLogout={handleLogout} />
        
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/article/:slug" element={<ArticlePage />} />
            <Route path="/admin/login" element={<AdminLoginPage onLogin={handleLogin} />} />
            <Route 
              path="/admin" 
              element={token ? <AdminDashboard token={token} /> : <AdminLoginPage onLogin={handleLogin} />} 
            />
            <Route 
              path="/admin/editor" 
              element={token ? <ArticleEditor token={token} /> : <AdminLoginPage onLogin={handleLogin} />} 
            />
            <Route 
              path="/admin/editor/:id" 
              element={token ? <ArticleEditor token={token} /> : <AdminLoginPage onLogin={handleLogin} />} 
            />
          </Routes>
        </main>

        <footer className="border-t border-zinc-100 py-12 mt-20">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="w-6 h-6 bg-zinc-900 rounded flex items-center justify-center">
                <FileText className="w-3 h-3 text-white" />
              </div>
              <span className="font-bold tracking-tight">ModernBlog</span>
            </div>
            <p className="text-zinc-400 text-xs font-medium">
              &copy; {new Date().getFullYear()} ModernBlog Platform. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </Router>
  );
}
