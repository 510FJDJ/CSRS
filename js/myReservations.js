// ============================================================
// 我的預約頁專屬：空間明細彈窗「刪除這筆預約」→ 刪除確認彈窗 的切換
// ============================================================
(function () {
    'use strict';

    function initDeleteFlow() {
        var detailModalEl = document.getElementById('modalReservationDetail');
        var deleteModalEl = document.getElementById('modalDeleteReservation');
        var deleteTriggerBtn = document.getElementById('detailDeleteBtn');
        if (!detailModalEl || !deleteModalEl || !deleteTriggerBtn || !window.bootstrap) { return; }

        var detailModal = bootstrap.Modal.getOrCreateInstance(detailModalEl);
        var deleteModal = bootstrap.Modal.getOrCreateInstance(deleteModalEl);

        deleteTriggerBtn.addEventListener('click', function () {
            detailModal.hide();
            detailModalEl.addEventListener('hidden.bs.modal', function handler() {
                detailModalEl.removeEventListener('hidden.bs.modal', handler);
                deleteModal.show();
            }, { once: true });
        });
    }

    document.addEventListener('DOMContentLoaded', initDeleteFlow);
})();
