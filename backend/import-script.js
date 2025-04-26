// backend/import-script.js
/*
  npm install gray-matter --save
  npm install marked --save
  npm install slugify --save
  导入脚本
  1. 从 import_data 目录读取文章和用户信息
  2. 解析 Markdown 文件，提取标题、日期、正文等信息
  3. 处理图片，上传到 GCS 并生成 URL
  4. 处理分类，确保分类存在并获取其 ID
  5. 处理标签，确保标签存在并获取其 ID
  6. 插入文章到数据库
  7. 处理用户信息，确保用户存在并获取其 ID
  8. 插入文章与用户的关系
  9. 输出导入结果
*/
// backend/import-script.js
const fsPromises = require('fs').promises; // 保留 Promise 版本用于异步操作
const fs = require('fs'); // 引入标准的、包含同步方法的 fs 模块
const path = require('path');
const matter = require('gray-matter'); // 解析 Front Matter (npm install gray-matter --save)
// const marked = require('marked'); // 如果需要将 Markdown 转为 HTML (npm install marked --save)
const { Storage } = require('@google-cloud/storage');
const pool = require('./db'); // 你的数据库连接池
const { generateUniqueSlug } = require('./utils/slug'); // Slug 生成工具 (确保文件存在且导出正确)
const { faker } = require('@faker-js/faker'); // 用于生成随机内容 (如果需要) (npm install @faker-js/faker --save-dev)
// const DOMPurify = require('dompurify'); // 如果需要清理 HTML (npm install dompurify jsdom --save)
// const { JSDOM } = require('jsdom');
// const window = new JSDOM('').window;
// const purify = DOMPurify(window);
console.log("Script directory (__dirname):", __dirname);
// --- 配置 ---
const storage = new Storage(); // GCS 客户端，会自动使用 GCE 服务账号凭证
const bucketName = process.env.GCS_BUCKET_NAME; // 从 .env 读取 GCS Bucket 名称
if (!bucketName) {
    console.error("Error: GCS_BUCKET_NAME environment variable is not set.");
    process.exit(1); // 关键配置缺失，退出
}
const bucket = storage.bucket(bucketName);
const USERS_FILE = path.join(__dirname, 'import-users.json'); // 用户信息文件路径
const DEFAULT_IMPORT_DIR = path.resolve(__dirname, '..', '..', 'import_data'); // 默认导入目录
console.log("Calculated DEFAULT_IMPORT_DIR:", DEFAULT_IMPORT_DIR); // <-- 添加日志
// --- 全局变量 ---
let availableUsers = []; // 存储加载的用户信息 [{id, username, email}, ...]
let countriesMap = {};   // 存储国家名称/slug 到 ID 的映射 { 'japan': 1, '日本': 1, ... }
let processedCount = 0;  // 处理的文件夹总数（尝试处理）
let skippedCount = 0;    // 因重复、缺少数据或无 .md 文件而跳过的数量
let successCount = 0;    // 成功导入数据库的文章数量
let errorCount = 0;      // 处理过程中发生错误的数量

/**
 * 上传本地文件到 Google Cloud Storage
 * @param {string} localPath 本地文件完整路径
 * @param {number} articleId 文章数据库 ID (用于构建 GCS 路径)
 * @param {string} fileName 文件名
 * @returns {Promise<string>} GCS 公开访问 URL
 */
async function uploadImageToGCS(localPath, articleId, fileName) {
  // 构建 GCS 上的存储路径，包含文章 ID 以便区分
  const gcsPath = `articles/${articleId}/images/${Date.now()}-${path.basename(fileName)}`; // 添加时间戳增加唯一性
  try {
    const [file] = await bucket.upload(localPath, {
      destination: gcsPath,
      // 如果你的 Bucket 不是统一公开访问，需要设置这个让图片可公开读
      // predefinedAcl: 'publicRead',
      metadata: {
        // 可以设置缓存控制等元数据
        // cacheControl: 'public, max-age=31536000',
      },
    });
    // 构建公开 URL
    const publicUrl = `https://storage.googleapis.com/${bucketName}/${gcsPath}`;
    console.log(`  Uploaded ${fileName} to ${publicUrl}`);
    return publicUrl;
  } catch (err) {
    console.error(`  Failed to upload ${fileName} to GCS:`, err.message || err);
    // 让上层函数知道上传失败
    throw new Error(`Failed to upload image ${fileName}: ${err.message}`);
  }
}

