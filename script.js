// ================================================================
//  DOM 引用
// ================================================================
const uploadZone = document.getElementById('uploadZone');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fiName = document.getElementById('fiName');
const fiSize = document.getElementById('fiSize');
const fiType = document.getElementById('fiType');
const fiRemove = document.getElementById('fiRemove');
const contentEditor = document.getElementById('contentEditor');
const wordCount = document.getElementById('wordCount');
const toast = document.getElementById('toast');
const toastIcon = document.getElementById('toastIcon');
const toastMsg = document.getElementById('toastMsg');

const btnToTxt = document.getElementById('btnToTxt');
const btnToWord = document.getElementById('btnToWord');
const btnToPdf = document.getElementById('btnToPdf');
const btnDownload = document.getElementById('btnDownload');
const btnClear = document.getElementById('btnClear');

// ================================================================
//  状态
// ================================================================
let currentFile = null; // { name, size, type, content, rawFile }
let currentFormat = 'txt';
let toastTimer = null;

// ================================================================
//  PDF.js 配置
// ================================================================
pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// ================================================================
//  工具函数
// ================================================================
function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
}

function getFileExtension(name) {
    const i = name.lastIndexOf('.');
    return i > 0 ? name.slice(i + 1).toLowerCase() : '';
}

function showToast(msg, type = 'info') {
    if (toastTimer) clearTimeout(toastTimer);
    toast.className = 'toast show';
    if (type === 'error') toast.classList.add('error');
    else if (type === 'success') toast.classList.add('success');
    else toast.classList.remove('error', 'success');
    toastIcon.textContent = type === 'error' ? '✖' : type === 'success' ? '✔' : 'ℹ';
    toastMsg.textContent = msg;
    toastTimer = setTimeout(() => {
        toast.classList.remove('show');
    }, 4500);
}

function updateWordCount() {
    const text = contentEditor.value;
    const count = text.replace(/\s/g, '').length;
    wordCount.textContent = `字数: ${count}`;
}

function setButtonsEnabled(enabled) {
    [btnToTxt, btnToWord, btnToPdf, btnDownload].forEach(b => b.disabled = !enabled);
}

function clearFileState() {
    currentFile = null;
    currentFormat = 'txt';
    fileInfo.classList.remove('show');
    contentEditor.value = '';
    contentEditor.disabled = false;
    updateWordCount();
    setButtonsEnabled(false);
    fiRemove.style.display = 'none';
}

// ================================================================
//  读取文件
// ================================================================
async function readFileContent(file) {
    const ext = getFileExtension(file.name);
    let content = '';
    let format = 'txt';

    try {
        if (ext === 'txt') {
            content = await file.text();
            format = 'txt';
        } else if (ext === 'docx') {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer });
            content = result.value || '(Word 文档无文本内容)';
            format = 'docx';
        } else if (ext === 'pdf') {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += pageText + '\n\n';
            }
            content = fullText.trim() || '(PDF 无文本内容)';
            format = 'pdf';
        } else {
            throw new Error('不支持的文件格式: ' + ext);
        }
        return { content, format };
    } catch (err) {
        throw new Error('读取文件失败: ' + err.message);
    }
}

// ================================================================
//  上传处理
// ================================================================
async function handleFile(file) {
    if (!file) return;
    const ext = getFileExtension(file.name);
    if (!['txt', 'docx', 'pdf'].includes(ext)) {
        showToast('请上传 .txt .docx .pdf 格式的文件', 'error');
        return;
    }

    try {
        const { content, format } = await readFileContent(file);

        currentFile = {
            name: file.name,
            size: file.size,
            type: format,
            content: content,
            rawFile: file,
        };
        currentFormat = format;

        fiName.textContent = file.name;
        fiSize.textContent = formatSize(file.size);
        fiType.textContent = format.toUpperCase();
        fileInfo.classList.add('show');
        fiRemove.style.display = 'inline';

        contentEditor.value = content;
        contentEditor.disabled = false;
        updateWordCount();
        setButtonsEnabled(true);

        showToast(`✅ 已加载: ${file.name} (${format.toUpperCase()})`, 'success');
    } catch (err) {
        showToast('❌ ' + err.message, 'error');
    }
}

// ---------- 事件：上传 ----------
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) handleFile(e.target.files[0]);
    e.target.value = '';
});

uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('dragover');
});
uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('dragover');
});
uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
});

uploadZone.addEventListener('click', (e) => {
    if (e.target.tagName !== 'INPUT') fileInput.click();
});

fiRemove.addEventListener('click', () => {
    clearFileState();
    showToast('已移除文件', 'info');
});

btnClear.addEventListener('click', () => {
    if (currentFile) {
        clearFileState();
        showToast('已清空', 'info');
    } else {
        contentEditor.value = '';
        updateWordCount();
        showToast('已清空编辑区', 'info');
    }
});

contentEditor.addEventListener('input', updateWordCount);

// ================================================================
//  转换功能
// ================================================================
function getCurrentContent() {
    return contentEditor.value;
}

