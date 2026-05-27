# PRD — Impacto Missionário

App de campo pra registrar, em tempo real, as atividades de um avanço missionário no sertão brasileiro. Versão enxuta, focada no MVP de 7 dias.

## 1. Contexto e propósito

O Impacto Missionário tem dois objetivos:

1. Gerar números auditáveis pra relatórios enviados a igrejas e instituições patrocinadoras.
2. Catalogar de forma estratégica as pessoas alcançadas pra que o follow-up pastoral aconteça depois do avanço.

O app roda em celulares Android (PWA instalável), funciona offline e sincroniza quando há sinal. Coordenadores acessam o dashboard pelo navegador no notebook.

## 2. Personas

**Voluntário** — Pessoa em campo. Anda muito, registra atividades repetidas (folhetos, visitas). Quer botões grandes e telas que abrem rápido. Pode ter pouca prática com celular. Zero fricção é regra.

**Líder de equipe** — Coordena 5 a 15 voluntários. Acompanha o que sua equipe registrou, ajuda a registrar pessoas com consentimento N2/N3, valida no fim do dia.

**Coordenador** — Tem a visão geral. Vê tudo, todas as equipes. Cria e edita equipes e códigos. Gera os relatórios. Fica na base, com wi-fi a maior parte do tempo.

**Pessoa alcançada** — Não usa o app. É o sujeito dos registros. Pode dar consentimento em 4 níveis pra ter seus dados retidos.

## 3. Escopo v1 (in / out)

**Dentro do v1:**

- Login por código de 4 dígitos da equipe
- 8 contadores rápidos de atividade
- Registro de pessoa com 4 níveis de consentimento (N0 a N3)
- Captura opcional de GPS em cada registro
- Offline-first com fila de sync idempotente
- Dashboard do líder (sua equipe)
- Dashboard do coordenador (todas as equipes)
- Export CSV completo
- Export PDF do relatório consolidado
- PWA instalável

**Fora do v1 (vai pra v2):**

- Fotos por registro de atividade (só foto de consentimento N3 entra no v1)
- Heatmap geográfico do alcance
- Atribuição de zonas e rotas pelo coordenador
- Push notifications
- Gamificação (pontos, ranking entre equipes)
- Botão SOS e pedido de oração urgente
- Multi-evento (v1 é hardcoded em um único `event_id`)
- Atribuição automática de discipuladores
- Integração com WhatsApp pra follow-up
- Internacionalização (v1 é pt-BR only)

## 4. Fluxos principais

### 4.1 Entrada do voluntário

1. Abre o app (PWA instalado ou aba do navegador).
2. Se não tem sessão local: tela pede código da equipe (4 dígitos), nome e telefone.
3. App valida código contra Supabase (ou contra cache local se offline e o código já foi visto).
4. Cria sessão local, salva `user_id` e `team_id` no IndexedDB.
5. Redireciona pra home.

### 4.2 Registro rápido de atividade

1. Home mostra 8 botões grandes, um por `activity_type`.
2. Voluntário toca em "Folheto" e vê um contador incrementável de 1 em 1, com botões `+5` e `+10` pra escalar.
3. Cada toque vira um INSERT no IndexedDB com `client_event_id` (UUID v7), timestamp e `lat`/`lng` se permitido.
4. Fila de sync tenta enviar em background.
5. Badge no canto do header mostra "N pendentes de sync".

### 4.3 Registro de pessoa alcançada

1. Voluntário toca "Registrar pessoa".
2. Tela pergunta: "A pessoa permite que registremos dados pra acompanhamento?"
   - **Não, só contar** → cria registro N0 (anônimo, só conta).
   - **Sim, sem identificar** → form N1 com bairro e tipo de necessidade.
   - **Sim, com nome e contato** → form N2 com nome, WhatsApp, necessidade e checkbox de consentimento verbal logado.
   - **Sim, cadastro completo** → form N3 com tudo de N2 mais endereço, foto opcional e foto da assinatura de consentimento.
3. Registro vai pra IndexedDB, sync em background.
4. Se a atividade está vinculada à pessoa (ex.: pedido de oração), `activity_events.person_id` aponta pra ela.

### 4.4 Dashboard do líder

- Totais por `activity_type`, no dia e no avanço todo.
- Lista de membros da equipe com últimos registros.
- Lista de pessoas registradas pela equipe (filtradas por `consent_level`).
- Botão "forçar sync agora".

### 4.5 Dashboard do coordenador

