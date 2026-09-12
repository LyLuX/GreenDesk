# Journal des modifications

## Non publié

## 9.1.3 - 2026-09-12

- [PATCH] Les erreurs courantes des utilisateurs, des droits et des catalogues s’affichent en français, avec des conventions de développement documentées et un rangement cohérent du module catégories.

- [PATCH] Les contrôles qualité couvrent désormais les composants React et leurs hooks, avec un formatage homogène vérifié automatiquement pour prévenir les régressions.

- [PATCH] GitHub vérifie automatiquement les tests, le lint, la cohérence des versions, OpenAPI et la compilation à chaque push sur main et pour chaque pull request vers main.

- [PATCH] Les installations et mises à jour SQL reposent entièrement sur des migrations vérifiées ; le démarrage signale les migrations manquantes et les tests MySQL contrôlent la conservation des données.

## 9.1.2 - 2026-09-12

- [PATCH] Les champs de date partagent un calendrier en français aux couleurs de GreenDesk, affiché en superposition au-dessus ou en dessous du champ pour rester visible, avec sélection rapide du mois et de l’année, raccourcis et navigation au clavier.

- [PATCH] Un clic sur une pièce dans les relations affiche uniquement cette référence dans le catalogue, avec un bouton pour retrouver toutes les pièces.

- [PATCH] La création d’un matériel propose les noms et unités déjà présents dans la liste pendant la saisie, comme pour les pièces de maintenance.

- [PATCH] Le choix de société est intégré près du logo dans l’en-tête : titre GreenDesk toujours visible, nom aligné sur une seule ligne sans troncature, menu placé sous le bouton et ajusté au contenu, avec un fondu rapide à l’ouverture et à la fermeture.

- [PATCH] Après une déconnexion de sécurité, seule la notification dédiée apparaît et la reconnexion mène au tableau de bord ; l’accès à un lien protégé sans connexion conserve son fonctionnement habituel.

## 9.1.1 - 2026-09-10

- [PATCH] Les numéros de série sont affichés sans préfixe dans les relations et leur libellé est harmonisé dans les fiches imprimées.

- [PATCH] Le tableau de maintenance d’un matériel précise la priorité, le type, la périodicité et le dernier entretien dans une présentation compacte.

- [PATCH] Une notification explique les déconnexions de sécurité, y compris après expiration ou modification des droits, et les notifications utilisent le vouvoiement.

- [PATCH] Le logo de la société apparaît aussi dans la vue des relations ; GreenDesk sert de repli lorsqu’un logo est absent, inaccessible ou illisible.

- [PATCH] La vue des relations regroupe par catégorie les matériels ayant des pièces prévues ou consommées, démarre sur la société repliée avec ses compteurs et cadre le matériel sélectionné avec ses pièces.

## 9.1.0 - 2026-09-09

- [MINOR] La vue des relations relie directement les matériels aux pièces prévues et consommées, avec les quantités et la dernière utilisation consultables dans un graphe simple.

- [PATCH] Les fiches de maintenance à imprimer sont triées par échéance, avec les plans en retard avant les échéances à venir et les plans selon l’usure en dernier.

- [PATCH] Le filtre « En stock » des pièces de maintenance exclut les pièces au seuil minimum, désormais accessibles avec le filtre distinct « Stock minimum ».

## 9.0.1 - 2026-09-06

- [PATCH] Les styles sont organisés par domaine et les couleurs, y compris celles de la cartographie, sont centralisées pour faciliter les évolutions du thème en conservant le rendu actuel.

- [PATCH] Les refus de permissions répétés sont signalés dans les journaux de sécurité avec des seuils configurables et un regroupement limitant les doublons, sans exposer le contenu des requêtes.

- [PATCH] Des tests sur MySQL réel vérifient l’absence de doublons et de fuites entre sociétés lors des opérations de maintenance et de stock, ainsi que l’annulation intégrale en cas d’erreur.

- [PATCH] La description du droit d’exécuter un plan de maintenance précise qu’il autorise aussi la consommation des pièces prévues, sans modifier les permissions existantes.

- [PATCH] Les listes de pièces à commander et de stock faible affichent les logos sans recharger le catalogue des fabricants à chaque actualisation, y compris au-delà des 25 premiers fabricants.

## 9.0.0 - 2026-09-05

- [MAJOR] Les URL de liste sont harmonisées avec la pagination en premier et sans statut ni tri par défaut ; l’API sélectionne les éléments actifs côté SQL et accepte `active=all` pour consulter tous les statuts.

## 8.0.0 - 2026-09-04

- [PATCH] Les changements de rôles, de permissions et d’accès aux sociétés invalident immédiatement toutes les sessions concernées, y compris celle de l’administrateur à l’origine de l’opération.
- [MAJOR] Les exécutions de maintenance, interventions ponctuelles et mouvements de stock exigent désormais une clé d’idempotence afin qu’une nouvelle tentative ne duplique jamais leurs effets.
- [PATCH] La cartographie des relations organise Maintenance en branches Plans, Opérations et Pièces et affiche désormais un niveau de détail unique.
- [PATCH] La cartographie des relations regroupe les matériels sous une carte dédiée et les présente au bout de leurs branches Catégorie et Fabricant.
- [PATCH] Les fiches de maintenance sont triées de la priorité la plus élevée à la plus faible, avec un ordre secondaire stable.
- [PATCH] Les états critiques partagent une couleur de thème centralisée, également utilisée par le bouton de déconnexion.

## 7.37.0 - 2026-09-03

- [MINOR] Les tailles maximales des images et documents envoyés sont configurables par environnement, affichées dans chaque formulaire et contrôlées avant l’envoi.
- [PATCH] Le logo et le favicon officiels GreenDesk remplacent les anciens visuels fixes sans répétition du nom du produit et servent de repli lorsqu’une société ne possède pas de logo exploitable.
- [PATCH] Les requêtes SQL brutes Sequelize transmettent uniformément leurs valeurs dynamiques avec des paramètres `bind`.
- [PATCH] Les créations, modifications, suppressions et changements de logo des sociétés sont consultables dans l’historique de l’administration.

## 7.36.0 - 2026-09-02

- [MINOR] Le lancement de l’impression des fiches de maintenance est enregistré dans l’historique sous le libellé « Impression des fiches de maintenance ».
- [PATCH] La liste des plans de maintenance est triée côté serveur par échéance croissante, avec les plans selon l’usure en dernier, puis par priorité décroissante, titre et identifiant croissants.
- [MINOR] Chaque société peut recevoir un logo protégé à la création ou à la modification avec une permission dédiée ; ce logo personnalise la liste des sociétés, l’en-tête actif et les impressions de maintenance.
