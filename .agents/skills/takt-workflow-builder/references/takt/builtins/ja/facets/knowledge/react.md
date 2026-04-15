# React知識

## effect と再実行

`useEffect` は「いつ再実行してよいか」を明示する仕組みであり、初期化処理の置き場ではない。初期表示で1回だけ行う処理か、依存変化で再実行すべき処理かを先に決める。

| 基準 | 判定 |
|------|------|
| 初期表示の一度きりのロードなのに、再生成される関数参照を依存に置く | REJECT |
| 再取得条件が明確でないのに、Context/Provider 由来関数を依存に置く | REJECT |
| mount-only 初期化を `useEffect(..., [])` で表現し、意図をコメントで残す | OK |
| 依存変化時の再取得が仕様として必要で、その依存を明示している | OK |

```tsx
// REJECT - 初期取得なのに不安定な関数依存を経由して再実行されうる
const fetchList = useCallback(async () => {
  await loadItems()
}, [setIsLoading, errorPage])

useEffect(() => {
  fetchList()
}, [fetchList])

// OK - 初期表示の一度きりロードとして固定
useEffect(() => {
  void loadItemsOnMount()
  // mount-only initial load
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [])
```

## Context と Provider value

Context の `value={{ ... }}` は Provider の再描画ごとに新しい参照になる。Context から受け取った関数を `useEffect` の依存に置くと、利用側が意図せず再実行ループに入ることがある。

| 基準 | 判定 |
|------|------|
| Context 由来関数の参照安定性を確認せず、effect 依存に入れる | REJECT |
| Provider 側で value の安定性が保証されていないのに mount effect の依存に使う | REJECT |
| Context 関数はイベントハンドラから使い、初期取得は mount-only に閉じる | OK |
| Provider 側で value 安定化を行い、再取得条件も仕様で定義する | OK |

```tsx
// REJECT - Context 関数をそのまま初期取得 effect の依存に使う
const { setIsLoading, errorPage } = useAppContext()
useEffect(() => {
  void loadInitialData(setIsLoading, errorPage)
}, [setIsLoading, errorPage])

// OK - 初期取得は mount-only、Context 関数は内部で使う
const { setIsLoading, errorPage } = useAppContext()
useEffect(() => {
  void loadInitialData({ setIsLoading, errorPage })
  // mount-only initial load
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [])
```

## 初期表示ロード

初期表示ロードは「画面を開いたときに1回だけ必要な処理」か、「状態変化に応じて再実行する処理」かを区別する。後者でない限り、再取得のトリガーは明示的なユーザー操作や URL/検索条件の変化に限定する。

| 条件 | 推奨 |
|------|------|
| 初期表示で一覧を1回読むだけ | mount-only effect |
| フィルタ、ページング、URL パラメータ変更で再取得 | その状態を依存に明示 |
| loading state 更新で再取得が走る | REJECT |
| message 表示や dialog 開閉で再取得が走る | REJECT |

## custom hook の責務

React custom hook は「React の state/effect/ref を使う状態遷移」に限定する。純粋計算だけなら custom hook ではなく関数モジュールでよい。

| 基準 | 判定 |
|------|------|
| React の state/effect を使わないのに `use*` と命名する | 警告 |
| 純関数群を custom hook として扱う | 警告 |
| stateful な UI 制御は custom hook に、純粋計算は function module に分ける | OK |
| hook が JSX を返す | REJECT |

## exhaustive-deps の扱い

`react-hooks/exhaustive-deps` は無条件で従うものではなく、effect の意味を壊さない範囲で従う。mount-only 初期化で依存を増やすと挙動が壊れる場合は、理由を残して抑制する。

| 基準 | 判定 |
|------|------|
| ルールに従うためだけに不要な再実行依存を追加する | REJECT |
| lint 抑制を無言で入れる | 警告 |
| mount-only の理由をコメントで説明して抑制する | OK |
| 再実行が必要な effect なのに `[]` にする | REJECT |
