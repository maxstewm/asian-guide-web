// backend/app.js

const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const pool = require('./db'); // 数据库连接池
const authenticateToken = require('./middleware/auth'); // <-- 确认 middleware 目录名和文件名
const { generateUniqueSlug } = require('./utils/slug'); // <-- 确认 utils 目录名和文件名
const { JSDOM } = require('jsdom');
const DOMPurify = require('dompurify');

// --- 将初始化移到顶层 ---
const window = new JSDOM('').window;
const purify = DOMPurify(window);
// --- 结束初始化 ---

// --- 引入其他路由 ---
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const uploadRoutes = require('./routes/upload'); // uploadRoutes 内部路径应是 /image/:articleId 等

dotenv.config();
const app = express();


// --- 全局中间件 ---
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
        'http://35.198.219.2:3001', // 你的前端开发服务器 IP 和端口
        'http://localhost:3001',    // 本地开发前端
        // 添加你生产环境的前端域名 'https://your-deployed-frontend.com'
    ];
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS', // 确保包含 OPTIONS
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 204
};
app.use(cors(corsOptions)); // 应用 CORS
app.use(express.json()); // 解析 JSON 请求体

// --- 挂载其他模块化路由 ---
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes); // 包含 /api/users/me, /api/users/me/articles
app.use('/api/upload', uploadRoutes); // 包含 /api/upload/image/:articleId, /api/upload/image/:imageId

// --- 直接在 app 上定义 Articles 相关路由 ---

// --- 获取国家列表 ---
app.get('/api/countries', async (req, res) => {
  console.log(">>> GET /api/countries handler entered.");
  try {
    const result = await pool.query('SELECT id, name, slug FROM countries ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error("Failed to fetch countries:", err);
    res.status(500).json({ message: 'Server error while fetching countries.' });
  }
});

// --- 获取文章列表 (只获取已发布的) ---
app.get('/api/articles', async (req, res) => {
  console.log(">>> GET /api/articles (list) handler entered. Query:", req.query);
  const { country, page = 1, limit = 10, featured, sortBy = 'created_at', order = 'desc' } = req.query;
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const isFeatured = featured === 'true';

  if (isNaN(pageNum) || pageNum < 1) { return res.status(400).json({ message: 'Page number must be a positive integer.' }); }
  if (isNaN(limitNum) || limitNum < 1 || limitNum > 50) { return res.status(400).json({ message: 'Limit must be between 1 and 50.' }); }

  const offset = (pageNum - 1) * limitNum;
  let params = [];
  let countParams = [];
  let whereClauses = [`a.status = 'published'`];
  let joins = ` JOIN users u ON a.user_id = u.id JOIN countries c ON a.country_id = c.id `;
  let paramIndex = 1;

  if (country) {
    whereClauses.push(`c.slug = $${paramIndex++}`);
    params.push(country);
    countParams.push(country);
  }
  if (isFeatured) {
    whereClauses.push(`a.is_featured = true`);
  }

  const whereString = `WHERE ${whereClauses.join(' AND ')}`;
  const allowedSortBy = ['created_at', 'updated_at', 'title'];
  const allowedOrder = ['asc', 'desc'];
  const sortColumnMap = { 'created_at': 'a.created_at', 'updated_at': 'a.updated_at', 'title': 'a.title' };
  const sortColumn = sortColumnMap[sortBy] || 'a.created_at';
  const sortOrder = allowedOrder.includes(order.toLowerCase()) ? order.toUpperCase() : 'DESC';
  const orderByString = `ORDER BY ${sortColumn} ${sortOrder}`;

  const articlesQuery = `
    SELECT
      a.id, a.title, a.slug, a.cover_image_url, a.created_at, a.updated_at, a.is_featured, a.main_image_url,
      u.id AS author_id, u.username AS author_username,
      c.id AS country_id, c.name AS country_name, c.slug AS country_slug
    FROM articles a
    ${joins}
    ${whereString}
    ${orderByString}
    LIMIT $${paramIndex++} OFFSET $${paramIndex++};
  `;
  const queryParams = [...params, limitNum, offset];
  const countQuery = ` SELECT COUNT(*) FROM articles a ${joins} ${whereString} `;
  const countQueryParams = [...params]; // 使用 countParams

  console.log('--- Articles Query ---'); /* ... logging ... */
  console.log('--- Count Query ---'); /* ... logging ... */

  try {
    const [articlesResult, countResult] = await Promise.all([
      pool.query(articlesQuery, queryParams),
      pool.query(countQuery, countQueryParams)
    ]);
    const totalArticles = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalArticles / limitNum);

    // 返回 200 OK，即使 articles 数组为空
    res.json({
      articles: articlesResult.rows,
      pagination: { currentPage: pageNum, totalPages: totalPages, totalArticles: totalArticles, limit: limitNum }
    });
  } catch (err) {
    console.error("Failed to fetch articles:", err);
    res.status(500).json({ message: 'Server error while fetching articles.' });
  }
});

