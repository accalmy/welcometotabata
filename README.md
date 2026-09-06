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

Un **départ différé** de 3 secondes précède la séance (réglable : aucun, 3, 5
ou 10 s), avec trois tics avant le premier gong. Il vit à des temps négatifs :
la séance elle-même n'est pas décalée d'une seconde, et la barre de progression
ne démarre qu'au premier gong.

## Mode focus

Le bouton plein écran ne laisse que l'anneau : ni chiffres, ni libellés, ni
boutons. La couleur suit la phase — orange en effort, cyan en repos — donc on
lit sa séance sans rien avoir à compter. Toucher l'écran met en pause, `Échap`
ou la croix en sortent.

## Le son

L'effort et le repos ont chacun leur voix, réglable séparément : on distingue
les deux phases au timbre, sans rien avoir à compter. Par défaut, **Gong 1**
(frappe courte de 5 s) ouvre l'effort et **Gong 2** (résonance de 9 s) ouvre le
repos — un bouton inverse les deux, et **Synthétique** reste disponible sur
chaque rôle : une cloche générée à la volée sur les partiels inharmoniques de
Risset, sans aucun fichier à charger.

Aucun gong ne déborde sur l'intervalle suivant. Chaque signal connaît la place
qui lui reste avant le prochain, et se fond au silence pile sur la frontière si
sa résonance est plus longue : Gong 2 (9,6 s) tient tout juste dans un repos de
10 s, et serait coupé net sur un repos plus court.

Le gong final rejoue la frappe d'effort transposée vers le grave, pour qu'on ne
le confonde pas avec un gong de minute.

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
tombe à t = 0, alignement des niveaux à −18 LUFS, correction à l'oreille, fondu
de queue, MP3 96 kbps.

Cette correction est le dernier mot, pas les mesures. Après normalisation, gong
1 mesurait déjà 1,4 LUFS de plus que gong 2 et crêtait 2 dB plus haut, et
passait pourtant pour le signal faible à l'usage : gong 2 résonne neuf secondes
et remplit tout un temps de repos, donc il s'impose davantage quoi qu'en dise le
mètre. Gong 1 est relevé de 5 dB dans le script — un seul nombre à retoucher si
l'équilibre ne convient pas.

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
