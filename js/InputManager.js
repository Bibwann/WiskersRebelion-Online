// js/InputManager.js
import { gameState, GameStates } from './GameState.js';

export class InputManager {
    constructor(scene, canvas, settingsManager) {
        this.scene = scene;
        this.canvas = canvas;
        this.settingsManager = settingsManager;
        this.highlightMesh = null;
        
        // Initialisation
        this.setupPointerEvents();
        this.setupKeyboardEvents();
    }
    
    // Setter for scene update
    set scene(newScene) {
        this._scene = newScene;
        // Re-Bind Pointer Events to the new scene
        if (this._scene) {
            this.setupPointerEvents();
        }
    }
    
    get scene() {
        return this._scene;
    }

    setupKeyboardEvents() {
        window.addEventListener('keydown', (evt) => {
            if (this.settingsManager) {
                const keys = this.settingsManager.getKeys();
                const key = evt.key.toLowerCase();
                
                // Map keys to events
                if (key === keys.MENU.toLowerCase() || evt.key === 'Escape') {
                    // Toggle Menu/Options (handled by main/UI usually, but we emit event)
                    document.dispatchEvent(new CustomEvent('toggle-menu'));
                }
                else if (key === keys.INVENTORY.toLowerCase()) {
                    document.dispatchEvent(new CustomEvent('toggle-inventory'));
                }
                else if (key === keys.INTERACT.toLowerCase()) {
                    // Trigger interaction with nearest object
                    // For now, emit event
                    document.dispatchEvent(new CustomEvent('player-interact-request'));
                }
            }
        });
    }

    setupPointerEvents() {
        if (!this.scene) return;
        this.scene.onPointerObservable.add((pointerInfo) => {
            switch (pointerInfo.type) {
                case BABYLON.PointerEventTypes.POINTERDOWN:
                    this.handlePointerDown(pointerInfo);
                    break;
                case BABYLON.PointerEventTypes.POINTERMOVE:
                    this.handlePointerMove(pointerInfo);
                    break;
            }
        });
    }

    handlePointerDown(pointerInfo) {
        // Blocks inputs ONLY if in Menu or Cinematic
        if (gameState.currentState === GameStates.MENU || gameState.currentState === GameStates.ZONE_TRANSITION) return;

        if (pointerInfo.pickInfo.hit) {
            const pickedMesh = pointerInfo.pickInfo.pickedMesh;
            const metadata = pickedMesh.metadata;

            if (metadata) {
                // Cas 1: Clic sur le Sol -> Déplacement
                if (metadata.type === 'GROUND') {
                    // Émettre un événement pour que le PlayerController gère le déplacement
                    const evt = new CustomEvent('player-move-request', { 
                        detail: { position: pointerInfo.pickInfo.pickedPoint } 
                    });
                    document.dispatchEvent(evt);
                    this.createClickEffect(pointerInfo.pickInfo.pickedPoint);
                }
                
                // Cas 2: Clic sur PNJ -> Dialogue
                else if (metadata.type === 'NPC') {
                    const evt = new CustomEvent('npc-interaction', { 
                        detail: { npcId: metadata.id } 
                    });
                    document.dispatchEvent(evt);
                }

                // Cas 3: Clic sur Objet Interactif (Téléporteur)
                else if (metadata.type === 'INTERACTABLE') {
                    const evt = new CustomEvent('object-interaction', {
                        detail: { objectId: metadata.id }
                    });
                    document.dispatchEvent(evt);
                }
            }
        }
    }

    handlePointerMove(pointerInfo) {
        // Feedback visuel (Hover)
        if (gameState.currentState === GameStates.MENU) return;

        if (pointerInfo.pickInfo.hit) {
            const mesh = pointerInfo.pickInfo.pickedMesh;
            if (mesh.metadata && (mesh.metadata.type === 'NPC' || mesh.metadata.type === 'INTERACTABLE')) {
                // Changer le curseur via CSS global
                this.canvas.style.cursor = 'help'; // ou une url personnalisée
                
                // Highlight temporaire (optionnel)
                this.handleHighlight(mesh);
            } else {
                this.canvas.style.cursor = 'default';
                this.removeHighlight();
            }
        }
    }

    createClickEffect(position) {
        // Feedback visuel rapide au clic (cercle vert)
        const disc = BABYLON.MeshBuilder.CreateDisc("clickFX", {radius: 0.5}, this.scene);
        disc.position = position.clone();
        disc.position.y += 0.05;
        disc.rotation.x = Math.PI / 2;
        
        const mat = new BABYLON.StandardMaterial("fxMat", this.scene);
        mat.diffuseColor = BABYLON.Color3.Green();
        mat.emissiveColor = BABYLON.Color3.Green();
        mat.alpha = 0.6;
        disc.material = mat;

        // Animation simple puis destruction
        const anim = new BABYLON.Animation("fade", "visibility", 30, BABYLON.Animation.ANIMATIONTYPE_FLOAT);
        anim.setKeys([{frame: 0, value: 1}, {frame: 20, value: 0}]);
        disc.animations.push(anim);
        
        this.scene.beginAnimation(disc, 0, 20, false, 1, () => {
            disc.dispose();
        });
    }

    handleHighlight(mesh) {
        if (this.highlightMesh !== mesh) {
            if (this.highlightMesh) this.highlightMesh.renderOverlay = false;
            this.highlightMesh = mesh;
            this.highlightMesh.renderOverlay = true;
            this.highlightMesh.overlayColor = new BABYLON.Color3(0, 1, 0);
        }
    }

    removeHighlight() {
        if (this.highlightMesh) {
            this.highlightMesh.renderOverlay = false;
            this.highlightMesh = null;
        }
    }
}
