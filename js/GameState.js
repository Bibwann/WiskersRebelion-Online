// js/GameState.js
import { CLASSES } from './GameData.js';

export const GameStates = {
    MENU: 'MENU',
    HUB: 'HUB',
    CHARACTER_SHEET: 'CHARACTER_SHEET',
    DIALOGUE: 'DIALOGUE',
    COMBAT: 'COMBAT',
    ZONE_TRANSITION: 'ZONE_TRANSITION'
};

export class GameState {
    constructor() {
        this.currentState = null; // Start null to force initial state change event
        this.previousState = null;
        this.listeners = [];
        this.flags = {}; // Quest flags
        
        // Données persistantes simples
        this.playerData = {
            classId: null, // 'FERRAILLEUR' | 'BIOLOGISTE'
            hp: 100,
            maxHp: 100,
            ap: 5,
            maxAp: 5,
            xp: 0,
            level: 1,
            xpToNextLevel: 100,
            skillLevel: 1, // Niveau de compétence actif
            dmgLevel: 1,  // Multiplicateur global de dégâts
            scrap: 50 // Ressource pour upgrade
        };
    }

    upgradeSkill(cost) {
        if (this.playerData.scrap >= cost) {
            this.playerData.scrap -= cost;
            this.playerData.skillLevel++;
            console.log(`[UPGRADE] Skill Level: ${this.playerData.skillLevel}`);
            document.dispatchEvent(new CustomEvent('player-stats-update'));
            return true;
        }
        return false;
    }

    upgradeDmg(cost) {
        if (this.playerData.scrap >= cost) {
            this.playerData.scrap -= cost;
            this.playerData.dmgLevel++; // Will apply +20% per level in CombatSystem
            console.log(`[UPGRADE] Damage Level: ${this.playerData.dmgLevel}`);
            document.dispatchEvent(new CustomEvent('player-stats-update'));
            return true;
        }
        return false;
    }

    upgradeHealth(cost) {
        if (this.playerData.scrap >= cost) {
            this.playerData.scrap -= cost;
            this.playerData.maxHp += 20;
            this.playerData.hp += 20; // Heal the amount added
            console.log(`[UPGRADE] HP Max: ${this.playerData.maxHp}`);
            document.dispatchEvent(new CustomEvent('player-stats-update'));
            return true;
        }
        return false;
    }

    setFlag(key, value) {
        this.flags[key] = value;
        console.log(`[FLAG] ${key} = ${value}`);
    }

    getFlag(key) {
        return this.flags[key] || false;
    }
    
    // Alias to fix error "gameState.hasFlag is not a function"
    hasFlag(key) {
        return !!this.flags[key];
    }

    onStateChange(callback) {
        this.listeners.push(callback);
    }

    changeState(newState) {
        if (this.currentState === newState) return;
        
        console.log(`[GAME STATE] Change: ${this.currentState} -> ${newState}`);
        this.previousState = this.currentState;
        this.currentState = newState;
        
        // Notify listeners
        this.listeners.forEach(cb => cb(this.currentState, this.previousState));
    }

    setPlayerClass(classType) {
        this.playerData.classId = classType;
        console.log(`[GAME DATA] Classe définie : ${classType}`);
        
        // Apply Base Stats
        if(CLASSES[classType]) {
            const stats = CLASSES[classType].stats;
            this.playerData.maxHp = stats.hp;
            this.playerData.hp = stats.hp;
            this.playerData.maxAp = stats.maxAp;
            this.playerData.ap = stats.maxAp; // full start
            this.playerData.maxPm = stats.maxPm || 3;
            console.log(`[Stats Applied] HP:${stats.hp} AP:${stats.maxAp}`);
        }
    }

    gainXp(amount) {
        this.playerData.xp += amount;
        
        // Use WHILE loop to handle multiple level ups at once
        while(this.playerData.xp >= this.playerData.xpToNextLevel) {
            this.playerData.level++;
            this.playerData.xp -= this.playerData.xpToNextLevel;
            this.playerData.xpToNextLevel = Math.floor(this.playerData.xpToNextLevel * 1.5);
            
            console.log(`[LEVEL UP] Level ${this.playerData.level} reached! Next XP: ${this.playerData.xpToNextLevel}`);
            document.dispatchEvent(new CustomEvent('level-up', { detail: { level: this.playerData.level } }));
        }
        
        document.dispatchEvent(new CustomEvent('player-stats-update'));
    }
}

export const gameState = new GameState();
