// routes/articles.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/auth'); // 保持不变
const slugify = require('slugify');

// --- Helper function to generate unique slugs ---
async function generateUniqueSlug(title, attempt = 0) {
  let slug = slugify(title, { lower: true, strict: true });
  if (attempt > 0) {
    slug = `${slug}-${attempt}`;
  }
  try {
    const result = await pool.query('SELECT id FROM articles WHERE slug = $1', [slug]);
    if (result.rows.length === 0) {
      return slug; // Slug is unique
    } else {
      // Slug exists, try appending a number
      return await generateUniqueSlug(title, attempt + 1);
    }
  } catch (err) {
    console.error("Error checking slug uniqueness:", err);
    throw new Error("Failed to generate unique slug"); // Rethrow or handle appropriately
  }
}


// --- 文章创建 (POST /api/articles) - (修改版) ---
router.post('/articles', authenticateToken, async (req, res) => {
  // 从请求体获取数据
  const { title, content, country_slug, cover_image_url } = req.body;
  // 从认证中间件获取用户 ID
  const userId = req.user.id;

  // 基本验证
  if (!title || !content || !country_slug) {
    return res.status(400).json({ message: '标题、内容和国家不能为空' });
  }

  try {
    // 1. 根据 country_slug 查询 country_id
    const countryResult = await pool.query('SELECT id FROM countries WHERE slug = $1', [country_slug]);
    if (countryResult.rows.length === 0) {
      return res.status(400).json({ message: '无效的国家标识符' });
    }
    const countryId = countryResult.rows[0].id;

    // 2. 生成唯一的 slug
    const slug = await generateUniqueSlug(title);

    // 3. 插入文章数据到数据库
    const insertQuery = `
      INSERT INTO articles (user_id, country_id, title, content, cover_image_url, slug)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, title, slug, created_at, cover_image_url, country_id, user_id;
    `;
    const result = await pool.query(insertQuery, [userId, countryId, title, content, cover_image_url, slug]);

    // 4. 返回成功响应，包含部分新文章信息
    res.status(201).json({ message: '文章已发布', article: result.rows[0] });

  } catch (err) {
    console.error("发布文章失败:", err);
    // 检查是否是唯一约束错误（例如 slug 重复，虽然我们试图避免）
    if (err.code === '23505') { // PostgreSQL unique violation code
         return res.status(400).json({ message: '文章标题可能已存在，请尝试修改标题' });
    }
    res.status(500).json({ message: '服务器错误，发布失败' });
  }
});

// --- 获取国家列表 (GET /api/countries) ---
router.get('/countries', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, slug FROM countries ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error("获取国家列表失败:", err);
    res.status(500).json({ message: '服务器错误' });
  }
});


// --- 获取文章列表 (GET /api/articles) ---
router.get('/articles', async (req, res) => {
  const { country, page = 1, limit = 10, featured } = req.query; // 获取查询参数

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);

  // 基本验证
  if (isNaN(pageNum) || pageNum < 1) {
    return res.status(400).json({ message: '页码必须是正整数' });
  }
  if (isNaN(limitNum) || limitNum < 1 || limitNum > 50) { // 限制每页最多50条
    return res.status(400).json({ message: '每页数量必须在1到50之间' });
  }

  const offset = (pageNum - 1) * limitNum;
  let queryParams = [limitNum, offset];
  let whereClauses = [];
  let paramIndex = 3; // Start parameter index after LIMIT and OFFSET

  // 构建基础查询语句
  let baseQuery = `
    SELECT
      a.id, a.title, a.slug, a.cover_image_url, a.created_at, a.is_featured,
      u.id AS author_id, u.username AS author_username,
      c.id AS country_id, c.name AS country_name, c.slug AS country_slug
    FROM articles a
    JOIN users u ON a.user_id = u.id
    JOIN countries c ON a.country_id = c.id
  `;

  // 添加过滤条件
  if (country) {
    whereClauses.push(`c.slug = $${paramIndex}`);
    queryParams.push(country);
    paramIndex++;
  }
  if (featured === 'true') {
     whereClauses.push(`a.is_featured = true`);
     // No parameter needed for boolean literal
  }

  // 组合 WHERE 子句
  if (whereClauses.length > 0) {
    baseQuery += ' WHERE ' + whereClauses.join(' AND ');
  }

  // 添加排序和分页
  const articlesQuery = baseQuery + ' ORDER BY a.created_at DESC LIMIT $1 OFFSET $2';

  // 同时查询总数，以便前端分页
  let countQuery = `SELECT COUNT(*) FROM articles a`;
  if (country || featured === 'true') {
     countQuery += ` JOIN countries c ON a.country_id = c.id`; // Join necessary if filtering by country
     if (whereClauses.length > 0) {
         // Reuse the WHERE clause, but adjust parameter indices if needed (here they match the filtering logic)
         let countWhereClause = whereClauses.join(' AND ');
         // Need to replace $${paramIndex} with the correct index for the count query parameters
         let countQueryParams = [];
         let currentCountParamIndex = 1;
         if (country) {
             countWhereClause = countWhereClause.replace(`$${paramIndex-1}`, `$${currentCountParamIndex}`); // Adjust index if country was added
             countQueryParams.push(country);
             currentCountParamIndex++;
         }
          // 'is_featured' doesn't use a parameter here
         countQuery += ' WHERE ' + countWhereClause;
         queryParams = [...countQueryParams]; // Reset queryParams for count query if filters exist
     } else {
         queryParams = []; // No filters, no params for count
     }
  } else {
     queryParams = []; // No filters, no params for count
  }


  try {
    // 执行两个查询
    const [articlesResult, countResult] = await Promise.all([
      pool.query(articlesQuery, [limitNum, offset, ...(queryParams.slice(2))]), // Pass filter params correctly
      pool.query(countQuery, queryParams) // Pass filter params for count
    ]);

    const totalArticles = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalArticles / limitNum);

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
    console.error("获取文章列表失败:", err);
    res.status(500).json({ message: '服务器错误' });
  }
});


