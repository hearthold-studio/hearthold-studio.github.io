# Site Hearthold

Site de la maison mère Hearthold (Moon Beam Studio, First Light). HTML statique, sans dépendance ni requête externe.
Publication prévue : GitHub Pages, dépôt `hearthold-studio/hearthold-studio.github.io`.

- En-tête et pied de page communs : `site.js` (avec le choix de langue).
- Textes anglais dans les pages, traductions dans `i18n.js` (clés `data-i`). Ajouter une langue : l'ajouter à `SUP` et au menu dans `site.js`, puis dans `i18n.js`.
- `img/apple-touch-icon.png` et `img/og.png` sont générés à partir de `img/hearthold.svg`.
- Mentions légales : l'adresse reste à compléter dans `legal.html`.
- Ne pas toucher au site Moon Beam (moonbeamstudio.github.io) : fiches App Store et app-ads.txt en dépendent.
- Accueil : expérience 3D au défilement (`js/experience.js` : chronologie pilotée par la variable p de 0 à 1 ; `js/phone.js` téléphone bordeaux modélisé en code ; `js/hearth.js` foyer et flamme calculée ; `js/worlds.js` îlots-dioramas des jeux et cartes First Light ; `js/studio-env.js` éclairage). Three.js 0.179.1 hébergé dans `vendor/three/` (licence MIT).
- Sans WebGL ou avec « réduire les animations » : classe `still` sur <html>, accueil fixe (bandeau de nuit), aucune 3D chargée.
- Pages de contenu : `motion.js` (titres mot à mot, apparitions), uniquement transform/opacity.
- Images de l'écran du téléphone : `img/screens/` (captures App Store) ; éléments des îlots : `img/worlds/` (copiés des jeux, jamais modifiés dans les jeux).
