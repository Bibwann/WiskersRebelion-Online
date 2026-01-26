// js/UIManager.js
import { gameState, GameStates } from './GameState.js'
import { Dialogues } from './data/QuestData.js'
import { OBJECTIVES } from './data/Objectives.js';
import { CLASSES, DIALOGUES as GameDataDialogues } from './GameData.js'; // Import Classes and Boss Dialogues

export class UIManager {
    constructor() {
        this.cacheElements();
        this.bindEvents();
        this.hideAllScreens();
        this.objectiveBox = null; 
        this.initObjectiveUI();
        this.settingsManager = null;
    }

    initObjectiveUI() {
        // Create Objective Box if not exists
        if(!document.getElementById('objective-box')) {
             const hud = document.getElementById('hud-exploration');
             if(hud) {
                 const box = document.createElement('div');
                 box.id = 'objective-box';
                 box.className = 'objective-box';
                 box.innerHTML = `<h3>OBJECTIF ACTUEL</h3><p id="objective-text">Chargement...</p>`;
                 hud.appendChild(box);
                 this.objectiveBox = document.getElementById('objective-text');
             }
        }
    }

    updateObjective(key) {
        if(!this.objectiveBox) this.initObjectiveUI();
        if(this.objectiveBox && OBJECTIVES[key]) {
            this.objectiveBox.innerText = OBJECTIVES[key];
            this.objectiveBox.parentElement.classList.add('flash-objective');
            setTimeout(() => this.objectiveBox.parentElement.classList.remove('flash-objective'), 1000);
        }
    }

    updateQuestObjective(text) {
        if(!this.objectiveBox) this.initObjectiveUI();
        if(this.objectiveBox) {
            this.objectiveBox.innerText = text;
            this.objectiveBox.parentElement.classList.add('flash-objective');
            setTimeout(() => this.objectiveBox.parentElement.classList.remove('flash-objective'), 1000);
        }
    }

    cacheElements() {
        this.screens = {
            [GameStates.MENU]: document.getElementById('main-menu'),
            options: document.getElementById('options-screen'),
            cinematic: document.getElementById('cinematic-screen'),
            [GameStates.CHARACTER_SHEET]: document.getElementById('character-sheet'),
            [GameStates.HUB]: document.getElementById('hud-exploration'),
            [GameStates.DIALOGUE]: document.getElementById('dialogue-box'),
            [GameStates.COMBAT]: document.getElementById('combat-ui')
        };
        
        this.modals = {
            charSheet: document.getElementById('character-sheet'),
            dialogue: document.getElementById('dialogue-box')
        };

        this.elements = {
            npcName: document.getElementById('npc-name'),
            npcText: document.getElementById('npc-text'),
            dialogueChoices: document.getElementById('dialogue-choices'),
            statStr: document.getElementById('stat-str'),
            statHp: document.getElementById('stat-hp'),
            statSkill: document.getElementById('stat-skill'),
            classDesc: document.getElementById('class-desc'),
            levelDisplay: document.getElementById('hud-level'),
            xpBar: document.getElementById('hud-xp-bar'),
            // New HUD Stats
            hudHpBar: document.getElementById('hud-hp-bar'),
            hudHpText: document.getElementById('hud-hp-text'),
            hudApBar: document.getElementById('hud-ap-bar'),
            hudApText: document.getElementById('hud-ap-text'),
            
            // Combat UI
            combatActions: document.getElementById('combat-actions'),
            combatHpText: document.getElementById('combat-hp-text'),
            combatApText: document.getElementById('combat-ap-text'),
            combatPmText: document.getElementById('combat-pm-text')
        };
        
        this.keyInputs = {
            interact: document.getElementById('key-interact'),
            inventory: document.getElementById('key-inventory')
        };
    }

    initOptions(settingsManager) {
        this.settingsManager = settingsManager;
        const keys = settingsManager.getKeys();

        // Populate inputs
        if(this.keyInputs.interact) this.keyInputs.interact.value = keys.INTERACT;
        if(this.keyInputs.inventory) this.keyInputs.inventory.value = keys.INVENTORY;

        const bindKeyChange = (input, actionName) => {
            if(!input) return;
            
            input.addEventListener('keydown', (e) => {
                e.preventDefault();
                const newKey = e.key;
                
                input.value = newKey;
                this.settingsManager.setKey(actionName, newKey);
                input.blur();
            });
        };

        bindKeyChange(this.keyInputs.interact, 'INTERACT');
        bindKeyChange(this.keyInputs.inventory, 'INVENTORY');
    }
    
