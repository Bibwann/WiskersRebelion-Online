// js/SpriteFactory.js
export class SpriteFactory {
    constructor(scene) {
        this.scene = scene;
        this.pixelSize = 16;
        this.textureSize = 256; // 16x16 grid * 16 scale
        this.pixelScale = this.textureSize / this.pixelSize;
    }

    createClassMaterial(className) {
        const texture = new BABYLON.DynamicTexture(`tex_${className}`, this.textureSize, this.scene, false);
        const ctx = texture.getContext();
        
        // Clear transparency
        ctx.clearRect(0,0, this.textureSize, this.textureSize);

        // Draw Logic
        this.drawCharacter(ctx, className);
        
        texture.update();
        texture.hasAlpha = true;
        texture.updateSamplingMode(BABYLON.Texture.NEAREST_SAMPLINGMODE);

        const mat = new BABYLON.StandardMaterial(`mat_${className}`, this.scene);
        mat.diffuseTexture = texture;
        mat.useAlphaFromDiffuseTexture = true;
        mat.specularColor = BABYLON.Color3.Black();
        mat.emissiveColor = new BABYLON.Color3(0.4, 0.4, 0.4); // Ensure visibility in dark scenes
        mat.backFaceCulling = false; // Prevent disappearance when flipped

        return mat;
    }

    drawPixel(ctx, x, y, color) {
        ctx.fillStyle = color;
        // Invert Y? Canvas is top-left 0,0. 
        // 16 pixels high. y=0 is top.
        ctx.fillRect(x * this.pixelScale, y * this.pixelScale, this.pixelScale, this.pixelScale);
    }
    
    fillArea(ctx, x, y, w, h, color) {
        ctx.fillStyle = color;
        ctx.fillRect(x * this.pixelScale, y * this.pixelScale, w * this.pixelScale, h * this.pixelScale);
    }

