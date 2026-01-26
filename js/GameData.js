// js/GameData.js

export const GAME_CONSTANTS = {
    PLAYER_START_HP: 100,
    BOSS_START_HP: 300,
    BOSS_DAMAGE: 15,
};

export const CLASSES = {
    FERRAILLEUR: {
        name: "Ferrailleur",
        description: "Brutal. Expert en mêlée.",
        stats: { hp: 120, maxAp: 6, maxPm: 4 }, 
        spells: [
            { id: 'SMASH', name: 'Coup de Clé', cost: 3, dmg: 35, range: 1.5, type: 'DMG', desc: "Frappe lourde" },
            { id: 'THROW', name: 'Lancer de Boulon', cost: 2, dmg: 15, range: 6, type: 'DMG', desc: "Tir" },
            { id: 'QUAKE', name: 'Séisme (AOE)', cost: 4, dmg: 20, range: 0, area: 3, type: 'AOE', cooldown: 2, desc: "Dégâts de zone autour de soi" }, // New AOE
            { id: 'ULT_MECH', name: 'ULT: Mecha-Rage', cost: 6, dmg: 50, range: 1.5, type: 'ULT', cooldown: 3, desc: "Dégâts massifs + Gain d'armure" } // New ULT
        ],
        passive: "Récupérateur: +Gain de Scrap"
    },
    SURVIVANT: {
        name: "Survivant",
        description: "Tank Berserker.",
        stats: { hp: 160, maxAp: 5, maxPm: 5 },
        spells: [
            { id: 'RAGE', name: 'Enragé', cost: 2, dmg: 45, range: 1.5, type: 'DMG', selfDmg: 5, desc: "Dégâts élevés, coûte des PV" },
            { id: 'SHOTGUN', name: 'Canon Scié', cost: 3, dmg: 60, range: 3, type: 'DMG', desc: "Cône frontal (simulé)" },
            { id: 'GRENADE', name: 'Grenade (AOE)', cost: 4, dmg: 25, range: 6, area: 3, type: 'AOE_RANGED', elementType: 'FIRE', cooldown: 2, desc: "Explosion de zone" }, // New AOE
            { id: 'ULT_SURV', name: 'ULT: Vengeance', cost: 0, dmg: 0, range: 0, type: 'ULT_BUFF', cooldown: 3, desc: "Dégâts doublés ce tour (Low HP)" } // New ULT
        ],
        passive: "Adrénaline: Dégâts augmentent quand PV bas"
    },
    BIOLOGISTE: {
        name: "Biologiste",
        description: "Soigne et empoisonne.",
        stats: { hp: 100, maxAp: 7, maxPm: 3 },
        spells: [
            { id: 'POISON', name: 'Fiole Acide', cost: 3, dmg: 10, range: 7, type: 'DOT', duration: 3, desc: "Poison" },
            { id: 'GAS', name: 'Gaz Moutarde (AOE)', cost: 4, dmg: 8, range: 5, area: 4, type: 'AOE_RANGED', cooldown: 2, desc: "Zone de poison large" }, // New AOE
            { id: 'HEAL', name: 'Soin Rapide', cost: 2, dmg: -30, range: 5, type: 'HEAL', desc: "Soin cible" },
            { id: 'ULT_LIFE', name: 'ULT: Panacée', cost: 6, dmg: -100, range: 10, type: 'HEAL', cooldown: 3, desc: "Soin complet" } // New ULT
        ],
        passive: "Immunité: Résiste aux zones acides"
    },
    DISRUPTEUR: {
        name: "Disrupteur",
        description: "Hacker tech.",
        stats: { hp: 90, maxAp: 8, maxPm: 3 },
        spells: [
            { id: 'LASER', name: 'Laser', cost: 3, dmg: 40, range: 8, type: 'DMG', desc: "Tir précis" },
            { id: 'STATIC', name: 'Champ Statique (AOE)', cost: 4, dmg: 15, range: 6, area: 3, type: 'AOE_RANGED', cooldown: 2, desc: "Zone éclectrique" }, // New AOE
            { id: 'STUN', name: 'EMP', cost: 4, dmg: 10, range: 5, type: 'DEBUFF', effect: 'STUN', desc: "Stun cible" },
            { id: 'ULT_HACK', name: 'ULT: Blackout', cost: 7, dmg: 20, range: 20, area: 20, type: 'AOE_RANGED', cooldown: 3, desc: "AOE Global Map Damage" } // New ULT
        ],
        passive: "Surcharge: +10% Dégâts Robots"
    },
    DEV: {
        name: "Dev Mode",
        description: "GOD MODE. Pour tester et tout casser.",
        stats: { hp: 9999, maxAp: 99, maxPm: 99 },
        spells: [
            { id: 'SMITE', name: 'Smite (OneShot)', cost: 0, dmg: 9999, range: 20, type: 'DMG', desc: "Supprime une cible de l'existence." },
            { id: 'NUKE', name: 'NUKE TACTIQUE', cost: 0, dmg: 99999, range: 0, area: 50, type: 'AOE', cooldown: 0, desc: "Nettoie la zone entière." }, 
            { id: 'HEAL_FULL', name: 'Full Heal', cost: 0, dmg: -9999, range: 0, type: 'HEAL', desc: "Soin complet." },
            { id: 'SKIP', name: 'Skip Turn', cost: 0, dmg: 0, range: 0, type: 'ULT_BUFF', desc: "Passe le tour." }
        ],
        passive: "ADMIN: Vous ne pouvez pas perdre."
    }
};