    generateCombatButtons(classId) {
        const container = this.elements.combatActions;
        if(!container) return;
        
        container.innerHTML = ''; // Clear previous
        
        const classData = CLASSES[classId];
        if(!classData) return;

        // 1. Movement Button
        const btnMove = document.createElement('button');
        btnMove.className = 'combat-btn';
        btnMove.innerHTML = `MOUVEMENT <span class="cost">1 PM/m</span>`;
        btnMove.onclick = () => document.dispatchEvent(new CustomEvent('combat-action', { detail: { action: 'MOVE_MODE' } }));
        container.appendChild(btnMove);

        // 2. Spell Buttons
        classData.spells.forEach(spell => {
            const btn = document.createElement('button');
            btn.className = 'combat-btn';
            btn.innerHTML = `${spell.name} <span class="cost">${spell.cost} PA | ${spell.range}m</span>`;
            btn.title = spell.desc || ""; // Hover info
            
            // Highlight logic handled by CSS or separate logic
            btn.onclick = () => {
                 document.dispatchEvent(new CustomEvent('combat-action', { detail: { action: 'SELECT_SPELL', spellId: spell.id } }));
            };
            container.appendChild(btn);
        });
        
        // 3. Skip Turn
        const btnSkip = document.createElement('button');
        btnSkip.className = 'combat-btn';
        btnSkip.innerHTML = `FIN TOUR`;
        btnSkip.style.borderColor = '#ff3333';
        btnSkip.onclick = () => document.dispatchEvent(new CustomEvent('combat-action', { detail: { action: 'SKIP_TURN' } }));
        container.appendChild(btnSkip);
        
        // 4. Cancel (Hidden by default, shown when casting)
        const btnCancel = document.createElement('button');
        btnCancel.id = "btn-cancel-action";
        btnCancel.className = 'combat-btn hidden';
        btnCancel.innerHTML = `ANNULER`;
        btnCancel.onclick = () => document.dispatchEvent(new CustomEvent('combat-action', { detail: { action: 'CANCEL_ACTION' } }));
        container.appendChild(btnCancel);
    }
    
    updateCombatStats(hp, maxHp, ap, maxAp, pm, maxPm) {
        if(this.elements.combatHpText) this.elements.combatHpText.innerText = `${Math.floor(hp)}/${maxHp}`;
        if(this.elements.combatApText) this.elements.combatApText.innerText = `${ap}/${maxAp}`;
        if(this.elements.combatPmText) this.elements.combatPmText.innerText = `${pm}/${maxPm}`;
    }

    toggleCombatUI(show) {
        if(this.screens[GameStates.COMBAT]) {
            if(show) {
                this.screens[GameStates.COMBAT].classList.remove('hidden');
                this.screens[GameStates.COMBAT].classList.add('active');
            } else {
                this.screens[GameStates.COMBAT].classList.add('hidden');
                this.screens[GameStates.COMBAT].classList.remove('active');
            }
        }
    }

    updateRadar(player, enemies) {
        const radar = document.querySelector('.radar-circle');
        if (!radar || !player) return;

        radar.innerHTML = ''; // Clear

        // Player Dot (Center)
        const pDot = document.createElement('div');
        Object.assign(pDot.style, {
            position: 'absolute', width: '8px', height: '8px', 
            background: 'lime', borderRadius: '50%', 
            top: '50%', left: '50%', transform: 'translate(-50%, -50%)' 
        });
        radar.appendChild(pDot);

        const RADAR_RANGE = 20; 
        
        enemies.forEach(mob => {
            if(!mob || mob.isDisposed() || (mob.metadata && mob.metadata.combat && mob.metadata.combat.isDead)) return;

            const dx = mob.position.x - player.position.x;
            const dz = mob.position.z - player.position.z;

            // Scale (Assuming 100px box -> 50px radius. Use 40px safe zone)
            const scale = 40 / RADAR_RANGE; 
            
            if (Math.abs(dx) > RADAR_RANGE || Math.abs(dz) > RADAR_RANGE) return;

            const x = dx * scale;
            const y = -dz * scale;

            const dot = document.createElement('div');
            Object.assign(dot.style, {
                position: 'absolute', width: '6px', height: '6px', 
                background: 'red', borderRadius: '50%', 
                top: `calc(50% + ${y}px)`, left: `calc(50% + ${x}px)`, transform: 'translate(-50%, -50%)'
            });
            radar.appendChild(dot);
        });
    }

