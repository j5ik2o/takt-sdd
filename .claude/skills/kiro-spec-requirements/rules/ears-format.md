# EARS Format Guidelines

## Overview

EARS (Easy Approach to Requirements Syntax) is the standard format for acceptance criteria in spec-driven development.

EARS patterns describe the logical structure of a requirement: condition, subject, and response.
They are not tied to English wording.
All acceptance criteria should be written in the target language configured for the specification, such as `spec.json.language`.

For Japanese specifications (`language: "ja"`), use Japanese EARS fixed phrases.
Do not force English trigger words such as `When`, `If`, `While`, `Where`, or `shall` into Japanese requirements.
Existing hybrid Japanese specs with English EARS triggers remain valid for review, but new or rewritten Japanese criteria should use the Japanese phrases.

## Primary EARS Patterns

### 1. Event-Driven Requirements
- **English Pattern**: When [event], the [system] shall [response/action]
- **Japanese Pattern**: [イベント] が起きたとき、[システム] は [応答] しなければならない
- **Use Case**: Responses to specific events or triggers
- **Example**: ユーザーがチェックアウトボタンをクリックしたとき、Checkout Service はカート内容を検証しなければならない

### 2. State-Driven Requirements
- **English Pattern**: While [precondition], the [system] shall [response/action]
- **Japanese Pattern**: [前提] の間、[システム] は [応答] し続けなければならない
- **Use Case**: Behavior dependent on system state or preconditions
- **Example**: 支払い処理中の間、Checkout Service はローディング状態を表示し続けなければならない

### 3. Unwanted Behavior Requirements
- **English Pattern**: If [trigger], the [system] shall [response/action]
- **Japanese Pattern**: [条件/異常] の場合、[システム] は [応答] しなければならない
- **Use Case**: System response to errors, failures, or undesired situations
- **Example**: 無効なカード番号が入力された場合、Checkout Service はエラーメッセージを表示しなければならない

### 4. Optional Feature Requirements
- **English Pattern**: Where [feature is included], the [system] shall [response/action]
- **Japanese Pattern**: [機能/オプション] を含む場合、[システム] は [応答] しなければならない
- **Use Case**: Requirements for optional or conditional features
- **Example**: クーポン機能を含む場合、Checkout Service は割引額を注文合計に反映しなければならない

### 5. Ubiquitous Requirements
- **English Pattern**: The [system] shall [response/action]
- **Japanese Pattern**: [システム] は常に [応答] しなければならない
- **Use Case**: Always-active requirements and fundamental system properties
- **Example**: Checkout Service は常に注文合計を税込金額で表示しなければならない

## Combined Patterns

- **English Pattern**: While [precondition], when [event], the [system] shall [response/action]
- **English Pattern**: When [event] and [additional condition], the [system] shall [response/action]
- [前提] の間、[イベント] が起きたとき、[システム] は [応答] しなければならない
- [イベント] が起き、かつ [追加条件] の場合、[システム] は [応答] しなければならない

## Subject Selection Guidelines

- **Software Projects**: Use concrete system/service name, such as `Calendar Sync MVP`.
- **Process/Workflow**: Use responsible team/role, such as `Support Team`.
- **Non-Software**: Use appropriate subject, such as `Marketing Campaign`.

## Quality Criteria

- Requirements must be testable, verifiable, and describe a single behavior.
- Use objective mandatory language: in English, use `shall` for mandatory behavior; in Japanese, prefer `しなければならない`.
- Avoid vague words such as `appropriate`, `where possible`, `適切に`, `できるだけ`, or `なるべく`.
- Follow an EARS logical pattern even when localized into Japanese.
- Keep implementation details out of requirements unless they are directly user- or operator-observable constraints.
