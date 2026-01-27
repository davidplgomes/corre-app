DOCUMENTO DE REQUISITOS DE PRODUTO (PRD)
Projeto: Corre App
Versao: 3.1 (Final - Com Politica de Cupons)
Data: 27 de Janeiro de 2026
Assunto: Definicao Integral do Ecossistema: Planos, Gamificacao, Economia e Marketplace.

1. VISAO EXECUTIVA
O Corre App opera sob um modelo de negocio hibrido que integra monetizacao recorrente (SaaS) com ferramentas de retencao baseadas em esforco fisico. O sistema diferencia o valor entregue aos usuarios atraves de tres pilares:
1. Acesso e Status: Definido pelo plano de assinatura.
2. Esforco Fisico: Mensurado via XP, impactando o custo da renovacao.
3. Poder de Compra: Mensurado via Pontos, impactando transacoes no marketplace.

--------------------------------------------------------------------------------

2. ESTRUTURA DE ASSINATURAS (PLANOS)
O modelo de receita baseia-se em tres niveis de servico. A diferenciacao ocorre na capacidade de economia (uso de pontos), visibilidade em vendas e beneficios de experiencia.

2.1. Plano Corre Free (Visitante)
Nivel de entrada focado na experimentacao e geracao de base de usuarios.
- Status de Atleta: O usuario visualiza a gamificacao, mas o sistema de niveis permanece inativo. Nao acumula beneficios para descontos futuros.
- Economia: Acumula pontos, mas nao possui permissao para utiliza-los como desconto em compras P2P.
- Vendas: Permite anunciar produtos, sem qualquer destaque visual.
- Eventos: Acesso a eventos abertos com prioridade baixa em filas de espera.
- Cupons: Acesso total a cupons de Parceiros Externos.

2.2. Plano Corre Pro (Intermediario)
Focado no praticante regular que busca retorno sobre o investimento da mensalidade.
- Status de Atleta: Sistema de Niveis ativo. O desempenho fisico do mes corrente gera desconto na fatura do mes seguinte.
- Economia: Habilitado para pagamento hibrido no Marketplace (Dinheiro + Pontos), com limite de abatimento de 20% do valor do item.
- Vendas: Direito a 1 destaque simultaneo em anuncios.
- Eventos: Acesso a eventos exclusivos e prioridade alta em filas de espera.
- Cupons: Acesso a Parceiros Externos + Cupons Exclusivos Loja Oficial.

2.3. Plano Corre Club (Premium)
Focado em experiencia, status social e beneficios exclusivos.
- Status de Atleta: Sistema de Niveis ativo (mesma regra de desconto do Pro).
- Economia: Habilitado para pagamento hibrido no Marketplace (limite de 20% do valor).
- Vendas: Direito a 3 destaques simultaneos em anuncios.
- Beneficio de Adesao (Welcome Kit): Envio unico, pos-pagamento da primeira mensalidade, contendo Camisa Oficial, Numero de Peito, Gel e Cupom.
- Beneficios de Servico:
  * Guest Pass: 1 convite mensal para levar um nao-assinante a eventos exclusivos.
  * Prioridade Maxima: Topo da lista em qualquer fila de espera (Waitlist).
  * Perfil Golden: Identificacao visual diferenciada na plataforma.
- Cupons: Acesso a Parceiros Externos + Cupons Exclusivos Loja Oficial.

--------------------------------------------------------------------------------

3. SISTEMA DE GAMIFICACAO (XP E NIVEIS)
Este motor visa a retencao do usuario. Ele separa o "esforco" (XP) da "moeda" (Pontos).

3.1. Mecanica de XP
O XP (Experiencia) e a metrica de esforco.
- Ciclo de Vida: O saldo de XP e zerado automaticamente no dia 1 de cada mes.
- Objetivo: O acumulo mensal define o Nivel do usuario para o ciclo seguinte.

3.2. Escala de Niveis e Recompensa
O nivel conquistado impacta exclusivamente o valor da renovacao da assinatura (Billing).

- Starter (0 a 9.999 XP): Preco cheio na renovacao.
- Pacer (10.000 a 14.999 XP): 5% de desconto na renovacao.
- Elite (15.000+ XP): 10% de desconto na renovacao.

--------------------------------------------------------------------------------

