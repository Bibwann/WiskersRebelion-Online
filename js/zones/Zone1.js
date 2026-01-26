import { gameState } from '../GameState.js';
import { PlayerController } from '../characters/PlayerController.js';
import { VFXSystem } from '../vfx/VFXSystem.js';
import { CombatSystem } from '../CombatSystem.js';
import { TriggerSystem } from '../TriggerSystem.js';
import { Dialogues } from '../data/QuestData.js'; // Import Dialogues

export class Zone1 {
    constructor(scene, assetFactory, uiManager) {
        this.scene = scene;
        this.assetFactory = assetFactory;
        this.uiManager = uiManager;
        this.vfx = new VFXSystem(scene);
        this.hero = null;
        this.playerController = null;
        this.combatSystem = null;
        this.triggerSystem = null;
        
        // Puzzle State
        this.valves = [];
        this.gate = null;
        this.activatedValves = 0;
        
        // Interactables
        this.interactables = [];
        this.bossCameraMode = false; // Initialize explicitly
        
        // MOVEMENT LISTENER (CRITICAL FIX)
        // Ensure this listener is bound so input manager can drive the character
        this.moveListener = (e) => {
            if (this.combatSystem && this.combatSystem.inCombat) return; // BLOCK standard movement in combat

            if (this.playerController) {
                this.playerController.setMoveTarget(e.detail.position);
                this.vfx.createClickEffect(e.detail.position);
            }
        };
        document.addEventListener('player-move-request', this.moveListener);
    }

    enter() {
        console.log("Entering Zone 1: The Catacombs...");
        
        // Update Objective
        if(this.uiManager) this.uiManager.updateObjective('ZONE1_ENTER');

        // --- UI VISIBILITY FIX ---
        // Force Exploration HUD
        setTimeout(() => {
            const screens = document.querySelectorAll('.screen');
            screens.forEach(s => s.classList.add('hidden'));
            screens.forEach(s => s.classList.remove('active'));
            const hud = document.getElementById('hud-exploration');
            if(hud) {
                hud.classList.remove('hidden');
                hud.classList.add('active');
            }
        }, 100);

        this.assetFactory.clearEnvironment(); 
        this.assetFactory.createEnvironmentZone1();
        
        // Force HUD State
        if (typeof document !== 'undefined') {
             // Ensure HUD is visible manually if state change didn't trigger
             const hud = document.getElementById('hud-exploration');
             if(hud) {
                 hud.classList.remove('hidden');
                 hud.classList.add('active');
                 // Trigger UI Update for proper bars
                 document.dispatchEvent(new CustomEvent('player-stats-update'));
             }
        }

        // Spawn Hero at Start
        const playerClass = (gameState.playerData && gameState.playerData.classId) ? gameState.playerData.classId : 'FERRAILLEUR';
        this.hero = this.assetFactory.createHero(playerClass);
        this.hero.position = new BABYLON.Vector3(0, 0.5, -45); // Start at very bottom

        // Systems Init
        this.combatSystem = new CombatSystem(this.scene, this.uiManager); 
        this.triggerSystem = new TriggerSystem(this.scene);
        this.combatSystem.registerPlayer(this.hero);
        this.triggerSystem.registerPlayer(this.hero);
        this.playerController = new PlayerController(this.scene, this.hero);
        
        // Setup Inputs
        this.setupInputs();

        // CONTENT
        this.spawnMobs();
        this.setupBossListeners(); // INIT LISTENERS
        this.setupPuzzle();
        this.setupLore();
        this.setupMajorCombat();

        // FORCE CAMERA RE-CREATION (ORTHOGRAPHIC TO MATCH HUB)
        // User reported "Tiny Map" issues with Perspective camera. 
        // We switch to Orthographic (Fixed Scale) like the HubZone.
        if (this.scene.activeCamera) this.scene.activeCamera.dispose();
        
        // Isometric Angle: High up, offset X/Z
        const offset = new BABYLON.Vector3(-12, 12, -12); 
        const camera = new BABYLON.FreeCamera("ZoneCamera", this.hero.position.add(offset), this.scene);
        camera.setTarget(this.hero.position);
        
        // ORTHOGRAPHIC SETUP (Fixed Size View)
        camera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
        const zoom = 10; // Controls "Zoom" level (Higher = Zoom Out, Lower = Zoom In)
        camera.orthoTop = zoom;
        camera.orthoBottom = -zoom;
        camera.orthoLeft = -zoom * 1.5; // Aspect Ratio fix (wider screen)
        camera.orthoRight = zoom * 1.5;
        
        this.scene.activeCamera = camera;
        this.cameraOffset = offset;
        
        // Register Update
        this._updateLoop = this.update.bind(this);
        this.scene.onBeforeRenderObservable.add(this._updateLoop);
    }

