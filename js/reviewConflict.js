// 審核管理頁「處理衝突」彈窗：切換衝突節次的選定申請人時，即時更新 footer 送出後總結

document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('modalConflict');
    if (!modal) return;

    // 陳O華：10 節中已有 8 節無衝突、預設核准；9/16（三）第四節已被 林O芳 核准佔用，這節固定退回，無法由管理者選擇
    const baseCounts = {
        '陳O華': { approved: 8, rejected: 1 }
    };
    // 主要申請人固定排最前面，其餘依畫面上出現順序接續
    const primaryApplicant = '陳O華';

    const radioGroups = Array.from(modal.querySelectorAll('.radioCard-group'));
    const confirmEl = modal.querySelector('.detailModal-conflictConfirm');

    function updateConfirmSummary() {
        if (!confirmEl) return;

        const counts = new Map();
        Object.keys(baseCounts).forEach((name) => {
            counts.set(name, { approved: baseCounts[name].approved, rejected: baseCounts[name].rejected });
        });

        radioGroups.forEach((group) => {
            const radios = Array.from(group.querySelectorAll('input[type="radio"][data-applicant]'));
            radios.forEach((radio) => {
                const name = radio.dataset.applicant;
                if (!counts.has(name)) counts.set(name, { approved: 0, rejected: 0 });
                const entry = counts.get(name);
                if (radio.checked) entry.approved += 1;
                else entry.rejected += 1;
            });
        });

        const names = Array.from(counts.keys()).sort((a, b) => {
            if (a === primaryApplicant) return -1;
            if (b === primaryApplicant) return 1;
            return 0;
        });

        const parts = names.reduce((acc, name) => {
            const { approved, rejected } = counts.get(name);
            if (!approved && !rejected) return acc;
            const segments = [];
            if (approved) segments.push(`核准 ${approved} 節`);
            if (rejected) segments.push(`退回 ${rejected} 節`);
            acc.push(`${name}${segments.join('、')}`);
            return acc;
        }, []);

        confirmEl.innerHTML = `<i class="bi bi-check-circle" aria-hidden="true"></i>送出後：${parts.join('；')}`;
    }

    radioGroups.forEach((group) => {
        group.addEventListener('change', updateConfirmSummary);
    });

    updateConfirmSummary();

    // 「確定送出」：關閉處理衝突彈窗後，接著顯示已送出審核結果彈窗
    const submitBtn = modal.querySelector('[data-conflict-submit]');
    const submittedModalEl = document.getElementById('modalReviewSubmitted');
    if (!submitBtn || !submittedModalEl || !window.bootstrap) return;

    const conflictModal = bootstrap.Modal.getOrCreateInstance(modal);
    const submittedModal = bootstrap.Modal.getOrCreateInstance(submittedModalEl);

    submitBtn.addEventListener('click', () => {
        conflictModal.hide();
        modal.addEventListener('hidden.bs.modal', function handler() {
            modal.removeEventListener('hidden.bs.modal', handler);
            submittedModal.show();
        }, { once: true });
    });
});
