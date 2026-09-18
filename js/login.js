// ============================================================
// 登入頁專屬互動：密碼顯示切換、CAPTCHA 產生／換一張／語音播放、忘記密碼流程 modal 切換
// ============================================================
(function () {
    'use strict';

    // ---- 密碼顯示切換 ----
    function initPasswordToggle() {
        var toggleBtn = document.getElementById('passwordToggleBtn');
        var input = document.getElementById('loginPassword');
        if (!toggleBtn || !input) { return; }

        toggleBtn.addEventListener('click', function () {
            var showing = input.type === 'text';
            input.type = showing ? 'password' : 'text';
            toggleBtn.setAttribute('aria-pressed', String(!showing));
            toggleBtn.setAttribute('aria-label', showing ? '顯示密碼' : '隱藏密碼');
            toggleBtn.querySelector('i').className = showing ? 'bi bi-eye' : 'bi bi-eye-slash';
        });
    }

    // ---- CAPTCHA：本地端隨機產生（無後端，僅供前端展示） ----
    var CAPTCHA_CHARS = 'ACDEFGHJKLMNPQRTUVWXY346789'; // 排除易混淆字元 0/O、1/I/l、B/8、S/5
    var currentCaptcha = '';

    function generateCaptcha() {
        var code = '';
        for (var i = 0; i < 4; i += 1) {
            code += CAPTCHA_CHARS.charAt(Math.floor(Math.random() * CAPTCHA_CHARS.length));
        }
        return code;
    }

    function renderCaptcha() {
        var display = document.getElementById('captchaDisplay');
        if (!display) { return; }
        currentCaptcha = generateCaptcha();
        display.innerHTML = '';
        currentCaptcha.split('').forEach(function (ch, index) {
            var span = document.createElement('span');
            span.textContent = ch;
            var rotate = (index % 2 === 0 ? -1 : 1) * (6 + Math.random() * 6);
            span.style.transform = 'rotate(' + rotate.toFixed(1) + 'deg)';
            display.appendChild(span);
        });
    }

    function initCaptcha() {
        var refreshBtn = document.getElementById('captchaRefreshBtn');
        var voiceBtn = document.getElementById('captchaVoiceBtn');
        if (!document.getElementById('captchaDisplay')) { return; }

        renderCaptcha();

        if (refreshBtn) {
            refreshBtn.addEventListener('click', renderCaptcha);
        }

        if (voiceBtn && 'speechSynthesis' in window) {
            voiceBtn.addEventListener('click', function () {
                window.speechSynthesis.cancel();
                var utterance = new SpeechSynthesisUtterance(currentCaptcha.split('').join(' '));
                utterance.lang = 'en-US';
                window.speechSynthesis.speak(utterance);
            });
        }
    }

    // ---- 忘記密碼流程：modal 間切換 ----
    function initForgotPasswordFlow() {
        var forgotModalEl = document.getElementById('modalForgotPassword');
        var sentModalEl = document.getElementById('modalVerificationSent');
        var completeModalEl = document.getElementById('modalPasswordResetComplete');
        var sendBtn = document.getElementById('sendVerificationBtn');
        var demoBtn = document.getElementById('demoResetCompleteBtn');
        if (!forgotModalEl || !sentModalEl || !completeModalEl || !window.bootstrap) { return; }

        var forgotModal = bootstrap.Modal.getOrCreateInstance(forgotModalEl);
        var sentModal = bootstrap.Modal.getOrCreateInstance(sentModalEl);
        var completeModal = bootstrap.Modal.getOrCreateInstance(completeModalEl);

        if (sendBtn) {
            sendBtn.addEventListener('click', function () {
                forgotModal.hide();
                forgotModalEl.addEventListener('hidden.bs.modal', function handler() {
                    forgotModalEl.removeEventListener('hidden.bs.modal', handler);
                    sentModal.show();
                }, { once: true });
            });
        }

        if (demoBtn) {
            demoBtn.addEventListener('click', function () {
                sentModal.hide();
                sentModalEl.addEventListener('hidden.bs.modal', function handler() {
                    sentModalEl.removeEventListener('hidden.bs.modal', handler);
                    completeModal.show();
                }, { once: true });
            });
        }
    }

    document.addEventListener('DOMContentLoaded', function () {
        initPasswordToggle();
        initCaptcha();
        initForgotPasswordFlow();
    });
})();
