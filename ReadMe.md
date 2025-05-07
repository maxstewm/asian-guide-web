# 执行数据库命令后，需要
-- 预填充国家数据 (示例)
INSERT INTO countries (name, slug) VALUES
  ('Japan', 'japan'),
  ('south-korea', 'korea'),
  ('Thailand', 'thailand'),
  ('Vietnam', 'vietnam'),
  ('Singapore', 'singapore'),
  ('China', 'china');
  -- 添加其他你需要的国家

 # Asian Guide Web - 亚洲六国旅游美食攻略网站

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

一个分享和发现亚洲指定国家（例如：中国、日本、韩国、新加坡、泰国、越南）旅游与美食攻略的 Web 应用。用户可以浏览攻略，注册登录后可以发布、编辑和删除自己的图文攻略。

## 项目特色

*   **前后端分离架构:** 使用 Node.js (Express) 构建后端 API，React (或其他现代前端框架) 构建前端用户界面。
*   **用户生成内容 (UGC):** 注册用户可以创建和管理自己的旅游美食攻略。
*   **图文并茂:** 支持发布包含文字和多张图片的攻略。
*   **分类浏览:** 可以按国家浏览攻略列表。
*   **云原生部署:** 设计用于部署在 Google Cloud Platform (GCP) 上，利用 Cloud Run, Cloud SQL, Cloud Storage 等服务。
*   **安全认证:** 使用 JWT (JSON Web Tokens) 进行用户认证和 API 保护。
*   **数据库:** 使用 PostgreSQL 存储用户信息和文章数据。

## 技术栈

*   **后端:**
    *   Node.js
    *   Express.js 框架
    *   PostgreSQL 数据库
    *   `pg` (node-postgres) 数据库驱动
    *   `bcrypt` 密码哈希
    *   `jsonwebtoken` (JWT) 用户认证
    *   `cors` 处理跨域请求
    *   `multer` 处理文件（图片）上传
    *   `@google-cloud/storage`与 Google Cloud Storage 交互
    *   `dotenv` 管理环境变量
    *   `gray-matter` (用于导入脚本) 解析 Markdown Front Matter
    *   `slugify` (用于导入脚本或后端) 生成 URL Slug
*   **前端:**
    *   React (或其他框架)
    *   React Router DOM (用于路由)
    *   Axios (用于 API 请求)
    *   React Quill (或其他富文本编辑器)
    *   CSS / CSS Modules / Styled Components (用于样式)
    *   Context API (或其他状态管理库)
*   **数据库:**
    *   PostgreSQL
*   **云平台 (GCP):**
    *   Cloud Run (部署后端 API)
    *   Cloud SQL for PostgreSQL (托管数据库)
    *   Cloud Storage (存储上传的图片)
    *   Artifact Registry (存储 Docker 镜像)
    *   Cloud Build (可选，用于 CI/CD)
    *   Secret Manager (可选，用于管理密钥)
    *   Firebase Hosting / GCS + CDN (可选，用于部署前端)
*   **开发工具:**
    *   Git & GitHub (版本控制)
    *   Docker (容器化)
    *   Node.js & npm/yarn
    *   Postman / Insomnia (API 测试)
    *   DBeaver / pgAdmin (数据库管理)
    *   VS Code (推荐的代码编辑器)

## 项目结构

