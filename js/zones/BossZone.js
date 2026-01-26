// js/zones/BossZone.js
import { AssetFactory } from '../AssetFactory.js';
import { CombatSystem } from '../CombatSystem.js';
import { UIManager } from '../UIManager.js';
import { InputManager } from '../InputManager.js';
import { DIALOGUES as Dialogues } from '../GameData.js';
import { PlayerController } from '../characters/PlayerController.js';
import { gameState } from '../GameState.js';

export class BossZone {
    constructor(scene, assetFactory, uiManager) {
        console.log("CONSTRUCTING BOSS ZONE");
        this.scene = scene;
        this.uiManager = uiManager;
        this.assetFactory = assetFactory; // Use shared factory
        
        this.combatSystem = new CombatSystem(scene, uiManager);
        this.bossRef = null;
        this.hero = null;
        this.playerController = null;
    }

    async enter() {
        console.log("ENTERING BOSS ZONE - THE THRONE ROOM");
        this.victoryTriggered = false;
        
        // Update Quest UI
        if(this.uiManager) {
            this.uiManager.updateQuestObjective("OBJECTIF : Vaincre le Marquis de Botté");
        }
        
        // 1. Create Environment
        this.assetFactory.createEnvironmentBoss();
        
        // 2. Setup Camera
        const bossCam = new BABYLON.FreeCamera("BossCam", new BABYLON.Vector3(0, 12, -45), this.scene);
        bossCam.setTarget(new BABYLON.Vector3(0, 4, 10)); 
        bossCam.fov = 0.8;
        bossCam.minZ = 0.5;
        bossCam.maxZ = 1000;
        
        this.scene.activeCamera = bossCam;
        bossCam.attachControl(this.scene.getEngine().getRenderingCanvas(), true);

        // 3. Spawn Hero
        const playerClass = (gameState.playerData && gameState.playerData.classId) ? gameState.playerData.classId : 'FERRAILLEUR';
        this.hero = this.assetFactory.createHero(playerClass);
        if(this.hero) {
            this.hero.position = new BABYLON.Vector3(0, 0.1, -25);
            this.hero.rotation = new BABYLON.Vector3(0, 0, 0); 
            
            this.playerController = new PlayerController(this.scene, this.hero);
            
            // Stats
            const heroStats = { hp: 100, maxHp: 100, ap: 3, mp: 3, name: "Whiskers" }; 
            // In CombatSystem.js, the method is named 'registerPlayer', not 'registerHero'
            this.combatSystem.registerPlayer(this.hero);
        }

        // 4. Lights
        // (Handled by Environment, but ensure fallback)
        if(this.scene.lights.length === 0) {
            const hemi = new BABYLON.HemisphericLight("fallbackHemi", new BABYLON.Vector3(0, 1, 0), this.scene);
            hemi.intensity = 0.8;
        }

        // 5. Spawn Boss
        this.initBossFight();

        // 6. Loop
        this.updateObserver = this.scene.onBeforeRenderObservable.add(() => {
            this.update();
        });

        // CHANGE: Add Movement Listener for Boss Zone controls
        this.moveListener = (e) => {
            if (this.playerController && !this.combatSystem.inCombat && this.victoryTriggered) {
                this.playerController.setMoveTarget(e.detail.position);
                // Optional: VFX
                // if(this.vfx) this.vfx.createClickEffect(e.detail.position);
            }
        };
        document.addEventListener('player-move-request', this.moveListener);

        // 7. Intro
        setTimeout(() => {
            if(this.uiManager) {
                // Intro is longer now, but we don't block. Wait for user to check "Start Fight"
                this.uiManager.showDialogue({ detail: Dialogues['MARQUIS_INTRO'] });
            }
        }, 1000);

        // Combat Listener
        this.startCombatListener = () => {
             // Change Boss Name to Revealed Name after conversation
             if(this.bossRef && this.bossRef.metadata && this.bossRef.metadata.combat) {
                 this.bossRef.metadata.combat.name = "Marquis de Botté";
             }
             if(this.bossRef) this.combatSystem.startBattle(this.bossRef);
        };
        document.addEventListener('start-marquis-combat', this.startCombatListener);
    }

    setupLighting() {
         // Additional lights if needed
    }

    initBossFight() {
        // Create Marquis
        const boss = this.assetFactory.createMob('MARQUIS'); 
        if(boss) {
            boss.position = new BABYLON.Vector3(0, 0.1, 20); // Near Throne
            boss.scaling = new BABYLON.Vector3(2, 2, 2);
            boss.lookAt(new BABYLON.Vector3(0, 0.1, -25)); // Look at Player
            
            // Stats from GameData - Use Imported GameData if possible or Define correctly here
            // Note: GameData.js has ENEMIES.MARQUIS, but we were using hardcoded stats here.
            // FIXED: Added ultCooldown explicitly to prevent NaN errors in CombatSystem
            const stats = { 
                hp: 2000, 
                maxHp: 2000, // Important for healthbar
                damage: 40, 
                pm: 6, 
                xp: 5000, 
                name: "Marquis de Botté",
                turnCounter: 0,
                ultCooldown: 4
            };
            this.combatSystem.registerEnemy(boss, stats);
            this.bossRef = boss;
        } else {
            console.error("FAILED TO CREATE BOSS MESH");
        }
    }