// --- 获取单篇文章详情 (GET /api/articles/:slug) ---
router.get('/articles/:slug', async (req, res) => {
  const { slug } = req.params;

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
      return res.status(404).json({ message: '文章未找到' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("获取文章详情失败:", err);
    res.status(500).json({ message: '服务器错误' });
  }
});

// --- 更新文章 (PUT /api/articles/:id) ---
// 注意：使用 ID 而不是 slug 来定位要更新的文章更可靠，因为 slug 可能因标题更改而改变。
router.put('/articles/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { title, content, country_slug, cover_image_url, is_featured } = req.body;
  const userId = req.user.id; // 来自 JWT
  const articleId = parseInt(id, 10);

  if (isNaN(articleId)) {
    return res.status(400).json({ message: '无效的文章 ID' });
  }

  // 验证至少有一个字段要更新
  if (!title && !content && !country_slug && cover_image_url === undefined && is_featured === undefined) {
       return res.status(400).json({ message: '没有提供要更新的字段' });
   }


  const client = await pool.connect(); // 使用事务确保原子性

  try {
    await client.query('BEGIN'); // 开始事务

    // 1. 检查文章是否存在以及用户是否有权编辑
    const checkResult = await client.query('SELECT user_id, title FROM articles WHERE id = $1', [articleId]);
    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(404).json({ message: '文章未找到' });
    }
    const article = checkResult.rows[0];
    if (article.user_id !== userId) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(403).json({ message: '无权修改此文章' });
    }

    // 2. 准备更新字段
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (title !== undefined && title !== article.title) { // 只有在标题实际更改时才更新
      updates.push(`title = $${paramIndex}`);
      values.push(title);
      paramIndex++;
      // 如果标题变了，重新生成 slug
      const newSlug = await generateUniqueSlug(title);
      updates.push(`slug = $${paramIndex}`);
      values.push(newSlug);
      paramIndex++;
    }

    if (content !== undefined) {
      updates.push(`content = $${paramIndex}`);
      values.push(content);
      paramIndex++;
    }

    if (country_slug !== undefined) {
      const countryResult = await client.query('SELECT id FROM countries WHERE slug = $1', [country_slug]);
      if (countryResult.rows.length === 0) {
         await client.query('ROLLBACK');
         client.release();
        return res.status(400).json({ message: '无效的国家标识符' });
      }
      updates.push(`country_id = $${paramIndex}`);
      values.push(countryResult.rows[0].id);
      paramIndex++;
    }

     if (cover_image_url !== undefined) { // Allow setting it to null or empty string if needed
       updates.push(`cover_image_url = $${paramIndex}`);
       values.push(cover_image_url);
       paramIndex++;
     }

     if (is_featured !== undefined && typeof is_featured === 'boolean') {
       updates.push(`is_featured = $${paramIndex}`);
       values.push(is_featured);
       paramIndex++;
     }

    // 确保有内容更新才执行
    if (updates.length === 0) {
        await client.query('ROLLBACK');
        client.release();
        // Technically not an error, but nothing changed.
        // You might want to return the existing article or a 304 Not Modified status,
        // but for simplicity, we'll return a message.
        return res.status(200).json({ message: '没有内容需要更新' });
    }


    // 添加 updated_at (触发器会自动处理，但显式添加也无妨)
    // updates.push(`updated_at = CURRENT_TIMESTAMP`); // 如果没有触发器，需要手动更新

    // 3. 执行更新
    const updateQuery = `UPDATE articles SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    values.push(articleId); // 添加 ID 到参数列表末尾

    const result = await client.query(updateQuery, values);

    await client.query('COMMIT'); // 提交事务
    client.release(); // 释放连接回连接池

    res.json({ message: '文章已更新', article: result.rows[0] });

  } catch (err) {
    await client.query('ROLLBACK'); // 出错时回滚
    client.release();
    console.error("更新文章失败:", err);
     if (err.code === '23505') { // unique_violation (likely slug)
       return res.status(400).json({ message: '更新后的标题可能导致重复，请尝试其他标题' });
     }
    res.status(500).json({ message: '服务器错误，更新失败' });
  }
});

// --- 删除文章 (DELETE /api/articles/:id) ---
router.delete('/articles/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id; // 来自 JWT
  const articleId = parseInt(id, 10);

   if (isNaN(articleId)) {
     return res.status(400).json({ message: '无效的文章 ID' });
   }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. 检查文章是否存在以及用户是否有权删除
    const checkResult = await client.query('SELECT user_id FROM articles WHERE id = $1', [articleId]);
    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(404).json({ message: '文章未找到' });
    }
    if (checkResult.rows[0].user_id !== userId) {
       await client.query('ROLLBACK');
       client.release();
      return res.status(403).json({ message: '无权删除此文章' });
    }

    // 2. 执行删除
    await client.query('DELETE FROM articles WHERE id = $1', [articleId]);

    await client.query('COMMIT');
    client.release();

    res.status(200).json({ message: '文章已删除' }); // 使用 200 OK 或 204 No Content

  } catch (err) {
    await client.query('ROLLBACK');
    client.release();
    console.error("删除文章失败:", err);
    res.status(500).json({ message: '服务器错误，删除失败' });
  }
});

module.exports = router;