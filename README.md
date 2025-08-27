# Chatbot Node.js với Gemini API

Ứng dụng chatbot được xây dựng trên Node.js, Express.js và tích hợp Google Gemini API với khả năng quản lý nội dung quảng cáo.

## ✨ Tính năng

- **Giao diện 2 Tab**: Chat và quản lý nội dung
- **An toàn**: API Key được bảo vệ phía server
- **Streaming Response**: Hiệu ứng gõ chữ real-time
- **Quản lý nội dung**: CRUD operations với giao diện thân thiện
- **Responsive Design**: Hỗ trợ desktop và mobile

## 🚀 Deploy với Docker

### Yêu cầu
- Docker và Docker Compose
- Gemini API Key

### Bước 1: Clone và cấu hình
```bash
git clone <repository-url>
cd chatbot-nodejs

# Tạo file .env
cp .env .env.local
# Sửa GEMINI_API_KEY trong .env
```

### Bước 2: Deploy cơ bản
```bash
# Build và start container
docker-compose up -d

# Xem logs
docker-compose logs -f chatbot

# Dừng services
docker-compose down
```

### Bước 3: Kiểm tra deployment
```bash
# Kiểm tra container status
docker-compose ps

# Xem logs
docker-compose logs -f

# Test ứng dụng
curl http://localhost:3000
```

## 🛠️ Development

### Chạy local
```bash
npm install
npm start
# hoặc
npm run dev
```

### Build Docker image
```bash
docker build -t chatbot-nodejs .
docker run -p 3000:3000 --env-file .env chatbot-nodejs
```

## 📁 Cấu trúc project

```
chatbot-nodejs/
├── public/                 # Frontend files
│   ├── index.html
│   ├── style.css
│   └── script.js
├── server.js              # Backend server
├── content.json           # Dữ liệu nội dung
├── package.json
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
├── .env                   # Environment config
└── README.md
```

## 🔧 API Endpoints

- `GET /` - Giao diện chính
- `POST /api/chat` - Chat với AI (streaming)
- `POST /api/save` - Lưu nội dung mới
- `GET /api/content` - Lấy danh sách nội dung
- `DELETE /api/content/:index` - Xóa nội dung

## ⚙️ Environment Variables

```env
GEMINI_API_KEY=your_gemini_api_key_here
NODE_ENV=production
```

## 🐳 Docker Commands

```bash
# Xem container status
docker-compose ps

# Restart services
docker-compose restart

# Xem logs real-time
docker-compose logs -f

# Update và deploy lại
docker-compose pull
docker-compose up -d --force-recreate

# Backup content data
docker cp gemini-chatbot:/app/content.json ./backup-content.json

# Restore content data  
docker cp ./backup-content.json gemini-chatbot:/app/content.json
```

## 🔍 Health Check

Container có built-in health check. Kiểm tra status:
```bash
docker inspect gemini-chatbot --format='{{.State.Health.Status}}'
```

## 📝 Troubleshooting

### Container không start
```bash
# Kiểm tra logs
docker-compose logs chatbot

# Kiểm tra môi trường
docker-compose config
```

### API Key lỗi
- Kiểm tra `.env` file có đúng format
- Verify API key còn hạn sử dụng
- Restart container sau khi update .env

### Port conflict
```bash
# Thay đổi port trong docker-compose.yml
ports:
  - "8080:3000"  # Thay vì 3000:3000
```

## 🚀 Production Deployment

Đơn giản chỉ cần:

```bash
# Deploy production
docker-compose up -d

# Monitor
docker-compose logs -f
```

## 📱 Truy cập

- **Application**: http://localhost:3000

Enjoy coding! 🎉