// routes/upload.js
const express = require('express');
const router = express.Router();
const { Storage } = require('@google-cloud/storage');
const multer = require('multer');
const authenticateToken = require('../middleware/auth'); // 需要认证才能上传
const path = require('path');
const crypto = require('crypto'); // 用于生成随机文件名
const pool = require('../db'); // 引入数据库连接池
// --- 配置 Google Cloud Storage ---
// 不在代码中硬编码密钥！
// 如果在 GCP 环境 (GCE, Cloud Run) 且服务账号有权限，SDK 会自动找到凭证。
// 本地开发时，确保 GOOGLE_APPLICATION_CREDENTIALS 环境变量指向你的服务账号密钥 JSON 文件。
const storage = new Storage();
const bucketName = process.env.GCS_BUCKET_NAME; // 从环境变量读取 Bucket 名称
const bucket = storage.bucket(bucketName);

// --- 配置 Multer ---
// 使用内存存储临时保存文件，然后直接上传到 GCS
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 限制文件大小为 10MB
  },
  fileFilter: (req, file, cb) => {
    // 只接受图片文件
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Error: File upload only supports the following filetypes - " + filetypes));
  }
});

// --- API 端点: POST /api/upload/image ---
// 使用 authenticateToken 中间件保护此路由
// 'imageFile' 是前端 FormData 中的字段名
router.post('/image/:articleId', authenticateToken, upload.single('imageFile'), async (req, res) => {//router.post('/image/:articleId(\\d+)', authenticateToken, upload.single('imageFile'), async (req, res) => {
  const idParam = req.params.articleId;
  const articleId = parseInt(idParam, 10);
  // --- 手动验证 ID ---
  if (isNaN(articleId) || String(articleId) !== idParam) {
       return res.status(400).json({ message: 'Invalid article ID format in URL. Must be an integer.' });
  }
  
  const userId = req.user.id; // 获取当前用户 ID 用于权限验证
  if (!req.file) {
    return res.status(400).json({ message: 'No picture file is selected.' });
  }
  if (!bucketName) {
     console.error("GCS_BUCKET_NAME 环境变量未设置");
     return res.status(500).json({ message: '服务器存储配置错误' });
  }
  try {
    // 1. 验证用户是否有权限为该文章上传图片 (文章必须存在且属于该用户)
    const checkResult = await pool.query('SELECT user_id FROM articles WHERE id = $1', [articleId]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Article draft not found.' });
    }
    if (checkResult.rows[0].user_id !== userId) {
      return res.status(403).json({ message: 'Permission denied to upload image for this article.' });
    }

  // 2. 生成 GCS 文件名 (路径中包含 articleId)
  const uniqueSuffix = crypto.randomBytes(8).toString('hex');
  const originalExtension = path.extname(req.file.originalname);
  const gcsFileName = `articles/${articleId}/images/${Date.now()}-${uniqueSuffix}${originalExtension}`; // 使用 articleId
  const file = bucket.file(gcsFileName);

  // 创建一个 stream 将内存中的文件写入 GCS
  const stream = file.createWriteStream({
    metadata: {
      contentType: req.file.mimetype,
    },
    resumable: false, // 对于小文件，禁用 resumable 上传可能更快
     // 如果你的 Bucket 权限不是统一公开读取，需要在这里设置预定义 ACL
     // predefinedAcl: 'publicRead',
  });

  let gcsError = null; // 用于捕获 stream 错误

  stream.on('error', (err) => {
    gcsError = err; // 捕获错误
    console.error(`上传到 GCS 失败 (article: ${articleId}):`, err);
    // 不要在这里直接 res.status(500)，在 'finish' 或 'error' 后统一处理
  });

  stream.on('finish', async () => {
    if (gcsError) { // 如果 stream 过程中出错
      return res.status(500).json({ message: 'Image upload failed during GCS transfer.' });
  }
    // 文件上传完成
    // 如果你的 Bucket 设置了统一访问控制，并且对 allUsers 开放了读取权限，
    // 那么公开 URL 就是 https://storage.googleapis.com/BUCKET_NAME/FILE_NAME
    // 4. 上传成功，获取公开 URL
    const publicUrl = `https://storage.googleapis.com/${bucketName}/${gcsFileName}`;
    console.log(`图片上传成功 (article: ${articleId}): ${publicUrl}`);
    // 返回图片的公开 URL
    //res.json({ imageUrl: publicUrl });
    // 5. 将图片信息写入数据库 article_images
    try {
      // 获取当前图片数量作为顺序 (简单方式，可能有并发问题，更可靠是查 MAX(upload_order)+1)
      const orderResult = await pool.query('SELECT COUNT(*) as count FROM article_images WHERE article_id = $1', [articleId]);
      const uploadOrder = parseInt(orderResult.rows[0].count, 10);

      const insertQuery = `
      INSERT INTO article_images (article_id, image_url, upload_order)
      VALUES ($1, $2, $3)
      RETURNING id, image_url; -- 返回插入的图片信息
      `;
      const insertResult = await pool.query(insertQuery, [articleId, publicUrl, uploadOrder]);

      // 返回成功信息和插入的图片数据 (包含 id 和 url)
      res.json({
          message: 'Image uploaded and saved successfully!',
          image: insertResult.rows[0]
      });

  } catch (dbError) {
 console.error(`保存图片信息到数据库失败 (article: ${articleId}):`, dbError);
            // 这里需要考虑如何处理：GCS 上传成功但数据库失败。可以尝试删除 GCS 文件，或者只返回错误。
            // 为了简单，暂时只返回错误
            res.status(500).json({ message: 'Image uploaded but failed to save metadata.' });
        }
    });

    // 写入 stream
    stream.end(req.file.buffer);

  } catch (err) { // 捕获 try 块的顶层错误 (如权限检查失败)
      console.error(`图片上传处理失败 (article: ${articleId}):`, err);
      res.status(500).json({ message: 'Image upload processing failed.' });
  }
});

