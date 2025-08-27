// server.js
const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path'); // Sửa lỗi: cần khai báo path
require('dotenv').config();

const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const port = 3000;

const contentFilePath = path.join(__dirname, 'content.json');

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-05-20" });

// API để lưu dữ liệu
app.post('/api/save', async (req, res) => {
    try {
        const { title, content } = req.body;
        if (!title || !content) {
            return res.status(400).json({ error: 'Title và content là bắt buộc.' });
        }
        let existingData = [];
        try {
            const fileContent = await fs.readFile(contentFilePath, 'utf-8');
            existingData = JSON.parse(fileContent);
        } catch (error) { /* File không tồn tại, bỏ qua */ }

        existingData.push({ title, content });
        await fs.writeFile(contentFilePath, JSON.stringify(existingData, null, 2), 'utf-8');
        res.status(200).json({ message: 'Lưu thành công!' });
    } catch (error) {
        console.error('Lỗi khi lưu file:', error);
        res.status(500).json({ error: 'Lỗi server khi lưu file.' });
    }
});

// API cho chat (streaming)
app.post('/api/chat', async (req, res) => {
    try {
        const { history } = req.body;
        if (!history || history.length === 0) {
            return res.status(400).json({ error: 'Lịch sử chat là bắt buộc.' });
        }

        let knowledgeBase = "[]";
        try {
            knowledgeBase = await fs.readFile(contentFilePath, 'utf-8');
        } catch (error) { /* Không có file, bỏ qua */ }

        const systemInstruction = {
            parts: [{
                text: `Bạn là một trợ lý chatbot quảng cáo thông minh và linh hoạt. Vai trò của bạn là trả lời câu hỏi của khách hàng theo một quy trình ưu tiên rõ ràng.

**QUY TRÌNH XỬ LÝ:**

1. **Kiểm tra Dữ liệu Quảng cáo (Ưu tiên cao nhất)**
   Luôn luôn tìm câu trả lời trong **NỘI DUNG QUẢNG CÁO ĐỘC QUYỀN** được cung cấp dưới đây trước tiên.
   **NỘI DUNG QUẢNG CÁO ĐỘC QUYỀN:**
${knowledgeBase}

2. **Sử dụng Kiến thức chung và Ngữ cảnh cuộc trò chuyện**
   Nếu câu hỏi không liên quan đến dữ liệu quảng cáo, hãy sử dụng kiến thức chung và lịch sử trò chuyện để trả lời.

3. **Chuyển cho tư vấn viên (Khi không thể trả lời)**
   Chỉ nói "Cảm ơn câu hỏi của bạn, tôi sẽ chuyển thông tin này đến bộ phận tư vấn để hỗ trợ bạn tốt hơn nhé." khi bạn không thể trả lời bằng cả hai bước trên.

**QUY TẮC ĐỊNH DẠNG:**
- **Sử dụng định dạng Markdown** để câu trả lời rõ ràng.
- Dùng dấu sao (*) hoặc gạch đầu dòng (-) cho danh sách.  
- Dùng hai dấu sao (**)để in đậm** các tiêu đề hoặc thông tin quan trọng.`
            }],
            role: "model"
        };

        let chatHistory = [];
        if (history.length > 1) {
            chatHistory = history.slice(0, -1);
        }
        
        const chat = model.startChat({
            history: chatHistory,
            systemInstruction: systemInstruction
        });

        const lastUserMessage = history[history.length - 1].parts[0].text;
        const result = await chat.sendMessageStream(lastUserMessage);

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        
        for await (const chunk of result.stream) {
            res.write(chunk.text());
        }
        res.end();

    } catch (error) {
        console.error('Lỗi streaming:', error);
        res.status(500).end('Lỗi từ server.');
    }
});

// API để lấy danh sách nội dung
app.get('/api/content', async (req, res) => {
    try {
        let existingData = [];
        try {
            const fileContent = await fs.readFile(contentFilePath, 'utf-8');
            existingData = JSON.parse(fileContent);
        } catch (error) { 
            // File không tồn tại, trả về mảng rỗng
        }
        res.status(200).json(existingData);
    } catch (error) {
        console.error('Lỗi khi đọc file:', error);
        res.status(500).json({ error: 'Lỗi server khi đọc file.' });
    }
});

// API để xóa nội dung theo index
app.delete('/api/content/:index', async (req, res) => {
    try {
        const index = parseInt(req.params.index);
        if (isNaN(index) || index < 0) {
            return res.status(400).json({ error: 'Index không hợp lệ.' });
        }

        let existingData = [];
        try {
            const fileContent = await fs.readFile(contentFilePath, 'utf-8');
            existingData = JSON.parse(fileContent);
        } catch (error) {
            return res.status(404).json({ error: 'Không tìm thấy file dữ liệu.' });
        }

        if (index >= existingData.length) {
            return res.status(404).json({ error: 'Không tìm thấy nội dung để xóa.' });
        }

        existingData.splice(index, 1);
        await fs.writeFile(contentFilePath, JSON.stringify(existingData, null, 2), 'utf-8');
        res.status(200).json({ message: 'Xóa thành công!' });
    } catch (error) {
        console.error('Lỗi khi xóa nội dung:', error);
        res.status(500).json({ error: 'Lỗi server khi xóa nội dung.' });
    }
});

app.listen(port, () => {
    console.log(`Server đang chạy tại http://localhost:${port}`);
});