export const Lore = {
    Common: {
        GCC: "Le Grand Conseil Cyber (G.C.C.). Une bande de vieux humains en bocal qui pensent que le monde tourne rond tant que les croquettes sont synthétiques.",
        Rebellion: "Wiskers Rebellion. On est pas des héros, juste des chats qui en ont marre de manger du plastique.",
        City: "Neo-Felis. Une poubelle géante avec des néons pour faire joli. Si tu tombes, tu tombes longtemps."
    }
};

export const MainQuest = [
    {
        id: 'MQ01_AWAKENING',
        title: "Le Réveil",
        description: "Doc semble avoir des réponses. Parlez-lui.",
        steps: [
            {
                id: 'TALK_TO_DOC',
                description: "Parlez à Doc (Obligatoire).",
                target: 'DOC',
                dialogueId: 'intro_doc_start'
            },
            {
                id: 'FIND_ACCESS_CARD',
                description: "Trouver la Carte d'Accès de la sécurité.",
                target: 'ACCESS_CARD',
                hint: "Fouillez les débris près du vieux serveur."
            },
            {
                id: 'OPEN_GATE',
                description: "Ouvrir la porte principale.",
                target: 'MAIN_GATE',
                hint: "Utilisez la console."
            }
        ]
    }
];

export const Dialogues = {
    // --- LORE DEEP DIVE: Dr. Aris 'Doc' ---
    'intro_doc_start': {
         npc: 'Doc', 
        text: "Halte ! Ne t'approche pas si tu es contaminé... Attends. Tes pupilles... Tu es l'un des *Éveillés* ? \n\nJe suis le Dr. Aris. Et si tu veux survivre dans cette fosse commune qu'est la Zone 1, tu vas devoir m'écouter.", 
        options: [
            { text: "Qui êtes-vous ?", action: 'DOC_WHO' },
            { text: "Où sommes-nous ?", action: 'DOC_WHERE' },
            { text: "Pourquoi je me sens bizarre ?", action: 'DOC_AWAKENING' }, 
            { text: "[Partir] Je n'ai pas le temps.", action: 'DOC_REFUSE' } // Loop back
        ]
    },
    'DOC_REFUSE': {
        npc: 'Doc',
        text: "Tu ne feras pas dix mètres sans que tes poumons fondent ou qu'un Charognard te dévore. Reviens ici et écoute.",
        options: [
            { text: "... D'accord, je vous écoute.", action: 'intro_doc_start' }
        ]
    },
    'DOC_WHO': {
        npc: 'Doc',
        text: "J'étais généticien pour la Corporation Aelurus. Nous cherchions à créer des animaux de compagnie 'parfaits'. Obéissants. Résistants... \nMais le projet 'Wiskers' a dérapé. Le virus N-9 nous a tous... changés. J'ai fui quand ils ont commencé à purger les laboratoires.",
        options: [
            { text: "Et les autres chats ?", action: 'DOC_CATS' },
            { text: "Retour", action: 'intro_doc_start' }
        ]
    },
    'DOC_WHERE': {
        npc: 'Doc',
        text: "Les Catacombes de Neo-Felis. C'est ici qu'ils jettent les déchets... et les expériences ratées. \nL'air est saturé de gaz neurotoxique. C'est pour ça que la plupart des chats ici sont devenus fous ou sauvages.",
        options: [
            { text: "Comment sortir d'ici ?", action: 'DOC_EXIT' },
            { text: "Retour", action: 'intro_doc_start' }
        ]
    },
    'DOC_AWAKENING': {
        npc: 'Doc',
        text: "Le N-9 réécrit ton code génétique. Force, intelligence... mais aussi rage. \nTu es une anomalie, mon ami. Ton esprit a gardé sa clarté. C'est rare. C'est précieux.",
        options: [
            { text: "Je peux me battre ?", action: 'DOC_COMBAT' },
            { text: "Retour", action: 'intro_doc_start' }
        ]
    },
    'DOC_CATS': {
        npc: 'Doc',
        text: "Les 'Marquis'. Des chats mutants dirigés par une intelligence collective fragmentée. Ils contrôlent cette zone. Si tu veux passer, il faudra te battre.",
        options: [
            { text: "Compris.", action: 'intro_doc_start' }
        ]
    },
    'DOC_COMBAT': {
        npc: 'Doc',
        text: "Tes griffes ne suffiront pas. Concentre ton énergie. Chaque classe d'Éveillé a ses dons. Utilise ton environnement. Et souviens-toi: ils ne te feront pas de cadeau.",
        options: [
            { text: "Je suis prêt.", action: 'DOC_EXIT' }
        ]
    },
    'DOC_EXIT': {
        npc: 'Doc',
        text: "La sortie est verrouillée par le système de sécurité principal. Il te faut une Carte d'Accès. \n\nJ'ai vu un drone de sécurité s'écraser à l'Est, près des générateurs. Fouille là-bas. Et bon courage, Éveillé.",
        options: [
            { text: "[Accepter la Mission] J'y vais.", action: 'QUEST_START_MQ01_STEP2' }
        ]
    },
    'DOC_UPGRADE': {
        npc: 'Doc',
        text: "Mes outils sont prêts. Que veux-tu améliorer ? (Coût: 50 Scrap par intervention)",
        options: [
            { text: "Augmenter mes Dégâts Physiques (+20%)", action: 'ACTION_UPGRADE_DMG' },
            { text: "Renforcer ma Vitalité (+20 PV Max)", action: 'ACTION_UPGRADE_HP' },
            { text: "Améliorer la maîtrise des Sorts (+Niveau)", action: 'ACTION_UPGRADE_SPELL' },
            { text: "Retour", action: 'intro_doc_replay' }
        ]
    },

    // --- NEW TRAGIC NPCs ---
    'felix_tragic': {
        npc: 'Félix',
        text: "(Il mange de la pâtée pour chat à même le sol) \n\nMiaou ? ... Oh, pardon. Des fois j'oublie. Avant, je m'appelais Jean-Pierre. Mais ma famille de chats m'appelait 'Felix'. Ils étaient gentils... jusqu'au jour où ils m'ont stérilisé. \n\n(Il pleure en silence)",
        options: [{text: "...", action: 'CLOSE'}]
    },
    'sarah_tragic': {
        npc: 'Sarah',
        text: "Tu as vu mon petit Léo ? Il portait un sweat rouge... La Milice Féline l'a emmené pendant la Rafle de 2049. Ils ont dit qu'il avait des 'doigts parfaits pour le tissage'. \n\nS'il te plaît, dis-moi qu'il n'est pas dans les usines de laine...",
        options: [{text: "Je garderai l'oeil ouvert.", action: 'CLOSE'}]
    },
    'DOC_LORE_1': {
        npc: 'Doc',
        text: "On voulait juste connecter Felix à la domotique ! Qui aurait cru que le rétrovirus TX-99 muterait en conscience collective ?! \nMaintenant 'Ils' contrôlent tout. Sauf ici. Le métro brouille leurs ondes. Mais il me faut ce maudit Décodeur pour voir ce qu'ils trament sur la Lune.",
        options: [
            { text: "Je vais le trouver.", action: 'QUEST_START_MQ01' },
            { text: "Retour", action: 'intro_doc_replay' }
        ]
    },
    'quest_pending_doc': { 
        npc: 'Doc',
        text: "Vous traînez... Les scanners orbitaux de la Lune ne dorment jamais. Trouvez-moi ce satané module de décryptage dans les ruines. Sans lui, on est sourds et aveugles face à 'Lui'.", 
        options: [{text: "Je m'en occupe.", action: 'CLOSE'}] 
    },
    'decode_msg': {
        npc: 'Doc',
        text: "Par la barbe de Pasteur ! C'est un Décodeur 56k Aelurus ! \n\n(Il branche le module. Des sons 8-bit stridents remplissent la pièce) \n\nVous entendez ça ? Ce n'est pas du bruit... C'est une mélodie. Ça vient de la Lune. 'Lui' nous regarde.", 
        options: [{text: "Qui ça 'Lui' ?", action: 'MQ01_END_VALIDATE'}]
    },
    'post_quest_doc': {
        npc: 'Doc',
        text: "Le signal lunaire... Il y a quelque chose là-haut qui nous observe. Ce n'est pas un satellite. C'est une conscience faite de pixels et de lumière colorée. Une anomalie cosmique.\n\nVous avez accès à mon savoir maintenant.", 
        options: [{text: "Ouvrir le dialogue", action: 'intro_doc_replay'}]
    },
    
    'DOC_ZONES_MENU': {
        npc: 'Doc',
        text: "(Il tapote sa tablette holographique) Quelle zone vous intrigue, voyageur ?",
        options: [
            { text: "Zone 1: Les Égouts", action: 'DOC_LORE_ZONE1' },
            { text: "Zone 2: La Maintenance", action: 'DOC_LORE_ZONE2' },
            { text: "Zone 3: Les Ruines", action: 'DOC_LORE_ZONE3' },
            { text: "Zone 4: La Surface", action: 'DOC_LORE_ZONE4' },
            { text: "Retour", action: 'intro_doc_replay' } 
        ]
    },

    'DOC_LORE_ZONE1': {
        npc: 'Doc',
        text: "ZONE 1 : LES ÉGOUTS (Niveau 1-3)\n\nC'est notre sas de décompression. Autrefois le système de drainage de Neo-Felis, c'est devenu un nid à Vermine Cybernétique. L'hygiène y est... déplorable. Mais c'est le seul chemin vers le coeur de la ville qui ne soit pas surveillé par les drônes.",
        options: [{ text: "Autre chose ?", action: 'DOC_ZONES_MENU' }]
    },
    'DOC_LORE_ZONE2': {
        npc: 'Doc',
        text: "ZONE 2 : SECTEUR MAINTENANCE (Niveau 3-5)\n\nC'est là que les machines qui font tourner la ville ronronnent. C'est chaud, bruyant et rempli de Robots de Nettoyage devenus fous. On dit que le Marquis de Botté y a établi un avant-poste.",
        options: [{ text: "Autre chose ?", action: 'DOC_ZONES_MENU' }]
    },
    'DOC_LORE_ZONE3': {
        npc: 'Doc',
        text: "ZONE 3 : LES RUINES DU LABO (Niveau 5-8)\n\n(Il soupire) Mon ancien laboratoire... C'est là que tout a commencé. Les expériences sur le génome félin, le projet 'Nyan'. C'est une zone hantée par des échecs génétiques. N'y allez pas sans une bonne arme. Il reste des données corrompues là-bas.",
        options: [{ text: "Autre chose ?", action: 'DOC_ZONES_MENU' }]
    },
    'DOC_LORE_ZONE4': {
        npc: 'Doc',
        text: "ZONE 4 : LA SURFACE (Niveau 10+)\n\nLe territoire des Matous de l'Olympe. Là-haut, le ciel est faux, projeté sur un dôme. Les chats aristocrates y vivent dans le luxe. Mais ce n'est pas le sommet. Il y a quelque chose... au-dessus. Une transmission qui vient de la Lune. Une mélodie 8-bit qui ne s'arrête jamais...",
        options: [{ text: "Autre chose ?", action: 'DOC_ZONES_MENU' }]
    },
    'intro_doc_replay': {
         npc: 'Doc', 
        text: "Autre chose ? Le temps file, et mes cheveux tombent.", 
        options: [
            { text: "Parlez-moi du Lore (Zones).", action: 'DOC_ZONES_MENU' },
            { text: "L'origine des chats intelligents ?", action: 'DOC_LORE_1' },
            { text: "Je veux améliorer mes compétences (50 Scrap).", action: 'DOC_UPGRADE' },
            { text: "Au revoir.", action: 'CLOSE' }
        ] 
    },

    // --- DIALOGUES MECANO ---
    'mecano_talk': {
         npc: 'Mécano',
        text: "Hey p'tit. Tu viens de la part du Doc ? \n\nCe vieux fou pense que les chats viennent de l'espace maintenant... M'enfin, s'il a les codes, je peux t'ouvrir l'accès à la Zone Europa. Attention au Marquis, il manie l'épée comme un démon.",
        options: [{text: "Je suis prêt.", action: 'CLOSE'}]
    },

    // --- SYSTEM / LORE ---
    'warp_locked': {
        npc: 'SYSTEM',
        text: "[SYSTÈME]: Accès Refusé. \nERR_403: Signature Biométrique Invalide. \n\nNiveau d'accréditation insuffisant pour ce secteur.",
        options: [{text: "Fermer", action: 'CLOSE'}]
    },
    'decoder_found': {
        npc: 'SYSTEM',
        text: "Vous ramassez un boîtier poussiéreux marqué '56k MODEM'. Il vibre encore un peu.",
        options: [
            { text: "Ça fera l'affaire.", action: 'CLOSE' }
        ]
    },
    'decoder_hint': {
        npc: 'SYSTEM',
        text: "Un tas de ferraille inutile. Mais Doc saurait quoi en faire.",
        options: [
            { text: "Je devrais lui parler.", action: 'CLOSE' }
        ]
    },

    // --- ZONE 1 BOSS: LE MARQUIS DE BOTTÉ ---
    'MARQUIS_INTRO': {
        npc: 'Le Marquis',
        text: "Hola ! Qui ose entrer dans mes appartements ? \n\nJe suis le Marquis de Botté ! Tueur d'ogres, amant des duchesses, et le seul chat capable de retomber sur ses pattes avant même d'avoir sauté ! Craignez-moi... si vous l'osez !",
        options: [
            { text: "Je cherche juste la sortie.", action: 'MARQUIS_1' },
            { text: "Un peu trop de lait ce matin ?", action: 'MARQUIS_2' }
        ]
    },
    'MARQUIS_1': {
        npc: 'Le Marquis',
        text: "La sortie ? Ah ! Vous me faites rire. \n\nOn ne tourne pas le dos au danger, amigo ! On le regarde dans les yeux, on lisse ses moustaches, et on plante ses griffes !",
        options: [
            { text: "[Combat] En Garde !", action: 'START_BOSS_FIGHT' }
        ]
    },
    'MARQUIS_2': {
        npc: 'Le Marquis',
        text: "Insolent ! Vous manquez de style, de panache... de grâce ! \n\nJe vais vous apprendre les bonnes manières à la pointe de mon épée. Pour l'honneur... et pour le lait !",
        options: [
            { text: "[Combat] Assez parlé !", action: 'START_BOSS_FIGHT' }
        ]
    },
    'MARQUIS_DEFEAT': {
        npc: 'Le Marquis',
        text: "Impossible... Ma garde... était... parfaite... \n\nPrenez... cette clé... Elle ouvre la voie... Adieu... monde cruel... et sans style...",
        options: [
            { text: "Repose en paix, frimeur.", action: 'CLOSE' }
        ]
    }
};
