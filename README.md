# Champion School 成绩管理系统

多科目成绩上传、查询、管理系统。

## 本地运行

```bash
npm install
node server.js
```

访问 http://localhost:3000

## 部署到 Render.com

1. 把代码推送到 GitHub 仓库
2. 访问 [render.com](https://render.com)，用 GitHub 账号登录
3. 点击 "New Web Service" → 选择你的 GitHub 仓库
4. 配置：
   - **Name**: champion-school
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: Free
5. 点击 "Create Web Service"
6. 等待部署完成，获得公网链接（如 `https://champion-school.onrender.com`）

⚠️ **注意**：Render 免费版每次部署后 SQLite 数据会重置。如需持久化，建议升级到付费版或使用 PostgreSQL。

## 部署到自有服务器

```bash
git clone https://github.com/championwind/records.git
cd records
npm install
node server.js
```

用 Nginx 反向代理 + PM2 守护进程：
```bash
npm install -g pm2
pm2 start server.js --name champion-school
```
