# Travel & Food Guide - 国际旅游美食攻略网站 

## 📖 项目简介 (Introduction)

Travel & Food Guide Web 是一个致力于分享和发现特定国家（目前包括中国、日本、韩国、新加坡、泰国、越南、马来西亚、法国与英国）旅游景点和特色美食攻略的在线平台。用户可以轻松浏览由其他旅行者和美食爱好者发布的图文并茂的攻略。注册用户还可以创建、编辑和分享他们自己的精彩旅程和美食体验。

## ✨ 项目特色 (Features)

[ **列出项目的主要功能和亮点。** ]

*   **用户注册与登录:** 安全的用户认证系统。
*   **攻略浏览:** 按国家、类型（旅行/美食）、最新发布等方式浏览攻略。
*   **图文攻略发布:** 注册用户可以发布包含详细文字描述和多张图片的攻略。
    *   支持文章标题、正文内容输入。
    *   支持为文章选择所属国家和类型（旅行/美食）。
    *   支持上传文章多张画廊图片。
*   **文章管理:** 用户可以编辑和删除自己发布的攻略。
*   **草稿功能:** 用户可以将未完成的攻略保存为草稿，稍后再编辑发布。
*   **RESTful API 设计:** 清晰的后端 API 接口。

## 🛠️ 技术栈 (Technology Stack)


*   **后端 (Backend):**
    *   Node.js
    *   Express.js
    *   PostgreSQL (数据库)
    *   `pg` (Node.js PostgreSQL client)
    *   `bcrypt` (密码哈希)
    *   `jsonwebtoken` (JWT for authentication)
    *   `cors` (处理跨域请求)
    *   `multer` (文件上传处理)
    *   `@google-cloud/storage` (Google Cloud Storage 客户端)
    *   `dotenv` (环境变量管理)
*   **前端 (Frontend):**
    *   React
    *   React Router DOM (路由管理)
    *   Axios (HTTP 请求)
    *   React Context API (状态管理)
    *   (如果你用了其他 UI 库或特定 CSS 方案，请列出)
*   **数据库 (Database):**
    *   PostgreSQL
*   **云平台与部署 (Cloud & Deployment - 目标):**
    *   Google Cloud Platform (GCP)
        *   Cloud Run (后端服务)
        *   Cloud SQL for PostgreSQL (数据库服务)
        *   Cloud Storage (图片存储)
        *   (可选) Artifact Registry, Cloud Build
    *   (前端部署方案，例如 Firebase Hosting, Netlify, Vercel, or GCS+CDN)
*   **开发工具 (Development Tools):**
    *   Git & GitHub
    *   Docker & Docker Compose (用于本地数据库环境)
    *   npm / yarn
    *   VS Code

## 项目结构 (Project Structure)

asian-guide-web/
├── backend/ # 后端 Node.js/Express 项目
│ ├── middleware/
│ ├── routes/
│ ├── utils/
│ ├── .env # (本地开发时不应提交，提供 .env.example)
│ ├── app.js
│ ├── db.js
│ ├── index.js
│ ├── package.json
│ ├── schema.sql # 数据库结构定义
│ ├── generate-users.js 
│ ├── import-script.js # 数据导入脚本 
│ ├── export-script.js # 数据导出脚本
│ └── Dockerfile # (如果用于后端部署)
├── frontend/ # 前端 React 项目
│ ├── public/
│ ├── src/
│ │ ├── components/
│ │ ├── contexts/
│ │ ├── pages/
│ │ ├── services/
│ │ └── ...
│ ├── .env.development # (本地开发时不应提交，提供 .env.development.example)
│ ├── package.json
│ └── ...
├── import_data/ # (可选) 存放待导入数据的目录
├── .gitignore
├── README.md



## ⚙️ 安装与运行 (本地开发) (Installation & Setup - Local Development)


**前提条件 (Prerequisites):**

*   Node.js (v18.x 或更高版本推荐) & npm/yarn
*   Git
*   Docker & Docker Compose (用于运行 PostgreSQL 数据库)
*   (可选) `psql` 命令行工具
*   Google Cloud Platform (GCP) 账号 (用于 Cloud Storage 配置，本地开发也需要)
*   已下载的 GCP 服务账号密钥 JSON 文件 (用于本地访问 GCS)

**步骤 (Steps):**

1.  **克隆仓库 (Clone the repository):**
    ```bash
    git clone https://github.com/maxstewm/asian-guide-web.git
    cd asian-guide-web
    ```

2.  **配置并启动数据库 (Setup and start the database):**
    *   确保项目根目录下有 `docker-compose.yml` 文件（内容如之前讨论）。
    *   启动 PostgreSQL 服务：
        ```bash
        docker-compose up -d db
        ```

3.  **初始化数据库 Schema (Initialize database schema):**
    *   使用 `psql` 或你喜欢的数据库工具连接到本地 Docker 中的 PostgreSQL。
    *   执行 `backend/schema.sql` 文件中的 SQL 语句来创建表结构。
        ```bash
        # 示例 (假设 docker-compose.yml 中用户/密码/数据库名是 myuser/mypassword/travel_db)
        psql -h localhost -p 5432 -U myuser -d travel_db -f backend/schema.sql
        # 或者通过 Docker exec
        # docker exec -it <container_name_or_id> psql -U myuser -d travel_db < /path/inside/container/to/schema.sql
        ```
    *   **重要:** 确保 `countries` 表有初始数据。