    bindEvents() {
        // State Management
        gameState.onStateChange((newState, oldState) => {
            console.log(`UI: Switching to ${newState}`);
            this.hideAllScreens();
            
            if (this.screens[newState]) {
                this.screens[newState].classList.remove('hidden');
                this.screens[newState].classList.add('active');

                // Special handling for Character Sheet
                if(newState === GameStates.CHARACTER_SHEET) {
                    this.buildClassSelection();
                }
            }
        });

    // Main Menu Buttons
        const btnStart = document.getElementById('btn-start');
        if(btnStart) {
            btnStart.onclick = () => {
                document.dispatchEvent(new CustomEvent('request-intro'));
            };
        }
        
        const btnOptions = document.getElementById('btn-options');
        if(btnOptions) {
            btnOptions.onclick = () => {
                this.showOptions();
            };
        }

        const btnCloseOptions = document.getElementById('btn-close-options');
        if(btnCloseOptions) {
            btnCloseOptions.onclick = () => {
                this.hideOptions();
            };
        }
        
        const btnLogs = document.getElementById('btn-download-logs');
        if(btnLogs) {
             btnLogs.onclick = () => {
                 if(window.downloadLogs) window.downloadLogs();
                 else console.error("Logger not ready");
             };
        }

        // Character Sheet interactions
        const btnFerrailleur = document.getElementById('btn-select-ferrailleur');
        if(btnFerrailleur) btnFerrailleur.onclick = () => this.updateClassPreview('FERRAILLEUR');

        const btnSurvivant = document.getElementById('btn-select-survivant');
        if(btnSurvivant) btnSurvivant.onclick = () => this.updateClassPreview('SURVIVANT');
        
        const btnBiologiste = document.getElementById('btn-select-biologiste');
        if(btnBiologiste) btnBiologiste.onclick = () => this.updateClassPreview('BIOLOGISTE');

        const btnDisrupteur = document.getElementById('btn-select-disrupteur');
        if(btnDisrupteur) btnDisrupteur.onclick = () => this.updateClassPreview('DISRUPTEUR');
        
        const btnConfirmChar = document.getElementById('btn-confirm-char');
        if(btnConfirmChar) {
            btnConfirmChar.onclick = () => {
                if (gameState.playerData.classId) {
                    gameState.changeState(GameStates.HUB);
                    document.dispatchEvent(new CustomEvent('game-start'));
                } else {
                    if(this.elements.classDesc) this.elements.classDesc.innerText = "ERREUR: VEUILLEZ SELECTIONNER UN PROFIL.";
                }
            };
        }
        
        // Game Logic Listeners
        // Listen to show-dialogue event dispatch by HubZone/Logic, not raw interaction
        document.addEventListener('show-dialogue', (e) => this.showDialogue(e));
        
        // Remove direct npc-interaction listener if HubZone handles it
        // document.addEventListener('npc-interaction', (e) => this.showDialogue(e.detail.npcId));

        document.addEventListener('player-stats-update', () => this.updateHUD());
        document.addEventListener('level-up', (e) => this.showLevelUp(e.detail.level));
    }

