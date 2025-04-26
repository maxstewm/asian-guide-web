// backend/generate-users.js
/*
 * 生成随机用户并保存到数据库和 JSON 文件中
 * 数据库格式是 id | username |   email   |    password  |  created_at
 * 安装 bcrypt: npm install bcrypt --save
 * 运行 node generate-users.js 生成 import-users.json
 */

// backend/generate-users.js
const bcrypt = require('bcrypt');
const { faker } = require('@faker-js/faker');
const pool = require('./db');
const fs = require('fs').promises;
const path = require('path');

const NUM_USERS = 100;
const PASSWORD_LENGTH = 10;
const SALT_ROUNDS = 10;
const OUTPUT_FILE = path.join(__dirname, 'import-users.json');
const MIN_USERNAME_LENGTH = 4;
const MAX_USERNAME_LENGTH = 8;

// 用于存储已生成的用户名，确保唯一性
const generatedUsernames = new Set();

/**
 * 生成一个符合要求的唯一用户名
 */
function generateValidUsername() {
  let username = '';
  let attempts = 0;
  const maxAttempts = 20; // 防止无限循环

  while (attempts < maxAttempts) {
    attempts++;
    // 尝试生成用户名 (只包含字母)
    // 可以组合名字或使用 internet.userName 但需后处理
    const firstName = faker.person.firstName().toLowerCase();
    const lastName = faker.person.lastName().toLowerCase();
    // 简单组合，然后清理和截断
    let candidate = (firstName + lastName).replace(/[^a-z]/g, ''); // 只保留小写字母

    // 如果组合结果太短，尝试只用姓或名，或重新生成
    if (candidate.length < MIN_USERNAME_LENGTH) {
        candidate = lastName.replace(/[^a-z]/g, ''); // 尝试只用姓
        if (candidate.length < MIN_USERNAME_LENGTH) {
             candidate = firstName.replace(/[^a-z]/g, ''); // 尝试只用名
        }
    }

     // 截断到最大长度
     if (candidate.length > MAX_USERNAME_LENGTH) {
         candidate = candidate.substring(0, MAX_USERNAME_LENGTH);
     }

    // 再次检查长度是否在范围内，并且是否唯一
    if (candidate.length >= MIN_USERNAME_LENGTH &&
        candidate.length <= MAX_USERNAME_LENGTH &&
        !generatedUsernames.has(candidate))
    {
      username = candidate;
      generatedUsernames.add(username); // 添加到已生成集合
      break; // 找到合适的用户名，跳出循环
    }
  }

  // 如果尝试多次仍未找到，生成一个带随机后缀的备用名
  if (!username) {
      console.warn("Could not generate a unique username within limits after several attempts. Generating fallback.");
      let fallback = faker.lorem.word({ length: { min: MIN_USERNAME_LENGTH, max: MAX_USERNAME_LENGTH }, strategy: 'shortest' }).toLowerCase().replace(/[^a-z]/g, '');
      // 确保备用名也符合长度要求并尝试保证唯一
      while(fallback.length < MIN_USERNAME_LENGTH || generatedUsernames.has(fallback)) {
          fallback = faker.lorem.word({ length: { min: MIN_USERNAME_LENGTH, max: MAX_USERNAME_LENGTH }, strategy: 'shortest' }).toLowerCase().replace(/[^a-z]/g, '') + Math.floor(Math.random()*100);
          fallback = fallback.substring(0, MAX_USERNAME_LENGTH); // 再次截断
          if(fallback.length < MIN_USERNAME_LENGTH) fallback += 'user'; // 补齐长度
          fallback = fallback.substring(0, MAX_USERNAME_LENGTH);
      }
      username = fallback;
      generatedUsernames.add(username);
  }

  return username;
}


async function generateUsers() {
  const usersDataForFile = []; // { id, username, email, password (plain) } <-- 按你之前的要求包含密码
  const dbUsers = [];   // { username, email, passwordHash }

  console.log(`Generating ${NUM_USERS} random users (4-8 letters only)...`);

  for (let i = 0; i < NUM_USERS; i++) {
    const username = generateValidUsername(); // <-- 使用新函数生成用户名
    const email = faker.internet.email({ firstName: username, provider: 'example.com' }); // 邮箱可以保持原样
    const plainPassword = faker.internet.password(PASSWORD_LENGTH);
    const passwordHash = await bcrypt.hash(plainPassword, SALT_ROUNDS);

    dbUsers.push({ username, email, passwordHash });
    usersDataForFile.push({ username, email, password: plainPassword }); // 文件中仍然包含明文密码

    process.stdout.write(`Generated user ${i + 1}/${NUM_USERS}\r`);
  }
  console.log('\nUser generation complete.');

  // --- 数据库插入和文件写入逻辑 (保持不变) ---
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('Inserting users into database...');
    const insertedIds = [];
    for (const user of dbUsers) {
      const insertQuery = `
        INSERT INTO users (username, email, password) -- 假设数据库列是 password
        VALUES ($1, $2, $3)
        RETURNING id;
      `;
      const result = await client.query(insertQuery, [user.username, user.email, user.passwordHash]);
      if (result.rows.length > 0) {
          insertedIds.push(result.rows[0].id);
      } else { console.warn(`Failed to insert user ${user.username} or get ID back.`); }
       process.stdout.write(`Inserted user ${insertedIds.length}/${NUM_USERS}\r`);
    }

    if (insertedIds.length === usersDataForFile.length) {
        usersDataForFile.forEach((user, index) => { user.id = insertedIds[index]; });
    } else { throw new Error("Failed to associate all generated IDs."); }

    await client.query('COMMIT');
    console.log(`\nSuccessfully inserted ${insertedIds.length} users into the database.`);

    console.log(`Saving user information (including plain passwords!) to ${OUTPUT_FILE}...`);
    await fs.writeFile(OUTPUT_FILE, JSON.stringify(usersDataForFile, null, 2));
    console.log('User information saved.');
    console.warn('WARNING: import-users.json contains plain text passwords. Keep this file secure and delete it after use!');

  } catch (err) {
        await client.query('ROLLBACK');
        // 检查是否是用户名唯一约束冲突 (假设 users 表 username 列有 UNIQUE 约束)
        if (err.code === '23505' && err.constraint && err.constraint.includes('username')) {
            console.error('\nError: Username uniqueness constraint violated. Try running the script again or check the generateValidUsername logic.', err.detail);
        } else {
            console.error('\nError during database insertion or file writing:', err);
        }
   } finally {
        client.release();
        await pool.end();
   }
}

require('dotenv').config();
generateUsers();