// --- 创建文章草稿 ---
app.post('/api/articles/draft', authenticateToken, async (req, res) => {
  console.log(">>> POST /api/articles/draft handler entered.");
  const userId = req.user.id;
  try {
    const insertQuery = ` INSERT INTO articles (user_id, status) VALUES ($1, 'draft') RETURNING id; `;
    const result = await pool.query(insertQuery, [userId]);
    res.status(201).json({ articleId: result.rows[0].id });
  } catch (err) {
    console.error("Failed to create draft article:", err);
    res.status(500).json({ message: 'Server error, failed to create draft.' });
  }
});

// --- 获取单篇文章详情 ---
app.get('/api/articles/:slug', async (req, res) => {
  console.log(">>> GET /api/articles/:slug (detail) handler entered. Slug:", req.params.slug);
  const { slug } = req.params;
  // 检查 slug 是否是关键字，避免冲突
  if (['list', 'countries', 'draft'].includes(slug?.toLowerCase())) {
      return res.status(404).json({ message: 'Invalid article identifier.' });
  }
  try {
    const articleQuery = `
      SELECT
          a.id, a.title, a.content, a.slug, a.created_at, a.updated_at, a.status,
          a.type, -- <--- 添加 type
          u.id AS author_id, u.username AS author_username,
          c.id AS country_id, c.name AS country_name, c.slug AS country_slug,
          a.main_image_url -- 获取主图
      FROM articles a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN countries c ON a.country_id = c.id
      WHERE a.slug = $1 AND a.status = 'published';
    `;
    const articleResult = await pool.query(articleQuery, [slug]);

    if (articleResult.rows.length === 0) {
      return res.status(404).json({ message: 'Article not found or not published yet.' });
    }
    const article = articleResult.rows[0];

    const imagesQuery = `
      SELECT id, image_url, upload_order
      FROM article_images WHERE article_id = $1 ORDER BY upload_order ASC, uploaded_at ASC;
    `;
    const imagesResult = await pool.query(imagesQuery, [article.id]);

    res.json({ ...article, images: imagesResult.rows });
  } catch (err) {
    console.error(`Failed to fetch article with slug ${slug}:`, err);
    res.status(500).json({ message: 'Server error.' });
  }
});

