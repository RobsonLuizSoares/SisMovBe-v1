# Checklist de teste — Integridade de movimentação

## Pré-requisitos
- Supabase local rodando com migrations aplicadas
- App mobile (TECH e UNIT_USER)
- Dashboard (admin, TECH, UNIT_USER)

---

## Parte A — Queries e exibição de itens

| # | Teste | Passou? |
|---|-------|---------|
| A1 | **Mobile Fila**: Lista de solicitações exibe quantidade de itens correta (coluna/detalhe) | ☐ |
| A2 | **Mobile Minhas solicitações**: Idem | ☐ |
| A3 | **Mobile Receber**: Preview de tombamentos aparece | ☐ |
| A4 | **Dashboard Fila**: Coluna "Itens" mostra count; 0 em vermelho quando inválido | ☐ |
| A5 | **Dashboard Minhas solicitações**: Coluna "Itens" correta | ☐ |
| A6 | **Detalhe**: Ao abrir uma movimentação antiga (após asset mudar de unidade), itens continuam aparecendo | ☐ |
| A7 | **Detalhe inválido**: Movement com 0 itens exibe "INVÁLIDO" e botão "Excluir movimentação" (admin) | ☐ |

---

## Parte B — Garantias no banco

| # | Teste | Passou? |
|---|-------|---------|
| B1 | **Origem = Destino**: Tentar criar movement com origem = destino → erro | ☐ |
| B2 | **Alterar origem/destino**: Após criar, tentar UPDATE de origin_unit_id → bloqueado | ☐ |
| B3 | **Deletar/editar movement_items**: UNIT_USER ou TECH não conseguem DELETE/UPDATE em movement_items | ☐ |
| B4 | **Bem em duas movimentações**: Adicionar o mesmo asset em duas solicitações ativas (requested/picked_up) → "Bem já está em movimentação ativa" | ☐ |
| B5 | **Atualizar lotação ao receber**: Confirmar recebimento → assets.current_unit_id = destino | ☐ |
| B6 | **Cascade**: Excluir movement inteiro → items e events removidos | ☐ |

---

## Parte C — Validações no app

| # | Teste | Passou? |
|---|-------|---------|
| C1 | **Origem ≠ Destino (TECH)**: Selecionar mesma unidade em origem e destino → "Origem e destino não podem ser a mesma unidade" | ☐ |
| C2 | **Carrinho vazio**: Finalizar sem itens → bloqueado | ☐ |
| C3 | **Duplicidade de tombamento (mobile)**: Adicionar mesmo tombamento duas vezes ao carrinho → "Este tombamento já está no carrinho" | ☐ |
| C4 | **Duplicidade (dashboard)**: Idem em solicitar-envio | ☐ |
| C5 | **Bem em movimentação ativa**: Adicionar asset já em requested/picked_up → "Este bem já está em movimentação ativa" | ☐ |
| C6 | **Rollback UNIT_USER**: Criar movement, falhar no primeiro addMovementItem → movement não fica órfão (0 itens); é excluído | ☐ |
| C7 | **Rollback TECH**: createMovementPickedUp falha ao inserir item (ex: asset duplicado) → movement é excluído | ☐ |

---

## Fluxos completos

| # | Teste | Passou? |
|---|-------|---------|
| F1 | **UNIT_USER**: Solicitar envio → adicionar itens → finalizar → aparece em Minhas solicitações | ☐ |
| F2 | **TECH**: Movimentar (origem ≠ destino) → adicionar itens → finalizar → aparece em Receber | ☐ |
| F3 | **TECH**: Fila → Iniciar recolhimento → Receber → Confirmar recebimento → asset em nova unidade | ☐ |
| F4 | **Admin**: Movement com 0 itens → Excluir movimentação (inteira) → removido da lista | ☐ |

---

## Fluxos que NÃO devem funcionar (bloqueados)

| # | Teste | Passou? |
|---|-------|---------|
| N1 | Remover item individual do carrinho (após B3: snapshot imutável) | ☐ Botão de remover removido |
| N2 | Criar movement com origem = destino | ☐ |
| N3 | Adicionar mesmo asset em duas movimentações ativas | ☐ |
