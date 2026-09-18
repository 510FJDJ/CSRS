// 通用無障礙頁籤：roving tabindex＋即時啟用（Automatic Activation）＋ tabs:activate 事件
(function () {
    'use strict';

    function getTabs(tablist) {
        return Array.prototype.slice.call(tablist.querySelectorAll('[role="tab"]'));
    }

    function getPanel(tab) {
        var id = tab.getAttribute('aria-controls');
        return id ? document.getElementById(id) : null;
    }

    function activateTab(tab, focusTab) {
        var tablist = tab.closest('[role="tablist"]');
        if (!tablist) { return; }
        var tabs = getTabs(tablist);

        var panelIds = [];
        tabs.forEach(function (t) {
            var id = t.getAttribute('aria-controls');
            if (id && panelIds.indexOf(id) === -1) { panelIds.push(id); }
        });

        tabs.forEach(function (t) {
            var selected = t === tab;
            t.setAttribute('aria-selected', selected ? 'true' : 'false');
            t.tabIndex = selected ? 0 : -1;
            t.classList.toggle('is-active', selected);
        });

        var targetPanel = getPanel(tab);
        panelIds.forEach(function (id) {
            var panel = document.getElementById(id);
            if (!panel) { return; }
            panel.hidden = panel !== targetPanel;
        });
        if (targetPanel) {
            targetPanel.setAttribute('aria-labelledby', tab.id);
        }

        if (focusTab) {
            tab.focus();
        }

        tablist.dispatchEvent(new CustomEvent('tabs:activate', {
            bubbles: true,
            detail: { tab: tab, panel: targetPanel, tablist: tablist }
        }));
    }

    document.addEventListener('keydown', function (e) {
        var tab = e.target.closest ? e.target.closest('[role="tab"]') : null;
        if (!tab) { return; }
        var tablist = tab.closest('[role="tablist"]');
        if (!tablist) { return; }
        var tabs = getTabs(tablist);
        var index = tabs.indexOf(tab);
        var nextIndex;

        switch (e.key) {
            case 'ArrowRight':
                nextIndex = (index + 1) % tabs.length;
                break;
            case 'ArrowLeft':
                nextIndex = (index - 1 + tabs.length) % tabs.length;
                break;
            case 'Home':
                nextIndex = 0;
                break;
            case 'End':
                nextIndex = tabs.length - 1;
                break;
            default:
                return;
        }

        e.preventDefault();
        activateTab(tabs[nextIndex], true);
    });

    document.addEventListener('click', function (e) {
        var tab = e.target.closest ? e.target.closest('[role="tab"]') : null;
        if (!tab) { return; }
        if (!tab.closest('[role="tablist"]')) { return; }
        if (tab.getAttribute('aria-selected') === 'true') { return; }
        activateTab(tab, false);
    });
})();