// --- 更新文章 (用于保存草稿和发布) ---
app.put('/api/articles/:id', authenticateToken, async (req, res) => {
  console.log(">>> PUT /api/articles/:id handler entered. ID:", req.params.id);
  const idParam = req.params.id;
  const articleId = parseInt(idParam, 10);
  if (isNaN(articleId) || String(articleId) !== idParam) {
       return res.status(400).json({ message: 'Invalid article ID format. Must be an integer.' });
  }

  const userId = req.user.id;
  const { title, content, country_slug, status, main_image_url, gallery_image_urls , type} = req.body; // 读取可能更新的字段

   // --- 添加内容长度检查 ---
   const MAX_CONTENT_LENGTH = 5 * 1024 * 1024; // 示例：限制为 5MB (根据你的需求调整)
   if (content && content.length > MAX_CONTENT_LENGTH) {
       console.warn(`Content length (${content.length} bytes) exceeds limit for article ${articleId}`);
       return res.status(400).json({ message: `Content exceeds maximum allowed length of ${MAX_CONTENT_LENGTH} bytes.` });
   }
  // 验证 type 值 (可选但推荐)
  if (type && type !== 'travel' && type !== 'food') {
    return res.status(400).json({ message: 'Invalid type value. Must be "travel" or "food".' });
  }

  if (status && status !== 'draft' && status !== 'published') { return res.status(400).json({ message: 'Invalid status value.' }); }

  const cleanContent = content !== undefined ? (content ? purify.sanitize(content, { USE_PROFILES: { html: true } }) : '') : undefined;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const checkQuery = 'SELECT user_id, slug FROM articles WHERE id = $1';
    const checkResult = await client.query(checkQuery, [articleId]);
    if (checkResult.rows.length === 0) { /* ... 404 ... */ await client.query('ROLLBACK'); client.release(); return res.status(404).json({ message: 'Article not found.' });}
    if (checkResult.rows[0].user_id !== userId) { /* ... 403 ... */ await client.query('ROLLBACK'); client.release(); return res.status(403).json({ message: 'Permission denied.' }); }

    const currentSlug = checkResult.rows[0].slug;
    const updates = [];
    const values = [];
    let paramIndex = 1;
    let finalSlug = currentSlug;

    if (title !== undefined) { updates.push(`title = $${paramIndex++}`); values.push(title); }
    // 只有当 content 被明确传递时才更新 (即使是空字符串)
    if (cleanContent !== undefined) { updates.push(`content = $${paramIndex++}`); values.push(cleanContent); }
    if (status) { updates.push(`status = $${paramIndex++}`); values.push(status); }
    if (main_image_url !== undefined) { updates.push(`main_image_url = $${paramIndex++}`); values.push(main_image_url); } // 更新主图
    // 更新图库 (假设后端存储为 JSONB)
    if (gallery_image_urls !== undefined && Array.isArray(gallery_image_urls)) {
        updates.push(`gallery_image_urls = $${paramIndex++}`);
        values.push(JSON.stringify(gallery_image_urls)); // 存为 JSON 字符串
    }


    if (country_slug) { /* ... 查询 countryId 并添加到 updates 和 values ... */
        const countryResult = await client.query('SELECT id FROM countries WHERE slug = $1', [country_slug]);
        if (countryResult.rows.length > 0) {
            updates.push(`country_id = $${paramIndex++}`); values.push(countryResult.rows[0].id);
        } else { /* ... 警告或错误 ... */ }
    }

    
    
    if (status === 'published' && !currentSlug && title) {
        finalSlug = await generateUniqueSlug(title, client);
        updates.push(`slug = $${paramIndex++}`);
        values.push(finalSlug);
    }
        

    if (updates.length === 0) { /* ... 400 No fields to update ... */ await client.query('ROLLBACK'); client.release(); return res.status(400).json({ message: 'No fields provided for update.' }); }

    updates.push(`updated_at = CURRENT_TIMESTAMP`); // 总是更新 updated_at
    const updateQuery = `UPDATE articles SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING slug;`;
    values.push(articleId);
    const updateResult = await client.query(updateQuery, values);
    const updatedSlug = finalSlug || updateResult.rows[0]?.slug || currentSlug;

    await client.query('COMMIT');
    res.json({ message: `Article ${status === 'published' ? 'published' : 'saved as draft'} successfully!`, slug: updatedSlug });

  } catch (err) { /* ... 错误处理和 ROLLBACK ... */
    await client.query('ROLLBACK');
    console.error(`Failed to update article ${articleId}:`, err);
    if (err.code === '23505') { /* ... slug 冲突 ... */ }
    res.status(500).json({ message: 'Server error, failed to update article.' });
  } finally {
    client.release();
  }
});

// --- 删除文章 ---
app.delete('/api/articles/:id', authenticateToken, async (req, res) => {
  console.log(">>> DELETE /api/articles/:id handler entered. ID:", req.params.id);
  const idParam = req.params.id;
  const articleId = parseInt(idParam, 10);
  if (isNaN(articleId) || String(articleId) !== idParam) { return res.status(400).json({ message: 'Invalid article ID format.' }); }

  const userId = req.user.id;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const checkResult = await client.query('SELECT user_id FROM articles WHERE id = $1', [articleId]);
    if (checkResult.rows.length === 0) { /* ... 404 ... */ await client.query('ROLLBACK'); client.release(); return res.status(404).json({ message: 'Article not found.' }); }
    if (checkResult.rows[0].user_id !== userId) { /* ... 403 ... */ await client.query('ROLLBACK'); client.release(); return res.status(403).json({ message: 'Permission denied.' }); }

    await client.query('DELETE FROM articles WHERE id = $1', [articleId]); // CASCADE 会处理 article_images

    await client.query('COMMIT');
    res.status(200).json({ message: 'Article deleted successfully.' });

  } catch (err) { /* ... 错误处理和 ROLLBACK ... */
    await client.query('ROLLBACK');
    console.error("Failed to delete article:", err);
    res.status(500).json({ message: 'Server error, deletion failed.' });
  } finally {
    client.release();
  }
});


// --- 根路径和错误处理 ---
app.get('/', (req, res) => { res.send('Travel Asia API is running!'); });

// 404 错误处理 (放在所有路由之后)
app.use((req, res, next) => {
  res.status(404).json({ message: "Sorry, can't find that resource!" });
});

// 全局错误处理中间件 (放在最后)
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.stack || err);
  // 避免暴露敏感错误信息给客户端
  res.status(500).json({ message: 'Something broke on the server!' });
});


// 导出 app 实例供 index.js (启动文件) 使用
module.exports = app;