# Гайд по запуску onchain-версии через Remix

Этот гайд показывает самый простой путь к первому onchain milestone на Arc Testnet: задеплоить `AgentVaultFactory` через Remix, подключить его к сайту, создать vault из интерфейса, внести testnet USDC и провести первый policy-gated платёж.

После прохождения гайда можно честно писать пост: контракты live на Arc Testnet, первый vault создан, первый deposit сделан, первый policy-gated payment прошёл.

Frontend теперь умеет работать в onchain mode: после подключения кошелька и сохранения `AgentVaultFactory` address сайт сам вызывает контракты на Arc Testnet. Remix остаётся удобным инструментом для деплоя и ручного debug.

## 0. Что понадобится

- MetaMask, Rabby или другой EVM-кошелёк.
- Testnet USDC из Circle Faucet.
- Remix: https://remix.ethereum.org
- Файлы из проекта:
  - `contracts/AgentVault.sol`
  - `contracts/AgentVaultFactory.sol`

Private key в Remix не нужен, если деплоишь через `Injected Provider`. Кошелёк сам подпишет транзакции.

## 1. Добавить Arc Testnet в кошелёк

В MetaMask/Rabby добавь custom network:

```txt
Network name: Arc Testnet
RPC URL: https://rpc.testnet.arc.network
Chain ID: 5042002
Currency symbol: USDC
Block explorer: https://testnet.arcscan.app
```

Важно: Arc использует USDC как gas token. Некоторые кошельки могут отображать gas/balance как ETH, но фактически это USDC.

## 2. Получить testnet USDC

Открой Circle Faucet:

```txt
https://faucet.circle.com
```

Выбери Arc Testnet и запроси USDC на адрес кошелька, которым будешь деплоить.

## 3. Открыть Remix

Открой:

```txt
https://remix.ethereum.org
```

В файловой панели создай два файла:

```txt
contracts/AgentVault.sol
contracts/AgentVaultFactory.sol
```

Скопируй в них код из локального проекта:

- `C:\Users\user\Documents\ARC 2.0\contracts\AgentVault.sol`
- `C:\Users\user\Documents\ARC 2.0\contracts\AgentVaultFactory.sol`

Проверь, что `AgentVaultFactory.sol` импортирует:

```solidity
import {AgentVault} from "./AgentVault.sol";
```

Если файлы лежат в одной папке `contracts`, Remix должен нормально собрать import.

## 4. Скомпилировать контракты

В Remix открой вкладку **Solidity Compiler**.

Настройки:

```txt
Compiler: 0.8.24
Auto compile: optional
Enable optimization: yes
Optimization runs: 200
```

Выбери файл:

```txt
AgentVaultFactory.sol
```

Нажми **Compile AgentVaultFactory.sol**.

Если компиляция прошла, можно деплоить.

## 5. Подключить Remix к Arc Testnet

В Remix открой вкладку **Deploy & Run Transactions**.

В поле **Environment** выбери:

```txt
Injected Provider - MetaMask
```

Или аналогичный injected provider, если используешь Rabby.

Кошелёк попросит подключение к Remix. Разреши.

Проверь, что в Remix сверху/рядом с Environment отображается:

```txt
Custom (5042002) network
```

Если сеть не Arc Testnet, переключи сеть в кошельке.

## 6. Задеплоить `AgentVaultFactory`

В поле **Contract** выбери:

```txt
AgentVaultFactory - contracts/AgentVaultFactory.sol
```

Constructor argument `usdc_`:

```txt
0x3600000000000000000000000000000000000000
```

Это ERC-20 interface USDC на Arc Testnet.

Нажми **Deploy**.

Подтверди транзакцию в кошельке.

После деплоя Remix покажет deployed contract внизу. Скопируй адрес factory:

```txt
FACTORY_ADDRESS=0x...
```

Открой explorer и проверь адрес:

```txt
https://testnet.arcscan.app/address/FACTORY_ADDRESS
```

## 7. Подключить factory к сайту

После деплоя factory дальше можно работать уже не через Remix, а через сайт.

Открой:

```txt
web/vault.html
```