    setupInputs() {
        this.scene.actionManager = new BABYLON.ActionManager(this.scene);
        
        // Attack (Space)
        this.scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
            { trigger: BABYLON.ActionManager.OnKeyDownTrigger, parameter: ' ' },
            () => this.playerController.attack()
        ));

        // Interact (E) - DEBOUNCED
        this.inputCooldown = false;
        const triggerInteraction = () => {
            if(this.inputCooldown) return;
            this.inputCooldown = true;
            this.handleInteraction();
            setTimeout(() => this.inputCooldown = false, 500); // 500ms debounce
        };

        this.scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
            { trigger: BABYLON.ActionManager.OnKeyDownTrigger, parameter: 'e' },
            () => triggerInteraction()
        ));
        
        // Remove Duplicate Document Listener which caused double inputs
        // Key inputs are now handled solely by ActionManager

    }

    setupPuzzle() {
        // --- THE ELEVATOR OF EUROPA ---
        
        // 1. The Elevator Platform (Now flat on ground)
        this.elevator = BABYLON.MeshBuilder.CreateGround("Elevator", {width: 8, height: 8}, this.scene);
        this.elevator.position = new BABYLON.Vector3(0, 0.1, 95); 
        const mat = this.assetFactory.metalMat;
        this.elevator.material = mat;
        this.elevator.metadata = { type: 'GROUND', name: 'Elevator' }; // Walkable
        
        // Visual Railings
        const rail = BABYLON.MeshBuilder.CreateBox("rail", {width: 8, height: 1, depth: 0.2}, this.scene);
        rail.position.z = 4; rail.position.y = 0.5; rail.parent = this.elevator;
        
        // Interaction
        this.interactables.push({
            mesh: this.elevator,
            range: 6,
            label: "Monter au Sommet",
            action: () => {
                const dist = BABYLON.Vector3.Distance(this.hero.position, this.elevator.position);
                if(dist > 5) {
                    this.showFloatingText(this.elevator.position, "Montez sur la plateforme !", "orange");
                    return;
                }
                
                if (this.puzzleSolved) {
                     this.activateElevator();
                } else {
                     this.uiManager.showDialogue({detail: Dialogues['ELEVATOR_LOCKED']});
                }
            }
        });

        // The Three Statues (Consoles) - EUROPE THEME

        this.puzzleState = [];
        this.puzzleSolved = false;
        
        // Puzzle: CIEL (Bleu) -> ETOILES (Jaune) -> COURAGE (Rouge)
        
        const createConsole = (colorName, colorHex, pos, id) => {
            // Use distinct shapes? For now just color pillars but with better names
            const pillar = BABYLON.MeshBuilder.CreateCylinder("p_"+id, {height: 2.5, diameter: 1.5, tessellation: 16}, this.scene);
            pillar.position = pos;
            const pm = new BABYLON.StandardMaterial("pm_"+id, this.scene);
            pm.diffuseColor = BABYLON.Color3.FromHexString(colorHex);
            pm.emissiveColor = BABYLON.Color3.FromHexString(colorHex).scale(0.3); // Glow slightly
            pillar.material = pm;
            
            this.interactables.push({
                mesh: pillar,
                range: 4,
                label: `Activer ${colorName}`,
                action: () => this.handlePuzzleInput(id, pillar)
            });
            
            // Add light
            const light = new BABYLON.PointLight("l_"+id, pos.add(new BABYLON.Vector3(0,2,0)), this.scene);
            light.diffuse = BABYLON.Color3.FromHexString(colorHex);
            light.intensity = 0.5;
            light.range = 5;
        };

        // Positions arranged in a wider arc properly visible
        createConsole("Stèle du CIEL (Bleu)", "#0000FF", new BABYLON.Vector3(-12, 1.25, 80), 'BLUE');
        createConsole("Stèle des ÉTOILES (Jaune)", "#FFFF00", new BABYLON.Vector3(0, 1.25, 90), 'YELLOW');
        createConsole("Stèle du COURAGE (Rouge)", "#FF0000", new BABYLON.Vector3(12, 1.25, 80), 'RED');

        // VISUAL CLUE: LIGHTS ABOVE ELEVATOR
        // Explicitly shows the pattern [BLUE, YELLOW, RED]
        const clueBar = BABYLON.MeshBuilder.CreateBox("clueBar", {width: 4, height: 0.5, depth: 0.5}, this.scene);
        clueBar.position = new BABYLON.Vector3(0, 4, 99); // Above Gate
        clueBar.material = this.assetFactory.metalMat;
        
        const createLight = (color, xOffset) => {
             const bulb = BABYLON.MeshBuilder.CreateSphere("clue_"+xOffset, {diameter: 0.6}, this.scene);
             bulb.position = new BABYLON.Vector3(xOffset, 4, 98.5);
             const mat = new BABYLON.StandardMaterial("clueMat_"+xOffset, this.scene);
             mat.emissiveColor = color;
             mat.disableLighting = true; // Always bright
             bulb.material = mat;
             
             // Pulsing brightness
             const anim = new BABYLON.Animation("pulse", "material.alpha", 60, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);
             anim.setKeys([{frame: 0, value: 0.5}, {frame: 30, value: 1.0}, {frame: 60, value: 0.5}]);
             this.scene.beginDirectAnimation(bulb, [anim], 0, 60, true);
        };
        
        createLight(new BABYLON.Color3(0, 0, 1), -1.2); // BLUE (1)
        createLight(new BABYLON.Color3(1, 1, 0), 0);    // YELLOW (2)
        createLight(new BABYLON.Color3(1, 0, 0), 1.2);  // RED (3)
    }

    showFloatingText(position, text, color = "white") {
        const plane = BABYLON.MeshBuilder.CreatePlane("txt", {width: 3, height: 1.5}, this.scene);
        plane.position = position.clone().add(new BABYLON.Vector3(0, 2, 0));
        plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
        
        const dt = new BABYLON.DynamicTexture("dt", {width:256, height:128}, this.scene, true);
        const ctx = dt.getContext();
        // Transparent BG
        ctx.clearRect(0,0,256,128);
        
        ctx.fillStyle = color;
        ctx.font = "bold 40px monospace";
        const textWidth = ctx.measureText(text).width;
        ctx.fillText(text, 128 - (textWidth/2), 80);
        dt.update();
        
        const mat = new BABYLON.StandardMaterial("txtMat", this.scene);
        mat.diffuseTexture = dt;
        mat.emissiveColor = BABYLON.Color3.White();
        mat.specularColor = BABYLON.Color3.Black();
        mat.backFaceCulling = false;
        mat.diffuseTexture.hasAlpha = true;
        mat.useAlphaFromDiffuseTexture = true;
        
        plane.material = mat;
        
        // Float Up Anim
        const anim = new BABYLON.Animation("float", "position.y", 30, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
        anim.setKeys([{frame:0, value: plane.position.y}, {frame: 45, value: plane.position.y + 3}]);
        
        this.scene.beginDirectAnimation(plane, [anim], 0, 45, false, 1, () => {
            plane.dispose();
        });
    }

    handlePuzzleInput(colorId, mesh) {
        if(this.puzzleSolved) return;
        
        console.log(`PUZZLE INPUT: ${colorId}`); // DEBUG LOG
        this.puzzleState.push(colorId);
        this.showFloatingText(mesh.position, "ACTIVÉ !", "white");
        
        // Sequence: BLUE -> YELLOW -> RED
        const target = ['BLUE', 'YELLOW', 'RED'];
        
        // Check consistency so far
        let correctSoFar = true;
        for(let i=0; i<this.puzzleState.length; i++) {
            if(this.puzzleState[i] !== target[i]) correctSoFar = false;
        }

        if(!correctSoFar) {
            console.log("PUZZLE RESET - WRONG ORDER"); // DEBUG LOG
            this.showFloatingText(this.hero.position, "MAUVAISE SÉQUENCE ! RESET !", "red");
            // Screen shake or sound effect here would be cool
            this.vfx.createExplosion(this.hero.position); // Punishment VFX
            this.puzzleState = []; // Reset
            return;
        }

        if(this.puzzleState.length === 3) {
            console.log("PUZZLE SOLVED!"); // DEBUG LOG
            this.puzzleSolved = true;
            this.showFloatingText(this.elevator.position, "ACCÈS AUTORISÉ - MONTEZ SUR LA PLATEFORME", "lime");
            // Highlight Elevator
            this.vfx.createWarpEffect(this.elevator.position, new BABYLON.Color3(0, 1, 0));
        }
    }

    activateElevator() {
        console.log("ELEVATOR ACTIVATION TRIGGERED");
        // Update user feedback
        this.showFloatingText(this.elevator.position, "CHARGEMENT SALLE DU TRÔNE...", "magenta");
        
        // Lock Player
        if(this.playerController) this.playerController.immobilize(true);
        
        // Visual FX
        this.vfx.createWarpEffect(this.hero.position, new BABYLON.Color3(1, 0, 1)); // Purple Warp
        
        // Force event with a slight timeout to ensure VFX start
        setTimeout(() => {
             console.log("ZONE1: Dispatching BOSS_ZONE request...");
             const evt = new CustomEvent('request-zone-change', { detail: { zoneId: 'BOSS_ZONE' } });
             document.dispatchEvent(evt);
        }, 1000); 
    }

    setupBossListeners() {
        document.addEventListener('tigger-boss-marquis', () => {
             // 1. DISABLE FOG
             this.scene.fogEnabled = false;

             // 2. Position Hero
             const safePos = new BABYLON.Vector3(0, 21, 480);
             if(this.hero) {
                 this.hero.position = safePos;
                 this.hero.rotation = new BABYLON.Vector3(0, 0, 0); 
             }
             
             console.log("TELEPORTING HERO TO BOSS ARENA: ", safePos);
             
             // 3. CREATE DEDICATED CINEMATIC CAMERA
             // Remove controls from old camera
             if(this.scene.activeCamera) {
                 this.scene.activeCamera.detachControl();
                 // We DON'T dispose immediately to avoid flicker, we switch first
             }
             
             const bossCam = new BABYLON.FreeCamera("BossCam", new BABYLON.Vector3(0, 28, 470), this.scene);
             bossCam.setTarget(new BABYLON.Vector3(0, 22, 500)); // Look at Boss 
             bossCam.minZ = 0.5;
             bossCam.maxZ = 3000;
             bossCam.fov = 1.0; 
             
             this.scene.activeCamera = bossCam;
             this.bossCameraMode = true; 
             
             // 4. Init Boss
             this.initBossFight();
        });

        document.addEventListener('start-marquis-combat', () => {
             if(this.bossRef) {
                 this.combatSystem.startBattle(this.bossRef);
             }
        });
    }

    initBossFight() {
        // Create Marquis
        const boss = this.assetFactory.createMob('MARQUIS'); // Special Mesh from factory
        if(boss) {
            boss.position = new BABYLON.Vector3(0, 21.0, 500); // Updated Z coordinate
            boss.scaling = new BABYLON.Vector3(2, 2, 2);
            
            // Stats from GameData
            const stats = { hp: 500, dmg: 25, pm: 6, xp: 500, name: "Marquis de Botté" };
            this.combatSystem.registerEnemy(boss, stats);
            this.bossRef = boss;
        } else {
            console.error("FAILED TO CREATE BOSS MESH");
        }

        // Intro Dialog
        this.uiManager.showDialogue({ detail: Dialogues['MARQUIS_INTRO'] });
        
        // Music Change?
    }


    setupLore() {
        // Logic constraint moved to HUB (Cannot enter Zone 1 without INTRO_DONE)
        // Previous Blocker Logic Removed to prevent frustration.
    }

    setupMajorCombat() {
        // The Guardian of the Gate
        const guardian = this.assetFactory.createMob('CAT'); 
        guardian.scaling = new BABYLON.Vector3(1.5, 1.5, 1.5);
        guardian.position = new BABYLON.Vector3(0, 0.5, 120); // Room 3
        guardian.metadata.name = "Garde du Marquis";
        this.combatSystem.registerEnemy(guardian, { hp: 200, dmg: 20, aggroRange: 15 });
    }

    handleInteraction() {
        if(!this.hero) return;
        
        let found = false;
        this.interactables.forEach(item => {
            const dist = BABYLON.Vector3.Distance(this.hero.position, item.mesh.position);
            if(dist <= item.range) {
                item.action();
                found = true;
            }
        });

        if(!found) {
             console.log("Nothing to interact with.");
        }
    }

    displayDialogue(speaker, text) {
        if(this.uiManager) {
            this.uiManager.showDialogue({
                detail: {
                    speaker: speaker,
                    text: text,
                    options: [{ text: "Fermer", action: 'CLOSE' }]
                }
            });
        }
    }


    /* showFloatingText removed here to use the one defined earlier in the class */


    spawnMobs() {
        // --- SQUAD 1: THE WELCOMING COMMITTEE (Start) ---
        const squad1_Id = "SQUAD_START";
        const squad1_Pos = new BABYLON.Vector3(0, 0.5, 20);
        
        // 1 Tank + 2 Scouts
        this.createMobInSquad(squad1_Id, squad1_Pos.add(new BABYLON.Vector3(0,0,0)), 'TANK');
        this.createMobInSquad(squad1_Id, squad1_Pos.add(new BABYLON.Vector3(-3,0,-2)), 'SCOUT');
        this.createMobInSquad(squad1_Id, squad1_Pos.add(new BABYLON.Vector3(3,0,-2)), 'SCOUT');

        // --- SQUAD 2: THE AMBUSH (Middle) ---
        const squad2_Id = "SQUAD_MID";
        const squad2_Pos = new BABYLON.Vector3(0, 0.5, 45);
        this.createMobInSquad(squad2_Id, squad2_Pos.add(new BABYLON.Vector3(-2,0,0)), 'ELITE');
        this.createMobInSquad(squad2_Id, squad2_Pos.add(new BABYLON.Vector3(2,0,0)), 'SCOUT');

        // --- SQUAD 3: THE GATEKEEPERS (Puzzle Room) ---
        const squad3_Id = "SQUAD_GATE";
        const squad3_Pos = new BABYLON.Vector3(0, 0.5, 70); // Before the Gate
        
        // 1 Robot + 2 Elites
        this.createMobInSquad(squad3_Id, squad3_Pos.add(new BABYLON.Vector3(0,0,0)), 'ROBOT');
        this.createMobInSquad(squad3_Id, squad3_Pos.add(new BABYLON.Vector3(-5,0,2)), 'ELITE');
        this.createMobInSquad(squad3_Id, squad3_Pos.add(new BABYLON.Vector3(5,0,2)), 'ELITE');
    }

    createMobInSquad(squadId, pos, type) {
        let mobType = 'CAT';
        if (type === 'ROBOT') mobType = 'ROBOT';
        
        const mob = this.assetFactory.createMob(mobType);
        mob.position = pos;
        
        let stats = {};
        if (type === 'TANK') {
            mob.scaling.scaleInPlace(1.3);
            mob.metadata.name = "Gros Matou";
            stats = { hp: 120, dmg: 10, pm: 3, aggroRange: 10, xp: 40 };
        } else if (type === 'SCOUT') {
            mob.metadata.name = "Traqueur";
            stats = { hp: 60, dmg: 15, pm: 5, aggroRange: 10, xp: 25 };
        } else if (type === 'ELITE') {
            mob.scaling.scaleInPlace(1.1);
            mob.metadata.name = "Soldat Marquis";
            stats = { hp: 90, dmg: 18, pm: 4, aggroRange: 12, xp: 45 };
        } else if (type === 'ROBOT') {
            mob.metadata.name = "Sentinelle M-2";
            if(mob.material) mob.material.diffuseColor = new BABYLON.Color3(0.4, 0.4, 0.9);
            stats = { hp: 150, dmg: 14, pm: 3, aggroRange: 12, xp: 60 };
        }

        this.combatSystem.registerEnemy(mob, stats);
        // ASSIGN SQUAD ID
        if(mob.metadata.combat) {
            mob.metadata.combat.squadId = squadId;
        }
    }

    exit() {
        this.scene.onBeforeRenderObservable.removeCallback(this._updateLoop);
        if(this.triggerSystem) this.triggerSystem.dispose();
        
        // Remove listener to prevent duplicates or errors in other zones
        if(this.moveListener) {
            document.removeEventListener('player-move-request', this.moveListener);
        }
    }

    update() {
        const deltaTime = this.scene.getEngine().getDeltaTime() / 1000;
        
        // --- BOSS CAMERA ENFORCEMENT ---
        if(this.bossCameraMode) {
             // Force active camera to be BossCam
             // Even if something resets it, we force it back
             const cam = this.scene.getCameraByName("BossCam");
             if(cam) {
                 this.scene.activeCamera = cam;
                 // Hard Lock Position
                 cam.position.set(0, 28, 470);
                 cam.setTarget(new BABYLON.Vector3(0, 22, 500));
             }
             
             if(this.combatSystem) this.combatSystem.update(deltaTime);
             // CRITICAL: Ensure we return to stop other camera code running
             return; 
        }

        // Block Movement if in Combat

        // Block Movement if in Combat
        if(this.playerController && !this.combatSystem.inCombat && !this.scene.userPaused) {
            this.playerController.update(deltaTime);
        }

        if(this.combatSystem) this.combatSystem.update(deltaTime);
        if(this.triggerSystem) this.triggerSystem.update();
        
        // Update Radar (HUD)
        if(this.uiManager && this.hero && this.combatSystem) {
             this.uiManager.updateRadar(this.hero, this.combatSystem.enemies);
        }

        // ENEMY AI (Chase) - DISABLE IN COMBAT (Combat System handles turns)
        if(this.combatSystem && this.hero && !this.combatSystem.inCombat) {
            this.combatSystem.enemies.forEach(mob => {
                 // CRITICAL FIX: Safe Check for Metadata before accessing 'combat'
                 if(!mob || !mob.metadata || !mob.metadata.combat || mob.metadata.combat.isDead) return;

                 const dist = BABYLON.Vector3.Distance(mob.position, this.hero.position);
                 // Aggro Range check (default 10)
                 const aggro = mob.metadata.combat.aggroRange || 10;
                 if(dist < aggro && dist > 1.2) {
                     // Move towards
                     const dir = this.hero.position.subtract(mob.position).normalize();
                     mob.position.addInPlace(dir.scale(deltaTime * 2.0)); // Speed 2.0
                     // Simple rotation
                     mob.lookAt(this.hero.position);
                 }
            });
        }

        // Interaction Hint
        if (this.hero && this.interactables) {
            let found = false;
            for(let item of this.interactables) {
                if (item.mesh.metadata && item.mesh.metadata.active) continue;
                if (BABYLON.Vector3.Distance(this.hero.position, item.mesh.position) < item.range) {
                     found = true;
                     const prompt = document.getElementById('interaction-prompt');
                     if(prompt) {
                         prompt.classList.remove('hidden');
                         prompt.innerText = `[E] ${item.label || "INTERAGIR"}`;
                     }
                     break; // Only show one
                }
            }
            if(!found) {
                const prompt = document.getElementById('interaction-prompt');
                if(prompt) prompt.classList.add('hidden');
            }
        }

        // BOSS CAMERA MODE: PERSPECTIVE & TRACKING (Handled above)
        /* if(this.bossCameraMode) { return; } */

        // Camera Follow - LOCKED to Hero (ORTHO STYLE)
        if(this.hero && this.scene.activeCamera) {
             const cam = this.scene.activeCamera;
             
             // Desired Position (Hero + Isometric Offset)
             const targetPos = this.hero.position.add(this.cameraOffset || new BABYLON.Vector3(-12, 12, -12));
             
             // Smooth Lerp
             cam.position.x = BABYLON.Scalar.Lerp(cam.position.x, targetPos.x, 0.1);
             cam.position.y = BABYLON.Scalar.Lerp(cam.position.y, targetPos.y, 0.1);
             cam.position.z = BABYLON.Scalar.Lerp(cam.position.z, targetPos.z, 0.1);
        }
    }
}
