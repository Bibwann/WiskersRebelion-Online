// js/AssetFactory.js
import { SpriteFactory } from './SpriteFactory.js';

export class AssetFactory {
    constructor(scene) {
        this.scene = scene;
        this.spriteFactory = new SpriteFactory(scene);
        this.createMaterials();
    }

    createMaterials() {
        // --- TEXTURES PROCEDURALES ---
        
        // 1. Concrete (Dark & Dirty)
        const concreteTex = new BABYLON.DynamicTexture("concreteTex", 512, this.scene, true);
        const ctx = concreteTex.getContext();
        ctx.fillStyle = "#151515"; // Very Dark Grey
        ctx.fillRect(0,0,512,512);
        // Noise/Grunge
        for(let i=0; i<8000; i++) {
            ctx.fillStyle = `rgba(100,100,100,${Math.random() * 0.1})`;
            const s = Math.random() * 4;
            ctx.fillRect(Math.random()*512, Math.random()*512, s, s);
        }
        concreteTex.update();

        // 2. Rust (Metal)
        const rustTex = new BABYLON.DynamicTexture("rustTex", 512, this.scene, true);
        const rCtx = rustTex.getContext();
        rCtx.fillStyle = "#3e2723"; // Dark Brown
        rCtx.fillRect(0,0,512,512);
        for(let i=0; i<5000; i++) {
             rCtx.fillStyle = Math.random() > 0.5 ? "#5d4037" : "#4e342e";
             rCtx.fillRect(Math.random()*512, Math.random()*512, 8, 8);
        }
        rustTex.update();

        // --- MATERIALS ---
        
        // ENV
        this.concreteMat = new BABYLON.StandardMaterial("concrete", this.scene);
        this.concreteMat.diffuseTexture = concreteTex;
        this.concreteMat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);