4.  **配置后端环境变量 (Configure backend environment variables):**
    *   进入 `backend` 目录: `cd backend`
    *   复制 `.env.example` (如果存在) 为 `.env`，或手动创建 `.env`。
    *   根据 `backend/.env.example` 的说明，填写以下变量：
        *   `DB_HOST=localhost`
        *   `DB_PORT=5432`
        *   `DB_USER=...` (docker-compose.yml 中定义的)
        *   `DB_PASSWORD=...` (docker-compose.yml 中定义的)
        *   `DB_NAME=...` (docker-compose.yml 中定义的)
        *   `JWT_SECRET=your_strong_random_jwt_secret` (生成一个强密钥)
        *   `GCS_BUCKET_NAME=your-gcs-bucket-name`
        *   `GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/gcp-service-account-key.json` (本地密钥文件路径)
        *   `PORT=3000` (或你希望后端运行的端口)

5.  **安装后端依赖并启动 (Install backend dependencies and start):**
    ```bash
    npm install
    npm run dev # 启动后端开发服务器 (通常监听 http://localhost:3000)
    ```

6.  **配置前端环境变量 (Configure frontend environment variables):**
    *   进入 `frontend` 目录: `cd ../frontend`
    *   复制 `.env.development.example` (如果存在) 为 `.env.development`，或手动创建。
    *   设置 `REACT_APP_API_BASE_URL=http://localhost:3000/api` (指向本地后端)。

7.  **安装前端依赖并启动 (Install frontend dependencies and start):**
    ```bash
    npm install
    npm start # 启动前端开发服务器 (通常在 http://localhost:3001 打开)
    ```

## 🚀 部署 (Deployment)


*   **后端 API:** 推荐部署到 Google Cloud Run。
    1.  构建 Docker 镜像并推送到 Google Artifact Registry。
    2.  创建 Cloud SQL for PostgreSQL 实例。
    3.  使用 Secret Manager 管理敏感配置。
    4.  创建专用服务账号并授予所需权限。
    5.  配置 Cloud Run 服务连接 Cloud SQL 和 GCS，并设置环境变量。
    6.  配置 CORS 允许生产前端域名访问。
*   **前端应用:** 推荐构建为静态文件并部署到：
    *   Firebase Hosting (推荐，易于集成 CDN 和 HTTPS)。
    *   Google Cloud Storage + Cloud CDN。
    *   其他静态托管平台 (Netlify, Vercel)。
*   **数据库:** 生产环境使用 Cloud SQL for PostgreSQL。

(更多详细信息请参考 `DEPLOYMENT_GUIDE.md` - 如果你创建了这个文件)

## 🔧 API 接口 (API Endpoints)

[ **这里可以放一个 API 接口的简要列表，或者链接到单独的 API 文档。** 我们之前已经整理过，可以粘贴过来并更新。]

**基础路径 (Base Path):** `/api`

*   **认证 (Authentication - `/auth`):**
    *   `POST /register`: 用户注册
    *   `POST /login`: 用户登录
*   **用户 (Users - `/users`):**
    *   `GET /me`: 获取当前用户信息 (需认证)
    *   `GET /me/articles`: 获取当前用户的文章 (需认证)
    *   `GET /me/articles/latest-draft`: 获取最新草稿 (需认证)
*   **文章 (Articles - `/articles`):**
    *   `GET /`: 获取文章列表 (公开, 默认已发布)
        *   Query Params: `country`, `page`, `limit`, `featured`, `sortBy`, `order`, `status` (for admin)
    *   `POST /draft`: 创建文章草稿 (需认证)
    *   `GET /:slug`: 获取单篇文章详情 (公开, 已发布)
    *   `PUT /:id`: 更新文章 (保存草稿/发布, 需认证)
    *   `DELETE /:id`: 删除文章 (需认证, 作者本人)
*   **国家 (Countries - `/countries`):**
    *   `GET /`: 获取国家列表
*   **图片上传 (Upload - `/upload`):**
    *   `POST /image/:articleId`: 上传图片并关联文章 (需认证)
    *   `DELETE /image/:imageId`: 删除已上传的图片 (需认证, 作者本人)

(更详细的请求/响应格式请参考 `API_DOCUMENTATION.md` - 如果你创建了这个文件)

## 🗂️ 数据导入 (Data Import - Optional)

[ **如果提供了导入脚本，说明如何使用。** ]

1.  运行 `backend/generate-users.js` 生成测试用户数据 (保存在 `backend/import-users.json`)。
    ```bash
    cd backend
    node generate-users.js
    ```
    **警告:** `import-users.json` 包含明文密码，请妥善保管并在使用后删除。
2.  将 Markdown 文章和图片数据按指定结构放入 `import_data/` 目录 (位于项目根目录)。
3.  将 `import_data/` 目录上传到 GCE VM 的用户主目录下。
4.  在 GCE VM 的 `backend` 目录下运行导入脚本：
    ```bash
    node import-script.js # 处理默认的 ~/import_data
    # 或
    node import-script.js /path/to/specific/import/directory # 处理指定目录
    ```
    脚本会将文章导入数据库，并将图片上传到 GCS。

