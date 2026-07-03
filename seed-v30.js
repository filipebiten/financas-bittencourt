// ============================================================
// SEED v3.0 — VIRADA DE MÊS (01/07/2026)
//
// Roda UMA VEZ. Auto-contido: inicializa o próprio Firebase.
//
// COMO RODAR (não precisa de botão):
//   1. Suba este arquivo no repositório (financas-bittencourt)
//   2. Abra o app: https://filipebiten.github.io/financas-bittencourt/
//   3. Abra o console (F12 → aba Console)
//   4. Cole e rode:
//        const m = await import('./seed-v30.js?v=1'); await m.executaSeedV30();
//   5. Confirme o prompt. Aguarde o "✓ v3.0 concluída".
//
// O QUE FAZ:
//   1. Apaga TODOS os lançamentos com data >= 01/06/2026 (junho pra frente).
//      MAIO E ANTERIORES FICAM INTOCADOS.
//   2. Atualiza recorrências variáveis pro valor REAL de junho
//      (Energisa 345,56 · ALSOL 340,51) — você edita quando vier a conta.
//   3. Reimporta JUNHO REAL do extrato (conta + cartão itemizado),
//      já categorizado. Créditos = entrada (sinal negativo).
//   4. Cria as parcelas REAIS da fatura e projeta as futuras
//      (valor da parcela × nº de vezes — nunca o total).
//   5. Lança os itens de JULHO que você passou.
//   6. Ancora o saldo base em -R$ 5.514,23 (saldo real 01/07).
//   7. NÃO lança: débito da fatura (-7.993,07 é pagamento de maio),
//      só afeta o banco, não é gasto novo.
//
// As recorrências de julho (aluguel novo, salário PIB -7.804,93, TIM,
// Netflix etc.) o próprio app materializa quando carregar. Não duplico aqui.
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore, doc, setDoc, collection, getDoc, getDocs,
  query, where, writeBatch, updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC6q9FtRdqdvVG4rbKQGfW97hzjagppeao",
  authDomain: "financas-bittencourt.firebaseapp.com",
  projectId: "financas-bittencourt",
  storageBucket: "financas-bittencourt.appspot.com",
};

