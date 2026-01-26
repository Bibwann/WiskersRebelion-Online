// js/zones/HubZone.js
import { gameState, GameStates } from '../GameState.js';
import { PlayerController } from '../characters/PlayerController.js';
import { MainQuest, Dialogues } from '../data/QuestData.js';
import { VFXSystem } from '../vfx/VFXSystem.js';

export class HubZone {
    constructor(scene, assetFactory, uiManager) {
        this.scene = scene;
        this.assetFactory = assetFactory;
        this.uiManager = uiManager;
        this.vfx = new VFXSystem(scene);
        this.hero = null;
        this.playerController = null;
        
        // Setup Listener for movement managed by InputManager
        document.addEventListener('player-move-request', (e) => {
            if (this.playerController) {
                this.playerController.setMoveTarget(e.detail.position);
                this.vfx.createClickEffect(e.detail.position);
            }
        });

        this.setupQuestListeners();
    }

    enter() {
        console.log("Entering HUB Zone...");
        
        // Update Objective
        if(this.uiManager) this.uiManager.updateObjective('HUB_START');

        // 1. Create Environment
        this.assetFactory.createHubEnvironment();
        
        // VFX: Campfire (Moved further South to Safe Zone)
        this.vfx.createCampfire(new BABYLON.Vector3(0, 0.1, -15));

        // 2. Create Hero (Spawn South near Campfire)
        const playerClass = (gameState.playerData && gameState.playerData.classId) ? gameState.playerData.classId : 'FERRAILLEUR';
        this.hero = this.assetFactory.createHero(playerClass);
        this.hero.position = new BABYLON.Vector3(2, 0.5, -15); 

        // Init Controller
        this.playerController = new PlayerController(this.scene, this.hero);

        // CAMERA SETUP
        // Ensure we have a camera. Hub uses Orthographic.
        let cam = this.scene.activeCamera;
        if(!cam || cam.name === "tempCam") {
             // Create our standard ISO camera if missing or just temp
             cam = new BABYLON.FreeCamera("isoCam", new BABYLON.Vector3(-10, 10, -10), this.scene);
             cam.setTarget(BABYLON.Vector3.Zero());
             cam.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
             this.scene.activeCamera = cam;
        }

        // Configure Ortho
        cam.orthoTop = 8;
        cam.orthoBottom = -8;
        cam.orthoLeft = -14;
        cam.orthoRight = 14;
        // cam.position is already set above


        // 3. Create NPCs & Props
        this.createNPCs();
        this.createQuestItems();

        // 4. COMPANION (If unlocked in Zone 2)
        if(gameState.flags['COMPANION_ACTIVE']) {
             console.log("Spawning Ally Companion in HUB");
             const spawnPos = this.hero.position.clone().add(new BABYLON.Vector3(-1, 0, -1));
             this.companion = this.assetFactory.createCompanion(spawnPos);
             
             // Add Ally Icon (Persistence)
             const iconPlane = BABYLON.MeshBuilder.CreatePlane("allyIcon", {size: 0.8}, this.scene);
             iconPlane.parent = this.companion;
             iconPlane.position.y = 1.2;
             iconPlane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
             const iconMat = new BABYLON.StandardMaterial("allyIconMat", this.scene);
             iconMat.diffuseColor = new BABYLON.Color3(0, 1, 0); 
             iconMat.emissiveColor = new BABYLON.Color3(0, 1, 0);
             iconPlane.material = iconMat;

             this.companionFollowing = true;
        }

        // 5. Start Loop
        this.scene.onBeforeRenderObservable.add(this.update.bind(this));
    }

    exit() {
        this.scene.onBeforeRenderObservable.removeCallback(this.update.bind(this));
        // Cleanup happens via main.js clearing scene mostly
    }

    update() {
        const deltaTime = this.scene.getEngine().getDeltaTime() / 1000;
        
        // DEBUG: Ensure Doc is grounded
        /*
        const doc = this.scene.getMeshByName("npc_DOC");
        if(doc && doc.position.y < 0.5) {
             doc.position.y = 0.5;
        }
        */

        // Player Logic
        if(this.playerController) {
            this.playerController.update(deltaTime);
        }

        // COMPANION FOLLOW
        if(this.companionFollowing && this.companion && this.hero) {
            const dist = BABYLON.Vector3.Distance(this.companion.position, this.hero.position);
            if(dist > 2.5) {
                const dir = this.hero.position.subtract(this.companion.position);
                dir.y = 0; 
                dir.normalize();
                const speed = 5.0 * deltaTime; 
                this.companion.moveWithCollisions(dir.scale(speed));
                this.companion.lookAt(this.hero.position);
            }
        }

        // Camera Follow Logic
        if(this.hero && this.scene.activeCamera) {
            const targetX = this.hero.position.x - 10;
            const targetZ = this.hero.position.z - 10;
            const cam = this.scene.activeCamera;
            // Ensure Orthographic
            if(cam.mode !== BABYLON.Camera.ORTHOGRAPHIC_CAMERA) {
                cam.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
            }
            // Smooth Follow
            cam.position.x = BABYLON.Scalar.Lerp(cam.position.x, targetX, 0.08); 
            cam.position.z = BABYLON.Scalar.Lerp(cam.position.z, targetZ, 0.08);
        }
    }

