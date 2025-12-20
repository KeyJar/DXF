
const express = require('express');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
const multer = require('multer');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3001; // 后端运行端口

// --- 配置区域 ---
// 请将此路径改为您 NAS 挂载在电脑上的实际路径
// 例如 Windows: "Z:\\ArchaeoData" 或 Mac: "/Volumes/Public/ArchaeoData"
// 在 Docker 中，我们将映射到 /app/nas_data
const NAS_ROOT = process.env.NAS_PATH || path.join(__dirname, 'nas_data');
const DATA_FILE = path.join(NAS_ROOT, 'db.json');
const UPLOADS_DIR = path.join(NAS_ROOT, 'uploads');

// 确保目录存在
fs.ensureDirSync(NAS_ROOT);
fs.ensureDirSync(UPLOADS_DIR);

// 初始化数据库文件
if (!fs.existsSync(DATA_FILE)) {
  fs.writeJsonSync(DATA_FILE, { users: [], artifacts: [] });
}

// --- 中间件 ---
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' })); // 允许大 JSON (虽然不再存Base64，但以防万一)
app.use('/uploads', express.static(UPLOADS_DIR)); // 静态服务图片

// --- 托管前端 (Docker集成模式) ---
// 假设前端构建后的文件在 'dist' 目录
app.use(express.static(path.join(__dirname, 'dist')));

// --- 图片上传配置 ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR)
  },
  filename: function (req, file, cb) {
    // 解决中文文件名乱码问题，使用时间戳+随机数重命名
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + ext)
  }
})
const upload = multer({ storage: storage });

// --- API 接口 ---

// 1. 获取所有数据
app.get('/api/data', async (req, res) => {
  try {
    const data = await fs.readJson(DATA_FILE);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: '无法读取 NAS 数据' });
  }
});

// 2. 保存/同步数据 (全量更新 artifacts 和 users)
app.post('/api/sync', async (req, res) => {
  try {
    // req.body 应该包含 { users: [...], artifacts: [...] }
    const currentData = await fs.readJson(DATA_FILE);
    const newData = {
      users: req.body.users || currentData.users,
      artifacts: req.body.artifacts || currentData.artifacts
    };
    await fs.writeJson(DATA_FILE, newData, { spaces: 2 });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '无法写入 NAS 数据' });
  }
});

// 3. 上传图片
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '没有文件上传' });
  }
  // 返回相对路径，前端拼接服务器地址
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ url: fileUrl, filename: req.file.filename });
});

// 4. 所有其他请求返回前端 index.html (支持 React Router)
app.get('*', (req, res) => {
    // 排除 API 路径
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
        return res.status(404).send('Not found');
    }
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`
  ======================================================
  ArchaeoLog NAS 服务器已启动 (Docker Mode)
  
  运行端口: ${PORT}
  数据存储路径: ${NAS_ROOT}
  ======================================================
  `);
});
