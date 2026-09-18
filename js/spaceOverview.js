// 空間使用總覽頁專屬：篩選送出切換周/單日檢視、日期導覽、點格子開啟使用詳情 modal
(function () {
    var SPACES = {
        computer1: { name: '電腦教室(一)', capacity: 2, category: 'general' },
        computer2: { name: '電腦教室(二)', capacity: 1, category: 'general' },
        av: { name: '視聽教室', capacity: 2, category: 'general' },
        motor: { name: '知動教室', capacity: 2, category: 'general' },
        rhythm: { name: '韻律教室', capacity: 1, category: 'artSport' },
        art: { name: '美勞教室', capacity: 2, category: 'artSport' },
        hall: { name: '綜合活動中心', capacity: 1, category: 'artSport' },
        sensory: { name: '感統教室', capacity: 2, category: 'special' },
        counseling: { name: '團體諮商室', capacity: 2, category: 'special' }
    };
    var CATEGORY_LABELS = { general: '一般教學', artSport: '藝術體育', special: '特教專業' };
    var STATUS_LABELS = { used: '已使用', approved: '已核准', pending: '待審核' };
    var STATUS_TAG_CLASS = { used: 'tag-neutral', approved: 'tag-success', pending: 'tag-warning' };
    var WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];
    var TODAY = new Date(2026, 8, 17);
    var SEEDED_DAY = new Date(2026, 8, 17);
    var SEEDED_WEEK_START = new Date(2026, 8, 13);
    var SEEDED_WEEK_END = new Date(2026, 8, 19);

    var form = document.getElementById('scheduleFilterForm');
    var filterCategory = document.getElementById('filterCategory');
    var filterSpace = document.getElementById('filterSpace');
    var filterDate = document.getElementById('filterDate');
    var resultTitle = document.getElementById('scheduleResultTitle');
    var viewLabel = document.getElementById('scheduleViewLabel');
    var dayWrap = document.getElementById('scheduleDayWrap');
    var weekWrap = document.getElementById('scheduleWeekWrap');
    var legend = document.getElementById('scheduleLegend');
    var emptyState = document.getElementById('scheduleEmptyState');
    var dateLabel = document.getElementById('scheduleDateLabel');
    var navPrev = document.getElementById('scheduleNavPrev');
    var navNext = document.getElementById('scheduleNavNext');
    var navToday = document.getElementById('scheduleNavToday');
    var modalEl = document.getElementById('modalScheduleDetail');

    var currentMode = 'day';
    var currentDate = new Date(TODAY);

    function pad(n) {
        return n < 10 ? '0' + n : String(n);
    }

    function toISODate(date) {
        return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
    }

    function isSameDate(a, b) {
        return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    }

    function formatDateLabel(date) {
        return (date.getMonth() + 1) + '/' + date.getDate() + '（' + WEEKDAY_LABELS[date.getDay()] + '）';
    }

    function updateDateLabel() {
        dateLabel.querySelector('strong').textContent = formatDateLabel(currentDate);
        dateLabel.querySelector('span').hidden = !isSameDate(currentDate, TODAY);
        filterDate.value = toISODate(currentDate);
    }

    function filterDayRows(categoryVal) {
        var rows = dayWrap.querySelectorAll('tbody tr[data-category]');
        rows.forEach(function (row) {
            row.hidden = categoryVal !== 'all' && row.dataset.category !== categoryVal;
        });
    }

    function isDataAvailable() {
        if (currentMode === 'week') {
            return currentDate >= SEEDED_WEEK_START && currentDate <= SEEDED_WEEK_END;
        }
        return isSameDate(currentDate, SEEDED_DAY);
    }

    function updateDataAvailability() {
        var available = isDataAvailable();
        legend.hidden = !available;
        emptyState.hidden = available;
        dayWrap.hidden = !available || currentMode === 'week';
        weekWrap.hidden = !available || currentMode !== 'week';
    }

    function updateView() {
        var spaceVal = filterSpace.value;
        var categoryVal = filterCategory.value;
        var isWeek = spaceVal !== 'all';

        currentMode = isWeek ? 'week' : 'day';

        viewLabel.innerHTML = isWeek
            ? '<i class="bi bi-calendar-week" aria-hidden="true"></i>周檢視'
            : '<i class="bi bi-calendar-day" aria-hidden="true"></i>單日檢視';

        if (isWeek) {
            var space = SPACES[spaceVal];
            resultTitle.innerHTML = space.name + '<small>容納' + space.capacity + '班</small>';
        } else {
            var label = categoryVal === 'all' ? '全部空間' : CATEGORY_LABELS[categoryVal];
            var count = categoryVal === 'all'
                ? Object.keys(SPACES).length
                : Object.keys(SPACES).filter(function (key) { return SPACES[key].category === categoryVal; }).length;
            resultTitle.innerHTML = label + '<small>' + count + '間</small>';
            filterDayRows(categoryVal);
        }

        updateDataAvailability();
    }

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (filterDate.value) {
            var parts = filterDate.value.split('-').map(Number);
            currentDate = new Date(parts[0], parts[1] - 1, parts[2]);
        }
        updateView();
        updateDateLabel();
    });

    navPrev.addEventListener('click', function () {
        currentDate.setDate(currentDate.getDate() - (currentMode === 'week' ? 7 : 1));
        updateDateLabel();
        updateDataAvailability();
    });

    navNext.addEventListener('click', function () {
        currentDate.setDate(currentDate.getDate() + (currentMode === 'week' ? 7 : 1));
        updateDateLabel();
        updateDataAvailability();
    });

    navToday.addEventListener('click', function () {
        currentDate = new Date(TODAY);
        updateDateLabel();
        updateDataAvailability();
    });

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str == null ? '' : str;
        return div.innerHTML;
    }

    modalEl.addEventListener('show.bs.modal', function (event) {
        var trigger = event.relatedTarget;
        if (!trigger) {
            return;
        }

        modalEl.querySelector('[data-modal-title]').textContent = trigger.dataset.title || '';
        modalEl.querySelector('[data-modal-subtitle]').textContent = trigger.dataset.subtitle || '';
        modalEl.querySelector('[data-modal-alert]').hidden = trigger.dataset.alert !== 'true';

        var scheduleSection = modalEl.querySelector('[data-modal-scheduleSection]');
        if (trigger.dataset.schedule) {
            var schedule = JSON.parse(trigger.dataset.schedule);
            modalEl.querySelector('[data-modal-scheduleClass]').textContent = schedule.class || '';
            modalEl.querySelector('[data-modal-scheduleCourse]').textContent = schedule.course || '';
            scheduleSection.hidden = false;
        } else {
            scheduleSection.hidden = true;
        }

        var entrySection = modalEl.querySelector('[data-modal-entrySection]');
        var entriesContainer = modalEl.querySelector('[data-modal-entries]');
        entriesContainer.innerHTML = '';
        var hasConflict = false;
        var hasPending = false;

        if (trigger.dataset.entries) {
            var entries = JSON.parse(trigger.dataset.entries);
            entries.forEach(function (entry) {
                if (entry.conflict) {
                    hasConflict = true;
                }
                if (entry.status === 'pending') {
                    hasPending = true;
                }
                var tags = '<span class="tagPill tagPill-sm ' + STATUS_TAG_CLASS[entry.status] + '">' + STATUS_LABELS[entry.status] + '</span>';
                if (entry.conflict) {
                    tags += '<span class="tagPill tagPill-sm tag-dangerFill">衝突</span>';
                }
                if (entry.merged) {
                    tags += '<span class="tagPill tagPill-sm tag-mergedFill">合併</span>';
                }

                var entryEl = document.createElement('div');
                entryEl.className = 'detailModal-entry' + (entry.conflict ? ' is-conflict' : '');
                entryEl.innerHTML =
                    '<div class="detailModal-entryHead">' +
                        '<p class="detailModal-entryName">' + escapeHtml(entry.name) + '</p>' +
                        '<span class="detailModal-entryTicket">單號 ' + escapeHtml(entry.ticket) + '</span>' +
                    '</div>' +
                    '<p class="detailModal-entryReason">' + escapeHtml(entry.reason) + '</p>' +
                    '<div class="detailModal-entryTags">' + tags + '</div>';
                entriesContainer.appendChild(entryEl);
            });
            entrySection.hidden = entries.length === 0;
        } else {
            entrySection.hidden = true;
        }

        modalEl.querySelector('[data-modal-reviewLink]').hidden = !(hasConflict || hasPending);
    });
})();
