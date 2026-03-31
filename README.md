# 🛣️ Road Meteo

> Visualisez la météo **projetée dans le temps** le long de votre itinéraire routier.

Road Meteo calcule votre trajet et affiche les prévisions météo à chaque étape **à l'heure estimée de votre passage**, pas simplement la météo actuelle.

## ✨ Fonctionnalités

- 🗺️ **Calcul d'itinéraire** — Recherche d'adresses avec autocomplétion (Nominatim), calcul du trajet optimal (OSRM)
- 🌦️ **Météo projetée dans le temps** — Chaque point de l'itinéraire affiche la prévision à l'heure d'arrivée estimée (Open-Meteo hourly forecast)
- ⚠️ **Alertes intelligentes** — Détection automatique des conditions dangereuses (orages, verglas, brouillard, vents forts, neige)
- 📍 **Points d'étape interactifs** — Cliquez sur les marqueurs météo sur la carte pour voir le détail (température, vent, humidité, précipitations, heure d'arrivée estimée)
- 🌑 **Dark mode premium** — Interface glassmorphism moderne avec carte CartoDB Dark Matter
- 📱 **Responsive** — Fonctionne sur desktop et mobile

## 🛠️ Stack technique

| Composant | Technologie |
|-----------|-------------|
| Framework | React 19 + Vite 6 |
| Carte | Leaflet + react-leaflet |
| Routing | OSRM (gratuit, sans clé API) |
| Météo | Open-Meteo hourly forecast (gratuit, sans clé API) |
| Géocodage | Nominatim / OpenStreetMap (gratuit) |
| Design | Glassmorphism, Inter font, CSS pur |

## 📦 Installation

```bash
# Cloner le repo
git clone <url-du-repo>
cd road_meteo

# Installer les dépendances
npm install

# Lancer en développement
npm run dev
```

L'app est accessible sur `http://localhost:5173/`

## 🚀 Build production

```bash
npm run build
npm run preview
```

Les fichiers de build sont générés dans `dist/`.

## 🏗️ Architecture

```
src/
├── App.jsx                    # Composant racine, state management
├── main.jsx                   # Point d'entrée React
├── index.css                  # Design system complet (glassmorphism)
├── components/
│   ├── MapView.jsx            # Carte Leaflet, calcul d'itinéraire, markers météo
│   ├── SearchPanel.jsx        # Recherche d'adresses avec autocomplétion
│   └── WeatherPanel.jsx       # Panneau latéral avec résumé et détails par point
├── services/
│   ├── weatherService.js      # Appels Open-Meteo (hourly forecast + matching ETA)
│   └── geocodingService.js    # Appels Nominatim (recherche + reverse geocoding)
└── utils/
    └── routeUtils.js          # Sampling de points, calcul ETA, codes WMO, alertes
```

## ⚙️ Comment ça marche

1. L'utilisateur entre un point de départ et un point d'arrivée
2. OSRM calcule l'itinéraire optimal (distance + **durée**)
3. Des points sont échantillonnés le long du tracé (tous les 10-50 km selon la distance)
4. Pour chaque point, l'**heure d'arrivée estimée** est calculée proportionnellement :
   ```
   ETA = heure_départ + (distance_point / distance_totale) × durée_totale
   ```
5. Open-Meteo retourne les prévisions **horaires** pour chaque point
6. L'app sélectionne pour chaque point la tranche horaire la plus proche de son ETA
7. Résultat : la météo affichée correspond à ce que vous observerez réellement en roulant

## 🌐 APIs utilisées

Toutes les APIs sont **gratuites et sans clé** :

- **[OSRM](https://router.project-osrm.org/)** — Calcul d'itinéraire routier
- **[Open-Meteo](https://open-meteo.com/)** — Prévisions météo horaires (jusqu'à 16 jours)
- **[Nominatim](https://nominatim.openstreetmap.org/)** — Géocodage et reverse geocoding

## 📄 Licence

[MIT](LICENSE)
