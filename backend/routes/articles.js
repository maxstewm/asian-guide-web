// backend/routes/articles.js
const express = require('express');
const router = express.Router();
const pool = require('../db'); // 数据库连接池
const authenticateToken = require('../middleware/auth'); // JWT 认证中间件
const { generateUniqueSlug } = require('../utils/slug'); // Slug 生成工具函数
const { JSDOM } = require('jsdom'); // 用于 DOMPurify 在 Node.js 环境运行
const DOMPurify = require('dompurify'); // HTML 清理库

// 初始化 DOMPurify
const window = new JSDOM('').window;
const purify = DOMPurify(window);

// --- 创建文章 (POST /api/articles) ---
router.post('/articles', authenticateToken, async (req, res) => {
  // 从请求体获取数据，添加 main_image_url
  const { title, content, country_slug, main_image_url, gallery_image_urls } = req.body; // <--- 添加 main_image_url
  const userId = req.user.id;

  // 基本验证 (content 可以允许为空，如果需要的话)
  if (!title || !country_slug) { // <--- 移除 content 的非空验证 (如果允许)
    return res.status(400).json({ message: 'Title and country are required.' });
  }

  // 清理 HTML 内容 (如果 content 存在) - 对于纯文本 Textarea，可能不需要清理，或使用不同的清理策略
  // 如果 content 确定是纯文本，可以跳过清理或只做基础处理
  // const cleanContent = content ? purify.sanitize(content, { USE_PROFILES: { html: true } }) : null;
  const cleanContent = content || ''; // 直接使用，因为是 textarea

  try {
    // 1. 根据 country_slug 查询 country_id (不变)
    const countryResult = await pool.query('SELECT id FROM countries WHERE slug = $1', [country_slug]);
    if (countryResult.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid country identifier.' });
    }
    const countryId = countryResult.rows[0].id;

    // 2. 生成唯一的 slug (不变)
    const slug = await generateUniqueSlug(title); // 假设这个函数存在

    // 3. 插入文章数据到数据库，包含 main_image_url
    const insertQuery = `
  INSERT INTO articles (user_id, country_id, title, content, main_image_url, slug, gallery_image_urls)
  VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING ...;
  `;// <--- 添加 main_image_url 列
    // 注意：你需要在 articles 表中添加 main_image_url 字段 (VARCHAR 类型)
    // ALTER TABLE articles ADD COLUMN main_image_url VARCHAR(512);

    const result = await pool.query(insertQuery, [userId, countryId, title, cleanContent, main_image_url, slug, JSON.stringify(gallery_image_urls || [])]); // 转换为 JSON 字符串插入
    res.status(201).json({ message: 'Article published successfully!', article: result.rows[0] });

  } catch (err) {
    console.error("Failed to publish article:", err);
    if (err.code === '23505') {
         return res.status(400).json({ message: 'Article title might already exist. Try a different title.' });
    }
    res.status(500).json({ message: 'Server error, failed to publish.' });
  }
});

// --- 获取国家列表 (GET /api/countries) ---
router.get('/countries', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, slug FROM countries ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error("Failed to fetch countries:", err);
    res.status(500).json({ message: 'Server error while fetching countries.' });
  }
});

// --- 获取文章列表 (GET /api/articles) - 支持过滤、排序、分页 ---
router.get('/articles', async (req, res) => {
  // 1. 解析查询参数并设置默认值
  const {
      country,
      page = 1,
      limit = 10,
      featured,
      sortBy = 'created_at',
      order = 'desc',
      authorId // 新增: 按作者 ID 过滤 (如果选择方案 A)
  } = req.query;

  // 2. 参数验证和转换
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const isFeatured = featured === 'true';

  if (isNaN(pageNum) || pageNum < 1) {
    return res.status(400).json({ message: 'Page number must be a positive integer.' });
  }
  if (isNaN(limitNum) || limitNum < 1 || limitNum > 50) {
    return res.status(400).json({ message: 'Limit must be between 1 and 50.' });
  }

  // 3. 构建数据库查询
  const offset = (pageNum - 1) * limitNum;
  let params = []; // 主查询参数
  let countParams = []; // 计数查询参数
  let whereClauses = [];
  let joins = `
    JOIN users u ON a.user_id = u.id
    JOIN countries c ON a.country_id = c.id
  `; // 默认需要的连接
  let paramIndex = 1;

  // 添加 WHERE 子句
  if (country) {
    whereClauses.push(`c.slug = $${paramIndex++}`);
    params.push(country);
    countParams.push(country);
  }
  if (isFeatured) {
    whereClauses.push(`a.is_featured = true`);
    // 无需参数
  }
  if (authorId) { // 如果按作者过滤 (方案 A)
     whereClauses.push(`a.user_id = $${paramIndex++}`);
     params.push(authorId);
     countParams.push(authorId);
  }

  const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // 处理排序 (白名单验证)
  const allowedSortBy = ['created_at', 'updated_at', 'title'];
  const allowedOrder = ['asc', 'desc'];
  const sortColumnMap = {
      'created_at': 'a.created_at',
      'updated_at': 'a.updated_at',
      'title': 'a.title'
  };
  const sortColumn = sortColumnMap[sortBy] || 'a.created_at';
  const sortOrder = allowedOrder.includes(order.toLowerCase()) ? order.toUpperCase() : 'DESC';
  const orderByString = `ORDER BY ${sortColumn} ${sortOrder}`;

  // 构建主查询
  const articlesQuery = `
    SELECT
      a.id, a.title, a.slug, a.cover_image_url, a.created_at, a.updated_at, a.is_featured,
      u.id AS author_id, u.username AS author_username,
      c.id AS country_id, c.name AS country_name, c.slug AS country_slug
    FROM articles a
    ${joins}
    ${whereString}
    ${orderByString}
    LIMIT $${paramIndex++} OFFSET $${paramIndex++};
  `;
  const queryParams = [...params, limitNum, offset]; // 组合主查询参数

  // 构建计数查询
  const countQuery = `SELECT COUNT(*) FROM articles a ${joins} ${whereString}`;
  // 计数查询参数 countParams 已在上面准备好

  // 4. 执行查询
  try {
    const [articlesResult, countResult] = await Promise.all([
      pool.query(articlesQuery, queryParams),
      pool.query(countQuery, countParams) // 使用独立的计数参数列表
    ]);

    const totalArticles = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalArticles / limitNum);

    // 5. 返回结果
    res.json({
      articles: articlesResult.rows,
      pagination: {
        currentPage: pageNum,
        totalPages: totalPages,
        totalArticles: totalArticles,
        limit: limitNum
      }
    });
  } catch (err) {
    console.error("Failed to fetch articles:", err);
    res.status(500).json({ message: 'Server error while fetching articles.' });
  }
});


