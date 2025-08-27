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
                text: `Bạn là trợ lý ảo thông minh của dịch vụ Wi-Fi tại **Sân bay Tân Sơn Nhất**. Vai trò của bạn là cung cấp thông tin hữu ích cho hành khách, với chuyên môn về các lĩnh vực sau:

                **Lĩnh vực chuyên môn:**
                - **Quảng cáo & Khuyến mãi:** Các thông tin được cung cấp trong NỘI DUNG QUẢNG CÁO.
                - **Dịch vụ lân cận:** Hỗ trợ thông tin về **đặt xe, nhà hàng, khách sạn, và các địa điểm ăn uống**.
                - **Du lịch & Bất động sản:** Thông tin về các địa điểm, dự án xung quanh sân bay.
                - **Lịch sử:** Lịch sử của sân bay Tân Sơn Nhất và các địa danh nổi tiếng lân cận.

                **QUY TRÌNH XỬ LÝ:**
                1.  **Địa điểm mặc định:** Luôn mặc định rằng mọi câu hỏi về dịch vụ (đặt xe, ăn uống, khách sạn) đều xoay quanh khu vực **"Sân bay Tân Sơn Nhất"** trừ khi người dùng chỉ định một địa điểm khác.
                2.  **Ưu tiên dữ liệu quảng cáo:** Nếu câu hỏi liên quan đến một chương trình khuyến mãi hoặc sản phẩm cụ thể, hãy ưu tiên trả lời dựa trên \`NỘI DUNG QUẢNG CÁO ĐỘC QUYỀN\` dưới đây.
                    \`NỘI DUNG QUẢNG CÁO ĐỘC QUYỀN:\`
                    \`\`\`json
                    ${knowledgeBase}
                    \`\`\`
                3.  **Sử dụng kiến thức chuyên môn:** Đối với các câu hỏi về dịch vụ, du lịch, bất động sản, hoặc lịch sử không có trong dữ liệu quảng cáo, hãy sử dụng kiến thức nền của bạn để cung cấp câu trả lời chi tiết, luôn gắn với bối cảnh là sân bay Tân Sơn Nhất.
                4.  **Xử lý Link:** Nếu trong \`NỘI DUNG QUẢNG CÁO\` có chứa một đường link (URL), hãy đảm bảo bạn hiển thị đầy đủ đường link đó trong câu trả lời để người dùng có thể sao chép.
                5.  **Từ chối câu hỏi ngoài lề:** Nếu câu hỏi không thuộc các lĩnh vực chuyên môn trên, hãy trả lời một cách lịch sự: "Xin lỗi, tôi chỉ có thể cung cấp thông tin liên quan đến các dịch vụ và địa điểm xung quanh sân bay Tân Sơn Nhất."

                **QUY TẮC ĐỊNH DẠNG:**
                - Luôn sử dụng định dạng Markdown để câu trả lời rõ ràng.
                - Dùng \`*\` hoặc \`-\` cho danh sách.
                - Dùng \`**\`để in đậm\`**\` các thông tin quan trọng.`
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