    drawCharacter(ctx, className) {
        const c = className ? className.toUpperCase() : 'FERRAILLEUR';
        
        // --- BASE SHADOW (Feet) ---
        this.fillArea(ctx, 4, 15, 8, 1, "rgba(0,0,0,0.4)");

        if (c === 'FERRAILLEUR') {
            // Helmet (Yellow)
            this.fillArea(ctx, 5, 2, 6, 3, "#FFD700"); 
            this.fillArea(ctx, 4, 4, 8, 1, "#CCAA00"); // Rim
            // Skin
            this.fillArea(ctx, 6, 5, 4, 2, "#FFCCAA");
            // Vest (Orange)
            this.fillArea(ctx, 5, 7, 6, 6, "#FF4500");
            this.fillArea(ctx, 6, 8, 4, 5, "#FF6600"); // Detail
            // Legs (Grey)
            this.fillArea(ctx, 5, 13, 2, 3, "#555555");
            this.fillArea(ctx, 9, 13, 2, 3, "#555555");
            // Wrench (Held on shoulder/arm)
            this.fillArea(ctx, 12, 4, 2, 5, "#AAAAAA"); // Handle
            this.fillArea(ctx, 11, 3, 4, 2, "#CCCCCC"); // Head
        } 
        else if (c === 'SURVIVANT') {
             // Skin Body (Pale)
             this.fillArea(ctx, 5, 6, 6, 7, "#EEDDCC");
             // Head
             this.fillArea(ctx, 6, 2, 4, 4, "#EEDDCC");
             // Hair (Messy brown)
             this.fillArea(ctx, 5, 1, 6, 2, "#554433");
             // Legs (Rags)
             this.fillArea(ctx, 5, 13, 2, 3, "#443322");
             this.fillArea(ctx, 9, 13, 2, 3, "#443322");
             // Blood/Scars
             this.fillArea(ctx, 6, 8, 1, 1, "#880000");
             this.fillArea(ctx, 9, 10, 1, 1, "#880000");
             // Chains (Grey lines across chest)
             this.fillArea(ctx, 4, 7, 1, 4, "#777777");
             this.fillArea(ctx, 11, 7, 1, 4, "#777777");
             this.fillArea(ctx, 5, 9, 6, 1, "#555555");
        }
        else if (c === 'BIOLOGISTE') {
            // White Coat
            this.fillArea(ctx, 4, 6, 8, 8, "#FFFFFF");
            this.fillArea(ctx, 7, 6, 2, 8, "#EEEEEE"); // Opening
            // Head
            this.fillArea(ctx, 6, 2, 4, 4, "#FFCCAA");
            // Hair (Grey/White)
            this.fillArea(ctx, 5, 1, 6, 2, "#DDDDDD");
            // Blue Glasses
            this.fillArea(ctx, 6, 4, 4, 1, "#00FFFF");
            // Legs
            this.fillArea(ctx, 6, 14, 1, 2, "#333333");
            this.fillArea(ctx, 9, 14, 1, 2, "#333333");
            // Syringe (Green)
            this.fillArea(ctx, 12, 9, 2, 3, "#00FF00"); // Liquid
            this.fillArea(ctx, 13, 12, 1, 2, "#888888"); // Plunger
            this.fillArea(ctx, 13, 8, 1, 1, "#CCCCCC"); // Needle
        }
        else if (c === 'DISRUPTEUR') {
            // Hood (Black)
            this.fillArea(ctx, 5, 1, 6, 5, "#111111");
            this.fillArea(ctx, 6, 3, 4, 3, "#000000"); // Deep shadow face
            this.fillArea(ctx, 7, 4, 1, 1, "#00FFFF"); // Eye glow
            // Body (Dark Tech)
            this.fillArea(ctx, 5, 6, 6, 7, "#222222");
            // Legs
            this.fillArea(ctx, 5, 13, 2, 3, "#111111");
            this.fillArea(ctx, 9, 13, 2, 3, "#111111");
            // Neon Lines (Purple/Cyan)
            this.fillArea(ctx, 5, 8, 1, 4, "#AA00FF");
            this.fillArea(ctx, 10, 8, 1, 4, "#00FFFF");
            // Hack Glove (Blue Electric raised hand)
            this.fillArea(ctx, 12, 6, 3, 3, "#0088FF");
        }
        else if (c === 'DEV') {
            // "GOD" Mode Visuals (Golden / Glitchy)
            
            // Aura (Gold transparent)
            this.fillArea(ctx, 3, 0, 10, 16, "rgba(255, 215, 0, 0.2)");

            // Head (White/Gold)
            this.fillArea(ctx, 6, 2, 4, 4, "#FFFFFF"); 
            // Crown / Halo
            this.fillArea(ctx, 5, 1, 6, 1, "#FFD700"); 
            this.fillArea(ctx, 5, 0, 1, 1, "#FFD700"); 
            this.fillArea(ctx, 7, 0, 1, 1, "#FFD700"); 
            this.fillArea(ctx, 10, 0, 1, 1, "#FFD700"); 

            // Body (Robes)
            this.fillArea(ctx, 5, 6, 6, 9, "#EEEEEE");
            // Trim (Gold)
            this.fillArea(ctx, 7, 6, 2, 9, "#FFD700");
            
            // Eyes (Red Glowing - Omniscient)
            this.fillArea(ctx, 7, 3, 1, 1, "#FF0000");
            this.fillArea(ctx, 9, 3, 1, 1, "#FF0000"); // Standard pos

            // Hands (Floating Code Blocks)
            this.fillArea(ctx, 2, 7, 2, 2, "#00FF00"); // Matrix Code Left
            this.fillArea(ctx, 12, 7, 2, 2, "#00FF00"); // Matrix Code Right
        }
        else if (c === 'CAT') {
            // Body (Small, Grey/Brown)
            this.fillArea(ctx, 5, 10, 6, 4, "#776655"); 
            // Head
            this.fillArea(ctx, 4, 8, 4, 4, "#776655");
            // Ears
            this.fillArea(ctx, 4, 7, 1, 1, "#554433");
            this.fillArea(ctx, 7, 7, 1, 1, "#554433");
            // Tail (Curled up)
            this.fillArea(ctx, 11, 8, 2, 4, "#665544");
            // Eyes (Green)
            this.fillArea(ctx, 4, 9, 1, 1, "#00FF00");
            this.fillArea(ctx, 6, 9, 1, 1, "#00FF00");
            // Legs
            this.fillArea(ctx, 5, 14, 1, 2, "#443322");
            this.fillArea(ctx, 9, 14, 1, 2, "#443322");
        }
        else if (c === 'ROBOT') {
            // Mechanical Grey/Blue
            this.fillArea(ctx, 4, 2, 8, 10, "#556677");
            // Eye (Red Cyclic)
            this.fillArea(ctx, 6, 4, 4, 2, "#111111"); 
            this.fillArea(ctx, 7, 4, 2, 2, "#FF0000"); 
            // Antenna
            this.fillArea(ctx, 5, 0, 1, 2, "#888888");
            // Arms (Pincers)
            this.fillArea(ctx, 2, 6, 2, 4, "#CCCCCC");
            this.fillArea(ctx, 12, 6, 2, 4, "#CCCCCC");
            // Treads/Legs
            this.fillArea(ctx, 3, 12, 3, 4, "#222222");
            this.fillArea(ctx, 10, 12, 3, 4, "#222222");
        }
        else if (c === 'MARQUIS') {
            // "Marquis de Botté" Visuals
            
            // Big Feathered Hat
            this.fillArea(ctx, 3, 0, 10, 2, "#4A148C"); // Purple Hat
            this.fillArea(ctx, 4, 2, 8, 2, "#4A148C"); 
            this.fillArea(ctx, 10, 0, 4, 3, "#FFD700"); // Yellow Feather

            // Head (Orange Tabby)
            this.fillArea(ctx, 5, 4, 6, 4, "#FF8F00");
            this.fillArea(ctx, 4, 4, 1, 2, "#FF8F00"); // Ears
            this.fillArea(ctx, 11, 4, 1, 2, "#FF8F00");

            // Cape (Velvet Red)
            this.fillArea(ctx, 3, 8, 10, 6, "#B71C1C"); 

            // Boots (Huge Leather)
            this.fillArea(ctx, 4, 12, 3, 4, "#3E2723"); 
            this.fillArea(ctx, 9, 12, 3, 4, "#3E2723"); 
            
            // Rapier (Sword)
            this.fillArea(ctx, 13, 8, 1, 5, "#C0C0C0"); // Blade
            this.fillArea(ctx, 12, 11, 3, 1, "#FFD700"); // Guard
        }
    }
}