    buildClassSelection() {
        const container = this.screens[GameStates.CHARACTER_SHEET];
        container.innerHTML = ''; // Reset
        this.selectedClassId = null;

        const title = document.createElement('h2');
        title.textContent = "CHOISIS TA DESTINÉE";
        title.style.color = '#0ff'; // Cyan
        title.style.textAlign = 'center';
        container.appendChild(title);

        const grid = document.createElement('div');
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = 'repeat(2, 1fr)';
        grid.style.gap = '20px';
        grid.style.padding = '20px';
        container.appendChild(grid);

        const cards = [];

        Object.keys(CLASSES).forEach(key => {
            const classData = CLASSES[key];
            const card = document.createElement('div');
            card.style.border = '2px solid #555';
            card.style.padding = '15px';
            card.style.cursor = 'pointer';
            card.style.backgroundColor = 'rgba(0,0,0,0.8)';
            card.style.transition = 'all 0.3s';
            card.setAttribute('data-id', key);
            
            // Format stats string
            const statsStr = `PV: ${classData.stats.hp} | PA: ${classData.stats.maxAp} | PM: ${classData.stats.maxPm}`;
            
            card.innerHTML = `
                <h3 style="color: #f0ad4e">${classData.name}</h3>
                <p style="font-size: 0.9em; color: #ccc">${classData.description}</p>
                <p style="font-size: 0.8em; color: #888"><em>${statsStr}</em></p>
                <p style="font-size: 0.8em; color: #aaa">Passif: ${classData.passive}</p>
            `;

            card.onclick = () => {
                // Remove active style from all
                cards.forEach(c => {
                    c.style.borderColor = '#555';
                    c.style.transform = 'scale(1)';
                    c.style.boxShadow = 'none';
                    c.classList.remove('selected');
                });
                
                // Add active style to self
                card.style.borderColor = '#00ff00';
                card.style.transform = 'scale(1.05)';
                card.style.boxShadow = '0 0 15px rgba(0, 255, 0, 0.5)';
                card.classList.add('selected');
                
                this.selectedClassId = key;
                
                // Enable button
                confirmBtn.disabled = false;
                confirmBtn.style.opacity = '1';
                confirmBtn.style.cursor = 'pointer';
            };

            grid.appendChild(card);
            cards.push(card);
        });

        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = "COMMENCER L'AVENTURE";
        confirmBtn.style.display = 'block';
        confirmBtn.style.margin = '20px auto';
        confirmBtn.style.padding = '15px 40px';
        confirmBtn.style.fontSize = '1.2em';
        confirmBtn.style.backgroundColor = '#00ff00';
        confirmBtn.style.color = '#000';
        confirmBtn.style.border = 'none';
        confirmBtn.style.fontWeight = 'bold';
        confirmBtn.style.opacity = '0.5';
        confirmBtn.style.cursor = 'not-allowed';
        confirmBtn.disabled = true;

        confirmBtn.onclick = () => {
            if (this.selectedClassId) {
                gameState.setPlayerClass(this.selectedClassId);
                gameState.changeState(GameStates.HUB);
                document.dispatchEvent(new CustomEvent('game-start'));
            }
        };

        container.appendChild(confirmBtn);
    }

    showOptions() {
        this.hideAllScreens();
        if(this.screens.options) {
            this.screens.options.classList.remove('hidden');
            this.screens.options.classList.add('active');
        }
    }

    hideOptions() {
        if(this.screens.options) {
            this.screens.options.classList.remove('active');
            this.screens.options.classList.add('hidden');
        }
        if(this.screens[GameStates.MENU]) {
            this.screens[GameStates.MENU].classList.remove('hidden');
            this.screens[GameStates.MENU].classList.add('active');
        }
    }

    hideDialogue() {
        this._closeDialogue(this.modals.dialogue);
    }

    hideAllScreens() {
        Object.values(this.screens).forEach(el => {
            if(el) {
                el.classList.remove('active');
                el.classList.add('hidden');
            }
        });
        Object.values(this.modals).forEach(el => {
            if(el) {
                el.classList.add('hidden');
                el.classList.remove('active');
                el.style.display = ''; // Clear inline display override
            }
        });
    }

    updateHUD() {
        if(gameState.playerData) {
            // Level / XP
            if(this.elements.levelDisplay) this.elements.levelDisplay.innerText = `LVL ${gameState.playerData.level}`;
            if(this.elements.xpBar) {
                const max = gameState.playerData.xpToNextLevel || 100;
                const pct = (gameState.playerData.xp / max) * 100;
                this.elements.xpBar.style.width = `${pct}%`;
            }
            
            // HP
            if(this.elements.hudHpBar) {
                const maxHp = gameState.playerData.maxHp || 100;
                const hpPct = Math.max(0, (gameState.playerData.hp / maxHp) * 100);
                this.elements.hudHpBar.style.width = `${hpPct}%`;
                if(this.elements.hudHpText) this.elements.hudHpText.innerText = `${Math.ceil(gameState.playerData.hp)}/${maxHp}`;
            }

            // AP
            if(this.elements.hudApBar) {
                const maxAp = gameState.playerData.maxAp || 5;
                const apPct = Math.max(0, (gameState.playerData.ap / maxAp) * 100);
                this.elements.hudApBar.style.width = `${apPct}%`;
                if(this.elements.hudApText) this.elements.hudApText.innerText = `${gameState.playerData.ap}/${maxAp}`;
            }
        }
    }