- Todos os totais agregados, por equipe e geral.
- Filtros por data, equipe e `activity_type`.
- Lista de pessoas N2 e N3 com tags de follow-up.
- Botões "exportar CSV" e "gerar PDF do relatório".

### 4.6 Export PDF

- Cabeçalho: nome do evento, datas, região.
- Sumário executivo: totais grandes (X Bíblias entregues, Y conversões etc.).
- Quebra por dia e por equipe.
- Lista de bairros alcançados (sem PII individual).
- Citação da política de retenção LGPD.
- Logos das igrejas patrocinadoras (se cadastradas).

## 5. Telas (lista enxuta)

| Rota                | Quem acessa  | Propósito                                      |
| ------------------- | ------------ | ---------------------------------------------- |
| `/login`            | Anônimo      | Código 4 dígitos + nome + telefone             |
| `/`                 | Voluntário+  | Home com 8 botões de atividade                 |
| `/atividade/[tipo]` | Voluntário+  | Contador rápido pra atividade específica       |
| `/pessoa/novo`      | Voluntário+  | Fluxo de registro com seletor de consentimento |
| `/pessoa/[id]`      | Líder, Coord | View e edit de pessoa registrada               |
| `/sync`             | Voluntário+  | Status da fila de sync, botão forçar           |
| `/equipe`           | Líder, Coord | Totais da equipe e lista de membros            |
| `/coord`            | Coord        | Dashboard geral                                |
| `/coord/equipes`    | Coord        | Gerenciar equipes e códigos                    |
| `/coord/export`     | Coord        | Gerar CSV e PDF                                |
| `/perfil`           | Voluntário+  | Trocar nome ou telefone, sair                  |

## 6. RBAC matrix

| Ação                               | Voluntário     | Líder    | Coordenador |
| ---------------------------------- | -------------- | -------- | ----------- |
| Inserir `activity_event` próprio   | ✅             | ✅       | ✅          |
| Ver `activity_events` próprios     | ✅             | ✅       | ✅          |
| Ver `activity_events` da equipe    | ❌             | ✅       | ✅          |
| Ver `activity_events` de outra eq. | ❌             | ❌       | ✅          |
| Editar `activity_event`            | ❌             | ❌       | ✅          |
| Deletar `activity_event`           | ❌             | ❌       | ✅          |
| Registrar pessoa N0/N1             | ✅             | ✅       | ✅          |
| Registrar pessoa N2/N3             | ✅ (assistido) | ✅       | ✅          |
| Ver pessoa N0 anônima              | ✅ (sua)       | ✅ (eq.) | ✅          |
| Ver pessoa N1                      | ✅ (sua)       | ✅ (eq.) | ✅          |
| Ver dados PII (N2/N3)              | ❌             | ✅ (eq.) | ✅          |
| Gerenciar equipes e códigos        | ❌             | ❌       | ✅          |
| Exportar CSV e PDF                 | ❌             | ❌       | ✅          |

RBAC é aplicada via RLS no Supabase. Cliente nunca toma decisão de segurança sozinho.

## 7. LGPD por nível de consentimento

| Nível | Dados retidos                                               | Base legal                   | Retenção                |
| ----- | ----------------------------------------------------------- | ---------------------------- | ----------------------- |
| N0    | Nenhum dado pessoal. Só conta.                              | N/A                          | Indefinido (anônimo)    |
| N1    | Bairro e tipo de necessidade. Sem PII.                      | Legítimo interesse (anônimo) | Indefinido (anônimo)    |
| N2    | Nome, WhatsApp, necessidade. Consentimento verbal logado.   | Consentimento explícito      | 12 meses, opt-out fácil |
| N3    | Tudo de N2 + endereço + foto + assinatura de consentimento. | Consentimento formal         | 24 meses, opt-out fácil |

**Regras invioláveis:**

- Em N2 e N3, o voluntário precisa marcar checkbox confirmando que leu a frase de consentimento em voz alta antes de salvar.
- A frase de consentimento aparece em letras grandes na tela, em pt-BR claro.
- Toda pessoa registrada N2/N3 vira candidata a follow-up. O follow-up deve respeitar o opt-out.
- A tabela `consent_logs` registra timestamp, texto exato do consentimento mostrado e nome do voluntário que coletou.
- Coordenador tem botão "purgar dados pessoais" que respeita pedido de remoção (LGPD art. 18).

## 8. Estratégia offline-first

**Modelo de dados local (Dexie):**

```
activity_events_local  (mesma estrutura do servidor + status: pending|synced|failed)
people_local           (idem)
sync_queue             (event_id, attempts, last_error, next_retry_at)
session                (user_id, team_id, role, code, jwt)
```

