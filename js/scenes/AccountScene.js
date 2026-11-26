import { getCurrentUser, listRegisteredUsernames, loginAccount, registerAccount, } from '../systems/AccountSystem.js';
export class AccountScene extends Phaser.Scene {
    static BG_TEX = '__delveria_menu_real_cave__';
    static TITLE_TEX = '__delveria_title_tex__';
    static BINARY_TEX = '__delveria_ac_binary__';
    bgImage = null;
    binaryCrystal = null;
    binaryGlow = null;
    titleSprite = null;
    titleGlow = null;
    motes = [];
    uiRoot = null;
    mode = 'login';
    isTransitioning = false;
    constructor() {
        super('AccountScene');
    }
    create() {
        const W = this.scale.width;
        const H = this.scale.height;
        this.isTransitioning = false;
        this.motes = [];
        this.cameras.main.setBackgroundColor('#04070d');
        this.cameras.main.fadeIn(350, 4, 7, 13);
        // 1. Atmospheric Delveria Cave Background (reuse MainMenuScene texture if present)
        if (this.textures.exists(AccountScene.BG_TEX)) {
            this.bgImage = this.add.image(W / 2, H / 2, AccountScene.BG_TEX)
                .setOrigin(0.5, 0.5)
                .setDepth(0)
                .setAlpha(0.72);
            const scale = Math.max(W / this.bgImage.width, H / this.bgImage.height);
            this.bgImage.setScale(scale);
        }
        const darkOverlay = this.add.rectangle(W / 2, H / 2, W * 2, H * 2, 0x030712, 0.52).setDepth(1);
        darkOverlay.setScrollFactor(0);
        // 2. Drifting mystical motes
        for (let i = 0; i < 24; i++) {
            const sz = Phaser.Math.Between(2, 4);
            const col = i % 3 === 0 ? 0xc084fc : (i % 2 === 0 ? 0x38bdf8 : 0x7dd3fc);
            const rect = this.add.rectangle(Phaser.Math.Between(0, W), Phaser.Math.Between(0, H), sz, sz, col, 0.5).setDepth(2).setBlendMode(Phaser.BlendModes.ADD);
            this.motes.push({
                rect,
                vx: Phaser.Math.FloatBetween(-10, 12),
                vy: -Phaser.Math.FloatBetween(12, 28),
                phase: Phaser.Math.FloatBetween(0, Math.PI * 2),
                baseAlpha: Phaser.Math.FloatBetween(0.22, 0.65),
            });
        }
        // 3. Binary 0/1 Crystal Logo in background
        this.buildBinaryCrystalTexture();
        if (this.textures.exists('light_radial_mask')) {
            this.binaryGlow = this.add.image(W / 2, H * 0.52, 'light_radial_mask')
                .setOrigin(0.5, 0.5)
                .setTint(0x0ea5e9)
                .setScale(1.8)
                .setAlpha(0.22)
                .setBlendMode(Phaser.BlendModes.ADD)
                .setDepth(3);
        }
        this.binaryCrystal = this.add.image(W / 2, H * 0.52, AccountScene.BINARY_TEX)
            .setOrigin(0.5, 0.5)
            .setAlpha(0.32)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setDepth(4);
        // 4. Sculpted DELVERIA title at top
        this.buildTitleTextureIfNeeded();
        if (this.textures.exists('light_radial_mask')) {
            this.titleGlow = this.add.image(W / 2, 66, 'light_radial_mask')
                .setOrigin(0.5, 0.5)
                .setTint(0x0ea5e9)
                .setScale(1.7, 0.5)
                .setAlpha(0.24)
                .setBlendMode(Phaser.BlendModes.ADD)
                .setDepth(5);
        }
        this.titleSprite = this.add.image(W / 2, 66, AccountScene.TITLE_TEX)
            .setOrigin(0.5, 0.5)
            .setDepth(6);
        const maxTitleW = Math.min(440, W * 0.55);
        if (this.titleSprite.width > maxTitleW) {
            this.titleSprite.setScale(maxTitleW / this.titleSprite.width);
        }
        else {
            this.titleSprite.setScale(0.76);
        }
        // 5. DOM Account Panel
        const existingUsers = listRegisteredUsernames();
        this.mode = existingUsers.length > 0 ? 'login' : 'register';
        this.buildDomUi(existingUsers);
        this.scale.on('resize', this.handleResize, this);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.scale.off('resize', this.handleResize, this);
            this.destroyDomUi();
        });
    }
    update(time, delta) {
        const dt = Math.min(delta / 1000, 0.05);
        const W = this.scale.width;
        const H = this.scale.height;
        for (const m of this.motes) {
            m.rect.x += m.vx * dt;
            m.rect.y += m.vy * dt;
            if (m.rect.y < -10)
                m.rect.y = H + 10;
            if (m.rect.x < -10)
                m.rect.x = W + 10;
            if (m.rect.x > W + 10)
                m.rect.x = -10;
            m.rect.alpha = m.baseAlpha * (0.65 + 0.35 * Math.sin(time * 0.002 + m.phase));
        }
        if (this.binaryCrystal) {
            this.binaryCrystal.y = H * 0.52 + Math.sin(time * 0.0014) * 8;
            this.binaryCrystal.alpha = 0.26 + 0.08 * Math.sin(time * 0.0018);
        }
        if (this.binaryGlow) {
            this.binaryGlow.y = H * 0.52 + Math.sin(time * 0.0014) * 8;
        }
    }
    handleResize(gameSize) {
        const W = gameSize.width;
        const H = gameSize.height;
        if (this.bgImage) {
            this.bgImage.setPosition(W / 2, H / 2);
            this.bgImage.setScale(Math.max(W / this.bgImage.width, H / this.bgImage.height));
        }
        if (this.binaryCrystal)
            this.binaryCrystal.setPosition(W / 2, H * 0.52);
        if (this.binaryGlow)
            this.binaryGlow.setPosition(W / 2, H * 0.52);
        if (this.titleSprite)
            this.titleSprite.setPosition(W / 2, 66);
        if (this.titleGlow)
            this.titleGlow.setPosition(W / 2, 66);
    }
    buildBinaryCrystalTexture() {
        if (this.textures.exists(AccountScene.BINARY_TEX))
            return;
        const w = 220;
        const h = 300;
        const tex = this.textures.createCanvas(AccountScene.BINARY_TEX, w, h);
        if (!tex)
            return;
        const ctx = tex.getContext();
        ctx.clearRect(0, 0, w, h);
        const cx = w / 2;
        const cy = h / 2;
        ctx.font = 'bold 11px Consolas, "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (let y = 18; y < h - 18; y += 13) {
            const normY = (y - cy) / (h * 0.44);
            if (Math.abs(normY) > 1)
                continue;
            const halfW = (1 - Math.abs(normY)) * (w * 0.42);
            for (let x = cx - halfW; x <= cx + halfW; x += 10) {
                const bit = ((Math.floor(x) + Math.floor(y)) % 3 === 0) ? '1' : '0';
                const dist = Math.abs(x - cx) / Math.max(1, halfW);
                const alpha = (1 - dist * 0.65) * 0.9;
                ctx.fillStyle = dist < 0.35
                    ? `rgba(186, 230, 253, ${alpha})`
                    : `rgba(56, 189, 248, ${alpha * 0.75})`;
                ctx.fillText(bit, x, y);
            }
        }
        tex.refresh();
    }
    buildTitleTextureIfNeeded() {
        if (this.textures.exists(AccountScene.TITLE_TEX))
            return;
        const w = 520;
        const h = 92;
        const tex = this.textures.createCanvas(AccountScene.TITLE_TEX, w, h);
        if (!tex)
            return;
        const ctx = tex.getContext();
        ctx.clearRect(0, 0, w, h);
        ctx.font = 'bold 64px Consolas, "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#020617';
        ctx.fillText('DELVERIA', w / 2 + 4, h / 2 + 5);
        const grad = ctx.createLinearGradient(0, 14, 0, h - 14);
        grad.addColorStop(0, '#f8fafc');
        grad.addColorStop(0.45, '#7dd3fc');
        grad.addColorStop(1, '#38bdf8');
        ctx.fillStyle = grad;
        ctx.fillText('DELVERIA', w / 2, h / 2);
        tex.refresh();
    }
    destroyDomUi() {
        if (this.uiRoot) {
            this.uiRoot.remove();
            this.uiRoot = null;
        }
    }
    buildDomUi(existingUsers) {
        this.destroyDomUi();
        const root = document.createElement('div');
        root.className = 'ac-root';
        const card = document.createElement('div');
        card.className = 'ac-card';
        card.innerHTML = `
      <div class="cc-corner tl"></div>
      <div class="cc-corner tr"></div>
      <div class="cc-corner bl"></div>
      <div class="cc-corner br"></div>
    `;
        const header = document.createElement('div');
        header.className = 'ac-header';
        header.innerHTML = `
      <div class="ac-title">KONTO DELVERIA</div>
      <div class="ac-subtitle">Zaloguj się lub utwórz nowe konto, aby zapisywać postęp gry</div>
    `;
        card.appendChild(header);
        const tabs = document.createElement('div');
        tabs.className = 'ac-tabs';
        const loginTabBtn = document.createElement('button');
        loginTabBtn.type = 'button';
        loginTabBtn.className = `ac-tab ${this.mode === 'login' ? 'active' : ''}`;
        loginTabBtn.textContent = 'Logowanie';
        const regTabBtn = document.createElement('button');
        regTabBtn.type = 'button';
        regTabBtn.className = `ac-tab ${this.mode === 'register' ? 'active' : ''}`;
        regTabBtn.textContent = 'Tworzenie konta';
        tabs.append(loginTabBtn, regTabBtn);
        card.appendChild(tabs);
        const loginField = document.createElement('div');
        loginField.className = 'ac-field';
        const loginLbl = document.createElement('label');
        loginLbl.className = 'ac-label';
        loginLbl.textContent = 'Login';
        const loginInput = document.createElement('input');
        loginInput.type = 'text';
        loginInput.className = 'ac-input';
        loginInput.placeholder = 'Wpisz login (min. 3 znaki)...';
        loginInput.maxLength = 20;
        loginInput.autocomplete = 'username';
        const lastUser = getCurrentUser();
        if (lastUser)
            loginInput.value = lastUser;
        loginField.append(loginLbl, loginInput);
        card.appendChild(loginField);
        if (existingUsers.length > 0) {
            const savedRow = document.createElement('div');
            savedRow.className = 'ac-saved-row';
            const savedLbl = document.createElement('span');
            savedLbl.className = 'ac-saved-lbl';
            savedLbl.textContent = 'Konta:';
            savedRow.appendChild(savedLbl);
            existingUsers.slice(0, 4).forEach((uname) => {
                const chip = document.createElement('button');
                chip.type = 'button';
                chip.className = 'ac-chip';
                chip.textContent = uname;
                chip.addEventListener('click', () => {
                    loginInput.value = uname;
                    this.mode = 'login';
                    syncMode();
                    passInput.focus();
                });
                savedRow.appendChild(chip);
            });
            card.appendChild(savedRow);
        }
        const passField = document.createElement('div');
        passField.className = 'ac-field';
        const passLbl = document.createElement('label');
        passLbl.className = 'ac-label';
        passLbl.textContent = 'Hasło';
        const passInput = document.createElement('input');
        passInput.type = 'password';
        passInput.className = 'ac-input';
        passInput.placeholder = 'Wpisz hasło (min. 4 znaki)...';
        passInput.maxLength = 64;
        passField.append(passLbl, passInput);
        card.appendChild(passField);
        const msgEl = document.createElement('div');
        msgEl.className = 'ac-msg';
        card.appendChild(msgEl);
        const submitBtn = document.createElement('button');
        submitBtn.type = 'button';
        submitBtn.className = 'ac-submit';
        card.appendChild(submitBtn);
        const syncMode = () => {
            loginTabBtn.classList.toggle('active', this.mode === 'login');
            regTabBtn.classList.toggle('active', this.mode === 'register');
            submitBtn.textContent = this.mode === 'login' ? 'ZALOGUJ SIĘ →' : 'UTWÓRZ KONTO →';
            msgEl.textContent = '';
            msgEl.classList.remove('ok');
        };
        syncMode();
        loginTabBtn.addEventListener('click', () => {
            this.mode = 'login';
            syncMode();
        });
        regTabBtn.addEventListener('click', () => {
            this.mode = 'register';
            syncMode();
        });
        const handleSubmit = async () => {
            if (this.isTransitioning)
                return;
            msgEl.textContent = '';
            msgEl.classList.remove('ok');
            const username = loginInput.value;
            const password = passInput.value;
            const res = this.mode === 'login'
                ? await loginAccount(username, password)
                : await registerAccount(username, password);
            if (!res.ok) {
                msgEl.textContent = res.error || 'Wystąpił błąd.';
                return;
            }
            msgEl.classList.add('ok');
            msgEl.textContent = this.mode === 'login'
                ? `Zalogowano jako ${res.username}!`
                : `Konto ${res.username} utworzone!`;
            this.isTransitioning = true;
            this.cameras.main.fadeOut(280, 4, 7, 13);
            this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
                this.destroyDomUi();
                this.scene.start('MainMenuScene');
            });
        };
        submitBtn.addEventListener('click', handleSubmit);
        [loginInput, passInput].forEach((inp) => {
            inp.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSubmit();
                }
            });
        });
        root.appendChild(card);
        document.body.appendChild(root);
        this.uiRoot = root;
        setTimeout(() => {
            if (loginInput.value.trim().length > 0)
                passInput.focus();
            else
                loginInput.focus();
        }, 60);
    }
}