    showLevelUp(level) {
        console.log(`LEVEL UP: ${level}`);
    }

    updateClassPreview(classId) {
        // Reset actives
        ['ferrailleur', 'survivant', 'biologiste', 'disrupteur', 'dev'].forEach(c => {
            const btn = document.getElementById(`btn-select-${c}`);
            if(btn) btn.classList.remove('active');
        });

        // Set active
        const activeBtn = document.getElementById(`btn-select-${classId.toLowerCase()}`);
        if(activeBtn) activeBtn.classList.add('active');

        // Update Text
        if (classId === 'FERRAILLEUR') {
            this.elements.statStr.innerText = "20 (HIGH)";
            this.elements.statHp.innerText = "120";
            this.elements.statSkill.innerText = "Coup de Clé";
            this.elements.classDesc.innerText = "Expert en démolition. Tape fort.";
        } else if (classId === 'SURVIVANT') {
            this.elements.statStr.innerText = "15 (MED)";
            this.elements.statHp.innerText = "150 (MAX)";
            this.elements.statSkill.innerText = "Rage Chimique";
            this.elements.classDesc.innerText = "Tank Berserker. Refuse de mourir.";
        } else if (classId === 'BIOLOGISTE') {
            this.elements.statStr.innerText = "10 (LOW)";
            this.elements.statHp.innerText = "80";
            this.elements.statSkill.innerText = "Poison";
            this.elements.classDesc.innerText = "Expert médical. Fragile mais tactique."; 
        } else if (classId === 'DISRUPTEUR') {
            this.elements.statStr.innerText = "12 (MED)";
            this.elements.statHp.innerText = "90";
            this.elements.statSkill.innerText = "Surcharge EMP";
            this.elements.classDesc.innerText = "Hacker tech. Maîtrise les éléments.";
        } else if (classId === 'DEV') {
            this.elements.statStr.innerText = "9999 (GOD)";
            this.elements.statHp.innerText = "9999";
            this.elements.statSkill.innerText = "NUKE";
            this.elements.classDesc.innerText = "Mode Développeur. Cassez tout.";
        }

        gameState.setPlayerClass(classId);
    }

    showDialogue({detail}) {
        let d = detail;
        // Handle direct call (passing object directly instead of event)
        if (!d && arguments[0] && arguments[0].text) {
             d = arguments[0];
        }

        if (d) {
            // Priority: Speaker in detail > NPC Name based on ID > Default '???'
            const speaker = d.speaker || (d.npc ? d.npc : "INTERFACE");
            
            // Handle Object-based Dialogues (e.g. from GameData file)
            // If d has only 'detail' property inside (nested)
            if (d.detail && d.detail.text) {
                this._renderDialogue(speaker, d.detail.text, d.detail.options);
                return;
            }

            this._renderDialogue(speaker, d.text, d.options);
            return;
        }
    }

    hideDialogue() {
         const box = this.modals.dialogue;
         if(box) this._closeDialogue(box);
    }

    _renderDialogue(speakerName, text, options) {
        this.hideAllScreens();
        
        const box = this.modals.dialogue;
        if(box) {
            box.classList.remove('hidden');
            box.style.display = 'flex'; 
            box.classList.add('active'); 
        }

        if(this.elements.npcName) this.elements.npcName.innerText = speakerName || "???";
        if(this.elements.npcText) this.elements.npcText.innerText = text || "...";

        const choicesContainer = this.elements.dialogueChoices;
        if(choicesContainer) {
            choicesContainer.innerHTML = ''; 
            
            const opts = options || [{ text: "Fermer", action: 'CLOSE' }];
            
            opts.forEach(opt => {
                const btn = document.createElement('button');
                btn.className = 'dialogue-option-btn';
                btn.innerText = opt.text;
                btn.style.padding = '10px 20px';
                btn.style.margin = '5px';
                btn.style.cursor = 'pointer';
                btn.style.backgroundColor = '#333';
                btn.style.color = '#fff';
                btn.style.border = '1px solid #555';

                btn.onmouseenter = () => btn.style.borderColor = '#0f0';
                btn.onmouseleave = () => btn.style.borderColor = '#555';

                btn.onclick = () => {
                   this.handleDialogueAction(opt.action);
                };
                choicesContainer.appendChild(btn);
            });
        }
    }