/**
 * 处理单个包含 .md 文件的文章文件夹
 * @param {string} articleFolderPath 文章文件夹的完整路径
 */
async function processArticle(articleFolderPath) {
  processedCount++;
  console.log(`\nProcessing article folder: ${articleFolderPath}`);

  // 查找目录下的第一个 .md 文件
  let mdFileName = null;
  let filesInDir = [];
  try {
      filesInDir = await fsPromises.readdir(articleFolderPath); // <-- 改成 fsPromises.readdir
      const mdFiles = filesInDir.filter(f => f.toLowerCase().endsWith('.md'));
      if (mdFiles.length > 0) {
          mdFileName = mdFiles[0]; // 取第一个找到的
      } else {
          console.warn(`  Skipping: No .md file found in ${articleFolderPath}`);
          skippedCount++;
          return;
      }
  } catch(e) {
      console.error(`  Skipping: Error reading directory ${articleFolderPath}`, e);
      skippedCount++; // 计入跳过
      errorCount++; // 也计入错误
      return;
  }
  const mdFilePath = path.join(articleFolderPath, mdFileName);
  console.log(`  Using markdown file: ${mdFileName}`);

  // --- 解析 Markdown ---
  let frontMatter, title, date, countryNameOrSlug, typeFromFile, articleContent;
  try {
      const mdContent = await fsPromises.readFile(mdFilePath, { encoding: 'utf8' });

      const parsed = matter(mdContent);
      frontMatter = parsed.data || {};
      const fullContentAfterFrontMatter = parsed.content || ''; // 获取 Front Matter 之后的所有内容

        // --- **修改内容提取逻辑** ---
        // 查找第一个 ![pic_1.jpg](...) 出现的位置
      const firstImageMarkdownMatch = fullContentAfterFrontMatter.match(/!\[pic_1\.jpg\]\(.*?\)/i); // 匹配 ![pic_1.jpg](...)，忽略大小写
      const endOfContentIndex = firstImageMarkdownMatch ? firstImageMarkdownMatch.index : -1; // 获取匹配开始的位置

        if (endOfContentIndex !== -1) {
            // 如果找到了标记，只截取它之前的内容
            articleContent = fullContentAfterFrontMatter.substring(0, endOfContentIndex).trim();
             console.log(`  Extracted content up to the first ![pic_1.jpg] marker.`);
        } else {
            // 如果没有找到标记，使用 Front Matter 之后的所有内容 (或者根据需要报错/跳过)
            articleContent = fullContentAfterFrontMatter.trim();
            console.log(`  Warning: ![pic_1.jpg] marker not found in ${mdFileName}. Using all content after front matter.`);
        }

      title = frontMatter.title;
      date = frontMatter.date ? new Date(frontMatter.date) : new Date(); // 处理日期，无效则用当前时间
      countryNameOrSlug = frontMatter.categories; // 从 categories 获取国家
      // --- 正确的比较 ---
      if (countryNameOrSlug === "South Korea") { // <-- 使用 === 进行比较
        console.log(`  Mapping "South Korea" to "south-korea" for article: ${title}`); // 添加日志
        countryNameOrSlug = "south-korea"; // 进行赋值转换
      }
      // 从 type 字段获取，映射到数据库值，默认为 travel
      typeFromFile = frontMatter.type?.toLowerCase() === 'food' ? 'food' : 'travel';

      // 检查必要字段
      if (!title || !countryNameOrSlug) {
        console.warn(`  Skipping: Missing 'title' or 'categories' in front matter of ${mdFilePath}`);
        skippedCount++;
        return;
      }
  } catch(e) {
       console.error(`  Skipping: Error parsing markdown file ${mdFilePath}`, e);
       skippedCount++;
       errorCount++;
       return;
  }

  console.log(`  Article Title: "${title}"`);

  // --- 排重检查 (根据标题) ---
  try {
      const checkQuery = 'SELECT id FROM articles WHERE title = $1 LIMIT 1';
      const checkResult = await pool.query(checkQuery, [title]);
      if (checkResult.rows.length > 0) {
          console.log(`  Skipping: Article with title "${title}" already exists (ID: ${checkResult.rows[0].id}).`);
          skippedCount++;
          return;
      }
  } catch (err) {
       console.error(`  Error checking for existing article "${title}":`, err);
       errorCount++;
       return; // 无法检查，跳过
  }

  // --- 分配随机用户 ---
  if (availableUsers.length === 0) {
      console.error("  Error: No users loaded from file. Cannot assign author.");
      errorCount++;
      return;
  }
  const randomUserIndex = Math.floor(Math.random() * availableUsers.length);
  const assignedUser = availableUsers[randomUserIndex];
  const userId = assignedUser.id; // 使用从文件加载的用户 ID
  if (!userId) {
      console.error(`  Error: User ${assignedUser.username} loaded from file is missing an ID.`);
      errorCount++;
      return;
  }
  console.log(`  Assigning author: ${assignedUser.username} (ID: ${userId})`);

  // --- 获取 country_id ---
  const countryId = countriesMap[countryNameOrSlug?.toLowerCase()] || countriesMap[countryNameOrSlug];
  if (!countryId) {
       console.error(`  Skipping: Country "${countryNameOrSlug}" not found in database map for article: ${title}`);
       skippedCount++;
       return;
  }
  console.log(`  Country ID: ${countryId}, Type: ${typeFromFile}`);

  // --- 查找图片文件 ---
  // 确保只处理文件，排除子目录（虽然理论上文章目录不应再有子目录）
  let imageFiles = [];
  try {
    // ！！！这里可能还在使用回调版本的 fs.readdir ！！！
    filesInDir = await fsPromises.readdir(articleFolderPath); // <-- 使用 fsPromises
    imageFiles = filesInDir
        .filter(f => /\.(jpg|jpeg|png|gif)$/i.test(f))
        .filter(f => {
            try {
                return fs.statSync(path.join(articleFolderPath, f)).isFile();
            } catch { return false; }
        })
        // --- **修改排序逻辑：按文件名中的数字进行自然排序** ---
      imageFiles.sort((a, b) => {
        // 提取文件名中的数字部分 (假设格式为 pic_数字.jpg)
        const numA = parseInt(a.match(/(\d+)/)?.[0] || '0', 10); // 获取第一个数字序列
        const numB = parseInt(b.match(/(\d+)/)?.[0] || '0', 10);
        return numA - numB; // 按数字大小升序排列
      });
        console.log(`  Found ${imageFiles.length} potential image(s).`);
      } catch (readdirErr) {
        console.error(`  Error reading image directory ${articleFolderPath}:`, readdirErr); // <-- 错误在这里被捕获并打印
        // 根据情况决定是否继续处理（无图）或标记错误
        errorCount++;
        // return; // 如果希望读取目录失败就跳过文章处理，取消注释这行
    }
  // --- **新增：过滤掉 title-image.jpg 文件** ---
  const originalImageCount = imageFiles.length;
  imageFiles = imageFiles.filter(f => f.toLowerCase() !== 'title-image.jpg');
  if (originalImageCount > imageFiles.length) {
      console.log(`  Filtered out 'title-image.jpg'. Processing ${imageFiles.length} image(s).`);
  } else {
       console.log(`  Found ${imageFiles.length} image(s) to process.`);
  }
  // --- 结束过滤 ---

  // --- 数据库操作 (使用事务) ---
  let articleId = null; // 文章的数据库 ID
  const client = await pool.connect(); // 从连接池获取一个客户端
  try {
    await client.query('BEGIN'); // 开始事务

    // 生成 Slug
    const slug = await generateUniqueSlug(title, client); // 传入 client

    // --- (可选) HTML 清理或转换 ---
    let finalContent = articleContent; // 默认存储原始 Markdown
    // 如果需要存储 HTML:
    // if (articleContent) {
    //     const rawHtml = marked.parse(articleContent);
    //     finalContent = purify.sanitize(rawHtml, { USE_PROFILES: { html: true } });
    // }

    // 插入文章记录 (不包含图片 URL)
    const insertArticleQuery = `
          INSERT INTO articles (user_id, country_id, title, content, slug, type, status, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, 'published', $7, $7) -- <-- updated_at 设为 NULL
          RETURNING id;
        `;
        // 参数列表现在只有 7 个
        const articleResult = await client.query(insertArticleQuery, [
          userId, countryId, title, articleContent, slug, typeFromFile, date // <-- 移除最后一个 date
        ]);
    articleId = articleResult.rows[0].id;
    console.log(`  Inserted article record with ID: ${articleId}`);

    // 上传图片并记录，更新主图 URL
    let mainImageUrl = null;
    let uploadOrder = 0;
    for (const imageFile of imageFiles) {
        const localImagePath = path.join(articleFolderPath, imageFile);
        try {
            // 上传到 GCS
            const gcsImageUrl = await uploadImageToGCS(localImagePath, articleId, imageFile);

            // 插入到 article_images 表
            const insertImageQuery = ` INSERT INTO article_images (article_id, image_url, upload_order) VALUES ($1, $2, $3); `;
                // 使用当前的 uploadOrder 作为数据库中的顺序
            await client.query(insertImageQuery, [articleId, gcsImageUrl, uploadOrder]);

                // 设置主图逻辑: 现在直接用排序后的第一张 (uploadOrder === 0)
                if (mainImageUrl === null && uploadOrder === 0) {
                    mainImageUrl = gcsImageUrl;
                }

            uploadOrder++;
        } catch (uploadErr) {
             console.warn(`  Warning: Failed to upload or save image ${imageFile} for article ${articleId}. Skipping this image. Error: ${uploadErr.message}`);
             // 可以选择是否增加 errorCount
        }
    }

    // 更新文章的主图 URL (如果找到了)
    if (mainImageUrl) {
      const updateMainImageQuery = 'UPDATE articles SET main_image_url = $1 WHERE id = $2';
      await client.query(updateMainImageQuery, [mainImageUrl, articleId]);
      console.log(`  Updated main_image_url for article ${articleId}`);
    } else if (imageFiles.length > 0) {
        console.warn(`  Warning: Could not determine a main image for article ${articleId} despite images being present.`);
    }

    await client.query('COMMIT'); // 提交事务
    console.log(`  Successfully processed and imported article: "${title}"`);
    successCount++; // 增加成功计数

  } catch (err) {
    await client.query('ROLLBACK'); // 出错回滚事务
    console.error(`  Failed to process article "${title}" (Article ID might be ${articleId || 'N/A'}):`, err);
    errorCount++; // 增加错误计数
    // 可以考虑在这里添加删除已上传图片的逻辑，但会更复杂
  } finally {
    client.release(); // 释放数据库连接回连接池
  }
}