    update() {
         // Check Boss Death for Victory Condition
         if(this.bossRef && this.bossRef.metadata && this.bossRef.metadata.combat && this.bossRef.metadata.combat.hp <= 0 && !this.victoryTriggered) {
             this.victoryTriggered = true;
             console.log("BOSS DEFEATED from Zone Update Loop");
             this.spawnVictoryLoot();
         }

         // Player Update (Movement)
         if(this.playerController && this.victoryTriggered) {
             const dt = this.scene.getEngine().getDeltaTime() / 1000;
             this.playerController.update(dt);
             
             // Check Portal Proximity for UI Help
             const portal = this.scene.getMeshByName("portal");
             if(portal && this.hero) {
                 const dist = BABYLON.Vector3.Distance(this.hero.position, portal.position);
                 // UI Warning: Basic implementation
                 const hint = document.getElementById('combat-log'); // Reuse log or create new overlay
                 if(dist < 3) {
                     if(hint && !hint.innerText.includes("INTERAGIR")) { // Avoid spam
                        this.uiManager.logCombat?.("Appuyez sur [E] pour sortir", "cyan"); 
                     }
                 }
             }
         }
    }

    spawnVictoryLoot() {
        // 1. UPDATE GAME STATE & QUEST
        gameState.flags['ZONE1_BOSS_DEAD'] = true;
        if(this.uiManager) {
            this.uiManager.updateQuestObjective("MISSION ACCOMPLIE : Retournez voir le Doc au Hub");
        }

        // 2. Victory Dialogue
        this.uiManager.showDialogue({ 
            detail: { 
                npc: "Marquis (Vaincu)", 
                text: "Marquis: 'Adieu monde cruel... mes bottes... sont à vous...'\n(Il disparaît dans un nuage de paillettes)", 
                options: [{text: "Victoire !", action: "CLOSE"}]
            }
        });
        
        // 3. UNLOCK MOVEMENT (Just in case)
        if(this.playerController) {
            this.playerController.immobilize(false);
        }

        // --- BACK TO HUB PORTAL ---
        const portal = BABYLON.MeshBuilder.CreateCylinder("portal", {diameter: 3, height: 0.1}, this.scene);
        portal.position = new BABYLON.Vector3(0, 0.1, 0); // Center room
        portal.material = new BABYLON.StandardMaterial("portalMat", this.scene);
        portal.material.emissiveColor = new BABYLON.Color3(0, 1, 1); // Cyan glow
        portal.metadata = { type: 'INTERACTABLE', id: 'HUB_PORTAL', label: 'RETOUR AU HUB' };
        
        // Spin Anim
        const spin = new BABYLON.Animation("spin", "rotation.y", 30, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);
        spin.setKeys([{frame:0, value:0}, {frame:60, value:Math.PI*2}]);
        this.scene.beginDirectAnimation(portal, [spin], 0, 60, true);
        
        // Listener for Portal Interaction
        this.portalListener = (e) => {
             if(e.detail.objectId === 'HUB_PORTAL') {
                 console.log("Portal used -> HUB");
                 // Flag Zone 1 as Fully Completed
                 gameState.flags['ZONE1_COMPLETED'] = true;
                 
                 const evt = new CustomEvent('request-zone-change', { detail: { zoneId: 'HUB' }});
                 document.dispatchEvent(evt);
             }
        };
        document.addEventListener('object-interaction', this.portalListener);

        // --- EASTER EGGS ---
        // 1. Hat
        const hat = BABYLON.MeshBuilder.CreateCylinder("hat", {diameterTop:0.1, diameterBottom:0.6, height:0.4}, this.scene);
        hat.position = new BABYLON.Vector3(-2, 0.2, 2);
        const blackMat = new BABYLON.StandardMaterial("black", this.scene);
        blackMat.diffuseColor = BABYLON.Color3.Black();
        hat.material = blackMat;
        
        // 2. Boots
        const bootL = BABYLON.MeshBuilder.CreateBox("bootL", {height:0.6, width:0.3, depth:0.4}, this.scene);
        bootL.position = new BABYLON.Vector3(2, 0.3, 2);
        
        // Floating Text
        this.assetFactory.createFloatingText(new BABYLON.Vector3(0, 2, 0), "PORTAIL VERS LE HUB", "cyan");
    }

    exit() {
        console.log("EXITING BOSS ZONE");
        if(this.updateObserver) {
            this.scene.onBeforeRenderObservable.remove(this.updateObserver);
        }
        document.removeEventListener('start-marquis-combat', this.startCombatListener);
        if(this.portalListener) {
            document.removeEventListener('object-interaction', this.portalListener);
        }
        if(this.moveListener) {
            document.removeEventListener('player-move-request', this.moveListener);
        }
        // Note: Scene dispose is handled by main.js loadZone usually, 
        // but here main.js calls dispose() on the scene itself. 
        // We just need to cleanup listeners.
    }
}
