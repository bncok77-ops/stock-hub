// Mock Data
const newsData = [
    {
        id: 1,
        title: "코스피, 기관·외인 매수에 2700선 탈환... 반도체주 강세",
        category: "domestic",
        categoryName: "국내 증시",
        source: "경제뉴스",
        time: "10분 전",
        image: "📊"
    },
    {
        id: 2,
        title: "엔비디아, 실적 발표 앞두고 사상 최고치 경신... AI 열풍 지속",
        category: "global",
        categoryName: "해외 증시",
        source: "글로벌포스트",
        time: "30분 전",
        image: "🚀"
    },
    {
        id: 3,
        title: "비트코인, 현물 ETF 유입세에 7만 달러 안착 시도",
        category: "crypto",
        categoryName: "가상화폐",
        source: "코인투데이",
        time: "1시간 전",
        image: "₿"
    },
    {
        id: 4,
        title: "다음 달 대형 IPO 대어 출격... 공모주 시장 다시 달아오르나",
        category: "ipo",
        categoryName: "공모주",
        source: "증권타임즈",
        time: "2시간 전",
        image: "📈"
    },
    {
        id: 5,
        title: "금리 인하 기대감에 국채 금리 하락... 뉴욕증시 일제히 상승",
        category: "global",
        categoryName: "해외 증시",
        source: "월스트리트저널",
        time: "3시간 전",
        image: "🏦"
    },
    {
        id: 6,
        title: "현대차, 인도 법인 상장 추진 소식에 주가 급등",
        category: "domestic",
        categoryName: "국내 증시",
        source: "비즈니스워치",
        time: "4시간 전",
        image: "🚗"
    }
];

const tickerData = [
    { name: "KOSPI", price: "2,712.50", change: "+1.2%", status: "up" },
    { name: "KOSDAQ", price: "865.30", change: "+0.8%", status: "up" },
    { name: "S&P 500", price: "5,308.13", change: "+0.4%", status: "up" },
    { name: "NASDAQ", price: "16,832.27", change: "+1.1%", status: "up" },
    { name: "삼성전자", price: "78,500", change: "+1.5%", status: "up" },
    { name: "SK하이닉스", price: "198,200", change: "+3.2%", status: "up" },
    { name: "NVIDIA", price: "945.50", change: "+2.5%", status: "up" },
    { name: "Apple", price: "192.42", change: "+0.8%", status: "up" }
];

// DOM Elements
const newsContainer = document.getElementById('news-container');
const tickerWrap = document.getElementById('stock-ticker');
const navLinks = document.querySelectorAll('.nav-links a');

// Initialize
function init() {
    renderTicker();
    renderNews('all');
    setupEventListeners();
}

// Render Stock Ticker
function renderTicker() {
    // Duplicate items for seamless loop if needed, but simple CSS animation is used
    const tickerHtml = tickerData.map(item => `
        <div class="ticker-item">
            ${item.name} <span class="price ${item.status}">${item.price} (${item.change})</span>
        </div>
    `).join('');
    
    // Triple the content for a longer seamless scroll
    tickerWrap.innerHTML = tickerHtml + tickerHtml + tickerHtml;
}

// Render News Cards
function renderNews(filter) {
    newsContainer.innerHTML = '';
    
    const filteredNews = filter === 'all' 
        ? newsData 
        : newsData.filter(item => item.category === filter);

    if (filteredNews.length === 0) {
        newsContainer.innerHTML = '<div class="loading">관련 뉴스가 없습니다.</div>';
        return;
    }

    filteredNews.forEach(news => {
        const card = document.createElement('div');
        card.className = 'news-card';
        card.innerHTML = `
            <div class="news-image">${news.image}</div>
            <div class="news-content">
                <div class="news-category">${news.categoryName}</div>
                <h2 class="news-title">${news.title}</h2>
                <div class="news-meta">
                    <span class="source">${news.source}</span> • 
                    <span class="time">${news.time}</span>
                </div>
            </div>
        `;
        newsContainer.appendChild(card);
    });
}

// Setup Event Listeners
function setupEventListeners() {
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Update active state
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            // Filter news
            const category = link.getAttribute('data-category');
            renderNews(category);
        });
    });
}

// Run app
document.addEventListener('DOMContentLoaded', init);