4. SISTEMA ECONOMICO (PONTOS E CARTEIRA)
Este motor visa a circulacao de valor e engajamento transacional.

4.1. Mecanica de Pontos
Os Pontos sao a moeda de troca. Diferente do XP, eles nao resetam mensalmente, mas possuem validade atrelada a sua origem (TTL).

- Validade Dinamica:
  * Pontos de Rotina (Check-ins diarios): Validade de 30 dias.
  * Pontos de Eventos Especiais: Validade de 60 dias.
  * Pontos de Corridas Oficiais: Validade de 12 meses.
- Regra de Consumo: O sistema utiliza logica FIFO (First In, First Out), consumindo primeiro os pontos mais proximos do vencimento.

4.2. Geracao de Ativos (Tabela de Referencia)
Acoes do usuario geram XP e Pontos simultaneamente.
- Corrida (Integracao): 50 XP/km | 1 Ponto/km
- Treino de Rotina: 300 XP | 3 Pontos
- Evento Especial: 500 XP | 5 Pontos
- Prova Oficial: 2.500 XP | 10 Pontos

--------------------------------------------------------------------------------

5. MARKETPLACE E COMERCIO
Ambiente transacional dividido em duas vertentes: Comunidade (C2C) e Oficial (B2C).

5.1. Marketplace da Comunidade (P2P)
Compra e venda de itens usados entre usuarios.
- Pagamento Hibrido: Assinantes (Pro e Club) podem utilizar saldo de pontos para abater ate 20% do valor do produto. Usuarios Free pagam 100% em dinheiro.
- Taxas de Venda: Aplica-se uma taxa administrativa percentual fixa para todos os usuarios. A diferenciacao do plano Club esta na visibilidade (Destaques).

5.2. Loja Oficial (Corre Shop)
Venda de produtos da marca e itens exclusivos.
- Logistica: Frete calculado de forma padrao para todos os planos.
- Politica de Cupons Internos:
  * Cupons Publicos: Ofertas gerais visiveis para todos os usuarios.
  * Cupons Exclusivos (Assinantes): O sistema disponibiliza cupons especiais (ex: maiores descontos, produtos restritos) visiveis e utilizaveis apenas por usuarios Pro e Club.

--------------------------------------------------------------------------------

6. GESTAO DE PARCEIROS (CUPONS EXTERNOS)
Modelo B2B onde estabelecimentos parceiros oferecem beneficios.

- Acesso Universal: Os cupons gerados por parceiros estao disponiveis para TODOS os planos (Free, Pro e Club).
- Mecanica: O usuario seleciona a oferta no App e gera um codigo/QR Code para validacao no estabelecimento.
- Objetivo: Gerar trafego para o parceiro e oferecer beneficio imediato ate para o usuario gratuito (retencao).

--------------------------------------------------------------------------------

7. REGRAS TECNICAS E VALIDACAO

7.1. Validacao de Presenca
- Treinos de Rotina: Check-in via Geolocalizacao (GPS) com raio de tolerancia de 300 metros e janela de tempo restrita.
- Corridas Oficiais: Validacao assincrona via API de terceiros (ex: Strava/Garmin).

7.2. Algoritmo de Fila de Espera (Waitlist)
Em eventos com lotacao esgotada, a ordenacao segue a hierarquia:
1. Club (Topo).
2. Pro (Meio).
3. Free (Fim).

--------------------------------------------------------------------------------

8. MATRIZ CONSOLIDADA DE BENEFICIOS

| Funcionalidade / Recurso          | Corre Free | Corre Pro | Corre Club |
|-----------------------------------|------------|-----------|------------|
| Welcome Kit (Adesao)              | Nao        | Nao       | Sim (Unico)|
| Niveis (Desconto Renovacao)       | Inativo    | Ativo     | Ativo      |
| Compra Marketplace (Uso Pontos)   | Nao        | Sim (20%) | Sim (20%)  |
| Cupons de Parceiros (Externos)    | Sim        | Sim       | Sim        |
| Cupons Corre Shop (Exclusivos)    | Nao        | Sim       | Sim        |
| Destaques de Venda (Simultaneos)  | 0          | 1         | 3          |
| Guest Pass Mensal                 | Nao        | Nao       | Sim (1)    |
| Prioridade em Filas               | Baixa      | Alta      | Maxima     |
| Identificacao Visual              | Padrao     | Badge Pro | Golden     |