// backend/export-script.js
const fsPromises = require('fs').promises;
const fsSync = require('fs'); // 用于同步检查目录是否存在或创建
const path = require('path');
const { Storage } = require('@google-cloud/storage');
const pool = require('./db'); // 你的数据库连接池
// 如果你的文章内容存储的是 HTML 并且需要转回 Markdown
// const TurndownService = require('turndown'); // npm install turndown --save
// const turndownService = new TurndownService();

// --- 配置 ---
// 确保在 .env 文件中或环境变量中设置了 GCS_BUCKET_NAME
const GCS_BUCKET_NAME = process.env.GCS_BUCKET_NAME;
if (!GCS_BUCKET_NAME) {
    console.error("Error: GCS_BUCKET_NAME environment variable is not set.");
    process.exit(1);
}
const storage = new Storage(); // GCS 客户端
const bucket = storage.bucket(GCS_BUCKET_NAME);

// 导出数据的本地根目录 (相对于脚本所在目录的上一级的上一级，即项目根目录下的 exported_data)
const EXPORT_BASE_DIR = path.resolve(__dirname, '..', '..', 'exported_data');

// --- 辅助函数 ---

/**
 * 确保目录存在，如果不存在则创建
 * @param {string} dirPath 目录路径
 */
async function ensureDirectoryExists(dirPath) {
    try {
        await fsPromises.mkdir(dirPath, { recursive: true });
    } catch (error) {
        // 如果错误不是因为目录已存在，则抛出
        if (error.code !== 'EEXIST') {
            throw error;
        }
    }
}

/**
 * 从 GCS 下载文件到本地，如果本地文件不存在或需要覆盖
 * @param {string} gcsObjectPath GCS 对象路径 (例如 'articles/123/images/image.jpg')
 * @param {string} localDestinationPath 本地保存的完整路径
 * @param {boolean} forceDownload 是否强制下载，即使本地文件已存在 (默认为 false)
 * @returns {Promise<boolean>} 返回 true 表示文件已在本地或成功下载, false 表示下载失败
 */
async function downloadGCSFile(gcsObjectPath, localDestinationPath, forceDownload = false) {
    try {
        // --- **新增：检查本地文件是否存在** ---
        if (!forceDownload) { // 如果不是强制下载
            try {
            await fsPromises.access(localDestinationPath, fsSync.constants.F_OK); // F_OK 检查文件是否存在
            console.log(`  Skipping download: Local file already exists at ${localDestinationPath}`);
            return true; // 文件已存在，操作视为成功
            } catch (accessError) {
            // accessError 表示文件不存在，这是预期行为，继续下载
            if (accessError.code !== 'ENOENT') {
                // 如果是其他错误 (如权限问题)，则抛出
                console.error(`  Error checking local file ${localDestinationPath}:`, accessError.message);
                throw accessError;
            }
            }
        }
        // --- **结束新增检查** ---
        
        // 确保目标本地目录存在
        await ensureDirectoryExists(path.dirname(localDestinationPath));

        console.log(`  Downloading gs://${GCS_BUCKET_NAME}/${gcsObjectPath} to ${localDestinationPath}...`);
        await bucket.file(gcsObjectPath).download({ destination: localDestinationPath });
        console.log(`  Successfully downloaded to ${localDestinationPath}`);
        return true; // 下载成功

    } catch (err) {
        console.error(`  Failed to ensure local file for gs://${GCS_BUCKET_NAME}/${gcsObjectPath}:`, err.message || err);
        return false; // 下载或检查失败
    }
}

/**
 * 脚本主入口函数
 */
