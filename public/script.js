document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('content-form');
    const formStatus = document.getElementById('form-status');
    const sendButton = document.getElementById('send-button');
    const userInput = document.getElementById('user-message');
    const chatWindow = document.getElementById('chat-window');
    const contentList = document.getElementById('content-list');
    
    let chatHistory = [];

    // Hàm load và hiển thị nội dung
    const loadContent = async () => {
        try {
            const response = await fetch('/api/content');
            const contentData = await response.json();
            
            if (!response.ok) {
                throw new Error(contentData.error || 'Lỗi khi tải nội dung');
            }
            
            displayContent(contentData);
        } catch (error) {
            contentList.innerHTML = `<p class="no-content">Lỗi: ${error.message}</p>`;
        }
    };

    // Hàm hiển thị nội dung
    const displayContent = (contentData) => {
        if (!contentData || contentData.length === 0) {
            contentList.innerHTML = '<p class="no-content">Chưa có nội dung nào được lưu</p>';
            return;
        }

        const contentHTML = contentData.map((item, index) => `
            <div class="content-item">
                <div class="content-item-header">
                    <h4 class="content-item-title">${item.title}</h4>
                    <button class="delete-btn" onclick="deleteContent(${index})">Xóa</button>
                </div>
                <div class="content-item-content">${item.content}</div>
            </div>
        `).join('');
        
        contentList.innerHTML = contentHTML;
    };

    // Hàm chuyển tab
    window.showTab = (tabName) => {
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.getElementById(tabName).classList.add('active');
        event.currentTarget.classList.add('active');
        
        // Load content khi chuyển sang tab data-entry
        if (tabName === 'data-entry') {
            loadContent();
        }
    };

    // Xử lý form nhập liệu
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('title').value;
        const content = document.getElementById('content').value;
        formStatus.textContent = 'Đang lưu...';
        try {
            const response = await fetch('/api/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, content })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            formStatus.textContent = result.message;
            formStatus.style.color = 'green';
            form.reset();
            // Reload content sau khi thêm thành công
            loadContent();
        } catch (error) {
            formStatus.textContent = `Lỗi: ${error.message}`;
            formStatus.style.color = 'red';
        }
        setTimeout(() => { formStatus.textContent = '' }, 3000);
    });

    // Hàm xóa nội dung
    window.deleteContent = async (index) => {
        if (!confirm('Bạn có chắc muốn xóa nội dung này?')) {
            return;
        }

        try {
            const response = await fetch(`/api/content/${index}`, {
                method: 'DELETE'
            });
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Lỗi khi xóa nội dung');
            }

            // Hiển thị thông báo thành công
            formStatus.textContent = result.message;
            formStatus.style.color = 'green';
            setTimeout(() => { formStatus.textContent = '' }, 3000);

            // Reload content sau khi xóa thành công
            loadContent();
        } catch (error) {
            formStatus.textContent = `Lỗi: ${error.message}`;
            formStatus.style.color = 'red';
            setTimeout(() => { formStatus.textContent = '' }, 3000);
        }
    };

    // Load content khi trang được tải lần đầu (nếu đang ở tab data-entry)
    if (document.getElementById('data-entry').classList.contains('active')) {
        loadContent();
    }

    // Hàm thêm tin nhắn vào giao diện
    const addMessage = (text, sender) => {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);
        const p = document.createElement('p');
        p.textContent = text;
        messageDiv.appendChild(p);
        chatWindow.appendChild(messageDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight;
        return p;
    };

    // Xử lý gửi tin nhắn
    const handleSendMessage = async () => {
        const message = userInput.value.trim();
        if (!message) return;

        addMessage(message, 'user');
        userInput.value = '';
        chatHistory.push({ role: "user", parts: [{ text: message }] });

        const botMessageElement = addMessage('...', 'bot');

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ history: chatHistory })
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.statusText}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullReply = '';
            botMessageElement.textContent = '';

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                fullReply += chunk;
                botMessageElement.innerHTML = fullReply
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\n\s*[\*-]\s/g, '<br>• ')
                    .replace(/\n/g, '<br>');
                chatWindow.scrollTop = chatWindow.scrollHeight;
            }
            
            chatHistory.push({ role: "model", parts: [{ text: fullReply }] });

        } catch (error) {
            botMessageElement.textContent = `Lỗi kết nối: ${error.message}`;
            chatHistory.pop(); // Xóa tin nhắn user bị lỗi khỏi lịch sử
        }
    };

    sendButton.addEventListener('click', handleSendMessage);
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSendMessage();
        }
    });
});