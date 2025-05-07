-- 用户表
CREATE TABLE users (
    id SERIAL PRIMARY KEY, -- 或者使用 UUID: id UUID PRIMARY KEY DEFAULT gen_random_uuid()
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL, -- 存储哈希后的密码
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 国家表 (预先填充数据)
CREATE TABLE countries (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL, -- 例如: '日本', 'Thailand'
    slug VARCHAR(100) UNIQUE NOT NULL  -- 例如: 'japan', 'thailand' (用于URL)
);

-- 文章表
CREATE TABLE articles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- 外键关联用户，用户删除则文章删除
    country_id INTEGER NOT NULL REFERENCES countries(id), -- 外键关联国家
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL, -- 存储文章正文 (可能是 Markdown 或 HTML)
    cover_image_url VARCHAR(512), -- 封面图片 URL (存储在 GCS)
    slug VARCHAR(255) UNIQUE NOT NULL, -- 用于文章的友好 URL
    is_featured BOOLEAN DEFAULT FALSE, -- 是否精选
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 可选: 更新 updated_at 时间戳的触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_articles_updated_at
BEFORE UPDATE ON articles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 索引 (提高查询性能)
CREATE INDEX idx_articles_user_id ON articles(user_id);
CREATE INDEX idx_articles_country_id ON articles(country_id);
CREATE INDEX idx_articles_is_featured ON articles(is_featured);
CREATE INDEX idx_articles_slug ON articles(slug);

-- 预填充国家数据 (示例)
INSERT INTO countries (name, slug) VALUES
  ('Japan', 'japan'),
  ('south-korea', 'korea'),
  ('Thailand', 'thailand'),
  ('Vietnam', 'vietnam'),
  ('Singapore', 'singapore'),
  ('China', 'china');
  -- 添加其他你需要的国家