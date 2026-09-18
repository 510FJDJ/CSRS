// 首頁「全校預約行事曆」：真實日期月曆＋分類頁籤，筆數與當日動態皆為依日期+分類算出的示範資料
// 待後端就緒後，只需把 countFor()／entriesFor() 換成對應的 fetch 呼叫，資料結構（每日筆數／當日清單）維持不變
(function () {
    'use strict';

    var CATEGORY_LABELS = {
        all: '全部空間',
        general: '一般教學',
        artsSports: '藝術體育',
        specialEd: '特教專業',
        vocational: '職業教育',
        meeting: '會議空間'
    };

    var CATEGORIES = ['general', 'artsSports', 'specialEd', 'vocational', 'meeting'];

    var WEEKDAY_CN = ['日', '一', '二', '三', '四', '五', '六'];

    var PERIODS = [
        { label: '第一節', time: '08:00-08:50' },
        { label: '第二節', time: '09:00-09:50' },
        { label: '第三節', time: '10:00-10:50' },
        { label: '第四節', time: '11:00-11:50' },
        { label: '第五節', time: '13:00-13:50' },
        { label: '第六節', time: '13:50-14:40' },
        { label: '第七節', time: '14:50-15:40' },
        { label: '第八節', time: '15:45-16:30' }
    ];

    var ENTRY_POOL = {
        general: [
            { space: '電腦教室(一)', desc: '［課表同步］高一甲・中文閱讀與寫作 VI・王O明' },
            { space: '視聽教室', desc: '特教師資：溝通輔具應用工作坊・陳O華' },
            { space: '電腦教室(一)', desc: '教師資訊研習・資訊組' },
            { space: '普通教室201', desc: '班級輔導活動・林O安' }
        ],
        artsSports: [
            { space: '綜合活動中心', desc: '高二合唱班隊練習・李O婷' },
            { space: '風雨球場', desc: '班際籃球友誼賽・體育組' }
        ],
        specialEd: [
            { space: '知動教室', desc: '感覺統合訓練課程・李O婷' },
            { space: '團體諮商室', desc: '學生輔導會議・張O強' },
            { space: '職能治療室', desc: '個別化職能訓練・王O安' }
        ],
        vocational: [
            { space: '烹飪教室A', desc: '職場實習前訓練・林O芳' },
            { space: '烘焙教室', desc: '烘焙丙級證照實作課・黃O成' }
        ],
        meeting: [
            { space: '第二會議室', desc: '特推會期初會議・教務處' },
            { space: '第一會議室', desc: '期中校務會議籌備會・秘書室' }
        ]
    };

    var tablist = document.querySelector('.calendar-home-filters[role="tablist"]');
    var viewLabel = document.querySelector('.calendar-home-view strong');
    var legendText = document.querySelector('.calendar-home-legend > span:last-child');
    var monthLabel = document.querySelector('.calendar-home-month');
    var daysContainer = document.querySelector('.calendar-home-days');
    var prevBtn = document.querySelector('.calendar-home-navbtn[aria-label="上個月"]');
    var nextBtn = document.querySelector('.calendar-home-navbtn[aria-label="下個月"]');
    var todayBtn = document.querySelector('.calendar-home-todaybtn');
    var agendaTitle = document.querySelector('.calendar-agenda-head h3');
    var agendaDateLabel = document.querySelector('.calendar-agenda-head small');
    var agendaCount = document.querySelector('.calendar-agenda-count');
    var agendaScroll = document.querySelector('.calendar-agenda-scroll');
    var agendaList = document.querySelector('.calendar-agenda-list');
    var agendaMore = document.querySelector('.calendar-agenda-more');
    var boardCard = document.querySelector('.calendar-home-board');
    var agendaCard = document.querySelector('.calendar-home-agenda');

    if (!tablist || !daysContainer || !agendaList) { return; }

    var today = new Date();
    today.setHours(0, 0, 0, 0);

    var viewYear = today.getFullYear();
    var viewMonth = today.getMonth() + 1; // 1-based
    var selYear = viewYear;
    var selMonth = viewMonth;
    var selDay = today.getDate();

    // ---- 依年月日+分類算出示範筆數（種子式假亂數，同一天永遠算出同一個結果）----
    function seededRandom(seed) {
        var x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }

    function dateSeed(year, month, day, salt) {
        return year * 10000 + month * 100 + day + salt;
    }

    function countFor(year, month, day, category) {
        if (category === 'all') {
            return CATEGORIES.reduce(function (sum, cat) {
                return sum + countFor(year, month, day, cat);
            }, 0);
        }
        var idx = CATEGORIES.indexOf(category);
        var r = seededRandom(dateSeed(year, month, day, idx * 97));
        return r < 0.35 ? 0 : Math.ceil(r * 6);
    }

    function entriesFor(year, month, day) {
        var list = [];
        CATEGORIES.forEach(function (cat, catIdx) {
            var count = countFor(year, month, day, cat);
            var pool = ENTRY_POOL[cat];
            for (var i = 0; i < count; i++) {
                var seed = dateSeed(year, month, day, catIdx * 97) + i * 13;
                var template = pool[Math.floor(seededRandom(seed + 1) * pool.length)];
                var periodIndex = Math.floor(seededRandom(seed + 2) * PERIODS.length);
                var status = seededRandom(seed + 3) < 0.7 ? '已核准' : '審核中';
                list.push({
                    category: cat,
                    periodIndex: periodIndex,
                    space: template.space,
                    desc: template.desc,
                    status: status
                });
            }
        });
        return list;
    }

    function daysInMonth(year, month) {
        return new Date(year, month, 0).getDate();
    }

    function firstWeekday(year, month) {
        return new Date(year, month - 1, 1).getDay();
    }

    function isPastDate(year, month, day) {
        var d = new Date(year, month - 1, day);
        d.setHours(0, 0, 0, 0);
        return d.getTime() <= today.getTime();
    }

    function isTodayDate(year, month, day) {
        return year === today.getFullYear() && month === today.getMonth() + 1 && day === today.getDate();
    }

    function findFastestDay(year, month, category) {
        var total = daysInMonth(year, month);
        for (var d = 1; d <= total; d++) {
            if (isPastDate(year, month, d)) { continue; }
            if (countFor(year, month, d, category) > 0) { return d; }
        }
        return null;
    }

    function getActiveCategory() {
        var activeTab = tablist.querySelector('[role="tab"][aria-selected="true"]');
        return activeTab ? activeTab.id.replace('tab-', '') : 'all';
    }

    // ---- 月曆格子 ----
    function buildDayButton(year, month, day, category, fastestDay) {
        var count = countFor(year, month, day, category);
        var past = isPastDate(year, month, day);
        var isToday = isTodayDate(year, month, day);
        var selected = year === selYear && month === selMonth && day === selDay;
        var fastest = !past && day === fastestDay;

        var classes = ['calendar-home-day'];
        if (past) { classes.push('is-past'); }
        if (isToday) { classes.push('is-today'); }
        if (selected) { classes.push('is-selected'); }
        if (fastest) { classes.push('has-fastest'); }

        var countText = count > 0 ? count + '筆' : '-';
        var badge = fastest ? '<span class="calendar-home-fastest" aria-hidden="true">最快可約</span>' : '';

        var attrs = ' data-day="' + day + '"';
        var ariaLabel = '';
        if (past) {
            attrs += ' aria-disabled="true" aria-describedby="calPastHint"';
            if (isToday) { ariaLabel = month + '月' + day + '日，今天'; }
        } else {
            attrs += ' aria-pressed="' + (selected ? 'true' : 'false') + '"';
            if (selected) {
                ariaLabel = month + '月' + day + '日，' + count + '筆預約，目前檢視日期';
            } else if (fastest) {
                ariaLabel = month + '月' + day + '日，' + count + '筆預約，最快可約';
            }
        }
        if (ariaLabel) { attrs += ' aria-label="' + ariaLabel + '"'; }

        return '<button type="button" class="' + classes.join(' ') + '"' + attrs + '>' + badge +
            '<span class="calendar-home-daynum">' + day + '</span>' +
            '<span class="calendar-home-daycount">' + countText + '</span></button>';
    }

    function renderMonthGrid(category) {
        var total = daysInMonth(viewYear, viewMonth);
        var leading = firstWeekday(viewYear, viewMonth);
        var fastestDay = findFastestDay(viewYear, viewMonth, category);

        var html = '';
        for (var e = 0; e < leading; e++) {
            html += '<span class="calendar-home-day is-empty" aria-hidden="true"></span>';
        }
        var monthTotal = 0;
        for (var d = 1; d <= total; d++) {
            html += buildDayButton(viewYear, viewMonth, d, category, fastestDay);
            monthTotal += countFor(viewYear, viewMonth, d, category);
        }
        daysContainer.innerHTML = html;

        if (monthLabel) {
            monthLabel.textContent = viewYear + '年' + viewMonth + '月';
        }
        if (legendText) {
            legendText.textContent = '目前共 ' + monthTotal + ' 筆預約，點選日期查看當日排程';
        }
    }

    // ---- 當日動態 ----
    function renderAgenda(category) {
        var allEntries = entriesFor(selYear, selMonth, selDay);
        var filtered = category === 'all'
            ? allEntries
            : allEntries.filter(function (entry) { return entry.category === category; });

        var byPeriod = {};
        filtered.forEach(function (entry) {
            (byPeriod[entry.periodIndex] = byPeriod[entry.periodIndex] || []).push(entry);
        });
        var periodIndexes = Object.keys(byPeriod).map(Number).sort(function (a, b) { return a - b; });

        var html = periodIndexes.map(function (pIdx) {
            var period = PERIODS[pIdx];
            var entriesHtml = byPeriod[pIdx].map(function (entry) {
                var tagClass = entry.status === '已核准' ? 'tag-success' : 'tag-warning';
                return '<li class="calendar-agenda-entry" data-category="' + entry.category + '">' +
                    '<span class="flex-row-start"><strong>' + entry.space + '</strong>' +
                    '<span class="tagPill ' + tagClass + '">' + entry.status + '</span></span>' +
                    '<small>' + entry.desc + '</small></li>';
            }).join('');
            return '<li class="calendar-agenda-period">' +
                '<div class="calendar-agenda-periodmeta flex-column"><strong>' + period.label + '</strong><span>' + period.time + '</span></div>' +
                '<ul class="calendar-agenda-entries flex-column">' + entriesHtml + '</ul></li>';
        }).join('');

        var emptyText = allEntries.length === 0 ? '本日尚無預約資料' : '此分類當日尚無預約紀錄';
        html += '<li class="calendar-agenda-empty"' + (filtered.length ? ' hidden' : '') + '>' + emptyText + '</li>';

        agendaList.innerHTML = html;

        var isToday = isTodayDate(selYear, selMonth, selDay);
        var dow = new Date(selYear, selMonth - 1, selDay).getDay();
        var dateText = selMonth + '月' + selDay + '日（' + WEEKDAY_CN[dow] + '）';

        if (agendaTitle) { agendaTitle.textContent = isToday ? '今日動態' : '當日動態'; }
        if (agendaDateLabel) { agendaDateLabel.textContent = dateText; }
        if (agendaCount) { agendaCount.textContent = filtered.length + '筆'; }
        if (agendaScroll) { agendaScroll.setAttribute('aria-label', dateText + '預約清單'); }
    }

    // ---- 右側動態卡片高度對齊左側月曆卡（並排時才對齊，行動版堆疊時還原自動高度）----
    function syncAgendaHeight() {
        if (!boardCard || !agendaCard) { return; }
        var boardTop = boardCard.getBoundingClientRect().top;
        var agendaTop = agendaCard.getBoundingClientRect().top;
        if (Math.abs(boardTop - agendaTop) > 1) {
            agendaCard.style.height = '';
            return;
        }
        agendaCard.style.height = boardCard.offsetHeight + 'px';
    }

    // ---- 內容未超出可視高度（不需捲動）時，隱藏「滾動 查看更多動態」提示 ----
    function updateAgendaMoreHint() {
        if (!agendaScroll || !agendaMore) { return; }
        agendaMore.hidden = agendaScroll.scrollHeight <= agendaScroll.clientHeight + 1;
    }

    function render() {
        var category = getActiveCategory();
        if (viewLabel) { viewLabel.textContent = CATEGORY_LABELS[category]; }
        renderMonthGrid(category);
        renderAgenda(category);
        syncAgendaHeight();
        updateAgendaMoreHint();
    }

    // ---- 事件綁定 ----
    daysContainer.addEventListener('click', function (e) {
        var btn = e.target.closest('.calendar-home-day');
        if (!btn || btn.classList.contains('is-empty') || btn.hasAttribute('aria-disabled')) { return; }
        selYear = viewYear;
        selMonth = viewMonth;
        selDay = parseInt(btn.getAttribute('data-day'), 10);
        render();
    });

    if (prevBtn) {
        prevBtn.addEventListener('click', function () {
            viewMonth -= 1;
            if (viewMonth < 1) { viewMonth = 12; viewYear -= 1; }
            render();
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', function () {
            viewMonth += 1;
            if (viewMonth > 12) { viewMonth = 1; viewYear += 1; }
            render();
        });
    }

    if (todayBtn) {
        todayBtn.addEventListener('click', function () {
            viewYear = today.getFullYear();
            viewMonth = today.getMonth() + 1;
            selYear = viewYear;
            selMonth = viewMonth;
            selDay = today.getDate();
            render();
        });
    }

    tablist.addEventListener('tabs:activate', function () {
        render();
    });

    var resizeTimer = null;
    window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
            syncAgendaHeight();
            updateAgendaMoreHint();
        }, 150);
    });

    document.addEventListener('DOMContentLoaded', render);
})();