async function runExport() {
    let exportedCount = 0;
    let articleErrorCount = 0;

    try {
        // 1. 创建导出根目录
        await ensureDirectoryExists(EXPORT_BASE_DIR);
        console.log(`Exporting data to: ${EXPORT_BASE_DIR}`);

        // 2. 查询所有已发布的文章，并 JOIN 国家和用户信息
        console.log("\nFetching published articles from database...");
        const articlesQuery = `
            SELECT
                a.id AS article_id,
                a.title,
                a.content,
                a.slug AS article_slug,
                a.type AS article_type,
                a.created_at,
                a.updated_at,
                a.main_image_url,
                c.name AS country_name,
                c.slug AS country_slug,
                u.username AS author_username
            FROM articles a
            JOIN countries c ON a.country_id = c.id
            JOIN users u ON a.user_id = u.id
            WHERE a.status = 'published' -- 只导出已发布的
            ORDER BY a.id; -- 或者其他你希望的顺序
        `;
        const articlesResult = await pool.query(articlesQuery);
        const articles = articlesResult.rows;
        console.log(`Found ${articles.length} published articles to export.`);

        if (articles.length === 0) {
            console.log("No published articles found to export.");
            return;
        }

        // 3. 遍历每篇文章进行处理
        for (const article of articles) {
            console.log(`\nProcessing article: "${article.title}" (ID: ${article.article_id})`);
            let currentArticleSuccess = true; // 标记当前文章是否成功导出

            // 3.1. 构建文章的本地保存路径
            // 使用 slug 作为文件夹名，如果 slug 为空或无效，则使用 article_id
            const articleDirName = (article.article_slug && article.article_slug.trim() !== '')
                ? article.article_slug
                : `article-${article.article_id}`;

            // 假设 type 是 'travel' 或 'food'，country_slug 是国家 slug
            const countryDir = path.join(EXPORT_BASE_DIR, article.article_type, article.country_slug || 'unknown-country');
            const articlePath = path.join(countryDir, articleDirName);
            await ensureDirectoryExists(articlePath);
            console.log(`  Created directory: ${articlePath}`);

            // 3.2. 获取并处理文章关联的图片
            let images = []; // 初始化为空数组
            try {
                const imagesQuery = `
                    SELECT image_url, upload_order
                    FROM article_images
                    WHERE article_id = $1
                    ORDER BY upload_order ASC, uploaded_at ASC;
                `;
                const imagesResult = await pool.query(imagesQuery, [article.article_id]);
                images = imagesResult.rows || []; // 如果没有图片, imagesResult.rows 可能是 undefined 或空数组
                console.log(`  Found ${images.length} associated image(s) from database.`);
            } catch (dbImgError) {
                console.error(`  Error fetching images from article_images for article ID ${article.article_id}:`, dbImgError.message);
                currentArticleSuccess = false; // 标记图片获取失败
                // 即使图片获取失败，我们仍然可以尝试导出文章的文本内容
                articleErrorCount++;
                console.warn(`  Article "${article.title}" exported with No image processing errors.`);
                continue ;
            }
            if (images.length === 0) {
                console.warn(`  No images found for article "${article.title}". return processing.`);
                articleErrorCount++;
                continue ;
            }

            const markdownImageLinks = []; // 只存储非主图的 gallery 图片链接
            let localMainImageFileName = 'title-image.jpg'; // 主图在本地的期望文件名
            let mainImageGcsPath = null;    // 主图在 GCS 上的路径
            let mainImageLocalPath = null;  // 主图在本地下载后的路径
            let imageFileCounter = 1;       // 用于非主图的 pic_N.jpg 命名

            // 1. 确定并下载主图 (保持不变)
            if (article.main_image_url) {
                mainImageGcsPath = article.main_image_url.substring(`https://storage.googleapis.com/${GCS_BUCKET_NAME}/`.length);
                mainImageLocalPath = path.join(articlePath, localMainImageFileName);
            } else if (galleryImagesData.length > 0) {
                mainImageGcsPath = galleryImagesData[0].image_url.substring(`https://storage.googleapis.com/${GCS_BUCKET_NAME}/`.length);
                mainImageLocalPath = path.join(articlePath, localMainImageFileName);
            }

            if (mainImageGcsPath && mainImageLocalPath) {
                try {
                    const downloadSuccess = await downloadGCSFile(mainImageGcsPath, mainImageLocalPath);
                    if (!downloadSuccess) currentArticleSuccess = false;
                    else console.log(`  Main image ${localMainImageFileName} ensured locally.`);
                } catch (e) {
                    console.error(`  Error processing main image (GCS: ${mainImageGcsPath}): ${e.message}`);
                    currentArticleSuccess = false;
                    mainImageLocalPath = null; // 下载失败
                }
            }

            // 处理 article_images 中的图片
            for (const img of images) {
                try {
                    const gcsPath = img.image_url.substring(`https://storage.googleapis.com/${GCS_BUCKET_NAME}/`.length);
                    const originalFileName = path.basename(gcsPath); // 获取 GCS 上的原始文件名 (带时间戳和随机串)
                    // 生成一个更简洁的本地文件名，例如 pic_1.jpg
                    const localImageName = `pic_${imageFileCounter}${path.extname(originalFileName) || '.jpg'}`;
                    const localImagePath = path.join(articlePath, localImageName);

                    const downloadSuccess = await downloadGCSFile(gcsPath, localImagePath);

                    if (downloadSuccess) {
                        markdownImageLinks.push(`![${localImageName}](${localImageName})`);
                    } else {
                        currentArticleSuccess = false;
                    }
                    imageFileCounter++;               

                    // // 如果这张图是主图，并且我们还没确定本地主图文件名
                    // if (img.image_url === article.main_image_url && !markdownImageLinks.some(link => link.includes(localMainImageFileName))) {
                    //     // 确保主图使用 title-image.jpg (如果还没被其他图片占用)
                    //     if (localImageName !== localMainImageFileName && !fsSync.existsSync(path.join(articlePath, localMainImageFileName))) {
                    //         await fsPromises.rename(localImagePath, path.join(articlePath, localMainImageFileName));
                    //         markdownImageLinks.push(`![${localMainImageFileName}](${localMainImageFileName})`);
                    //     } else {
                    //         markdownImageLinks.push(`![${localImageName}](${localImageName})`);
                    //     }
                    // } else {
                    //     markdownImageLinks.push(`![${localImageName}](${localImageName})`);
                    // }
                    
                } catch (e) {
                    console.error(`  Error processing image ${img.image_url}: ${e.message}`);
                    currentArticleSuccess = false;
                }
            }

            // 3. 构建 Front Matter (titleImage 字段现在只依赖 mainImageLocalPath 是否成功下载)
            const frontMatter = {
                title: article.title,
                date: article.created_at.toISOString().split('T')[0],
                categories: article.country_name,
                type: article.article_type === 'travel' ? 'guide' : 'food',
                author: article.author_username,
                titleImage: mainImageLocalPath && fsSync.existsSync(mainImageLocalPath) ? localMainImageFileName : undefined,
                draft: false,
            };

            let frontMatterString = '---\n';
            for (const key in frontMatter) {
                if (frontMatter[key] !== undefined && frontMatter[key] !== null) {
                    // 对字符串值进行适当的引号包裹和转义
                    let value = frontMatter[key];
                    if (typeof value === 'string') {
                        // 替换双引号为两个单引号 (YAML 中转义双引号的方式之一)
                        // 或者确保字符串不包含特殊字符，或使用更健壮的 YAML 序列化库
                        value = `"${String(value).replace(/"/g, '""')}"`;
                    }
                    frontMatterString += `${key}: ${value}\n`;
                }
            }
            frontMatterString += '---\n\n';

            // 3.4. Markdown 内容处理
            let markdownBody = article.content || '';
            // 如果数据库存的是 HTML，需要转回 Markdown
            // if (article.content && (article.content.includes('<p>') || article.content.includes('<h1>'))) { // 简单判断是否是 HTML
            //     console.log("  Content appears to be HTML, converting to Markdown...");
            //     markdownBody = turndownService.turndown(article.content);
            // }

            // 3.5. 组合完整的 Markdown 文本
             // --- **组合完整的 Markdown 文本 (markdownImageLinks 现在只包含非主图的 gallery 图片)** ---
            const fullMarkdown = `${frontMatterString}${markdownBody}${markdownImageLinks.length > 0 ? '\n\n' + markdownImageLinks.join('\n\n') : ''}`;
            // 3.6. 写入 .md 文件
            const mdFileName = (article.article_slug && article.article_slug.trim() !== '') ? `${article.article_slug}.md` : 'index.md';
            const mdFilePath = path.join(articlePath, mdFileName);
            await fsPromises.writeFile(mdFilePath, fullMarkdown);
            console.log(`  Created Markdown: ${mdFilePath}`);

            if (currentArticleSuccess) {
                exportedCount++;
            } else {
                articleErrorCount++; // 记录文章处理中有错误
            }
        } // end for loop

        // 4. 打印最终统计
        console.log("\n--- Export Summary ---");
        console.log(`Total published articles found: ${articles.length}`);
        console.log(`Successfully exported articles: ${exportedCount}`);
        if (articleErrorCount > 0) {
            console.log(`Articles exported with some errors (e.g., image download failed): ${articleErrorCount}`);
        }
        console.log(`Data exported to: ${EXPORT_BASE_DIR}`);
        console.log("----------------------");

    } catch (err) {
        console.error("\nExport script failed:", err);
    } finally {
        console.log("Closing database connection pool...");
        await pool.end();
        console.log("Pool closed.");
    }
}

// --- 运行导出脚本 ---
require('dotenv').config(); // 确保 GCS_BUCKET_NAME 和数据库连接信息从 .env 加载
runExport();