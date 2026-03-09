import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("blog.db");
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT DEFAULT 'admin'
  );

  CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    slug TEXT UNIQUE,
    content TEXT,
    excerpt TEXT,
    featured_image TEXT,
    author_id INTEGER,
    published_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    views INTEGER DEFAULT 0,
    FOREIGN KEY(author_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER,
    author_name TEXT,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(article_id) REFERENCES articles(id)
  );

  CREATE TABLE IF NOT EXISTS likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(article_id) REFERENCES articles(id),
    UNIQUE(article_id, ip_address)
  );
`);

// Migration: Add featured_image column if it doesn't exist
const tableInfo = db.prepare("PRAGMA table_info(articles)").all();
const hasFeaturedImage = tableInfo.some((col: any) => col.name === 'featured_image');
if (!hasFeaturedImage) {
  db.exec("ALTER TABLE articles ADD COLUMN featured_image TEXT");
}

// Create default admin if not exists
const adminExists = db.prepare("SELECT * FROM users WHERE username = ?").get("admin");
if (!adminExists) {
  const hashedPassword = bcrypt.hashSync("admin123", 10);
  db.prepare("INSERT INTO users (username, password) VALUES (?, ?)").run("admin", hashedPassword);
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Auth Middleware
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  };

  // --- API Routes ---

  // Auth
  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;
    const user: any = db.prepare("SELECT * FROM users WHERE username = ?").get(username);

    if (user && bcrypt.compareSync(password, user.password)) {
      const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
      res.json({ token, user: { id: user.id, username: user.username } });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  // Articles (Public)
  app.get("/api/articles", (req, res) => {
    const articles = db.prepare(`
      SELECT a.*, 
      (SELECT COUNT(*) FROM comments WHERE article_id = a.id) as comment_count,
      (SELECT COUNT(*) FROM likes WHERE article_id = a.id) as like_count
      FROM articles a ORDER BY published_at DESC
    `).all();
    res.json(articles);
  });

  app.get("/api/articles/:slug", (req, res) => {
    const article: any = db.prepare("SELECT * FROM articles WHERE slug = ?").get(req.params.slug);
    if (!article) return res.status(404).json({ error: "Article not found" });
    
    // Increment views
    db.prepare("UPDATE articles SET views = views + 1 WHERE id = ?").run(article.id);
    
    const comments = db.prepare("SELECT * FROM comments WHERE article_id = ? ORDER BY created_at DESC").all(article.id);
    const likes = db.prepare("SELECT COUNT(*) as count FROM likes WHERE article_id = ?").get(article.id);
    
    res.json({ ...article, comments, like_count: (likes as any).count });
  });

  // Comments (Public)
  app.post("/api/articles/:id/comments", (req, res) => {
    const { author_name, content } = req.body;
    const result = db.prepare("INSERT INTO comments (article_id, author_name, content) VALUES (?, ?, ?)")
      .run(req.params.id, author_name, content);
    res.json({ id: result.lastInsertRowid });
  });

  // Likes (Public)
  app.post("/api/articles/:id/like", (req, res) => {
    const ip = req.ip || "unknown";
    try {
      db.prepare("INSERT INTO likes (article_id, ip_address) VALUES (?, ?)").run(req.params.id, ip);
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: "Already liked" });
    }
  });

  // Admin Routes (Protected)
  app.post("/api/admin/articles", authenticateToken, (req, res) => {
    try {
      const { title, slug, content, excerpt, featured_image } = req.body;
      const result = db.prepare("INSERT INTO articles (title, slug, content, excerpt, featured_image, author_id) VALUES (?, ?, ?, ?, ?, ?)")
        .run(title, slug, content, excerpt, featured_image, (req as any).user.id);
      res.json({ id: result.lastInsertRowid });
    } catch (error: any) {
      console.error("Error creating article:", error);
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        res.status(400).json({ error: "An article with this slug already exists." });
      } else {
        res.status(500).json({ error: "Failed to create article." });
      }
    }
  });

  app.put("/api/admin/articles/:id", authenticateToken, (req, res) => {
    try {
      const { title, slug, content, excerpt, featured_image } = req.body;
      db.prepare("UPDATE articles SET title = ?, slug = ?, content = ?, excerpt = ?, featured_image = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .run(title, slug, content, excerpt, featured_image, req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error updating article:", error);
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        res.status(400).json({ error: "An article with this slug already exists." });
      } else {
        res.status(500).json({ error: "Failed to update article." });
      }
    }
  });

  app.delete("/api/admin/articles/:id", authenticateToken, (req, res) => {
    db.prepare("DELETE FROM comments WHERE article_id = ?").run(req.params.id);
    db.prepare("DELETE FROM likes WHERE article_id = ?").run(req.params.id);
    db.prepare("DELETE FROM articles WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/admin/analytics", authenticateToken, (req, res) => {
    const totalViews = db.prepare("SELECT SUM(views) as total FROM articles").get();
    const totalLikes = db.prepare("SELECT COUNT(*) as total FROM likes").get();
    const totalComments = db.prepare("SELECT COUNT(*) as total FROM comments").get();
    const topArticles = db.prepare("SELECT title, views FROM articles ORDER BY views DESC LIMIT 5").all();
    
    res.json({
      totalViews: (totalViews as any).total || 0,
      totalLikes: (totalLikes as any).total || 0,
      totalComments: (totalComments as any).total || 0,
      topArticles
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
