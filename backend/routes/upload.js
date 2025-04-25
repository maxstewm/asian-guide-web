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
    if (gcsError) {
        client.release(); // 释放连接
        return res.status(500).json({ message: 'Image upload failed during GCS transfer.' });
    }

    const publicUrl = `https://storage.googleapis.com/${bucketName}/${gcsFileName}`;
    console.log(`图片上传成功 (article: ${articleId}): ${publicUrl}`);
    
    let dbClient; // <--- 在回调内部定义一个新的 client 变量
    // --- 数据库操作：插入图片记录并可能更新主图 URL ---
    try {
      dbClient = await pool.connect(); // <-- 在回调内部获取连接
      await dbClient.query('BEGIN'); // 开始事务

      // 5.1 检查这篇文章是否已经有关联图片
      const imageCountResult = await dbClient.query('SELECT COUNT(*) as count FROM article_images WHERE article_id = $1', [articleId]);
      const existingImageCount = parseInt(imageCountResult.rows[0].count, 10);
      const isFirstImage = existingImageCount === 0; // 判断这是否是第一张图

      // 5.2 插入新的图片记录到 article_images
      // 使用 existingImageCount 作为简单的顺序值
      const uploadOrder = existingImageCount;
      const insertImageQuery = `
        INSERT INTO article_images (article_id, image_url, upload_order)
        VALUES ($1, $2, $3)
        RETURNING id, image_url;
      `;
      const insertResult = await dbClient.query(insertImageQuery, [articleId, publicUrl, uploadOrder]);
      const savedImage = insertResult.rows[0];
      console.log(`Image metadata saved to article_images. ID: ${savedImage.id}`);

      // 5.3 如果是第一张图片，则更新 articles 表的 main_image_url
      if (isFirstImage) {
        const updateArticleQuery = `
          UPDATE articles SET main_image_url = $1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $2;
        `;
        await dbClient.query(updateArticleQuery, [publicUrl, articleId]);
        console.log(`Article ${articleId} main_image_url updated to ${publicUrl}`);
      }

      await dbClient.query('COMMIT'); // 提交事务

      res.json({
          message: 'Image uploaded and saved successfully!',
          image: savedImage // 返回保存的图片信息
      });

    } catch (dbError) {
      await dbClient.query('ROLLBACK'); // 数据库操作出错，回滚事务
      console.error(`保存图片信息或更新主图失败 (article: ${articleId}):`, dbError);
      // 尝试删除已上传的 GCS 文件 (Best effort)
      try {
          await file.delete();
          console.log(`Rolled back GCS upload for ${gcsFileName}`);
      } catch (gcsDeleteError) {
           console.error(`Failed to delete GCS object ${gcsFileName} after DB error:`, gcsDeleteError);
      }
      res.status(500).json({ message: 'Image uploaded but failed to save metadata or update main image.' });
    } finally {
      if (dbClient) dbClient.release(); // <--- 释放 dbClient
    }
  }); // end stream.on('finish')

  // 写入 stream (不变)
  stream.end(req.file.buffer);

} catch (err) { // 捕获顶层错误 (例如权限检查)
    console.error(`图片上传处理失败 (article: ${articleId}):`, err);
    //client.release(); // 确保释放连接
    res.status(500).json({ message: 'Image upload processing failed.' });
}
});

