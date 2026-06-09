{extends: task-decomposition}

# Kiro Spec Task Annotation Policy

## Kiro 固有差分

この policy は downstream `kiro-impl` が読む task annotation contract を定義する。`tasks.md` のすべての executable task で `_Boundary:_` と `_Depends:_` を必須にし、task decomposition を強化する。

## Required annotations

すべての executable task は以下をすべて含める。

- Observable completion: 完了を観測できる具体的な signal を detail bullet に少なくとも 1 つ書く。
- Numeric requirements: `_Requirements: ..._` には numeric requirement IDs だけを書く。
- Boundary annotation: `_Boundary:_ ...` には design 由来の component または workflow boundary names を書く。
- Depends annotation: `_Depends:_ ...` には task IDs または dependency なしを表す canonical value `none` を書く。

annotation labels `_Boundary:_` と `_Depends:_` は必須 label として扱う。dependency-free executable task entries は `_Depends:_ none` と書く。`none` は empty dependency set を意味する。

## Dependency graph and parallel marker

- plan を承認する前に、すべての `_Depends:_ ...` annotation から explicit dependency graph を作る。
- `_Depends:_ ...` edge として表現されていない、または同一 task に統合されていない hidden prerequisite work は reject する。
- Boundary annotation が他 task と重なり、file または workflow ownership が曖昧になる task は reject する。
- `(P)` は non-overlapping boundary と dependency graph が prerequisite、file、workflow、shared artifact の conflict がないことを示す場合だけ使う。
- `(P)` は `_Depends:_ none` と同時にだけ使える。non-empty dependencies を持つ task は prerequisite を持つため、boundary overlap がなくても `(P)` を付けてはならない。
- dependency graph、boundary、observable completion が未完了 task に依存する場合、その task から `(P)` を外す。

## Review gates

- Task plan review は executable task size、observable completion、numeric requirements、requirement coverage、hidden prerequisites を確認する。
- Task graph sanity review は Boundary annotation coverage、Depends annotation coverage、dependency graph consistency、non-overlapping boundary、`(P)` validity を確認する。
- missing `_Boundary:_`、missing `_Depends:_`、missing `none`、non-numeric requirements、observable completion 不在、boundary overlap、invalid dependency graph、invalid `(P)` があれば `NEEDS_FIX` または `BLOCKED` を返す。
