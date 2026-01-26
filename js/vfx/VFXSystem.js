// js/vfx/VFXSystem.js
export class VFXSystem {
    constructor(scene) {
        this.scene = scene;
    }

    createCampfire(position) {
        // ... (Existing campfire logic moved here) ...
        const fireSys = new BABYLON.ParticleSystem("fire", 2000, this.scene);
        fireSys.particleTexture = new BABYLON.Texture("https://assets.babylonjs.com/textures/flare.png", this.scene);
        fireSys.emitter = position;
        fireSys.minEmitBox = new BABYLON.Vector3(-0.2, 0, -0.2);
        fireSys.maxEmitBox = new BABYLON.Vector3(0.2, 0, 0.2);
        
        fireSys.color1 = new BABYLON.Color4(1, 0.5, 0, 1.0);
        fireSys.color2 = new BABYLON.Color4(1, 0.2, 0, 1.0);
        fireSys.colorDead = new BABYLON.Color4(0, 0, 0, 0.0);
        
        fireSys.minSize = 0.1;
        fireSys.maxSize = 0.3;
        fireSys.minLifeTime = 0.2;
        fireSys.maxLifeTime = 0.5;
        fireSys.emitRate = 300;
        fireSys.blendMode = BABYLON.ParticleSystem.BLENDMODE_ONEONE;
        fireSys.gravity = new BABYLON.Vector3(0, 9.81, 0); // Fire goes up
        fireSys.direction1 = new BABYLON.Vector3(0, 1, 0);
        fireSys.direction2 = new BABYLON.Vector3(0, 1, 0);
        
        fireSys.start();
        
        // Point Light
        const light = new BABYLON.PointLight("fireLight", position.add(new BABYLON.Vector3(0, 0.5, 0)), this.scene);
        light.diffuse = new BABYLON.Color3(1, 0.5, 0);
        light.intensity = 1.0;
        
        // Flicker anim
        this.scene.onBeforeRenderObservable.add(() => {
            light.intensity = 0.8 + Math.random() * 0.4;
        });

        return fireSys;
    }

    createClickEffect(position) {
        const sphere = BABYLON.MeshBuilder.CreateSphere("clickFX", {diameter: 0.2}, this.scene);
        sphere.position = position;
        const mat = new BABYLON.StandardMaterial("fxMat", this.scene);
        mat.emissiveColor = new BABYLON.Color3(0, 1, 1);
        mat.alpha = 0.8;
        sphere.material = mat;

        // Animation: Scale up & Fade out
        let frame = 0;
        this.scene.onBeforeRenderObservable.add(() => {
            frame++;
            sphere.scaling.scaleInPlace(1.05);
            mat.alpha -= 0.05;
            if(mat.alpha <= 0) {
                sphere.dispose();
                // Need to remove this observer ideally, but simplified for now
            }
        });
    }

    createWarpEffect(position, color) {
        const sys = new BABYLON.ParticleSystem("warp", 500, this.scene);
        sys.particleTexture = new BABYLON.Texture("https://assets.babylonjs.com/textures/flare.png", this.scene);
        sys.emitter = position;
        sys.minEmitBox = new BABYLON.Vector3(-0.5, 0, -0.5);
        sys.maxEmitBox = new BABYLON.Vector3(0.5, 0.1, 0.5);
        
        sys.color1 = new BABYLON.Color4(color.r, color.g, color.b, 1.0);
        sys.color2 = new BABYLON.Color4(color.r, color.g, color.b, 0.5);
        sys.colorDead = new BABYLON.Color4(0, 0, 0, 0.0);
        
        sys.minSize = 0.05;
        sys.maxSize = 0.1;
        sys.minLifeTime = 0.5;
        sys.maxLifeTime = 1.0;
        sys.emitRate = 100;
        sys.blendMode = BABYLON.ParticleSystem.BLENDMODE_ONEONE;
        sys.direction1 = new BABYLON.Vector3(0, 1, 0);
        sys.direction2 = new BABYLON.Vector3(0, 2, 0);
        sys.start();
        return sys;
    }

    createExplosion(position) {
        const sphere = BABYLON.MeshBuilder.CreateSphere("boom", {diameter: 0.1}, this.scene);
        sphere.position = position.clone();
        const mat = new BABYLON.StandardMaterial("boomMat", this.scene);
        mat.emissiveColor = new BABYLON.Color3(1, 0.5, 0);
        sphere.material = mat;

        const anim = new BABYLON.Animation("boomA", "scaling", 60, BABYLON.Animation.ANIMATIONTYPE_VECTOR3, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
        anim.setKeys([{frame:0, value:new BABYLON.Vector3(0.1,0.1,0.1)}, {frame:20, value:new BABYLON.Vector3(5,5,5)}]);
        
        // Fix: Targeting "alpha" directly on the material
        const fade = new BABYLON.Animation("boomF", "alpha", 60, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
        fade.setKeys([{frame:0, value:1}, {frame:20, value:0}]);
        mat.alpha = 1;

        this.scene.beginDirectAnimation(sphere, [anim], 0, 20, false, 1, () => {
             sphere.dispose();
             if(mat) mat.dispose();
        });
        
        // This now works because fade targets "alpha", and we pass the material (mat)
        this.scene.beginDirectAnimation(mat, [fade], 0, 20, false);
    }
}