// --- ENEMY DATA (For AI & Stats) ---
export const ENEMY_TYPES = {
    MELEE_RAT: { name: "Rat Mutant", hp: 40, ap: 4, pm: 4, range: 1.5, dmg: 10, skin: "rat" },
    RANGED_CAT: { name: "Chat Sniper", hp: 30, ap: 6, pm: 3, range: 10, dmg: 15, skin: "cat_sniper" },
    TANK_CAT: { name: "Chat Garde", hp: 80, ap: 4, pm: 2, range: 1.5, dmg: 12, skin: "cat_guard" }
};


export const ENEMIES = {
    // ... Existing MOBS ...
    MOB_RAT: { name: "Rat Muté", type: "BEAST", hp: 30, damage: 5, pm: 3, xp: 10, sprite: "RAT" },
    MOB_ROBOT: { name: "Sentinelle", type: "MECH", hp: 50, damage: 10, pm: 2, xp: 25, sprite: "ROBOT" },
    
    // --- ZONE 2 MOBS (The Foundry) ---
    MOB_CAMERADRONE: { name: "Drone Vigie", type: "MECH", hp: 40, damage: 5, pm: 6, xp: 15, sprite: "DRONE_EYE", range: 6 },
    MOB_WELDER_BOT: { 
        name: "Soudeur Fou", 
        type: "MECH", 
        hp: 120, // Increased HP
        damage: 20, 
        pm: 3, 
        xp: 60, 
        sprite: "ROBOT_RED", 
        desc: "Immune au feu. Flamethrower.", 
        damageResist: { 'FIRE': 1.0 },
        spells: [ // New Spell List
            { id: 'FLAMETHROWER', name: 'Lance-Flamme', dmg: 25, range: 4, type: 'DMG', elementType: 'FIRE', cooldown: 3 },
            { id: 'SMASH', name: 'Coup de Pince', dmg: 15, range: 1.5, type: 'DMG' }
        ]
    },
    MOB_CHEM_CAT: { 
        name: "Chat Chimiste", 
        type: "ORGANIC", 
        hp: 80, 
        damage: 15, 
        pm: 4, 
        xp: 50, 
        sprite: "CAT_GAS", 
        desc: "Lance des fioles acides", 
        damageResist: { 'POISON': 0.8 },
        spells: [ // New Spell List
            { id: 'ACID_FLASK', name: 'Fiole Acide', dmg: 10, range: 6, type: 'DOT', duration: 3, elementType: 'POISON', cooldown: 2 },
            { id: 'HEAL_POTION', name: 'Potion de Soin', dmg: -20, range: 0, type: 'HEAL', cooldown: 4 }
        ]
    },

    // ... BOSSES ...
    MARQUIS: { 
        name: "Marquis de Botté (BOSS)", 
        type: "BOSS",
        hp: 2000, // Reduced from 2000 for balance? No, kept strong. User asked 2k.
        damage: 40,
        pm: 6,
        xp: 5000,
        sprite: "MARQUIS", 
        maxHp: 2000, 
        spells: [
            { id: 'RAPIER', name: 'Estoc Rapide', dmg: 40, range: 1.5, type: 'DMG', desc: "Attaque de base rapide" },
            { id: 'DASH', name: 'Botte Secrète (Dash)', dmg: 60, range: 6, type: 'DASH_DMG', desc: "Charge en avant" },
            { id: 'PULL', name: 'Lazo de Soie (Pull)', dmg: 20, range: 10, type: 'PULL', desc: "Attire la cible + faibles dégâts" }, // Modified to deal DMG
            { id: 'EYES', name: 'Yeux Doux (Stun)', dmg: 0, range: 10, type: 'STUN', desc: "Charme si regardé" },
            { id: 'PARRY', name: 'En Garde ! (Def)', dmg: 0, range: 0, type: 'BUFF_PARRY', desc: "Bloque la prochaine attaque" },
            
            // ULTIMATE (Every 4 Turns)
            { id: 'ULT_STAMPEDE', name: 'ULT: Stampede de Bottes', dmg: 100, range: 20, type: 'AOE_MAP', desc: "Pluie de bottes géantes (AOE)" }
        ],
        turnCounter: 0,
        ultCooldown: 4
    }
};

