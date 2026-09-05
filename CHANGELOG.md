# Journal des modifications

## Non publié

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