Если сайт уже задеплоен, открой задеплоенный URL и перейди в app.

Дальше в интерфейсе:

1. Нажми **Connect wallet**.
2. Убедись, что кошелёк на **Arc Testnet**.
3. В левой панели, в блоке **Network**, открой **Advanced**, если нужно изменить factory.
4. По умолчанию там уже должен быть текущий factory:

```txt
0xF6b1B036942364dAabe62c833700414fd77d948D
```

Если ты деплоишь новый factory, замени его на новый адрес:

```txt
FACTORY_ADDRESS
```

5. Если менял адрес, нажми **Save factory**.

После этого сайт сможет:

- читать твои vaults через `vaultsOf`;
- создавать vault через кнопку **New**;
- делать `approve + deposit`;
- менять policy;
- разрешать recipient address;
- запускать `initiatePayment`;
- показывать tx hash в activity log.

Если ты уже создал vault через Remix, сайт подтянет его после **Save factory**, потому что factory хранит список vaults owner-кошелька.

## 8. Создать vault через сайт

В интерфейсе заполни:

```txt
Agent signer: адрес agent signer
Max spend per action: 2
Daily limit: 15
```

Для первого запуска можно поставить `Agent signer` равным своему wallet address. Это упростит тест: owner и agent будут одним адресом.

Нажми **New** в списке vaults.

Сайт отправит транзакцию:

```txt
AgentVaultFactory.createVault(agent, 2000000, 15000000)
```

После подтверждения новый vault появится в списке слева.

## 9. Дальше через сайт

Для первого полного сценария:

1. Внеси сумму в **Deposit amount**.
2. Нажми **Deposit USDC**.
3. Подтверди `approve` в кошельке.
4. Подтверди `deposit` в кошельке.
5. В **Approved recipient** вставь recipient address.
6. Нажми **Update policy**.
7. В **Service provider** выбери recipient.
8. В **Requested spend** поставь, например, `0.42`.
9. Нажми **Run policy check**.

Если recipient разрешён и сумма внутри лимитов, сайт вызовет `initiatePayment`, а vault выполнит платёж сразу. Если сумма выше policy, vault создаст approval request.

## 10. Проверить v0.2 approval flow

Чтобы проверить human-in-the-loop flow:

1. Убедись, что в vault есть USDC.
2. Убедись, что recipient добавлен в allowlist.
3. В **Requested spend** укажи сумму выше **Max spend per action**, например `3`, если лимит `2`.
4. Нажми **Run policy check**.
5. В разделе **Approval queue** должен появиться pending request.
6. Нажми **Approve**, если хочешь выполнить платёж.
7. Или нажми **Reject**, если хочешь отклонить request.
8. После подтверждения в кошельке queue и activity log обновятся.

Быстрый вариант для демо: нажми **Run risky demo**. Сайт сам выставит сумму выше лимита и создаст approval request.

Так v0.2 показывает не просто блокировку рискованного spend, а полноценный цикл:

```txt
agent request -> policy says approval needed -> owner approves/rejects -> tx trail
```

## 11. Деплой сайта на Vercel

В проекте есть `vercel.json`, поэтому можно деплоить из корня проекта, не выбирая папку `web` вручную.

Настройки Vercel:

```txt
Framework Preset: Other
Root Directory: .
Build Command: пусто
Output Directory: пусто
Install Command: пусто
```

После деплоя:

```txt
https://your-project.vercel.app/
https://your-project.vercel.app/vault.html
```

Если видишь `404: NOT_FOUND`, значит Vercel задеплоил старую версию без `vercel.json` или проект был настроен на неправильную директорию. Сделай новый deploy с текущими файлами.

## 12. Ручной Remix smoke test, если нужно debug

Оставшиеся шаги ниже можно использовать как ручную проверку через Remix. Для обычного frontend demo они уже не обязательны.

### Debug A. Создать первый vault через Remix

В deployed `AgentVaultFactory` найди функцию:

```txt
createVault
```

Поля:

```txt
agent: адрес agent signer
maxSpendPerTx: 2000000
dailyLimit: 15000000
```

