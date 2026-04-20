import Phaser from 'phaser';
import { defaultGameState, loadSavedState, REGISTRY_KEYS } from '../game/state';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create() {
    const saved = loadSavedState();
    this.registry.set(REGISTRY_KEYS.state, saved ?? defaultGameState());
    this.scene.start('preload');
  }
}
