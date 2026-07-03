// ===== 部署后请修改为你的后端接口地址 =====
// 正确，无后缀
const BACKEND_URL = "https://annual-xtractor-itqfrlvwsx.cn-hangzhou.fcapp.run"

const fileInput = document.getElementById('file-input');
const selectBtn = document.getElementById('select-btn');
const uploadArea = document.getElementById('upload-area');
const fileList = document.getElementById('file-list');
const extractBtn = document.getElementById('extract-btn');
const statusSection = document.getElementById('status-section');
const statusText = document.getElementById('status-text');
const progressFill = document.getElementById('progress-fill');
const resultSection = document.getElementById('result-section');
const exportBtn = document.getElementById('export-btn');

let selectedFiles = [];
let extractResult = null;

// 选择文件
selectBtn.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
    selectedFiles = Array.from(e.target.files);
    renderFileList();
});

// 拖拽上传
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '#3b82f6';
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.style.borderColor = '#cbd5e1';
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '#cbd5e1';
    selectedFiles = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
    renderFileList();
});

function renderFileList() {
    fileList.innerHTML = '';
    selectedFiles.forEach(file => {
        const div = document.createElement('div');
        div.className = 'file-item';
        div.innerHTML = `<span>${file.name}</span><span>${(file.size/1024/1024).toFixed(2)} MB</span>`;
        fileList.appendChild(div);
    });
    extractBtn.disabled = selectedFiles.length === 0;
}

// 开始提取
extractBtn.addEventListener('click', async () => {
    if (selectedFiles.length === 0) return;

    statusSection.classList.remove('hidden');
    resultSection.classList.add('hidden');
    extractBtn.disabled = true;
    statusText.textContent = '正在上传并处理文件...';
    progressFill.style.width = '30%';

    const formData = new FormData();
    formData.append('file', selectedFiles[0]);

    try {
        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            body: formData
        });

        progressFill.style.width = '80%';
        const result = await response.json();

        if (result.code === 0) {
            extractResult = result.data;
            renderResult(extractResult);
            statusText.textContent = '处理完成！';
            progressFill.style.width = '100%';
            resultSection.classList.remove('hidden');
        } else {
            statusText.textContent = '处理失败：' + result.msg;
        }
    } catch (err) {
        statusText.textContent = '请求失败，请检查后端地址是否正确';
        console.error(err);
    } finally {
        extractBtn.disabled = false;
    }
});

// 渲染结果
function renderResult(data) {
    // 渲染资产负债表
    const balanceTable = document.getElementById('balance-table');
    let balanceHtml = '<table><tr><th>科目</th><th>期末余额</th><th>期初余额</th></tr>';
    data.balance_sheet.forEach(item => {
        balanceHtml += `<tr><td>${item.item}</td><td>${item.end_balance}</td><td>${item.begin_balance}</td></tr>`;
    });
    balanceHtml += '</table>';
    balanceTable.innerHTML = balanceHtml;

    // 渲染管理层变动
    const managementTable = document.getElementById('management-table');
    let mgmtHtml = '<table><tr><th>姓名</th><th>职位</th><th>变动类型</th><th>变动时间</th><th>变动原因</th></tr>';
    data.management_changes.forEach(item => {
        mgmtHtml += `<tr><td>${item.name}</td><td>${item.position}</td><td>${item.change_type}</td><td>${item.date}</td><td>${item.reason}</td></tr>`;
    });
    mgmtHtml += '</table>';
    managementTable.innerHTML = mgmtHtml;

    // 渲染附注
    const notesContent = document.getElementById('notes-content');
    let notesHtml = '';
    data.notes.forEach(item => {
        notesHtml += `<p><strong>${item.title}</strong></p><p>${item.content}</p><br>`;
    });
    notesContent.innerHTML = notesHtml;
}

// Tab切换
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    });
});

// 导出Excel
exportBtn.addEventListener('click', () => {
    if (!extractResult) return;

    const wb = XLSX.utils.book_new();

    // 资产负债表Sheet
    const ws1 = XLSX.utils.json_to_sheet(extractResult.balance_sheet);
    XLSX.utils.book_append_sheet(wb, ws1, "资产负债表");

    // 管理层变动Sheet
    const ws2 = XLSX.utils.json_to_sheet(extractResult.management_changes);
    XLSX.utils.book_append_sheet(wb, ws2, "管理层变动");

    // 附注Sheet
    const ws3 = XLSX.utils.json_to_sheet(extractResult.notes);
    XLSX.utils.book_append_sheet(wb, ws3, "财务附注");

    XLSX.writeFile(wb, "年报提取结果.xlsx");
});