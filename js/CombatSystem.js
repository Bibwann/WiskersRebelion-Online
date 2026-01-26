// js/CombatSystem.js
import { LootSystem } from './LootSystem.js';
import { gameState, GameStates } from './GameState.js';
import { CLASSES, ENEMY_TYPES } from './GameData.js';
import { VFXSystem } from './vfx/VFXSystem.js';

export class CombatSystem {
    constructor(scene, uiManager) {
        this.scene = scene;
        this.uiManager = uiManager;
        this.enemies = []; 
        this.playerRef = null;
        this.vfx = new VFXSystem(scene); // Initialize VFX
        this.lootSystem = new LootSystem(scene);
        this.inCombat = false;
        this.currentEnemy = null;
        this.turnState = 'PLAYER_IDLE'; // 'PLAYER_IDLE', 'ANIMATING', 'ENEMY_TURN', 'PLAYER_MOVING', 'PLAYER_TARGETING'
        
        this.selectedSpell = null;
        this.rangeIndicator = null;

        // Turn Stats
        this.playerAp = 0;
        this.playerPm = 0;
        this.maxAp = 6;
        this.maxPm = 3;
        
        this.spellCooldowns = {}; // New: Track cooldowns

        // Listener
        this.scene.onBeforeRenderObservable.add(() => this.update(this.scene.getEngine().getDeltaTime() / 1000));
        
        // Listen for Turn-Based Actions
        document.addEventListener('combat-action', (e) => this.handleTurnAction(e.detail));

        // Interaction Listener (Pointer) via Observable
        this.scene.onPointerObservable.add((pointerInfo) => {
            if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERDOWN) {
                if(!this.inCombat || !pointerInfo.pickInfo.hit) return;

                const pickResult = pointerInfo.pickInfo;
                const mesh = pickResult.pickedMesh;
                const metadata = mesh.metadata || {};

                if (this.turnState === 'PLAYER_MOVING') {
                    // Check if ground - Robust check using Metadata alongside Name
                    if((metadata && metadata.type === 'GROUND') || mesh.name.includes("ground") || mesh.name.includes("Floor")) {
                         this.executeMove(pickResult.pickedPoint);
                    } else {
                        this.log("Cliquez sur le SOL pour bouger.", "orange");
                    }
                }
                if (this.turnState === 'PLAYER_TARGETING') {
                    // 1. Handle AOE Ranged (Ground Click)
                    if(this.selectedParams && this.selectedParams.type === 'AOE_RANGED') {
                        const ptr = pointerInfo.pickInfo.pickedPoint;
                        if(ptr) {
                             this.handleSpellCast(this.selectedSpell, ptr);
                        }
                        return;
                    }

                    // 2. Handle Unit Targeting
                    let currentMesh = mesh;
                    
                    // TRAVERSE UP to find root enemy
                    let target = null;
                    
                    // Check self
                    if (currentMesh === this.playerRef) target = this.playerRef;
                    else {
                        // Check enemies
                        while(currentMesh && !target) {
                            if(this.activeEnemies.includes(currentMesh)) {
                                target = currentMesh;
                            } else {
                                currentMesh = currentMesh.parent;
                            }
                        }
                    }

                    if (target) {
                        this.handleSpellCast(this.selectedSpell, target);
                    } else {
                        this.log("Cible invalide.", "orange");
                    }
                }
            }
        });
    }

    registerPlayer(playerMesh) {
        this.playerRef = playerMesh;
        // Ensure player metadata exists and has combat container
        if(this.playerRef) {
             this.playerRef.metadata = this.playerRef.metadata || {};
             // We don't overwrite gameState stats, but we ensure 'combat' obj references them if needed or just exists to prevent crash
             this.playerRef.metadata.combat = this.playerRef.metadata.combat || {};
             // Sync HP just in case (Visual only, logic uses gameState)
             this.playerRef.metadata.combat.hp = gameState.playerData.hp;
        }
    }

    registerEnemy(enemyMesh, stats) {
        enemyMesh.metadata = enemyMesh.metadata || {};
        enemyMesh.metadata.combat = {
            hp: stats.hp || 20,
            maxHp: stats.hp || 20,
            damage: stats.dmg || 5, // Accepts 'dmg' or 'damage' via spread below if passed
            pm: stats.pm || 3, 
            attackCooldown: 0,
            isDead: false,
            xpValue: stats.xp || 10,
            name: stats.name || "Ennemi",
            ...stats // SPREAD ALL OTHER PROPS (like ultCooldown, turnCounter, etc.)
        };
        // Ensure damage normalisation if mixed keys used
        if(stats.damage) enemyMesh.metadata.combat.damage = stats.damage;

        this.enemies.push(enemyMesh);
    }

    createRangeIndicator(radius, color) {
        if(this.rangeIndicator) this.rangeIndicator.dispose();
        
        // Create a Disc on ground
        this.rangeIndicator = BABYLON.MeshBuilder.CreateDisc("rangeCircle", {radius: radius, tessellation: 64}, this.scene);
        this.rangeIndicator.rotation.x = Math.PI / 2;
        this.rangeIndicator.position = this.playerRef.position.clone().add(new BABYLON.Vector3(0, 0.1, 0));
        
        const mat = new BABYLON.StandardMaterial("rangeMat", this.scene);
        mat.diffuseColor = color;
        mat.alpha = 0.3;
        mat.emissiveColor = color;
        mat.disableLighting = true;
        this.rangeIndicator.material = mat;
        this.rangeIndicator.isPickable = false; 
    }

    clearRangeIndicator() {
        if(this.rangeIndicator) {
            this.rangeIndicator.dispose();
            this.rangeIndicator = null;
        }
    }

    startBattle(triggerEnemy) {
        if(this.inCombat) return;

        console.log("Starting Tactical Battle w/ Horde Logic!");
        this.inCombat = true;
        this.activeEnemies = [];

        // 1. Gather mobs: Radius from LEADER (Trigger Enemy) to form Squads
        const BATTLE_RADIUS = 30; // 30m range for reinforcements
        const triggerSquadId = (triggerEnemy.metadata.combat && triggerEnemy.metadata.combat.squadId) ? triggerEnemy.metadata.combat.squadId : null;

        this.enemies.forEach(e => {
            // FIX CRASH: Safe Access
            if (!e || e.isDisposed() || !e.metadata || !e.metadata.combat || e.metadata.combat.isDead) return;
            
            // Logic Change: Check distance to TRIGGER MOB, not Player. 
            // This allows pulling a pack that is further away from player but close to the aggro'd mob.
            const dist = BABYLON.Vector3.Distance(e.position, triggerEnemy.position);
            const isSquadMate = (triggerSquadId !== null && e.metadata.combat.squadId === triggerSquadId);

            if(dist <= BATTLE_RADIUS || isSquadMate) {
                // Check if already in active list (duplicates prevention)
                if(!this.activeEnemies.includes(e)) {
                    this.activeEnemies.push(e);
                    
                    // Visual Indicator - Optimized
                    if(e.material && e.material.emissiveColor) {
                         e.metadata.originalEmissive = e.material.emissiveColor.clone();
                         e.material.emissiveColor = new BABYLON.Color3(1, 0, 0); // Red Tint
                    }
                    e.lookAt(this.playerRef.position);
                }
            }
        });

        // Ensure Trigger Enemy is definitely in
        if(!this.activeEnemies.includes(triggerEnemy) && !triggerEnemy.isDisposed()) {
            this.activeEnemies.push(triggerEnemy);
        }
        
        console.log(`BATTLE START: ${this.activeEnemies.length} enemies engaged.`);
        this.activeEnemies.forEach(e => this.log(`${e.metadata.combat.name} rejoint le combat !`, "red"));
        
        this.currentEnemy = this.activeEnemies[0]; 
        
        // 2. Initialize Player Turn Stats
        const classData = CLASSES[gameState.playerData.classId] || CLASSES.FERRAILLEUR;
        this.maxAp = classData.stats.maxAp;
        this.maxPm = classData.stats.maxPm;
        
        // XP System: Add basic level scaling
        const levelBonus = (gameState.playerData.level || 1) - 1;
        
        this.startPlayerTurn();

        // 3. UI Setup
        gameState.changeState(GameStates.COMBAT);
        this.uiManager.generateCombatButtons(gameState.playerData.classId || 'FERRAILLEUR');
        if(document.getElementById('combat-log')) document.getElementById('combat-log').innerHTML = `<p>COMBAT ENGAGÉ !</p>`;
    }
    
    startPlayerTurn() {
        if(!this.inCombat) return;

        // --- COMPANION ACTION (START OF PLAYER TURN) ---
        // If ally is active, they attack a random enemy for free damage
        if (gameState.flags && gameState.flags['COMPANION_ACTIVE']) {
            this.handleCompanionSupportAction();
        }

        // Check Stun
        if (gameState.playerData.stunned && gameState.playerData.stunned > 0) {
             gameState.playerData.stunned--;
             this.log(`VOUS ÊTES ÉTOURDI ! (${gameState.playerData.stunned + 1} tours restants)`, "magenta");
             // Reset AP/PM just for display (or set to 0?)
             this.playerAp = 0;
             this.playerPm = 0;
             this.updateUI();
             
             setTimeout(() => this.startEnemyTurnSequence(), 2000);
             return;
        }

        this.turnState = 'PLAYER_IDLE';
        
        // Reset AP/PM
        this.playerAp = this.maxAp;
        this.playerPm = this.maxPm;
        
        // Decrement Cooldowns
        for(let sid in this.spellCooldowns) {
            if(this.spellCooldowns[sid] > 0) this.spellCooldowns[sid]--;
        }

        this.updateUI();
        this.log("C'est votre tour.");
    }

    handleCompanionSupportAction() {
        if(this.activeEnemies.length === 0) return;
        
        // Pick random target
        const target = this.activeEnemies[Math.floor(Math.random() * this.activeEnemies.length)];
        if(!target || target.isDisposed()) return;
        
        // Find Companion Mesh for Visuals (if exists)
        const companion = this.scene.getMeshByName("companion_body");
        const source = companion ? companion.position : this.playerRef.position.add(new BABYLON.Vector3(0, 2, 0));
        
        this.log("BD-1: Tir de soutien !", "cyan");
        
        // Visual Laser
        const ray = BABYLON.MeshBuilder.CreateLines("laser", {
            points: [source, target.position],
            updatable: true
        }, this.scene);
        ray.color = new BABYLON.Color3(0, 1, 1);
        
        setTimeout(() => ray.dispose(), 300);
        
        // Damage
        this.applyDamage(target, 15, "ELECTRIC");
    }

    updateUI() {
        // Update UI Manager
        const classData = CLASSES[gameState.playerData.classId] || CLASSES.FERRAILLEUR;
        // Fix for "Cannot read propertes of null" crash if stat lookup fails
        
        if (!classData || !classData.stats) return;

        this.uiManager.updateCombatStats(
            gameState.playerData.hp, classData.stats.hp,
            this.playerAp, this.maxAp,
            this.playerPm, this.maxPm
        );
        
        // Toggle Cancel Button
        const btnCancel = document.getElementById('btn-cancel-action');
        if(btnCancel) {
            if (this.turnState === 'PLAYER_TARGETING' || this.turnState === 'PLAYER_MOVING') btnCancel.classList.remove('hidden');
            else btnCancel.classList.add('hidden');
        }
    }

    handleTurnAction(detail) {
        if(!this.inCombat) return;
        const { action, spellId } = detail;

        if(this.turnState === 'ENEMY_TURN' || this.turnState === 'ANIMATING') return;

        // Cleanup dead enemies SAFELY
        this.activeEnemies = this.activeEnemies.filter(e => e && !e.isDisposed() && e.metadata && e.metadata.combat && !e.metadata.combat.isDead);
        
        if(this.activeEnemies.length === 0) { this.endBattle(); return; }
        
        if (action === 'SKIP_TURN') {
            this.clearRangeIndicator();
            this.startEnemyTurnSequence();
            return;
        }

        if (action === 'CANCEL_ACTION') {
            this.turnState = 'PLAYER_IDLE';
            this.selectedSpell = null;
            this.clearRangeIndicator();
            this.log("Action annulée.");
            this.updateUI();
            return;
        }

        if (action === 'MOVE_MODE') {
            if(this.playerPm <= 0) {
                this.log("Pas assez de PM !", "orange");
                return;
            }
            this.turnState = 'PLAYER_MOVING';
            this.log("Sélectionnez une destination (Cercle Vert).");
            
            // Show Move Radius
            this.createRangeIndicator(this.playerPm, new BABYLON.Color3(0, 1, 0)); // Green
            this.updateUI();
            return;
        }

        if (action === 'SELECT_SPELL') {
            const classData = CLASSES[gameState.playerData.classId] || CLASSES.FERRAILLEUR;
            const spell = classData.spells.find(s => s.id === spellId);
            
            if(!spell) return;
            if(this.playerAp < spell.cost) {
                this.log("Pas assez de PA !", "orange");
                return;
            }
            if(this.spellCooldowns[spellId] > 0) {
                 this.log(`Rechargement: encore ${this.spellCooldowns[spellId]} tours.`, "orange");
                 return;
            }
            
            this.selectedSpell = spellId;
            this.selectedParams = spell; // Store spell data

            // Immediate Casts (Self Buffs / Self AOE)
            if(spell.type === 'AOE' || spell.type === 'ULT_BUFF') {
                 this.handleSpellCast(spellId, this.playerRef);
                 return;
            }
            
            this.turnState = 'PLAYER_TARGETING';
            
            if(spell.type === 'AOE_RANGED') {
                 this.log(`Ciblez une ZONE (Rayon: ${spell.area}m)`);
                 this.createRangeIndicator(spell.range, new BABYLON.Color3(1, 0.5, 0)); // Orange
            } else {   
                this.log(`Ciblez avec ${spell.name} (Portée: ${spell.range}m)`);
                const range = spell.range > 0 ? spell.range : 1.5;
                this.createRangeIndicator(range, new BABYLON.Color3(1, 0, 0)); // Red
            }
            
            this.updateUI();
        }
    }
    
    executeMove(targetPoint) {
        const distance = BABYLON.Vector3.Distance(this.playerRef.position, targetPoint);
        const cost = Math.ceil(distance); // 1m = 1 PM basically
        
        // Strict PM Check
        if(cost > this.playerPm) {
            this.log(`Trop loin ! (Coût: ${cost} PM, Dispo: ${this.playerPm})`, "orange");
            // Do NOT reset state to IDLE, let player click again closer
            return;
        }
        
        // Execute Move
        this.turnState = 'ANIMATING';
        this.clearRangeIndicator();
        this.playerPm -= cost;
        this.updateUI();
        
        // Simple move animation (tweening)
        const moveAnim = new BABYLON.Animation("move", "position", 60, BABYLON.Animation.ANIMATIONTYPE_VECTOR3, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
        const keys = [
            { frame: 0, value: this.playerRef.position },
            { frame: 30, value: targetPoint }
        ];
        moveAnim.setKeys(keys);
        
        this.playerRef.lookAt(targetPoint);
        this.scene.beginDirectAnimation(this.playerRef, [moveAnim], 0, 30, false, 1.0, () => {
            this.turnState = 'PLAYER_IDLE';
            // Move visuals
            if(this.rangeIndicator) this.rangeIndicator.position = this.playerRef.position.clone().add(new BABYLON.Vector3(0,0.1,0));
        });
        this.log(`Déplacement de ${cost}m.`);
    }

    handleSpellCast(spellId, targetOrPoint) {
        const classData = CLASSES[gameState.playerData.classId] || CLASSES.FERRAILLEUR;
        const spell = classData.spells.find(s => s.id === spellId);
        
        if(!spell) return;

        // Determine Position & Target
        const isEntity = !!targetOrPoint.position; // Is it a Mesh?
        const targetPos = isEntity ? targetOrPoint.position : targetOrPoint;
        const targetEntity = isEntity ? targetOrPoint : null;
        
        // Range Check Strict (Skip for Range 0 / Self)
        if(spell.range > 0) {
            const distToTarget = BABYLON.Vector3.Distance(this.playerRef.position, targetPos);
            if(distToTarget > spell.range + 1.5) { // Generous tolerance for ground clicks
                this.log("Cible hors de portée !", "orange");
                return;
            }
        }

        // Set Cooldown
        if(spell.cooldown) {
            this.spellCooldowns[spellId] = spell.cooldown;
        }

        this.playerAp -= spell.cost;
        this.updateUI();
        this.turnState = 'ANIMATING';
        this.clearRangeIndicator();
        
        this.log(`${spell.name} !`);

        // LEVEL SCALING
        const level = gameState.playerData.level || 1;
        const skillLvl = gameState.playerData.skillLevel || 1;
        const dmgLvl = gameState.playerData.dmgLevel || 1;

        const levelMult = 1.0 + ((level - 1) * 0.15); // +15% per Character Level
        const upgradeMult = 1.0 + ((skillLvl - 1) * 0.10) + ((dmgLvl - 1) * 0.20); // +10% Skill, +20% Dmg Upgrade

        // BERSERKER / PASSIVE LOGIC
        let multiplier = 1.0 * levelMult * upgradeMult;
        if(gameState.playerData.classId === 'SURVIVANT') {
             // Berserker Passive: Low HP = High Dmg
             const hpPct = gameState.playerData.hp / gameState.playerData.maxHp;
             if(hpPct < 0.5) {
                 multiplier = 1.0 + (0.5 - hpPct); 
                 this.log("RAGE PASSIVE: Dégâts augmentés !", "red");
             }
        }
        if(gameState.playerData.classId === 'DISRUPTEUR' && targetEntity && targetEntity.name.includes("Robot")) {
            multiplier = 1.1; // Surcharge Passive
        }

        // --- SPELL TYPE LOGIC ---
        
        // 1. AOE (Ground or Self)
        if(spell.type === 'AOE' || spell.type === 'AOE_RANGED') {
            const radius = spell.area || 3;
            // Visual
            this.spawnExplosion(targetPos, radius);
            
            // Hit Logic
            let hitCount = 0;
            this.activeEnemies.forEach(e => {
                if(!e || e.isDisposed() || e.metadata.combat.isDead) return;
                const d = BABYLON.Vector3.Distance(e.position, targetPos);
                if(d <= radius) {
                    this.applyDamage(e, Math.floor(spell.dmg * multiplier), spell.elementType);
                    hitCount++;
                }
            });
            if(hitCount > 0) this.log(`${hitCount} ennemis touchés !`);
            else this.log("Aucune cible touchée.");
        }
        
        // 2. ULTIMATE (Buff/Special)
        else if (spell.type === 'ULT' || spell.type === 'ULT_BUFF') {
            // Specific logic per ID usually, simplified generic here
            if(spell.type === 'ULT_BUFF') {
                 // Survivant Vengeance
                 this.log("ULTIME: Mode Vengeance !", "red");
                 gameState.playerData.hp = Math.min(gameState.playerData.maxHp, gameState.playerData.hp + 20); // Small heal
            } else if (spell.type === 'ULT') {
                 // Ferrailleur Smash
                 if(targetEntity) this.applyDamage(targetEntity, Math.floor(spell.dmg * multiplier), spell.elementType);
                 this.log("ULTIME: Armure Renforcée (+Temp)", "cyan");
            }
        }

        // 3. DAMAGE (Single Target)
        else if(spell.type === 'DMG' || spell.type === 'DASH_DMG' || spell.type === 'DOT' || spell.type === 'DEBUFF') {
            if(!targetEntity) {
                this.log("Erreur: Pas de cible valide.");
            } else {
                let dmg = spell.dmg;
                
                if(spell.type === 'DASH_DMG') {
                    // Dash anim
                    const dashAnim = new BABYLON.Animation("dash", "position", 60, BABYLON.Animation.ANIMATIONTYPE_VECTOR3, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
                    const dest = targetPos.subtract(targetPos.subtract(this.playerRef.position).normalize().scale(1.5));
                    dashAnim.setKeys([{ frame: 0, value: this.playerRef.position }, { frame: 20, value: dest }]);
                    this.scene.beginDirectAnimation(this.playerRef, [dashAnim], 0, 20, false);
                }

                this.spawnEffect(targetPos, "HIT");
                
                if(spell.type === 'DOT') {
                     this.log(`${targetEntity.name} empoisonné !`);
                     // Add DOT logic later to enemy turn
                     this.applyDamage(targetEntity, Math.floor(dmg * multiplier), spell.elementType);
                } else {
                     this.applyDamage(targetEntity, Math.floor(dmg * multiplier), spell.elementType);
                }
            }
        } 
        
        // 4. HEAL
        else if (spell.type === 'HEAL') {
             const healAmount = Math.abs(spell.dmg);
             gameState.playerData.hp = Math.min(classData.stats.hp, gameState.playerData.hp + healAmount);
             this.spawnEffect(this.playerRef.position, "HEAL");
             this.log(`Soin +${healAmount} PV`, "green");
             this.updateUI();
        }

        // Self Damage (Berserker)
        if(spell.selfDmg) {
            gameState.playerData.hp -= spell.selfDmg;
            this.log(`Sacrifice: -${spell.selfDmg} PV`, "red");
            this.updateUI();
        }

        setTimeout(() => {
             this.turnState = 'PLAYER_IDLE'; 
             // Re-filter dead in case AOE killed multiple
             this.activeEnemies = this.activeEnemies.filter(e => e && !e.isDisposed() && !e.metadata.combat.isDead);
             if(this.activeEnemies.length === 0) this.endBattle();
        }, 1000);
    }

    spawnExplosion(pos, radius) {
        const sphere = BABYLON.MeshBuilder.CreateSphere("boom", {diameter: radius*2}, this.scene);
        sphere.position = pos;
        const mat = new BABYLON.StandardMaterial("boomMat", this.scene);
        mat.diffuseColor = new BABYLON.Color3(1, 0.5, 0);
        mat.alpha = 0.6;
        sphere.material = mat;
        
        const anim = new BABYLON.Animation("boomA", "visibility", 60, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
        anim.setKeys([{frame:0, value: 0.8}, {frame: 20, value: 0}]);
        this.scene.beginDirectAnimation(sphere, [anim], 0, 20, false, 1, () => sphere.dispose());
    }

    startEnemyTurnSequence() {
        this.turnState = 'ENEMY_TURN';
        this.log("--- TOUR ENNEMI ---", "gray");
        
        // Filter living
        this.activeEnemies = this.activeEnemies.filter(e => !e.isDisposed() && !e.metadata.combat.isDead);
        if(this.activeEnemies.length === 0) { this.endBattle(); return; }

        this.processEnemyTurn(0);
    }

    spawnHeartFX(position) {
        // Simple Particle System
        const sys = new BABYLON.ParticleSystem("hearts", 50, this.scene);
        // Use default particle texture or create one
        sys.particleTexture = new BABYLON.Texture("https://assets.babylonjs.com/textures/flare.png", this.scene); 
        sys.emitter = position.clone().add(new BABYLON.Vector3(0, 2, 0));
        sys.color1 = new BABYLON.Color4(1, 0, 0.5, 1);
        sys.color2 = new BABYLON.Color4(1, 0.5, 0.8, 1);
        sys.colorDead = new BABYLON.Color4(1, 0, 0, 0);
        sys.minSize = 0.5;
        sys.maxSize = 1.0;
        sys.minLifeTime = 1;
        sys.maxLifeTime = 2;
        sys.emitRate = 20;
        sys.targetStopDuration = 1;
        sys.direction1 = new BABYLON.Vector3(-1, 2, -1);
        sys.direction2 = new BABYLON.Vector3(1, 2, 1);
        sys.gravity = new BABYLON.Vector3(0, 1, 0);
        sys.start();
    }

    handlePlayerDeath() {
        this.log("VOUS ÊTES MORT...", "red");
        this.turnState = 'DEAD';
        
        // Visual Fall
        const anim = new BABYLON.Animation("die", "rotation.x", 30, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
        anim.setKeys([{frame:0, value: 0}, {frame: 30, value: -Math.PI/2}]);
        this.scene.beginDirectAnimation(this.playerRef, [anim], 0, 30, false);

        // UI Overlay
        const overlay = document.createElement('div');
        overlay.style.position = 'absolute';
        overlay.style.top = '0'; overlay.style.left = '0';
        overlay.style.width = '100%'; overlay.style.height = '100%';
        overlay.style.background = 'rgba(50, 0, 0, 0.8)';
        overlay.style.color = 'red';
        overlay.style.display = 'flex';
        overlay.style.flexDirection = 'column';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.zIndex = '1000';
        overlay.innerHTML = `<h1>ECHEC CRITIQUE</h1><p>Rechargement des protocoles...</p>`;
        document.body.appendChild(overlay);

        setTimeout(() => {
            window.location.reload();
        }, 3000);
    }

    processEnemyTurn(index) {
        try {
            // --- SOFTLOCK PREVENTION ---
            if(index > 30) {
                 console.warn("Forcing Player Turn (Anti-Infinite Loop)");
                 this.startPlayerTurn();
                 return;
            }
    
            // Validating Array Access
            if(!this.activeEnemies || index >= this.activeEnemies.length) {
                this.startPlayerTurn(); // Back to player
                return;
            }
    
            const enemy = this.activeEnemies[index];
            // Safety Clean check
            if (!enemy || enemy.isDisposed()) {
                console.warn(`Enemy at index ${index} is invalid/disposed. Skipping.`);
                this.processEnemyTurn(index + 1);
                return;
            }
    
            if(!enemy.metadata || !enemy.metadata.combat) {
                 console.warn(`Enemy ${enemy.name} missing metadata. Skipping.`);
                 this.processEnemyTurn(index + 1);
                 return;
            }
    
            // If dead, skip
            if(enemy.metadata.combat.isDead) {
                // Dead enemy? Just move to next immediately (no delay) to speed up
                this.processEnemyTurn(index + 1);
                return;
            }
    
            // --- EXECUTE AI ---
            // Wrap strictly the AI logic
            this._runEnemyAI(enemy, index);
            
        } catch (fatalErr) {
             console.error("FATAL ERROR IN ENEMY TURN LOOP", fatalErr);
             // EMERGENCY RECOVERY
             this.startPlayerTurn();
        }
    }

    _runEnemyAI(enemy, index) {
        // Check if Dead
        if(!enemy || !enemy.metadata || !enemy.metadata.combat || enemy.metadata.combat.hp <= 0) {
                this.processEnemyTurn(index+1);
                return; 
        }

        // Dispatch
        if (enemy.metadata.combat.type === 'BOSS' || (enemy.metadata.combat.name && enemy.metadata.combat.name.includes("Marquis"))) {
                this._runBossAI(enemy, index);
        } else {
                this._runStandardAI(enemy, index);
        }
    }

    _runBossAI(boss, index) {
        const stats = boss.metadata.combat;
        const dist = BABYLON.Vector3.Distance(boss.position, this.playerRef.position);
        
        // --- 1. INITIALIZATION & COOLDOWNS ---
        if(!stats.turnCounter) stats.turnCounter = 0;
        if(!stats.ultCooldown || isNaN(stats.ultCooldown)) stats.ultCooldown = 4;
        
        // Initialize Ability Cooldowns if missing
        stats.cd_pull = stats.cd_pull || 0;
        stats.cd_dash = stats.cd_dash || 0;
        stats.cd_stun = stats.cd_stun || 0;
        
        // Decrement CDs
        if(stats.cd_pull > 0) stats.cd_pull--;
        if(stats.cd_dash > 0) stats.cd_dash--;
        if(stats.cd_stun > 0) stats.cd_stun--;

        stats.turnCounter++;
        const turnsUntil = stats.ultCooldown - (stats.turnCounter % stats.ultCooldown);
        console.log(`BOSS AI TURN ${stats.turnCounter} (CDs: Pull=${stats.cd_pull}, Dash=${stats.cd_dash})`);

        // --- 2. PRIORITY: ULTIMATE (Every 4 turns) ---
        if (stats.turnCounter % stats.ultCooldown === 0) {
            this.log("MARQUIS: 'Adieu, petit chat !'", "red");
            this.log("⚠️ ULT: AVALANCHE DE BOTTES !", "magenta");
            
            // Effect
            if(this.vfx) this.vfx.createExplosion(this.playerRef.position); 
            const dmg = 80;
            this.applyDamage(this.playerRef, dmg);
             
            // End Turn
            setTimeout(() => this.processEnemyTurn(index + 1), 3000); 
            return;
        }

        // --- 3. TACTICAL DECISION MAKING ---
        
        // CASE A: FAR RANGE (> 8m) - Try Pull, then Dash, then Move
        if (dist > 8) {
            if (stats.cd_pull === 0) {
                 this.castBossPull(boss, index);
                 stats.cd_pull = 3; // 3 Turn CD
                 return;
            }
            // Fallback to Dash if Pull on CD
            if (stats.cd_dash === 0) {
                 this.castBossDash(boss, index);
                 stats.cd_dash = 2;
                 return;
            }
        }
        
        // CASE B: MID RANGE (3m - 8m) - Try Dash (Gap Close), then Move
        if (dist > 3 && dist <= 8) {
             if (stats.cd_dash === 0) {
                 this.castBossDash(boss, index);
                 stats.cd_dash = 2;
                 return;
             }
             // If Dash on CD, try Pull (bring player to me)
             if (stats.cd_pull === 0) {
                 this.castBossPull(boss, index);
                 stats.cd_pull = 3;
                 return;
             }
        }

        // CASE C: MELEE RANGE (< 3m) - Stun or Smack
        if (dist <= 3) {
             // Try Stun (Yeux Doux) if player not stunned
             if (stats.cd_stun === 0 && !gameState.playerData.stunned) {
                 this.log("Marquis: 'Regardez-moi...'", "magenta");
                 this.log("Yeux Doux (Stun) !", "red");
                 gameState.playerData.stunned = 1;
                 this.spawnHeartFX(boss.position);
                 stats.cd_stun = 4;
                 setTimeout(() => this.processEnemyTurn(index + 1), 2000);
                 return;
             }
        }

        // --- 4. DEFAULT: MOVE & ATTACK ---
        // If no special moves triggered, use PM to close gap and hit
        
        const moveRange = stats.pm || 6;
        if (dist > 2) {
            // Move Logic
            this.log("Marquis s'approche avec élégance...");
            this.moveEntity(boss, this.playerRef.position, moveRange);
            
            // Verify new distance after "move" (Simulated delay)
            setTimeout(() => {
                 const newDist = BABYLON.Vector3.Distance(boss.position, this.playerRef.position);
                 if (newDist <= 2.5) {
                     // Hit after move
                     this.log("ATK: Coup de Rapière !", "white");
                     this.applyDamage(this.playerRef, stats.damage);
                 }
                 this.processEnemyTurn(index + 1);
            }, 1500);
            return;
        } else {
            // Already close, just hit
            this.log("ATK: Enchaînement !", "white");
            this.applyDamage(this.playerRef, stats.damage);
            setTimeout(() => this.processEnemyTurn(index + 1), 1500);
        }
    }

    castBossPull(boss, index) {
        this.log("Marquis utilise Lazo de Soie !", "orange");
        const dir = boss.position.subtract(this.playerRef.position).normalize();
        const pullDest = boss.position.subtract(dir.scale(1.5));
        
        const anim = new BABYLON.Animation("pull", "position", 60, BABYLON.Animation.ANIMATIONTYPE_VECTOR3, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
        anim.setKeys([{frame:0, value:this.playerRef.position}, {frame:30, value:pullDest}]);
        this.scene.beginDirectAnimation(this.playerRef, [anim], 0, 30, false, 1, () => {
             this.log("Marquis vous poignarde ! -20 PV", "white");
             this.applyDamage(this.playerRef, 20); 
        });
        
        this.spawnEffect(this.playerRef.position, "WARP");
        setTimeout(() => this.processEnemyTurn(index + 1), 2000);
    }

    castBossDash(boss, index) {
        this.log("Marquis: 'En Garde !'", "orange");
        this.log("Botte Secrète (Dash) !", "red");
        
        // Dash to player
        const dashPos = this.playerRef.position.clone();
        const anim = new BABYLON.Animation("dash", "position", 60, BABYLON.Animation.ANIMATIONTYPE_VECTOR3, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
        anim.setKeys([{frame:0, value:boss.position}, {frame:20, value:dashPos}]);
        
        this.scene.beginDirectAnimation(boss, [anim], 0, 20, false, 1, () => {
            this.applyDamage(this.playerRef, 40);
        });
        
        setTimeout(() => this.processEnemyTurn(index + 1), 2000);
    }

    moveEntity(entity, targetPos, maxDist) {
         const currentPos = entity.position;
         const dir = targetPos.subtract(currentPos).normalize();
         let moveVec = dir.scale(Math.min(BABYLON.Vector3.Distance(currentPos, targetPos) - 1.5, maxDist));
         
         const anim = new BABYLON.Animation("move", "position", 30, BABYLON.Animation.ANIMATIONTYPE_VECTOR3, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
         anim.setKeys([{frame:0, value:currentPos}, {frame:30, value:currentPos.add(moveVec)}]);
         this.scene.beginDirectAnimation(entity, [anim], 0, 30, false);
    }
    
    // ... Helper for Heart FX
    spawnHeartFX(pos) {
        // Simple particles or floating icon
        const heart = BABYLON.MeshBuilder.CreatePlane("heart", {size:1}, this.scene);
        heart.position = pos.add(new BABYLON.Vector3(0, 2, 0));
        heart.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
        
        const dt = new BABYLON.DynamicTexture("hdt", 128, this.scene, true);
        const ctx = dt.getContext();
        ctx.font = "80px Arial";
        ctx.fillStyle = "red";
        ctx.fillText("♥", 30, 100);
        dt.update();
        
        const mat = new BABYLON.StandardMaterial("hmat", this.scene);
        mat.diffuseTexture = dt;
        mat.diffuseTexture.hasAlpha = true;
        mat.emissiveColor = BABYLON.Color3.Red();
        heart.material = mat;
        
        // float up and fade
        const anim = new BABYLON.Animation("hfloat", "position.y", 30, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
        anim.setKeys([{frame:0, value:pos.y+2}, {frame:60, value:pos.y+4}]);
        this.scene.beginDirectAnimation(heart, [anim], 0, 60, false, 1, () => heart.dispose());
    }

    _runStandardAI(enemy, index) {
        try {
            // --- STANDARD AI (Mobs) ---
            // Simple AI: Move closer if far, Attack if close
            const dist = BABYLON.Vector3.Distance(enemy.position, this.playerRef.position);
            
            if(dist > 2) {
                // Move towards player
                // Use Variable PM from stats
                const maxMove = enemy.metadata.combat.pm || 3;
                const neededDist = dist - 1.5; 
                const actualMove = Math.min(maxMove, neededDist);

                // Look at
                enemy.lookAt(this.playerRef.position);
                const dir = this.playerRef.position.subtract(enemy.position).normalize();
                
                // ANIMATION
                const moveAnim = new BABYLON.Animation("e_move", "position", 60, BABYLON.Animation.ANIMATIONTYPE_VECTOR3, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
                moveAnim.setKeys([{frame:0, value: enemy.position}, {frame:30, value: enemy.position.add(dir.scale(actualMove))}]);
                
                this.scene.beginDirectAnimation(enemy, [moveAnim], 0, 30, false);
                this.log(`${enemy.metadata.combat.name} avance de ${Math.floor(actualMove)}m.`);
            } else {
                // Attack
                const dmg = enemy.metadata.combat.damage || 5;
                gameState.playerData.hp -= dmg;
                this.spawnEffect(this.playerRef.position, "OW"); // VFX
                this.log(`${enemy.metadata.combat.name} attaque ! -${dmg} PV.`, "red");
                this.updateUI();
                
                 if(gameState.playerData.hp <= 0) {
                    this.handlePlayerDeath();
                    // Do NOT continue turn if player dead
                    return; 
                 }
            }
        } catch (err) {
            console.error("AI CRASH - Skipping Turn", err);
            this.log(`Erreur AI (${enemy.name}) - Tour passé.`);
        }

        // STANDARD NEXT TURN
        setTimeout(() => this.processEnemyTurn(index + 1), 1500);
    }

    log(msg, color="white") {
        const log = document.getElementById('combat-log');
        if(log) {
            const line = document.createElement('p');
            line.style.color = color;
            line.innerHTML = `> ${msg}`;
            log.prepend(line); // Newest at top or handle flex-reverse
        }
    }

    applyDamage(target, amount, elementType = null) {
        // Validation
        if (!target) return;

        // --- ENEMY DAMAGE & RESISTANCE ---
        if (target !== this.playerRef) {
            // Check Resistances
            if(target.metadata && target.metadata.combat && target.metadata.combat.damageResist && elementType) {
                const resist = target.metadata.combat.damageResist[elementType] || 0;
                if(resist > 0) {
                    amount = Math.floor(amount * (1 - resist));
                    this.log(`Résisté ! (${Math.floor(resist*100)}%)`, "gray");
                    if(amount <= 0) {
                         this.spawnDamageText(target.position, "IMMUNE");
                         return;
                    }
                }
            }
        }

        // Handle Player Damage via GameState
        if (target === this.playerRef) {
             gameState.playerData.hp -= amount;
             this.spawnDamageText(target.position, amount);
             
             // Update Metadata wrapper (for generic checks)
             if(target.metadata && target.metadata.combat) {
                 target.metadata.combat.hp = gameState.playerData.hp;
             }

             // Flash Red
             if(target.material) {
                const oldColor = target.material.emissiveColor ? target.material.emissiveColor.clone() : BABYLON.Color3.Black();
                target.material.emissiveColor = new BABYLON.Color3(1,0,0);
                setTimeout(() => { if(!target.isDisposed()) target.material.emissiveColor = oldColor; }, 150);
             }

             // Camera Shake
             if(this.scene.activeCamera) {
                 const basePos = this.scene.activeCamera.position.clone();
                 const shakeAnim = new BABYLON.Animation("shake", "position", 60, BABYLON.Animation.ANIMATIONTYPE_VECTOR3, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
                 shakeAnim.setKeys([
                     {frame:0, value:basePos},
                     {frame:2, value:basePos.add(new BABYLON.Vector3(0.5,0,0))},
                     {frame:4, value:basePos},
                     {frame:6, value:basePos.add(new BABYLON.Vector3(-0.5,0,0))},
                     {frame:8, value:basePos}
                 ]);
                 this.scene.beginDirectAnimation(this.scene.activeCamera, [shakeAnim], 0, 8, false);
             }

             // Death Check
             if (gameState.playerData.hp <= 0) {
                 this.handlePlayerDeath();
             }
             
             this.updateUI();
             return;
        }

        // Handle Enemy Damage
        if (!target.metadata || !target.metadata.combat) return;

        const stats = target.metadata.combat;
        stats.hp -= amount;
        this.spawnDamageText(target.position, amount);
        
        // Flash Red
        if(target.material) {
            const oldColor = target.material.emissiveColor ? target.material.emissiveColor.clone() : BABYLON.Color3.Black();
            target.material.emissiveColor = new BABYLON.Color3(1,0,0);
            setTimeout(() => { if(!target.isDisposed()) target.material.emissiveColor = oldColor; }, 150);
        }

        if(stats.hp <= 0) {
            stats.isDead = true;
            this.killEntity(target);
            this.log(`${stats.name} est éliminé !`, "lime");
        }
    }
    
    killEntity(mob) {
        // XP System Hook
        if (mob.metadata.combat && mob.metadata.combat.xpValue) {
            gameState.gainXp(mob.metadata.combat.xpValue);
            this.log(`XP +${mob.metadata.combat.xpValue}`, "cyan");
        } else {
            // Default XP
            gameState.gainXp(10);
            this.log(`XP +10`, "cyan");
        }

        if (this.lootSystem) this.lootSystem.spawnLoot(mob.position);
        
        // Disable highlight
        if(mob.metadata.light) mob.metadata.light.dispose();

        const anim = new BABYLON.Animation("death", "scaling", 30, BABYLON.Animation.ANIMATIONTYPE_VECTOR3, BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);
        anim.setKeys([{frame:0, value: mob.scaling.clone()}, {frame:20, value: new BABYLON.Vector3(0.01, 0.01, 0.01)}]);
        this.scene.beginDirectAnimation(mob, [anim], 0, 20, false, 1.0, () => {
             mob.dispose();
             // Re-filter handled in turns
        });
    }

    endBattle() {
        this.inCombat = false;
        
        // Restore Emissive Colors
        if(this.activeEnemies) {
            this.activeEnemies.forEach(e => {
                if(e && !e.isDisposed()) {
                    // Dispose old HighlightLayer if exists (Legacy check)
                    if(e.metadata.light) e.metadata.light.dispose();
                    
                    // Restore Material Emissive
                    if(e.material && e.metadata.originalEmissive) {
                        e.material.emissiveColor = e.metadata.originalEmissive;
                    }
                }
            });
        }

        this.clearRangeIndicator();
        this.activeEnemies = [];
        
        // UI Reset
        gameState.changeState(GameStates.HUB);
        const log = document.getElementById('combat-log');
        if(log) log.innerHTML = "<p>Combat terminé.</p>";
        
        // Heal Player slightly (Adrenaline)
        const classData = CLASSES[gameState.playerData.classId] || CLASSES.FERRAILLEUR;
        const heal = Math.floor(classData.stats.hp * 0.2); // 20% Heal
        gameState.playerData.hp = Math.min(classData.stats.hp, gameState.playerData.hp + heal);
        
        this.uiManager.updateCombatStats(gameState.playerData.hp, classData.stats.hp, 0, 0, 0, 0);
        
        // Fix: Use internal spawnDamageText instead of missing uiManager method
        this.spawnDamageText(this.playerRef.position, "VICTOIRE !");
        
        // Notify user
        console.log("Battle Ended.");
        document.dispatchEvent(new CustomEvent('player-stats-update'));
    }

    spawnDamageText(pos, val) {
         // Same as before
        const plane = BABYLON.MeshBuilder.CreatePlane("dmg", {size: 2}, this.scene);
        plane.position = pos.clone().add(new BABYLON.Vector3(0, 2, 0));
        plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
        const dt = new BABYLON.DynamicTexture("dt", {width:128, height:64}, this.scene, true);
        dt.hasAlpha = true;
        dt.drawText(val, null, 40, "bold 40px Arial", "white", "transparent", true);
        const mat = new BABYLON.StandardMaterial("dmgMat", this.scene);
        mat.diffuseTexture = dt;
        mat.emissiveColor = BABYLON.Color3.Red();
        mat.disableLighting = true;
        plane.material = mat;
        const anim = new BABYLON.Animation("float", "position.y", 30, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);
        anim.setKeys([{frame:0, value: plane.position.y}, {frame:30, value: plane.position.y+2}]);
        this.scene.beginDirectAnimation(plane, [anim], 0, 30, false, 1.0, () => plane.dispose());
    }
    
    spawnEffect(pos, text) {
        // Wrapper for specialized effects later
        this.spawnDamageText(pos, text);
        
        // 3D Sparks Effect (Dynamic Hit)
        for(let i=0; i<6; i++) {
             const spark = BABYLON.MeshBuilder.CreatePlane("spark", {size: 0.3}, this.scene);
             spark.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
             spark.position = pos.clone().add(new BABYLON.Vector3(0, 1, 0));
             
             const mat = new BABYLON.StandardMaterial("sparkMat", this.scene);
             mat.emissiveColor = new BABYLON.Color3(1, 0.8, 0); // Gold/Fire
             mat.disableLighting = true;
             spark.material = mat;
             
             const dir = new BABYLON.Vector3(Math.random()-0.5, Math.random(), Math.random()-0.5).normalize();
             
             // Fly out animation
             const animPos = new BABYLON.Animation("fly", "position", 60, BABYLON.Animation.ANIMATIONTYPE_VECTOR3, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
             animPos.setKeys([{frame:0, value: spark.position}, {frame: 20, value: spark.position.add(dir.scale(1.5))}]);
             
             // Fade out
             const animFade = new BABYLON.Animation("fade", "visibility", 60, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
             animFade.setKeys([{frame:0, value: 1}, {frame: 20, value: 0}]);

             this.scene.beginDirectAnimation(spark, [animPos, animFade], 0, 20, false, 1.0, () => spark.dispose());
        }
    }

    update(dt) {
        // Standard world update (chase) only when NOT in combat
        if(!this.playerRef || this.inCombat) return; 

        this.enemies.forEach(mob => {
            // SAFE ACCESS CHECK
            if(!mob || !mob.metadata || !mob.metadata.combat || mob.metadata.combat.isDead) return;
            
            const combat = mob.metadata.combat;
            const dist = BABYLON.Vector3.Distance(mob.position, this.playerRef.position);
            
            // Chase logic (simplified)
            if(dist < 15 && dist > 1.2) {
                 const dir = this.playerRef.position.subtract(mob.position).normalize();
                 mob.position.addInPlace(dir.scale(2.0 * dt)); 
                 mob.lookAt(this.playerRef.position);
            }

            // TRIGGER BATTLE
            if(dist <= 1.5) {
                this.startBattle(mob);
            }
        });
    }
}

