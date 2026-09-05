# Welcome to Tabata

Timer de sport et de méditation. Sept minuteurs préréglés, une barre de progression
qui se remplit, un mode silencieux complet, et une session de méditation avec
ambiances naturelles.

Next.js 16 · React 19 · Tailwind CSS 4 · Web Audio API. Aucune base de données,
aucun compte, tout tourne dans le navigateur.

## Les minuteurs

| # | Minuteur | Détail |
|---|----------|--------|
| 1 | Tabata 20/10 — 3 min | 20 s effort / 10 s repos, 6 rounds |
| 2 | Intervalle 30/20 — 3 min | 30 s / 20 s, se termine sur un effort de 30 s |
| 3 | Bloc 1 minute | un gong au début, un gong à la fin |
| 4 | Gong 3 minutes | un gong à chaque minute |
| 5 | Gong 5 minutes | un gong à chaque minute |
| 6 | Tabata 20/10 — 5 min | 10 rounds |
| 7 | Intervalle 30/20 — 5 min | 6 rounds |

Plus un mode **Méditation** : durée libre de 1 à 90 minutes, cloches
intermédiaires optionnelles (toutes les 5 ou 10 minutes) et six ambiances.

## Mode focus

Le bouton plein écran ne laisse que l'anneau : ni chiffres, ni libellés, ni
boutons. La couleur suit la phase — orange en effort, cyan en repos — donc on
lit sa séance sans rien avoir à compter. Toucher l'écran met en pause, `Échap`
ou la croix en sortent.

## Le son

Trois voix de gong au choix dans les réglages : **Gong 1** (frappe courte de
5 s), **Gong 2** (résonance de 9 s) et **Synthétique**, une cloche générée à la
volée sur les partiels inharmoniques de Risset — aucun fichier à charger.

Le cliquetis de repos reste synthétisé quelle que soit la voix choisie : un gong
échantillonné résonnerait encore à l'ouverture de l'intervalle suivant. Le gong
final rejoue la même frappe transposée vers le grave, pour qu'on ne le confonde
pas avec un gong de minute.

Tous les repères audio d'une série sont programmés d'avance sur l'horloge de
l'`AudioContext`, et c'est cette même horloge qui pilote l'affichage : le son et
la barre ne peuvent pas dériver l'un par rapport à l'autre, même si l'onglet
passe en arrière-plan.

Couper le son (bouton haut-parleur ou touche `M`) coupe uniquement le gain
maître : le minuteur, la barre et l'anneau continuent normalement.

### Les gongs

[public/gongs/](public/gongs/) contient une seule frappe par voix, découpée dans
les enregistrements d'origine par [scripts/prepare-gongs.sh](scripts/prepare-gongs.sh) :
extraction d'une répétition, suppression du silence de tête pour que l'attaque
tombe à t = 0, alignement des niveaux à −18 LUFS, fondu de queue, MP3 96 kbps.

Les enregistrements sources vivent dans `gongs/`, hors dépôt (voir
`.gitignore`) — seules les frappes découpées sont publiées. Pour changer de
gong, remplacez le fichier source et relancez le script, ou déposez directement
votre MP3 dans `public/gongs/`.

### Ambiances naturelles

Forêt · Mer · Pluie · Ruisseau · Tempête, plus le Silence.

Source : [Nature Sounds (Birds, Rain, Water)](https://archive.org/details/naturesounds-soundtheraphy)
sur Internet Archive, sous licence **CC0 1.0 Universal** (domaine public).
Chaque piste est un extrait de 4 minutes, normalisé à −20 LUFS, ré-encodé en MP3
80 kbps, puis bouclé de façon continue par le moteur audio.

Pour remplacer une ambiance, il suffit de déposer un MP3 au même nom dans
[public/ambience/](public/ambience/). Pour en ajouter une, ajoutez une entrée
dans [lib/ambience.js](lib/ambience.js).

## Raccourcis clavier

| Touche | Action |
|--------|--------|
| `Espace` | démarrer / mettre en pause |
| `R` | réinitialiser |
| `M` | couper / réactiver le son |
| `F` | entrer / sortir du mode focus |
| `Échap` | sortir du mode focus |

## Développement

```bash
npm install
npm run dev     # http://localhost:3000
npm run build
```

## Déploiement

Importer le dépôt sur Vercel : le preset Next.js est détecté automatiquement,
aucune variable d'environnement n'est nécessaire.

## Structure

```
app/              page, layout, styles globaux
components/       vues Entraînement et Méditation, cadran, mode focus, UI
lib/audio.js      moteur Web Audio (gongs échantillonnés ou synthétisés, ambiances)
lib/presets.js    définition des minuteurs et compilation des programmes
lib/useRunner.js  boucle d'exécution calée sur l'horloge audio, focus, wake lock
public/ambience/  les cinq ambiances CC0
public/gongs/     les frappes de gong découpées
scripts/          pipelines audio (téléchargement des ambiances, découpe des gongs)
```

## Licence

Code sous licence MIT. Ambiances sonores sous CC0 1.0 (domaine public). Les
échantillons de gong proviennent d'enregistrements fournis par l'auteur du
projet et ne sont pas couverts par la licence MIT.