.
├── backend/ # 后端 Node.js/Express 项目
│ ├── middleware/ # 中间件 (例如 auth.js)
│ ├── routes/ # 路由定义 (auth.js, users.js, upload.js 等)
│ ├── utils/ # 工具函数 (例如 slug.js)
│ ├── .env # 环境变量 (本地开发)
│ ├── app.js # Express 应用配置和路由挂载
│ ├── db.js # 数据库连接池配置
│ ├── index.js # 服务器启动入口
│ ├── package.json # 后端依赖
│ ├── schema.sql # 数据库结构定义
│ └── Dockerfile # 后端 Docker 镜像构建文件
├── frontend/ # 前端 React 项目
│ ├── public/ # 静态资源和 HTML 入口
│ ├── src/ # 前端源代码
│ │ ├── components/ # 可复用组件 (ArticleCard, Navbar, ArticleForm)
│ │ ├── contexts/ # React Context (例如 AuthContext)
│ │ ├── hooks/ # 自定义 Hooks
│ │ ├── pages/ # 页面级组件 (HomePage, LoginPage, ArticleDetailPage...)
│ │ ├── services/ # API 服务封装 (api.js, authService.js, articleService.js)
│ │ └── ... # 其他 (assets, styles, utils, App.js, index.js)
│ ├── .env.development # 前端开发环境变量
│ ├── package.json # 前端依赖
│ └── ...
├── import_data/ # (可选) 存放待导入的 Markdown 文章和图片数据的目录
├── .git/
├── .gitignore # 全局 Git 忽略配置
└── README.md # 项目说明文档


## 安装与运行 (本地开发)

**前提条件:**

*   安装 Node.js (推荐 LTS 版本) 和 npm/yarn
*   安装 Git
*   安装 Docker 和 Docker Compose
*   安装 PostgreSQL 客户端 (`psql`) (可选，用于直接操作数据库)
*   拥有 Google Cloud Platform (GCP) 账号和项目 (用于 Cloud Storage)
*   下载 GCP 服务账号密钥 JSON 文件 (用于本地访问 GCS)

**步骤:**

1.  **克隆仓库:**
    ```bash
    git clone https://github.com/maxstewm/asian-guide-web.git
    cd asian-guide-web
    ```

2.  **启动数据库 (使用 Docker Compose):**
    *   在项目**根目录**下创建 `docker-compose.yml` 文件 (如果还没有)，配置 PostgreSQL 服务：
      ```yaml
      services:
        db:
          image: postgres:14 # 或其他版本
          container_name: travel_db_local
          restart: always
          environment:
            POSTGRES_USER: myuser       # 自定义用户名
            POSTGRES_PASSWORD: mypassword   # 自定义密码
            POSTGRES_DB: travel_db      # 自定义数据库名
          ports:
            - "5432:5432"             # 映射端口到本地
          volumes:
            - postgres_data:/var/lib/postgresql/data
            # (可选) 自动初始化 schema
            # - ./backend/schema.sql:/docker-entrypoint-initdb.d/init.sql
      volumes:
        postgres_data:
      ```
    *   运行 Docker Compose 启动数据库：
      ```bash
      docker-compose up -d db
      ```

3.  **初始化数据库 Schema:**
    *   如果 Docker Compose 配置了自动初始化，此步可跳过。
    *   否则，手动执行 `backend/schema.sql` 文件：
        *   连接到 Docker 容器内的 psql: `docker exec -it travel_db_local psql -U myuser -d travel_db` (输入密码 `mypassword`)
        *   或者使用本地 `psql` 连接: `psql -h localhost -p 5432 -U myuser -d travel_db -f backend/schema.sql` (输入密码)
        *   **重要:** 确保 `countries` 表有初始数据（例如，通过 `schema.sql` 或手动 `INSERT`）。

4.  **配置后端环境变量:**
    *   复制 `backend/.env.example` (如果提供) 或手动创建 `backend/.env` 文件。
    *   填入数据库连接信息 (主机 `localhost`, 端口 `5432`, 用户 `myuser`, 密码 `mypassword`, 数据库 `travel_db`)。
    *   设置 `JWT_SECRET` (一个强随机字符串)。
    *   设置 `GCS_BUCKET_NAME` (你的 GCS 存储桶名称)。
    *   设置 `GOOGLE_APPLICATION_CREDENTIALS` 指向你下载的服务账号密钥 JSON 文件路径。

