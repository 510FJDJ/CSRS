// 審核管理頁「待審核」分頁：切換某列的核准／拒絕 radio 時，顯示/隱藏該列的退回原因文字框；點擊「送出」顯示已送出審核結果彈窗

document.addEventListener('DOMContentLoaded', () => {
    const decisions = document.querySelectorAll('.dataTable-decision');

    decisions.forEach((decision) => {
        const rejectReasonBox = decision.nextElementSibling;
        if (!rejectReasonBox || !rejectReasonBox.classList.contains('dataTable-decision-rejectReason')) return;

        const radios = decision.querySelectorAll('input[type="radio"][data-decision]');
        const textarea = rejectReasonBox.querySelector('textarea');

        radios.forEach((radio) => {
            radio.addEventListener('change', () => {
                const isReject = radio.dataset.decision === 'reject' && radio.checked;
                rejectReasonBox.hidden = !isReject;
                if (!isReject && textarea) textarea.value = '';
            });
        });
    });

    const submittedModalEl = document.getElementById('modalReviewSubmitted');
    if (!submittedModalEl || !window.bootstrap) return;
    const submittedModal = bootstrap.Modal.getOrCreateInstance(submittedModalEl);

    document.querySelectorAll('[data-decision-submit]').forEach((btn) => {
        btn.addEventListener('click', () => submittedModal.show());
    });
});
