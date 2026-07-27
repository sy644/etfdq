<!-- stock.html 部分代码 -->
<body>
  <h2>贵州茅台行情</h2>
  <div id="stock-panel">
    <p>实时价格：<span id="price">加载中...</span></p>
    <p>更新时间：<span id="time"></span></p>
  </div>
  <div id="history-list">
    <h3>近5日历史</h3>
    <ul id="history-ul"></ul>
  </div>

  <script>
    // ========== 实时数据（新浪接口） ==========
    async function fetchRealtime() {
      const url = 'https://hq.sinajs.cn/list=sh600519';
      const resp = await fetch(url);
      const text = await resp.text();
      const arr = text.split('"')[1].split(',');
      document.getElementById('price').innerText = '¥' + arr[3];
      document.getElementById('time').innerText = arr[31];
    }

    // ========== 历史数据（网易接口） ==========
    async function fetchHistory() {
      const url = 'https://img1.money.126.net/data/hs/kline/day/history/20240101/20250727/0600519.json';
      const json = await (await fetch(url)).json();
      const ul = document.getElementById('history-ul');
      ul.innerHTML = '';
      json.data.slice(-5).forEach(item => {
        const li = document.createElement('li');
        li.innerText = `${item[0]} 开${item[1]} 收${item[2]} 高${item[3]} 低${item[4]}`;
        ul.appendChild(li);
      });
    }

    // 页面加载时调用
    fetchRealtime();
    fetchHistory();
    // 可加定时刷新实时价格：setInterval(fetchRealtime, 5000);
  </script>
</body># etfdq