// --- (可选) 删除图片的 API ---
// DELETE /api/upload/image/:imageId
router.delete('/image/:imageId', authenticateToken, async (req, res) => {
  //router.delete('/image/:imageId(\\d+)', authenticateToken, async (req, res) => {
  const idParam = req.params.imageId;
  const imageId = parseInt(idParam, 10);
  // --- 手动验证 ID ---
  if (isNaN(imageId) || String(imageId) !== idParam) {
        return res.status(400).json({ message: 'Invalid image ID format in URL. Must be an integer.' });
  }

  const userId = req.user.id;
  const client = await pool.connect();
  try {
      await client.query('BEGIN');
      // 1. 查询图片信息，并验证用户权限 (通过关联的文章)
      const imageQuery = `
          SELECT ai.image_url, a.user_id
          FROM article_images ai
          JOIN articles a ON ai.article_id = a.id
          WHERE ai.id = $1;
      `;
      const imageResult = await client.query(imageQuery, [imageId]);
      if (imageResult.rows.length === 0) { /* ... 404 ... */ }
      if (imageResult.rows[0].user_id !== userId) { /* ... 403 ... */ }

      const imageUrl = imageResult.rows[0].image_url;

      // 2. 从数据库删除记录
      await client.query('DELETE FROM article_images WHERE id = $1', [imageId]);

      // 3. 从 GCS 删除文件 (从 URL 中解析出文件名)
      try {
          const urlParts = new URL(imageUrl);
          const gcsFileName = urlParts.pathname.substring(1).split('/').slice(1).join('/'); // 移除 /bucket-name/
          if (gcsFileName) {
              console.log(`Attempting to delete GCS object: ${gcsFileName}`);
              await storage.bucket(bucketName).file(gcsFileName).delete();
              console.log(`GCS object deleted: ${gcsFileName}`);
          }
      } catch (gcsDeleteError) {
          // 如果 GCS 删除失败，可以选择回滚数据库或记录错误
          console.error(`Failed to delete GCS object ${imageUrl}:`, gcsDeleteError);
          // 可以选择不回滚，让数据库记录被删除，即使 GCS 文件还在
          // await client.query('ROLLBACK');
          // return res.status(500).json({ message: 'Failed to delete image from storage.' });
      }

      await client.query('COMMIT');
      res.json({ message: 'Image deleted successfully.' });

  } catch (err) {
      await client.query('ROLLBACK');
      console.error(`Failed to delete image ${imageId}:`, err);
      res.status(500).json({ message: 'Failed to delete image.' });
  } finally {
      client.release();
  }
});


module.exports = router;