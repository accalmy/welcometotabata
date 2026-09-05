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

## Le son

Les signaux (gong d'effort, cliquetis de repos, gong de minute, gong final,
tics de décompte) sont **synthétisés** en direct avec la Web Audio API — pas de
fichier à charger, pas de latence, et un timbre de cloche construit sur les
partiels inharmoniques de Risset.

Tous les repères audio d'une série sont programmés d'avance sur l'horloge de
l'`AudioContext`, et c'est cette même horloge qui pilote l'affichage : le son et
la barre ne peuvent pas dériver l'un par rapport à l'autre, même si l'onglet
passe en arrière-plan.

Couper le son (bouton haut-parleur ou touche `M`) coupe uniquement le gain
maître : le minuteur, la barre et l'anneau continuent normalement.

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
app/            page, layout, styles globaux
components/     vues Entraînement et Méditation, cadran, primitives d'UI
lib/audio.js    moteur Web Audio (synthèse des signaux + ambiances)
lib/presets.js  définition des minuteurs et compilation des programmes
lib/useRunner.js  boucle d'exécution calée sur l'horloge audio
public/ambience/  les cinq ambiances CC0
```

## Licence

Code sous licence MIT. Ambiances sonores sous CC0 1.0 (domaine public).
