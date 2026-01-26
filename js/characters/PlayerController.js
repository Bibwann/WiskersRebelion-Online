// js/characters/PlayerController.js
export class PlayerController {
    constructor(scene, mesh, speed = 0.25) { // Increased base speed
        this.scene = scene;
        this.mesh = mesh;
        this.speed = speed;
        this.moveTarget = null;
        this.velocity = new BABYLON.Vector3(0, 0, 0);
        this.isMoving = false;
        
        // Locked State
        this.locked = false;

        // Physics / Movement Config
        this.friction = 0.82; // Less friction for smoother glide
        this.acceleration = 0.08; // Faster acceleration
        this.stopThreshold = 0.1;
    }

    setMoveTarget(targetPosition) {
        if(this.locked) return; // Ignore input if locked
        this.moveTarget = targetPosition.clone();
        this.moveTarget.y = this.mesh.position.y; // Ignore vertical difference for target
    }

    immobilize(isLocked) {
        this.locked = isLocked;
        if(isLocked) {
            this.moveTarget = null;
            this.velocity.set(0, 0, 0);
            console.log("Player Controls LOCKED");
        } else {
            console.log("Player Controls UNLOCKED");
        }
    }

    update(deltaTime) {
        if(this.locked) {
            // Animation for Idle state even when locked? 
            this.animate(deltaTime);
            return; 
        }

        if (this.moveTarget) {
            const direction = this.moveTarget.subtract(this.mesh.position);
            direction.y = 0;
            const distance = direction.length();

            if (distance > this.stopThreshold) {
                this.isMoving = true;
                direction.normalize();
                
                // Add acceleration to velocity (Smoother start)
                const moveForce = direction.scale(this.acceleration);
                this.velocity.addInPlace(moveForce);
                
                // Cap max speed
                if(this.velocity.length() > this.speed) {
                    this.velocity.normalize().scaleInPlace(this.speed);
                }

                // Sprite Flipping
                if(direction.x < -0.1) this.mesh.scaling.x = 1; 
                else if(direction.x > 0.1) this.mesh.scaling.x = -1;

            } else {
                this.moveTarget = null; // Reached
                // Don't stop immediately, friction will handle it
            }
        }

        // Apply Velocity with Collisions
        if (this.velocity.length() > 0.001) {
            // Use Babylon's built-in collision system instead of hardcoded bounds
            this.mesh.moveWithCollisions(this.velocity);
            
            // Apply Friction (Smoother stop)
            this.velocity.scaleInPlace(this.friction);
            // checkBoundaries removed - relies on mesh collisions now
        } else {
            this.velocity.set(0,0,0);
            this.isMoving = false;
        }

        this.animate(deltaTime);
    }

// Removed Hardcoded checkBoundaries to allow Zone movement
    /* checkBoundaries() { ... } */

    attack() {
        console.log("Player Attacking!");
        // Visual Jiggle
        const forward = this.mesh.scaling.x < 0 ? 1 : -1; // Assuming facing based on flip
        
        // Dispatch Event for CombatSystem
        const evt = new CustomEvent('player-attack', { 
            detail: {
                position: this.mesh.position.add(new BABYLON.Vector3(forward * 1.5, 0, 0)), // Hit in front
                range: 3.5,
                damage: 10 // Base damage, should come from stats later
            }
        });
        document.dispatchEvent(evt);
    }

    animate(deltaTime) {
        if (this.mesh.animTime === undefined) this.mesh.animTime = 0;

        // Bobbing effect (Procedural animation)
        if (this.isMoving || this.velocity.length() > 0.01) {
            this.mesh.animTime += deltaTime * 15;
            const hop = Math.abs(Math.sin(this.mesh.animTime)) * 0.15;
            this.mesh.position.y = 0.5 + hop;
        } else {
            this.mesh.animTime += deltaTime * 3;
            const breath = Math.sin(this.mesh.animTime) * 0.02; 
            this.mesh.position.y = 0.5 + breath;
        }
    }
}
