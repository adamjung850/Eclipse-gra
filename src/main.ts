import { BootScene } from './scenes/BootScene.js';
import { AccountScene } from './scenes/AccountScene.js';
import { CharacterCreatorScene } from './scenes/CharacterCreatorScene.js';
import { IntroScene } from './scenes/IntroScene.js';
import { MainMenuScene } from './scenes/MainMenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { UIScene } from './scenes/UIScene.js';

export function createGame(): Phaser.Game {
  let targetFps = 60;
  let forceSetTimeOut = false;
  try {
    const savedFps = localStorage.getItem('delveria_fps');
    if (savedFps === 'unlimited') {
      targetFps = 999;
      forceSetTimeOut = false;
    } else if (savedFps) {
      const parsed = parseInt(savedFps, 10);
      if (!Number.isNaN(parsed) && parsed >= 30) {
        targetFps = parsed;
      }
    }
  } catch {
    // Ignore storage errors
  }

  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: window.innerWidth,
    height: window.innerHeight,
    pixelArt: true,
    roundPixels: true,
    fps: {
      target: targetFps,
      forceSetTimeOut,
    },
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false
      }
    },
    scene: [BootScene, AccountScene, CharacterCreatorScene, IntroScene, MainMenuScene, GameScene, UIScene]
  };

  return new Phaser.Game(config);
}

// Auto-boot on load
window.addEventListener('DOMContentLoaded', () => {
  (window as any).game = createGame();
});
