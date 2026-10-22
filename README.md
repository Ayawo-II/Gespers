# Gespers
Plateforme web de gestion administrative et de suivi des agents

## API de synthèse et d’export

Les routes suivantes sont disponibles sous `/api/v1` et nécessitent une session
authentifiée, sauf indication contraire. Les permissions sont vérifiées côté
serveur.

| Méthode et route | Permission | Usage |
| --- | --- | --- |
| `GET /dashboard/summary` | `dashboard.read` | Indicateurs RH et répartitions |
| `GET /audit?page=&limit=&action=&q=&dateDebut=&dateFin=` | `audit.read` | Journal d’audit paginé et filtrable |
| `GET /search?q=` | Authentification | Recherche globale limitée aux catégories autorisées |
| `GET /exports/agents.csv` | `export` + `agents.read.all` | Export CSV RH sans coordonnées ni données de naissance |
| `GET /documents/export.zip?ids=1,2` | `export` + `courriers.read` | ZIP de 1 à 100 documents sélectionnés |
| `GET /documents/export.zip?personneId=1` | `export` + `courriers.read` | ZIP des documents associés à un agent (100 maximum) |
| `GET /documents/export.zip?typeDocId=1` | `export` + `courriers.read` | ZIP des documents d’un type (100 maximum) |
| `GET /documents/export.zip?dansRegistreGeneral=true` | `export` + `courriers.read` | ZIP du registre général (100 maximum) |

La recherche globale attend un terme de 2 à 100 caractères. L’export ZIP refuse
les filtres qui dépassent 100 documents ; il ne télécharge jamais tout le
registre sans sélection explicite. Les exports sont inscrits dans le journal
d’audit. Les migrations Prisma doivent être appliquées séparément par
l’administrateur de la base après validation.
