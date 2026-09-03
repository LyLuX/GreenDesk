# Journal des modifications

## Non publié

## 7.37.0 - 2026-09-03

- [MINOR] Les tailles maximales des images et documents envoyés sont configurables par environnement, affichées dans chaque formulaire et contrôlées avant l’envoi.
- [PATCH] Le logo et le favicon officiels GreenDesk remplacent les anciens visuels fixes sans répétition du nom du produit et servent de repli lorsqu’une société ne possède pas de logo exploitable.
- [PATCH] Les requêtes SQL brutes Sequelize transmettent uniformément leurs valeurs dynamiques avec des paramètres `bind`.
- [PATCH] Les créations, modifications, suppressions et changements de logo des sociétés sont consultables dans l’historique de l’administration.

## 7.36.0 - 2026-09-02

- [MINOR] Le lancement de l’impression des fiches de maintenance est enregistré dans l’historique sous le libellé « Impression des fiches de maintenance ».
- [PATCH] La liste des plans de maintenance est triée côté serveur par échéance croissante, avec les plans selon l’usure en dernier, puis par priorité décroissante, titre et identifiant croissants.
- [MINOR] Chaque société peut recevoir un logo protégé à la création ou à la modification avec une permission dédiée ; ce logo personnalise la liste des sociétés, l’en-tête actif et les impressions de maintenance.