/**
 * 递归遍历目录，查找并处理包含 .md 文件的文章文件夹
 * @param {string} directoryPath 当前要扫描的目录路径
 */
async function processDirectory(directoryPath) {
    try {
      const entries = await fsPromises.readdir(directoryPath, { withFileTypes: true });
        let containsMdFile = false; // 标记当前目录是否直接包含 .md 文件

        // 先检查当前目录是否有 .md 文件
        for (const entry of entries) {
             if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
                 containsMdFile = true;
                 break; // 找到一个就够了
             }
        }

        if (containsMdFile) {
            // 如果当前目录包含 .md 文件，将其视为文章文件夹处理
            await processArticle(directoryPath);
        } else {
            // 如果当前目录不包含 .md 文件，则递归检查其子目录
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const subDirectoryPath = path.join(directoryPath, entry.name);
                    await processDirectory(subDirectoryPath); // 递归调用
                }
            }
        }
    } catch (err) {
        if (err.code !== 'EACCES' && err.code !== 'ENOENT') {
             console.error(`Error processing directory ${directoryPath}:`, err);
             errorCount++;
        }
    }
}

/**
 * 加载先决条件：用户信息和国家信息
 */
async function loadPrerequisites() {
    // 加载用户信息
    try {
        const usersJson = await fsPromises.readFile(USERS_FILE, { encoding: 'utf8' });
        availableUsers = JSON.parse(usersJson);
        if (!Array.isArray(availableUsers) || availableUsers.length === 0 || !availableUsers[0].id) {
            throw new Error("User data is empty, invalid, or missing IDs.");
        }
        console.log(`Loaded ${availableUsers.length} users from ${USERS_FILE}`);
    } catch (err) {
        console.error(`Error loading users from ${USERS_FILE}:`, err);
        console.error("Please run 'node generate-users.js' first and ensure it generated IDs.");
        process.exit(1);
    }

    // 加载国家信息到 Map
    try {
        const result = await pool.query('SELECT id, name, slug FROM countries');
        result.rows.forEach(row => {
            if (row.name) countriesMap[row.name.toLowerCase()] = row.id; // 按小写名字映射
            if (row.slug) countriesMap[row.slug] = row.id; // 按 slug 映射
            // 也可以同时存原始名字的映射
            if (row.name) countriesMap[row.name] = row.id;
        });
         const uniqueCountries = result.rows.length;
         console.log(`Loaded ${uniqueCountries} countries into map.`);
         if(uniqueCountries === 0) console.warn("Country map is empty. Articles might fail to import if categories don't match slugs/names.");
    } catch (err) {
        console.error("Error loading countries from database:", err);
        process.exit(1);
    }
}