Для первого запуска можно поставить agent равным своему wallet address. Это упростит тест: owner и agent будут одним адресом.

Значения лимитов:

```txt
2000000 = 2.00 USDC
15000000 = 15.00 USDC
```

Нажми **transact**.

Подтверди транзакцию в кошельке.

### Debug B. Получить адрес созданного vault

В deployed `AgentVaultFactory` найди функцию:

```txt
vaultsOf
```

Введи свой wallet address и нажми call.

Remix вернёт массив адресов. Первый адрес — это твой vault:

```txt
VAULT_ADDRESS=0x...
```

Открой его в explorer:

```txt
https://testnet.arcscan.app/address/VAULT_ADDRESS
```

### Debug C. Подключить vault в Remix

Vault уже создан factory-контрактом, поэтому отдельную кнопку **Deploy** для `AgentVault` нажимать не надо. Нужно только подключить Remix к уже существующему адресу vault.

Сначала убедись, что `AgentVault.sol` скомпилирован. Если в Remix рядом с `AgentVault.sol` видна кнопка **Compile**, нажми её. Иначе при добавлении адреса Remix может показать ошибку `Contract not compiled`.

Открой вкладку **Deploy & Run Transactions** слева. Это та же вкладка, где ты деплоил `AgentVaultFactory`.

В верхней части этой вкладки есть блок с полями:

- **Environment**
- **Contract**
- **Deploy**
- **At Address**

Дальше:

1. В поле **Contract** выбери:

```txt
AgentVault - contracts/AgentVault.sol
```

2. Найди поле **At Address**. Обычно оно находится под кнопкой **Deploy**.

3. Вставь туда реальный адрес vault, который ты получил на прошлом шаге через `vaultsOf(...)`:

```txt
VAULT_ADDRESS
```

Не вставляй текст `VAULT_ADDRESS` буквально. Нужно вставить адрес формата:

```txt
0x1234...
```

4. Нажми кнопку **At Address** рядом с этим полем.

После этого внизу, в блоке **Deployed Contracts**, появится новый раскрываемый контракт `AgentVault`. Именно там будут функции vault: `deposit`, `withdraw`, `setRecipientAllowed`, `initiatePayment` и остальные.

### Debug D. Approve USDC для vault

Чтобы vault мог забрать USDC через `deposit`, сначала нужен approve на USDC contract.

Самый простой способ в Remix:

1. Создай файл:

```txt
contracts/IERC20Minimal.sol
```