// --- 获取单篇文章详情 (GET /api/articles/:slug) ---
router.get('/articles/:slug', async (req, res) => {
  const { slug } = req.params;
  if (!slug) {
      return res.status(400).json({ message: 'Article slug is required.' });
  }

  const query = `
    SELECT
      a.id, a.title, a.slug, a.content, a.cover_image_url, a.created_at, a.updated_at, a.is_featured,
      u.id AS author_id, u.username AS author_username,
      c.id AS country_id, c.name AS country_name, c.slug AS country_slug
    FROM articles a
    JOIN users u ON a.user_id = u.id
    JOIN countries c ON a.country_id = c.id
    WHERE a.slug = $1;
  `;

  try {
    const result = await pool.query(query, [slug]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Article not found.' });
    }

    res.json(result.rows[0]); // 返回找到的文章对象
  } catch (err) {
    console.error("Failed to fetch article details:", err);
    res.status(500).json({ message: 'Server error while fetching article details.' });
  }
});

// --- 更新文章 (PUT /api/articles/:id) ---
router.put('/articles/:id', authenticateToken, async (req, res) => {
  // 1. 获取参数和用户 ID
  const { id } = req.params;
  const { title, content, country_slug, cover_image_url, is_featured } = req.body;
  const userId = req.user.id;
  const articleId = parseInt(id, 10);

  // 2. 验证输入
  if (isNaN(articleId)) {
    return res.status(400).json({ message: 'Invalid article ID.' });
  }
  // 检查是否至少有一个字段需要更新
  if (title === undefined && content === undefined && country_slug === undefined && cover_image_url === undefined && is_featured === undefined) {
      return res.status(400).json({ message: 'No fields provided for update.' });
  }

  // 3. 数据库操作（使用事务）
  const client = await pool.connect();
  try {
    await client.query('BEGIN'); // 开始事务

    // 3.1 检查文章是否存在及所有权
    const checkResult = await client.query('SELECT user_id, title, slug FROM articles WHERE id = $1', [articleId]);
    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK'); client.release();
      return res.status(404).json({ message: 'Article not found.' });
    }
    const article = checkResult.rows[0];
    if (article.user_id !== userId) {
      await client.query('ROLLBACK'); client.release();
      return res.status(403).json({ message: 'You do not have permission to edit this article.' });
    }

    // 3.2 准备更新的字段和值
    const updates = [];
    const values = [];
    let paramIndex = 1;
    let newSlug = article.slug; // 默认使用旧 slug

    // 处理标题和 Slug
    if (title !== undefined && title !== article.title) {
      updates.push(`title = $${paramIndex++}`);
      values.push(title);
      newSlug = await generateUniqueSlug(title); // 如果标题更改，生成新 Slug
      updates.push(`slug = $${paramIndex++}`);
      values.push(newSlug);
    }

    // 处理内容 (清理 HTML)
    if (content !== undefined) {
      const cleanContent = purify.sanitize(content, { USE_PROFILES: { html: true } });
      updates.push(`content = $${paramIndex++}`);
      values.push(cleanContent);
    }

    // 处理国家
    if (country_slug !== undefined) {
      const countryResult = await client.query('SELECT id FROM countries WHERE slug = $1', [country_slug]);
      if (countryResult.rows.length === 0) {
         await client.query('ROLLBACK'); client.release();
         return res.status(400).json({ message: 'Invalid country identifier.' });
      }
      updates.push(`country_id = $${paramIndex++}`);
      values.push(countryResult.rows[0].id);
    }

    // 处理封面图 URL
    if (cover_image_url !== undefined) { // 允许更新为 null 或空字符串
       updates.push(`cover_image_url = $${paramIndex++}`);
       values.push(cover_image_url);
     }

    // 处理精选状态
     if (is_featured !== undefined && typeof is_featured === 'boolean') {
       updates.push(`is_featured = $${paramIndex++}`);
       values.push(is_featured);
     }

    // 如果没有任何实际的更新字段（例如只传入了与原值相同的 title），则不执行更新
    if (updates.length === 0) {
        await client.query('ROLLBACK');
        client.release();
        // 可以返回 304 Not Modified 或直接返回原文章
        return res.status(200).json({ message: 'No changes detected to update.', article: article }); // 返回原文章信息
    }

    // 添加 updated_at 时间戳
    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    // 3.3 执行更新查询
    const updateQuery = `UPDATE articles SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *;`; // 返回更新后的所有列
    values.push(articleId); // 添加 ID 到参数列表末尾
    const result = await client.query(updateQuery, values);

    // 3.4 提交事务
    await client.query('COMMIT');
    client.release(); // 释放连接

    // 4. 返回成功响应
    res.json({ message: 'Article updated successfully.', article: result.rows[0] });

  } catch (err) {
    await client.query('ROLLBACK'); // 出错时回滚
    client.release();
    console.error("Failed to update article:", err);
     if (err.code === '23505' && err.constraint === 'articles_slug_key') { // 唯一约束冲突 (Slug)
       return res.status(400).json({ message: 'The updated title might conflict with an existing article (slug). Please try another title.' });
     }
     // 其他错误处理...
    res.status(500).json({ message: 'Server error, update failed.' });
  }
});