    // --- Content Generation ---

    createNPCs() {
        // Doc (Le Biologiste) - MOVED NEAR FIRE (User Request)
        const doc = this.assetFactory.createNPC('DOC');
        doc.position = new BABYLON.Vector3(-3, 0.5, -15); // Left of Campfire
        this.addLabel(doc, "Doc", "yellow");

        // Mecano - PIT ENTRANCE (Far from doc)
        const mecano = this.assetFactory.createNPC('MECANO');
        mecano.position = new BABYLON.Vector3(4, 0.5, -4); 
        this.addLabel(mecano, "Mecano", "gray");
        
        // Felix (Tragic Soul) - THE PIT AREA (Now filled, so lift him up)
        const felix = this.assetFactory.createNPC('SURVIVANT'); 
        felix.position = new BABYLON.Vector3(0, 0.5, 0); // Corrected height from -2.5
        felix.metadata.id = 'FELIX'; 
        this.addLabel(felix, "Félix", "white");

        // Sarah (Grieving Mother) - FAR NORTH (Exit)
        const sarah = this.assetFactory.createNPC('BIOLOGISTE');
        sarah.position = new BABYLON.Vector3(5, 0.5, 20);
        sarah.metadata.id = 'SARAH';
        this.addLabel(sarah, "Sarah", "white");
        
        // --- PROPS FOR FLAVOR ---
        // (Handled by AssetFactory now: Desks in Lab, Crates near TPs)

        // The meshes 'tp_north', 'tp_south', 'tp_west', 'tp_east' are created by createHubEnvironment
        // We just need to register them or rely on the generic 'INTERACTABLE' system.
        // However, we want specific IDs.
        
        // This method createWarpZone is now deprecated if we use Visual TPs from AssetFactory
        // But for consistency let's ensure the logic hook exists.
    }

    createWarpZone(position, id, name, color) {
        // ... (Deprecated by new visuals but kept if needed for invisible triggers?)
    }

    addLabel(mesh, text, color) {
        // Placeholder for advanced GUI labels, for now just logic
        // In full impl, use Babylon GUI linked to mesh
    }

    // --- Quest System Integration ---

    createQuestItems() {
        // Decoder Item (Quest ID: MQ01) - Hidden in Shrine
        const decoder = BABYLON.MeshBuilder.CreateBox("decoder_item", {size: 0.4}, this.scene);
        decoder.position = new BABYLON.Vector3(12, 0.6, 7); 
        const mat = new BABYLON.StandardMaterial("decoderMat", this.scene);
        mat.emissiveColor = new BABYLON.Color3(0, 1, 1); // Cyan
        decoder.material = mat;
        decoder.metadata = { type: 'INTERACTABLE', id: 'DECODER_ITEM', name: 'Décodeur 56k' };
        
        // Hide if already collected
        if (gameState.getFlag('HAS_DECODER') || gameState.getFlag('MQ01_COMPLETED')) {
            decoder.setEnabled(false);
        }
        this.decoderMesh = decoder;
    }