export async function executaSeedV30(dbArg, toastArg){
  // ---- setup: usa o db passado ou inicializa um próprio ----
  const db = dbArg || getFirestore(initializeApp(firebaseConfig, 'seedv30'));
  const toast = toastArg || ((msg) => { console.log('[seed-v30]', msg); });

  const flagRef = doc(db, 'config', 'seedV30Executado');
  const flagSnap = await getDoc(flagRef);
  if(flagSnap.exists()){
    if(!confirm('⚠️ A v3.0 já rodou em ' +
      new Date(flagSnap.data().executadoEm).toLocaleString('pt-BR') +
      '. Rodar de novo vai apagar junho+ e reimportar do zero. Continuar?')){
      toast('Cancelado.'); return;
    }
  } else {
    if(!confirm('Isto vai APAGAR tudo de junho/26 pra frente e reimportar junho real + itens de julho. Maio e anteriores ficam. Continuar?')){
      toast('Cancelado.'); return;
    }
  }

  const iso = (y,m,d,h=12) => new Date(y,m,d,h,0).toISOString();
  const tsOf = (y,m,d,h=12) => new Date(y,m,d,h,0).getTime();

  // ============================================================
  // 1. APAGAR TUDO >= 01/06/2026
  // ============================================================
  const iniJun = tsOf(2026, 5, 1, 0);
  const qDel = query(collection(db, 'lancamentos'), where('ts', '>=', iniJun));
  const snapDel = await getDocs(qDel);
  const docsDel = snapDel.docs;
  for(let i = 0; i < docsDel.length; i += 400){
    const b = writeBatch(db);
    docsDel.slice(i, i+400).forEach(d => b.delete(d.ref));
    await b.commit();
  }
  toast(`Apagados ${docsDel.length} lançamentos de junho+.`);

  // ============================================================
  // 2. ATUALIZAR RECORRÊNCIAS VARIÁVEIS (valor real de junho)
  // ============================================================
  const snapRec = await getDocs(collection(db, 'recorrencias'));
  for(const d of snapRec.docs){
    const r = d.data();
    if(r.descricao === 'Energisa')       await updateDoc(d.ref, { valor: 345.56 });
    if(r.descricao === 'ALSOL Energias')  await updateDoc(d.ref, { valor: 340.51 });
  }

  // ============================================================
  // 3. JUNHO REAL — helper de inserção
  // ============================================================
  // [dia, descricao, valor(+gasto/-crédito), categoria, cartao]
  // Itens de fatura com compra em maio (28-31/05) entram com data 01/06
  // (regime: gasto conta no mês em que a fatura fecha).

  const junho = [];
  const add = (dia, desc, valor, cat, cartao='') => junho.push([dia, desc, valor, cat, cartao]);

  // ---------- CONTA CORRENTE — gastos ----------
  add(1,  'Juros saldo utilizado (mai)',      398.36, 'bancojuros', '');
  add(1,  'IOF operações financeiras (mai)',   12.59, 'bancojuros', '');
  add(1,  'IOF adicional (mai)',               49.83, 'bancojuros', '');
  add(3,  'Mafra (limpeza carro)',             80.00, 'transporte', '');
  add(5,  'Aluguel',                         1899.46, 'moradia',    '');
  add(8,  'TIM (Filipe)',                      83.99, 'comunicacao','');
  add(8,  'TED Grão (previdência)',           200.00, 'investimentos',''); // aporte
  add(9,  'Condomínio Parque Ciudad',         100.00, 'moradia',    '');
  add(10, 'Porto Seguro',                      60.37, 'seguros',    '');
  add(10, 'Unimed',                          1798.13, 'saude',      '');
  add(12, 'ALSOL Energias',                   340.51, 'moradia',    '');
  add(12, 'Alpha Cell (PC novo)',            8299.00, 'pessoalfilipe','');
  add(15, 'Maria Lourdes Conde (PIX)',         20.00, 'filhos',     '');
  add(15, 'Rafaelle Almeida (PIX)',            10.00, 'filhos',     '');
  add(15, 'Isabel Oliveira (PIX)',             10.00, 'filhos',     '');
  add(15, 'Condomínio Parque Ciudad',         100.00, 'moradia',    '');
  add(16, 'Energisa',                         345.56, 'moradia',    '');
  add(17, 'SHPP Brasil (PIX)',                123.39, 'outros',     '');
  add(18, 'Jenifer Duarte (PIX)',             150.00, 'filhos',     '');
  add(19, 'Tania Reis (PIX)',                  60.00, 'filhos',     '');
  add(22, 'Digital Net',                      126.16, 'comunicacao','');
  add(25, 'Tarifa pacote serviços',            32.70, 'bancojuros', '');
  add(25, 'Joao Paulo Almeida (PIX)',          10.00, 'filhos',     '');
  add(26, 'Eli Simone Delmondes (PIX)',       125.00, 'filhos',     '');
  add(1,  'Beatriz Novaes (PIX)',              20.00, 'filhos',     '');
  add(8,  'Arthur Georges Sanches (PIX)',      48.50, 'filhos',     '');
  add(8,  'Isabella Andrade (PIX)',            70.00, 'filhos',     '');
  add(8,  'Isabela Leticia Borges (PIX)',      24.00, 'filhos',     '');
  add(29, 'Patricia Santos (PIX)',            150.00, 'filhos',     '');
  add(29, 'Daniel Alencar (PIX)',             207.80, 'filhos',     '');
  add(29, 'Jessica de Souza (PIX)',           210.00, 'filhos',     '');
  add(29, 'Nadir Pinheiro (PIX)',              10.00, 'filhos',     '');
  add(29, 'Clelia Sampaio (PIX)',             100.00, 'filhos',     '');
  add(29, 'Condomínio Parque Ciudad',          24.00, 'moradia',    '');
  add(29, 'Ana Paula Dalbianco (PIX)',        240.00, 'filhos',     '');
  add(29, 'Minas Brasil',                     514.88, 'seguros',    '');
  add(30, 'IRPF cota',                        482.30, 'impostos',   '');

  // ---------- CONTA CORRENTE — créditos (entrada, sinal negativo) ----------
  add(2,  'IUNGO (renda)',                  -6379.00, 'outros',     '');
  add(2,  'IUNGO (renda)',                  -1621.00, 'outros',     '');
  add(8,  'Salário igreja (junho)',         -5933.97, 'outros',     '');
  add(11, 'Pedro Henrique (PIX receb.)',      -83.65, 'outros',     '');
  add(11, 'Venda PC antigo',                -7000.00, 'pessoalfilipe','');
  add(15, 'Reembolso Unimed (igreja)',      -1798.13, 'saude',      ''); // zera Unimed
  add(16, 'Everaldo Verissimo (PIX receb.)', -100.00, 'outros',     '');
  add(16, 'Tercia Cristina (PIX receb.)',    -100.00, 'outros',     '');
  add(23, 'Everaldo Verissimo (PIX receb.)', -100.00, 'outros',     '');
  add(23, 'Talita Aguiar (PIX receb.)',      -200.00, 'outros',     '');
  add(23, 'Tercia Cristina (PIX receb.)',    -100.00, 'outros',     '');
  add(26, 'IUNGO (renda)',                  -2428.80, 'outros',     '');

  // ---------- CARTÃO 2913 (Filipe) — despesas ----------
  add(1,  'Fornalha Pizzaria',                120.00, 'restaurante', '2913'); // compra 28/05
  add(1,  'Legal Supermercados',               10.40, 'alimentacao', '2913'); // 30/05
  add(1,  'Legal Supermercados',               56.26, 'alimentacao', '2913'); // 30/05
  add(1,  'Sabor em Quilo',                     8.00, 'restaurante', '2913'); // 31/05
  add(2,  'PIB (café)',                        51.00, 'restaurante', '2913');
  add(2,  'Time da Pizza (IFood)',             85.90, 'restaurante', '2913');
  add(3,  'Sesc Sabor e Arte',                 18.25, 'restaurante', '2913');
  add(3,  'Fabiola Cosméticos',               125.00, 'pessoalmari', '2913');
  add(4,  'Drogasil',                          21.18, 'saude',       '2913');
  add(6,  'Lincolnarildo',                     23.50, 'outros',      '2913');
  add(6,  'Jim Com Lorrayne',                 275.00, 'outros',      '2913');
  add(8,  'Legal Supermercados',               18.65, 'alimentacao', '2913');
  add(10, 'Sesc Sabor e Arte',                 22.67, 'restaurante', '2913');
  add(10, 'PIB (café)',                        16.00, 'restaurante', '2913');
  add(10, 'Drogasil',                          42.96, 'saude',       '2913');
  add(11, 'PIB (café)',                        29.00, 'restaurante', '2913');
  add(11, 'Amazon Prime BR',                   19.90, 'assinaturas', '2913');
  add(12, 'Loja 13 Utilidades',                70.00, 'outros',      '2913');
  add(12, 'PIB (café)',                        37.00, 'restaurante', '2913');
  add(12, 'Frever Restaurante (IFood)',       130.28, 'restaurante', '2913');
  add(12, 'Morena Bijux',                      35.00, 'pessoalmari', '2913');
  add(13, 'Uber',                              16.83, 'transporte',  '2913');
  add(13, 'PIB (café)',                        11.00, 'restaurante', '2913');
  add(13, 'Jim Com Isabella',                  37.17, 'outros',      '2913');
  add(13, 'Sabor Enquilo',                     34.62, 'restaurante', '2913');
  add(13, 'Chinzarian Foods (IFood)',         103.85, 'restaurante', '2913');
  add(14, 'Spotify',                           31.90, 'assinaturas', '2913');
  add(15, 'TIM (Mari)',                        98.99, 'comunicacao', '2913');
  add(16, 'Drogasil',                          62.94, 'saude',       '2913');
  add(17, 'Apple.com',                         66.90, 'assinaturas', '2913');
  add(17, 'PIB (café)',                        27.60, 'restaurante', '2913');
  add(17, 'Dale Itatiaia',                     48.00, 'outros',      '2913');
  add(17, 'Seu Botelho (cabelo)',              40.00, 'pessoalfilipe','2913');
  add(18, 'Uber',                              17.38, 'transporte',  '2913');
  add(18, 'Petróleo São José (combustível)',  203.59, 'transporte',  '2913');
  add(18, 'Assaí Atacadista',                 200.90, 'alimentacao', '2913');
  add(19, 'Seu Botelho (cabelo)',              65.00, 'pessoalfilipe','2913');
  add(20, 'Maria Filó',                        74.25, 'pessoalmari', '2913');
  add(22, 'Pioneiro Cultura',                  22.00, 'outros',      '2913');
  add(22, 'Posto Acácia (combustível)',       163.89, 'transporte',  '2913');
  add(23, 'Posto Locatelli (combustível)',    191.35, 'transporte',  '2913');
  add(23, 'Netflix',                           59.90, 'assinaturas', '2913');
  add(24, 'PIB (café)',                        32.00, 'restaurante', '2913');
  add(24, 'Dale Marqus',                       79.80, 'outros',      '2913');
  add(25, 'Afecetur',                           8.00, 'outros',      '2913');
  add(25, 'Sobaria Nipônica',                 130.00, 'restaurante', '2913');
  add(26, 'PIB (café)',                        12.00, 'restaurante', '2913');
  add(27, 'Claude AI (Anthropic)',            116.99, 'assinaturas', '2913');
  add(27, 'S Pires Tiradentes',                47.03, 'alimentacao', '2913');
  add(27, 'Jim Com Lapismania',                20.00, 'outros',      '2913');
  add(5,  'Seguro cartão',                     11.46, 'bancojuros',  '9594');

  // ---------- CARTÃO 3877 (Mari) — despesas ----------
  add(1,  'Assaí Atacadista',                 286.40, 'alimentacao', '3877'); // 28/05
  add(1,  'Laureen (depilação Mari)',         143.00, 'pessoalmari', '3877'); // 29/05
  add(1,  'Kanto de Minas',                    79.90, 'restaurante', '3877');
  add(1,  'Petróleo São José (combustível)',  210.45, 'transporte',  '3877');
  add(2,  'Assaí Atacadista',                1133.09, 'alimentacao', '3877');
  add(3,  'Raia Drogasil',                     20.57, 'saude',       '3877');
  add(6,  'Raia Drogasil',                     31.77, 'saude',       '3877');
  add(6,  'Legal Supermercados',               82.86, 'alimentacao', '3877');
  add(10, 'Legal Supermercados',              154.13, 'alimentacao', '3877');
  add(11, 'Apple (iCloud)',                     9.99, 'assinaturas', '3877');
  add(15, 'Assaí Atacadista',                 598.33, 'alimentacao', '3877');
  add(25, 'Legal Supermercados',               49.66, 'alimentacao', '3877');
  add(25, 'Aura Beleza Spa',                  205.00, 'pessoalmari', '3877');
  add(26, 'Fort Atacadista',                  893.89, 'alimentacao', '3877');
  add(26, 'Britocarnese (açougue)',           461.00, 'alimentacao', '3877');
  add(11, 'Estorno Shopee',                   -37.63, 'outros',      '3877'); // crédito

  // grava junho
  for(let i = 0; i < junho.length; i += 400){
    const b = writeBatch(db);
    for(const [dia, desc, valor, cat, cartao] of junho.slice(i, i+400)){
      const ts = tsOf(2026, 5, dia);
      b.set(doc(collection(db, 'lancamentos')), {
        valor, descricao: desc, categoriaId: cat,
        cartao: cartao || null, ts, data: new Date(ts).toISOString(),
        criadoEm: Date.now(), origem: 'seed-v30',
      });
    }
    await b.commit();
  }

  // ============================================================
  // 4. PARCELAS — valor da parcela × nº de vezes
  // {desc, val, atual, total, cat, cartao, mesBase, anoBase, dia}
  // mesBase = mês (0-based) em que cai a parcela "atual".
  // Gera de atual até total. Junho = 5.
  // ============================================================
  const parcelas = [
    // ----- fatura junho: cartão 1959 -----
    {desc:'Óticas Carol',            val:170.00, atual:6,  total:10, cat:'saude',       cartao:'1959', mesBase:5},
    // ----- fatura junho: cartão 2913 -----
    {desc:'Atos6 (ordem)',           val:52.66,  atual:5,  total:6,  cat:'outros',      cartao:'2913', mesBase:5},
    {desc:'Amazon BR',               val:33.24,  atual:3,  total:5,  cat:'outros',      cartao:'2913', mesBase:5},
    {desc:'Shein Piante Modas',      val:58.59,  atual:3,  total:6,  cat:'pessoalmari', cartao:'2913', mesBase:5},
    {desc:'Mercado Carrosom',        val:51.32,  atual:2,  total:7,  cat:'transporte',  cartao:'2913', mesBase:5},
    {desc:'Pneustore',               val:102.50, atual:2,  total:8,  cat:'transporte',  cartao:'2913', mesBase:5},
    {desc:'Amazon (TTImporta)',      val:35.67,  atual:1,  total:3,  cat:'outros',      cartao:'2913', mesBase:5},
    {desc:'Amazon bicicleta Pedro',  val:55.80,  atual:1,  total:10, cat:'filhos',      cartao:'2913', mesBase:5},
    {desc:'Auto Rodas Serviços',     val:255.00, atual:1,  total:2,  cat:'transporte',  cartao:'2913', mesBase:5},
    {desc:'Amazon Marketplace',      val:97.36,  atual:1,  total:12, cat:'outros',      cartao:'2913', mesBase:5},
    {desc:'Lefolie Confeitaria',     val:313.38, atual:1,  total:2,  cat:'outros',      cartao:'2913', mesBase:5},
    // ----- fatura junho: cartão 3877 -----
    {desc:'Shopee Inovamallbr',      val:61.08,  atual:6,  total:8,  cat:'outros',      cartao:'3877', mesBase:5},
    {desc:'Mon Amour',               val:63.30,  atual:3,  total:3,  cat:'pessoalmari', cartao:'3877', mesBase:5},
    {desc:'Jim Com Katyuska',        val:51.66,  atual:3,  total:3,  cat:'outros',      cartao:'3877', mesBase:5},
    {desc:'Drogasil',                val:93.20,  atual:2,  total:2,  cat:'saude',       cartao:'3877', mesBase:5},
    {desc:'Shopee Ironkids',         val:74.40,  atual:2,  total:5,  cat:'filhos',      cartao:'3877', mesBase:5},
    {desc:'Duda Baby',               val:77.20,  atual:2,  total:6,  cat:'filhos',      cartao:'3877', mesBase:5},
    {desc:'Lojas Brasileirinho',     val:73.44,  atual:2,  total:2,  cat:'filhos',      cartao:'3877', mesBase:5},
    {desc:'Shopee Tricomais',        val:72.33,  atual:2,  total:4,  cat:'pessoalmari', cartao:'3877', mesBase:5},
    {desc:'Shein By King',           val:118.98, atual:2,  total:3,  cat:'pessoalmari', cartao:'3877', mesBase:5},
    {desc:'Shopee (aniv. meninos)',  val:87.37,  atual:1,  total:12, cat:'outros',      cartao:'3877', mesBase:5},
    {desc:'Shopee Donaecommerce',    val:72.08,  atual:1,  total:2,  cat:'outros',      cartao:'3877', mesBase:5},
    {desc:'Jim Com Gabriela',        val:106.49, atual:1,  total:2,  cat:'outros',      cartao:'3877', mesBase:5},
    {desc:'Brock',                   val:83.90,  atual:1,  total:2,  cat:'outros',      cartao:'3877', mesBase:5},
    {desc:'Hiper Festa',             val:81.36,  atual:1,  total:2,  cat:'filhos',      cartao:'3877', mesBase:5},
    {desc:'Bebi Festas Locação',     val:79.34,  atual:1,  total:3,  cat:'filhos',      cartao:'3877', mesBase:5},
    {desc:'ZP Sirlene',              val:89.98,  atual:1,  total:2,  cat:'outros',      cartao:'3877', mesBase:5},
    {desc:'MP Mariabenitez',         val:104.16, atual:1,  total:2,  cat:'outros',      cartao:'3877', mesBase:5},
    {desc:'ZP M N Locações',         val:559.58, atual:1,  total:2,  cat:'outros',      cartao:'3877', mesBase:5},
    // ----- JULHO manual: Riachuelo 3x -----
    {desc:'Riachuelo',               val:109.99, atual:1,  total:3,  cat:'pessoalfilipe',cartao:'2913', mesBase:6, dia:1},
  ];

  for(const p of parcelas){
    const grupoId = 'p' + Date.now() + Math.random().toString(36).slice(2,6);
    const b = writeBatch(db);
    const dia = p.dia || 15;
    for(let k = p.atual; k <= p.total; k++){
      const off = k - p.atual;
      const ts = tsOf(p.anoBase || 2026, p.mesBase + off, dia);
      b.set(doc(collection(db, 'lancamentos')), {
        valor: p.val,
        descricao: `${p.desc} (${k}/${p.total})`,
        categoriaId: p.cat,
        cartao: p.cartao || null,
        ts, data: new Date(ts).toISOString(),
        criadoEm: Date.now(),
        parcelaGrupo: grupoId, parcelaNum: k, parcelaTotal: p.total,
        origem: 'parcela',
      });
    }
    await b.commit();
  }

  // ============================================================
  // 5. JULHO — itens avulsos que você passou
  // ============================================================
  const julho = [
    [1,  'Assaí / Mercado',          998.15, 'alimentacao', ''],
    [1,  'Bebi Festa Locação',        87.00, 'filhos',      ''],   // ver nota: pode duplicar c/ parcela 2/3
    [1,  'Juros cheque especial',     61.07, 'bancojuros',  ''],
    [1,  'IOF cheque especial',       10.92, 'bancojuros',  ''],
    [1,  'IOF/juros cheque especial',368.19, 'bancojuros',  ''],
    [2,  'Bolo 1B Coffee',            32.00, 'restaurante', '2913'],
  ];
  const bJul = writeBatch(db);
  for(const [dia, desc, valor, cat, cartao] of julho){
    const ts = tsOf(2026, 6, dia);
    bJul.set(doc(collection(db, 'lancamentos')), {
      valor, descricao: desc, categoriaId: cat,
      cartao: cartao || null, ts, data: new Date(ts).toISOString(),
      criadoEm: Date.now(), origem: 'seed-v30',
    });
  }
  await bJul.commit();

  // ============================================================
  // 6. SALDO BASE 01/07 = -5.514,23
  // ============================================================
  await setDoc(doc(db, 'config', 'saldoConta'), {
    valor: -5514.23,
    atualizadoEm: Date.now(),
  });

  // ============================================================
  // 7. MARCAR EXECUTADO
  // ============================================================
  await setDoc(flagRef, { executadoEm: Date.now() });

  toast('✓ v3.0 concluída. Recarregue o app. Julho vai materializar as recorrências sozinho.');
  console.log('[seed-v30] Recarregue a página (F5). As recorrências de julho aparecem ao carregar.');
}