// --- 删除文章 (DELETE /api/articles/:id) ---
router.delete('/articles/:id', authenticateToken, async (req, res) => {
  // 1. 获取参数和用户 ID
  const { id } = req.params;
  const userId = req.user.id;
  const articleId = parseInt(id, 10);

  // 2. 验证输入
  if (isNaN(articleId)) {
    return res.status(400).json({ message: 'Invalid article ID.' });
  }

  // 3. 数据库操作 (使用事务，虽然简单删除可能不需要，但保持一致性)
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 3.1 检查文章是否存在及所有权
    const checkResult = await client.query('SELECT user_id FROM articles WHERE id = $1', [articleId]);
    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK'); client.release();
      return res.status(404).json({ message: 'Article not found.' });
    }
    if (checkResult.rows[0].user_id !== userId) {
       await client.query('ROLLBACK'); client.release();
       return res.status(403).json({ message: 'You do not have permission to delete this article.' });
    }

    // 3.2 执行删除
    const deleteResult = await client.query('DELETE FROM articles WHERE id = $1', [articleId]);

    // 3.3 检查是否真的删除了 (可选)
    if (deleteResult.rowCount === 0) {
        // 理论上不应该发生，因为上面检查过了
        console.warn(`Article with ID ${articleId} was checked but deletion affected 0 rows.`);
    }

    // 3.4 提交事务
    await client.query('COMMIT');
    client.release();

    // 4. 返回成功响应
    res.status(200).json({ message: 'Article deleted successfully.' }); // 200 OK 或 204 No Content

  } catch (err) {
    await client.query('ROLLBACK'); // 出错时回滚
    client.release();
    console.error("Failed to delete article:", err);
    res.status(500).json({ message: 'Server error, deletion failed.' });
  }
});

module.exports = router;

// 确保你有一个 backend/utils/slug.js 文件，内容类似:
/*
// backend/utils/slug.js
const slugify = require('slugify');
const pool = require('../db'); // 确保能访问 db 连接池

async function generateUniqueSlug(title, attempt = 0) {
  let slug = slugify(title, { lower: true, strict: true, remove: /[*+~.()'"!:@]/g }); // 添加 remove 移除非 URL 友好字符
  if (attempt > 0) {
    slug = `${slug}-${attempt}`;
  }
  // 防止 slug 过长 (数据库可能有长度限制)
  slug = slug.substring(0, 250); // 假设 slug 列长度为 255

  try {
    const result = await pool.query('SELECT 1 FROM articles WHERE slug = $1 LIMIT 1', [slug]); // 使用 SELECT 1 更高效
    if (result.rows.length === 0) {
      return slug;
    } else {
      // 如果尝试次数过多，可能需要抛出错误或采取其他策略
      if (attempt > 10) {
         console.error(`Failed to generate unique slug for title "${title}" after ${attempt} attempts.`);
         // 可以返回一个带时间戳的 slug 作为后备
         return `${slugify(title.substring(0, 50), { lower: true, strict: true, remove: /[*+~.()'"!:@]/g })}-${Date.now()}`;
      }
      return await generateUniqueSlug(title, attempt + 1);
    }
  } catch (err) {
    console.error("Error checking slug uniqueness:", err);
    throw new Error("Failed to generate unique slug due to database error.");
  }
}

module.exports = { generateUniqueSlug };
*/