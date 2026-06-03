// ============================================================
// SEED v2.8 — IMPORTAÇÃO CONSOLIDADA (única execução)
//
// Roda DEPOIS de você apagar manualmente no Firebase Console:
// - lancamentos (toda)
// - recorrencias (toda)
// - config (toda)
//
// Insere:
// - 15 recorrências (com datas-fim corretas)
// - Lançamentos de maio das recorrências (já materializados)
// - 8 grupos de parcelas espalhados pelos meses
// - ~50 avulsos de maio (extrato + fatura)
// - Marca cofre IPVA como pago (R$ 281,86)
// - Cria nova recorrência Aluguel R$ 1.875,23 a partir de julho
// ============================================================
import {
  getFirestore, doc, setDoc, collection, addDoc, writeBatch, getDoc, getDocs, query, where, updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export async function executaSeedV28(db, toast){
  const flagRef = doc(db, 'config', 'seedV28Executado');
  const flagSnap = await getDoc(flagRef);
  if(flagSnap.exists()){
    if(!confirm('⚠️ ATENÇÃO: este seed já rodou. Executar de novo VAI DUPLICAR todos os lançamentos.\n\nVocê limpou as coleções no Firebase Console antes? Se não, CANCELE e limpe primeiro.')){
      toast('Cancelado.');
      return;
    }
  }

  // ============== CATEGORIAS NOVAS (caso ainda não existam) ==============
  const novasCategorias = [
    { id: 'lazer',      nome: 'Lazer',         teto: 0, icone: '🎬', ordem: 15 },
    { id: 'bancojuros', nome: 'Banco/Juros',   teto: 0, icone: '🏦', ordem: 16 },
    { id: 'impostos',   nome: 'Impostos',      teto: 0, icone: '📋', ordem: 17 },
  ];
  const batchC = writeBatch(db);
  for(const c of novasCategorias){
    const ref = doc(db, 'categorias', c.id);
    const snap = await getDoc(ref);
    if(!snap.exists()){
      batchC.set(ref, { ...c, criadoEm: Date.now() });
    }
  }
  await batchC.commit();

  // ============== RECORRÊNCIAS ==============
  // Aluguel maio/junho R$ 1.899,46 → recorrência com dataFim 30/06
  // Aluguel jul+ R$ 1.875,23 → nova recorrência
  // Unimed: dataFim 30/06 (sai em julho)
  // Minas Brasil: dataFim 31/08 (última parcela 27/08)
  const recorrencias = [
    {desc:'Aluguel',             valor:1899.46, dia:5,  cat:'moradia',     cartao:'', dataInicio: new Date(2026,4,1).toISOString(), dataFim: new Date(2026,5,30,23,59).toISOString()},
    {desc:'Aluguel',             valor:1875.23, dia:5,  cat:'moradia',     cartao:'', dataInicio: new Date(2026,6,1).toISOString(), dataFim: null},
    {desc:'Energisa',            valor:246.23,  dia:18, cat:'moradia',     cartao:'', dataInicio: new Date(2026,4,1).toISOString(), dataFim: null},
    {desc:'ALSOL Energias',      valor:374.69,  dia:21, cat:'moradia',     cartao:'', dataInicio: new Date(2026,4,1).toISOString(), dataFim: null},
    {desc:'Digital Net',         valor:126.16,  dia:21, cat:'comunicacao', cartao:'', dataInicio: new Date(2026,4,1).toISOString(), dataFim: null},
    {desc:'TIM (Filipe)',        valor:83.99,   dia:7,  cat:'comunicacao', cartao:'', dataInicio: new Date(2026,4,1).toISOString(), dataFim: null},
    {desc:'TIM (Mari)',          valor:98.99,   dia:15, cat:'comunicacao', cartao:'2913', dataInicio: new Date(2026,4,1).toISOString(), dataFim: null},
    {desc:'Unimed',              valor:1701.71, dia:11, cat:'saude',       cartao:'', dataInicio: new Date(2026,4,1).toISOString(), dataFim: new Date(2026,5,30,23,59).toISOString()},
    {desc:'Porto Seguro',        valor:60.37,   dia:11, cat:'seguros',     cartao:'', dataInicio: new Date(2026,4,1).toISOString(), dataFim: null},
    {desc:'Minas Brasil',        valor:514.88,  dia:27, cat:'seguros',     cartao:'', dataInicio: new Date(2026,4,1).toISOString(), dataFim: new Date(2026,7,31,23,59).toISOString()},
    {desc:'Netflix',             valor:59.90,   dia:23, cat:'assinaturas', cartao:'2913', dataInicio: new Date(2026,4,1).toISOString(), dataFim: null},
    {desc:'Spotify',             valor:31.90,   dia:14, cat:'assinaturas', cartao:'2913', dataInicio: new Date(2026,4,1).toISOString(), dataFim: null},
    {desc:'Amazon Prime BR',     valor:19.90,   dia:11, cat:'assinaturas', cartao:'2913', dataInicio: new Date(2026,4,1).toISOString(), dataFim: null},
    {desc:'Amazon Prime Canais', valor:34.90,   dia:21, cat:'assinaturas', cartao:'2913', dataInicio: new Date(2026,4,1).toISOString(), dataFim: null},
    {desc:'Apple (iCloud)',      valor:9.99,    dia:11, cat:'assinaturas', cartao:'3877', dataInicio: new Date(2026,4,1).toISOString(), dataFim: null},
    {desc:'Claude AI',           valor:116.02,  dia:27, cat:'assinaturas', cartao:'2913', dataInicio: new Date(2026,4,1).toISOString(), dataFim: null},
  ];

  // Cria todas as recorrências + materializa as lançamentos de MAIO (e junho pras q ainda valem)
  const recRefs = []; // pra mapear depois
  for(const r of recorrencias){
    const recRef = doc(collection(db, 'recorrencias'));
    recRefs.push({ref: recRef, dados: r});
  }
  // primeiro grava todas as recorrências num batch
  const batchR = writeBatch(db);
  for(const {ref, dados} of recRefs){
    batchR.set(ref, {
      descricao: dados.desc,
      valor: dados.valor,
      categoriaId: dados.cat,
      diaDoMes: dados.dia,
      cartao: dados.cartao || null,
      dataInicio: dados.dataInicio,
      dataFim: dados.dataFim,
      criadoEm: Date.now(),
    });
  }
  await batchR.commit();

  // Materializa o lançamento de MAIO de cada recorrência (somente as que começam em maio)
  const batchM = writeBatch(db);
  for(const {ref, dados} of recRefs){
    const dataInicioMs = new Date(dados.dataInicio).getTime();
    const maio1 = new Date(2026, 4, 1).getTime();
    const maio31 = new Date(2026, 4, 31, 23, 59).getTime();
    // se a recorrência começa antes de junho, materializa o lançamento de maio
    if(dataInicioMs <= maio31){
      const ts = new Date(2026, 4, dados.dia, 12, 0).getTime();
      const lancRef = doc(collection(db, 'lancamentos'));
      batchM.set(lancRef, {
        valor: dados.valor,
        descricao: dados.desc,
        categoriaId: dados.cat,
        cartao: dados.cartao || null,
        ts: ts,
        data: new Date(ts).toISOString(),
        criadoEm: Date.now(),
        recorrenciaId: ref.id,
        origem: 'recorrencia',
      });
    }
  }
  await batchM.commit();

  // ============== PARCELAS ==============
  const parcelas = [
    {desc:'Drogasil 2710',         valor:93.20,  parcelas:2, cat:'saude',       cartao:'3877'},
    {desc:'Shein by King',         valor:118.98, parcelas:3, cat:'pessoalmari', cartao:'3877'},
    {desc:'Lojas Brasileirinho',   valor:73.45,  parcelas:2, cat:'filhos',      cartao:'3877'},
    {desc:'Mercado*Carrosomshop',  valor:51.32,  parcelas:7, cat:'transporte',  cartao:'2913'},
    {desc:'Shopee*Ironkids',       valor:74.40,  parcelas:5, cat:'filhos',      cartao:'3877'},
    {desc:'Shopee*tricomais',      valor:72.33,  parcelas:4, cat:'pessoalmari', cartao:'3877'},
    {desc:'Pneustore CPX',         valor:102.50, parcelas:8, cat:'transporte',  cartao:'2913'},
    {desc:'Duda Baby',             valor:77.20,  parcelas:6, cat:'filhos',      cartao:'3877'},
  ];
  const batchP = writeBatch(db);
  for(const p of parcelas){
    const grupoId = 'p' + Date.now() + Math.random().toString(36).slice(2,6);
    for(let i = 0; i < p.parcelas; i++){
      const data = new Date(2026, 4 + i, 15, 12, 0);
      const ref = doc(collection(db, 'lancamentos'));
      batchP.set(ref, {
        valor: p.valor,
        descricao: `${p.desc} (${i+1}/${p.parcelas})`,
        categoriaId: p.cat,
        cartao: p.cartao || null,
        ts: data.getTime(),
        data: data.toISOString(),
        criadoEm: Date.now(),
        parcelaGrupo: grupoId,
        parcelaNum: i+1,
        parcelaTotal: p.parcelas,
        origem: 'parcela',
      });
    }
  }
  await batchP.commit();

  // ============== AVULSOS DE MAIO ==============
  const avulsos = [
    // Alimentação
    [4, 5, 'Legal Supermercados',           42.12, 'alimentacao', '2913'],
    [4, 5, 'Assaí Atacadista',              1520.45, 'alimentacao', '3877'],
    [5, 5, 'Legal Supermercados',           148.18, 'alimentacao', '3877'],
    [8, 5, 'Nunes Supermerc Vila Boa',      156.55, 'alimentacao', '2913'],
    [9, 5, 'GT Comercial de Alimentos',     42.64, 'alimentacao', '2913'],
    [11, 5,'Pao Mix',                       17.70, 'alimentacao', '3877'],
    [13, 5,'Assaí Atacadista',              227.05, 'alimentacao', '3877'],
    [15, 5,'Assaí Atacadista',              286.40, 'alimentacao', '3877'],  // fatura junho
    [15, 5,'Mercado Legal',                 10.40, 'alimentacao', '2913'],   // fatura junho
    [15, 5,'Mercado Legal',                 56.26, 'alimentacao', '2913'],   // fatura junho
    [16, 5,'Pao Mix',                       38.73, 'alimentacao', '3877'],
    [18, 5,'Legal Supermercados',           229.65, 'alimentacao', '3877'],
    [18, 5,'Legal Supermercados (débito)',  8.28, 'alimentacao', ''],
    [26, 5,'S Pires l12 Tiradentes',        79.26, 'alimentacao', '2913'],
    // Saúde
    [3, 5, 'Drogasil 3810',                 38.85, 'saude', '3877'],
    [2, 5, 'Drogasil 2710',                 31.77, 'saude', '3877'],
    [15, 5,'Drogasil 1449',                 19.39, 'saude', '2913'],
    [18, 5,'Raia Drogasil',                 138.27, 'saude', '2913'],
    [18, 5,'Raia Drogasil',                 57.94, 'saude', '2913'],
    [20, 5,'Raia Drogasil',                 69.08, 'saude', '3877'],
    [22, 5,'Drogasil 2710',                 39.99, 'saude', '2913'],
    [22, 5,'Drogasil 2710',                 16.98, 'saude', '3877'],
    [25, 5,'Raia Drogasil',                 53.29, 'saude', '3877'],
    [4, 5, 'Amare Vacinas (filhos)',        226.00, 'saude', '2913'],
    // Transporte
    [12, 5,'Petroleo Sao Jose',             285.09, 'transporte', '2913'],
    [7, 5, 'Campo Grande Parking',          24.00, 'transporte', '3877'],
    [18, 5,'Rede Autoestacionamento',       12.00, 'transporte', '3877'],
    // Restaurante
    [15, 5,'Fornalha Pizzaria',             120.00, 'restaurante', '2913'], // fatura junho
    [20, 5,'Outback Steakhouse (IFD)',      127.03, 'restaurante', '2913'],
    [15, 5,'Pedaço da Pizza',               45.00, 'restaurante', '3877'],
    [25, 5,'Docurinha Doceria',             77.15, 'restaurante', '3877'],
    [22, 5,'MP Chefhannahaur',              20.00, 'restaurante', '3877'],
    [9, 5, 'Uber Rides',                    9.79, 'restaurante', '2913'],
    [5, 5, 'Uber Rides',                    20.38, 'restaurante', '3877'],
    // Lazer
    [7, 5, 'Cinemark Campo Grande',         37.00, 'lazer', '3877'],
    [6, 5, 'Ingresso.com',                  216.20, 'lazer', '2913'],
    // Pessoal Mari
    [20, 5,'Listo *Aura (salão)',           175.00, 'pessoalmari', '3877'],
    [15, 5,'Laureen depilação Mari',        143.00, 'pessoalmari', '3877'], // fatura junho
    // Pessoal Filipe
    [22, 5,'Seu Botelho (cabelo)',          65.00, 'pessoalfilipe', '2913'],
    // Filhos
    [20, 5,'Pri Kids',                      93.90, 'filhos', '3877'],
    // Assinaturas avulsas
    [17, 5,'Apple.com',                     66.90, 'assinaturas', '2913'],
    [19, 5,'Apple.com',                     49.99, 'assinaturas', '3877'],
    [12, 5,'EBN*Canva',                     35.00, 'assinaturas', '2913'],
    // Banco/Juros
    [27, 5,'Tarifa pacote serviços',        32.70, 'bancojuros', ''],
    [4, 5, 'Juros saldo utilizado',         305.05, 'bancojuros', ''],
    [4, 5, 'IOF saldo utilizado',           51.02, 'bancojuros', ''],
    [10, 5,'Seguro cartão MU',              11.46, 'bancojuros', '2913'],
    // Impostos
    [29, 5,'IRPF cota',                     477.53, 'impostos', ''],
    [29, 5,'IPVA carro (SEFAZ MS)',         281.86, 'impostos', ''],
    // Investimentos
    [6, 5, 'TED transferência Grão',        200.00, 'investimentos', ''],
    // Outros
    [6, 5, 'Mercado Livre *Carrosom',       125.57, 'outros', '2913'],
    [5, 5, 'Amazon BR',                     28.49, 'outros', '2913'],
    [27, 5,'Lincolnarildo',                 85.00, 'outros', '2913'],
    [5, 5, 'PIX Loja Electrolux',           16.11, 'outros', ''],
    [29, 5,'PIX Maria Lourdes Conde',       90.00, 'outros', ''],
    [18, 5,'PIX Maria Lourdes Conde',       40.00, 'outros', ''],
    [25, 5,'PIX Valdecir Bernardes',        8.00, 'outros', ''],
    [25, 5,'PIX Laryssa Bernardo',          20.00, 'outros', ''],
    [19, 5,'PIX Francielle Campos',         39.90, 'outros', ''],
    [18, 5,'PIX Marly da Silva',            40.00, 'outros', ''],
    [18, 5,'PIX Beatriz Novaes',            18.00, 'outros', ''],
    [8, 5, 'PIX Daniel Alencar',            120.00, 'outros', ''],
    [8, 5, 'PIX Tania Reis',                50.00, 'outros', ''],
    [6, 5, 'PIX Jessica de Souza',          150.00, 'outros', ''],
    [4, 5, 'PIX Isabela Leticia',           22.50, 'outros', ''],
    // JUNHO — só PIX Bia (resto você lança manualmente)
    [1, 6, 'PIX Bia',                       20.00, 'outros', ''],
  ];

  // Em batches de 400
  for(let i = 0; i < avulsos.length; i += 400){
    const slice = avulsos.slice(i, i + 400);
    const b = writeBatch(db);
    for(const [dia, mes, desc, valor, cat, cartao] of slice){
      const ts = new Date(2026, mes - 1, dia, 12, 0).getTime();
      const ref = doc(collection(db, 'lancamentos'));
      b.set(ref, {
        valor: valor,
        descricao: desc,
        categoriaId: cat,
        cartao: cartao || null,
        ts: ts,
        data: new Date(ts).toISOString(),
        criadoEm: Date.now(),
        origem: 'seed-v28',
      });
    }
    await b.commit();
  }

  // ============== MARCAR COFRE IPVA COMO PAGO ==============
  try {
    const cofresSnap = await getDocs(collection(db, 'cofres'));
    for(const cofreDoc of cofresSnap.docs){
      const data = cofreDoc.data();
      if(data.nome && data.nome.toLowerCase().includes('ipva')){
        await updateDoc(cofreDoc.ref, { atual: data.meta || 1800 });
        break;
      }
    }
  } catch(e){
    console.warn('Cofre IPVA:', e);
  }

  // ============== SALDO INICIAL ==============
  // Saldo Santander em 29/05/26 = -R$ 6.824,18
  await setDoc(doc(db, 'config', 'saldoConta'), {
    valor: -6824.18,
    atualizadoEm: Date.now(),
  });

  // ============== MARCAR SEED EXECUTADO ==============
  await setDoc(flagRef, {
    executadoEm: Date.now(),
  });

  toast('✓ Importação concluída! Aguarde alguns segundos pra sincronizar.');
}
