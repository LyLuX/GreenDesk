# R6 — atomicité et contrôles de livraison

## Périmètre et état

R6 complète les preuves MySQL des lots R1 à R5 et prépare leur conservation en CI.
Le code applicatif, les permissions, le schéma SQL et les contrats HTTP restent
inchangés. L’usage déclaré reste local, sur un PC via les scripts de développement.

Le lot R6 est intégré à la livraison 9.4.0 avec la refonte de l’interface et
la correction de l’accès au frontend en mode LAN. Le seuil de trois modifications
avec une évolution MINOR est atteint. Les preuves initiales ci-dessous ont été
produites avant cette livraison, sous la version 9.3.0.
Les preuves locales portent sur une copie de travail modifiée à partir de
`8a6102011cb50fb1fd698f34577008a58c33a226`, pas sur le contenu final de la livraison 9.4.0.

## Suivi global conservé

| Lot                               | État et suivi utile                                                                                   |
| --------------------------------- | ----------------------------------------------------------------------------------------------------- |
| R0 — inventaire                   | Terminé ; les anciens inventaires et propositions ont été supprimés à la demande de l’utilisateur.    |
| R1 — contexte société             | Livré en 9.1.4 ; garde strict et attribution explicite des audits globaux.                            |
| R2 — isolation A/B                | Correctifs livrés en 9.1.5 ; matrice MySQL conservée dans les tests d’intégration.                    |
| R3 — identité et permissions      | Livré en 9.1.5 ; tests JWT, révocation et droits conservés.                                           |
| R4 — entrées, erreurs et fichiers | Livré en 9.1.5 ; tests de validation, confidentialité et uploads conservés.                           |
| R5 — configuration et dépendances | Livré en 9.3.0 ; exigences de déploiement dans le README.                                             |
| R6 — atomicité et CI              | Intégré à 9.4.0 ; premier run du workflow et activation des protections GitHub à vérifier sur `main`. |

Les points restant à suivre sont les suivants :

- Vérifier le premier run GitHub de la livraison contenant R6 et rendre
  les trois contrôles obligatoires sur `main`. La protection n’est pas activée
  dans l’état GitHub observé ci-dessous.
- Avant un futur déploiement, vérifier la configuration réelle TLS/proxy, les
  quotas partagés si plusieurs instances, le transport MySQL, les droits des
  uploads et des logs, ainsi que le comportement sous charge. Aucun environnement
  de production ou de préproduction n’est actuellement déclaré.
- Les clés étrangères SQL simples ne garantissent pas à elles seules la
  cohérence de société des relations créées par SQL direct. Le cloisonnement
  applicatif est couvert par les tests. Exécuter
  `node scripts/audit-company-associations.js` sur chaque base déployée avant
  d’en attester l’intégrité ; une migration vers des contraintes composites
  demanderait une conception dédiée, notamment pour `ON DELETE SET NULL`.
- Le dernier audit R5 du 17 octobre 2026 conserve 21 alertes modérées backend
  et cinq alertes hautes issues de la même chaîne de build
  braces → micromatch → fast-glob → PurgeCSS. Aucun scénario exploitable
  GreenDesk n’a été établi pour ces appels : les motifs glob de build sont
  constants, et les appels UUID/formatage signalés ne correspondent pas aux
  usages applicatifs examinés. Relancer les audits et réexaminer ces prérequis
  après toute évolution des dépendances ou de leurs consommateurs.

Les tests, scripts de contrôle et notes de release restent en place. La
suppression des archives n’équivaut pas à une certification de sécurité
exhaustive ni à la clôture des actions GitHub et de déploiement ci-dessus.

## Matrice de non-régression

