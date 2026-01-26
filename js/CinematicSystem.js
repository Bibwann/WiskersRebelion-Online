// js/CinematicSystem.js

export class CinematicSystem {
    constructor() {
        this.container = document.getElementById('cinematic-screen');
        this.textContainer = document.getElementById('cinematic-text');
        this.skipBtn = document.getElementById('btn-skip-intro');
    }

    playIntro(onComplete) {
        if (!this.container) return onComplete();

        this.container.classList.remove('hidden');
        this.active = true;

        // Reset text animation
        this.textContainer.style.animation = 'none';
        this.textContainer.offsetHeight; /* trigger reflow */
        this.textContainer.style.animation = ''; // Re-apply CSS animation

        const finish = () => {
            if (!this.active) return;
            this.active = false;
            this.container.classList.add('hidden');
            onComplete();
        };

        // Skip button
        this.skipBtn.onclick = finish;

        // Auto finish after animation (approx 20s based on CSS)
        setTimeout(finish, 20000);
    }
}