// ----- 转 TXT -----
btnToTxt.addEventListener('click', async () => {
    const text = getCurrentContent();
    if (!text.trim()) {
        showToast('内容为空，请先上传或输入文本', 'error');
        return;
    }
    try {
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const baseName = currentFile ? currentFile.name.replace(/\.[^.]+$/, '') : 'document';
        link.download = baseName + '.txt';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast('✅ 已转换为 TXT 并下载', 'success');
    } catch (err) {
        showToast('❌ 转换失败: ' + err.message, 'error');
    }
});

// ----- 转 Word -----
btnToWord.addEventListener('click', async () => {
    const text = getCurrentContent();
    if (!text.trim()) {
        showToast('内容为空，请先上传或输入文本', 'error');
        return;
    }
    try {
        const htmlContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office'
              xmlns:w='urn:schemas-microsoft-com:office:word'
              xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset="utf-8" />
            <style>body{font-family:'Segoe UI','PingFang SC',sans-serif;font-size:14px;line-height:1.7;padding:30px;}
            p{margin:0 0 10px 0;}</style>
        </head>
        <body>${text.split('\n').map(line => `<p>${line || ' '}</p>`).join('')}</body>
        </html>
        `;
        const blob = new Blob([htmlContent], { type: 'application/msword;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const baseName = currentFile ? currentFile.name.replace(/\.[^.]+$/, '') : 'document';
        link.download = baseName + '.doc';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast('✅ 已转换为 Word (.doc) 并下载', 'success');
    } catch (err) {
        showToast('❌ 转换失败: ' + err.message, 'error');
    }
});

// ----- 转 PDF -----
btnToPdf.addEventListener('click', async () => {
    const text = getCurrentContent();
    if (!text.trim()) {
        showToast('内容为空，请先上传或输入文本', 'error');
        return;
    }
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        const maxWidth = pageWidth - margin * 2;
        const fontSize = 12;
        doc.setFontSize(fontSize);
        const lineHeight = fontSize * 1.6 / 0.3528;

        const lines = doc.splitTextToSize(text, maxWidth);
        let y = margin;
        for (let i = 0; i < lines.length; i++) {
            if (y > doc.internal.pageSize.getHeight() - margin) {
                doc.addPage();
                y = margin;
            }
            doc.text(lines[i], margin, y);
            y += lineHeight;
        }
        const pdfBlob = doc.output('blob');
        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        const baseName = currentFile ? currentFile.name.replace(/\.[^.]+$/, '') : 'document';
        link.download = baseName + '.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast('✅ 已转换为 PDF 并下载', 'success');
    } catch (err) {
        showToast('❌ 转换失败: ' + err.message, 'error');
    }
});

// ----- 保存 -----
btnDownload.addEventListener('click', async () => {
    const text = getCurrentContent();
    if (!text.trim()) {
        showToast('内容为空，请先上传或输入文本', 'error');
        return;
    }

    if (!currentFile) {
        try {
            const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'document.txt';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            showToast('✅ 已保存为 TXT', 'success');
        } catch (err) {
            showToast('❌ 保存失败: ' + err.message, 'error');
        }
        return;
    }

    const format = currentFormat;
    try {
        if (format === 'txt') {
            const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = currentFile.name.replace(/\.[^.]+$/, '') + '.txt';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            showToast('✅ 已保存为 TXT', 'success');
        } else if (format === 'docx') {
            const htmlContent = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office'
                  xmlns:w='urn:schemas-microsoft-com:office:word'
                  xmlns='http://www.w3.org/TR/REC-html40'>
            <head><meta charset="utf-8" />
                <style>body{font-family:'Segoe UI','PingFang SC',sans-serif;font-size:14px;line-height:1.7;padding:30px;}
                p{margin:0 0 10px 0;}</style>
            </head>
            <body>${text.split('\n').map(line => `<p>${line || ' '}</p>`).join('')}</body>
            </html>
            `;
            const blob = new Blob([htmlContent], { type: 'application/msword;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = currentFile.name.replace(/\.[^.]+$/, '') + '.doc';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            showToast('✅ 已保存为 Word (.doc)', 'success');
        } else if (format === 'pdf') {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('p', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();
            const margin = 20;
            const maxWidth = pageWidth - margin * 2;
            const fontSize = 12;
            doc.setFontSize(fontSize);
            const lineHeight = fontSize * 1.6 / 0.3528;
            const lines = doc.splitTextToSize(text, maxWidth);
            let y = margin;
            for (let i = 0; i < lines.length; i++) {
                if (y > doc.internal.pageSize.getHeight() - margin) {
                    doc.addPage();
                    y = margin;
                }
                doc.text(lines[i], margin, y);
                y += lineHeight;
            }
            const pdfBlob = doc.output('blob');
            const url = URL.createObjectURL(pdfBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = currentFile.name.replace(/\.[^.]+$/, '') + '.pdf';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            showToast('✅ 已保存为 PDF', 'success');
        }
    } catch (err) {
        showToast('❌ 保存失败: ' + err.message, 'error');
    }
});

// ================================================================
//  初始化
// ================================================================
clearFileState();
showToast('💡 上传文档开始转换，或直接在编辑区输入文字', 'info');