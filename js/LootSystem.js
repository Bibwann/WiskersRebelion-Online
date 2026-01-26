import { gameState } from './GameState.js';

export class LootSystem {
    constructor(scene) {
        this.scene = scene;
        this.loots = [];
        this.time = 0;
        
        // --- MATERIALS ---
        this.lootMat = new BABYLON.StandardMaterial("lootMat", this.scene);
        this.lootMat.emissiveColor = new BABYLON.Color3(1, 0.8, 0.2); // Golden Glow
        this.lootMat.disableLighting = true;

        this.scene.onBeforeRenderObservable.add(this.update.bind(this));
    }

    spawnLoot(position, type = 'SCRAP') {
        const lootMesh = BABYLON.MeshBuilder.CreateSphere("loot", {diameter: 0.8}, this.scene);
        lootMesh.position = position.clone();
        lootMesh.position.y = 0.5;
        lootMesh.material = this.lootMat;
        
        // Float Animation
        lootMesh.animationVal = Math.random() * 100;

        lootMesh.metadata = {
            type: 'LOOT',
            lootType: type,
            value: Math.floor(Math.random() * 10) + 5 // 5-15 scraps
        };

        // Light
        const light = new BABYLON.PointLight("lootLight", new BABYLON.Vector3(0,0,0), this.scene);
        light.parent = lootMesh;
        light.diffuse = new BABYLON.Color3(1, 0.8, 0.2);
        light.intensity = 0.8;
        light.range = 3;

        this.loots.push(lootMesh);
        console.log("Loot spawned!");
    }

    update() {
        if (!this.scene.activeCamera) return;

        const dt = this.scene.getEngine().getDeltaTime() / 1000;
        this.time += dt * 2;

        const player = this.scene.getMeshByName("hero");
        if (!player) return;

        // Loop backwards to splice safely
        for (let i = this.loots.length - 1; i >= 0; i--) {
            const loot = this.loots[i];
            
            // Animation
            loot.position.y = 0.5 + Math.sin(this.time + loot.animationVal) * 0.2;
            loot.rotation.y += dt;

            // Pickup Check (Distance < 2)
            if (BABYLON.Vector3.DistanceSquared(player.position, loot.position) < 4) {
                this.collectLoot(loot, i);
            }
        }
    }

    collectLoot(lootMesh, index) {
        const data = lootMesh.metadata;
        
        // Apply Game Logic
        if (data.lootType === 'SCRAP') {
            gameState.playerData.scrap += data.value;
            console.log(`Picked up ${data.value} scraps! Total: ${gameState.playerData.scrap}`);
            this.showFloatingText(lootMesh.position, `+${data.value} Scrap`);
            
            // Auto Upgrade Check (Simple logic for "improving spells")
            if (gameState.playerData.scrap >= 50) {
                // Example threshold
                 // Fix: Retrieve player mesh correctly if needed, or use looting position
                 const player = this.scene.getMeshByName("hero");
                 if(player) this.showFloatingText(player.position, "Upgrade Available!", "lime");
            }
        }

        // Cleanup
        lootMesh.dispose();
        this.loots.splice(index, 1);
    }

    showFloatingText(pos, text, color="yellow") {
        // Use GUI for readable 2D text that tracks the mesh
        // Create specialized ADT for Floating Text if doesn't exist to avoid conflict
        if (!this.adt) {
            this.adt = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("LootUI", true, this.scene);
        }

        const label = new BABYLON.GUI.TextBlock();
        label.text = text;
        label.color = color;
        label.fontSize = 24;
        label.fontWeight = "bold";
        label.outlineColor = "black";
        label.outlineWidth = 2;
        
        this.adt.addControl(label);
        
        // Link to mesh position
        const dummyMesh = new BABYLON.TransformNode("dummy", this.scene);
        dummyMesh.position = pos.clone().add(new BABYLON.Vector3(0, 2, 0));
        label.linkWithMesh(dummyMesh);
        label.linkOffsetY = -50; // Pivot
        
        // Animation
        const anim = new BABYLON.Animation("float", "linkOffsetY", 30, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
        anim.setKeys([{frame:0, value: -50}, {frame: 60, value: -150}]);
        
        const fadeAnim = new BABYLON.Animation("fade", "alpha", 30, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
        fadeAnim.setKeys([{frame: 0, value: 1}, {frame: 40, value: 1}, {frame: 60, value: 0}]);
        
        this.scene.beginDirectAnimation(label, [anim, fadeAnim], 0, 60, false, 1, () => {
             label.dispose();
             dummyMesh.dispose();
        });
    }
}