    setupQuestListeners() {
        // Interaction Objets
        document.addEventListener('object-interaction', (e) => {
            const id = e.detail.objectId;
            const playerLevel = gameState.playerData.level;

            if(id === 'DECODER_ITEM') {
                if(gameState.getFlag('MQ01_STARTED')) {
                    gameState.setFlag('HAS_DECODER', true);
                    this.decoderMesh.dispose();
                    this.showDialogue('SYSTEM', "Vous avez trouvé le décodeur ! Retournez voir Doc.");
                } else {
                    this.showDialogue('SYSTEM', "Une vieille pièce électronique... Je devrais en parler à quelqu'un avant d'y toucher.");
                }
            }
            
            // Warps Logic (Supports both old ID style and new mesh names)
            else if (id && typeof id === 'string' && (id.startsWith('tp_') || id.startsWith('WARP_'))) {
                let destName = "Inconnue";
                let reqLevel = 1;
                let targetZoneId = null;

                if(id === 'tp_north' || id === 'WARP_ZONE1' || id === 'tp_zone1') { 
                    destName = "Zone 1: Les Égouts (Europe)"; 
                    reqLevel = 1; 
                    targetZoneId = 'ZONE1';
                }
                if(id === 'tp_east') { destName = "Zone 2: Maintenance (Niv. 3)"; reqLevel = 3; targetZoneId = 'ZONE2'; }
                if(id === 'tp_west' || id === 'WARP_ZONE3') { destName = "Zone 3: Ruines (Niv. 5)"; reqLevel = 5; }
                if(id === 'tp_south') { destName = "Sortie / Monde Extérieur"; reqLevel = 10; }

                this.showDialogue('SYSTEM', { 
                    text: `[PORTAIL] Destination: ${destName}\nNiveau requis: ${reqLevel}`, 
                    options: [
                        { text: "Entrer", action: () => {
                            const isDev = (gameState.playerData.classId === 'DEV');

                            // Check: If Zone 1 completed, block access (Skip for DEV)
                            if (!isDev && targetZoneId === 'ZONE1' && gameState.getFlag('ZONE1_COMPLETED')) {
                                document.dispatchEvent(new CustomEvent('show-dialogue', { detail: { 
                                    speaker: "ZONE SÉCURISÉE", 
                                    text: "Accès Verrouillé.\nLe Marquis a été éliminé. La zone est sous quarantaine par la Résistance.", 
                                    options: [{text: "Retourner au Hub", action: "CLOSE"}] 
                                }}));
                                return;
                            }

                            // CHECK: Must have finished Intro with Doc (Skip for DEV)
                            if (!isDev && targetZoneId === 'ZONE1' && !gameState.hasFlag('INTRO_DONE')) {
                                document.dispatchEvent(new CustomEvent('show-dialogue', { detail: { 
                                    speaker: "ACCÈS REFUSÉ", 
                                    text: "Accès bloque par protocoles de sécurité.\nVeuillez valider votre statut auprès du Dr. Aris.", 
                                    options: [{text: "Compris", action: "CLOSE"}] 
                                }}));
                                return;
                            }

                            if(isDev || gameState.playerData.level >= reqLevel) {
                                if(targetZoneId) {
                                    document.dispatchEvent(new CustomEvent('request-zone-change', { detail: { zoneId: targetZoneId } }));
                                } else {
                                    alert("Zone en construction !");
                                }
                            } else {
                                this.showDialogue('SYSTEM', "Niveau Insuffisant. Revenez plus tard.");
                            }
                        }},
                        { text: "Annuler", action: "CLOSE" }
                    ] 
                });
            }
        });

        // Interaction NPC
        document.addEventListener('npc-interaction', (e) => {
            const id = e.detail.npcId;
            if (id === 'DOC') {
               this.handleDocInteraction();
            } else if (id === 'MECANO') {
                this.showDialogue('MECANO', Dialogues['mecano_talk']);
            } else if (id === 'FELIX') {
                this.showDialogue('FÉLIX', Dialogues['felix_tragic']);
            } else if (id === 'SARAH') {
                this.showDialogue('SARAH', Dialogues['sarah_tragic']);
            }
        });
    }

    handleDocInteraction() {
        const hasFinishedIntro = gameState.hasFlag('INTRO_DONE'); 
        
        // 1. REPORT SUCCESS after ZONE 1
        if (gameState.getFlag('ZONE1_BOSS_DEAD')) {
            this.showDialogue('DOC', {
                text: "DOC: Vous êtes revenu... entier ? Les signaux vitaux du Marquis se sont éteints. Vous avez fait du bon travail, 'Ferrailleur'.\n\nJ'ai analysé les données de ses bottes. Elles contiennent des traces du signal lunaire.",
                options: [
                    { text: "Qu'est-ce qu'on fait maintenant ?", action: () => {
                        // Unset the pending flag to advance flow, sets new quest
                        gameState.setFlag('ZONE1_BOSS_DEAD', false); // Clear pending state
                        gameState.setFlag('ZONE1_REPORTED', true); // Mark handled
                        this.uiManager.updateObjective("Parler au Mécano (Zone 2)"); // Next objective
                        
                        // Trigger next lore dump immediately or require re-talk
                        this.showDialogue('DOC', Dialogues['post_quest_doc']);
                    }}
                ]
            });
            return;
        }

        // 2. Initial Intro
        if (!hasFinishedIntro) {
            this.showDialogue('DOC', Dialogues['intro_doc_start']);
        } 
        else {
            // Already talked, show standard menu or upgrade
            this.showDialogue('DOC', {
                text: "Encore vous ? N'oubliez pas: restez en mouvement. La mort est patiente.",
                options: [
                    { text: "Recalibrage (Compétences)", action: 'DOC_UPGRADE' },
                    { text: "Rappel: Qui suis-je ?", action: 'DOC_AWAKENING' },
                    { text: "Adieu.", action: 'CLOSE' }
                ]
            });
        }
    }

    showDialogue(speaker, data) {
        // Correct data handling directly
        let dialogueContent = data;
        
        // FIX: If data is undefined (lookup failed in Dialogues object), use fallback
        if (!dialogueContent) {
            console.warn(`Missing dialogue data for speaker ${speaker}`);
            dialogueContent = { text: "...", options: [{ text: "Fermer", action: "CLOSE" }] };
        }
        
        // If passed a string directly (legacy or quick debug)
        if (typeof data === 'string') {
            dialogueContent = { text: data, options: [{ text: "Continuer", action: "CLOSE" }] };
        }

        if(this.uiManager) {
             this.uiManager.showDialogue({ detail: { speaker, text: dialogueContent.text, options: dialogueContent.options }});
        } else {
             const evt = new CustomEvent('show-dialogue', { detail: { speaker, text: dialogueContent.text, options: dialogueContent.options } });
             gameState.changeState(GameStates.DIALOGUE); 
             document.dispatchEvent(evt); 
        }
    }
}