/**
 * 脚本主入口函数
 */
async function runImport() {
  // 加载用户信息和国家信息
  await loadPrerequisites();

  // 确定要处理的基础目录
  const targetArg = process.argv[2]; // 获取命令行参数
  let baseImportDir = DEFAULT_IMPORT_DIR;
  console.log("Raw command line argument (process.argv[2]):", targetArg); // <-- 添加日志：打印原始参数

  if (targetArg) {
      console.log(`Processing argument: "${targetArg}"`); // <-- 添加日志：表明开始处理参数
      const potentialPath = path.resolve(process.cwd(), targetArg);
      console.log(`Resolved potential path: ${potentialPath}`); // <-- 添加日志：打印解析后的绝对路径
      
      try {
        // --- 改用 fsPromises.access() 检查 ---
        console.log(`Attempting to access path: ${potentialPath}`);
        await fsPromises.access(potentialPath, fs.constants.R_OK); // 检查读取权限
        console.log(`Access successful for path: ${potentialPath}`);

        // 还需要确认它是目录，可以尝试 readdir (如果 access 成功)
        try {
             const entries = await fsPromises.readdir(potentialPath); // 尝试读取目录内容
             baseImportDir = potentialPath; // 如果 readdir 成功，说明是可读目录
             console.log(`Using specified import directory (access & readdir OK): ${baseImportDir}`);
        } catch (readdirErr) {
             console.warn(`Path "${potentialPath}" exists but cannot be read as directory. Using default. Error: ${readdirErr.message}`);
        }
      } catch (e) {
           console.warn(`Could not access path specified by argument "${targetArg}". Using default: ${DEFAULT_IMPORT_DIR}`);
      }
  } else {
      console.log(`No directory specified. Using default import directory: ${DEFAULT_IMPORT_DIR}`);
  }

  // --- 确保基础目录存在 (这个检查可以保留，或者根据上面的结果调整) ---
  try {
    console.log(`Final check: Attempting to access baseImportDir: ${baseImportDir}`);
    await fsPromises.access(baseImportDir); // 再次确保用 fsPromises
    console.log(`Final check: Successfully accessed baseImportDir: ${baseImportDir}`);
 } catch (e) {
     console.error(`Error: Final import directory not found or accessible: ${baseImportDir}. Error: ${e.message}`);
     await pool.end();
     process.exit(1);
 }
 
  // 开始递归处理
  try {
    console.log(`\nStarting import scan from ${baseImportDir}...`);
    await processDirectory(baseImportDir);

    // 打印最终统计
    console.log("\n--- Import Summary ---");
    console.log(`Total potential article folders scanned: ${processedCount}`); // 修改了描述
    console.log(`Successfully imported articles:        ${successCount}`);
    console.log(`Skipped (duplicate/missing data/etc):  ${skippedCount}`);
    console.log(`Errors during processing:              ${errorCount}`);
    console.log("----------------------");

  } catch (err) {
    console.error("\nImport script failed:", err);
  } finally {
      console.log("Closing database connection pool...");
      await pool.end(); // 确保最后关闭连接池
      console.log("Pool closed.");
  }
}

// --- 运行导入脚本 ---
require('dotenv').config(); // 加载 .env 文件 (确保 DB 连接信息和 GCS_BUCKET_NAME 在里面)
runImport();