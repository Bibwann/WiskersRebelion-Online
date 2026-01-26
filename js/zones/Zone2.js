
import { AssetFactory } from '../AssetFactory.js';
import { CombatSystem } from '../CombatSystem.js';
import { UIManager } from '../UIManager.js';
import { PlayerController } from '../characters/PlayerController.js';
import { gameState } from '../GameState.js';
import { DIALOGUES, ENEMIES } from '../GameData.js';

import { TriggerSystem } from '../TriggerSystem.js';

export class Zone2 {
    constructor(scene, assetFactory, uiManager) {
        this.scene = scene;
        this.uiManager = uiManager;
        this.assetFactory = assetFactory;
        this.hero = null;
        this.playerController = null;
        this.combatSystem = new CombatSystem(scene, uiManager);
        this.triggerSystem = new TriggerSystem(scene);

        // Puzzle State
        this.colorSequence = []; 
        this.valvesState = { VALVE_1: false, VALVE_2: false };
        this.mathSolved = false;
        
        // Listeners handled in enter()
    }

    enter() {
        console.log("ENTERING ZONE 2: LA MAINTENANCE");
        
        // 1. Environment
        this.assetFactory.createEnvironmentZone2();

        // 2. Camera (Isometric High Angle)
        // Adjusted for larger map
        const cam = new BABYLON.FreeCamera("isoCamZ2", new BABYLON.Vector3(-25, 25, -25), this.scene);
        cam.setTarget(new BABYLON.Vector3(0, 0, 15));
        this.scene.activeCamera = cam;

        // 3. Hero
        const playerClass = gameState.playerData.classId || 'FERRAILLEUR';
        this.hero = this.assetFactory.createHero(playerClass);
        this.hero.position = new BABYLON.Vector3(0, 0.5, 0); // Start Platform
        this.combatSystem.registerPlayer(this.hero);
        
        this.playerController = new PlayerController(this.scene, this.hero);
        this.setupInput();

        // 4. Mobs (Harder)
        this.spawnMobs();
        
        if(this.uiManager) {
            this.uiManager.updateObjective("OBJECTIF: Résoudre les énigmes du secteur.");
        }

        // 5. Update Loop
        this.updateObserver = this.scene.onBeforeRenderObservable.add(() => {
            this.update();
            this.triggerSystem.update();
            
            // FALLBACK: Manual Z Check for Rescue Event
            // Z=85 is the center of the trigger area. Range 75-95.
            if(this.hero && !this.rescueTriggered && !this.inRescueEvent) {
                // Trigger if player passes Gate (Z>72)
                if(this.hero.position.z > 72 && this.hero.position.z < 100) {
                     console.log("MANUAL BACKUP TRIGGER: Entering Rescue Zone.");
                     this.startRescueEvent();
                }
            }
        });

        // 6. Interaction Listener (Local to Zone)
        this.interactListener = (e) => this.handleInteraction(e.detail);
        document.addEventListener('object-interaction', this.interactListener);
        
        // 6b. Interaction KEY Listener
        this.interactKeyListener = () => {
             // Find closest interactable
             let closest = null;
             let minDst = 3.0; // Max Reach
             
             this.scene.meshes.forEach(m => {
                 if(m.metadata && m.metadata.type === 'INTERACTABLE' && m.isEnabled()) {
                     const dst = BABYLON.Vector3.Distance(this.hero.position, m.getAbsolutePosition());
                     if(dst < minDst) {
                         minDst = dst;
                         closest = m;
                     }
                 }
             });
             
             if(closest) {
                 this.handleInteraction({ objectId: closest.metadata.id, mesh: closest });
             } else {
                 this.uiManager.logCombat?.("Rien à utiliser à portée.", "gray");
             }
        };
        document.addEventListener('player-interact-request', this.interactKeyListener);
        
        // LISTEN FOR COMBAT END for Rescue Event & Ambush
        this.combatEndListener = () => {
             // 1. Ambush Check (Gate Opening)
             if(this.ambushActive) {
                // Check if ALL ambush mobs are dead
                const alive = this.ambushSquad && this.ambushSquad.some(m => !m.isDisposed() && m.metadata.combat.hp > 0);
                if(!alive) {
                    this.ambushActive = false;
                    this.openGate();
                    this.uiManager.logCombat?.("MENACE ELIMINEE. ACCES AUTORISE.", "green");
                }
             }

             // 2. Rescue Event Check
             if(this.inRescueEvent) {
                 this.inRescueEvent = false;
                 this.handleRescueDialogue();
             }
        };
        document.addEventListener('combat-end', this.combatEndListener);

        // 7. Dialogue Listener (For Puzzle UI)
        this.dialogueListener = (e) => this.handleDialogueAction(e.detail);
        document.addEventListener('dialogue-action', this.dialogueListener);
        
        // SETUP RESCUE TRIGGER (Room 3 - Corridor)
        // Keep Trigger box as primary, Update loop as backup
        this.triggerSystem.registerPlayer(this.hero);
        this.triggerSystem.addTriggerBox(
            new BABYLON.Vector3(0, 2, 85), 
            new BABYLON.Vector3(20, 10, 20), 
            () => {
                if(!this.rescueTriggered) {
                    console.log("TRIGGER HIT ZONE: RESCUE EVENT");
                    this.rescueTriggered = true;
                    this.startRescueEvent();
                }
            },
            true 
        );
        
        // 9. Zone State
        this.gateOpen = false;
        this.inRescueEvent = false;
        this.rescueTriggered = false; // New flag
        this.companionFollowing = false;
        this.ambushActive = false;
        this.ambushSquad = [];
    }

