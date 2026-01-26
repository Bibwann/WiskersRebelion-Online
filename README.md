# Whiskers Rebellion 2

## Présentation
Whiskers Rebellion 2 est un jeu Action-RPG / Dungeon Crawler développé pour le web avec BabylonJS. Plongez dans un univers post-apocalyptique, satirique et dark fantasy où l’humanité est asservie par des chats cybernétiques.

**Développeurs** : Federico , Thomas, Bastien

## Lore Fondamental : La Grande Domestication
En 2045, le projet Cognito d’Aelurus Dynamics a transformé les chats en créatures hyper-intelligentes, déclenchant la chute de l’humanité lors de la Nuit du Grand Verrouillage. Les humains sont devenus des serviteurs, indispensables pour la motricité fine des félins, qui règnent désormais sur Terre grâce à la technologie et à la cybernétique. Un mystérieux signal lunaire semble contrôler l’ordre félin mondial...

## Géopolitique & Zones
Le monde est divisé en 4 Protectorats, chacun dirigé par un Boss félin :
- **Zone 1 : Europa** – Aristocratie décadente, boss : Le Marquis de Botté
- **Zone 2 : Americana** – Usine militariste, boss : Gorf-Field, le Dévoreur
- **Zone 3 : Asia-Pacific** – Cyberpunk, boss : Meka-K.I.T.T.Y.
- **Zone 4 : Afrika** – Mystique et solaire, boss : Le Grand Pharaon Imhotep
- **Zone 5 : La Lune** – Final, boss : Nyan Cat

## Classes Jouables
Rejoignez la Résistance Humaine avec 4 archétypes :
- **Le Ferrailleur** : Guerrier brutal, armes improvisées
- **Le Survivant** : Tank, dégâts basés sur la santé manquante
- **Le Biologiste** : Soigneur, buffs et poisons
- **Le Disrupteur** : Mage tech, contrôle et dégâts élémentaires

## Gameplay Loop
- **Hub central** : Le Terrier, métro abandonné pour le craft et les PNJ
- **Missions** : Explorez les zones via un téléporteur instable
- **Combat** : Tour par tour
- **Loot** : Récupérez des composants pour améliorer votre équipement

## Installation & Lancement
1. Ouvrez `index.html` dans votre navigateur.
2. Assurez-vous que les fichiers du dossier `js/` et `css/` sont présents.
3. Le jeu se joue directement dans le navigateur, aucune installation requise.

## Structure du projet
- `index.html` : Point d’entrée du jeu
- `css/style.css` : Styles du jeu
- `js/` : Scripts principaux
  - Systèmes : Combat, Loot, Cinématique, etc.
  - Données : Quêtes, objectifs
  - Zones : BossZone, HubZone, Zone1, Zone2
  - Personnages : PlayerController
  - VFX : Effets visuels

## Technologies
- **BabylonJS** pour le rendu 3D et la gestion du gameplay
- **JavaScript** pour la logique du jeu
- **HTML/CSS** pour l’interface

## Inspirations
- Pop culture : Le Chat Potté, Garfield, Hello Kitty, Imhotep, Nyan Cat
- Ambiances : Dark fantasy, cyberpunk, satire post-apocalyptique

## Contribuer
Toute contribution est la bienvenue ! Contactez les développeurs pour proposer des idées ou des améliorations.

---

> "Craignez-moi... si vous l'osez !" — Le Marquis de Botté

> "La mort n'est que le début... de votre servitude." — Le Grand Pharaon Imhotep

> "L'amitié, c'est la magie. La magie, c'est la puissance de feu supérieure." — Meka-K.I.T.T.Y.

## Licence
Projet réalisé à des fins éducatives et créatives. Voir les fichiers du projet pour plus d’informations.

## How to run the project
Once you have the run project on yout machine run the following commands

```shell
docker build -t whiskers <PATH_TO_PROJECT>   
```
```shell
docker run -it --rm -d -p 8080:80 --name whiskers whiskers
```
