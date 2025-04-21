// routes/upload.js
const express = require('express');
const router = express.Router();
const { Storage } = require('@google-cloud/storage');
const multer = require('multer');
const authenticateToken = require('../middleware/auth'); // 需要认证才能上传
const path = require('path');
const crypto = require('crypto'); // 用于生成随机文件名

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
router.post('/image', authenticateToken, upload.single('imageFile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: '未选择任何图片文件' });
  }
  if (!bucketName) {
     console.error("GCS_BUCKET_NAME 环境变量未设置");
     return res.status(500).json({ message: '服务器存储配置错误' });
  }


  // 生成唯一的文件名，避免冲突
  const uniqueSuffix = crypto.randomBytes(8).toString('hex');
  const originalExtension = path.extname(req.file.originalname);
  const gcsFileName = `articles/images/${Date.now()}-${uniqueSuffix}${originalExtension}`;
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

  stream.on('error', (err) => {
    console.error('上传到 GCS 失败:', err);
    res.status(500).json({ message: '图片上传失败' });
  });

  stream.on('finish', async () => {
    // 文件上传完成
    // 如果你的 Bucket 设置了统一访问控制，并且对 allUsers 开放了读取权限，
    // 那么公开 URL 就是 https://storage.googleapis.com/BUCKET_NAME/FILE_NAME
     const publicUrl = `https://storage.googleapis.com/${bucketName}/${gcsFileName}`;

     // 或者，如果你需要签名的 URL (有时间限制，更安全，但不适合直接嵌入文章)
     // const [signedUrl] = await file.getSignedUrl({ action: 'read', expires: '03-09-2500' });

    console.log(`图片上传成功: ${publicUrl}`);
    // 返回图片的公开 URL
    res.json({ imageUrl: publicUrl });
  });

  // 将内存中的 buffer 写入 stream
  stream.end(req.file.buffer);
});

module.exports = router;