    // NEW: Trigger spawning of rescue units immediately but set them as waiting
    spawnRescueUnits() {
        console.log("SPAWNING RESCUE UNITS (PRE-EVENT)");
        if(this.companion) return; // Already spawned

        const spawnPos = new BABYLON.Vector3(0, 2, 95);
        this.companion = this.assetFactory.createCompanion(spawnPos);

        // --- ADD VISUAL ICON (ALLY) ---
        const iconPlane = BABYLON.MeshBuilder.CreatePlane("allyIcon", {size: 0.8}, this.scene);
        iconPlane.parent = this.companion;
        iconPlane.position.y = 1.2; 
        iconPlane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
        const iconMat = new BABYLON.StandardMaterial("allyIconMat", this.scene);
        iconMat.diffuseColor = new BABYLON.Color3(0, 1, 0);
        iconMat.emissiveColor = new BABYLON.Color3(0, 1, 0);
        iconPlane.material = iconMat;
        // ------------------------------

        // SPAWN ENEMIES SURROUNDING BD-1
        // Active immediately physically, but we delay combat start until trigger
        const cat1 = this.assetFactory.createMob('MOB_CHEM_CAT');
        cat1.position = new BABYLON.Vector3(-2, 0.5, 93); // Close Left
        cat1.lookAt(spawnPos);
        this.combatSystem.registerEnemy(cat1, ENEMIES.MOB_CHEM_CAT);
        this.rescueTriggerMob = cat1; // Primary target

        const cat2 = this.assetFactory.createMob('MOB_CHEM_CAT');
        cat2.position = new BABYLON.Vector3(2, 0.5, 93); // Close Right
        cat2.lookAt(spawnPos);
        this.combatSystem.registerEnemy(cat2, ENEMIES.MOB_CHEM_CAT);
        
        const cat3 = this.assetFactory.createMob('MOB_CHEM_CAT');
        cat3.position = new BABYLON.Vector3(0, 0.5, 97); // Behind
        cat3.lookAt(spawnPos);
        this.combatSystem.registerEnemy(cat3, ENEMIES.MOB_CHEM_CAT);

        // Make them ignore player initially? 
        // We rely on the fact player is far away.
    }