| Invariant                                                                                                    | Preuve exécutable                                                              |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Absence de société refusée avant SQL et contexte A/B conservé                                                | `tests/integration/company-isolation.integration.js`                           |
| UUID, listes, associations incohérentes, fichiers et historique cloisonnés                                   | `tests/integration/company-isolation.integration.js`                           |
| Retrait des droits, affiliations et révocation des sessions effectifs                                        | `tests/integration/identity-permissions.integration.js`                        |
| Champs internes, entrées hors contrat, erreurs et fichiers bornés                                            | Tests R4 unitaires et suites d’intégration société/identité                    |
| SMTP sans TLS refusé avant identifiants et contenu lorsque TLS est exigé                                     | `tests/mail.service.test.js`                                                   |
| Doublon, réponse perdue et appels concurrents avec même clé : un seul effet                                  | `tests/integration/maintenance-idempotency.integration.js`                     |
| Consommations concurrentes avec clés distinctes : stock non surconsommé                                      | Même suite MySQL, plans et interventions                                       |
| Panne avant insertion d’audit, après insertion ou après sauvegarde de réponse : rollback et clé réutilisable | Même suite, trois points de panne pour plan, intervention et stock             |
| Premier appel annulé, second concurrent avec même clé validé : une seule opération et rejeu correct          | Même suite, trois types d’opération, barrières bornées sans sommeil arbitraire |
| Logger de sécurité indisponible : HTTP 403 et aucune écriture, audit ou réservation de clé                   | Même suite, sessions réelles dépourvues du droit requis                        |
| A en rollback et B en commit simultanés : données et contexte séparés                                        | Même suite MySQL                                                               |
| Job absent, annulé, ignoré ou en échec : contrôle de sécurité rouge                                          | `tests/ci-security-gate.test.js`, décision et exécution CLI                    |

Les snapshots SQL incluent pièces, plans, consommations, mouvements, interventions,
historiques, audits et clés d’idempotence, lignes supprimées comprises. Les hooks
de panne observent les écritures dans la transaction avant d’échouer ; un échec
précoce de validation ne peut donc pas donner une fausse preuve de rollback.

Deux types de journalisation suivent des règles distinctes :

- L’audit métier SQL fait partie de la transaction : son indisponibilité annule
  l’opération et libère la clé d’idempotence.
- Le log technique de refus est informatif : sa panne conserve le refus 403 et
  n’autorise jamais le chemin métier.

## Validation locale du 17 octobre 2026

- Backend : **108 suites, 1 333 tests réussis**.
- Frontend : **61 fichiers, 372 tests réussis**, avec le pool de threads local.
- MySQL : **3 suites, 79 tests réussis**, avec les douze scénarios supplémentaires
  de panne/reprise/refus et la suppression finale de la base temporaire.
- OpenAPI : **35 tests réussis** ; lint, analyse YAML, formatage des fichiers
  modifiés et build frontend validés.
- Contrôle de sécurité : dix tests, dont trois exécutions CLI en répertoire
  temporaire qui vérifient le code de sortie et le SHA du rapport.

Le [manifeste local](security-r6-validation.json) conserve les compteurs et
empreintes des rapports ainsi que les empreintes des sources R6 initiales, avant
la refonte et la publication 9.4.0. Les JSON complets
restent dans les répertoires locaux `coverage/security` ; le manifeste
n’annonce pas un run GitHub du nouveau workflow. Les anciennes archives locales
de `hardening/` ont été supprimées à la demande de l’utilisateur ; le suivi
utile est regroupé dans ce document et le manifeste. Cette maintenance
documentaire ne modifie pas les contrôles techniques validés.

## Commandes reproductibles

Depuis la racine, utiliser un environnement `NODE_ENV=test` pour les tests backend :

```powershell
$env:NODE_ENV = 'test'
New-Item -ItemType Directory -Path coverage/security -Force | Out-Null
npm test -- --json --outputFile=coverage/security/backend.json
npm run docs:check -- --json --outputFile=coverage/security/openapi.json
npm run test:integration
npm run lint
npm test --prefix frontend -- --maxWorkers=2 --reporter=default --reporter=json --outputFile=coverage/security/frontend.json
npm run build --prefix frontend
```

Le runner MySQL crée une base aléatoire, applique les migrations, compare le schéma,
vérifie une mise à niveau conservant les données, exécute les tests puis supprime
cette base même en cas d’échec. Il ne modifie pas la base applicative. Une connexion
impossible, une suite en échec, un rapport impossible à écrire ou un nettoyage
impossible fait échouer la commande.