// --- (可选) 删除图片的 API ---
// DELETE /api/upload/image/:imageId
router.delete('/image/:imageId', authenticateToken, async (req, res) => {
  const idParam = req.params.imageId;
  const imageId = parseInt(idParam, 10);
  // --- 手动验证 ID ---
  if (isNaN(imageId) || String(imageId) !== idParam) {
       return res.status(400).json({ message: 'Invalid image ID format. Must be an integer.' });
  }

  const userId = req.user.id;
  const client = await pool.connect(); // 获取连接
  try {
      await client.query('BEGIN');
      // 1. 查询图片信息和权限
      const imageQuery = `
          SELECT ai.image_url, ai.article_id, a.user_id, a.main_image_url
          FROM article_images ai
          JOIN articles a ON ai.article_id = a.id
          WHERE ai.id = $1;
      `;
      const imageResult = await client.query(imageQuery, [imageId]);
      if (imageResult.rows.length === 0) {
          await client.query('ROLLBACK');
          client.release();
          return res.status(404).json({ message: 'Image not found.' });
      }
      const imageData = imageResult.rows[0];
      if (imageData.user_id !== userId) {
          await client.query('ROLLBACK');
          client.release();
          return res.status(403).json({ message: 'Permission denied to delete this image.' });
      }

      const { image_url: imageUrlToDelete, article_id: articleId, main_image_url: currentMainImageUrl } = imageData;

      // 2. 从数据库删除图片记录
      await client.query('DELETE FROM article_images WHERE id = $1', [imageId]);
      console.log(`Deleted image record ${imageId} from database for article ${articleId}.`);

      // 3. 从 GCS 删除文件
      let gcsFileName = null;
      try {
        const urlParts = new URL(imageUrlToDelete);
          // 修正 GCS 文件名解析 (移除第一个 /)
          gcsFileName = urlParts.pathname.startsWith('/') ? urlParts.pathname.substring(1) : urlParts.pathname;
          // 再次分割并移除 bucket name
          gcsFileName = gcsFileName.split('/').slice(1).join('/');

          if (gcsFileName && bucketName) {// 确保有 bucketName
              console.log(`Attempting to delete GCS object: ${gcsFileName} in bucket ${bucketName}`);
              await storage.bucket(bucketName).file(gcsFileName).delete();
              console.log(`GCS object deleted: ${gcsFileName}`);
          } else {
              console.warn("Could not determine GCS file name from URL or bucket name missing.");
          }
      } catch (gcsDeleteError) {
        console.error(`Failed to delete GCS object ${imageUrlToDelete}:`, gcsDeleteError);
          // 根据策略决定是否回滚
          // await client.query('ROLLBACK');
          // client.release();
          // return res.status(500).json({ message: 'Failed to delete image from storage, database changes rolled back.' });
      }

      // 4. 检查是否删除了主图
      let newMainImageUrl = currentMainImageUrl; // 先假设主图不变
      if (imageUrlToDelete === currentMainImageUrl) { // 如果删除的是当前主图
        console.log(`Image ${imageId} was the main image for article ${articleId}. Finding replacement...`);
        // 需要从剩下的图片中选择一张作为新的主图
        // 策略：选择剩下图片中 order 最小（或上传最早）的一张
        const nextImageQuery = `
            SELECT image_url
            FROM article_images
            WHERE article_id = $1
            ORDER BY upload_order ASC, uploaded_at ASC -- 优先按指定顺序，其次按上传时间
            LIMIT 1;
        `;
        const nextImageResult = await client.query(nextImageQuery, [articleId]);

        if (nextImageResult.rows.length > 0) {
            // 找到了替代的主图
            newMainImageUrl = nextImageResult.rows[0].image_url;
            console.log(`Found replacement main image: ${newMainImageUrl}`);
        } else {
            // 没有其他图片了，主图设为 NULL
            newMainImageUrl = null;
            console.log("No remaining images found, setting main_image_url to NULL.");
        }

        // 执行更新 articles 表的操作
        await client.query(
            'UPDATE articles SET main_image_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [newMainImageUrl, articleId]
        );
        console.log(`Article ${articleId} main_image_url updated to: ${newMainImageUrl}`);
    } else {
        console.log(`Deleted image ${imageId} was not the main image. Main image remains: ${currentMainImageUrl}`);
    }
    // --- 结束主图更新逻辑 ---

    await client.query('COMMIT'); // 提交事务
    res.json({ message: 'Image deleted successfully.', newMainImageUrl: newMainImageUrl }); // 可以选择性返回新的主图URL

} catch (err) {
    await client.query('ROLLBACK');
    console.error(`Failed to delete image ${imageId}:`, err);
    res.status(500).json({ message: 'Failed to delete image.' });
} finally {
    client.release();
}
});

module.exports = router; // 或在 app.js 中定义 app.delete(...)