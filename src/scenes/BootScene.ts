import Phaser from 'phaser';
import { defaultGameState, REGISTRY_KEYS } from '../game/state';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create() {
    this.registry.set(REGISTRY_KEYS.state, defaultGameState());
    this.scene.start('preload');
  }
}