    openGate() {
        // SPAWN UNITS AS SOON AS GATE OPENS so player can see them from distance
        this.spawnRescueUnits();

        const exit = this.scene.getMeshByName("zone2_exit");
        if(exit) {
            exit.metadata.locked = false; 
            // Visual Update (Color)
            if(exit.material) exit.material.emissiveColor = new BABYLON.Color3(0, 1, 0);

            // Open Animation from Closed (3) to Open (9)
            if(!this.gateOpen) {
                this.gateOpen = true;
                exit.checkCollisions = false; 
                const gateAnim = new BABYLON.Animation("openGate", "position.y", 30, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
                gateAnim.setKeys([{frame:0, value:3}, {frame:30, value: 9}]);
                this.scene.beginDirectAnimation(exit, [gateAnim], 0, 30, false);
            }
        }
    }

    startRescueEvent() {
        // TRIGGER CHECK:
        if(this.inRescueEvent) return; // Prevent double trigger
        if(this.rescueTriggered && !this.inRescueEvent) return; // Already done

        console.log("STARTING RESCUE EVENT CINEMATIC");
        this.inRescueEvent = true;
        this.rescueTriggered = true; 
        
        // Ensure units are spawned if trigger happened another way (e.g. debugging)
        if(!this.companion) this.spawnRescueUnits();
        
        // 1. Lock Player for "Cinematic" feel
        if(this.playerController) this.playerController.immobilize(true);
        
        // 2. Move Camera to look at the scene
        // Looking at the companion
        if(this.hero && this.companion) this.hero.lookAt(this.companion.position);

        // 4. Enable Combat Support
        gameState.flags['COMPANION_ACTIVE'] = true; 
        this.companionFollowing = false;            
        
        // 5. Dialogue
        this.uiManager.showDialogue({
            text: "INCONNU: A L'AIDE ! ILS VONT ME TRANSFORMER EN PIECES DETACHÉES !!\n\n(Défendez le drone !)",
            options: [{ text: "J'arrive !", action: "START_RESCUE_COMBAT" }]
        });
    }

    handleRescueDialogue() {
        console.log("RESCUE COMBAT ENDED - RECRUITMENT DIALOGUE");
        this.uiManager.showDialogue({
            text: "BD-1: *Biip... Wooo* Merci... Cette unité a failli subir un démontage non autorisé.\n\nJe suis BD-1. Unité d'assistance technique.",
            options: [{ text: "Que fais-tu ici ?", action: "LORE_1" }]
        });
    }

    handleDialogueAction(action) {
        // --- RESCUE EVENT RESPONSE ---
        if(action === 'START_RESCUE_COMBAT') {
            if(this.uiManager.hideDialogue) this.uiManager.hideDialogue();
            if(this.playerController) this.playerController.immobilize(false);
            
            // Start battle ensuring we have a valid target
            const enemy = this.rescueTriggerMob && !this.rescueTriggerMob.isDisposed() 
                ? this.rescueTriggerMob 
                : this.combatSystem.activeEnemies[0];

            if(enemy) {
                this.combatSystem.startBattle(enemy);
            } else {
                console.warn("Rescue Event: No enemy found explicitly, searching scene...");
                // Fallback: Find any enemy in range ??
                const fallback = this.scene.meshes.find(m => m.metadata && m.metadata.type === 'ENEMY' && !m.isDisposed());
                if(fallback) this.combatSystem.startBattle(fallback);
            }
            return;
        }

        // --- COMPANION LORE RESPONSE ---
        if(action.startsWith('LORE_')) {
             if(this.uiManager.hideDialogue) this.uiManager.hideDialogue();
             // Chain dialogues
             if(action === 'LORE_1') {
                 this.uiManager.showDialogue({
                     text: "BD-1: Logique. Ces 'Chats-Chimiques' envahissent les secteurs.\nIls cherchent le Noyau.\n\nJe connais les codes de sécurité. Je peux vous être utile si vous me permettez de vous suivre.",
                     options: [{ text: "D'accord, suis-moi.", action: "LORE_2" }]
                 });
             } else if(action === 'LORE_2') {
                 this.uiManager.showDialogue({
                     text: "BD-1: Protocole 'Compagnon' activé.\nJe couvrirai vos arrières pendant les combats.\n\nEn avant, partenaire !",
                     options: [{ text: "Let's go.", action: "CLOSE" }]
                 });
                 // Enable Following
                 this.companionFollowing = true;
             }
             return;
        }

        // --- PUZZLE & EXIT RESPONSES ---
        if(action === 'PUZZLE_SOLVE') {
             if(this.uiManager.hideDialogue) this.uiManager.hideDialogue();
             
             this.mathSolved = true;
             this.uiManager.updateObjective("OBJECTIF: SURVIVRE A L'EMBUSCADE !");
             this.uiManager.logCombat?.("SEQUENCE VALIDEE. ACCES AUTORISE.", "green");
             
             // 1. OPEN GATE IMMEDIATELY
             const exit = this.scene.getMeshByName("zone2_exit");
             if(exit) {
                 exit.metadata.locked = false; 
                 if(exit.material) {
                     exit.material.emissiveColor = new BABYLON.Color3(0, 1, 0);
                     exit.material.alpha = 0.2; 
                 }
                 if(!this.gateOpen) {
                     this.gateOpen = true;
                     exit.checkCollisions = false; 
                     const gateAnim = new BABYLON.Animation("openGate", "position.y", 30, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
                     gateAnim.setKeys([{frame:0, value:3}, {frame:30, value: 9}]);
                     this.scene.beginDirectAnimation(exit, [gateAnim], 0, 30, false);
                 }
             }

             // 2. SPAWN AMBUSH (6 DRONES) & START COMBAT
             // User Requirement: "Laisse le groupe de 6 mobs lancer le combat"
             const SQUAD_ID = "AMBUSH_SQUAD";
             const center = this.hero.position.clone();
             const radius = 8;
             const count = 6;
             const drones = [];
             
             for(let i=0; i<count; i++) {
                 const angle = (i / count) * Math.PI * 2;
                 const x = center.x + Math.cos(angle) * radius;
                 const z = center.z + Math.sin(angle) * radius;
                 
                 const mob = this.assetFactory.createMob('MOB_CAMERADRONE');
                 mob.position = new BABYLON.Vector3(x, 1.5, z);
                 this.combatSystem.registerEnemy(mob, { ...ENEMIES.MOB_CAMERADRONE, squadId: SQUAD_ID });
                 drones.push(mob);
             }

             // TRIGGER COMBAT IMMEDIATELY
             // this.combatSystem.startBattle(drones[0]); // DISABLED BY USER REQUEST: NO COMBAT AFTER PUZZLE
             console.log("AMBUSH SPAWNED BUT NO COMBAT STARTED.");
        }
        else if(action === 'EXIT_CONFIRM') {
             if(this.uiManager.hideDialogue) this.uiManager.hideDialogue();
             gameState.gainXp(500); // Reward for clearing zone
             // Trigger Scene Change
             document.dispatchEvent(new CustomEvent('request-zone-change', { detail: { zoneId: 'HUB' } }));
        }
        else if(action === 'PUZZLE_FAIL') {
             if(this.uiManager.hideDialogue) this.uiManager.hideDialogue();
             this.uiManager.logCombat?.("ERREUR SEQUENCE. ALERTE SECURITE !", "red");
             
             // Punish: Spawn Drone right behind player
             const punishMob = this.assetFactory.createMob('MOB_CAMERADRONE');
             punishMob.position = new BABYLON.Vector3(28, 1.5, 25); // In puzzle room
             this.combatSystem.registerEnemy(punishMob, {hp:30, damage:5, name:"Drone Gardien", pm:6, xp:15});
             this.combatSystem.startBattle(punishMob);
        }
        else if(action === 'CLOSE') {
             if(this.uiManager.hideDialogue) this.uiManager.hideDialogue();
        }
    }

    setupInput() {
         document.addEventListener('player-move-request', (e) => {
            // FORCE UNLOCK if not explicitly in combat
            if(!this.combatSystem.inCombat && this.playerController) {
                this.playerController.setMoveTarget(e.detail.position);
            }
        });
    }

    spawnMobs() {
        // --- WEST ROOM: CHEM SQUAD ---
        // A pack of Chem Cats guarding the storage
        const chem1 = this.assetFactory.createMob('MOB_CHEM_CAT');
        chem1.position = new BABYLON.Vector3(-25, 0.5, 20);
        this.combatSystem.registerEnemy(chem1, ENEMIES.MOB_CHEM_CAT);
        
        const chem2 = this.assetFactory.createMob('MOB_CHEM_CAT');
        chem2.position = new BABYLON.Vector3(-20, 0.5, 25);
        this.combatSystem.registerEnemy(chem2, ENEMIES.MOB_CHEM_CAT);

        // --- EAST ROOM: WELDER PATROL ---
        // Guarding the puzzle console
        const welder = this.assetFactory.createMob('MOB_WELDER_BOT');
        welder.position = new BABYLON.Vector3(25, 0.5, 20); 
        this.combatSystem.registerEnemy(welder, ENEMIES.MOB_WELDER_BOT);

        // --- PHASE 2 ENEMIES (Corridor & Lab) ---
        // Will spawn after gate opens or statically now?
        // Let's spawn them now but further away.
        
        // Room 3 (Lab) Guards
        const elite = this.assetFactory.createMob('MOB_WELDER_BOT');
        elite.position = new BABYLON.Vector3(0, 0.5, 95);
        elite.metadata.name = "Garde d'Elite";
        this.combatSystem.registerEnemy(elite, {hp: 60, damage: 10, name: "Garde d'Elite", pm: 4, xp: 40}); // Tougher
    }

    handleInteraction(detail) {
        const id = detail.objectId;
        
        // --- COMPANION ---
        if(id === 'COMPANION') {
            if(!this.companionActive) {
                this.companionActive = true;
                this.uiManager.showDialogue({
                    text: "BD-1: *Bip Boop* Analyse... Signature Alliée détectée.\nJe vous accompagnerai, Agent.",
                    options: [{ text: "Bienvenue à bord.", action: "CLOSE" }]
                });
                // XP Bonus
                gameState.gainXp(100);
            } else {
                 this.uiManager.logCombat?.("BD-1: *Happy Beep*", "cyan");
            }
            return;
        }

        // --- FINAL EXIT (Portal) ---
        if(id === 'FINAL_EXIT_Z2') {
             // Check if Boss 2 is dead? For now allowed.
             this.uiManager.showDialogue({
                 text: "Quitter la Zone 2 et retourner au Hub ?",
                 options: [
                     { text: "Oui, mission accomplie.", action: "EXIT_CONFIRM" },
                     { text: "Non.", action: "CLOSE" }
                 ]
             });
             return;
        }
        
        // --- STEP 1: VALVES ---
        if (id === 'VALVE_1' || id === 'VALVE_2') {
             if (!this.valvesState[id]) {
                 this.valvesState[id] = true;
                 
                 // Feedback UI
                 const activeCount = (this.valvesState.VALVE_1 ? 1 : 0) + (this.valvesState.VALVE_2 ? 1 : 0);
                 const name = id === 'VALVE_1' ? "Ouest" : "Est";
                 
                 this.uiManager.updateObjective(`OBJECTIF: Activer les Valves (${activeCount}/2)`);
                 
                 // Dialog feedback as requested
                 this.uiManager.showDialogue({
                     text: `SUCCÈS: Valve de Sécurité ${name} OUVERTE.\n\nÉtat Pression: Stable.\nProgression: (${activeCount}/2)`,
                     options: [{ text: "Bien reçu.", action: "CLOSE" }]
                 });
                 
                 // Visual Feedback: Rotate & Change Color
                 const handle = this.scene.getMeshByName("valveHandle_" + id);
                 if(handle) {
                     // Animation: Rotate
                     const anim = new BABYLON.Animation("spin", "rotation.y", 30, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
                     anim.setKeys([{frame:0, value:0}, {frame:30, value: Math.PI*2}]);
                     this.scene.beginDirectAnimation(handle, [anim], 0, 30, false);
                     
                     // Turn Green
                     if(handle.material) {
                         handle.material.diffuseColor = new BABYLON.Color3(0, 1, 0);
                         handle.material.emissiveColor = new BABYLON.Color3(0, 0.5, 0);
                     }
                 }
                 
                 // Update Light to Green (Note: Light is child of Base)
                 // Need to find it by name since we named it "light_ID"
                 const light = this.scene.getLightByName("light_" + id);
                 if(light) light.diffuse = new BABYLON.Color3(0, 1, 0);

             } else {
                 this.uiManager.logCombat?.("Cette valve est déjà ouverte.", "gray");
             }
        }
        
        // --- STEP 3: INTERMEDIATE GATE (Formerly Exit) ---
        else if (id === 'EXIT_ZONE2') {
             const mesh = this.scene.getMeshByName("zone2_exit");
             if(mesh && !mesh.metadata.locked) {
                 // OPEN THE GATE
                 if(!this.gateOpen) {
                     this.gateOpen = true;
                     mesh.checkCollisions = false; // Allow pass through
                     const anim = new BABYLON.Animation("open", "position.y", 30, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
                     anim.setKeys([{frame:0, value:0}, {frame:30, value: 4}]);
                     this.scene.beginDirectAnimation(mesh, [anim], 0, 30, false);
                     
                     this.uiManager.logCombat?.("Accès Secteur B déverrouillé.", "green");
                 }
             } else {
                 this.uiManager.logCombat?.("Porte Verrouillée. (Résolvez l'énigme de la Console)", "red");
             }
        }

        // --- STEP 2: PUZZLE --- 
        else if (id === 'CONSOLE_PUZZLE') {
            if(!this.mathSolved) {
                const activeCount = (this.valvesState.VALVE_1 ? 1 : 0) + (this.valvesState.VALVE_2 ? 1 : 0);
                
                if(activeCount < 2) {
                    this.uiManager.showDialogue({
                        text: `ALERTE: Pression Hydraulique Insuffisante (${activeCount}/2).\nImpossible d'accéder au noyau.\n\nVeuillez ouvrir les 2 VALVES DE SECURITE situées dans la zone (Stockage Ouest & Maintenance Est).`,
                        options: [{ text: "Je vais chercher.", action: "CLOSE" }]
                    });
                    return;
                }

                // NEW RIDDLE as requested (Harder/Less obvious)
                // "Le sang précède l'océan, qui nourrit la forêt." -> RED, BLUE, GREEN
                this.uiManager.showDialogue({
                    text: "SYSTEME DE SECURITE.\nANALYSE REQUISE...\n\n\"Le premier est la fureur du volcan.\nLe second est le miroir du ciel.\nLe troisième est le berceau de la vie.\"",
                    options: [
                        { text: "Bleu -> Rouge -> Vert", action: "PUZZLE_FAIL" },
                        { text: "Rouge -> Bleu -> Vert", action: "PUZZLE_SOLVE" },
                        { text: "Vert -> Rouge -> Bleu", action: "PUZZLE_FAIL" },
                        { text: "Quitter", action: "CLOSE" }
                    ]
                });
            } else {
                this.uiManager.logCombat?.("Système verrouillé. Accès Zone Nord autorisé.", "green");
            }
        }
    }

    // DUPLICATE METHOD REMOVED


    // REMOVED LEGACY PUZZLE LOGIC (checkColorPuzzle)

    spawnReward(pos) {
        const box = BABYLON.MeshBuilder.CreateBox("loot", {size: 1}, this.scene);
        box.position = pos;
        box.material = new BABYLON.StandardMaterial("gold", this.scene);
        box.material.diffuseColor = new BABYLON.Color3(1, 1, 0);
        
        box.metadata = { type: 'INTERACTABLE', id: 'RETURN_HUB', name: "Caisse de Loot (Retour)" };
        
        // Temp return implementation on loot
        this.interactListenerSecondary = (e) => {
             if(e.detail.objectId === 'RETURN_HUB') {
                 gameState.gainXp(1000);
                 gameState.changeState('HUB');
                 const evt = new CustomEvent('request-zone-change', { detail: { zoneId: 'HUB' }});
                 document.dispatchEvent(evt);
             }
        };
        document.addEventListener('object-interaction', this.interactListenerSecondary);
    }

    update() {
        const dt = this.scene.getEngine().getDeltaTime() / 1000;
        if(this.playerController) this.playerController.update(dt);

        // MANUAL TRIGGER BACKUP (Coordinate based)
        // Gate is around Z=68. Room 3 entry is Z=85. 
        // Trigger if player passes Gate (Z>72) and logic hasn't fired.
        if(this.gateOpen && !this.rescueTriggered && this.hero && this.hero.position.z > 72) {
             console.log("MANUAL BACKUP TRIGGER: ZONE 2 RESCUE");
             this.startRescueEvent();
        }
        
        // Companion Follow Logic
        // Uses companionFollowing flag (set to true only AFTER recruitment)
        if(this.companionFollowing && this.companion && this.hero) {
            const dist = BABYLON.Vector3.Distance(this.companion.position, this.hero.position);
            
            if(dist > 2.5) {
                const dir = this.hero.position.subtract(this.companion.position);
                dir.y = 0; // Keep flying level (partially)
                dir.normalize();
                
                const speed = 6.0 * dt; // Fast catchup
                this.companion.moveWithCollisions(dir.scale(speed));
                
                // Lerp LookAt for smoothness
                // basic for now
                this.companion.lookAt(this.hero.position);
            }
            
            // Keep Companion hovering
            // (Handled by Animation added in AssetFactory)
        }
        
        // Update Camera Follow
        if(this.hero && this.scene.activeCamera) {
            // Smooth LERP
             this.scene.activeCamera.position.x = BABYLON.Scalar.Lerp(this.scene.activeCamera.position.x, this.hero.position.x - 20, 0.05);
             this.scene.activeCamera.position.z = BABYLON.Scalar.Lerp(this.scene.activeCamera.position.z, this.hero.position.z - 20, 0.05);
        }
    }

    exit() {
        if(this.updateObserver) this.scene.onBeforeRenderObservable.remove(this.updateObserver);
        document.removeEventListener('object-interaction', this.interactListener);
        document.removeEventListener('dialogue-action', this.dialogueListener);
        if(this.interactListenerSecondary) document.removeEventListener('object-interaction', this.interactListenerSecondary);
    }
}