        this.metalMat = new BABYLON.StandardMaterial("metal", this.scene);
        this.metalMat.diffuseTexture = rustTex;
        this.metalMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);

        this.neonCyanMat = new BABYLON.StandardMaterial("neonC", this.scene);
        this.neonCyanMat.emissiveColor = new BABYLON.Color3(0, 1, 1); // Cyan
        
        this.neonMagentaMat = new BABYLON.StandardMaterial("neonM", this.scene);
        this.neonMagentaMat.emissiveColor = new BABYLON.Color3(1, 0, 1); // Magenta

        // CHARACTERS (Legacy/Fallback)
        this.marquisMat = new BABYLON.StandardMaterial("marquisMat", this.scene);
        this.marquisMat.diffuseColor = new BABYLON.Color3(1, 0.5, 0); // Orange
    }

    createHero(classId = 'FERRAILLEUR') {
        const spriteMat = this.spriteFactory.createClassMaterial(classId);
        
        // Fix invisibility: Ensure material has alpha blend and backface culling off
        spriteMat.backFaceCulling = false;
        
        const hero = BABYLON.MeshBuilder.CreatePlane("hero", { width: 1, height: 1 }, this.scene);
        hero.position.y = 0.5; 
        hero.material = spriteMat;
        hero.checkCollisions = true;
        hero.ellipsoid = new BABYLON.Vector3(0.5, 0.5, 0.5); // Collision volume
        hero.ellipsoidOffset = new BABYLON.Vector3(0, 0.5, 0); 
        
        // Fix billboard mode for Isometric view
        // ORTHOGRAPHIC CAMERA FIX: 
        // With Ortho cameras, BILLBOARDMODE_ALL can sometimes cause the plane to disappear if it rotates parallel to the view.
        // We will try locking it to Y axis or fixing rotation manually if needed. 
        // For now, let's keep it simple: Face Camera but with constraints? 
        // Actually, for Top-Down Ortho, BILLBOARDMODE_Y is safer usually, or just rotated flat?
        // Let's try BILLBOARDMODE_Y and see if it persists. If not, we might need a fixed rotation X=45.
        hero.billboardMode = BABYLON.Mesh.BILLBOARDMODE_Y;
        
        // ALTERNATIVE: If billboard fails in Ortho, disable it and rotate 45 deg X.
        // hero.billboardMode = BABYLON.Mesh.BILLBOARDMODE_NONE;
        // hero.rotation.x = Math.PI / 4; 

        hero.metadata = { type: 'PLAYER' };
        
        // Add a STRONG light to the player for visibility
        const pLight = new BABYLON.PointLight("playerLight", new BABYLON.Vector3(0, 2, 0), this.scene);
        pLight.parent = hero;
        // Note: With Ortho Cam, intensity might need to be higher or attenuation different.
        // Let's boost it slightly more just in case.
        pLight.intensity = 2.0;
        pLight.range = 25;
        pLight.diffuse = new BABYLON.Color3(1, 0.95, 0.8);

        // REMOVED EXTRA VISUALS (Marker/Footglow) as per user request ("Trucs Dessus")
        return hero;
    }

    createNPC(npcType) {
        let classVisual = 'FERRAILLEUR';
        let npcName = 'Inconnu';

        if (npcType === 'DOC') {
            classVisual = 'BIOLOGISTE';
            npcName = 'Doc';
        } else if (npcType === 'MECANO') {
            classVisual = 'FERRAILLEUR';
            npcName = 'Mécano';
        } else if (npcType === 'HACKER') {
            classVisual = 'DISRUPTEUR';
            npcName = 'Hacker';
        }

        const spriteMat = this.spriteFactory.createClassMaterial(classVisual);
        spriteMat.backFaceCulling = false; // Fix visibility

        const npc = BABYLON.MeshBuilder.CreatePlane(`npc_${npcType}`, { width: 1, height: 1 }, this.scene);
        npc.position.y = 0.5;
        npc.material = spriteMat;
        // CORRECTION: ALL Axes ensuring visibility from top-down
        npc.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
        
        npc.metadata = { 
            type: 'NPC', 
            id: npcType, 
            name: npcName 
        };
        
        // Add light to NPC to ensure visibility
        const nLight = new BABYLON.PointLight(npcName+"_light", new BABYLON.Vector3(0, 1, 0), this.scene);
        nLight.parent = npc;
        nLight.intensity = 0.4;
        nLight.range = 3;
        nLight.diffuse = new BABYLON.Color3(1, 1, 1);

        return npc;
    }

    createMob(mobType) {
        let mesh = null;

        // --- NEW 3D MOBS (Zone 2) ---
        if (mobType === 'MOB_WELDER_BOT') {
            // Visual: Boxy Robot with Torch
            const body = BABYLON.MeshBuilder.CreateBox("welder_body", {width: 1, height: 1.5, depth: 1}, this.scene);
            body.position.y = 0.75;
            const mat = new BABYLON.StandardMaterial("welderMat", this.scene);
            mat.diffuseColor = new BABYLON.Color3(0.6, 0.3, 0.1); // Rust
            body.material = mat;
            
            // Torch Arm
            const arm = BABYLON.MeshBuilder.CreateCylinder("torch", {height: 1, diameter: 0.2}, this.scene);
            arm.rotation.x = Math.PI/2;
            arm.position = new BABYLON.Vector3(0.6, 0.8, 0.5);
            arm.parent = body;
            
            // Flame
            const flame = BABYLON.MeshBuilder.CreateSphere("flame", {diameter: 0.4}, this.scene);
            flame.position.y = 0.6;
            flame.parent = arm;
            const fMat = new BABYLON.StandardMaterial("fMat", this.scene);
            fMat.emissiveColor = new BABYLON.Color3(1, 0.5, 0); // Fire color
            flame.material = fMat;

            // Make flame flicker
            const anim = new BABYLON.Animation("flicker", "scaling", 30, BABYLON.Animation.ANIMATIONTYPE_VECTOR3, BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);
            anim.setKeys([{frame:0, value: new BABYLON.Vector3(1,1,1)}, {frame:5, value: new BABYLON.Vector3(1.2,1.2,1.2)}, {frame:10, value: new BABYLON.Vector3(0.8,0.8,0.8)}]);
            this.scene.beginDirectAnimation(flame, [anim], 0, 10, true);

            mesh = body;
            mesh.metadata = { type: 'MOB', id: mobType, name: "Robot Soudeur" };
            return mesh;
        }
        else if (mobType === 'MOB_CHEM_CAT') {
            // Visual: Cat with Green Backpack (Sphere + Box)
            const body = BABYLON.MeshBuilder.CreateSphere("chem_body", {diameter: 1}, this.scene);
            body.position.y = 0.5;
            const mat = new BABYLON.StandardMaterial("chemMat", this.scene);
            mat.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.2); // Dark Fur
            body.material = mat;

            // Backpack
            const pack = BABYLON.MeshBuilder.CreateBox("pack", {width: 0.6, height: 0.6, depth: 0.4}, this.scene);
            pack.position = new BABYLON.Vector3(0, 0.5, -0.4);
            pack.parent = body;
            const pMat = new BABYLON.StandardMaterial("pMat", this.scene);
            pMat.emissiveColor = new BABYLON.Color3(0, 1, 0); // Toxic Green
            pack.material = pMat;

            mesh = body;
            mesh.metadata = { type: 'MOB', id: mobType, name: "Chat Chimiste" };
            return mesh;
        }
        else if (mobType === 'MOB_CAMERADRONE') {
             const body = BABYLON.MeshBuilder.CreateSphere("drone", {diameter: 0.8}, this.scene);
             body.position.y = 1.5;
             const mat = new BABYLON.StandardMaterial("dMat", this.scene);
             mat.emissiveColor = new BABYLON.Color3(1, 0, 0); // Red Eye
             body.material = mat;
             
             // Propeller ring
             const ring = BABYLON.MeshBuilder.CreateTorus("ring", {diameter: 1.2, thickness: 0.1}, this.scene);
             ring.parent = body;
             
             mesh = body;
             mesh.metadata = { type: 'MOB', id: mobType, name: "Drone Séc." };
             return mesh;
        }

        // --- LEGACY SPRITE FALLBACK ---
        let classVisual = 'CAT';
        let mobName = 'Chat';
        let size = 0.8;

        if (mobType === 'CAT') {
             classVisual = 'CAT';
             mobName = 'Chat Errant';
        } else if (mobType === 'ROBOT') {
             classVisual = 'ROBOT';
             mobName = 'Sentinelle';
             size = 1.2;
        } else if (mobType === 'MARQUIS') {
             return this.createMarquis();
        }

        const spriteMat = this.spriteFactory.createClassMaterial(classVisual);
        spriteMat.backFaceCulling = false;

        // Cats are smaller
        const mob = BABYLON.MeshBuilder.CreatePlane(`mob_${mobType}`, { width: size, height: size }, this.scene);
        mob.position.y = size/2; // Lower center
        mob.material = spriteMat;
        mob.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
        
        mob.metadata = { 
            type: 'MOB', 
            id: mobType, 
            name: mobName 
        };

        return mob;
    }

    createValve(id) {
        const valveBase = BABYLON.MeshBuilder.CreateCylinder("valveBase_"+id, {height: 0.1, diameter: 0.8}, this.scene);
        valveBase.material = this.metalMat;
        
        const valveHandle = BABYLON.MeshBuilder.CreateTorus("valveHandle_"+id, {diameter: 0.6, thickness: 0.1}, this.scene);
        valveHandle.parent = valveBase;
        valveHandle.position.y = 0.2; // Higher to be visible
        
        const handleMat = new BABYLON.StandardMaterial("valveMat_"+id, this.scene);
        handleMat.diffuseColor = new BABYLON.Color3(1, 0, 0); // Red = Closed
        handleMat.emissiveColor = new BABYLON.Color3(0.3, 0, 0);
        valveHandle.material = handleMat;

        // Group for collisions/selection
        // Make BOTH interactable so clicking anywhere works
        valveHandle.metadata = { type: 'INTERACTABLE', subtype: 'VALVE', id: id };
        valveBase.metadata = { type: 'INTERACTABLE', subtype: 'VALVE', id: id };
        
        valveBase.checkCollisions = true; 
        
        // Add a highlight light
        const light = new BABYLON.PointLight("light_"+id, new BABYLON.Vector3(0, 1, 0), this.scene);
        light.parent = valveBase;
        light.diffuse = new BABYLON.Color3(1, 0.2, 0); // Red warning light
        light.intensity = 0.8;
        light.range = 3;

        return valveBase; 
    }

    createGate() {
        // Big Gate
        const gate = BABYLON.MeshBuilder.CreateBox("gate", {width: 10, height: 8, depth: 1}, this.scene);
        gate.material = this.metalMat;
        gate.checkCollisions = true;
        gate.metadata = { type: 'OBSTACLE', name: 'Sewers Gate' };
        
        // Bars visual
        const bars = new BABYLON.StandardMaterial("bars", this.scene);
        bars.diffuseTexture = new BABYLON.DynamicTexture("barsTex", 512, this.scene, true);
        const ctx = bars.diffuseTexture.getContext();
        ctx.fillStyle = "#333"; ctx.fillRect(0,0,512,512);
        ctx.fillStyle = "#111"; 
        for(let i=0; i<512; i+=64) ctx.fillRect(i, 0, 10, 512); // Vertical bars
        bars.diffuseTexture.update();
        gate.material = bars;

        return gate;
    }

    createLoreTablet() {
        const tablet = BABYLON.MeshBuilder.CreateBox("tablet", {width: 0.8, height: 1, depth: 0.1}, this.scene);
        tablet.rotation.x = -Math.PI / 4; // Tilted
        
        const mat = new BABYLON.StandardMaterial("tabletMat", this.scene);
        mat.emissiveColor = new BABYLON.Color3(0, 0.5, 1); // Glowing Blue
        tablet.material = mat;

        // Pedestal
        const pedestal = BABYLON.MeshBuilder.CreateCylinder("pedestal", {height: 1.2, diameter: 0.4}, this.scene);
        pedestal.position.y = -0.6;
        pedestal.material = this.concreteMat;
        pedestal.parent = tablet;

        return tablet;
    }

    clearEnvironment() {
        console.log("Clearing Environment...");
        
        // Stop Loop
        // Note: Scene dispose in main.js will kill the loop, but good to be safe.
        
        // Dispose meshes manually to ensure clean state
        // Use a reverse loop for safer removal or while loop
        while(this.scene.meshes.length > 0) {
            this.scene.meshes[0].dispose();
        }
        
        // Cleanup Lights
        while(this.scene.lights.length > 0) {
            this.scene.lights[0].dispose();
        }
    }

    createMarquis() {
        console.log("Creating Boss: Marquis de Botté");
        
        // --- MARQUIS: PUSS IN BOOTS STYLE ---
        // 1. Body (Orange Tabby)
        const body = BABYLON.MeshBuilder.CreateCylinder("body", { height: 1.0, diameter: 0.7 }, this.scene);
        body.position.y = 0.5;
        const furMat = new BABYLON.StandardMaterial("fur", this.scene);
        furMat.diffuseColor = new BABYLON.Color3(1, 0.5, 0); // Orange
        body.material = furMat;

        // 2. Head
        const head = BABYLON.MeshBuilder.CreateSphere("head", { diameter: 0.8 }, this.scene);
        head.position.y = 1.0;
        head.parent = body;
        head.material = furMat;
        
        // 3. The Hat (Huge feathered hat)
        const hatBrim = BABYLON.MeshBuilder.CreateCylinder("hatBrim", { height: 0.05, diameter: 1.5 }, this.scene);
        hatBrim.position.y = 0.3;
        hatBrim.parent = head;
        const hatMat = new BABYLON.StandardMaterial("hat", this.scene);
        hatMat.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.1); // Black Velvet
        hatBrim.material = hatMat;

        const hatTop = BABYLON.MeshBuilder.CreateCylinder("hatTop", { height: 0.6, diameter: 0.7 }, this.scene);
        hatTop.position.y = 0.3;
        hatTop.parent = hatBrim;
        hatTop.material = hatMat;

        const feather = BABYLON.MeshBuilder.CreateBox("feather", { width: 0.1, height: 1.2, depth: 0.4 }, this.scene);
        feather.position = new BABYLON.Vector3(0.5, 0.5, 0);
        feather.rotation.z = -Math.PI / 4;
        feather.parent = hatTop;
        const featherMat = new BABYLON.StandardMaterial("feather", this.scene);
        featherMat.diffuseColor = new BABYLON.Color3(1, 0, 0); // Red Feather
        feather.material = featherMat;

        // 4. The Cape
        const cape = BABYLON.MeshBuilder.CreateBox("cape", { width: 1.2, height: 1.2, depth: 0.1 }, this.scene);
        cape.position = new BABYLON.Vector3(0, 0.2, -0.4);
        cape.rotation.x = 0.2;
        cape.parent = body;
        const capeMat = new BABYLON.StandardMaterial("cape", this.scene);
        capeMat.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.1); // Black
        cape.material = capeMat;

        // 5. The Boots
        const bootL = BABYLON.MeshBuilder.CreateCylinder("bootL", { height: 0.5, diameter: 0.35 }, this.scene);
        bootL.position = new BABYLON.Vector3(-0.2, -0.5, 0); // Relative to body center 0.5
        bootL.parent = body;
        const leatherMat = new BABYLON.StandardMaterial("leather", this.scene);
        leatherMat.diffuseColor = new BABYLON.Color3(0.2, 0.1, 0); // Dark Leather
        bootL.material = leatherMat;

        const bootR = BABYLON.MeshBuilder.CreateCylinder("bootR", { height: 0.5, diameter: 0.35 }, this.scene);
        bootR.position = new BABYLON.Vector3(0.2, -0.5, 0);
        bootR.parent = body;
        bootR.material = leatherMat;

        // 6. The Rapier
        const handle = BABYLON.MeshBuilder.CreateCylinder("handle", { height: 0.4, diameter: 0.05 }, this.scene);
        handle.position = new BABYLON.Vector3(0.5, 0, 0.4);
        handle.rotation.x = Math.PI / 2;
        handle.parent = body;
        
        const blade = BABYLON.MeshBuilder.CreateCylinder("blade", { height: 1.5, diameter: 0.02 }, this.scene);
        blade.position.y = 0.75; // Extending from handle
        blade.parent = handle;
        const steelMat = new BABYLON.StandardMaterial("steel", this.scene);
        steelMat.emissiveColor = new BABYLON.Color3(0.8, 0.8, 1); // Electric Blue Glow
        blade.material = steelMat;

        // Metadata
        body.metadata = { type: 'ENEMY', id: 'MARQUIS' };
        
        return body;
    }


    createHubEnvironment() {
        console.log("Generating 'Le Terrier' Environment...");

        // 1. LIGHTING
        const hLight = new BABYLON.HemisphericLight("ambient", new BABYLON.Vector3(0, 1, 0), this.scene);
        hLight.intensity = 0.3; 
        hLight.groundColor = new BABYLON.Color3(0.05, 0.05, 0.1); 

        // 2. ARCHITECTURE
        const tunnelLength = 60;
        const tunnelWidth = 14;

        // --- VOID FIX: Base Plane lower down ---
        const baseGround = BABYLON.MeshBuilder.CreateGround("baseGround", { width: 100, height: 100 }, this.scene);
        baseGround.position.y = -3; // Below pit
        baseGround.position.x = 0;
        baseGround.position.z = 0;
        baseGround.material = this.concreteMat; // Or separate dark mat
        baseGround.isPickable = false;

        // A. Main Floors
        const floorSouth = BABYLON.MeshBuilder.CreateGround("floorS", { width: tunnelWidth, height: 25 }, this.scene);
        floorSouth.position.z = -17.5;
        floorSouth.material = this.concreteMat;
        floorSouth.metadata = { type: 'GROUND' };

        const floorNorth = BABYLON.MeshBuilder.CreateGround("floorN", { width: tunnelWidth, height: 25 }, this.scene);
        floorNorth.position.z = 17.5;
        floorNorth.material = this.concreteMat;
        floorNorth.metadata = { type: 'GROUND' };

        // B. Walkways & Pit -> NOW FILLED
        const walkL = BABYLON.MeshBuilder.CreateGround("walkL", { width: 3, height: 10 }, this.scene);
        walkL.position.x = -5.5; walkL.position.z = 0;
        walkL.material = this.concreteMat;
        walkL.metadata = { type: 'GROUND' };

        const walkR = BABYLON.MeshBuilder.CreateGround("walkR", { width: 3, height: 10 }, this.scene);
        walkR.position.x = 5.5; walkR.position.z = 0;
        walkR.material = this.concreteMat;
        walkR.metadata = { type: 'GROUND' };

        // FILL THE HOLE (Replaces Pit)
        const pitFill = BABYLON.MeshBuilder.CreateGround("pitFill", { width: 8, height: 10 }, this.scene);
        pitFill.position.y = 0; // Level with floor
        pitFill.position.z = 0;
        pitFill.material = this.metalMat; // Keep texture for variety
        pitFill.metadata = { type: 'GROUND' };

        /* REMOVED DEEP PIT 
        const pit = BABYLON.MeshBuilder.CreateGround("pit", { width: 8, height: 10 }, this.scene);
        pit.position.y = -2.5; pit.position.z = 0;
        pit.material = this.metalMat;
        pit.metadata = { type: 'GROUND' };
        */

        // Ramp (Optional since flat now, but kept as decor plate)
        const ramp = BABYLON.MeshBuilder.CreateGround("ramp", { width: 2, height: 6 }, this.scene);
        ramp.position.z = -5; ramp.position.y = 0.01; // Just a plate on top
        ramp.material = this.metalMat;
        ramp.metadata = { type: 'GROUND' };

        // C. SIDE ROOM (The Lab)
        // Floor
        const sideRoom = BABYLON.MeshBuilder.CreateGround("sideRoom", { width: 15, height: 10 }, this.scene);
        sideRoom.position.x = -12; sideRoom.position.z = -20; 
        sideRoom.material = this.metalMat;
        sideRoom.metadata = { type: 'GROUND' };

        // Connector
        const connector = BABYLON.MeshBuilder.CreateGround("connector", { width: 5, height: 6 }, this.scene);
        connector.position.x = -7; connector.position.z = -20;
        connector.material = this.concreteMat;
        connector.metadata = { type: 'GROUND' };

        // Walls for Lab
        const wallH = 6;
        // West (Back) - LOWERED per user request ("en bas aussi")
        const wallLabW = BABYLON.MeshBuilder.CreateBox("wallLabW", {width: 1, height: 1, depth: 10}, this.scene);
        wallLabW.position = new BABYLON.Vector3(-19.5, 0.5, -20);
        wallLabW.material = this.concreteMat;
        
        // North (Top) - Keep High
        const wallLabN = BABYLON.MeshBuilder.CreateBox("wallLabN", {width: 15, height: wallH, depth: 1}, this.scene);
        wallLabN.position = new BABYLON.Vector3(-12, wallH/2, -15);
        wallLabN.material = this.concreteMat;
        
        // South (Bottom) - LOWERED
        const wallLabS = BABYLON.MeshBuilder.CreateBox("wallLabS", {width: 15, height: 1, depth: 1}, this.scene);
        wallLabS.position = new BABYLON.Vector3(-12, 0.5, -25); 
        wallLabS.material = this.concreteMat;

        // D. PROPS & LIFE
        // Lab Desk
        const desk = BABYLON.MeshBuilder.CreateBox("desk", {width: 3, height: 1.2, depth: 1.5}, this.scene);
        desk.position = new BABYLON.Vector3(-15, 0.6, -18);
        desk.material = this.metalMat;
        // Computers
        const pc = BABYLON.MeshBuilder.CreateBox("pc", {width: 0.8, height: 0.6, depth: 0.5}, this.scene);
        pc.position = new BABYLON.Vector3(-15, 1.3, -18);
        pc.material = this.neonCyanMat;

        // Portal Frame (West end, near TP)
        const frame = BABYLON.MeshBuilder.CreateTorus("frame", {diameter: 4, thickness: 0.4, tessellation: 16}, this.scene);
        frame.position = new BABYLON.Vector3(-18, 2, -20);
        frame.rotation.y = Math.PI/2;
        frame.material = this.neonCyanMat;

        // E. TUNNEL WALLS (Pillars on BOTH sides for visibility)
        for(let z = -tunnelLength/2; z <= tunnelLength/2; z+=10) {
             // Skip wall at connector Z (-20)
             if (z === -20) continue; 
             
             // Left Pillar - LOWERED for Camera Visibility (Isometric View)
             const pillarL = BABYLON.MeshBuilder.CreateBox("pillarL", {width: 0.8, height: 1.5, depth: 0.8}, this.scene);
             pillarL.position.x = -tunnelWidth/2;
             pillarL.position.y = 0.75;
             pillarL.position.z = z;
             pillarL.material = this.concreteMat;
             pillarL.isPickable = false;

             // Right Pillar (Changed from solid wall to pillars per "visibility" logic)
             const pillarR = BABYLON.MeshBuilder.CreateBox("pillarR", {width: 0.8, height: wallH, depth: 0.8}, this.scene);
             pillarR.position.x = tunnelWidth/2;
             pillarR.position.y = wallH/2;
             pillarR.position.z = z;
             pillarR.material = this.concreteMat;
             pillarR.isPickable = false;
        }

        // F. TELEPORTERS (Visual Markers + Props)
        this.createTeleporterVisuals(tunnelWidth);

        // CAMPFIRE
        // Fix Void Gap: Add specific ground patch under fire
        const firePatch = BABYLON.MeshBuilder.CreateGround("firePatch", { width: 8, height: 8 }, this.scene);
        firePatch.position = new BABYLON.Vector3(0, 0.05, -15); 
        firePatch.material = this.metalMat;
        firePatch.metadata = { type: 'GROUND' };
        
        this.createCampfire(); 

        // Ceiling Arches
        for(let z = -tunnelLength/2; z < tunnelLength/2; z+=10) {
            const arch = BABYLON.MeshBuilder.CreateTorus("arch", { diameter: tunnelWidth*1.1, thickness: 0.5, tessellation: 16 }, this.scene);
            arch.position.z = z;
            arch.position.y = wallH;
            arch.rotation.x = Math.PI/2;
            arch.scaling.y = 0.5;
            arch.material = this.metalMat;
        }

        this.createSkybox();
    }

    createSkybox() {
        const skybox = BABYLON.MeshBuilder.CreateBox("skyBox", { size: 3000.0 }, this.scene);
        const skyboxMaterial = new BABYLON.StandardMaterial("skyBox", this.scene);
        skyboxMaterial.backFaceCulling = false;
        
        // Dark purple/city gradient simulation via emissive since we don't have textures yet
        skyboxMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
        skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
        // Create a procedural gradient texture or just dark color
        skyboxMaterial.emissiveColor = new BABYLON.Color3(0.02, 0.02, 0.05); // Deep dark blue/purple
        
        skybox.material = skyboxMaterial;
        
        // FOG
        this.scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
        this.scene.fogDensity = 0.02;
        this.scene.fogColor = new BABYLON.Color3(0.02, 0.02, 0.05);
    }

    createEnvironmentZone2() {
        console.log("Generating Zone 2: The Complex (Architectural)");
        
        // FOG & ATMOSPHERE
        this.scene.fogMode = BABYLON.Scene.FOGMODE_EXP;
        this.scene.fogColor = new BABYLON.Color3(0.05, 0.1, 0.15); // Dark Blue/Teal Industrial
        this.scene.fogDensity = 0.01;
        
        // AMBIENT LIGHT
        const hLight = new BABYLON.HemisphericLight("ambient", new BABYLON.Vector3(0, 1, 0), this.scene);
        hLight.intensity = 0.4;
        hLight.groundColor = new BABYLON.Color3(0, 0, 0);

        // --- ROOM CONFIGURATION ---
        // 1. ARRIVAL DOCK (South) [Start]
        this.createRoom(0, 0, 20, 20, ['N']);
        this.createPropCluster(0, 0, 'CRATES');
        
        // 2. MAIN CORRIDOR (Connecting Hub)
        this.createRoom(0, 25, 10, 30, ['S', 'N', 'W', 'E']);
        // Add lights in corridor
        const l1 = new BABYLON.PointLight("cors_l", new BABYLON.Vector3(0, 5, 25), this.scene);
        l1.diffuse = new BABYLON.Color3(1, 1, 0.8); l1.intensity = 0.5;

        // 3. STORAGE BAY (West) [Combat]
        this.createRoom(-25, 25, 30, 20, ['E']);
        this.createPropCluster(-25, 25, 'MIXED');
        
        // 4. CONTROL ROOM (East) [Puzzle]
        this.createRoom(25, 25, 30, 20, ['W']);
        // Puzzle Console
        const consoleMesh = BABYLON.MeshBuilder.CreateBox("puzzle_console", {width: 2, height: 1.5, depth: 1}, this.scene);
        consoleMesh.position = new BABYLON.Vector3(30, 0.75, 25);
        consoleMesh.material = this.neonCyanMat;
        consoleMesh.rotation.y = -Math.PI/2; // Face Room
        consoleMesh.metadata = { type: 'INTERACTABLE', id: 'CONSOLE_PUZZLE', name: "Contrôle Température" };
        
        // Decal/Hint on Wall: "Sequence: FROID -> AMBIANT -> CHAUD"
        // Represented by colored lights or props
        this.createLightOrb(30, 20, new BABYLON.Color3(0,0,1)); // Blue
        this.createLightOrb(30, 25, new BABYLON.Color3(0,1,0)); // Green
        this.createLightOrb(30, 30, new BABYLON.Color3(1,0,0)); // Red

        // 5. BOSS CHAMBER (North) [Exit]
        // CRITICAL FIX: Add 'N' to openings to prevent generating a solid wall blocking the Gate/Exit
        this.createRoom(0, 55, 30, 30, ['S', 'N']);
        // Exit Gate
        this.createGateFrame(0, 68);

        // --- PUZZLE COMPONENTS ---
        // Valve 1 (West Storage)
        const v1 = this.createValve("VALVE_1");
        v1.position = new BABYLON.Vector3(-35, 0.5, 20); // Hidden in corner
        
        // Valve 2 (Corridor Niche) - Needs a small niche? Or just place it.
        // Let's put it on the East Bridge side or near the Acid.
        // Put it in the East Room but far from console.
        const v2 = this.createValve("VALVE_2");
        v2.position = new BABYLON.Vector3(35, 0.5, 30);

        // --- CONNECTORS (BRIDGES) ---
        // South -> Main (Gap: Z=10 to Z=10 match is OK. Room1 Top Z=10, Room2 Bot Z=10)
        
        // Main -> West (Gap: X=-5 to X=-10) - Width 5, Length is Corridor Height part?
        // Room2 West opening is central Z=25. Let's make a bridge:
        // Center: X = -7.5 (Midpoint -5 & -10), Z=25.
        // Size: Width 5, Depth 8.
        this.createCorridorBridge(-7.5, 25, 5, 8, true);

        // Main -> East (Gap: X=5 to X=10)
        // Center: X = 7.5, Z=25.
        this.createCorridorBridge(7.5, 25, 5, 8, true);
        
        // --- PHASE 2 EXPANSION (New Rooms) ---
        // 6. PUZZLE CORRIDOR (Beyond Boss Chamber)
        this.createCorridorBridge(0, 78, 5, 10, true); // Bridge from Boss Chamber North
        
        // 7. THE PUZZLE LAB (Room 3)
        this.createRoom(0, 95, 25, 25, ['S', 'N']);
        this.createPropCluster(0, 95, 'MIXED');
        // Add a "Force Field" visual at North exit?
        
        // 8. BRIDGE OF TRIALS
        this.createCorridorBridge(0, 115, 6, 15, true); 
        
        // 9. FINAL SANCTUM (Boss 2)
        this.createRoom(0, 140, 40, 40, ['S']);
        // Final Exit Portal
        const portal = BABYLON.MeshBuilder.CreateTorus("final_portal", {diameter: 6, thickness: 1}, this.scene);
        portal.position = new BABYLON.Vector3(0, 2, 155);
        portal.rotation.x = Math.PI/2;
        portal.material = this.neonCyanMat;
        portal.metadata = { type: 'INTERACTABLE', id: 'FINAL_EXIT_Z2', name: 'Portail de Transition' };


        // --- DECOR ---
        this.createSkybox();
    }

    createCompanion(pos) {
        // Create a floating drone/bot
        const body = BABYLON.MeshBuilder.CreateSphere("companion_body", {diameter: 0.8}, this.scene);
        body.position = pos.clone();
        body.material = this.neonCyanMat;
        
        // Eye
        const eye = BABYLON.MeshBuilder.CreateSphere("companion_eye", {diameter: 0.3}, this.scene);
        eye.parent = body;
        eye.position.z = 0.35;
        eye.position.y = 0.1;
        const eyeMat = new BABYLON.StandardMaterial("compEye", this.scene);
        eyeMat.emissiveColor = new BABYLON.Color3(1, 1, 0);
        eye.material = eyeMat;
        
        // Orbitals
        const ring = BABYLON.MeshBuilder.CreateTorus("companion_ring", {diameter: 1.2, thickness: 0.05}, this.scene);
        ring.parent = body;
        
        // Collisions
        body.checkCollisions = true;
        body.ellipsoid = new BABYLON.Vector3(0.5, 0.5, 0.5);
        
        // Metadata
        body.metadata = { type: 'INTERACTABLE', subtype: 'NPC', id: 'COMPANION', name: 'BD-1 (Inactif)' };
        
        // Idle Animation
        const anim = new BABYLON.Animation("float", "position.y", 30, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);
        const keys = [{frame: 0, value: pos.y}, {frame: 30, value: pos.y + 0.2}, {frame: 60, value: pos.y}];
        anim.setKeys(keys);
        body.animations.push(anim);
        this.scene.beginAnimation(body, 0, 60, true);
        
        return body;
    }

    createCorridorBridge(x, z, sizeX, sizeZ, hasRailings) {
        // Floor
        const floor = BABYLON.MeshBuilder.CreateGround("bridge_"+x+"_"+z, {width: sizeX, height: sizeZ}, this.scene);
        floor.position = new BABYLON.Vector3(x, 0.05, z);
        floor.material = this.metalMat; // Grating look
        floor.metadata = { type: 'GROUND' };
        
        if(hasRailings) {
            // Assume bridge runs Main Axis X (Connecting East/West) -> Rails on Z edges (Top/Bot)
            // Wait, if connecting East/West, the walkway travels along X.
            // So railings should be at Z + sizeZ/2 and Z - sizeZ/2.
            
            const railH = 1.2;
            const railThick = 0.1;
            
            // North Rail
            const rN = BABYLON.MeshBuilder.CreateBox("railN", {width: sizeX, height: railH, depth: railThick}, this.scene);
            rN.position = new BABYLON.Vector3(x, railH/2, z + sizeZ/2);
            rN.material = this.metalMat;
            
            // South Rail
            const rS = BABYLON.MeshBuilder.CreateBox("railS", {width: sizeX, height: railH, depth: railThick}, this.scene);
            rS.position = new BABYLON.Vector3(x, railH/2, z - sizeZ/2);
            rS.material = this.metalMat;
        }
    }

    createRoom(x, z, width, depth, openings = []) {
        // Floor
        const floor = BABYLON.MeshBuilder.CreateGround("floor_"+x+"_"+z, {width: width, height: depth}, this.scene);
        floor.position = new BABYLON.Vector3(x, 0.05, z);
        floor.material = this.concreteMat;
        floor.metadata = { type: 'GROUND' };
        floor.checkCollisions = true;

        const wallH = 6;
        const wallThick = 1;
        const halfW = width/2;
        const halfD = depth/2;

        // Helper to create wall segment
        const makeWall = (name, boxW, boxD, posX, posZ) => {
            const w = BABYLON.MeshBuilder.CreateBox(name, {width: boxW, height: wallH, depth: boxD}, this.scene);
            w.position = new BABYLON.Vector3(posX, wallH/2, posZ);
            w.material = this.metalMat; // Industrial Metal Walls
            w.checkCollisions = true;
            w.metadata = { type: 'WALL' };
        };

        // NORTH
        if(openings.includes('N')) {
             // Split wall for door (assuming width 10 opening)
             const doorW = 8;
             const segW = (width - doorW) / 2;
             if(segW > 0) {
                makeWall("wN_L", segW, wallThick, x - halfW + segW/2, z + halfD);
                makeWall("wN_R", segW, wallThick, x + halfW - segW/2, z + halfD);
                // Header
                const head = BABYLON.MeshBuilder.CreateBox("wN_H", {width: doorW, height: 2, depth: wallThick}, this.scene);
                head.position = new BABYLON.Vector3(x, wallH-1, z + halfD);
                head.material = this.metalMat;
             }
        } else {
             makeWall("wN", width, wallThick, x, z + halfD);
        }

        // SOUTH
        if(openings.includes('S')) {
             const doorW = 8;
             const segW = (width - doorW) / 2;
             if(segW > 0) {
                makeWall("wS_L", segW, wallThick, x - halfW + segW/2, z - halfD);
                makeWall("wS_R", segW, wallThick, x + halfW - segW/2, z - halfD);
                // Header
                const head = BABYLON.MeshBuilder.CreateBox("wS_H", {width: doorW, height: 2, depth: wallThick}, this.scene);
                head.position = new BABYLON.Vector3(x, wallH-1, z - halfD);
                head.material = this.metalMat;
             }
        } else {
             makeWall("wS", width, wallThick, x, z - halfD);
        }

        // EAST
        if(openings.includes('E')) {
             const doorW = 8;
             const segD = (depth - doorW) / 2;
             if(segD > 0) {
                makeWall("wE_L", wallThick, segD, x + halfW, z - halfD + segD/2);
                makeWall("wE_R", wallThick, segD, x + halfW, z + halfD - segD/2);
                // Header
                const head = BABYLON.MeshBuilder.CreateBox("wE_H", {width: wallThick, height: 2, depth: doorW}, this.scene);
                head.position = new BABYLON.Vector3(x + halfW, wallH-1, z);
                head.material = this.metalMat;
             }
        } else {
             makeWall("wE", wallThick, depth, x + halfW, z);
        }

        // WEST
        if(openings.includes('W')) {
             const doorW = 8;
             const segD = (depth - doorW) / 2;
             if(segD > 0) {
                makeWall("wW_L", wallThick, segD, x - halfW, z - halfD + segD/2);
                makeWall("wW_R", wallThick, segD, x - halfW, z + halfD - segD/2);
                 // Header
                const head = BABYLON.MeshBuilder.CreateBox("wW_H", {width: wallThick, height: 2, depth: doorW}, this.scene);
                head.position = new BABYLON.Vector3(x - halfW, wallH-1, z);
                head.material = this.metalMat;
             }
        } else {
             makeWall("wW", wallThick, depth, x - halfW, z);
        }
    }

    createPropCluster(x, z, type) {
        if(type === 'CRATES') {
            for(let i=0; i<10; i++) {
                this.createCrateStack(x + (Math.random()*10 - 5), z + (Math.random()*10 - 5));
            }
        } else if (type === 'MIXED') {
            for(let i=0; i<8; i++) {
                if(Math.random()>0.5) this.createBarrel(x + (Math.random()*10 - 5), z + (Math.random()*10 - 5));
                else this.createCrateStack(x + (Math.random()*10 - 5), z + (Math.random()*10 - 5));
            }
        }
    }

    createLightOrb(x, z, color) {
        const sphere = BABYLON.MeshBuilder.CreateSphere("orb", {diameter: 0.5}, this.scene);
        sphere.position = new BABYLON.Vector3(x, 2, z);
        const mat = new BABYLON.StandardMaterial("orbMat", this.scene);
        mat.emissiveColor = color;
        sphere.material = mat;
        
        const light = new BABYLON.PointLight("orbLight", sphere.position, this.scene);
        light.diffuse = color;
        light.intensity = 0.8;
        light.range = 5;
    }

    createCrateStack(x, z) {
        const h = Math.floor(Math.random() * 3) + 1;
        for(let i=0; i<h; i++) {
            const box = BABYLON.MeshBuilder.CreateBox("crate", {size: 1.2}, this.scene);
            box.position = new BABYLON.Vector3(x, 0.6 + (i*1.2), z);
            box.rotation.y = Math.random() * 0.5;
            box.material = this.concreteMat; // Reuse concrete for industrial look or create wood
            box.checkCollisions = true;
            box.metadata = { type: 'OBSTACLE' };
        }
    }

    createBarrel(x, z) {
        const barrel = BABYLON.MeshBuilder.CreateCylinder("barrel", {height: 1.5, diameter: 1}, this.scene);
        barrel.position = new BABYLON.Vector3(x, 0.75, z);
        const mat = new BABYLON.StandardMaterial("barrelMat", this.scene);
        mat.diffuseColor = new BABYLON.Color3(0.3, 0.4, 0.3); // Olive Green
        barrel.material = mat;
        barrel.checkCollisions = true;
        barrel.metadata = { type: 'OBSTACLE' };
    }

    createBridge(x, z) {
        const bridge = BABYLON.MeshBuilder.CreateGround("bridge", {width: 8, height: 22}, this.scene);
        bridge.position = new BABYLON.Vector3(x, 0.2, z);
        bridge.material = this.metalMat;
        bridge.metadata = { type: 'GROUND' }; // Walkable

        // Railings
        const railL = BABYLON.MeshBuilder.CreateBox("railL", {width: 0.2, height: 1, depth: 22}, this.scene);
        railL.position = new BABYLON.Vector3(x - 3.8, 0.5, z);
        const railR = BABYLON.MeshBuilder.CreateBox("railR", {width: 0.2, height: 1, depth: 22}, this.scene);
        railR.position = new BABYLON.Vector3(x + 3.8, 0.5, z);
    }

    createGateFrame(x, z) {
        // Frame
        const frameL = BABYLON.MeshBuilder.CreateBox("frameL", {width: 2, height: 8, depth: 2}, this.scene);
        frameL.position = new BABYLON.Vector3(x - 5, 4, z);
        
        const frameR = BABYLON.MeshBuilder.CreateBox("frameR", {width: 2, height: 8, depth: 2}, this.scene);
        frameR.position = new BABYLON.Vector3(x + 5, 4, z);
        
        const frameT = BABYLON.MeshBuilder.CreateBox("frameT", {width: 12, height: 2, depth: 2}, this.scene);
        frameT.position = new BABYLON.Vector3(x, 7, z);

        // Portal Visual
        const portal = BABYLON.MeshBuilder.CreatePlane("zone2_exit", {width: 8, height: 6}, this.scene);
        portal.position = new BABYLON.Vector3(x, 3, z);
        portal.metadata = { type: 'INTERACTABLE', id: 'EXIT_ZONE2', name: "Vers la Salle des Machines" };
        
        const mat = new BABYLON.StandardMaterial("pMat", this.scene);
        mat.emissiveColor = new BABYLON.Color3(1, 0, 0); // Red (Locked) until solved?
        mat.alpha = 0.5;
        portal.material = mat;
    }

    createWall(pos, length, height, rotated) {
        // Rotated = Running along Z axis (Vertical on map)
        // Default = Running along X axis (Horizontal on map)
        const w = rotated ? 1 : length;
        const d = rotated ? length : 1;
        
        const wall = BABYLON.MeshBuilder.CreateBox("wall", {width: w, height: height, depth: d}, this.scene);
        wall.position = pos;
        wall.material = this.concreteMat; // Use existing material
        wall.checkCollisions = true;
        wall.metadata = { type: 'WALL' };
        return wall;
    }

    createLever(x, z, id, color) {
        const base = BABYLON.MeshBuilder.CreateBox("base_"+id, {size: 0.5}, this.scene);
        base.position = new BABYLON.Vector3(x, 0.25, z);
        
        const stick = BABYLON.MeshBuilder.CreateCylinder("stick_"+id, {diameter: 0.1, height: 0.8}, this.scene);
        stick.position = new BABYLON.Vector3(x, 0.6, z);
        stick.material = new BABYLON.StandardMaterial("mat_"+id, this.scene);
        stick.material.diffuseColor = color;
        stick.material.emissiveColor = color;
        
        // Selection Wrapper
        const wrapper = BABYLON.MeshBuilder.CreateBox("wrap_"+id, {width: 0.8, height: 1.5, depth: 0.8}, this.scene);
        wrapper.position = new BABYLON.Vector3(x, 0.75, z);
        wrapper.isVisible = false;
        wrapper.metadata = { type: 'INTERACTABLE', id: id, name: "Levier" };
    }

    createPipeBatch(x, z, count, isVertical) {
        for(let i=0; i<count; i++) {
            const pipe = BABYLON.MeshBuilder.CreateCylinder("pipe", {diameter: 0.3, height: 4}, this.scene);
            const offset = (i - count/2) * 1.0;
            if(isVertical) {
                pipe.position = new BABYLON.Vector3(x + offset, 2, z + 5);
            } else {
                 pipe.rotation.z = Math.PI/2;
                 pipe.position = new BABYLON.Vector3(x, 0.5 + i*0.5, z+5);
            }
            const mat = new BABYLON.StandardMaterial("pipeMat", this.scene);
            mat.diffuseColor = new BABYLON.Color3(0.4, 0.4, 0.4);
            pipe.material = mat;
        }
    }

    createTeleporterVisuals(tunnelWidth) {
        // TP NORTH - RED (Danger Zone)
        this.createTeleporterPad(0, 28, "tp_north", new BABYLON.Color3(1, 0, 0));
        
        // TP SOUTH - GREEN (Exit/Safe)
        this.createTeleporterPad(0, -28, "tp_south", new BABYLON.Color3(0, 1, 0));
        
        // TP WEST - CYAN (Lab/Quest)
        this.createTeleporterPad(-18, -20, "tp_west", new BABYLON.Color3(0, 1, 1));
        
        // TP EAST - YELLOW (Maintenance)
        this.createTeleporterPad(9, 0, "tp_east", new BABYLON.Color3(1, 1, 0));
    }

    createTeleporterPad(x, z, name, color) {
        // Pad
        const pad = BABYLON.MeshBuilder.CreateCylinder(name, {diameter: 4, height: 0.1}, this.scene);
        pad.position = new BABYLON.Vector3(x, 0.1 + 0.05, z);
        const mat = new BABYLON.StandardMaterial(name + "_mat", this.scene);
        mat.emissiveColor = color;
        mat.alpha = 0.6;
        pad.material = mat;
        pad.metadata = { type: 'INTERACTABLE', id: name, name: "Téléporteur" }; // Needed for interaction logic

        // Light
        const light = new BABYLON.PointLight(name+"_light", pad.position.clone().add(new BABYLON.Vector3(0,2,0)), this.scene);
        light.diffuse = color;
        light.intensity = 0.8;

        // Props (Decor)
        for(let i=0; i<3; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 2.5 + Math.random() * 1.5;
            const note = BABYLON.MeshBuilder.CreateBox("crate_"+name+i, {size: 0.8}, this.scene);
            note.position = new BABYLON.Vector3(x + Math.cos(angle) * dist, 0.4, z + Math.sin(angle) * dist);
            note.rotation.y = Math.random();
            note.material = this.metalMat;
        }
    }

    createCampfire() {
        const fireBase = BABYLON.MeshBuilder.CreateCylinder("brazier", {diameterTop: 1.5, diameterBottom: 1, height: 0.5}, this.scene);
        fireBase.position = new BABYLON.Vector3(0, 0.25, -15); // Adjust Z to match Hub coords (-15 is standard start)
        fireBase.material = this.metalMat;
        fireBase.metadata = { type: "OBSTACLE" }; // Avoid walking inside

        // Ember Light (Orange/Red Warmth) - Moved to -15
        const fireLight = new BABYLON.PointLight("fireLight", new BABYLON.Vector3(0, 2, -15), this.scene);
        fireLight.diffuse = new BABYLON.Color3(1, 0.5, 0.1);
        fireLight.intensity = 1.2;
        fireLight.radius = 15;

        // Simple Particles (Cubes going up)
        const particleSystem = new BABYLON.ParticleSystem("particles", 200, this.scene);
        particleSystem.emitter = new BABYLON.Vector3(0, 0.5, -15);
        particleSystem.minEmitBox = new BABYLON.Vector3(-0.5, 0, -0.5);
        particleSystem.maxEmitBox = new BABYLON.Vector3(0.5, 0, 0.5);
        particleSystem.color1 = new BABYLON.Color4(1, 0.5, 0, 1.0);
        particleSystem.color2 = new BABYLON.Color4(1, 0, 0, 1.0);
        particleSystem.colorDead = new BABYLON.Color4(0.2, 0, 0, 0.0);
        particleSystem.minSize = 0.1;
        particleSystem.maxSize = 0.3;
        particleSystem.minLifeTime = 0.5;
        particleSystem.maxLifeTime = 1.5;
        particleSystem.emitRate = 50;
        particleSystem.gravity = new BABYLON.Vector3(0, 1, 0);
        particleSystem.direction1 = new BABYLON.Vector3(-0.5, 1, -0.5);
        particleSystem.direction2 = new BABYLON.Vector3(0.5, 1, 0.5);
        // Texture workaround: use one of our generated textures? Or default null which is white square
        // We'll trust default particle texture (often needs explicit texture but null usually works for square pixels)
        // Actually ParticleSystem NEEDS a texture or it might fail. Let's create a procedural noise texture 1px
        const pTex = new BABYLON.DynamicTexture("pTex", 32, this.scene, false);
        const ctx = pTex.getContext();
        ctx.fillStyle = "#FFFFFF"; ctx.fillRect(0,0,32,32);
        pTex.update();
        particleSystem.particleTexture = pTex; 
        
        particleSystem.start();
    }

    generateInfrastructure(length, width) {
        // Rails
        const railL = BABYLON.MeshBuilder.CreateBox("railL", {width: 0.2, height: 0.1, depth: length}, this.scene);
        railL.position.x = -2;
        railL.material = this.metalMat;

        const railR = BABYLON.MeshBuilder.CreateBox("railR", {width: 0.2, height: 0.1, depth: length}, this.scene);
        railR.position.x = 2; // Wide track?
        railR.material = this.metalMat;

        const sleepersCount = length / 1;
        for(let i=0; i<sleepersCount; i++) {
            const sleeper = BABYLON.MeshBuilder.CreateBox("sleeper", {width: 5, height: 0.05, depth: 0.4}, this.scene);
            sleeper.position.z = -length/2 + i;
            sleeper.position.y = 0.02;
            sleeper.material = this.metalMat; // Wood/Metal
        }

        // Pipes on walls
        const pipe = BABYLON.MeshBuilder.CreateTube("pipe", {
            path: [
                new BABYLON.Vector3(-width/2 + 0.5, 2, -length/2),
                new BABYLON.Vector3(-width/2 + 0.5, 2, length/2)
            ],
            radius: 0.3,
            sideOrientation: BABYLON.Mesh.DOUBLESIDE
        }, this.scene);
        pipe.material = this.metalMat;
    }

    generateProps(length, width) {
        // Random Crates & Barrels
        for (let i = 0; i < 15; i++) {
            const isBarrel = Math.random() > 0.5;
            const x = (Math.random() * width * 0.7) - (width * 0.35);
            const z = (Math.random() * length * 0.8) - (length * 0.4);
            
            if (isBarrel) {
                const barrel = BABYLON.MeshBuilder.CreateCylinder("barrel", {height: 1.2, diameter: 0.8}, this.scene);
                barrel.position = new BABYLON.Vector3(x, 0.6, z);
                barrel.material = this.metalMat;
            } else {
                const crate = BABYLON.MeshBuilder.CreateBox("crate", {size: 1}, this.scene);
                crate.position = new BABYLON.Vector3(x, 0.5, z);
                crate.material = this.metalMat;
            }
        }

        // Neons
        for (let z = -length/2 + 5; z < length/2; z+=15) {
            const side = Math.random() > 0.5 ? 1 : -1;
            const neon = BABYLON.MeshBuilder.CreateBox("neon", {width: 0.2, height: 3, depth: 0.2}, this.scene);
            neon.position = new BABYLON.Vector3((width/2 - 0.2) * side, 3, z);
            neon.material = Math.random() > 0.5 ? this.neonCyanMat : this.neonMagentaMat;

            const pl = new BABYLON.PointLight("pl", neon.position.clone(), this.scene);
            pl.diffuse = neon.material.emissiveColor;
            pl.intensity = 0.8;
            pl.radius = 8;
        }
    }


    createEnvironmentZone1() {
        console.log("Generating Zone 1: The Catacombs (Ultra Detailed)...");
        
        // --- GLOBAL ATMOSPHERE ---
        this.scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
        this.scene.fogDensity = 0.02; // Foggy but visible
        this.scene.fogColor = new BABYLON.Color3(0.05, 0.05, 0.1);
        
        // --- MATERIALS ---
        const stoneMat = new BABYLON.StandardMaterial("stone", this.scene);
        stoneMat.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.25);
        stoneMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        
        const floorMat = new BABYLON.StandardMaterial("floor", this.scene);
        floorMat.diffuseColor = new BABYLON.Color3(0.15, 0.12, 0.1);

        const acidMat = new BABYLON.StandardMaterial("acid", this.scene);
        acidMat.diffuseColor = new BABYLON.Color3(0, 0.8, 0);
        acidMat.emissiveColor = new BABYLON.Color3(0, 0.4, 0);
        acidMat.alpha = 0.8;

        // --- ROOM 1: THE LANDING (Start) ---
        // 40x40 Room
        const room1 = BABYLON.MeshBuilder.CreateGround("room1", {width: 40, height: 40}, this.scene);
        room1.position.z = -30;
        room1.material = floorMat;
        room1.checkCollisions = true;
        room1.metadata = { type: 'GROUND' };
        
        // Walls Room 1
        this.createWalls(-30, 40, 40, 8);
        
        // Decor: Pillars
        this.createPillars(-30, 40, 40);

        // --- CORRIDOR 1: THE GAUNTLET ---
        const corr1 = BABYLON.MeshBuilder.CreateGround("corr1", {width: 10, height: 50}, this.scene);
        corr1.position.z = 15; // -10 to 40
        corr1.material = floorMat;
        corr1.checkCollisions = true;
        corr1.metadata = { type: 'GROUND' };
        
        // Acid Pits on sides of corridor
        const pitL = BABYLON.MeshBuilder.CreateGround("pitL", {width: 5, height: 50}, this.scene);
        pitL.position = new BABYLON.Vector3(-7.5, -1, 15);
        pitL.material = acidMat;
        
        const pitR = BABYLON.MeshBuilder.CreateGround("pitR", {width: 5, height: 50}, this.scene);
        pitR.position = new BABYLON.Vector3(7.5, -1, 15);
        pitR.material = acidMat;

        // --- ROOM 2: THE PUZZLE PLAZA ---
        const room2 = BABYLON.MeshBuilder.CreateGround("room2", {width: 60, height: 40}, this.scene);
        room2.position.z = 60;
        room2.material = floorMat;
        room2.checkCollisions = true;
        room2.metadata = { type: 'GROUND' };
        
        // Walls Room 2 - OPEN NORTH WALL FOR ELEVATOR ACCESS
        this.createWalls(60, 60, 40, 8);

        // The Hub Cylinder (Entry to Puzzle Area)
        const hub = BABYLON.MeshBuilder.CreateCylinder("hub", {diameter: 10, height: 1}, this.scene);
        hub.position = new BABYLON.Vector3(0, 0.5, 60);
        hub.material = stoneMat; // stoneMat is available in scope
        hub.checkCollisions = true;

        // Bridge to Lift (Z=80 to Z=100)
        const connector = BABYLON.MeshBuilder.CreateGround("connectorToBoss", {width: 10, height: 40}, this.scene);
        connector.position.z = 90; // 80 to 100
        connector.material = floorMat;
        connector.checkCollisions = true;
        connector.metadata = { type: 'GROUND' };

        // Flags
        this.createEuroFlag(new BABYLON.Vector3(-15, 0, 60));
        this.createEuroFlag(new BABYLON.Vector3(15, 0, 60));
    }

    createEnvironmentBoss() {
        console.log("Generating Boss Environment: THE THRONE ROOM");
        this.scene.gravity = new BABYLON.Vector3(0, -9.81, 0);
        this.scene.collisionsEnabled = true;

        // Re-create shared materials if needed (usually cached in class, but ensuring access)
        const carpetMat = new BABYLON.StandardMaterial("carpet", this.scene);
        carpetMat.diffuseColor = new BABYLON.Color3(0.3, 0.05, 0.05); // Deep Red
        carpetMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);

        const goldMat = new BABYLON.StandardMaterial("goldThrone", this.scene);
        goldMat.diffuseColor = new BABYLON.Color3(1, 0.8, 0);

        const wallMat = new BABYLON.StandardMaterial("wallThrone", this.scene);
        wallMat.diffuseColor = new BABYLON.Color3(0.8, 0.7, 0.5); // Cream/Gold
        
        const stoneMat = this.concreteMat || new BABYLON.StandardMaterial("stone", this.scene);

        // --- THE THRONE ROOM (Centered at 0,0,0) ---
        
        // Floor
        const throneFloor = BABYLON.MeshBuilder.CreateGround("throneFloor", {width: 40, height: 60}, this.scene);
        throneFloor.position = new BABYLON.Vector3(0, 0, 0);
        throneFloor.material = carpetMat;
        throneFloor.checkCollisions = true;
        throneFloor.metadata = { type: 'GROUND' };

        // Walls
        const tWallL = BABYLON.MeshBuilder.CreateBox("twL", {width: 2, height: 10, depth: 60}, this.scene);
        tWallL.position = new BABYLON.Vector3(-20, 5, 0); 
        tWallL.material = wallMat;
        tWallL.checkCollisions = true;

        const tWallR = BABYLON.MeshBuilder.CreateBox("twR", {width: 2, height: 10, depth: 60}, this.scene);
        tWallR.position = new BABYLON.Vector3(20, 5, 0);
        tWallR.material = wallMat;
        tWallR.checkCollisions = true;

        // Back Wall (Behind Throne)
        const tWallB = BABYLON.MeshBuilder.CreateBox("twB", {width: 42, height: 15, depth: 2}, this.scene);
        tWallB.position = new BABYLON.Vector3(0, 7.5, 30);
        tWallB.material = wallMat;
        tWallB.checkCollisions = true;

        // Throne Chair
        const throneBase = BABYLON.MeshBuilder.CreateBox("throne", {width: 4, height: 3, depth: 3}, this.scene);
        throneBase.position = new BABYLON.Vector3(0, 1.5, 25);
        throneBase.material = goldMat;

        // Pillars
        for(let x of [-15, 15]) {
            for(let z of [-20, 0, 20]) {
                 const p = BABYLON.MeshBuilder.CreateCylinder("tp_"+x+z, {diameter: 1.5, height: 12}, this.scene);
                 p.position = new BABYLON.Vector3(x, 6, z);
                 p.material = stoneMat; 
            }
        }
        
        // Flags
        this.createEuroFlag(new BABYLON.Vector3(-10, 0, 25)); 
        this.createEuroFlag(new BABYLON.Vector3(10, 0, 25)); 

        // LIGHTING
        // Ambient
        const hemi = new BABYLON.HemisphericLight("bossHemi", new BABYLON.Vector3(0, 1, 0), this.scene);
        hemi.intensity = 0.6;
        hemi.groundColor = new BABYLON.Color3(0.1, 0.1, 0.1);

        // Spot on Throne
        const spot = new BABYLON.PointLight("bossSpot", new BABYLON.Vector3(0, 20, 10), this.scene);
        spot.intensity = 0.8;
        spot.range = 50;
        spot.diffuse = new BABYLON.Color3(1, 0.9, 0.8);

        this.createSkybox();
    }

    createEuroFlag(position) {
        // Pole
        const pole = BABYLON.MeshBuilder.CreateCylinder("pole", {height: 8, diameter: 0.2}, this.scene);
        pole.position = position.clone();
        pole.position.y = 4;
        pole.material = this.metalMat;
        pole.checkCollisions = true;

        // Flag Cloth
        const flag = BABYLON.MeshBuilder.CreatePlane("flag", {width: 3, height: 2}, this.scene);
        flag.position = position.clone().add(new BABYLON.Vector3(1.5, 7, 0));
        
        const flagMat = new BABYLON.StandardMaterial("euroFlag", this.scene);
        flagMat.diffuseColor = new BABYLON.Color3(0, 0.2, 0.6); // EU Blue
        flagMat.emissiveColor = new BABYLON.Color3(0, 0.1, 0.4);
        flagMat.backFaceCulling = false;
        
        // Procedural Stars Texture
        const dt = new BABYLON.DynamicTexture("stars", 256, this.scene, true);
        const ctx = dt.getContext();
        ctx.fillStyle = "#003399"; 
        ctx.fillRect(0,0,256,256);
        ctx.fillStyle = "#FFCC00"; // Yellow
        // Draw 12 stars in circle
        for(let i=0; i<12; i++) {
            const angle = (i/12) * Math.PI * 2;
            const cx = 128 + Math.cos(angle)*60;
            const cy = 128 + Math.sin(angle)*60;
            ctx.fillRect(cx-5, cy-5, 10, 10); 
        }
        dt.update();
        flagMat.diffuseTexture = dt;
        flag.material = flagMat;

        return pole;
    }

    createWalls(zPos, width, depth, height) {
        const wallMat = this.concreteMat;
        const thickness = 2;
        
        // West
        const w1 = BABYLON.MeshBuilder.CreateBox("wW", {width: thickness, height: height, depth: depth}, this.scene);
        w1.position = new BABYLON.Vector3(-width/2, height/2, zPos);
        w1.material = wallMat;
        w1.checkCollisions = true;

        // East
        const w2 = BABYLON.MeshBuilder.CreateBox("wE", {width: thickness, height: height, depth: depth}, this.scene);
        w2.position = new BABYLON.Vector3(width/2, height/2, zPos);
        w2.material = wallMat;
        w2.checkCollisions = true;
        
        // North & South (if needed, usually open for corridors)
    }

    createPillars(zPos, width, depth) {
        // 4 Pillars per room
        const offsets = [-width/4, width/4];
        offsets.forEach(x => {
            offsets.forEach(zOffset => {
                const p = BABYLON.MeshBuilder.CreateCylinder("pillar", {diameter: 2, height: 8}, this.scene);
                p.position = new BABYLON.Vector3(x, 4, zPos + zOffset/2); // approximate
                p.material = this.concreteMat;
                p.checkCollisions = true;
            });
        });
    }

    createBorderWall(x, z, w, h, isVertical) {
        // Simple helper
        const wall = BABYLON.MeshBuilder.CreateBox("wall", {width: isVertical ? 1 : w, height: h, depth: isVertical ? w : 1}, this.scene);
        wall.position = new BABYLON.Vector3(x, h/2, z);
        wall.material = this.concreteMat;
        wall.checkCollisions = true; // Ensure collision on helper
        wall.isPickable = false;
    }

    createStreetLamp(pos) {
        const pole = BABYLON.MeshBuilder.CreateCylinder("pole", {diameter: 0.2, height: 4}, this.scene);
        pole.position = pos.clone();
        pole.position.y = 2;
        pole.material = this.metalMat;

        const bulb = BABYLON.MeshBuilder.CreateSphere("bulb", {diameter: 0.8}, this.scene);
        bulb.position = pos.clone();
        bulb.position.y = 4;
        const bulbMat = new BABYLON.StandardMaterial("bulbMat", this.scene);
        bulbMat.emissiveColor = new BABYLON.Color3(1, 1, 0.8); // Warm white
        bulb.material = bulbMat;

        const light = new BABYLON.PointLight("lampLight", bulb.position, this.scene);
        light.intensity = 0.8;
        light.diffuse = new BABYLON.Color3(1, 0.9, 0.7);
    }

    createFloatingText(position, text, color="white", duration=3000) {
        // Create Plane with Dynamic Texture
        const plane = BABYLON.MeshBuilder.CreatePlane("floatText", {width:3, height:1}, this.scene);
        plane.position = position.clone();
        plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
        
        const dt = new BABYLON.DynamicTexture("dt", {width:512, height:128}, this.scene, true);
        const ctx = dt.getContext();
        ctx.font = "bold 60px Arial";
        ctx.fillStyle = color;
        ctx.textAlign = "center";
        
        // Shadow
        ctx.shadowColor="black";
        ctx.shadowBlur=5;
        
        ctx.fillText(text, 256, 80);
        dt.update();
        
        const mat = new BABYLON.StandardMaterial("ftMat", this.scene);
        mat.diffuseTexture = dt;
        mat.diffuseTexture.hasAlpha = true;
        mat.emissiveColor = new BABYLON.Color3(1,1,1);
        mat.disableLighting = true;
        plane.material = mat;
        
        // Animate Up
        const anim = new BABYLON.Animation("float", "position.y", 30, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
        anim.setKeys([
            {frame:0, value:position.y}, 
            {frame:60, value:position.y + 2}
        ]);
        
        // Fade Out (via scaling to avoid alpha sorting issues)
        const anim2 = new BABYLON.Animation("fade", "scaling", 30, BABYLON.Animation.ANIMATIONTYPE_VECTOR3, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
        anim2.setKeys([
             {frame:0, value:new BABYLON.Vector3(1,1,1)},
             {frame:40, value:new BABYLON.Vector3(1,1,1)},
             {frame:60, value:new BABYLON.Vector3(0,0,0)} 
        ]);

        this.scene.beginDirectAnimation(plane, [anim, anim2], 0, 60, false, 1, () => plane.dispose());
    }
}