export const DIALOGUES = {
    HUB_INTRO: "Bienvenue dans le Terrier, résistant. Le métro est votre seul refuge.",
    ZONE1_ENTER: "Zone 1 : Europa. L'air sent la poudre de riz et la moisissure.",
    BOSS_ENCOUNTER: "Marquis de Botté : 'Hola ! Vous osez fouler mes pavés avec vos chaussures sales ? En garde !'",
    COMBAT_WIN: "Vous avez vaincu le Marquis ! L'honneur est sauf.",
    COMBAT_LOSE: "Le Marquis vous a botté les fesses...",
    
    // --- ZONE 1 PUZZLE ---
    ELEVATOR_LOCKED: {
        text: "L'ascenseur est bloqué par un verrou biométrique ancien. Une plaque gravée affiche l'Hymne de l'Union :\n\n'Pour bâtir notre Avenir commun :\n1. D'abord, regarde le CIEL infini (Bleu).\n2. Puis, suis les ÉTOILES guides (Jaune).\n3. Enfin, scelle le pacte par le COURAGE du peuple (Rouge).'\n\n(Ordre requis : Bleu -> Jaune -> Rouge)",
        options: [{text: "J'ai compris.", action: "CLOSE"}]
    },
    PUZZLE_SUCCESS: {
        text: "Les mécanismes centenaires s'activent en jouant 'L'Ode à la Joie'.\nLes portes du Marquis s'ouvrent devant vous.",
        options: [{text: "Affronter le Marquis (BOSS)", action: "ENTER_BOSS"}]
    },
    
    // --- MARQUIS BOSS FIGHT ---
    MARQUIS_INTRO: {
        npc: "??? (Noblesse Féline)",
        text: "??? : 'Qui ose troubler ma sieste ? Un manant ? \n(Il lisse sa moustache, ajustant sa cape de velours)\n\nJe suis celui que l'on nomme le Marquis de Botté. Ma lame est plus rapide que votre pensée, et mes bottes... ah, mes bottes sont magnifiques, n'est-ce pas ?'",
        options: [{text: "C'est fini Marquis, rendez-vous !", action: "MARQUIS_INTRO_2"}]
    },
    MARQUIS_INTRO_2: {
        npc: "Marquis de Botté",
        text: "Marquis : 'Se rendre ? Quelle impolitesse ! Un chat de ma lignée ne se rend jamais.\n\nJe vais faire de vous une pelote de laine ! Préparez-vous à mourir avec élégance !\n\nEN GARDE !'",
        options: [
            {text: "Je vais te botter le train !", action: "START_BOSS_FIGHT"}, 
            {text: "Quelles belles bottes...", action: "START_BOSS_FIGHT"}
        ]
    },
    
    // --- DIALOGUES DU DOC (LORE: Dr. Aris 'Doc' - Ex-Aelurus Geneticist) ---
    intro_doc: { 
        text: "DOC: Reculez ! Laissez-moi scanner votre signature thermique... Hmpf. Humain. Non-augmenté. \n\nJe suis le Dr. Aris. Ancien d'Aelurus Dynamics. Projet Cognito... J'ai créé le poison, maintenant je cherche l'antidote.", 
        options: [
            { text: "Cest vous qui avez créé les chats intelligents ?", action: 'DOC_LORE_1' },
            { text: "J'ai besoin d'équipement.", action: 'CLOSE' }
        ]
    },

    quest_pending_doc: { 
        text: "DOC: Vous traînez... Les scanners orbitaux de la Lune ne dorment jamais. Trouvez-moi ce satané module de décryptage dans les ruines. Sans lui, on est sourds et aveugles face à 'Lui'.", 
        options: [{text: "Je m'en occupe.", action: 'CLOSE'}] 
    },

    decode_msg: {
        text: "DOC: Par la barbe de Pasteur ! C'est un Décodeur 56k Aelurus ! \n\n(Il branche le module. Des sons 8-bit stridents remplissent la pièce) \n\nVous entendez ça ? Ce n'est pas du bruit... C'est une mélodie. Ça vient de la Lune. 'Lui' nous regarde.", 
        options: [{text: "Qui ça 'Lui' ?", action: 'MQ01_END_VALIDATE'}]
    },

    post_quest_doc: {
        text: "DOC: Le signal lunaire... C'est le Patient Zéro. Mon Dieu, qu'avons-nous fait ? \n\nAllez voir le Mécano. Dites-lui que j'ai les codes pour le téléporteur d'Europa.", 
        options: [{text: "Compris.", action: 'CLOSE'}]
    },
    
    // --- DIALOGUES MECANO ---
    mecano_talk: {
        text: "MÉCANO: Hey p'tit. Tu viens de la part du Doc ? \n\nCe vieux fou pense que les chats viennent de l'espace maintenant... M'enfin, s'il a les codes, je peux t'ouvrir l'accès à la Zone Europa. Attention au Marquis, il manie l'épée comme un démon.",
        options: [{text: "Je suis prêt.", action: 'CLOSE'}]
    },

    // --- ONE SHOT / EASTER EGGS / SYSTEM ---
    NPC_DEFAULT: "... (Le PNJ vous ignore)",
    
    // --- ZONE 2 PUZZLES ---
    PUZZLE_TEMP_HINT: {
        text: "PROTOCOLE DE SECURITE: \nPour redémarrer le cœur, suivez le cycle thermique naturel.\n\nDu plus FROID (Glace), vers le NEUTRE (Vie), jusqu'au plus CHAUD (Magma).",
        options: [{text: "J'ai compris. (Bleu -> Vert -> Rouge)", action: "CLOSE"}]
    }
};
