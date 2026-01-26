// js/main.js
import { AssetFactory } from './AssetFactory.js';
import { UIManager } from './UIManager.js';
import { gameState, GameStates } from './GameState.js';
import { InputManager } from './InputManager.js';
import { HubZone } from './zones/HubZone.js';
import { Zone1 } from './zones/Zone1.js';
import { Zone2 } from './zones/Zone2.js';
import { BossZone } from './zones/BossZone.js';
import { CinematicSystem } from './CinematicSystem.js';
import { SettingsManager } from './SettingsManager.js';
import { Logger } from './Logger.js';

// --- Babylon Setup ---
const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);
let scene = null;
let camera = null;

// --- Systems ---
let assetFactory = null;
let uiManager = null;
let inputManager = null;
let currentZone = null;
let cinematicSystem = null;
let settingsManager = null;

const createScene = () => {
    const s = new BABYLON.Scene(engine);
    s.clearColor = new BABYLON.Color4(0, 0, 0, 1); // Black background

    // Camera Isom�trique Fixed
    camera = new BABYLON.FreeCamera("isoCam", new BABYLON.Vector3(-10, 10, -10), s);
    camera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
    camera.orthoLeft = -12;
    camera.orthoRight = 12;
    camera.orthoTop = 12;
    camera.orthoBottom = -12;
    camera.setTarget(BABYLON.Vector3.Zero());

    return s;
};

// --- Game Logic ---

function init() {
    Logger.init();
    Logger.log("Initializing Wiskers Rebellion...");
    scene = createScene();
    
    // Init Factories & Managers
    settingsManager = new SettingsManager();
    assetFactory = new AssetFactory(scene);
    uiManager = new UIManager(); 
    
    // Pass settings to InputManager so it can use custom keys
    inputManager = new InputManager(scene, canvas, settingsManager); 
    
    cinematicSystem = new CinematicSystem();

    // Init UI Options with Settings
    uiManager.initOptions(settingsManager);

    // Event Wiring
    document.addEventListener('request-intro', () => {
        // Hide Menu
        uiManager.hideAllScreens();
        
        // Play Intro
        cinematicSystem.playIntro(() => {
            // Check if we need Character Creation, for now go to Char Sheet as a "Creation" step or directly to Hub
            gameState.changeState(GameStates.CHARACTER_SHEET);
        });
    });

    document.addEventListener('game-start', () => {
        // Start in Hub
        loadZone('HUB');
        gameState.gainXp(0); 
    });

    // Zone Switch Event
    document.addEventListener('request-zone-change', (e) => {
        console.log("MAIN: Zone Request Received ->", e.detail);
        try {
            const zoneId = e.detail.zoneId;
            // Close any lingering UI (Dialogues hooks)
            if(uiManager) uiManager.hideAllScreens();
            
            // Return to gameplay state if we were in dialogue
            gameState.changeState(GameStates.HUB); // or generic PLAYING
            
            loadZone(zoneId);
        } catch (err) {
            console.error("MAIN: Error receiving zone change:", err);
        }
    });

    // Boot to Menu
    gameState.changeState(GameStates.MENU);


    // Render Loop
    engine.runRenderLoop(() => {
        scene.render();
    });
    
    // Resize
    window.addEventListener("resize", () => {
        engine.resize();
    });
}

function loadZone(zoneId) {
    console.log("Loading Zone: " + zoneId);

    // 1. Cleanup old zone
    if (currentZone) {
        currentZone.exit();
        // Disposing scene will handle asset cleanup better than clearEnvironment
        currentZone = null;
    }
    
    // Dispose old scene explicitly to free resources
    if (scene) {
        scene.dispose();
    }

    // 2. Create NEW Scene
    scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 1);
    
    // Create Temporary Camera (Prevents "No Camera" error during transition)
    const tempCam = new BABYLON.FreeCamera("tempCam", new BABYLON.Vector3(0, 10, -10), scene);
    tempCam.setTarget(BABYLON.Vector3.Zero());
    
    // 3. RE-INIT AssetFactory with NEW SCENE
    // Crucial: AssetFactory holds reference to 'scene'. We must update it.
    assetFactory = new AssetFactory(scene);
    
    // Also update Input Manager's scene
    if(inputManager) {
        inputManager.scene = scene; // Assuming inputManager has a setter or public prop
    }

    // 4. Init new zone
    switch(zoneId) {
        case 'HUB':
            currentZone = new HubZone(scene, assetFactory, uiManager);
            break;
        case 'ZONE1':
            currentZone = new Zone1(scene, assetFactory, uiManager);
            break;
        case 'ZONE2':
            currentZone = new Zone2(scene, assetFactory, uiManager);
            break;
        case 'BOSS_ZONE':
            currentZone = new BossZone(scene, assetFactory, uiManager);
            break;
        default:
            console.error("Unknown Zone ID:", zoneId);
            return;
    }

    // 5. Enter new zone
    currentZone.enter();
}

// Start the game
init();
