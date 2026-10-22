# Gespers
Plateforme web de gestion administrative et de suivi des agents

## API et conformité métier

Les routes suivantes sont disponibles sous `/api/v1` et nécessitent une session
authentifiée, sauf indication contraire. Les permissions sont vérifiées côté
serveur.

| Méthode et route | Permission | Usage |
| --- | --- | --- |
| `GET /dashboard/me` | `agents.read.self` | Tableau de bord personnel : carrière, échéances, congés et documents |
| `GET /dashboard/team` | `agents.read.team` | Agents subordonnés, situation, congés à venir et soldes |
| `GET /dashboard/summary` | `dashboard.read` | Indicateurs RH, comptes, courriers et avancements classe/échelon |
| `GET /agents/:id/historique` | Lecture agent (soi/équipe/tous) | Historique des états, affectations et avancements |
| `POST /agents/:id/affectations` | `agents.write` | Enregistrer une affectation avec date d’effet |
| `PUT /agents/:id/affectations/:sectionId/fin` | `agents.write` | Clôturer une affectation sans effacer son historique |
| `GET /avancements/eligibles?jours=90` | `avancements.read` | Propositions d’échelon et de classe ; validation RH requise pour la classe |
| `GET /conges/solde/:personneId?annee=2026` | Lecture congés (soi/équipe/tous) | Solde annuel : 30 jours par année, report des reliquats |
| `GET /audit?page=&limit=&action=&q=&dateDebut=&dateFin=` | `audit.read` | Journal d’audit paginé et filtrable, connexions comprises |
| `GET /search?q=&typeAgent=&etatCarriere=&divisionId=&sectionId=&typeDocId=` | Authentification | Recherche agents, courriers et documents, filtrée par permissions |
| `PUT /documents/:id/file` | `documents.write` | Remplacer un fichier tout en conservant l’ancienne version |
| `GET /documents/:id/versions/:versionId/file` | Lecture document (soi/équipe/tous) | Télécharger une version précédente |
| `GET /exports/agents.csv` | `export` + `agents.read.all` | CSV RH sans coordonnées ni données de naissance |
| `GET /exports/agents.xlsx` | `export` + `agents.read.all` | Export Excel RH |
| `GET /exports/agents.pdf` | `export` + `agents.read.all` | État RH PDF |
| `GET /exports/agents/:id/dossier.zip` | `export` + lecture agent | Dossier complet JSON et fichiers, versions comprises |
| `GET /documents/export.zip?ids=1,2` | `export` + `documents.read.all` | ZIP de 1 à 100 documents sélectionnés |

La recherche attend un terme de 2 à 100 caractères. L’export ZIP de documents
refuse les sélections dépassant 100 fichiers ; il ne télécharge jamais tout le
registre sans sélection explicite. Les exports et les modifications sensibles
sont inscrits au journal d’audit. L’API verrouille un compte pendant 15 minutes
après 5 mots de passe incorrects. Le rôle `ADMIN_SYSTEME` permet la gestion du
rôle administrateur système ; les permissions restent définies par rôle côté
serveur.

Le solde annuel crédite 30 jours pour chaque année civile depuis l’année
d’entrée de l’agent, soustrait les congés de type `ANNUEL` et reporte les
reliquats sans expiration. Les règles de proratisation à l’année d’entrée ne
sont pas précisées dans le cahier ; l’implémentation crédite une année entière.
L’avancement de classe est calculé comme une proposition et ne modifie pas la
carrière sans validation manuelle.

## Sauvegardes

Avec Docker Compose, le service `backup` effectue un dump PostgreSQL quotidien,
le restaure dans une base de test temporaire pour vérifier qu’il est lisible,
puis conserve 14 jours de dumps dans le volume `db_backups`. Le volume de
sauvegarde est sur le même hôte Docker : l’exploitant doit le répliquer vers un
emplacement hors site conforme à la politique de l’institution. Les identifiants
présents dans le Compose sont réservés au développement et doivent être
remplacés avant tout déploiement.

La migration `20261022093000_conformite_cahier_charges` ajoute les historiques,
les versions de documents, le verrouillage des comptes, le rôle système et la
politique annuelle de congés. Elle doit être appliquée avec `pnpm --filter api
db:migrate` après validation de l’environnement de destination. Les dates
d’affectation antérieures ne pouvant pas être déduites des anciennes tables,
le suivi de ces affectations commence au déploiement de cette migration.

Lors d’une toute première installation sans aucun compte, créer l’agent
administrateur dans le dossier RH, puis lancer `pnpm --filter api
db:bootstrap-admin` avec `BOOTSTRAP_ADMIN_EMAIL`,
`BOOTSTRAP_ADMIN_PASSWORD` (16 caractères minimum) et
`BOOTSTRAP_ADMIN_PERSONNE_ID` fournis comme variables d’environnement
temporaires. La commande refuse de fonctionner dès qu’un compte existe ; ne
placez jamais le mot de passe dans le dépôt ou dans l’historique du shell.
