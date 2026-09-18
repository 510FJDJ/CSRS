// 「我要預約」頁面專屬（reservation.html，教職員版）
// 涵蓋：週次時段表渲染與切換已選、選擇空間資訊卡連動、批次重複預約規則計算（含併班／衝突偵測）、
// 步驟一／二切換、特殊情況處理與一般時段清單渲染、送出申請與「已送出申請」modal

(function () {
    'use strict';

    var PERIODS = [
        { id: 1, label: '第一節', time: '08:10-09:00' },
        { id: 2, label: '第二節', time: '09:10-10:00' },
        { id: 3, label: '第三節', time: '10:10-11:00' },
        { id: 4, label: '第四節', time: '11:10-12:00' },
        { id: 'lunch', label: '午休', time: '11:50-13:20' },
        { id: 5, label: '第五節', time: '13:20-14:10' },
        { id: 6, label: '第六節', time: '14:20-15:10' },
        { id: 7, label: '第七節', time: '15:20-16:10' },
        { id: 8, label: '第八節', time: '16:20-17:10' }
    ];

    var WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

    var WEEKDAY_ID_MAP = { 'wd-mon': 1, 'wd-tue': 2, 'wd-wed': 3, 'wd-thu': 4, 'wd-fri': 5 };

    var DEMO_CLASSES = [
        { cls: '高一甲', teacher: '李O婷', subject: '中文閱讀與寫作' },
        { cls: '高二甲', teacher: '吳O慧', subject: '資訊科技應用' },
        { cls: '高三乙', teacher: '陳O宏', subject: '生活科技' },
        { cls: '國二忠', teacher: '林O芳', subject: '英語會話' },
        { cls: '國三孝', teacher: '黃O翔', subject: '數學補強' },
        { cls: '高一乙', teacher: '張O雯', subject: '藝術與人文' }
    ];

    var SPACES = {
        computerRoom1: {
            name: '電腦教室（一）',
            tags: [{ text: '一般教學', modifier: 'tag-info' }, { text: '本館3樓', modifier: 'tag-neutral' }],
            desc: '容納 30 人｜電腦 30 台、單槍投影｜最多合併 2 班'
        },
        meetingA: {
            name: '第一會議室',
            tags: [{ text: '會議討論', modifier: 'tag-purple' }, { text: '行政大樓2樓', modifier: 'tag-neutral' }],
            desc: '容納 16 人｜長桌會議、視訊設備｜不開放併班'
        },
        musicRoom: {
            name: '音樂教室',
            tags: [{ text: '藝能教學', modifier: 'tag-info' }, { text: '藝能館1樓', modifier: 'tag-neutral' }],
            desc: '容納 40 人｜鋼琴、隔音設備｜最多合併 2 班'
        }
    };

    var NOW = new Date();
    var TODAY = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate());
    var weekStart = startOfWeek(TODAY);
    var selectedSlots = {};
    var mergeableMap = {};
    var conflictMap = {};
    var currentStep = 1;

    var weekHeadRow = document.getElementById('weekHeadRow');
    var weekBody = document.getElementById('weekBody');
    var weekRangeLabel = document.getElementById('weekRangeLabel');
    var weekYearLabel = document.getElementById('weekYearLabel');
    var weekPrevBtn = document.getElementById('weekPrevBtn');
    var weekNextBtn = document.getElementById('weekNextBtn');
    var weekTodayBtn = document.getElementById('weekTodayBtn');
    var spaceSelect = document.getElementById('spaceSelect');
    var spaceInfoTags = document.getElementById('spaceInfoTags');
    var spaceInfoName = document.getElementById('spaceInfoName');
    var spaceInfoDesc = document.getElementById('spaceInfoDesc');
    var bottomBar = document.getElementById('reservationBottomBar');
    var selectedCountEl = document.getElementById('selectedCount');
    var resetSelectionBtn = document.getElementById('resetSelectionBtn');

    if (!weekBody) { return; }

    var stepTab1 = document.getElementById('stepTab1');
    var stepTab2 = document.getElementById('stepTab2');
    var stepItem1 = document.getElementById('stepItem1');
    var stepItem2 = document.getElementById('stepItem2');
    var stepPanel1 = document.getElementById('stepPanel1');
    var stepPanel2 = document.getElementById('stepPanel2');
    var applyBatchBtn = document.getElementById('applyBatchBtn');
    var batchDateStartEl = document.getElementById('batchDateStart');
    var batchDateEndEl = document.getElementById('batchDateEnd');
    var confirmSubmitBtn = document.getElementById('confirmSubmitBtn');
    var backToStep1Btn = document.getElementById('backToStep1Btn');

    var specialCaseCard = document.getElementById('specialCaseCard');
    var mergeBlock = document.getElementById('mergeBlock');
    var conflictBlock = document.getElementById('conflictBlock');
    var mergeDetail = document.getElementById('mergeDetail');
    var conflictDetail = document.getElementById('conflictDetail');
    var generalCountEl = document.getElementById('generalCount');
    var generalDetail = document.getElementById('generalDetail');

    var reviewSpaceName = document.getElementById('reviewSpaceName');
    var reviewSpaceDesc = document.getElementById('reviewSpaceDesc');
    var reviewCountEl = document.getElementById('reviewCount');
    var reviewDaysEl = document.getElementById('reviewDays');
    var reviewRangeEl = document.getElementById('reviewRange');
    var reviewPatternEl = document.getElementById('reviewPattern');
    var reasonTextarea = document.getElementById('reservationReason');
    var reasonCounterEl = document.getElementById('reasonCounter');
    var reasonErrorEl = document.getElementById('reasonError');
    var submitReservationBtn = document.getElementById('submitReservationBtn');

    var removeSlotModalEl = document.getElementById('modalRemoveSlot');
    var removeSlotLineEl = document.getElementById('modalRemoveSlotLine');
    var confirmRemoveSlotBtn = document.getElementById('confirmRemoveSlotBtn');
    var pendingRemoval = null;

    function startOfWeek(date) {
        var d = new Date(date);
        d.setDate(d.getDate() - d.getDay());
        return d;
    }

    function addDays(date, n) {
        var d = new Date(date);
        d.setDate(d.getDate() + n);
        return d;
    }

    function pad(n) {
        return n < 10 ? '0' + n : String(n);
    }

    function dateKey(date) {
        return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
    }

    function parseDateKey(str) {
        var parts = str.split('-');
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }

    function formatDateWeekday(date) {
        return (date.getMonth() + 1) + '/' + date.getDate() + '（' + WEEKDAY_LABELS[date.getDay()] + '）';
    }

    function slotKey(dateStr, periodId) {
        return dateStr + '_' + periodId;
    }

    function seededRandom(seed) {
        var x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }

    function spaceSeedOffset() {
        var value = (spaceSelect && spaceSelect.value) || '';
        var hash = 0;
        for (var i = 0; i < value.length; i += 1) {
            hash = (hash * 31 + value.charCodeAt(i)) % 100000;
        }
        return hash;
    }

    function slotSeed(date, periodId) {
        var pid = periodId === 'lunch' ? 0 : periodId;
        return date.getFullYear() * 372 + (date.getMonth() + 1) * 31 + date.getDate() + pid * 7.13 + spaceSeedOffset() * 0.041;
    }

    function demoState(date, periodId) {
        if (date < TODAY) { return { state: 'past' }; }
        if (periodId === 'lunch') { return { state: 'available' }; }
        var r = seededRandom(slotSeed(date, periodId));
        if (r < 0.12) { return { state: 'full', total: 2, remaining: 0 }; }
        if (r < 0.3) { return { state: 'mergeable', total: 2, remaining: 1 }; }
        return { state: 'available' };
    }

    function demoClassFor(date, periodId, offset) {
        var idx = Math.floor(seededRandom(slotSeed(date, periodId) + offset * 91.7) * DEMO_CLASSES.length);
        return DEMO_CLASSES[idx];
    }

    function buildSpecialItem(date, periodId, info, occupantCount) {
        var dStr = dateKey(date);
        var key = slotKey(dStr, periodId);
        var period = PERIODS.filter(function (p) { return p.id === periodId; })[0];
        var dateLabel = formatDateWeekday(date) + (period ? period.label : '');
        var occupants = [];
        var usedNames = {};
        for (var i = 0; i < occupantCount; i += 1) {
            var c = demoClassFor(date, periodId, i);
            var tries = 0;
            while (usedNames[c.cls] && tries < 5) {
                c = demoClassFor(date, periodId, i + tries + 10);
                tries += 1;
            }
            usedNames[c.cls] = true;
            occupants.push(c);
        }
        return { key: key, date: date, periodId: periodId, dateLabel: dateLabel, total: info.total, occupants: occupants };
    }

    function getConflictResolution() {
        var radio = document.querySelector('input[name="conflictResolution"]:checked');
        return radio ? radio.value : 'submit';
    }

    // ---- 步驟一：週次時段表 ----
    function renderWeekLabel() {
        var end = addDays(weekStart, 6);
        weekRangeLabel.textContent = (weekStart.getMonth() + 1) + '/' + weekStart.getDate() + ' – ' + (end.getMonth() + 1) + '/' + end.getDate();
        weekYearLabel.textContent = weekStart.getFullYear() + ' 年';
    }

    function renderHead() {
        var html = '<th class="reservationTable-periodHead" scope="col"><span class="sr-only">節次</span></th>';
        for (var i = 0; i < 7; i += 1) {
            var d = addDays(weekStart, i);
            var isToday = dateKey(d) === dateKey(TODAY);
            html += '<th class="reservationTable-dateHead' + (isToday ? ' is-today' : '') + '" scope="col">' +
                '<span class="reservationTable-weekday">週' + WEEKDAY_LABELS[d.getDay()] + '</span>' +
                '<span class="reservationTable-datenum">' + (d.getMonth() + 1) + '/' + d.getDate() + '</span>' +
                '</th>';
        }
        weekHeadRow.innerHTML = html;
    }

    function renderCell(date, period) {
        var dStr = dateKey(date);
        var key = slotKey(dStr, period.id);
        var info = demoState(date, period.id);
        var state = selectedSlots[key] ? 'selected' : info.state;
        var isFlagged = state === 'full' && conflictMap[key] && getConflictResolution() === 'submit';

        if (state === 'available' || state === 'mergeable' || state === 'selected') {
            var statusText = state === 'selected' ? '已選取' : (state === 'mergeable' ? '可併班' : '可預約');
            return '<td class="reservationTable-cell" data-state="' + state + '">' +
                '<button type="button" class="reservationTable-slot" data-date="' + dStr + '" data-period="' + period.id + '" aria-pressed="' + (state === 'selected') + '">' +
                '<span class="reservationTable-slotStatus">' + statusText + '</span>' +
                (state === 'mergeable' ? '<span class="reservationTable-slotMeta">尚可併班</span>' : '') +
                '</button></td>';
        }

        var label = state === 'full' ? '已額滿' : '逾期';
        return '<td class="reservationTable-cell' + (isFlagged ? ' is-conflictFlag' : '') + '" data-state="' + state + '">' +
            '<span class="reservationTable-slot is-disabled">' +
            '<span class="reservationTable-slotStatus">' + label + '</span>' +
            '</span></td>';
    }

    function renderBody() {
        var html = '';
        PERIODS.forEach(function (period) {
            html += '<tr><th class="reservationTable-periodCell" scope="row">' +
                '<span class="reservationTable-periodLabel">' + period.label + '</span>' +
                '<span class="reservationTable-periodTime">' + period.time + '</span>' +
                '</th>';
            for (var i = 0; i < 7; i += 1) {
                html += renderCell(addDays(weekStart, i), period);
            }
            html += '</tr>';
        });
        weekBody.innerHTML = html;
    }

    function renderBottomBar() {
        var count = Object.keys(selectedSlots).length;
        selectedCountEl.textContent = count;
        bottomBar.hidden = count === 0 || currentStep !== 1;
        if (stepTab2) { stepTab2.setAttribute('aria-disabled', count === 0 ? 'true' : 'false'); }
    }

    function render() {
        renderWeekLabel();
        renderHead();
        renderBody();
        renderBottomBar();
    }

    function initWeekNav() {
        weekPrevBtn.addEventListener('click', function () { weekStart = addDays(weekStart, -7); render(); });
        weekNextBtn.addEventListener('click', function () { weekStart = addDays(weekStart, 7); render(); });
        weekTodayBtn.addEventListener('click', function () { weekStart = startOfWeek(TODAY); render(); });
    }

    function resetSelection() {
        selectedSlots = {};
        mergeableMap = {};
        conflictMap = {};
        render();
    }

    function initResetSelection() {
        resetSelectionBtn.addEventListener('click', resetSelection);
    }

    function initSlotToggle() {
        weekBody.addEventListener('click', function (e) {
            var btn = e.target.closest('.reservationTable-slot');
            if (!btn || !btn.dataset.date) { return; }
            var key = slotKey(btn.dataset.date, isNaN(btn.dataset.period) ? btn.dataset.period : parseInt(btn.dataset.period, 10));
            if (selectedSlots[key]) {
                delete selectedSlots[key];
            } else {
                selectedSlots[key] = true;
            }
            renderBody();
            renderBottomBar();
            var refocus = weekBody.querySelector('[data-date="' + btn.dataset.date + '"][data-period="' + btn.dataset.period + '"]');
            if (refocus) { refocus.focus(); }
        });
    }

    // ---- 選擇空間 ----
    function renderSpaceInfo() {
        var space = SPACES[spaceSelect.value];
        if (!space) { return; }
        spaceInfoTags.innerHTML = space.tags.map(function (t) {
            return '<span class="tagPill tagPill-sm ' + t.modifier + '">' + t.text + '</span>';
        }).join('');
        spaceInfoName.textContent = space.name;
        spaceInfoDesc.textContent = space.desc;
    }

    function initSpaceSelect() {
        spaceSelect.addEventListener('change', function () {
            renderSpaceInfo();
            resetSelection();
        });
    }

    // ---- 週幾／節次複選下拉 ----
    function initMultiSelect(btnId, menuId, fallbackText) {
        var btn = document.getElementById(btnId);
        var menu = document.getElementById(menuId);
        if (!btn || !menu) { return; }
        function update() {
            var checked = menu.querySelectorAll('input[type="checkbox"]:checked');
            if (!checked.length) {
                btn.textContent = fallbackText;
                return;
            }
            var labels = Array.prototype.map.call(checked, function (input) {
                var label = menu.querySelector('label[for="' + input.id + '"]');
                return label ? label.textContent : '';
            });
            btn.textContent = labels.join('、');
        }
        menu.addEventListener('change', update);
        update();
    }

    // ---- 批次重複預約：真實計算已選／可併班／衝突 ----
    function getCheckedDays() {
        var boxes = document.querySelectorAll('#batchWeekdaysMenu input[type="checkbox"]:checked');
        return Array.prototype.map.call(boxes, function (b) { return WEEKDAY_ID_MAP[b.id]; });
    }

    function getCheckedPeriods() {
        var boxes = document.querySelectorAll('#batchPeriodsMenu input[type="checkbox"]:checked');
        return Array.prototype.map.call(boxes, function (b) { return parseInt(b.id.split('-')[1], 10); });
    }

    function applyBatchRule() {
        if (!batchDateStartEl.value || !batchDateEndEl.value) { return; }
        var start = parseDateKey(batchDateStartEl.value);
        var end = parseDateKey(batchDateEndEl.value);
        if (end < start) { return; }
        var days = getCheckedDays();
        var periods = getCheckedPeriods();
        if (!days.length || !periods.length) { return; }

        for (var d = new Date(start); d <= end; d = addDays(d, 1)) {
            if (days.indexOf(d.getDay()) === -1) { continue; }
            (function (date) {
                periods.forEach(function (pid) {
                    var info = demoState(date, pid);
                    if (info.state === 'past') { return; }
                    var key = slotKey(dateKey(date), pid);
                    if (info.state === 'available') {
                        selectedSlots[key] = true;
                    } else if (info.state === 'mergeable') {
                        if (!mergeableMap[key]) { mergeableMap[key] = buildSpecialItem(date, pid, info, 1); }
                    } else if (info.state === 'full') {
                        if (!conflictMap[key]) { conflictMap[key] = buildSpecialItem(date, pid, info, 2); }
                    }
                });
            }(new Date(d)));
        }

        render();
        if (currentStep === 2) { renderStep2(); }
    }

    // ---- 步驟切換 ----
    function goToStep(step) {
        if (step === 2 && Object.keys(selectedSlots).length === 0) { return; }
        currentStep = step;
        stepPanel1.hidden = step !== 1;
        stepPanel2.hidden = step !== 2;
        stepItem1.classList.toggle('is-current', step === 1);
        stepItem2.classList.toggle('is-current', step === 2);
        if (step === 2) {
            renderStep2();
        }
        renderBottomBar();
    }

    function initSteps() {
        stepTab1.addEventListener('click', function () { goToStep(1); });
        stepTab2.addEventListener('click', function () {
            if (stepTab2.getAttribute('aria-disabled') === 'true') { return; }
            goToStep(2);
        });
        confirmSubmitBtn.addEventListener('click', function () { goToStep(2); });
        backToStep1Btn.addEventListener('click', function () { goToStep(1); });
    }

    // ---- 步驟二：移除已選時段（確認 modal）----
    function openRemoveSlotModal(type, key, label) {
        if (!removeSlotModalEl) { return; }
        pendingRemoval = { type: type, key: key };
        var space = SPACES[spaceSelect.value];
        removeSlotLineEl.textContent = (space ? space.name + '　' : '') + label;
        bootstrap.Modal.getOrCreateInstance(removeSlotModalEl).show();
    }

    function confirmRemoveSlot() {
        if (!pendingRemoval) { return; }
        if (pendingRemoval.type === 'conflict') {
            delete conflictMap[pendingRemoval.key];
            renderSpecialCase();
        } else if (pendingRemoval.type === 'merge') {
            delete mergeableMap[pendingRemoval.key];
            renderSpecialCase();
        } else {
            delete selectedSlots[pendingRemoval.key];
            renderGeneralSlots();
            render();
        }
        renderReviewSummary();
        pendingRemoval = null;
        bootstrap.Modal.getOrCreateInstance(removeSlotModalEl).hide();
    }

    function initRemoveSlotModal() {
        if (!removeSlotModalEl) { return; }
        confirmRemoveSlotBtn.addEventListener('click', confirmRemoveSlot);
        removeSlotModalEl.addEventListener('hidden.bs.modal', function () { pendingRemoval = null; });
    }

    // ---- 步驟二：特殊情況處理 ----
    function renderSpecialRow(item, isConflict) {
        var note = isConflict ? (item.total + ' 個名額都已被登記') : '1 個名額已被登記，尚可併班';
        var names = item.occupants.map(function (o) {
            return o.cls + '　' + o.teacher + '　' + o.subject;
        }).join('、');
        return '<div class="reservationSpecialCase-row" role="button" tabindex="0" ' +
            'data-remove="' + (isConflict ? 'conflict' : 'merge') + '" data-key="' + item.key + '" data-label="' + item.dateLabel + '" ' +
            'aria-label="移除 ' + item.dateLabel + '">' +
            '<div class="flex-row-between reservationSpecialCase-rowHead"><strong>' + item.dateLabel + '</strong>' +
            '<span class="reservationRow-removeBtn" aria-hidden="true"><i class="bi bi-x" aria-hidden="true"></i></span></div>' +
            '<p class="reservationSpecialCase-rowNote">' + note + '</p>' +
            '<p class="reservationSpecialCase-rowNames' + (isConflict ? ' is-danger' : '') + '">' + names + '</p>' +
            '</div>';
    }

    function renderSpecialCase() {
        var mergeKeys = Object.keys(mergeableMap);
        var conflictKeys = Object.keys(conflictMap);
        specialCaseCard.hidden = !mergeKeys.length && !conflictKeys.length;
        mergeBlock.hidden = !mergeKeys.length;
        conflictBlock.hidden = !conflictKeys.length;

        document.getElementById('mergeCountDesc').textContent = mergeKeys.length;
        document.getElementById('mergeCountToggle').textContent = mergeKeys.length;
        document.getElementById('conflictCountDesc').textContent = conflictKeys.length;
        document.getElementById('conflictCountToggle').textContent = conflictKeys.length;

        mergeDetail.innerHTML = mergeKeys.map(function (k) { return renderSpecialRow(mergeableMap[k], false); }).join('');
        conflictDetail.innerHTML = conflictKeys.map(function (k) { return renderSpecialRow(conflictMap[k], true); }).join('');
    }

    // ---- 步驟二：一般時段（週分組手風琴） ----
    function buildGeneralGroups() {
        var keys = Object.keys(selectedSlots).sort();
        var groups = [];
        var groupMap = {};
        keys.forEach(function (key) {
            var parts = key.split('_');
            var d = parseDateKey(parts[0]);
            var periodId = isNaN(parts[1]) ? parts[1] : parseInt(parts[1], 10);
            var wkStart = startOfWeek(d);
            var wkKey = dateKey(wkStart);
            if (!groupMap[wkKey]) {
                groupMap[wkKey] = { weekStart: wkStart, items: [] };
                groups.push(groupMap[wkKey]);
            }
            var period = PERIODS.filter(function (p) { return p.id === periodId; })[0];
            groupMap[wkKey].items.push({
                key: key,
                date: d,
                periodId: periodId,
                label: formatDateWeekday(d) + (period ? period.label : '')
            });
        });
        groups.sort(function (a, b) { return a.weekStart - b.weekStart; });
        groups.forEach(function (g) {
            g.items.sort(function (a, b) { return a.date - b.date; });
        });
        return groups;
    }

    function renderGeneralSlots() {
        var groups = buildGeneralGroups();
        generalCountEl.textContent = Object.keys(selectedSlots).length;
        generalDetail.innerHTML = groups.map(function (g, idx) {
            var endOfWeek = addDays(g.weekStart, 6);
            var rangeLabel = (g.weekStart.getMonth() + 1) + '/' + g.weekStart.getDate() + ' – ' + (endOfWeek.getMonth() + 1) + '/' + endOfWeek.getDate();
            var expanded = idx === 0;
            var itemsHtml = g.items.map(function (it) {
                return '<div class="reservationGeneral-item" role="button" tabindex="0" data-key="' + it.key + '" data-label="' + it.label + '" aria-label="移除 ' + it.label + '">' +
                    '<span>' + it.label + '</span>' +
                    '<span class="reservationRow-removeBtn" aria-hidden="true"><i class="bi bi-x-lg" aria-hidden="true"></i></span>' +
                    '</div>';
            }).join('');
            return '<div class="reservationGeneral-group">' +
                '<button type="button" class="reservationGeneral-groupHead flex-row-between" aria-expanded="' + expanded + '" aria-controls="grp-' + idx + '">' +
                '<span class="flex-row-center gap-2"><i class="bi bi-chevron-' + (expanded ? 'down' : 'right') + '" aria-hidden="true"></i>' + rangeLabel + '</span>' +
                '<span class="reservationGeneral-groupCount">' + g.items.length + ' 筆</span>' +
                '</button>' +
                '<div class="reservationGeneral-groupBody" id="grp-' + idx + '"' + (expanded ? '' : ' hidden') + '>' + itemsHtml + '</div>' +
                '</div>';
        }).join('');
    }

    // ---- 步驟二：右側摘要 ----
    function renderReviewSummary() {
        var space = SPACES[spaceSelect.value];
        reviewSpaceName.textContent = space.name;
        reviewSpaceDesc.textContent = space.desc;

        var keys = Object.keys(selectedSlots);
        reviewCountEl.textContent = keys.length;

        var dateSet = {};
        var weekdaySet = {};
        var numericPeriods = {};
        var hasLunch = false;
        var minDate = null;
        var maxDate = null;

        keys.forEach(function (key) {
            var parts = key.split('_');
            var d = parseDateKey(parts[0]);
            dateSet[parts[0]] = true;
            weekdaySet[d.getDay()] = true;
            if (parts[1] === 'lunch') {
                hasLunch = true;
            } else {
                numericPeriods[parts[1]] = true;
            }
            if (!minDate || d < minDate) { minDate = d; }
            if (!maxDate || d > maxDate) { maxDate = d; }
        });

        reviewDaysEl.textContent = Object.keys(dateSet).length;

        if (minDate && maxDate) {
            reviewRangeEl.textContent = formatDateWeekday(minDate) + ' － ' + formatDateWeekday(maxDate);
            var weekdayText = Object.keys(weekdaySet).map(Number).sort().map(function (n) { return WEEKDAY_LABELS[n]; }).join('、');
            var periodText = Object.keys(numericPeriods).sort(function (a, b) { return a - b; }).join('、');
            var periodLabel = periodText ? ('第 ' + periodText + ' 節') : '';
            if (hasLunch) { periodLabel += (periodLabel ? '、' : '') + '午休'; }
            reviewPatternEl.textContent = '每週' + weekdayText + '　' + periodLabel;
        } else {
            reviewRangeEl.textContent = '';
            reviewPatternEl.textContent = '';
        }
    }

    function renderStep2() {
        renderSpecialCase();
        renderGeneralSlots();
        renderReviewSummary();
    }

    // ---- 步驟二：展開／收合（檢視這N筆／檢視明細） ----
    function bindDisclosure(btnId, panelId) {
        var btn = document.getElementById(btnId);
        var panel = document.getElementById(panelId);
        if (!btn || !panel) { return; }
        btn.addEventListener('click', function () {
            var expanded = btn.getAttribute('aria-expanded') === 'true';
            btn.setAttribute('aria-expanded', String(!expanded));
            panel.hidden = expanded;
            var icon = btn.querySelector('i');
            if (icon) { icon.className = expanded ? 'bi bi-plus' : 'bi bi-dash'; }
        });
    }

    function initSpecialCaseEvents() {
        specialCaseCard.addEventListener('click', function (e) {
            var row = e.target.closest('.reservationSpecialCase-row');
            if (!row) { return; }
            openRemoveSlotModal(row.dataset.remove, row.dataset.key, row.dataset.label);
        });
        specialCaseCard.addEventListener('keydown', function (e) {
            if (e.key !== 'Enter' && e.key !== ' ') { return; }
            var row = e.target.closest('.reservationSpecialCase-row');
            if (!row) { return; }
            e.preventDefault();
            openRemoveSlotModal(row.dataset.remove, row.dataset.key, row.dataset.label);
        });
        specialCaseCard.addEventListener('change', function (e) {
            if (e.target.name === 'conflictResolution') { renderBody(); }
        });
    }

    function initGeneralEvents() {
        generalDetail.addEventListener('click', function (e) {
            var head = e.target.closest('.reservationGeneral-groupHead');
            if (head) {
                var expanded = head.getAttribute('aria-expanded') === 'true';
                head.setAttribute('aria-expanded', String(!expanded));
                var body = document.getElementById(head.getAttribute('aria-controls'));
                if (body) { body.hidden = expanded; }
                var icon = head.querySelector('i');
                if (icon) { icon.className = expanded ? 'bi bi-chevron-right' : 'bi bi-chevron-down'; }
                return;
            }
            var item = e.target.closest('.reservationGeneral-item');
            if (item) {
                openRemoveSlotModal('general', item.dataset.key, item.dataset.label);
            }
        });
        generalDetail.addEventListener('keydown', function (e) {
            if (e.key !== 'Enter' && e.key !== ' ') { return; }
            var item = e.target.closest('.reservationGeneral-item');
            if (!item) { return; }
            e.preventDefault();
            openRemoveSlotModal('general', item.dataset.key, item.dataset.label);
        });
    }

    // ---- 預約事由字數與送出 ----
    function updateReasonCounter() {
        reasonCounterEl.textContent = reasonTextarea.value.length + ' / 50';
        if (reasonTextarea.value.trim()) { reasonErrorEl.hidden = true; }
    }

    function handleSubmit() {
        if (!reasonTextarea.value.trim()) {
            reasonErrorEl.hidden = false;
            reasonTextarea.focus();
            return;
        }
        reasonErrorEl.hidden = true;

        var mergeRadio = document.querySelector('input[name="mergeResolution"]:checked');
        var conflictRadio = document.querySelector('input[name="conflictResolution"]:checked');
        var includeMerge = mergeRadio && mergeRadio.value === 'join';
        var includeConflict = conflictRadio && conflictRadio.value === 'submit';

        var allDates = Object.keys(selectedSlots).map(function (k) { return parseDateKey(k.split('_')[0]); });
        var totalCount = allDates.length;
        if (includeMerge) {
            Object.keys(mergeableMap).forEach(function (k) { allDates.push(mergeableMap[k].date); totalCount += 1; });
        }
        if (includeConflict) {
            Object.keys(conflictMap).forEach(function (k) { allDates.push(conflictMap[k].date); totalCount += 1; });
        }
        allDates.sort(function (a, b) { return a - b; });
        var minDate = allDates[0];
        var maxDate = allDates[allDates.length - 1];
        var space = SPACES[spaceSelect.value];

        var lineEl = document.getElementById('submitSuccessSpaceLine');
        if (lineEl && minDate && maxDate) {
            lineEl.innerHTML = space.name + ' 共 <strong>' + totalCount + '</strong> 個時段，<br>期間 ' + formatDateWeekday(minDate) + '～' + formatDateWeekday(maxDate) + '。';
        }

        var modalEl = document.getElementById('submitSuccessModal');
        var modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
    }

    function initSubmit() {
        reasonTextarea.addEventListener('input', updateReasonCounter);
        submitReservationBtn.addEventListener('click', handleSubmit);
    }

    document.addEventListener('DOMContentLoaded', function () {
        render();
        initWeekNav();
        initResetSelection();
        initSlotToggle();
        initSpaceSelect();
        initMultiSelect('batchWeekdaysBtn', 'batchWeekdaysMenu', '請選擇');
        initMultiSelect('batchPeriodsBtn', 'batchPeriodsMenu', '請選擇');
        applyBatchBtn.addEventListener('click', applyBatchRule);
        initSteps();
        bindDisclosure('mergeToggle', 'mergeDetail');
        bindDisclosure('conflictToggle', 'conflictDetail');
        bindDisclosure('generalToggle', 'generalDetail');
        initSpecialCaseEvents();
        initGeneralEvents();
        initRemoveSlotModal();
        initSubmit();
    });
}());