2. Вставь:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20Minimal {
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
}
```

3. Скомпилируй `IERC20Minimal.sol`.

4. В **Deploy & Run Transactions** выбери:

```txt
IERC20Minimal - contracts/IERC20Minimal.sol
```

5. В **At Address** вставь USDC address:

```txt
0x3600000000000000000000000000000000000000
```

6. Нажми **At Address**.

Теперь у тебя есть интерфейс USDC в Remix.

Вызови:

```txt
approve
```

Поля:

```txt
spender: VAULT_ADDRESS
amount: 25000000
```

`25000000` = `25.00 USDC`.

Нажми **transact** и подтверди в кошельке.

### Debug E. Deposit USDC в vault

В deployed `AgentVault` вызови:

```txt
deposit
```

Параметр:

```txt
amount: 25000000
```

Нажми **transact**.

После этого вызови:

```txt
balance
```

Ожидаемый результат:

```txt
25000000
```

### Debug F. Настроить approved recipient

В deployed `AgentVault` вызови:

```txt
setRecipientAllowed
```

Поля:

```txt
recipient: адрес получателя / тестового service wallet
allowed: true
```

Подтверди транзакцию.

Сохрани recipient address:

```txt
RECIPIENT_ADDRESS=0x...
```

### Debug G. Выполнить первый policy-approved payment

Нужен `metadataHash`.

Можно использовать любой bytes32. Для первого теста подойдёт:

```txt
0x1111111111111111111111111111111111111111111111111111111111111111
```

В deployed `AgentVault` вызови:

```txt
initiatePayment
```

Поля:

```txt
recipient: RECIPIENT_ADDRESS
amount: 420000
metadataHash: 0x1111111111111111111111111111111111111111111111111111111111111111
```

`420000` = `0.42 USDC`.

Если recipient разрешён и сумма ниже лимита, платёж должен пройти сразу.

Проверь:

- `balance` vault уменьшился;
- `balanceOf(RECIPIENT_ADDRESS)` на USDC вырос;
- transaction появилась в explorer.

### Debug H. Проверить approval flow

Теперь попробуй сумму выше лимита:

```txt
amount: 3000000
```

`3000000` = `3.00 USDC`, а max spend per tx у нас `2.00 USDC`.

Вызови:

```txt
initiatePayment
```

Поля:

```txt
recipient: RECIPIENT_ADDRESS
amount: 3000000
metadataHash: 0x2222222222222222222222222222222222222222222222222222222222222222
```

Такой платёж не должен пройти сразу. Он должен создать payment request.

Проверь request:

```txt
paymentRequests
```

Введи:

```txt
1
```

Если это первый queued request, увидишь данные request.

Чтобы approve:

```txt
approveRequest
```

Параметр:

```txt
requestId: 1
```

Подтверди транзакцию.

## 13. Что снять для поста

Для поста хорошо иметь:

- screenshot Remix с deployed `AgentVaultFactory`;
- explorer link на `AgentVaultFactory`;
- explorer link на созданный `AgentVault`;
- transaction hash deposit;
- transaction hash первого `initiatePayment` на `0.42 USDC`;
- optional: approval flow на `3.00 USDC`.

Explorer:

```txt
https://testnet.arcscan.app
```

## 14. Что писать в посте

Если всё прошло:

```txt
First onchain milestone for Paybound on Arc.

We deployed the first vault contracts to Arc Testnet:
- AgentVaultFactory
- first AgentVault
- USDC deposit
- policy-gated agent payment
- approval flow for risky spend

The goal: give AI agents real USDC budgets, but only inside user-defined policy.
Frontend preview is live; wallet-connected contract UI is the next milestone.
```

Не называй это production-ready. Лучше: first Arc Testnet milestone.

## 15. Частые ошибки

### Remix показывает не Arc Testnet

Переключи сеть в кошельке на Arc Testnet и обнови Remix.

### Deploy не проходит

Проверь:

- есть testnet USDC на кошельке;
- сеть Arc Testnet;
- constructor arg указан правильно;
- кошелёк подключён к Remix.

### Remix пишет `invalid address` или `value=""`

Это значит, что Remix ожидал `address`, но получил пустое поле.

Чаще всего одно из этих полей не заполнено:

- constructor arg при деплое `AgentVaultFactory`;
- `agent` в `createVault`;
- `recipient` в `setRecipientAllowed` или `initiatePayment`;
- `spender` в `approve`;
- адрес в поле **At Address**.

Для деплоя `AgentVaultFactory` constructor arg должен быть ровно:

```txt
0x3600000000000000000000000000000000000000
```

Для `agent`, `recipient`, `spender` и **At Address** нужен полный EVM-адрес формата `0x...`, длиной 42 символа. Не оставляй поле пустым и не вставляй имя вроде `VAULT_ADDRESS` вместо реального адреса.

### Deposit падает

Скорее всего, не был сделан approve.

Проверь в USDC interface:

```txt
allowance(owner, VAULT_ADDRESS)
```

### Payment падает с `RecipientNotAllowed`

Сначала вызови:

```txt
setRecipientAllowed(recipient, true)
```

### Payment создаёт request вместо execution

Это нормально, если сумма выше лимита или recipient не проходит policy.

### В кошельке gas отображается как ETH

Некоторые кошельки так отображают custom gas tokens. На Arc фактически используется USDC.

## Источники

- Arc EVM compatibility: https://docs.arc.io/arc/references/evm-compatibility
- Arc Connect to Arc: https://docs.arc.io/arc/references/connect-to-arc
- Arc Contract addresses: https://docs.arc.io/arc/references/contract-addresses
- Arc Gas and fees: https://docs.arc.io/arc/references/gas-and-fees