5.  **安装后端依赖并启动:**
    ```bash
    cd backend
    npm install
    npm run dev # 使用 nodemon 启动开发服务器 (通常监听 3000 端口)
    ```

6.  **配置前端环境变量:**
    *   复制 `frontend/.env.development.example` (如果提供) 或手动创建 `frontend/.env.development` 文件。
    *   设置 `REACT_APP_API_BASE_URL=http://localhost:3000/api` (指向本地后端 API)。

7.  **安装前端依赖并启动:**
    ```bash
    cd ../frontend
    npm install
    npm start # 启动前端开发服务器 (通常监听 3001 端口)
    ```

8.  **访问应用:** 在浏览器中打开前端开发服务器的地址 (例如 `http://localhost:3001`)。

## API 接口说明

API 基础路径: `/api`

**认证 (`/api/auth`)**

*   `POST /register`: 用户注册。
    *   请求体: `{ "username": "...", "email": "...", "password": "..." }`
    *   成功响应: `201 Created` `{ "message": "...", "user": { ... } }`
*   `POST /login`: 用户登录。
    *   请求体: `{ "email": "...", "password": "..." }`
    *   成功响应: `200 OK` `{ "message": "...", "token": "JWT_TOKEN" }`

**用户 (`/api/users`)**

*   `GET /me`: 获取当前登录用户信息 (需要认证)。
    *   成功响应: `200 OK` `{ "id": ..., "username": ..., "email": ..., "created_at": ... }`
*   `GET /me/articles`: 获取当前登录用户发布的所有文章 (需要认证)。
    *   成功响应: `200 OK` `{ "articles": [...] }` (包含文章列表)
*   `GET /me/articles/latest-draft`: 检查并获取用户最新的草稿信息 (需要认证)。
    *   成功响应: `200 OK` `{ "hasDraft": boolean, "articleId"?: number, "slug"?: string }`

**文章 (`/api/articles`)**

*   `GET /`: 获取文章列表 (公开，只返回已发布文章)。
    *   查询参数: `page`, `limit`, `country` (slug), `featured` (true), `sortBy`, `order`, `status` (可选)
    *   成功响应: `200 OK` `{ "articles": [...], "pagination": { ... } }`
*   `POST /draft`: 创建一个新的文章草稿 (需要认证)。
    *   成功响应: `201 Created` `{ "articleId": number }`
*   `GET /:slug`: 获取单篇文章详情 (公开，只获取已发布文章)。
    *   成功响应: `200 OK` `{ "id": ..., "title": ..., "content": ..., "images": [...], ... }`
*   `PUT /:id`: 更新文章（用于保存草稿或发布，需要认证）。
    *   请求体: `{ "title"?: "...", "content"?: "...", "country_slug"?: "...", "type"?: "...", "status": "draft" | "published", "main_image_url"?: "...", "gallery_image_urls"?: [...] }`
    *   成功响应: `200 OK` `{ "message": "...", "slug": "..." }`
*   `DELETE /:id`: 删除文章 (需要认证，并且是作者本人)。
    *   成功响应: `200 OK` `{ "message": "..." }`

**国家 (`/api/countries`)**

*   `GET /`: 获取所有国家列表。
    *   成功响应: `200 OK` `[ { "id": ..., "name": "...", "slug": "..." }, ... ]`

**图片上传 (`/api/upload`)**

*   `POST /image/:articleId`: 上传图片并关联到指定文章 ID (需要认证)。
    *   请求体: `multipart/form-data`，包含名为 `imageFile` 的文件字段。
    *   成功响应: `200 OK` `{ "message": "...", "image": { "id": ..., "image_url": "..." } }`
*   `DELETE /image/:imageId`: 删除已上传的图片 (需要认证，并且是作者本人)。
    *   成功响应: `200 OK` `{ "message": "..." }`

*(请根据你的实际 API 实现细节调整上述描述)*

## 部署到 GCP (简要指南)

