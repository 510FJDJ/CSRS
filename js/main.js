// ============================================================
// CSRS 全站共用腳本（Vanilla JS）
// 職責：layout include、目前頁面標示、回到頂部、可勾選表格
// ============================================================
(function () {
    'use strict';

    // ---- 共用 layout 載入（<div data-layout="layout/xxx.html"> 插槽）----
    function loadLayouts() {
        var slots = document.querySelectorAll('[data-layout]');
        if (!slots.length) {
            document.dispatchEvent(new CustomEvent('layout:loaded'));
            return;
        }
        var pending = slots.length;
        slots.forEach(function (slot) {
            fetch(slot.getAttribute('data-layout'))
                .then(function (res) { return res.text(); })
                .then(function (html) { slot.innerHTML = html; })
                .catch(function () { /* 離線或路徑錯誤時保留空插槽 */ })
                .finally(function () {
                    pending -= 1;
                    if (pending === 0) {
                        document.dispatchEvent(new CustomEvent('layout:loaded'));
                    }
                });
        });
    }

    // ---- 主選單目前頁面標示（aria-current="page"）----
    function markCurrentNav() {
        var file = window.location.pathname.split('/').pop() || 'index.html';
        document.querySelectorAll(
            '.site-header-nav a, .site-offcanvas-nav a, .site-admin-nav a, .site-admin-offcanvas-nav a, ' +
            '.site-admin-nav-menu a, .site-admin-offcanvas-submenu a'
        ).forEach(function (link) {
            if (link.getAttribute('href') === file) {
                link.setAttribute('aria-current', 'page');
            }
        });
    }

    // ---- 回到頂部（ACCESSIBILITY.md §8）----
    function initScrollTop() {
        var btn = document.querySelector('.scroll-top-btn');
        if (!btn) { return; }

        var toggle = function () {
            btn.classList.toggle('is-visible', window.scrollY > 320);
        };
        window.addEventListener('scroll', toggle, { passive: true });
        toggle();

        btn.addEventListener('click', function () {
            var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
            var main = document.getElementById('goCenter');
            if (main) { main.focus({ preventScroll: true }); }
        });
    }

    // ---- 導覽列「全校行事曆」等錨點連結：本頁直接捲動，跨頁先存 sessionStorage 再由目標頁捲動 ----
    // 不依賴網址列 hash：每頁 <head> 都有清除殘留 hash 的無障礙同步腳本，跨頁導頁後 hash 會被清掉
    function initScrollLinks() {
        var STORAGE_KEY = 'csrsScrollTarget';
        var currentFile = window.location.pathname.split('/').pop() || 'index.html';

        document.addEventListener('click', function (e) {
            var link = e.target.closest('[data-scroll-link]');
            if (!link) { return; }
            var targetId = link.getAttribute('data-scroll-link');

            if (currentFile === 'index.html') {
                var target = document.getElementById(targetId);
                if (!target) { return; }
                e.preventDefault();
                var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });

                var offcanvasEl = link.closest('.offcanvas');
                if (offcanvasEl && window.bootstrap) {
                    var instance = window.bootstrap.Offcanvas.getInstance(offcanvasEl) || new window.bootstrap.Offcanvas(offcanvasEl);
                    instance.hide();
                }
            } else {
                sessionStorage.setItem(STORAGE_KEY, targetId);
            }
        });

        if (currentFile === 'index.html') {
            var pendingId = sessionStorage.getItem(STORAGE_KEY);
            if (pendingId) {
                sessionStorage.removeItem(STORAGE_KEY);
                var pendingTarget = document.getElementById(pendingId);
                if (pendingTarget) {
                    pendingTarget.scrollIntoView({ behavior: 'auto', block: 'start' });
                }
            }
        }
    }

    // ---- 管理端 header 桌面版：往下捲動時第一排（logo＋使用者選單）收合，回到頂部時恢復 ----
    // 用 inert 而非只靠 CSS 隱藏，避免鍵盤 Tab 仍能focus 到視覺上已消失的第一排元素
    function updateAdminHeaderScroll() {
        var header = document.querySelector('.site-header-admin');
        if (!header) { return; }
        var bar = header.querySelector('.site-header-bar');
        var scrolled = window.matchMedia('(min-width: 992px)').matches && window.scrollY > 0;

        header.classList.toggle('is-scrolled', scrolled);
        if (bar) {
            if (scrolled) {
                bar.setAttribute('inert', '');
            } else {
                bar.removeAttribute('inert');
            }
        }
    }

    // ---- 可勾選表格：全選／單選同步，勾選數變動派發 checkable-table:change 供頁面自行切換批次動作列 ----
    function initCheckableTables() {
        document.querySelectorAll('[data-check-all]').forEach(function (allBox) {
            var table = allBox.closest('[data-check-table]') || document;
            var rowBoxes = table.querySelectorAll('[data-check-row]');
            if (!rowBoxes.length) { return; }

            var notify = function () {
                var checked = Array.prototype.filter.call(rowBoxes, function (box) { return box.checked; });
                allBox.checked = checked.length === rowBoxes.length;
                allBox.indeterminate = checked.length > 0 && checked.length < rowBoxes.length;
                table.dispatchEvent(new CustomEvent('checkable-table:change', {
                    detail: { checked: checked.length, total: rowBoxes.length }
                }));
            };

            allBox.addEventListener('change', function () {
                rowBoxes.forEach(function (box) { box.checked = allBox.checked; });
                notify();
            });

            rowBoxes.forEach(function (box) {
                box.addEventListener('change', notify);
            });
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        loadLayouts();
        initScrollTop();
        initScrollLinks();
        initCheckableTables();
        window.addEventListener('scroll', updateAdminHeaderScroll, { passive: true });
        window.addEventListener('resize', updateAdminHeaderScroll);
    });

    document.addEventListener('layout:loaded', function () {
        markCurrentNav();
        updateAdminHeaderScroll();
    });
})();
