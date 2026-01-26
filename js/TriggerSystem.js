// js/TriggerSystem.js
export class TriggerSystem {
    constructor(scene) {
        this.scene = scene;
        this.triggers = []; // { mesh, callback, oneShot, triggered }
        this.playerRef = null;
    }

    registerPlayer(playerMesh) {
        this.playerRef = playerMesh;
    }

    addTriggerBox(position, size, callback, oneShot = true) {
        // Create invisible box for debugging/logic
        const box = BABYLON.MeshBuilder.CreateBox("trigger", {width: size.x, height: size.y, depth: size.z}, this.scene);
        box.position = position;
        box.isVisible = false; 
        // box.visibility = 0.2; // Debug visibility
        
        this.triggers.push({
            mesh: box,
            callback: callback,
            oneShot: oneShot,
            triggered: false
        });
    }

    update() {
        if (!this.playerRef) return;

        this.triggers.forEach(t => {
            if (t.oneShot && t.triggered) return;

            if (t.mesh.intersectsMesh(this.playerRef, true)) {
                if (!t.triggered) {
                    console.log("Trigger Entered!");
                    t.callback();
                    t.triggered = true;
                }
            } else {
                // Reset trigger if not oneShot (re-enterable)
                if (!t.oneShot) {
                    t.triggered = false;
                }
            }
        });
    }

    dispose() {
        this.triggers.forEach(t => t.mesh.dispose());
        this.triggers = [];
    }
}