Sous Windows, si le pool de processus Vitest ne démarre pas dans le délai prévu,
`--pool=threads` exécute les mêmes tests sans changer leurs assertions ni délais.
Les rapports restent dans les répertoires `coverage`, ignorés par Git et Prettier.

## Contrôle commun de CI

Le workflow conserve ses deux validations indépendantes :

- `Validation GreenDesk` : installation verrouillée, lint, formatage, tests
  backend/versions, OpenAPI, tests frontend et compilation.
- `Validation MySQL` : migrations, schéma, mise à niveau et matrice adverse SQL.

Le job `Sécurité GreenDesk` utilise `needs: [validation, mysql]` et
`if: always()`. Son script n’accepte que deux résultats explicitement égaux à
`success` : `failure`, `cancelled`, `skipped`, une valeur inconnue ou absente
font échouer la décision. La disparition des résultats ne vaut jamais validation.

Les rapports JSON sont conservés trente jours, y compris en cas d’échec lorsque
le rapport a pu être écrit. Les noms des artefacts portent le SHA et la tentative
du run ; `gate.json` contient aussi le SHA, l’identifiant du run et les résultats
des deux jobs. Les seuls fichiers publiés sont ces rapports, sans copie de
`.env`, d’uploads, de base SQL ni de logs applicatifs.

Les trois familles d’artefacts sont `security-validation-<sha>-<tentative>`,
`security-mysql-<sha>-<tentative>` et `security-gate-<sha>-<tentative>`.
Un rapport manquant fait échouer son étape de conservation. Un job annulé avant
l’écriture de son rapport peut ne produire aucun artefact : le run doit alors
rester non validé. Lors de la release, conserver les liens du run et télécharger
les preuves utiles avant l’expiration ; elles ne constituent pas une archive
permanente.

L’action de conservation est épinglée au SHA du tag officiel v4 consulté le
17 octobre 2026. Les permissions du workflow restent `contents: read`, et les
checkouts ne conservent pas leurs identifiants.

## Activation GitHub et conditions de publication

Lecture GitHub au 17 octobre 2026 : `main.protected=false` et aucun ruleset
déclaré. L’endpoint de détail des protections renvoie 403 au connecteur, qui
ne dispose pas d’accès administration. Cette lecture n’a modifié aucun réglage.

Le [run 9.3.0](https://github.com/LyLuX/GreenDesk/actions/runs/39029997020)
a réussi ; il utilise encore l’ancien workflow, sans le contrôle R6.
Le nouveau workflow ne peut être vérifié sur GitHub qu’après publication du lot.

Après son premier run réussi, rendre obligatoires les contrôles
`Validation GreenDesk`, `Validation MySQL` et `Sécurité GreenDesk` pour la
branche visée, et définir les droits de contournement/release avec le propriétaire.
Tant que cette protection n’est pas activée, un statut CI rouge ne bloque pas
techniquement un push ou une fusion directe. Ne pas annoncer cette activation
comme acquise.

Avant une livraison :

1. Exécuter les contrôles proportionnés, garder OpenAPI synchronisé et refuser
   toute publication si `docs:check` échoue.
2. Après tout changement de version, exécuter les tests backend et frontend,
   puis le build, et vérifier `tests/versioning.test.js`.
3. Si le schéma ou les données persistées changent, vérifier et appliquer les
   migrations requises sur la base concernée, puis contrôler leur résultat.
4. Respecter le lot de release de `AGENTS.md`, publier un commit unique, puis
   vérifier le run correspondant au SHA effectivement poussé.
5. Bloquer la livraison si une fuite entre sociétés, un contournement de droits,
   une opération partiellement validée ou un doublon d’effet est démontré.
6. Joindre au dossier de release le SHA, le lien du run, les rapports des tests et
   les limites connues. En cas de panne d’infrastructure, relancer le même
   contrôle sans masquer son échec ni désactiver un test.

Référence : [conditions des jobs GitHub Actions](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-jobs-with-conditions).
Un job ignoré peut être affiché comme réussi par GitHub ; le contrôle R6 traite
explicitement cet état comme un refus.
