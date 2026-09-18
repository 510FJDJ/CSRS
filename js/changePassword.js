// ============================================================
// 修改密碼頁專屬互動：三組密碼欄位顯示切換、新密碼與確認密碼一致性檢查
// ============================================================
(function () {
    'use strict';

    // ---- 密碼顯示切換（一頁三組欄位，故用 data-password-toggle 對應輸入框 id，非 login.js 單欄硬編碼寫法） ----
    function initPasswordToggles() {
        var toggleBtns = document.querySelectorAll('[data-password-toggle]');
        toggleBtns.forEach(function (toggleBtn) {
            var input = document.getElementById(toggleBtn.getAttribute('data-password-toggle'));
            if (!input) { return; }

            toggleBtn.addEventListener('click', function () {
                var showing = input.type === 'text';
                input.type = showing ? 'password' : 'text';
                toggleBtn.setAttribute('aria-pressed', String(!showing));
                toggleBtn.setAttribute('aria-label', showing ? '顯示密碼' : '隱藏密碼');
                toggleBtn.querySelector('i').className = showing ? 'bi bi-eye' : 'bi bi-eye-slash';
            });
        });
    }

    // ---- 新密碼與確認密碼一致性檢查 ----
    function initPasswordMatchValidation() {
        var form = document.getElementById('changePasswordForm');
        var newPassword = document.getElementById('newPassword');
        var confirmPassword = document.getElementById('confirmPassword');
        var confirmError = document.getElementById('confirmPasswordError');
        if (!form || !newPassword || !confirmPassword || !confirmError) { return; }

        function isMismatched() {
            return confirmPassword.value !== '' && confirmPassword.value !== newPassword.value;
        }

        function updateError() {
            confirmError.hidden = !isMismatched();
        }

        confirmPassword.addEventListener('input', updateError);
        newPassword.addEventListener('input', updateError);

        form.addEventListener('submit', function (event) {
            updateError();
            if (isMismatched()) {
                event.preventDefault();
                confirmPassword.focus();
            }
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        initPasswordToggles();
        initPasswordMatchValidation();
    });
})();
