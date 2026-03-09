import express from "express";
import { createServer as createViteServer } from "vite";
import pkg from 'pg';
const { Pool } = pkg;
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
});

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";

// Initialize Database
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE,
      password TEXT,
      role TEXT DEFAULT 'admin'
    );

    CREATE TABLE IF NOT EXISTS articles (
      id SERIAL PRIMARY KEY,
      title TEXT,
      slug TEXT UNIQUE,
      content TEXT,
      excerpt TEXT,
      featured_image TEXT,
      author_id INTEGER REFERENCES users(id),
      published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      views INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS comments (
      id SERIAL PRIMARY KEY,
      article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
      author_name TEXT,
      content TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS likes (
      id SERIAL PRIMARY KEY,
      article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
      ip_address TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(article_id, ip_address)
    );
  `);

  // Create default admin if not exists
  const adminExists = await pool.query("SELECT * FROM users WHERE username = $1", ["admin"]);
  if (adminExists.rowCount === 0) {
    const hashedPassword = bcrypt.hashSync("admin123", 10);
    await pool.query("INSERT INTO users (username, password) VALUES ($1, $2)", ["admin", hashedPassword]);
  }
}

async function startServer() {
  await initDb();
  
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
  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;
    const result = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
    const user = result.rows[0];

    if (user && bcrypt.compareSync(password, user.password)) {
      const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
      res.json({ token, user: { id: user.id, username: user.username } });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  // Articles (Public)
  app.get("/api/articles", async (req, res) => {
    const query = `
      SELECT a.*, 
      (SELECT COUNT(*) FROM comments WHERE article_id = a.id) as comment_count,
      (SELECT COUNT(*) FROM likes WHERE article_id = a.id) as like_count
      FROM articles a ORDER BY published_at DESC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  });

  app.get("/api/articles/:slug", async (req, res) => {
    const result = await pool.query("SELECT * FROM articles WHERE slug = $1", [req.params.slug]);
    const article = result.rows[0];
    if (!article) return res.status(404).json({ error: "Article not found" });
    
    // Increment views
    await pool.query("UPDATE articles SET views = views + 1 WHERE id = $1", [article.id]);
    
    const commentsResult = await pool.query("SELECT * FROM comments WHERE article_id = $1 ORDER BY created_at DESC", [article.id]);
    const likesResult = await pool.query("SELECT COUNT(*) as count FROM likes WHERE article_id = $1", [article.id]);
    
    res.json({ 
      ...article, 
      comments: commentsResult.rows, 
      like_count: parseInt(likesResult.rows[0].count) 
    });
  });

  // Comments (Public)
  app.post("/api/articles/:id/comments", async (req, res) => {
    const { author_name, content } = req.body;
    const result = await pool.query(
      "INSERT INTO comments (article_id, author_name, content) VALUES ($1, $2, $3) RETURNING id",
      [req.params.id, author_name, content]
    );
    res.json({ id: result.rows[0].id });
  });

  // Likes (Public)
  app.post("/api/articles/:id/like", async (req, res) => {
    const ip = req.ip || "unknown";
    try {
      await pool.query("INSERT INTO likes (article_id, ip_address) VALUES ($1, $2)", [req.params.id, ip]);
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: "Already liked" });
    }
  });

  // Admin Routes (Protected)
  app.post("/api/admin/articles", authenticateToken, async (req, res) => {
    try {
      const { title, slug, content, excerpt, featured_image } = req.body;
      const result = await pool.query(
        "INSERT INTO articles (title, slug, content, excerpt, featured_image, author_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
        [title, slug, content, excerpt, featured_image, (req as any).user.id]
      );
      res.json({ id: result.rows[0].id });
    } catch (error: any) {
      console.error("Error creating article:", error);
      if (error.code === '23505') { // Postgres unique constraint violation
        res.status(400).json({ error: "An article with this slug already exists." });
      } else {
        res.status(500).json({ error: "Failed to create article." });
      }
    }
  });

  app.put("/api/admin/articles/:id", authenticateToken, async (req, res) => {
    try {
      const { title, slug, content, excerpt, featured_image } = req.body;
      await pool.query(
        "UPDATE articles SET title = $1, slug = $2, content = $3, excerpt = $4, featured_image = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6",
        [title, slug, content, excerpt, featured_image, req.params.id]
      );
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error updating article:", error);
      if (error.code === '23505') {
        res.status(400).json({ error: "An article with this slug already exists." });
      } else {
        res.status(500).json({ error: "Failed to update article." });
      }
    }
  });

  app.delete("/api/admin/articles/:id", authenticateToken, async (req, res) => {
    // Cascading deletes handled by DB schema
    await pool.query("DELETE FROM articles WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  });

  app.get("/api/admin/analytics", authenticateToken, async (req, res) => {
    const viewsResult = await pool.query("SELECT SUM(views) as total FROM articles");
    const likesResult = await pool.query("SELECT COUNT(*) as total FROM likes");
    const commentsResult = await pool.query("SELECT COUNT(*) as total FROM comments");
    const topArticlesResult = await pool.query("SELECT title, views FROM articles ORDER BY views DESC LIMIT 5");
    
    res.json({
      totalViews: parseInt(viewsResult.rows[0].total) || 0,
      totalLikes: parseInt(likesResult.rows[0].total) || 0,
      totalComments: parseInt(commentsResult.rows[0].total) || 0,
      topArticles: topArticlesResult.rows
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

startServer().catch(err => {
  console.error("Failed to start server:", err);
});