1.  **后端 (Cloud Run):**
    *   确保 `backend/Dockerfile` 正确。
    *   配置 `backend/.env` 用于生产环境 (或使用 Secret Manager)。
    *   构建 Docker 镜像并推送到 Artifact Registry: `gcloud builds submit ./backend --tag ...`
    *   设置 Cloud SQL for PostgreSQL 实例，创建数据库和用户。
    *   设置 Secret Manager 存储数据库密码、JWT 密钥。
    *   创建专用服务账号，授予 Cloud SQL Client, Storage Object Creator, Secret Manager Secret Accessor 角色。
    *   部署到 Cloud Run: `gcloud run deploy ... --image ... --service-account ... --add-cloudsql-instances ... --set-env-vars ... --set-secrets ...`
    *   配置 Cloud Run 服务连接到 Cloud SQL 实例。
    *   **配置 CORS 允许前端域名访问。**
    *   在 Cloud SQL 中运行 `schema.sql` 初始化表结构和国家数据。
2.  **前端 (Firebase Hosting 或 GCS+CDN):**
    *   配置 `frontend/.env.production`，设置 `REACT_APP_API_BASE_URL` 指向部署后的 Cloud Run 服务 URL。
    *   运行 `npm run build` (在 `frontend` 目录) 生成静态文件。
    *   **使用 Firebase Hosting:**
        *   安装 Firebase CLI (`npm install -g firebase-tools`)。
        *   登录 (`firebase login`)。
        *   初始化 Firebase (`firebase init hosting`)，选择你的 GCP 项目，配置 `build` 目录作为公共目录，配置为 SPA。
        *   部署: `firebase deploy --only hosting`。
    *   **使用 GCS + CDN:**
        *   创建 GCS Bucket 用于网站托管。
        *   上传 `build` 目录下的所有文件到 Bucket。
        *   设置 Bucket 文件为公开可读。
        *   配置 Bucket 作为网站（设置主页和错误页）。
        *   (可选但推荐) 配置 Cloud CDN 指向 GCS Bucket，并启用 HTTPS 和自定义域名。

## 数据导入 (可选)

*   运行 `backend/generate-users.js` 生成测试用户和密码（**注意安全风险！**）。
*   将 Markdown 文章和图片按指定结构放入 `import_data` 目录。
*   将数据上传到 GCE VM 的 `~/import_data` 目录。
*   在 GCE VM 的 `backend` 目录下运行 `node import-script.js` 或 `node import-script.js <指定目录>` 执行导入。

## 注意事项

*   **安全:**
    *   切勿在代码或 Git 仓库中硬编码敏感信息（API 密钥、密码等）。使用环境变量 (`.env`) 或 Secret Manager。
    *   对用户输入进行严格验证和清理（特别是 HTML 内容要防 XSS）。
    *   使用强密码哈希算法 (bcrypt)。
    *   配置严格的 CORS 策略。
    *   遵循最小权限原则分配 GCP IAM 角色。
*   **性能:**
    *   为数据库关键字段添加索引。
    *   考虑对 API 响应进行缓存。
    *   优化图片大小和格式。
    *   使用 CDN 分发前端静态资源和图片。
*   **错误处理:** 添加更健壮的前后端错误处理和日志记录。

## 未来开发方向

*   实现文章编辑功能的前端页面。
*   实现“我的攻略”页面。
*   实现按国家/类型/关键词搜索/过滤文章。
*   添加评论功能。
*   用户个人资料修改。
*   更丰富的文本格式支持（Markdown 渲染或更强大的富文本编辑器）。
*   实现分页加载。
*   UI/UX 整体美化和响应式改进。
*   单元测试和集成测试。
*   设置 CI/CD 自动化部署流程。

## 贡献

(如果希望开源或接受贡献，可以在这里添加贡献指南)

## License

[MIT](LICENSE) (如果使用 MIT License，需要添加一个 LICENSE 文件)