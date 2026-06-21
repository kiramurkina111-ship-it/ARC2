# Подключение AI-агента к Paybound — v0.3

Этот гайд подключает реального AI-агента к уже существующему vault на Arc Testnet.

Новый контракт деплоить не нужно. Текущий `AgentVault` уже разрешает назначенному agent signer:

- читать баланс и policy;
- вызывать `initiatePayment`;
- создавать approval requests;
- проверять status request;
- отменять pending request.

## 1. Создать отдельный agent wallet

Для первого теста можно использовать отдельный EVM wallet.

Не используй основной кошелёк с реальными средствами. Это testnet-интеграция.

Сохрани:

```txt
AGENT_ADDRESS=0x...
AGENT_PRIVATE_KEY=0x...
```

Private key нельзя:

- вставлять в сайт;
- коммитить в GitHub;
- добавлять в Vercel frontend variables;
- публиковать в screenshots или logs.

## 2. Назначить agent signer

В приложении выбери нужный vault.

В поле **Agent signer** вставь `AGENT_ADDRESS` и нажми **Save vault**.

Подтверди транзакцию owner-кошельком.

После этого контракт разрешит agent wallet инициировать платежи.

## 3. Скопировать конфигурацию из сайта

Открой раздел **Agent** / **Connect agent**.

Проверь:

```txt
Vault: адрес активного vault
Agent signer: AGENT_ADDRESS
Network: Arc Testnet · 5042002
Transport: Local MCP · stdio
```

Нажми **Copy env**.

Сайт скопирует RPC, chain ID и vault address. Private key намеренно останется пустым.

## 4. Установить Agent Kit

В терминале:

```powershell
cd "C:\Users\user\Documents\ARC 2.0\agent-kit"
npm install
```

Создай `agent-kit/.env` на основе `agent-kit/.env.example`.

Заполни:

```txt
ARC_RPC=https://rpc.testnet.arc.network
ARC_CHAIN_ID=5042002
ARC_EXPLORER=https://testnet.arcscan.app
VAULT_ADDRESS=0x...
AGENT_PRIVATE_KEY=0x...
```

## 5. Проверить и собрать

```powershell
npm run typecheck
npm run build
```

Если kit пишет, что signer не authorized, проверь, что address от `AGENT_PRIVATE_KEY` совпадает с `agent()` в vault.

## 6. Запустить example payment

Добавь в `.env`:

```txt
RECIPIENT_ADDRESS=0x...
PAYMENT_AMOUNT_USDC=0.42
PAYMENT_REASON=Buy data for the research task
TASK_ID=example-research-001
SERVICE_NAME=Example Data Provider
```

Recipient должен быть добавлен в allowlist активного vault.

Запусти:

```powershell
npm run example
```

Kit должен:

1. прочитать vault status;
2. проверить recipient;
3. отправить `initiatePayment`;
4. вывести `executed: true` или `requestId`;
5. вернуть Arcscan URL.

## 7. Подключить MCP

Сначала собери kit:

```powershell
npm run build
```

В сайте нажми **Copy config** или используй `agent-kit/mcp-config.example.json`.

Замени пути на абсолютные:

```json
{
  "mcpServers": {
    "paybound": {
      "command": "node",
      "args": ["C:/Users/user/Documents/ARC 2.0/agent-kit/dist/mcp.js"],
      "env": {
        "DOTENV_CONFIG_PATH": "C:/Users/user/Documents/ARC 2.0/agent-kit/.env"
      }
    }
  }
}
```

После подключения агент получает tools:

```txt
get_vault_status
check_recipient
request_payment
create_approval_request
get_payment_request
cancel_payment_request
```

## 8. Проверить полный v0.3 flow

Попроси подключённого агента:

```txt
Check the vault budget, verify the recipient, and request a 0.42 USDC payment for research data.
```

Ожидаемый flow:

```txt
agent reads budget
-> checks recipient
-> requests payment
-> vault executes or queues approval
-> agent returns tx hash / request ID
-> owner sees the result in the app
```

## Production note

`.env` с private key подходит только для локального testnet MVP.

Следующий security level:

- Circle developer-controlled wallet;
- managed signer service;
- HSM/KMS;
- scoped session keys;
- remote MCP с authentication и rate limits.
