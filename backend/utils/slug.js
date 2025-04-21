// 本来在routes/articles.js中:

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