**Protocolo de sync:**

1. Todo INSERT no cliente gera `client_event_id` UUID v7 (time-orderable).
2. Salva local com status `pending`.
3. Worker tenta enviar em batches de 20, a cada 15s quando online.
4. Servidor faz UPSERT por `client_event_id` (constraint UNIQUE).
5. Resposta 200 → marca local como `synced`.
6. Resposta 409 (duplicate) → marca como `synced` também.
7. Resposta 5xx → incrementa `attempts`, aplica backoff exponencial (15s, 30s, 60s, 2m, 5m, 10m, 30m max).
8. Resposta 4xx (validation) → marca como `failed`, mostra na tela de sync pro usuário decidir.

**Detecção de online:**

- `navigator.onLine` é unreliable. Fazer ping em `/api/health` a cada 30s.
- Service Worker intercepta requests e retorna cache se offline.
- Sem retry no foreground. Só no background.

## 9. Relatório — conteúdo

**CSV (uma linha por `activity_event`):**

`event_id, team_name, user_name, activity_type, count, lat, lng, occurred_at, person_consent_level, person_neighborhood (se N1+), notes`

**PDF (formato sugerido — coordenador valida o template):**

- Página 1: capa com nome do avanço, datas, região, logos patrocinadores.
- Página 2: sumário executivo com números grandes, hierarquia visual clara.
- Páginas 3 a N: detalhamento por dia.
- Página penúltima: lista de bairros alcançados + mapa estático (v1: lista, v2: mapa).
- Página final: nota LGPD + assinatura do coordenador.

## 10. Métricas de sucesso

- **Operacional:** zero perda de dados durante o avanço. Toda sync recovery em < 24h.
- **Adoção:** ≥ 80% dos voluntários usam o app pelo menos uma vez por dia.
- **Qualidade dos dados:** ≥ 90% dos registros têm timestamp coerente, sem clock skew gritante.
- **Relatório:** PDF entregue pros patrocinadores em ≤ 7 dias após o fim do avanço.

## 11. Stack confirmado

- Frontend: Next.js 15 (App Router) + TypeScript strict + Tailwind v4 + shadcn/ui
- Estado servidor: TanStack Query
- Persistência local: Dexie.js (IndexedDB wrapper)
- PWA: implementação manual com Service Worker custom (ou next-pwa)
- Backend: Supabase (Postgres + Auth + RLS + Storage pra fotos N3)
- Geração de PDF: react-pdf no client (sem chamada extra ao servidor)
- Deploy: Vercel
- Domínio sugerido: `impacto.<seu-dominio>.com.br` (placeholder)

## 12. Riscos conhecidos

| Risco                                        | Impacto | Mitigação                                                                       |
| -------------------------------------------- | ------- | ------------------------------------------------------------------------------- |
| Prazo de 7 dias pro avanço                   | Alto    | Cortar fotos (exceto N3), heatmap, push. Hardcode `event_id`.                   |
| Conexão zero por dias no sertão              | Alto    | Tudo em IndexedDB + sync queue idempotente. Testar offline real antes de subir. |
| Voluntário desinstala app sem sync           | Médio   | Aviso visual de "N pendentes" + botão forçar sync. Treinar coord pra checar.    |
| Conflito de horário entre dispositivos       | Baixo   | Server timestamp é fonte da verdade. Client é só ordem aproximada.              |
| LGPD em N3 (foto + assinatura)               | Médio   | Frase de consentimento padrão, log auditável, retenção definida.                |
| Patrocinador pede dado que o PDF v1 não tem  | Médio   | Conversar com 2-3 patrocinadores antes do avanço pra validar template.          |
| GPS bloqueado por permissão ou hardware ruim | Baixo   | Captura opcional. Registro funciona sem `lat`/`lng`.                            |
| WhatsApp WebView ignora PWA install          | Médio   | Treinar voluntários a abrir o link no Chrome direto, não dentro do WhatsApp.    |

## 13. Decisões de produto que ficam pra você

- Nome exato do avanço (vai no `events.name` seed): **\_\_\_**
- Datas exatas (`start_date` e `end_date`): **\_\_\_**
- Região exata (`events.region`): **\_\_\_**
- Logos dos patrocinadores (se existir, formato PNG transparente): anexar em `/public/sponsors/`
- Frase final do PDF (assinatura institucional): **\_\_\_**
- Política de retenção definitiva (12 e 24 meses são sugestões — confirme com seu jurídico/pastoral): **\_\_\_**