    _closeDialogue(box) {
        if(!box) return;
        box.classList.add('hidden');
        box.classList.remove('active');
        box.style.display = 'none'; 
    }

    handleDialogueAction(action) {
        const box = this.modals.dialogue;

        // Dispatch Global Event for Zones (Zone2 Puzzle, etc)
        document.dispatchEvent(new CustomEvent('dialogue-action', { detail: action }));

        // 1. Check if action is a function (Dynamic Callback)
        if (typeof action === 'function') {
            // Close first if standard action? No, let function decide.
            // But usually we close dialogue before custom action unless it's a chain.
            // Let's execute.
            this._closeDialogue(box); // Close by default for dynamic actions
            action();
            return; 
        }

        console.log(`[DIALOGUE ACTION] ${action}`);
        
        // Check if action triggers another dialogue from QuestData OR GameData
        let nextD = Dialogues[action] || GameDataDialogues[action];
        if (nextD) {
            this._renderDialogue(nextD.npc || "???", nextD.text, nextD.options);
            return;
        }

        if (action === 'ENTER_BOSS') {
             this._closeDialogue(box);
             gameState.changeState(GameStates.HUB);
             // Trigger Boss Fight Init via Event
             document.dispatchEvent(new CustomEvent('tigger-boss-marquis'));
        }
        else if (action === 'START_BOSS_FIGHT') {
             this._closeDialogue(box);
             gameState.changeState(GameStates.HUB);
             document.dispatchEvent(new CustomEvent('start-marquis-combat'));
        }
        else if (action === 'CLOSE') {
            this._closeDialogue(box);
            gameState.changeState(GameStates.HUB);
        }
        else if (action === 'QUEST_START_MQ01_STEP2') {
             // Specific event for Doc Intro Completion
             this._closeDialogue(box);
             gameState.changeState(GameStates.HUB); 
             gameState.setFlag('INTRO_DONE', true);
             
             // Notify Zone1 to remove walls
             document.dispatchEvent(new CustomEvent('doc-intro-complete'));
             
             // Update UI Objective
             this.updateObjective('FIND_ACCESS_CARD');
        }
        else if (action === 'ACTION_UPGRADE_SPELL') {
            if (gameState.upgradeSkill(50)) {
                 this._renderDialogue('Doc', "Voilà. Vos synapses crépitent comme il faut. Puissance magique accrue.", [{text: "Merci.", action: 'DOC_UPGRADE'}]);
            } else {
                 this._renderDialogue('Doc', "Vous n'avez pas assez de 'Scrap'. Allez fouiller les poubelles.", [{text: "Pff...", action: 'intro_doc_replay'}]);
            }
        }
        else if (action === 'ACTION_UPGRADE_DMG') {
            if (gameState.upgradeDmg(50)) {
                 this._renderDialogue('Doc', "Vos muscles artificiels sont surchargés. Vous frapperez plus fort.", [{text: "Excellent.", action: 'DOC_UPGRADE'}]);
            } else {
                 this._renderDialogue('Doc', "Pas de Scrap, pas de modification.", [{text: "J'ai compris.", action: 'intro_doc_replay'}]);
            }
        }
        else if (action === 'ACTION_UPGRADE_HP') {
            if (gameState.upgradeHealth(50)) {
                 this._renderDialogue('Doc', "Nanites de réparation injectés. Votre structure est renforcée.", [{text: "Je me sens mieux.", action: 'DOC_UPGRADE'}]);
            } else {
                 this._renderDialogue('Doc', "Votre solde est insuffisant. Revenez avec 50 Scrap.", [{text: "Dommage.", action: 'intro_doc_replay'}]);
            }
        }
        else if (action === 'QUEST_START_MQ01') {
            gameState.setFlag('MQ01_STARTED', true);
            this._closeDialogue(box);
            gameState.changeState(GameStates.HUB);
            console.log("Quête démarrée !");
        }
        else if (action === 'QUEST_COMPLETE_MQ01' || action === 'MQ01_END_VALIDATE') {
            gameState.setFlag('MQ01_COMPLETED', true);
            gameState.gainXp(100);
            this._closeDialogue(box);
            gameState.changeState(GameStates.HUB);
        }
    }
}
