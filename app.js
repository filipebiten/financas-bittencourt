// ============================================================
// BOLSO · Bittencourt — App Financeiro Familiar
// Stack: Firebase Firestore + Vanilla JS + GitHub Pages
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, collection, addDoc,
  query, where, orderBy, onSnapshot, deleteDoc, updateDoc, getDocs, writeBatch
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// ============================================================
// CONFIGURAÇÃO FIREBASE (do Filipe)
// ============================================================
const firebaseConfig = {
  apiKey: "AIzaSyC6q9FtRdqdvVG4rbKQGfW97hzjagppeao",
  authDomain: "financas-bittencourt.firebaseapp.com",
  projectId: "financas-bittencourt",
  storageBucket: "financas-bittencourt.firebasestorage.app",
  messagingSenderId: "412479098669",
  appId: "1:412479098669:web:572a00f4c938b76dcdcda4"
};

const fbApp = initializeApp(firebaseConfig);
const db = getFirestore(fbApp);

// ============================================================
// AUTENTICAÇÃO — login Google restrito a Filipe e Mari
// ============================================================
const ALLOWED_EMAILS = ['filipebiten@gmail.com', 'mariiperrucine@gmail.com'];
const auth = getAuth(fbApp);
const googleProvider = new GoogleAuthProvider();

// ============================================================
// HISTÓRICO MENSAL (12 meses) — totais por categoria validados
// Fonte: diagnóstico financeiro (planilhas + faturas mai/25–abr/26)
// ============================================================
const HISTORICO_MENSAL = {"2025-05":{"alimentacao":1980,"restaurante":870,"transporte":820,"moradia":2890,"saude":1180,"assinaturas":330,"pessoalmari":410,"pessoalfilipe":180,"comunicacao":300,"seguros":560,"filhos":120,"dizimo":360,"presentes":210,"outros":640},"2025-06":{"alimentacao":2010,"restaurante":910,"transporte":760,"moradia":2890,"saude":1240,"assinaturas":335,"pessoalmari":380,"pessoalfilipe":160,"comunicacao":300,"seguros":560,"filhos":140,"dizimo":360,"presentes":180,"outros":590},"2025-07":{"alimentacao":1890,"restaurante":1020,"transporte":880,"moradia":2890,"saude":1390,"assinaturas":340,"pessoalmari":520,"pessoalfilipe":200,"comunicacao":300,"seguros":560,"filhos":110,"dizimo":360,"presentes":420,"outros":680},"2025-08":{"alimentacao":2120,"restaurante":840,"transporte":790,"moradia":2890,"saude":1290,"assinaturas":330,"pessoalmari":460,"pessoalfilipe":170,"comunicacao":300,"seguros":560,"filhos":130,"dizimo":360,"presentes":160,"outros":720},"2025-09":{"alimentacao":1750,"restaurante":1080,"transporte":920,"moradia":2890,"saude":1450,"assinaturas":340,"pessoalmari":620,"pessoalfilipe":160,"comunicacao":300,"seguros":560,"filhos":180,"dizimo":360,"presentes":240,"outros":690},"2025-10":{"alimentacao":2240,"restaurante":960,"transporte":850,"moradia":2890,"saude":1190,"assinaturas":350,"pessoalmari":510,"pessoalfilipe":160,"comunicacao":300,"seguros":560,"filhos":140,"dizimo":360,"presentes":290,"outros":730},"2025-11":{"alimentacao":1980,"restaurante":1140,"transporte":870,"moradia":2890,"saude":1240,"assinaturas":340,"pessoalmari":480,"pessoalfilipe":160,"comunicacao":300,"seguros":560,"filhos":160,"dizimo":360,"presentes":520,"outros":700},"2025-12":{"alimentacao":2380,"restaurante":1290,"transporte":910,"moradia":2890,"saude":1180,"assinaturas":350,"pessoalmari":560,"pessoalfilipe":190,"comunicacao":300,"seguros":560,"filhos":210,"dizimo":360,"presentes":680,"outros":750},"2026-01":{"alimentacao":2150,"restaurante":1020,"transporte":880,"moradia":2890,"saude":1230,"assinaturas":340,"pessoalmari":620,"pessoalfilipe":180,"comunicacao":300,"seguros":560,"filhos":190,"dizimo":360,"presentes":230,"outros":710},"2026-02":{"alimentacao":2080,"restaurante":960,"transporte":840,"moradia":2890,"saude":1190,"assinaturas":340,"pessoalmari":540,"pessoalfilipe":170,"comunicacao":300,"seguros":560,"filhos":150,"dizimo":360,"presentes":190,"outros":680},"2026-03":{"alimentacao":1970,"restaurante":890,"transporte":810,"moradia":2890,"saude":1170,"assinaturas":340,"pessoalmari":480,"pessoalfilipe":160,"comunicacao":300,"seguros":560,"filhos":140,"dizimo":360,"presentes":170,"outros":650},"2026-04":{"alimentacao":2020,"restaurante":920,"transporte":830,"moradia":2890,"saude":1180,"assinaturas":335,"pessoalmari":510,"pessoalfilipe":165,"comunicacao":300,"seguros":560,"filhos":150,"dizimo":360,"presentes":200,"outros":670}};

const HIST_MESES_LBL = {
  "2025-05":"Mai","2025-06":"Jun","2025-07":"Jul","2025-08":"Ago","2025-09":"Set",
  "2025-10":"Out","2025-11":"Nov","2025-12":"Dez","2026-01":"Jan","2026-02":"Fev",
  "2026-03":"Mar","2026-04":"Abr"
};

let histCategoriaAtiva = 'total'; // 'total' ou id de categoria

// ============================================================
// INVESTIMENTOS — estrutura ARCA + Grão
// Semente da carteira do Filipe (atualizada 06/05/2026)
// ============================================================
const QUAD_INFO = {
  rendaFixa:     { nome: 'Renda Fixa',    cor: '#7c6da8', sq: '🟣' },
  acoesBR:       { nome: 'Ações BR',      cor: '#c4622d', sq: '🟠' },
  fiis:          { nome: 'FIIs',          cor: '#5a7355', sq: '🟢' },
  internacional: { nome: 'Internacional', cor: '#9c3a2a', sq: '🔴' },
};

const INVEST_SEMENTE = {
  rendaFixa: [
    { nome:'Tesouro Selic 2029', valor:377.05 },
    { nome:'NTN-B1 Renda+ 2065', valor:331.10 },
    { nome:'Tesouro Selic 2028', valor:189.17 },
    { nome:'Prefixado 2028',     valor:112.78 },
  ],
  acoesBR: [
    { nome:'BBDC4', valor:429.66 },
    { nome:'SOJA3', valor:281.49 },
    { nome:'CMIG4', valor:170.52 },
  ],
  fiis: [
    { nome:'XPML11',  valor:332.76 },
    { nome:'FIGS11',  valor:306.88 },
    { nome:'BTHF11',  valor:215.28 },
  ],
  internacional: [
    { nome:'Rico Bitcoin Dólar FIM', valor:844.30, cripto:true },
    { nome:'VCLT (Nomad)',           valor:369.08 },
    { nome:'Bitcoin direto (Rico)',  valor:161.16, cripto:true },
    { nome:'Bitcoin (Bitybank)',     valor:146.94, cripto:true },
    { nome:'NVDC34 (BDR NVIDIA)',    valor:40.92 },
  ],
};
const GRAO_SEMENTE = { valor:3429.84, rendimento:429.84 };

let editandoAtivo = null; // {quad, idx}
let editandoCategoria = null; // id da categoria sendo editada (null = nova)
let editandoCofre = null; // id do cofre

// ============================================================
// PREMISSAS DE PROJEÇÃO (médias históricas razoáveis)
// ============================================================
const RENDIMENTOS_ANUAIS = {
  rendaFixa: 0.105,      // ~Selic atual (~10,5%)
  acoesBR: 0.10,         // Ibovespa médio 10 anos
  fiis: 0.10,            // IFIX médio
  internacional: 0.12,   // mix BTC (volátil) + ETFs estáveis, conservador
};
const RENDIMENTO_GRAO = 0.09;   // VGBL Regressivo, mix conservador

// Data de nascimento do Filipe: 10/11/1989 → aposentadoria 10/11/2054
const NASCIMENTO = new Date(1989, 10, 10); // mes=10 = novembro (0-indexed)
const APOSENTADORIA_ANO = 2054;

function idadeHoje(){
  const hoje = new Date();
  let idade = hoje.getFullYear() - NASCIMENTO.getFullYear();
  const m = hoje.getMonth() - NASCIMENTO.getMonth();
  if(m < 0 || (m === 0 && hoje.getDate() < NASCIMENTO.getDate())) idade--;
  return idade;
}
function anosAteAposentadoria(){
  return APOSENTADORIA_ANO - new Date().getFullYear();
}

// ============================================================
// DADOS SEMENTE — extraídos do histórico do Filipe nesse chat
// ============================================================

// Categorias com TETOS do orçamento meta acordado
const CATEGORIAS_SEMENTE = [
  { id: 'moradia',       nome: 'Moradia',           teto: 2526.98, icone: '🏠', ordem: 1,  desc: 'Aluguel R$ 1.851 + IPTU + energia R$ 520 + internet R$ 126 + água R$ 30' },
  { id: 'alimentacao',   nome: 'Alimentação',       teto: 1500,    icone: '🛒', ordem: 2,  desc: 'Compra grande do mês + mercados de semana' },
  { id: 'restaurante',   nome: 'Restaurante/Delivery', teto: 300,  icone: '🍔', ordem: 3,  desc: 'Restaurantes e pedidos' },
  { id: 'transporte',    nome: 'Transporte',        teto: 650,     icone: '⛽', ordem: 4,  desc: 'Combustível + fundo carro' },
  { id: 'comunicacao',   nome: 'Comunicação',       teto: 180,     icone: '📱', ordem: 5,  desc: 'TIM Mari + Filipe' },
  { id: 'seguros',       nome: 'Seguros',           teto: 559,     icone: '🛡️', ordem: 6,  desc: 'Porto + Minas Brasil (auditar)' },
  { id: 'saude',         nome: 'Saúde',             teto: 200,     icone: '💊', ordem: 7,  desc: 'Farmácia (plano de saúde a igreja paga)' },
  { id: 'filhos',        nome: 'Família/Filhos',    teto: 150,     icone: '👶', ordem: 8,  desc: 'Pedrinho e João' },
  { id: 'dizimo',        nome: 'Dízimo/Ofertas',    teto: 780,     icone: '🙏', ordem: 9,  desc: '10% da renda PIB' },
  { id: 'pessoalfilipe', nome: 'Pessoal Filipe',    teto: 60,      icone: '✂️', ordem: 10, desc: 'Cabelo Filipe + Pedro' },
  { id: 'pessoalmari',   nome: 'Pessoal Mari',      teto: 150,     icone: '💄', ordem: 11, desc: 'Salão' },
  { id: 'assinaturas',   nome: 'Assinaturas',       teto: 140,     icone: '📺', ordem: 12, desc: 'Streamings, apps (auditar)' },
  { id: 'presentes',     nome: 'Presentes/Extras',  teto: 150,     icone: '🎁', ordem: 13, desc: 'Aniversários, presentes família' },
  { id: 'investimentos', nome: 'Investimentos',     teto: 400,     icone: '📈', ordem: 14, desc: 'Rico R$200 + Grão R$200' },
  { id: 'outros',        nome: 'Outros',            teto: 0,       icone: '📦', ordem: 99, desc: 'Sem categoria definida' },
];

// Estabelecimentos pré-mapeados (extraídos dos seus extratos e faturas)
const ESTABS_SEMENTE = {
  // Mercado
  'assai': 'alimentacao',
  'assaí': 'alimentacao',
  'legal supermercado': 'alimentacao',
  'legal supermercados': 'alimentacao',
  's pires': 'alimentacao',
  'supermercado pires': 'alimentacao',
  'comper': 'alimentacao',
  'mais q pao': 'alimentacao',
  'evm alimentos': 'alimentacao',
  'mercado': 'alimentacao',
  'supermercado': 'alimentacao',
  'feira': 'alimentacao',
  'padaria': 'alimentacao',
  'açougue': 'alimentacao',
  'acougue': 'alimentacao',

  // Restaurante / Delivery
  'prime churrascaria': 'restaurante',
  'ifd': 'restaurante',
  'ifood': 'restaurante',
  'restaurante': 'restaurante',
  'almoço': 'restaurante',
  'almoco': 'restaurante',
  'janta': 'restaurante',
  'jantar': 'restaurante',
  'lanche': 'restaurante',
  'pizza': 'restaurante',
  'sorvete': 'restaurante',
  'japa': 'restaurante',
  'sushi': 'restaurante',
  'hamburguer': 'restaurante',
  'fornalha': 'restaurante',
  'pizza do bigode': 'restaurante',
  'vermelho beef': 'restaurante',
  'japa lounge': 'restaurante',
  'gauchos': 'restaurante',
  'niura': 'restaurante',
  'kombi do coco': 'restaurante',
  'chiquinho sorvete': 'restaurante',
  'jeronimo': 'restaurante',
  'bolos e cia': 'restaurante',
  'burger king': 'restaurante',
  'tasto forneria': 'restaurante',
  '4krefeicoes': 'restaurante',
  'frever': 'restaurante',
  'dercilia': 'restaurante',
  'doces momentos': 'restaurante',
  'mp *dalesorvetes': 'restaurante',
  'panhead': 'restaurante',

  // Combustível
  'petroleo sao jose': 'transporte',
  'autopostosaojose': 'transporte',
  'auto posto': 'transporte',
  'posto': 'transporte',
  'gasolina': 'transporte',
  'combustivel': 'transporte',
  'estacionamento': 'transporte',
  'pedagio': 'transporte',
  'rede faleiros': 'transporte',
  'uber': 'transporte',
  'campo grande parking': 'transporte',
  'park': 'transporte',

  // Saúde
  'drogasil': 'saude',
  'unimed': 'saude',
  'oticas carol': 'saude',
  'saude livre': 'saude',
  'farmacia': 'saude',
  'farmácia': 'saude',
  'remedio': 'saude',
  'remédio': 'saude',
  'medico': 'saude',
  'médico': 'saude',
  'dentista': 'saude',

  // Pessoal
  'seu botelho': 'pessoalfilipe',
  'aura beleza': 'pessoalmari',
  'mp *espacovaleria': 'pessoalmari',
  'mp *lauureen': 'pessoalmari',
  'mp *laureen': 'pessoalmari',
  'lojasriachuelo': 'pessoalmari',
  'riachuelo': 'pessoalmari',
  'hering': 'pessoalmari',
  'renner': 'pessoalmari',
  'shein': 'pessoalmari',
  'shopee': 'pessoalmari',
  'camicado': 'filhos',
  'pri kids': 'filhos',

  // Assinaturas
  'netflix': 'assinaturas',
  'spotify': 'assinaturas',
  'amazonprimebr': 'assinaturas',
  'amazon prime canais': 'assinaturas',
  'apple com/bill': 'assinaturas',
  'applecombill': 'assinaturas',
  'apple.com': 'assinaturas',
  'google one': 'assinaturas',
  'claude ai': 'assinaturas',
  'claude': 'assinaturas',
  'captions': 'assinaturas',
  'mirage': 'assinaturas',
  'icloud': 'assinaturas',

  // Comunicação
  'tim*': 'comunicacao',
  'tim s/a': 'comunicacao',
  'digital net': 'comunicacao',
  'bmb *digital': 'comunicacao',

  // Moradia
  'energisa': 'moradia',
  'alsol energias': 'moradia',
  'aguas guariroba': 'moradia',
  'condominio': 'moradia',

  // Seguros
  'porto seguro': 'seguros',
  'minas brasil': 'seguros',
  'icatu': 'seguros',

  // Outros
  'amazon br': 'outros',
  'amazon marketplace': 'outros',
  'mercadolivre': 'outros',
};

// ============================================================
// ESTADO
// ============================================================
let state = {
  categorias: [],
  lancamentos: [],
  estabelecimentos: {},
  investimentos: null,
  grao: null,
  bolsosForaArca: [],
  cofres: [],
  recorrencias: [],
  saldoConta: null,
  saldoContaAtualizadoEm: null,
  mes: new Date().getMonth(),
  ano: new Date().getFullYear(),
};

// ============================================================
// UTILS
// ============================================================
const fmt = (v) => 'R$ ' + v.toLocaleString('pt-BR', {minimumFractionDigits:0, maximumFractionDigits:0});
const fmtBig = (v) => v.toLocaleString('pt-BR', {minimumFractionDigits:0, maximumFractionDigits:0});

const MESES_NOMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function diaDoMes(){
  return new Date().getDate();
}
function diasNoMes(){
  return new Date(state.ano, state.mes+1, 0).getDate();
}
function diasAteJulho(){
  const hoje = new Date();
  const julho = new Date(hoje.getFullYear(), 6, 1); // 6 = julho
  if(hoje >= julho){
    // se já passou julho deste ano, próximo julho
    return 0;
  }
  return Math.ceil((julho - hoje) / 86400000);
}

function normaliza(s){
  return (s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
}

function detectaCategoria(descricao){
  const n = normaliza(descricao);
  // primeiro: estabelecimentos salvos pelo usuário
  for(const [k, v] of Object.entries(state.estabelecimentos)){
    if(n.includes(normaliza(k))) return v;
  }
  // depois: estabelecimentos semente
  for(const [k, v] of Object.entries(ESTABS_SEMENTE)){
    if(n.includes(k)) return v;
  }
  return null;
}

// ============================================================
// FIREBASE — INIT, SEED, LISTEN
// ============================================================
async function semeaSeNecessario(){
  // Verifica se já tem categorias no banco
  const catsRef = collection(db, 'categorias');
  const snap = await getDocs(catsRef);
  if(snap.empty){
    console.log('Semeando banco com categorias iniciais...');
    const batch = writeBatch(db);
    for(const cat of CATEGORIAS_SEMENTE){
      const ref = doc(db, 'categorias', cat.id);
      batch.set(ref, cat);
    }
    await batch.commit();
    toast('Bem-vindo! Categorias iniciais criadas.');
  }

  // Semear investimentos
  const invRef = doc(db, 'investimentos', 'carteira');
  const invSnap = await getDoc(invRef);
  if(!invSnap.exists()){
    await setDoc(invRef, {
      arca: INVEST_SEMENTE,
      grao: GRAO_SEMENTE,
      atualizado: '2026-05-06'
    });
  }

  // Semear cofres iniciais (uma vez só)
  const flagRef = doc(db, 'config', 'cofresSemeados');
  const flagSnap = await getDoc(flagRef);
  if(!flagSnap.exists()){
    const cofresIniciais = [
      { nome: 'IPVA carro',         icone: '🚗', meta: 1800, atual: 0, mesAlvo: 1, criadoEm: Date.now() },
      { nome: 'Manutenção do carro', icone: '🛠️', meta: 1800, atual: 0, mesAlvo: 12, criadoEm: Date.now() },
    ];
    const batch2 = writeBatch(db);
    for(const c of cofresIniciais){
      const r = doc(collection(db, 'cofres'));
      batch2.set(r, c);
    }
    batch2.set(flagRef, { semeadoEm: Date.now() });
    await batch2.commit();
  }
}

async function escutaCategorias(){
  const q = query(collection(db, 'categorias'), orderBy('ordem'));
  onSnapshot(q, (snap) => {
    state.categorias = snap.docs.map(d => ({id: d.id, ...d.data()}));
    state.categorias.sort((a,b) => (a.ordem||99) - (b.ordem||99));
    render();
  });
}

let _unsubLancamentos = null;

async function escutaLancamentos(){
  // cancela escuta anterior se houver (re-subscrição ao trocar de mês)
  if(_unsubLancamentos){ _unsubLancamentos(); _unsubLancamentos = null; }

  const ini = new Date(state.ano, state.mes, 1).getTime();
  const fim = new Date(state.ano, state.mes+1, 0, 23,59,59).getTime();
  const q = query(
    collection(db, 'lancamentos'),
    where('ts', '>=', ini),
    where('ts', '<=', fim),
    orderBy('ts', 'desc')
  );
  _unsubLancamentos = onSnapshot(q, (snap) => {
    state.lancamentos = snap.docs.map(d => ({id: d.id, ...d.data()}));
    // atualizar cache do mês visto (Plano A: histórico real soma sobre semente)
    const key = `${state.ano}-${(state.mes+1).toString().padStart(2,'0')}`;
    const totais = {};
    state.lancamentos.forEach(l => {
      const cid = l.categoriaId || 'outros';
      totais[cid] = (totais[cid] || 0) + (l.valor || 0);
    });
    _historicoRealCache[key] = totais;
    render();
    markSync('ok');
  }, (err) => {
    console.error('Erro escutando lançamentos:', err);
    markSync('err');
  });
}

// chamado quando o usuário troca de mês com as setinhas
function mudaMes(delta){
  const novoMes = state.mes + delta;
  let m = novoMes, a = state.ano;
  if(m < 0){ m += 12; a -= 1; }
  if(m > 11){ m -= 12; a += 1; }
  state.mes = m;
  state.ano = a;
  // limpa lançamentos enquanto carrega
  state.lancamentos = [];
  render();
  escutaLancamentos();
}

async function escutaEstabelecimentos(){
  onSnapshot(collection(db, 'estabelecimentos'), (snap) => {
    state.estabelecimentos = {};
    snap.docs.forEach(d => {
      state.estabelecimentos[d.id] = d.data().categoriaId;
    });
  });
}

async function escutaInvestimentos(){
  onSnapshot(doc(db, 'investimentos', 'carteira'), (snap) => {
    if(snap.exists()){
      const d = snap.data();
      state.investimentos = d.arca;
      state.grao = d.grao;
      state.bolsosForaArca = d.bolsosForaArca || [];
      render();
    }
  });
}

async function escutaCofres(){
  const q = query(collection(db, 'cofres'), orderBy('criadoEm', 'desc'));
  onSnapshot(q, (snap) => {
    state.cofres = snap.docs.map(d => ({id: d.id, ...d.data()}));
    render();
  });
}

// ============================================================
// RECORRÊNCIAS — Netflix, aluguel, TIM... aparecem todo mês
// ============================================================
async function escutaRecorrencias(){
  onSnapshot(collection(db, 'recorrencias'), async (snap) => {
    state.recorrencias = snap.docs.map(d => ({id: d.id, ...d.data()}));
    // toda vez que mudar (e na carga inicial), tenta materializar lançamentos do mês corrente
    await materializaRecorrenciasDoMes();
  });
}

// Flag em memória pra evitar reentrada simultânea
let _materializandoAgora = false;

async function materializaRecorrenciasDoMes(){
  if(!state.recorrencias || state.recorrencias.length === 0) return;
  if(_materializandoAgora) return; // evita disparos concorrentes
  _materializandoAgora = true;

  try {
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).getTime();
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth()+1, 0, 23, 59, 59).getTime();

    // 1. Buscar do FIRESTORE (não do state) os lançamentos do mês corrente
    //    que vieram de recorrência. Assim independe de qual mês está aberto na UI.
    const qMes = query(
      collection(db, 'lancamentos'),
      where('ts', '>=', inicioMes),
      where('ts', '<=', fimMes)
    );
    const snapMes = await getDocs(qMes);
    const recIdsJaCriados = new Set();
    snapMes.docs.forEach(d => {
      const data = d.data();
      if(data.recorrenciaId) recIdsJaCriados.add(data.recorrenciaId);
    });

    const batch = writeBatch(db);
    let criados = 0;

    for(const rec of state.recorrencias){
      // Já existe lançamento desta recorrência neste mês? (fonte: Firestore)
      if(recIdsJaCriados.has(rec.id)) continue;

      // checa data inicial — não materializa antes do começo
      const dataInicio = rec.dataInicio ? new Date(rec.dataInicio) : null;
      if(dataInicio && dataInicio > hoje) continue;

      // checa data final — não materializa depois do fim
      const dataFim = rec.dataFim ? new Date(rec.dataFim) : null;
      if(dataFim && hoje > dataFim) continue;

      // dia do mês: pega do rec.diaDoMes ou usa dia 1
      const dia = Math.min(rec.diaDoMes || 1, new Date(hoje.getFullYear(), hoje.getMonth()+1, 0).getDate());
      const dataLanc = new Date(hoje.getFullYear(), hoje.getMonth(), dia, 12, 0);

      const ref = doc(collection(db, 'lancamentos'));
      batch.set(ref, {
        valor: rec.valor,
        descricao: rec.descricao,
        categoriaId: rec.categoriaId,
        cartao: rec.cartao || null,
        ts: dataLanc.getTime(),
        data: dataLanc.toISOString(),
        criadoEm: Date.now(),
        recorrenciaId: rec.id,
        origem: 'recorrencia',
      });
      criados++;
      // marca pra não criar de novo no mesmo loop
      recIdsJaCriados.add(rec.id);
    }
    if(criados > 0){
      await batch.commit();
      toast(`${criados} gasto${criados>1?'s':''} recorrente${criados>1?'s':''} adicionado${criados>1?'s':''} este mês`);
    }
  } catch(err){
    console.error('Erro materializando recorrências:', err);
  } finally {
    _materializandoAgora = false;
  }
}

// ============================================================
// LANÇAMENTOS VIRTUAIS — só pra meses FUTUROS
// Calcula em runtime a partir das recorrências o que vai cair
// naquele mês. Não persiste no Firestore.
// ============================================================
function lancamentosVirtuaisDoMes(ano, mes){
  // ano/mes baseados em state (mes 0-indexed)
  if(!state.recorrencias || state.recorrencias.length === 0) return [];
  const hoje = new Date();
  const mesData = new Date(ano, mes, 1);
  // só gera virtuais pra meses estritamente FUTUROS
  if(mesData.getFullYear() < hoje.getFullYear() ||
     (mesData.getFullYear() === hoje.getFullYear() && mesData.getMonth() <= hoje.getMonth())){
    return [];
  }

  const virtuais = [];
  const ultimoDia = new Date(ano, mes+1, 0).getDate();

  for(const rec of state.recorrencias){
    const ini = rec.dataInicio ? new Date(rec.dataInicio) : null;
    const fim = rec.dataFim ? new Date(rec.dataFim) : null;
    // recorrência deve estar ativa naquele mês
    if(ini && ini > new Date(ano, mes+1, 0, 23, 59)) continue;
    if(fim && fim < new Date(ano, mes, 1)) continue;

    const dia = Math.min(rec.diaDoMes || 1, ultimoDia);
    const ts = new Date(ano, mes, dia, 12, 0).getTime();
    virtuais.push({
      id: `virtual-${rec.id}-${ano}-${mes}`,
      valor: rec.valor,
      descricao: rec.descricao,
      categoriaId: rec.categoriaId,
      cartao: rec.cartao || null,
      ts: ts,
      data: new Date(ts).toISOString(),
      recorrenciaId: rec.id,
      origem: 'virtual',
      virtual: true,
    });
  }
  return virtuais;
}

async function criaRecorrencia({valor, descricao, categoriaId, diaDoMes}){
  await addDoc(collection(db, 'recorrencias'), {
    valor, descricao, categoriaId, diaDoMes,
    dataInicio: new Date().toISOString(),
    criadoEm: Date.now(),
  });
}

async function deletaRecorrencia(id){
  await deleteDoc(doc(db, 'recorrencias', id));
}

// ===== Saldo em conta =====
async function escutaSaldo(){
  onSnapshot(doc(db, 'config', 'saldoConta'), (snap) => {
    if(snap.exists()){
      const d = snap.data();
      state.saldoConta = d.valor;
      state.saldoContaAtualizadoEm = d.atualizadoEm;
      render();
    }
  });
}

async function atualizaSaldo(valor){
  await setDoc(doc(db, 'config', 'saldoConta'), {
    valor: valor,
    atualizadoEm: Date.now(),
  });
}

// ===== CRUD categorias =====
async function criaCategoria({id, nome, icone, teto}){
  const ref = doc(db, 'categorias', id);
  await setDoc(ref, { id, nome, icone, teto, ordem: 50, criadoEm: Date.now() });
}
async function atualizaCategoria(id, dados){
  await updateDoc(doc(db, 'categorias', id), dados);
}
async function deletaCategoriaCompleto(catId, modo){
  // modo: 'moveOutros' ou 'deletaTudo'
  const lancsRef = query(collection(db, 'lancamentos'), where('categoriaId', '==', catId));
  const snap = await getDocs(lancsRef);
  const batch = writeBatch(db);
  snap.docs.forEach(d => {
    if(modo === 'moveOutros'){
      batch.update(d.ref, { categoriaId: 'outros' });
    } else {
      batch.delete(d.ref);
    }
  });
  batch.delete(doc(db, 'categorias', catId));
  await batch.commit();
}
async function contaLancamentosDaCategoria(catId){
  const lancsRef = query(collection(db, 'lancamentos'), where('categoriaId', '==', catId));
  const snap = await getDocs(lancsRef);
  return snap.size;
}

// ===== CRUD ativos investimento =====
async function adicionaAtivo(quad, ativo){
  const inv = JSON.parse(JSON.stringify(state.investimentos));
  if(!inv[quad]) inv[quad] = [];
  inv[quad].push(ativo);
  await updateDoc(doc(db, 'investimentos', 'carteira'), {
    arca: inv,
    atualizado: new Date().toISOString().split('T')[0]
  });
}
async function deletaAtivo(quad, idx){
  const inv = JSON.parse(JSON.stringify(state.investimentos));
  inv[quad].splice(idx, 1);
  await updateDoc(doc(db, 'investimentos', 'carteira'), {
    arca: inv,
    atualizado: new Date().toISOString().split('T')[0]
  });
}

// ===== CRUD cofres =====
async function criaCofre(dados){
  await addDoc(collection(db, 'cofres'), { ...dados, criadoEm: Date.now() });
}
async function atualizaCofre(id, dados){
  await updateDoc(doc(db, 'cofres', id), dados);
}
async function deletaCofre(id){
  await deleteDoc(doc(db, 'cofres', id));
}

async function atualizaAtivo(quad, idx, novoValor){
  const inv = JSON.parse(JSON.stringify(state.investimentos));
  inv[quad][idx].valor = novoValor;
  await updateDoc(doc(db, 'investimentos', 'carteira'), {
    arca: inv,
    atualizado: new Date().toISOString().split('T')[0]
  });
}

async function atualizaGrao(novoValor){
  await updateDoc(doc(db, 'investimentos', 'carteira'), {
    'grao.valor': novoValor,
    atualizado: new Date().toISOString().split('T')[0]
  });
}

async function novoLancamento(valor, descricao, categoriaId, dataIso, parcelas){
  const dataBase = dataIso ? new Date(dataIso + 'T12:00:00') : new Date();
  parcelas = parcelas || 1;

  if(parcelas <= 1){
    await addDoc(collection(db, 'lancamentos'), {
      valor: valor,
      descricao: descricao,
      categoriaId: categoriaId,
      ts: dataBase.getTime(),
      data: dataBase.toISOString(),
      criadoEm: Date.now(),
    });
    return;
  }

  // Regime de caixa: valor informado É o valor da parcela (não o total) —
  // repete o mesmo valor em N lançamentos, um por mês.
  const valorParcela = valor;
  const grupoId = 'p' + Date.now(); // agrupa as parcelas
  const batch = writeBatch(db);

  for(let i = 0; i < parcelas; i++){
    const dataParc = new Date(dataBase);
    dataParc.setMonth(dataParc.getMonth() + i);
    const ref = doc(collection(db, 'lancamentos'));
    batch.set(ref, {
      valor: valorParcela,
      descricao: `${descricao} (${i+1}/${parcelas})`,
      categoriaId: categoriaId,
      ts: dataParc.getTime(),
      data: dataParc.toISOString(),
      criadoEm: Date.now(),
      parcelaGrupo: grupoId,
      parcelaNum: i+1,
      parcelaTotal: parcelas,
    });
  }
  await batch.commit();
}

async function salvaEstabelecimento(descricao, categoriaId){
  // usa a descrição normalizada como chave
  const chave = normaliza(descricao).slice(0, 60);
  await setDoc(doc(db, 'estabelecimentos', chave), {
    nome: descricao,
    categoriaId: categoriaId,
    criadoEm: Date.now(),
  });
}

async function atualizaTeto(catId, novoTeto){
  await updateDoc(doc(db, 'categorias', catId), { teto: novoTeto });
}

async function deletaLancamento(id){
  await deleteDoc(doc(db, 'lancamentos', id));
}

async function atualizaLancamento(id, dados){
  await updateDoc(doc(db, 'lancamentos', id), dados);
}

// ============================================================
// RENDER
// ============================================================
function render(){
  renderHeader();
  renderHoje();
  renderHistorico();
  renderInvestimentos();
  renderCofres();
  renderCategorias();
  renderLancamentos();
  renderFuturo();
}

function renderHeader(){
  document.getElementById('hdrTitle').textContent = `${MESES_NOMES[state.mes]} · ${state.ano}`;
  document.getElementById('hdrSub').textContent = `dia ${diaDoMes()} de ${diasNoMes()}`;
}

function gastoPorCategoria(catId, lista){
  const fonte = lista || state.lancamentos;
  return fonte
    .filter(l => l.categoriaId === catId)
    .reduce((acc, l) => acc + (l.valor||0), 0);
}

function renderHoje(){
  // determinar se mês visto é atual, passado ou futuro PRIMEIRO
  const hoje = new Date();
  const ehAtual = (state.ano === hoje.getFullYear() && state.mes === hoje.getMonth());
  const ehPassado = (state.ano < hoje.getFullYear()) || (state.ano === hoje.getFullYear() && state.mes < hoje.getMonth());
  const ehFuturo = !ehAtual && !ehPassado;

  // Se for mês futuro, junta lançamentos reais (parcelas materializadas)
  // com virtuais (recorrências calculadas em runtime)
  const virtuais = ehFuturo ? lancamentosVirtuaisDoMes(state.ano, state.mes) : [];
  const lancsCombinados = [...state.lancamentos, ...virtuais];

  const tetoTotal = state.categorias.reduce((acc,c) => acc + (c.teto||0), 0);
  // gastoTotal: ignora créditos (valores negativos) — só conta gastos
  const gastoLancamentos = lancsCombinados.reduce((acc,l) => acc + Math.max(0, l.valor||0), 0);
  // soma do "comprometido mensal" dos cofres ativos
  const cofresComprometido = (state.cofres || []).reduce((acc, cofre) => {
    const atual = cofre.atual || 0;
    const meta = cofre.meta || 0;
    if(atual >= meta) return acc; // cofre já cheio: não conta mais
    // calcula mensal igual ao renderCofres
    const hoje = new Date();
    const mesAlvo = parseInt(cofre.mesAlvo) || (hoje.getMonth()+1);
    const anoAlvo = (mesAlvo <= hoje.getMonth()+1) ? hoje.getFullYear()+1 : hoje.getFullYear();
    const dataAlvo = new Date(anoAlvo, mesAlvo-1, 1);
    const mesesRest = Math.max(1, Math.ceil((dataAlvo - hoje) / (1000*60*60*24*30)));
    const mensal = (meta - atual) / mesesRest;
    return acc + mensal;
  }, 0);
  const gastoTotal = gastoLancamentos + cofresComprometido;
  const pct = tetoTotal ? (gastoTotal / tetoTotal) : 0;
  const estourou = gastoTotal > tetoTotal;

  // Termômetro principal
  document.getElementById('gastoMes').textContent = fmtBig(gastoTotal);
  document.getElementById('tetoMes').textContent = fmt(tetoTotal);

  // Linha de cofres
  const elCofresMsg = document.getElementById('thermoCofres');
  if(elCofresMsg){
    if(cofresComprometido > 0){
      document.getElementById('cofresIncluso').textContent = fmt(cofresComprometido);
      elCofresMsg.style.display = '';
    } else {
      elCofresMsg.style.display = 'none';
    }
  }

  // Barra com escala estendida quando estoura
  const fill = document.getElementById('thermoFill');
  const tetoMarker = document.getElementById('thermoTeto');
  const estouroMsg = document.getElementById('thermoEstouro');

  if(estourou){
    // escala estendida: barra mostra até 120% do gasto, teto fica numa posição interna
    const max = gastoTotal * 1.05;
    const fillPct = (gastoTotal / max) * 100;
    const tetoPct = (tetoTotal / max) * 100;
    fill.style.width = fillPct + '%';
    fill.classList.remove('amber','red');
    fill.classList.add('estourou');
    tetoMarker.style.left = tetoPct + '%';
    tetoMarker.classList.add('show');
    estouroMsg.textContent = `Estourou o teto em ${fmt(gastoTotal - tetoTotal)}`;
    estouroMsg.classList.add('show');
  } else {
    fill.style.width = Math.min(100, pct * 100) + '%';
    fill.classList.remove('amber','red','estourou');
    if(pct >= 0.9) fill.classList.add('red');
    else if(pct >= 0.7) fill.classList.add('amber');
    tetoMarker.classList.remove('show');
    estouroMsg.classList.remove('show');
  }

  // Marcador de dia (proporção do mês passada)
  const propDia = diaDoMes() / diasNoMes();
  document.getElementById('thermoMarker').style.left = (propDia * 100) + '%';

  // Projeção: no ritmo atual, fecha em quanto? (só pro mês atual)
  const elRitmo = document.getElementById('ritmoFech');
  const elRitmoLbl = elRitmo.parentElement.querySelector('.foot-lbl');
  if(ehAtual){
    const dia = diaDoMes();
    const total = diasNoMes();
    const projecao = dia > 0 ? (gastoTotal / dia) * total : 0;
    const fechaMaior = projecao > tetoTotal;
    elRitmoLbl.textContent = 'Ritmo do mês';
    elRitmo.textContent = `Fecha em ${fmt(projecao)}`;
    elRitmo.className = 'foot-val ' + (fechaMaior ? 'danger' : 'ok');
  } else if(ehPassado){
    elRitmoLbl.textContent = 'Mês fechado';
    elRitmo.textContent = fmt(gastoTotal);
    elRitmo.className = 'foot-val';
  } else {
    elRitmoLbl.textContent = 'Já agendado';
    elRitmo.textContent = fmt(gastoTotal);
    elRitmo.className = 'foot-val';
  }

  // Disponível
  const falta = tetoTotal - gastoTotal;
  const elDisp = document.getElementById('dispMes');
  elDisp.textContent = falta >= 0 ? fmt(falta) : `−${fmt(Math.abs(falta))}`;
  elDisp.className = 'foot-val ' + (falta < 0 ? 'danger' : 'ok');

  // Marcador do dia: só aparece no mês atual
  document.getElementById('thermoMarker').style.display = ehAtual ? '' : 'none';

  // Label do termômetro
  const thermoLbl = document.getElementById('thermoLabel');
  if(thermoLbl){
    if(ehAtual) thermoLbl.textContent = 'Gastamos este mês';
    else if(ehPassado) thermoLbl.textContent = `Gastamos em ${MESES_NOMES[state.mes].toLowerCase()}`;
    else thermoLbl.textContent = `Já comprometido em ${MESES_NOMES[state.mes].toLowerCase()}`;
  }

  // ============ Saldo dinâmico ============
  // saldoInicial = state.saldoConta (definido no início do mês corrente OU saldo histórico)
  // saldoHoje = saldoInicial + (créditos até hoje) − (gastos até hoje)
  // saldoProjetado = saldoHoje + (créditos restantes do mês) − (gastos restantes do mês)
  //
  // Para o cálculo: usa lançamentos do MÊS ATUAL real (não o mês visto na UI)
  const saldoCard = document.getElementById('saldoCard');
  const saldoVal = document.getElementById('saldoVal');
  const saldoSub = document.getElementById('saldoSub');
  const saldoProj = document.getElementById('saldoProj');

  // só mostra saldo no mês ATUAL — em passado/futuro fica oculto
  if(saldoCard){
    saldoCard.style.display = ehAtual ? '' : 'none';
  }
  if(saldoVal && state.saldoConta !== null && state.saldoConta !== undefined){
    // só calcula se temos saldo inicial
    // SALDO DESACOPLADO (v3.1): o saldo em conta é o valor ANCORADO manualmente
    // (a verdade do banco). NÃO é recalculado pelos lançamentos, porque gasto
    // no cartão não sai da conta até a fatura vencer — recalcular misturava
    // conta e cartão e mostrava um saldo que não existe no banco.
    // O termômetro cuida do gasto do mês; o saldo cuida do dinheiro real.
    // Você reancora tocando no card quando olha o extrato.
    const saldoHoje = state.saldoConta;

    saldoVal.textContent = saldoHoje < 0 ? `−${fmt(Math.abs(saldoHoje))}` : fmt(saldoHoje);
    saldoVal.className = 'saldo-val ' + (saldoHoje < 0 ? 'neg' : 'pos');

    if(saldoSub){
      if(state.saldoContaAtualizadoEm){
        const d = new Date(state.saldoContaAtualizadoEm);
        const hoje = new Date();
        const diffH = Math.floor((hoje - d) / (1000*60*60));
        let quando = '';
        if(diffH < 1) quando = 'agora';
        else if(diffH < 24) quando = `há ${diffH}h`;
        else quando = `há ${Math.floor(diffH/24)}d`;
        saldoSub.textContent = `base atualizada ${quando} · toque pra redefinir`;
      } else {
        saldoSub.textContent = 'toque pra redefinir';
      }
    }

    // projeção automática removida (v3.1): misturava conta e cartão. Oculta a linha.
    if(saldoProj){
      const projRow = saldoProj.closest('.saldo-proj-row');
      if(projRow) projRow.style.display = 'none';
    }
  } else if(saldoVal){
    saldoVal.textContent = '—';
    saldoVal.className = 'saldo-val';
    if(saldoSub) saldoSub.textContent = 'toque pra adicionar';
    if(saldoProj) saldoProj.textContent = '—';
  }

  // Navegação por mês — atualiza centro
  const navTitle = document.getElementById('mesNavTitle');
  const navSub = document.getElementById('mesNavSub');
  const navCenter = navTitle ? navTitle.parentElement : null;
  if(navTitle){
    navTitle.textContent = `${MESES_NOMES[state.mes]} · ${state.ano}`;
    navSub.textContent = ehAtual ? 'mês atual' : (ehPassado ? 'mês passado' : 'mês futuro');
    if(navCenter){
      navCenter.classList.remove('futuro','passado');
      if(ehFuturo) navCenter.classList.add('futuro');
      if(ehPassado) navCenter.classList.add('passado');
    }
  }

  // Aviso julho — só no mês atual e se estiver chegando
  const warn = document.getElementById('warnJulho');
  if(warn){
    const dias = diasAteJulho();
    document.getElementById('diasJulho').textContent = dias;
    warn.style.display = (ehAtual && dias > 0 && dias <= 90) ? '' : 'none';
  }

  // Lista categorias com drop-down
  const list = document.getElementById('catsList');
  list.innerHTML = '';
  state.categorias.forEach(cat => {
    const gasto = gastoPorCategoria(cat.id, lancsCombinados);
    const teto = cat.teto || 0;
    const p = teto ? gasto / teto : 0;
    let cls = 'g', clsFill = '';
    if(p >= 0.9){ cls = 'r'; clsFill = 'r'; }
    else if(p >= 0.7){ cls = 'a'; clsFill = 'a'; }

    // lançamentos desta categoria neste mês (combinados se for futuro)
    const lancsCat = lancsCombinados
      .filter(l => (l.categoriaId || 'outros') === cat.id)
      .sort((a,b) => (b.ts||0) - (a.ts||0));

    const el = document.createElement('div');
    el.className = 'cat';
    el.innerHTML = `
      <div class="cat-left">
        <div class="cat-name"><span class="cat-dot ${cls}"></span>${cat.icone||''} ${cat.nome}<span class="cat-chevron">›</span></div>
        <div class="cat-bar"><div class="cat-bar-fill ${clsFill}" style="width:${Math.min(100,p*100)}%"></div></div>
      </div>
      <div class="cat-right">
        <div class="cat-spent">${fmt(gasto)}</div>
        <div class="cat-of">de ${fmt(teto)}</div>
      </div>
      <div class="cat-lancs">
        ${lancsCat.length === 0
          ? `<div class="cat-lanc-empty">Nenhum lançamento nesta categoria</div>`
          : lancsCat.map(l => {
              const d = new Date(l.ts);
              const dataLbl = `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}`;
              const ehCredito = (l.valor||0) < 0;
              const valStr = ehCredito ? `+${fmt(Math.abs(l.valor))}` : fmt(l.valor||0);
              const cartaoTxt = l.cartao ? ` · ••${l.cartao}` : '';
              const ehVirtual = l.virtual === true;
              const tagRec = (l.origem === 'recorrencia' && !ehVirtual) ? ' <span class="lanc-recur-tag">🔁</span>' : '';
              const tagCred = ehCredito ? ' <span class="lanc-credito-tag">crédito</span>' : '';
              const tagVirt = ehVirtual ? ' <span class="lanc-virtual-tag">futuro</span>' : '';
              const itemCls = 'cat-lanc-item' + (ehVirtual ? ' virtual' : '');
              return `
                <div class="${itemCls}" data-id="${l.id}">
                  <span class="lanc-desc"><span class="lanc-data">${dataLbl}</span>${l.descricao||'—'}${cartaoTxt}${tagRec}${tagCred}${tagVirt}</span>
                  <span class="lanc-val ${ehCredito?'credito':''}">${valStr}</span>
                </div>
              `;
            }).join('')
        }
      </div>
    `;

    // toggle ao tocar (mas não nos lançamentos internos)
    el.addEventListener('click', (e) => {
      const lancEl = e.target.closest('.cat-lanc-item');
      if(lancEl){
        const lancId = lancEl.dataset.id;
        // procura primeiro nos reais, depois nos virtuais
        const lanc = state.lancamentos.find(x => x.id === lancId)
                  || virtuais.find(x => x.id === lancId);
        if(lanc){
          if(lanc.virtual){
            abreModalVirtual(lanc);
          } else {
            abreModalEditarLanc(lanc);
          }
        }
        return;
      }
      el.classList.toggle('expanded');
    });

    list.appendChild(el);
  });
}

// ============================================================
// HISTÓRICO MESCLADO — semente (passado fechado) + lançamentos reais (presente)
// Plano A: histórico semente cobre mai/25 → abr/26;
// meses a partir de mai/26 vêm dos lançamentos reais.
// ============================================================
async function buscaLancamentosDeUmMes(ano, mes){
  // mes 1-based
  const ini = new Date(ano, mes-1, 1).getTime();
  const fim = new Date(ano, mes, 0, 23, 59, 59).getTime();
  const q = query(
    collection(db, 'lancamentos'),
    where('ts', '>=', ini),
    where('ts', '<=', fim)
  );
  const snap = await getDocs(q);
  const totaisPorCat = {};
  snap.docs.forEach(d => {
    const l = d.data();
    totaisPorCat[l.categoriaId] = (totaisPorCat[l.categoriaId]||0) + (l.valor||0);
  });
  return totaisPorCat;
}

// cache em memória dos meses reais já buscados
const _historicoRealCache = {};

async function carregaHistoricoRealNovo(){
  // pra cada mês desde mai/26 até o mês atual, popula cache
  const inicio = new Date(2026, 4, 1); // maio/26 (mes index 4)
  const hoje = new Date();
  let cursor = new Date(inicio);
  while(cursor <= hoje){
    const key = `${cursor.getFullYear()}-${(cursor.getMonth()+1).toString().padStart(2,'0')}`;
    if(!(key in _historicoRealCache)){
      _historicoRealCache[key] = await buscaLancamentosDeUmMes(cursor.getFullYear(), cursor.getMonth()+1);
    }
    cursor.setMonth(cursor.getMonth()+1);
  }
}

function historicoMesclado(){
  // base: histórico semente (passado fechado)
  const out = { ...HISTORICO_MENSAL };
  // adiciona meses reais (cache)
  for(const [k, dados] of Object.entries(_historicoRealCache)){
    if(Object.keys(dados).length > 0){
      out[k] = dados;
    }
  }
  return out;
}

function renderHistorico(){
  const histTotal = historicoMesclado();
  const meses = Object.keys(histTotal).sort();
  if(meses.length === 0) return;

  // série conforme categoria ativa
  const serie = meses.map(m => {
    if(histCategoriaAtiva === 'total'){
      return Object.values(histTotal[m]).reduce((a,b)=>a+b,0);
    }
    return histTotal[m][histCategoriaAtiva] || 0;
  });

  // popula o select de mês ANTES de ler o selecionado
  const mesSel = document.getElementById('mesSelect');
  let selecionado = mesSel ? mesSel.value : '';
  if(mesSel && state.categorias.length){
    const valAntes = mesSel.value;
    mesSel.innerHTML = meses.slice().reverse().map(m => {
      const [a,mm] = m.split('-');
      return `<option value="${m}">${MESES_NOMES[parseInt(mm)-1]} · ${a}</option>`;
    }).join('');
    if(valAntes && meses.includes(valAntes)){
      mesSel.value = valAntes;
      selecionado = valAntes;
    } else {
      // default = mês mais recente do histórico
      mesSel.value = meses[meses.length-1];
      selecionado = meses[meses.length-1];
    }
    // handler do change: re-renderiza o histórico inteiro pra atualizar gráfico + número + tendência + detalhe
    mesSel.onchange = () => renderHistorico();
  }

  // índice do mês selecionado na série
  const idxSel = selecionado ? meses.indexOf(selecionado) : meses.length-1;
  const idxValido = idxSel >= 0 ? idxSel : meses.length-1;

  // número grande = valor do mês SELECIONADO
  const valorMes = serie[idxValido];
  const elBig = document.getElementById('chartBigVal');
  if(elBig) elBig.textContent = fmt(valorMes);

  // label do "Total mensal" mostra o mês escolhido
  const elChartLbl = document.querySelector('.chart-lbl');
  if(elChartLbl){
    const [a, mm] = (meses[idxValido] || meses[meses.length-1]).split('-');
    elChartLbl.textContent = `${MESES_NOMES[parseInt(mm)-1]} · ${a}`;
  }

  // tendência = mês selecionado vs anterior
  const elTrend = document.getElementById('chartTrend');
  if(elTrend){
    if(idxValido === 0){
      elTrend.style.display = 'none';
    } else {
      elTrend.style.display = '';
      const ant = serie[idxValido-1];
      const delta = valorMes - ant;
      const pct = ant ? Math.round((delta/ant)*100) : 0;
      elTrend.className = 'chart-trend ' + (delta > 0 ? 'up' : 'down');
      elTrend.textContent = (delta > 0 ? '↑ ' : '↓ ') + Math.abs(pct) + '% vs mês anterior';
    }
  }

  // desenhar linha SVG + ponto destacado no mês SELECIONADO
  const svg = document.getElementById('lineChart');
  if(svg){
    const W = 320, H = 140, pad = 8;
    const max = Math.max(...serie) * 1.1;
    const min = Math.min(...serie) * 0.9;
    const range = max - min || 1;
    const pts = serie.map((v,i) => {
      const x = pad + (i/(serie.length-1 || 1)) * (W - pad*2);
      const y = H - pad - ((v-min)/range) * (H - pad*2);
      return [x, y];
    });
    const linePath = pts.map((p,i) => (i===0?'M':'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
    const areaPath = linePath + ` L${pts[pts.length-1][0].toFixed(1)},${H-pad} L${pts[0][0].toFixed(1)},${H-pad} Z`;

    // todos os pontos pequenos + ponto grande no selecionado
    const pontos = pts.map((p,i) => {
      if(i === idxValido){
        // grande destacado
        return `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="6" fill="#1f1b16" stroke="#f4efe7" stroke-width="3"/>`;
      }
      return `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2.5" fill="#c4622d" opacity="0.5"/>`;
    }).join('');

    svg.innerHTML = `
      <defs>
        <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#c4622d" stop-opacity="0.18"/>
          <stop offset="100%" stop-color="#c4622d" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path d="${areaPath}" fill="url(#grad)"/>
      <path d="${linePath}" fill="none" stroke="#c4622d" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      ${pontos}
    `;
  }

  // labels X
  const elX = document.getElementById('chartXLabels');
  if(elX){
    const lblMes = (m) => {
      if(HIST_MESES_LBL[m]) return HIST_MESES_LBL[m];
      const [a, mm] = m.split('-');
      return MESES_NOMES[parseInt(mm)-1].slice(0,3);
    };
    const step = Math.max(1, Math.floor(meses.length/6));
    elX.innerHTML = meses.map((m,i) =>
      (i % step === 0) ? `<span>${lblMes(m)}</span>` : `<span></span>`
    ).join('');
  }

  // chips de categoria
  const chips = document.getElementById('catChips');
  if(chips && state.categorias.length){
    const cats = [{id:'total',nome:'Total',icone:''}].concat(
      state.categorias.filter(c => c.id !== 'outros')
    );
    chips.innerHTML = cats.map(c =>
      `<button class="chip ${histCategoriaAtiva===c.id?'active':''}" data-cat="${c.id}">${c.icone||''} ${c.nome}</button>`
    ).join('');
    chips.querySelectorAll('.chip').forEach(ch => {
      ch.onclick = () => { histCategoriaAtiva = ch.dataset.cat; renderHistorico(); };
    });
  }

  // detalhamento do mês selecionado
  if(selecionado) renderMesDetalhe(selecionado);

  // comparativo: média 12m vs teto
  const cmp = document.getElementById('compareList');
  if(cmp && state.categorias.length){
    const itens = state.categorias.filter(c => c.id !== 'outros' && c.id !== 'moradia').map(cat => {
      const vals = meses.map(m => histTotal[m][cat.id] || 0);
      const media = vals.reduce((a,b)=>a+b,0) / vals.length;
      const teto = cat.teto || 0;
      return { cat, media, teto };
    });
    const maxRef = Math.max(...itens.map(i => Math.max(i.media, i.teto)), 1);
    cmp.innerHTML = itens.map(({cat, media, teto}) => {
      const delta = media - teto;
      const pctH = (media/maxRef)*100;
      const pctM = (teto/maxRef)*100;
      let deltaCls = 'same', deltaTxt = 'mantém';
      if(delta > 20){ deltaCls = 'cut'; deltaTxt = `−${fmt(delta)}`; }
      else if(delta < -20){ deltaCls = 'same'; deltaTxt = `+${fmt(Math.abs(delta))}`; }
      return `
        <div class="cmp">
          <div class="cmp-top">
            <span class="cmp-name">${cat.icone||''} ${cat.nome}</span>
            <span class="cmp-delta ${deltaCls}">${deltaTxt}</span>
          </div>
          <div class="cmp-bars">
            <div class="cmp-bar-row">
              <span class="cmp-bar-lbl">Hoje</span>
              <div class="cmp-bar-track"><div class="cmp-bar-fill hoje" style="width:${pctH}%"></div></div>
              <span class="cmp-vals"><strong>${fmt(media)}</strong></span>
            </div>
            <div class="cmp-bar-row">
              <span class="cmp-bar-lbl">Meta</span>
              <div class="cmp-bar-track"><div class="cmp-bar-fill meta" style="width:${pctM}%"></div></div>
              <span class="cmp-vals"><strong>${fmt(teto)}</strong></span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }
}

function renderInvestimentos(){
  if(!state.investimentos) return;
  const inv = state.investimentos;

  // totais por quadrante
  const totais = {};
  let totalArca = 0;
  for(const q of Object.keys(QUAD_INFO)){
    totais[q] = (inv[q]||[]).reduce((a,x)=>a+(x.valor||0),0);
    totalArca += totais[q];
  }
  const grao = state.grao ? state.grao.valor : 0;
  const bolsos = state.bolsosForaArca || [];
  const totalBolsos = bolsos.reduce((a,x)=>a+(x.valor||0),0);
  const patrimonio = totalArca + grao + totalBolsos;

  // patrimônio
  setTxt('patrimTotal', fmt(patrimonio));
  setTxt('patrimArca', fmt(totalArca));
  setTxt('patrimGrao', fmt(grao));
  setTxt('arcaTotal', fmt(totalArca));

  // bolsos fora do ARCA (mesmo título, finalidades diferentes — exibidos separados)
  const bolsosList = document.getElementById('bolsosForaArcaList');
  if(bolsosList){
    const bolsosSection = bolsosList.closest('.bolsos-fora-arca');
    if(bolsos.length === 0){
      if(bolsosSection) bolsosSection.style.display = 'none';
    } else {
      if(bolsosSection) bolsosSection.style.display = '';
      const esc = s => String(s??'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
      bolsosList.innerHTML = bolsos.map(b => `
        <div class="bolso-item">
          <div class="bolso-titulo">${esc(b.titulo)}</div>
          <div class="bolso-finalidade">${esc(b.finalidade)}</div>
          <div class="bolso-valor">${fmt(b.valor)}</div>
        </div>
      `).join('');
    }
  }

  // donut SVG
  const donut = document.getElementById('arcaDonut');
  if(donut && totalArca > 0){
    const cx=100, cy=100, r=72, sw=26;
    let ang = -90;
    let paths = '';
    for(const q of Object.keys(QUAD_INFO)){
      const frac = totais[q]/totalArca;
      const sweep = frac * 360;
      const a1 = ang * Math.PI/180;
      const a2 = (ang+sweep) * Math.PI/180;
      const x1 = cx + r*Math.cos(a1), y1 = cy + r*Math.sin(a1);
      const x2 = cx + r*Math.cos(a2), y2 = cy + r*Math.sin(a2);
      const large = sweep > 180 ? 1 : 0;
      paths += `<path d="M${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 ${large} 1 ${x2.toFixed(2)},${y2.toFixed(2)}" fill="none" stroke="${QUAD_INFO[q].cor}" stroke-width="${sw}"/>`;
      ang += sweep;
    }
    // marca dos 25% (linha de alvo em cada quarto) — sutil
    donut.innerHTML = paths;
  }

  // lista quadrantes
  const alvo = totalArca/4;
  const ql = document.getElementById('quadList');
  if(ql){
    ql.innerHTML = Object.keys(QUAD_INFO).map(q => {
      const v = totais[q];
      const pct = totalArca ? (v/totalArca*100) : 0;
      const info = QUAD_INFO[q];
      const desvio = v - alvo;
      const acima = desvio > 0;
      return `
        <div class="quad">
          <div class="quad-top">
            <span class="quad-name"><span class="quad-sq" style="background:${info.cor}"></span>${info.nome}</span>
            <span class="quad-pct" style="color:${info.cor}">${pct.toFixed(1)}%</span>
          </div>
          <div class="quad-bar">
            <div class="quad-bar-fill" style="width:${Math.min(100,pct)}%;background:${info.cor}"></div>
            <div class="quad-bar-target"></div>
          </div>
          <div class="quad-foot">
            <span class="v">${fmt(v)}</span>
            <span>${acima ? 'acima' : 'abaixo'} do alvo · ${acima?'+':'−'}${fmt(Math.abs(desvio))}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // recomendação de aporte: quadrante mais abaixo do alvo
  let menorQ = null, menorPct = Infinity;
  for(const q of Object.keys(QUAD_INFO)){
    const pct = totalArca ? totais[q]/totalArca : 0;
    if(pct < menorPct){ menorPct = pct; menorQ = q; }
  }
  const reco = document.getElementById('recoAporte');
  if(reco && menorQ){
    reco.innerHTML = `
      <div class="reco-mark">➜</div>
      <div>
        <div class="reco-title">Próximo aporte: ${QUAD_INFO[menorQ].nome}</div>
        <div class="reco-text">É o quadrante mais distante dos 25% (${(menorPct*100).toFixed(1)}%). Pela lógica ARCA, o dinheiro novo vai pra cá. Dentro dele, compre o ativo que mais caiu entre os fundamentalmente bons.</div>
      </div>
    `;
  }

  // alerta concentração BTC
  const cripto = (inv.internacional||[]).filter(x=>x.cripto).reduce((a,x)=>a+x.valor,0);
  const totalInt = totais.internacional;
  const alertEl = document.getElementById('alertBtc');
  if(alertEl && totalInt > 0){
    const pctCripto = cripto/totalInt*100;
    if(pctCripto > 50){
      alertEl.style.display = 'flex';
      alertEl.innerHTML = `
        <div class="alert-btc-mark">!</div>
        <div>
          <div class="alert-btc-title">Bitcoin é ${pctCripto.toFixed(0)}% do Internacional</div>
          <div class="alert-btc-text">${fmt(cripto)} de ${fmt(totalInt)} em cripto. Concentração alta — o VCLT na Nomad ajuda a diluir. Considere reforçar renda fixa internacional nos próximos aportes ao quadrante.</div>
        </div>
      `;
    } else {
      alertEl.style.display = 'none';
    }
  }

  // lista de ativos editáveis
  const al = document.getElementById('ativosList');
  if(al){
    let html = '';
    for(const q of Object.keys(QUAD_INFO)){
      (inv[q]||[]).forEach((ativo, idx) => {
        html += `
          <div class="ativo" data-quad="${q}" data-idx="${idx}">
            <div class="ativo-left">
              <span class="ativo-sq" style="background:${QUAD_INFO[q].cor}"></span>
              <span class="ativo-nome">${ativo.nome}</span>
            </div>
            <span class="ativo-val">${fmt(ativo.valor)}</span>
          </div>
        `;
      });
    }
    al.innerHTML = html;
    al.querySelectorAll('.ativo').forEach(el => {
      el.onclick = () => abreModalAtivo(el.dataset.quad, parseInt(el.dataset.idx));
    });
    setupLongPressAtivos();
  }

  // Grão
  const gc = document.getElementById('graoCard');
  if(gc && state.grao){
    gc.innerHTML = `
      <div class="grao-lbl">Posição atual</div>
      <div class="grao-pos">${fmt(state.grao.valor)}</div>
      <div class="grao-rend">+ ${fmt(state.grao.rendimento||0)} de rendimento</div>
      <button class="grao-edit-btn" id="btnEditGrao">Atualizar posição</button>
    `;
    const btn = document.getElementById('btnEditGrao');
    if(btn) btn.onclick = abreModalGrao;
  }
}

function setTxt(id, txt){
  const el = document.getElementById(id);
  if(el) el.textContent = txt;
}

function abreModalAtivo(quad, idx){
  editandoAtivo = {quad, idx, tipo:'ativo'};
  const ativo = state.investimentos[quad][idx];
  document.getElementById('ativoNome').textContent = ativo.nome;
  document.getElementById('ativoValor').value = ativo.valor.toString().replace('.', ',');
  document.getElementById('btnExcluirAtivo').classList.remove('hidden');
  document.getElementById('modalAtivo').classList.remove('hidden');
}

function abreModalGrao(){
  editandoAtivo = {tipo:'grao'};
  document.getElementById('ativoNome').textContent = 'Grão · Previdência';
  document.getElementById('ativoValor').value = state.grao.valor.toString().replace('.', ',');
  document.getElementById('btnExcluirAtivo').classList.add('hidden');
  document.getElementById('modalAtivo').classList.remove('hidden');
}

function renderMesDetalhe(mesKey){
  const det = document.getElementById('mesDetalhe');
  const histTotal = historicoMesclado();
  if(!det || !histTotal[mesKey]) return;
  const dados = histTotal[mesKey];
  const total = Object.values(dados).reduce((a,b)=>a+b,0);

  // ordena categorias por valor desc
  const linhas = Object.entries(dados)
    .map(([catId, val]) => {
      const cat = state.categorias.find(c => c.id === catId);
      return { nome: cat ? `${cat.icone||''} ${cat.nome}` : catId, val };
    })
    .filter(x => x.val > 0)
    .sort((a,b) => b.val - a.val);

  det.innerHTML = linhas.map(l => `
    <div class="mes-cat">
      <span class="mes-cat-name">${l.nome}</span>
      <span class="mes-cat-val">${fmt(l.val)}</span>
    </div>
  `).join('') + `
    <div class="mes-cat mes-cat-total">
      <span class="mes-cat-name">Total do mês</span>
      <span class="mes-cat-val">${fmt(total)}</span>
    </div>
  `;
}

function renderCategorias(){
  const tetoTotal = state.categorias.reduce((acc,c) => acc + (c.teto||0), 0);
  document.getElementById('totalTetos').textContent = fmt(tetoTotal);
  const renda = 7804.93;
  const folga = renda - tetoTotal;
  const elFolga = document.getElementById('folgaMes');
  elFolga.textContent = folga >= 0 ? fmt(folga) : `−${fmt(Math.abs(folga))}`;
  elFolga.style.color = folga >= 0 ? '#a87f3e' : '#eccfc7';

  const box = document.getElementById('catsEdit');
  box.innerHTML = '';
  state.categorias.forEach(cat => {
    const el = document.createElement('div');
    el.className = 'cat-edit';
    el.innerHTML = `
      <div class="cat-edit-name">${cat.icone||''} ${cat.nome}</div>
      <div class="cat-edit-teto">${fmt(cat.teto||0)}</div>
    `;
    el.onclick = () => abreModalCategoria(cat.id);
    box.appendChild(el);
  });

  // popula selects dos modais também
  popularSelect('inpCat');
  popularSelect('aprendeCat');
}

function popularSelect(id){
  const sel = document.getElementById(id);
  if(!sel) return;
  const atual = sel.value;
  sel.innerHTML = '';
  state.categorias.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = `${c.icone||''} ${c.nome}`;
    sel.appendChild(opt);
  });
  if(atual) sel.value = atual;
}

function renderLancamentos(){
  const box = document.getElementById('lancsList');

  // Se for mês futuro, junta lançamentos virtuais
  const hoje = new Date();
  const ehAtualOuPassado = (state.ano < hoje.getFullYear()) ||
    (state.ano === hoje.getFullYear() && state.mes <= hoje.getMonth());
  const ehFuturo = !ehAtualOuPassado;
  const virtuais = ehFuturo ? lancamentosVirtuaisDoMes(state.ano, state.mes) : [];
  const todos = [...state.lancamentos, ...virtuais].sort((a,b) => (b.ts||0) - (a.ts||0));

  if(todos.length === 0){
    box.innerHTML = '<div class="empty">Nenhum lançamento ainda este mês.</div>';
    return;
  }
  box.innerHTML = '';
  todos.forEach(l => {
    const cat = state.categorias.find(c => c.id === l.categoriaId);
    const data = new Date(l.ts);
    const dia = data.getDate().toString().padStart(2,'0');
    const mes = (data.getMonth()+1).toString().padStart(2,'0');
    const ehRecorrente = l.origem === 'recorrencia';
    const ehVirtual = l.virtual === true;
    const ehCredito = (l.valor||0) < 0;
    const tagRecur = (ehRecorrente && !ehVirtual) ? '<span class="lanc-recur-tag">🔁 mensal</span>' : '';
    const tagVirt = ehVirtual ? '<span class="lanc-virtual-tag">futuro</span>' : '';
    const tagCred = ehCredito ? '<span class="lanc-credito-tag">crédito</span>' : '';
    const valStr = ehCredito ? `+${fmt(Math.abs(l.valor))}` : fmt(l.valor||0);
    const el = document.createElement('div');
    el.className = 'lanc' + (ehVirtual ? ' virtual' : '');
    el.innerHTML = `
      <div class="lanc-left">
        <div class="lanc-desc">${l.descricao || '—'} ${tagRecur}${tagVirt}${tagCred}</div>
        <div class="lanc-meta">${dia}/${mes} · ${cat ? (cat.icone||'') + ' ' + cat.nome : 'Sem categoria'}</div>
      </div>
      <div class="lanc-val ${ehCredito?'credito':''}">${valStr}</div>
    `;
    el.onclick = () => {
      if(ehVirtual) abreModalVirtual(l);
      else abreModalEditarLanc(l);
    };
    box.appendChild(el);
  });
}

let _editandoLanc = null;

function abreModalEditarLanc(l){
  _editandoLanc = l;
  const ehRec = l.origem === 'recorrencia';
  const ehCredito = (l.valor||0) < 0;

  document.getElementById('editValor').value = (Math.abs(l.valor||0)).toFixed(2).replace('.', ',');
  document.getElementById('editDesc').value = l.descricao || '';

  // popular categorias
  const selCat = document.getElementById('editCat');
  selCat.innerHTML = state.categorias.map(c =>
    `<option value="${c.id}">${c.icone||''} ${c.nome}</option>`
  ).join('');
  selCat.value = l.categoriaId || 'outros';

  // data
  const d = new Date(l.ts);
  document.getElementById('editData').value = d.toISOString().split('T')[0];

  // cartão
  document.getElementById('editCartao').value = l.cartao || '';

  // toggle gasto/crédito pré-selecionado
  document.querySelectorAll('[data-tipo-edit]').forEach(el => {
    const isCredito = el.dataset.tipoEdit === 'credito';
    el.classList.toggle('sel', isCredito === ehCredito);
  });

  // botão de excluir recorrência só aparece se for recorrente
  const btnRec = document.getElementById('btnExcluirRecorrencia');
  if(ehRec && l.recorrenciaId){
    btnRec.classList.remove('hidden');
  } else {
    btnRec.classList.add('hidden');
  }

  document.getElementById('modalEditarLanc').classList.remove('hidden');
}

function bindModalEditarLanc(){
  // toggle gasto/crédito
  document.querySelectorAll('[data-tipo-edit]').forEach(opt => {
    opt.onclick = () => {
      document.querySelectorAll('[data-tipo-edit]').forEach(o => o.classList.remove('sel'));
      opt.classList.add('sel');
    };
  });

  document.getElementById('btnSalvarEdit').onclick = async () => {
    if(!_editandoLanc) return;
    const valor = parseFloat(document.getElementById('editValor').value.replace(',', '.'));
    const desc = document.getElementById('editDesc').value.trim();
    const cat = document.getElementById('editCat').value;
    const dataStr = document.getElementById('editData').value;
    const cartao = document.getElementById('editCartao').value || null;
    if(isNaN(valor) || !desc){
      toast('Valor e descrição obrigatórios');
      return;
    }
    // usa toggle pra determinar sinal
    const tipoSel = document.querySelector('[data-tipo-edit].sel');
    const ehCredito = tipoSel && tipoSel.dataset.tipoEdit === 'credito';
    const valorFinal = ehCredito ? -Math.abs(valor) : Math.abs(valor);
    const ts = new Date(dataStr + 'T12:00:00').getTime();
    await atualizaLancamento(_editandoLanc.id, {
      valor: valorFinal,
      descricao: desc,
      categoriaId: cat,
      ts: ts,
      data: new Date(ts).toISOString(),
      cartao: cartao,
    });
    fechaModais();
    toast('Lançamento atualizado');
  };

  document.getElementById('btnExcluirLanc').onclick = async () => {
    if(!_editandoLanc) return;
    if(!confirm(`Excluir "${_editandoLanc.descricao}" (${fmt(Math.abs(_editandoLanc.valor))})?`)) return;
    await deletaLancamento(_editandoLanc.id);
    fechaModais();
    toast('Lançamento excluído');
  };

  document.getElementById('btnExcluirRecorrencia').onclick = async () => {
    if(!_editandoLanc || !_editandoLanc.recorrenciaId) return;
    if(!confirm(`Excluir este lançamento E cancelar a recorrência "${_editandoLanc.descricao}"? Não aparecerá mais nos próximos meses.`)) return;
    await Promise.all([
      deletaLancamento(_editandoLanc.id),
      deletaRecorrencia(_editandoLanc.recorrenciaId)
    ]);
    fechaModais();
    toast('Recorrência cancelada');
  };
}

// ============================================================
// MODAL VIRTUAL — lançamento previsto (futuro)
// ============================================================
let _virtualLanc = null;

function abreModalVirtual(l){
  _virtualLanc = l;
  const rec = state.recorrencias.find(r => r.id === l.recorrenciaId);
  const nome = rec ? rec.descricao : l.descricao;
  const valorTxt = (l.valor||0) < 0 ? `+${fmt(Math.abs(l.valor))} (crédito)` : fmt(l.valor||0);
  const d = new Date(l.ts);
  const dataLbl = `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}`;
  document.getElementById('virtualText').innerHTML =
    `<strong>${nome}</strong> de <strong>${valorTxt}</strong> previsto pra <strong>${dataLbl}</strong>.`;
  document.getElementById('modalVirtual').classList.remove('hidden');
}

function bindModalVirtual(){
  document.getElementById('btnIrRecorrencia').onclick = () => {
    if(!_virtualLanc) return;
    const rec = state.recorrencias.find(r => r.id === _virtualLanc.recorrenciaId);
    if(rec){
      document.getElementById('modalVirtual').classList.add('hidden');
      abreModalEditarRec(rec);
    } else {
      toast('Recorrência não encontrada');
    }
  };
}

// ============================================================
// MODAL EDITAR RECORRÊNCIA
// ============================================================
let _editandoRec = null;

function abreModalEditarRec(rec){
  _editandoRec = rec;
  const ehCredito = (rec.valor||0) < 0;
  document.getElementById('recTitle').textContent =
    `${ehCredito ? '💰' : '🔁'} ${rec.descricao}`;
  document.getElementById('recValor').value = Math.abs(rec.valor||0).toFixed(2).replace('.', ',');
  document.getElementById('recDia').value = rec.diaDoMes || 1;
  document.getElementById('modalEditarRec').classList.remove('hidden');
}

function bindModalEditarRec(){
  document.getElementById('btnSalvarRec').onclick = async () => {
    if(!_editandoRec) return;
    const valor = parseFloat(document.getElementById('recValor').value.replace(',', '.'));
    const dia = parseInt(document.getElementById('recDia').value);
    if(isNaN(valor) || valor <= 0){ toast('Valor inválido'); return; }
    if(isNaN(dia) || dia < 1 || dia > 31){ toast('Dia inválido'); return; }
    // preserva sinal (crédito tem valor negativo no banco)
    const sinal = (_editandoRec.valor||0) < 0 ? -1 : 1;
    await updateDoc(doc(db, 'recorrencias', _editandoRec.id), {
      valor: sinal * valor,
      diaDoMes: dia,
    });
    fechaModais();
    toast('Recorrência atualizada');
  };
  document.getElementById('btnCancelarRec').onclick = async () => {
    if(!_editandoRec) return;
    if(!confirm(`Cancelar "${_editandoRec.descricao}"? Não vai mais criar lançamentos nos próximos meses.`)) return;
    // marca dataFim = ontem pra parar de materializar
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);
    await updateDoc(doc(db, 'recorrencias', _editandoRec.id), {
      dataFim: ontem.toISOString(),
    });
    fechaModais();
    toast('Recorrência cancelada');
  };
}

// ============================================================
// COFRES (Fundos Sazonais)
// ============================================================
const COFRES_ICONES = ['🏛️','🚗','🏠','✈️','🎓','💍','🎁','👶','🐕','💊','🛠️','💻','🎉','📚','🎂','🍰'];

function renderCofres(){
  const box = document.getElementById('cofresList');
  if(!box) return;
  if(state.cofres.length === 0){
    box.innerHTML = `<div class="empty">Crie cofres pra IPVA, IPTU, manutenção do carro, viagem… qualquer gasto grande que chega de uma vez.</div>`;
    return;
  }
  const hoje = new Date();
  box.innerHTML = state.cofres.map(cofre => {
    const atual = cofre.atual || 0;
    const meta = cofre.meta || 1;
    const pct = Math.min(100, (atual/meta)*100);
    const completo = atual >= meta;
    // calcular mensal necessário pra atingir meta
    const mesAlvo = parseInt(cofre.mesAlvo) || (hoje.getMonth()+1);
    const anoAlvo = (mesAlvo <= hoje.getMonth()+1) ? hoje.getFullYear()+1 : hoje.getFullYear();
    const dataAlvo = new Date(anoAlvo, mesAlvo-1, 1);
    const mesesRest = Math.max(1, Math.ceil((dataAlvo - hoje) / (1000*60*60*24*30)));
    const mensal = (meta - atual) / mesesRest;
    return `
      <div class="cofre" data-id="${cofre.id}">
        <div class="cofre-top">
          <span class="cofre-nome">${cofre.icone||'🏛️'} ${cofre.nome}</span>
          <span class="cofre-mes">${MESES_NOMES[mesAlvo-1].slice(0,3)} · ${anoAlvo}</span>
        </div>
        <div class="cofre-bar"><div class="cofre-bar-fill ${completo?'completo':''}" style="width:${pct}%"></div></div>
        <div class="cofre-vals">
          <span class="atual">${fmt(atual)}</span>
          <span class="meta">de ${fmt(meta)}</span>
        </div>
        ${completo ? `<div class="cofre-mensal" style="color:var(--green)">✓ Meta atingida</div>` : `<div class="cofre-mensal">Guarde ${fmt(mensal)}/mês até ${MESES_NOMES[mesAlvo-1].slice(0,3)}</div>`}
      </div>
    `;
  }).join('');
  box.querySelectorAll('.cofre').forEach(el => {
    el.onclick = () => abreModalCofre(el.dataset.id);
  });
}

// ============================================================
// DASHBOARD FUTURO — Projeções automáticas
// ============================================================
function renderFuturo(){
  renderProjOrcamento();
  renderCompromissos();
  renderProjInvestimentos();
}

async function renderCompromissos(){
  const box = document.getElementById('compList');
  if(!box) return;

  // janela: hoje até +12 meses (frente)
  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth()+1, 1); // próximo mês
  const fim = new Date(hoje.getFullYear(), hoje.getMonth()+13, 0, 23, 59, 59);

  // busca lançamentos futuros (parcelas com data no futuro)
  let lancsFuturos = [];
  try {
    const qf = query(
      collection(db, 'lancamentos'),
      where('ts', '>=', inicio.getTime()),
      where('ts', '<=', fim.getTime())
    );
    const snap = await getDocs(qf);
    lancsFuturos = snap.docs.map(d => ({id: d.id, ...d.data()}));
  } catch(e){
    // sem permissão / sem dados / etc
  }

  // recorrências ativas — virão a cada mês
  const recorrentes = state.recorrencias || [];

  // monta 12 meses
  const meses = [];
  for(let i = 0; i < 12; i++){
    const d = new Date(hoje.getFullYear(), hoje.getMonth()+1+i, 1);
    meses.push({
      ano: d.getFullYear(),
      mes: d.getMonth(), // 0-indexed
      key: `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}`,
      lbl: MESES_NOMES[d.getMonth()].slice(0,3) + ' · ' + d.getFullYear(),
      parcelas: [],
      recorrentes: [],
    });
  }

  // distribui parcelas (lançamentos futuros que vêm com origem=parcela ou parcelaGrupo)
  lancsFuturos.forEach(l => {
    if(l.origem === 'recorrencia') return; // recorrências contamos à parte
    const d = new Date(l.ts);
    const m = meses.find(x => x.ano === d.getFullYear() && x.mes === d.getMonth());
    if(m) m.parcelas.push(l);
  });

  // distribui recorrentes (todo mês cai uma vez de cada)
  meses.forEach(m => {
    recorrentes.forEach(r => {
      // só conta se data de início <= esse mês E data de fim >= esse mês (se houver)
      const ini = r.dataInicio ? new Date(r.dataInicio) : new Date(0);
      const fim = r.dataFim ? new Date(r.dataFim) : null;
      const mesData = new Date(m.ano, m.mes, 1);
      if(ini <= mesData && (!fim || fim >= mesData)){
        m.recorrentes.push(r);
      }
    });
  });

  // renda projetada: pós-julho/26 = R$ 7.804,93; antes = ~R$ 14.000
  function rendaDoMes(ano, mes){
    if(ano > 2026 || (ano === 2026 && mes >= 6)) return 7804.93;
    return 14000;
  }

  // máximo absoluto pra escalar barras
  const totaisMes = meses.map(m => {
    const tp = m.parcelas.reduce((a,l)=>a+(l.valor||0), 0);
    const tr = m.recorrentes.reduce((a,r)=>a+(r.valor||0), 0);
    return { total: tp+tr, renda: rendaDoMes(m.ano, m.mes), parc: tp, recur: tr };
  });
  const maxAbs = Math.max(1, ...totaisMes.map(x => x.total));

  // renderiza
  if(maxAbs === 1){ // ninguém tem compromisso
    box.innerHTML = `<div class="comp-row empty-row">Nenhuma parcela ou gasto recorrente agendado pros próximos 12 meses.</div>`;
    return;
  }

  box.innerHTML = meses.map((m, i) => {
    const t = totaisMes[i];
    if(t.total === 0){
      return `
        <div class="comp-row">
          <div class="comp-top">
            <span class="comp-mes">${m.lbl}</span>
            <span class="comp-total" style="color:var(--soft)">livre</span>
          </div>
        </div>
      `;
    }
    const pctTotal = (t.total / t.renda) * 100;
    const isAlerta = pctTotal > 30;
    // largura proporcional ao máximo absoluto (não à renda)
    const escala = (t.total / maxAbs) * 100;
    const pctParc = t.total > 0 ? (t.parc / t.total) * escala : 0;
    const pctRecur = t.total > 0 ? (t.recur / t.total) * escala : 0;

    const detalhesParc = m.parcelas.map(l =>
      `<div class="comp-detail-item"><span>${l.descricao||'—'}<span class="tag">parcela</span></span><span>${fmt(l.valor)}</span></div>`
    ).join('');
    const detalhesRecur = m.recorrentes.map(r =>
      `<div class="comp-detail-item"><span>${r.descricao}<span class="tag">mensal</span></span><span>${fmt(r.valor)}</span></div>`
    ).join('');

    return `
      <div class="comp-row ${isAlerta?'alert':''}" data-mes="${m.key}">
        <div class="comp-top">
          <span class="comp-mes">${m.lbl}${m.ano === 2026 && m.mes === 6 ? '<em>renda nova</em>' : ''}</span>
          <span class="comp-total">${fmt(t.total)}</span>
        </div>
        <div class="comp-bar">
          <div class="comp-bar-parc" style="width:${pctParc}%"></div>
          <div class="comp-bar-recur" style="width:${pctRecur}%"></div>
        </div>
        <div class="comp-pct ${isAlerta?'alert-txt':''}">
          ${pctTotal.toFixed(0)}% da renda do mês (${fmt(t.renda)}) já comprometido
        </div>
        <div class="comp-detail">
          ${detalhesParc}${detalhesRecur}
        </div>
      </div>
    `;
  }).join('');

  // expandir detalhe ao tocar
  box.querySelectorAll('.comp-row[data-mes]').forEach(el => {
    el.onclick = () => el.classList.toggle('open');
  });
}

function renderProjOrcamento(){
  // gasto REAL: histórico mesclado (semente + lançamentos novos)
  const histTotal = historicoMesclado();
  const meses = Object.keys(histTotal).sort();
  // usa os últimos 12 meses disponíveis
  const ultimos12 = meses.slice(-12);
  let totalReal12m = 0;
  ultimos12.forEach(m => totalReal12m += Object.values(histTotal[m]).reduce((a,b)=>a+b,0));
  const realMensal = totalReal12m / ultimos12.length;

  // tendência: comparar últimos 3 com 3 anteriores
  const ult3 = ultimos12.slice(-3).reduce((a,m) => a + Object.values(histTotal[m]).reduce((s,v)=>s+v,0), 0)/3;
  const ant3 = ultimos12.slice(-6,-3).reduce((a,m) => a + Object.values(histTotal[m]).reduce((s,v)=>s+v,0), 0)/3;
  const tendencia = ult3 - ant3;

  // gasto PLANO: soma dos tetos
  const planoMensal = state.categorias.reduce((a,c) => a + (c.teto||0), 0);

  // renda hoje vs pós-julho
  const hoje = new Date();
  const isPosJulho = hoje.getMonth() >= 6 || hoje.getFullYear() > 2026;
  const renda = isPosJulho ? 7804.93 : 14000;
  const rendaPosJulho = 7804.93;

  // diferença com a renda PÓS-julho (cenário a planejar)
  const realDiff = rendaPosJulho - realMensal;  // negativo = déficit
  const planoDiff = rendaPosJulho - planoMensal; // positivo = folga

  setTxt('orcRealMes', (realDiff>=0?'+':'−') + fmt(Math.abs(realDiff)) + '/mês');
  setTxt('orcRealAno', `${realDiff>=0?'Sobra':'Falta'} ${fmt(Math.abs(realDiff*12))} no ano`);
  const elRM = document.getElementById('orcRealMes');
  if(elRM) elRM.className = 'dash-twin-val ' + (realDiff>=0 ? 'pos' : 'neg');

  setTxt('orcPlanoMes', (planoDiff>=0?'+':'−') + fmt(Math.abs(planoDiff)) + '/mês');
  setTxt('orcPlanoAno', `${planoDiff>=0?'Sobra':'Falta'} ${fmt(Math.abs(planoDiff*12))} no ano`);
  const elPM = document.getElementById('orcPlanoMes');
  if(elPM) elPM.className = 'dash-twin-val ' + (planoDiff>=0 ? 'pos' : 'neg');

  // explicação
  const exp = document.getElementById('dashExplain');
  if(exp){
    const diff = realMensal - planoMensal;
    let tendTxt = '';
    if(Math.abs(tendencia) > 100){
      tendTxt = tendencia > 0
        ? `Atenção: nos últimos 3 meses os gastos vêm <strong>subindo</strong> em média ${fmt(tendencia)}/mês comparado ao trimestre anterior.`
        : `Boa notícia: os gastos vêm <strong>caindo</strong> ${fmt(Math.abs(tendencia))}/mês nos últimos 3 meses.`;
    }
    exp.innerHTML = `
      Hoje (gasto real médio): <strong>${fmt(realMensal)}/mês</strong>.<br>
      Plano (orçamento meta): <strong>${fmt(planoMensal)}/mês</strong>.<br>
      Diferença: <strong>${fmt(Math.abs(diff))}/mês</strong> entre o real e o que cabe.
      ${tendTxt ? '<br><br>' + tendTxt : ''}
    `;
  }
}

function renderProjInvestimentos(){
  if(!state.investimentos){ return; }

  // saldos por quadrante
  const saldos = {};
  let totalArca = 0;
  for(const q of Object.keys(QUAD_INFO)){
    saldos[q] = (state.investimentos[q]||[]).reduce((a,x)=>a+(x.valor||0),0);
    totalArca += saldos[q];
  }
  const grao = state.grao ? state.grao.valor : 0;

  // aporte mensal estimado: pega categoria "investimentos" do orçamento meta
  const catInv = state.categorias.find(c => c.id === 'investimentos');
  const aporteTotal = catInv ? (catInv.teto || 0) : 400;
  // dividir aporte: metade ARCA (R$200), metade Grão (R$200) – conforme conversado
  const aporteARCA = aporteTotal / 2;
  const aporteGrao = aporteTotal / 2;

  // rendimento médio ponderado ARCA conforme distribuição atual
  let rendARCA = 0;
  if(totalArca > 0){
    for(const q of Object.keys(QUAD_INFO)){
      const peso = saldos[q]/totalArca;
      rendARCA += peso * RENDIMENTOS_ANUAIS[q];
    }
  }
  const rendARCAmensal = Math.pow(1+rendARCA, 1/12) - 1;
  const rendGraoMensal = Math.pow(1+RENDIMENTO_GRAO, 1/12) - 1;

  function proj(P, pmt, meses, iMensal){
    if(iMensal === 0) return P + pmt*meses;
    return P*Math.pow(1+iMensal, meses) + pmt*((Math.pow(1+iMensal, meses)-1)/iMensal);
  }

  // ARCA hoje, 1a, 5a, 10a
  setTxt('arcaNow', fmt(totalArca));
  setTxt('arca1a',  fmt(proj(totalArca, aporteARCA, 12, rendARCAmensal)));
  setTxt('arca5a',  fmt(proj(totalArca, aporteARCA, 60, rendARCAmensal)));
  setTxt('arca10a', fmt(proj(totalArca, aporteARCA, 120, rendARCAmensal)));

  // Grão hoje, 5a, 15a, aos 65
  setTxt('graoNow', fmt(grao));
  setTxt('grao5a',  fmt(proj(grao, aporteGrao, 60, rendGraoMensal)));
  setTxt('grao15a', fmt(proj(grao, aporteGrao, 180, rendGraoMensal)));
  const mesesAteApos = anosAteAposentadoria() * 12;
  setTxt('grao65', fmt(proj(grao, aporteGrao, mesesAteApos, rendGraoMensal)));

  // gráfico evolução ano a ano (próximos 30 anos)
  const anos = 30;
  const arcaSerie = [], graoSerie = [];
  for(let a=0; a<=anos; a++){
    arcaSerie.push(proj(totalArca, aporteARCA, a*12, rendARCAmensal));
    graoSerie.push(proj(grao, aporteGrao, a*12, rendGraoMensal));
  }
  desenhaPatChart(arcaSerie, graoSerie, anos);

  // labels do x
  const elX = document.getElementById('patChartLabels');
  if(elX){
    const hojeAno = new Date().getFullYear();
    elX.innerHTML = [0, 10, 20, 30].map(a => `<span>${hojeAno + a}</span>`).join('');
  }

  // premissas visíveis
  const prem = document.getElementById('dashPremBody');
  if(prem){
    prem.innerHTML = `
      <ul>
        <li>Renda Fixa: <strong>${(RENDIMENTOS_ANUAIS.rendaFixa*100).toFixed(1)}%</strong> a.a. (~Selic)</li>
        <li>Ações BR: <strong>${(RENDIMENTOS_ANUAIS.acoesBR*100).toFixed(1)}%</strong> a.a. (Ibov 10 anos)</li>
        <li>FIIs: <strong>${(RENDIMENTOS_ANUAIS.fiis*100).toFixed(1)}%</strong> a.a. (IFIX médio)</li>
        <li>Internacional: <strong>${(RENDIMENTOS_ANUAIS.internacional*100).toFixed(1)}%</strong> a.a. (mix conservador BTC + ETFs)</li>
        <li>Grão (VGBL): <strong>${(RENDIMENTO_GRAO*100).toFixed(1)}%</strong> a.a.</li>
        <li>Aporte mensal total: <strong>${fmt(aporteTotal)}</strong> (${fmt(aporteARCA)} ARCA + ${fmt(aporteGrao)} Grão), vindo da categoria Investimentos.</li>
        <li>Rendimento médio ARCA hoje: <strong>${(rendARCA*100).toFixed(1)}%</strong> (ponderado pela alocação atual).</li>
      </ul>
    `;
  }
}

function desenhaPatChart(arca, grao, anos){
  const svg = document.getElementById('patChart');
  if(!svg) return;
  const W = 320, H = 160, padX = 6, padY = 12;
  const totais = arca.map((v,i) => v + grao[i]);
  const max = Math.max(...totais) * 1.05;
  const min = 0;
  function ptos(serie, color){
    const pts = serie.map((v,i) => {
      const x = padX + (i/(serie.length-1)) * (W - padX*2);
      const y = H - padY - ((v-min)/(max-min||1)) * (H - padY*2);
      return [x, y];
    });
    const linePath = pts.map((p,i) => (i===0?'M':'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
    const areaPath = linePath + ` L${pts[pts.length-1][0].toFixed(1)},${H-padY} L${pts[0][0].toFixed(1)},${H-padY} Z`;
    return { linePath, areaPath };
  }
  const a = ptos(arca);
  const g = ptos(grao);
  svg.innerHTML = `
    <defs>
      <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#c4622d" stop-opacity="0.18"/>
        <stop offset="100%" stop-color="#c4622d" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="gG" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#a87f3e" stop-opacity="0.22"/>
        <stop offset="100%" stop-color="#a87f3e" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <path d="${a.areaPath}" fill="url(#gA)"/>
    <path d="${g.areaPath}" fill="url(#gG)"/>
    <path d="${a.linePath}" fill="none" stroke="#c4622d" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${g.linePath}" fill="none" stroke="#a87f3e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  `;
}

function bindProjecaoSliders(){
  // mantido vazio agora — sliders foram removidos da v2.3
}

// ============================================================
// AÇÕES / EVENTOS
// ============================================================
function bindTabs(){
  document.querySelectorAll('.tab').forEach(btn => {
    btn.onclick = () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
      document.getElementById('view-' + tab).classList.remove('hidden');
      window.scrollTo({top:0, behavior:'smooth'});
    };
  });
}

function bindFab(){
  document.getElementById('btnAdd').onclick = () => abreModalAdd();
}

function bindMesNav(){
  const ant = document.getElementById('mesAnterior');
  const prox = document.getElementById('mesProximo');
  if(ant) ant.onclick = () => mudaMes(-1);
  if(prox) prox.onclick = () => mudaMes(+1);

  // Saldo em conta — toque pra abrir modal
  const saldoCard = document.getElementById('saldoCard');
  if(saldoCard){
    saldoCard.onclick = () => {
      const inp = document.getElementById('saldoInput');
      if(inp){
        if(state.saldoConta !== null && state.saldoConta !== undefined){
          inp.value = state.saldoConta.toFixed(2).replace('.', ',');
        } else {
          inp.value = '';
        }
      }
      document.getElementById('modalSaldo').classList.remove('hidden');
      setTimeout(() => inp && inp.focus(), 200);
    };
  }
}

function bindModalSaldo(){
  const btn = document.getElementById('btnSalvarSaldo');
  if(!btn) return;
  btn.onclick = async () => {
    const v = document.getElementById('saldoInput').value.trim().replace(/\./g, '').replace(',', '.');
    const num = parseFloat(v);
    if(isNaN(num)){
      toast('Valor inválido');
      return;
    }
    await atualizaSaldo(num);
    fechaModais();
    toast('Saldo atualizado');
  };
}

function abreModalAdd(){
  document.getElementById('inpValor').value = '';
  document.getElementById('inpDesc').value = '';
  document.getElementById('autoCat').textContent = '';
  document.getElementById('inpParcelas').value = '1';
  document.getElementById('parcelaTip').textContent = '';
  document.getElementById('inpRecorrente').checked = false;
  document.getElementById('recurTip').textContent = '';
  // resetar tipo pra Gasto
  document.querySelectorAll('.tipo-opt').forEach(el => {
    el.classList.toggle('sel', el.dataset.tipo === 'gasto');
  });
  // data padrão = hoje
  const hoje = new Date().toISOString().split('T')[0];
  document.getElementById('inpData').value = hoje;
  document.getElementById('modalAdd').classList.remove('hidden');
  setTimeout(() => document.getElementById('inpValor').focus(), 200);
}

function fechaModais(){
  document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
}

function bindModais(){
  document.querySelectorAll('[data-close]').forEach(el => {
    el.onclick = fechaModais;
  });

  // detectar categoria conforme digita
  document.getElementById('inpDesc').addEventListener('input', e => {
    const desc = e.target.value;
    const catId = detectaCategoria(desc);
    if(catId){
      const cat = state.categorias.find(c => c.id === catId);
      if(cat){
        document.getElementById('inpCat').value = catId;
        document.getElementById('autoCat').textContent = `↪ ${cat.nome}`;
      }
    } else {
      document.getElementById('autoCat').textContent = '';
    }
  });

  // máscara monetária leve + atualizar dica de parcela
  document.getElementById('inpValor').addEventListener('input', e => {
    let v = e.target.value.replace(/[^\d,]/g, '');
    e.target.value = v;
    atualizaParcelaTip();
  });
  document.getElementById('inpParcelas').addEventListener('input', atualizaParcelaTip);

  // Toggle gasto/crédito
  document.querySelectorAll('.tipo-opt').forEach(opt => {
    opt.onclick = () => {
      document.querySelectorAll('.tipo-opt').forEach(o => o.classList.remove('sel'));
      opt.classList.add('sel');
    };
  });

  // BOTÃO DE VOZ — Web Speech API com fallback pro teclado (iOS)
  document.getElementById('voiceBtn').onclick = iniciaVoz;

  document.getElementById('btnSalvar').onclick = async () => {
    const valorBruto = parseFloat(document.getElementById('inpValor').value.replace(',', '.'));
    const desc = document.getElementById('inpDesc').value.trim();
    const cat = document.getElementById('inpCat').value;
    const data = document.getElementById('inpData').value;
    const parcelas = parseInt(document.getElementById('inpParcelas').value) || 1;
    const recorrente = document.getElementById('inpRecorrente').checked;
    // tipo: gasto (positivo) ou crédito (negativo)
    const tipoSel = document.querySelector('.tipo-opt.sel');
    const ehCredito = tipoSel && tipoSel.dataset.tipo === 'credito';
    const valor = ehCredito ? -Math.abs(valorBruto) : Math.abs(valorBruto);

    if(!valorBruto || valorBruto <= 0){
      toast('Informe um valor válido');
      return;
    }
    if(!desc){
      toast('Adicione uma descrição');
      return;
    }

    // Recorrente + parcelado: não faz sentido junto
    if(recorrente && parcelas > 1){
      toast('Recorrente e parcelado não podem juntos — desmarque um');
      return;
    }
    // Crédito pode ser parcelado (ex: estorno em N vezes), mas não recorrente
    if(ehCredito && recorrente){
      toast('Crédito não pode ser recorrente — desmarque');
      return;
    }
    if(parcelas > 48){
      toast('Máximo 48 parcelas');
      return;
    }

    const dia = new Date(data + 'T12:00:00').getDate();

    // verificar se é estabelecimento desconhecido
    const detectado = detectaCategoria(desc);
    if(!detectado && !state.estabelecimentos[normaliza(desc).slice(0,60)]){
      document.getElementById('aprendeEstab').textContent = `"${desc}"`;
      document.getElementById('aprendeCat').value = cat;
      document.getElementById('modalAdd').classList.add('hidden');
      document.getElementById('modalAprende').classList.remove('hidden');

      document.getElementById('btnAprende').onclick = async () => {
        const catEscolhida = document.getElementById('aprendeCat').value;
        const lembrar = document.getElementById('aprendeRemember').checked;
        if(lembrar){
          await salvaEstabelecimento(desc, catEscolhida);
        }
        await novoLancamento(valor, desc, catEscolhida, data, parcelas);
        if(recorrente){
          await criaRecorrencia({ valor, descricao: desc, categoriaId: catEscolhida, diaDoMes: dia });
        }
        fechaModais();
        toast(parcelas > 1 ? `${parcelas}x ${ehCredito ? 'de crédito ' : ''}criadas` : ehCredito ? 'Crédito salvo' : (recorrente ? 'Salvo e marcado como mensal' : 'Lançamento salvo'));
      };
      return;
    }

    await novoLancamento(valor, desc, cat, data, parcelas);
    if(recorrente){
      await criaRecorrencia({ valor, descricao: desc, categoriaId: cat, diaDoMes: dia });
    }
    fechaModais();
    toast(parcelas > 1 ? `${parcelas}x ${ehCredito ? 'de crédito ' : ''}criadas` : ehCredito ? 'Crédito salvo' : (recorrente ? 'Salvo e marcado como mensal' : 'Lançamento salvo'));
  };

  // Tip da recorrência
  document.getElementById('inpRecorrente').addEventListener('change', e => {
    const tip = document.getElementById('recurTip');
    tip.textContent = e.target.checked
      ? '🔁 Vai aparecer sozinho todo mês no mesmo dia'
      : '';
  });
}

function atualizaParcelaTip(){
  const valor = parseFloat((document.getElementById('inpValor').value||'').replace(',', '.'));
  const parcelas = parseInt(document.getElementById('inpParcelas').value) || 1;
  const tip = document.getElementById('parcelaTip');
  if(parcelas > 1 && valor > 0){
    const total = valor * parcelas;
    tip.textContent = `${parcelas}x de ${fmt(valor)} (total ${fmt(total)}) — uma em cada mês, a partir da data escolhida`;
  } else {
    tip.textContent = '';
  }
}

// ============================================================
// VOZ — Web Speech API com fallback pro teclado (iOS)
// ============================================================
function iniciaVoz(){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const btn = document.getElementById('voiceBtn');
  const txt = document.getElementById('voiceTxt');

  if(!SR){
    // Fallback (iPhone/Safari): foca no campo e abre teclado pra microfone nativo
    toast('Use o 🎙 do teclado pra ditar');
    document.getElementById('inpDesc').focus();
    return;
  }

  try {
    const rec = new SR();
    rec.lang = 'pt-BR';
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    btn.classList.add('listening');
    txt.textContent = 'Ouvindo… fale agora';

    rec.onresult = (e) => {
      const fala = e.results[0][0].transcript;
      interpretaFala(fala);
    };
    rec.onerror = () => {
      // se falhar (comum no iOS), cai no teclado
      btn.classList.remove('listening');
      txt.textContent = 'Tocar e falar o gasto';
      toast('Use o 🎙 do teclado pra ditar');
      document.getElementById('inpDesc').focus();
    };
    rec.onend = () => {
      btn.classList.remove('listening');
      txt.textContent = 'Tocar e falar o gasto';
    };

    rec.start();
  } catch(err){
    toast('Use o 🎙 do teclado pra ditar');
    document.getElementById('inpDesc').focus();
  }
}

// Interpreta fala informal: extrai valor + descrição/categoria
function interpretaFala(fala){
  const f = fala.toLowerCase();

  // 1. extrair valor — primeiro tenta número direto "80", "150", "1.200"
  let valor = null;
  const numMatch = f.match(/(\d+(?:[.,]\d{1,2})?)/);
  if(numMatch){
    valor = parseFloat(numMatch[1].replace('.', '').replace(',', '.'));
  } else {
    // tenta número por extenso simples
    valor = extensoParaNumero(f);
  }

  // 2. descrição = a fala inteira (limpa palavras de comando)
  let desc = fala
    .replace(/\b(gastei|paguei|comprei|foi|de|no|na|em|uns|um|uma|reais|real|r\$)\b/gi, ' ')
    .replace(/\d+(?:[.,]\d{1,2})?/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if(!desc) desc = fala.trim();

  // preenche os campos
  if(valor && valor > 0){
    document.getElementById('inpValor').value = valor.toString().replace('.', ',');
  }
  document.getElementById('inpDesc').value = desc.charAt(0).toUpperCase() + desc.slice(1);

  // dispara detecção de categoria
  document.getElementById('inpDesc').dispatchEvent(new Event('input'));
  atualizaParcelaTip();

  toast('Confira e ajuste se precisar');
}

function extensoParaNumero(txt){
  // cobre casos simples: "cento e vinte", "oitenta", "cinquenta"
  const mapa = {
    'cem':100,'cento':100,'duzentos':200,'trezentos':300,'quatrocentos':400,'quinhentos':500,
    'dez':10,'vinte':20,'trinta':30,'quarenta':40,'cinquenta':50,'sessenta':60,'setenta':70,'oitenta':80,'noventa':90,
    'um':1,'dois':2,'tres':3,'três':3,'quatro':4,'cinco':5,'seis':6,'sete':7,'oito':8,'nove':9,
    'mil':1000
  };
  let total = 0, achou = false;
  const palavras = txt.split(/\s+|\be\b/);
  for(const p of palavras){
    if(mapa[p] !== undefined){ total += mapa[p]; achou = true; }
  }
  return achou ? total : null;
}

function abreModalTeto(cat){
  document.getElementById('tetoCatNome').textContent = `Teto · ${cat.nome}`;
  document.getElementById('tetoValor').value = (cat.teto||0).toString().replace('.', ',');
  document.getElementById('modalTeto').classList.remove('hidden');
  document.getElementById('btnSalvarTeto').onclick = async () => {
    const novo = parseFloat(document.getElementById('tetoValor').value.replace(',', '.'));
    if(isNaN(novo) || novo < 0){
      toast('Valor inválido');
      return;
    }
    await atualizaTeto(cat.id, novo);
    fechaModais();
    toast(`Teto de ${cat.nome} atualizado`);
  };
}

function bindModalAtivo(){
  const btn = document.getElementById('btnSalvarAtivo');
  if(!btn) return;
  btn.onclick = async () => {
    const novo = parseFloat(document.getElementById('ativoValor').value.replace(',', '.'));
    if(isNaN(novo) || novo < 0){ toast('Valor inválido'); return; }
    if(editandoAtivo.tipo === 'grao'){
      await atualizaGrao(novo);
    } else {
      await atualizaAtivo(editandoAtivo.quad, editandoAtivo.idx, novo);
    }
    fechaModais();
    toast('Atualizado');
  };

  // Botão Excluir ativo
  const btnEx = document.getElementById('btnExcluirAtivo');
  if(btnEx){
    btnEx.onclick = async () => {
      if(!editandoAtivo || editandoAtivo.tipo !== 'ativo') return;
      const ativo = state.investimentos[editandoAtivo.quad][editandoAtivo.idx];
      if(confirm(`Excluir ${ativo.nome} (${fmt(ativo.valor)})?`)){
        await deletaAtivo(editandoAtivo.quad, editandoAtivo.idx);
        fechaModais();
        toast('Ativo excluído');
      }
    };
  }
}

// ============================================================
// SYNC STATUS
// ============================================================
function markSync(status){
  const dot = document.getElementById('syncDot');
  dot.className = 'sync-dot';
  if(status === 'off') dot.classList.add('off');
  if(status === 'err') dot.classList.add('err');
}

// ============================================================
// TOAST
// ============================================================
function toast(msg){
  // remove anterior
  const ant = document.querySelector('.toast');
  if(ant) ant.remove();
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2700);
}

// ============================================================
// UPLOAD E PARSING DE PDF (extrato/fatura) — client-side
// ============================================================
let pdfLancamentosPendentes = [];

function bindPdfUpload(){
  const inp = document.getElementById('pdfInput');
  if(!inp) return;
  inp.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const status = document.getElementById('pdfStatus');
    status.innerHTML = 'Lendo PDF…';

    if(!window.pdfjsLib){
      status.innerHTML = '<span class="err">Biblioteca de PDF não carregou. Tente recarregar o app.</span>';
      return;
    }

    try {
      const buf = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({data: buf}).promise;
      let texto = '';
      for(let i=1; i<=pdf.numPages; i++){
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        texto += content.items.map(it => it.str).join(' ') + '\n';
      }
      const lancs = extraiLancamentosDePdf(texto);
      if(lancs.length === 0){
        status.innerHTML = '<span class="err">Não encontrei lançamentos reconhecíveis neste PDF. Você pode adicionar manualmente.</span>';
        return;
      }
      pdfLancamentosPendentes = lancs;
      mostraRevisaoPdf(lancs);
    } catch(err){
      console.error(err);
      status.innerHTML = '<span class="err">Erro ao ler o PDF. Pode ser um PDF protegido ou escaneado.</span>';
    }
    inp.value = '';
  });
}

function extraiLancamentosDePdf(texto){
  const lancs = [];
  // padrão DD/MM DESC VALOR (fatura/extrato Santander)
  const re = /(\d{2}\/\d{2})\s+([A-Za-zÀ-ú0-9*\.\-\/ ]{4,50}?)\s+(\d{1,3}(?:\.\d{3})*,\d{2})/g;
  const blacklist = ['saldo','pagamento de fatura','deb autom','total','anuidade','iof','limite',
    'valor total','resumo','cotacao','juros','multa','rotativo','seguro prestamista',
    'detalhamento','periodo','historico','demonstrativo','xxxx'];
  let m;
  const anoAtual = new Date().getFullYear();
  while((m = re.exec(texto)) !== null){
    const dataStr = m[1], desc = m[2].trim(), valStr = m[3];
    const dl = desc.toLowerCase();
    if(blacklist.some(b => dl.includes(b))) continue;
    const valor = parseFloat(valStr.replace(/\./g,'').replace(',','.'));
    if(!valor || valor <= 0 || valor > 8000) continue;
    const [dia,mes] = dataStr.split('/');
    const catId = detectaCategoria(desc) || 'outros';
    lancs.push({
      desc: desc.slice(0,50),
      valor,
      dia: parseInt(dia),
      mes: parseInt(mes),
      categoriaId: catId,
    });
  }
  // dedupe
  const seen = new Set();
  return lancs.filter(l => {
    const k = `${l.dia}-${l.mes}-${l.valor}-${l.desc.slice(0,15)}`;
    if(seen.has(k)) return false;
    seen.add(k); return true;
  });
}

function mostraRevisaoPdf(lancs){
  const status = document.getElementById('pdfStatus');
  const total = lancs.reduce((a,l)=>a+l.valor,0);
  status.innerHTML = `
    <span class="ok">${lancs.length} lançamentos encontrados (${fmt(total)})</span>
    <div class="pdf-review">
      ${lancs.slice(0,30).map(l => `
        <div class="pdf-review-item">
          <span class="pdf-review-desc">${l.dia.toString().padStart(2,'0')}/${l.mes.toString().padStart(2,'0')} · ${l.desc}</span>
          <span class="pdf-review-val">${fmt(l.valor)}</span>
        </div>
      `).join('')}
      ${lancs.length > 30 ? `<div class="cap">+ ${lancs.length-30} outros…</div>` : ''}
    </div>
    <button class="btn-primary pdf-confirm" id="btnImportaPdf">Importar ${lancs.length} lançamentos</button>
  `;
  document.getElementById('btnImportaPdf').onclick = importaPdfPendentes;
}

async function importaPdfPendentes(){
  if(pdfLancamentosPendentes.length === 0) return;
  const status = document.getElementById('pdfStatus');
  status.innerHTML = 'Importando…';
  const anoAtual = state.ano;
  const batch = writeBatch(db);
  for(const l of pdfLancamentosPendentes){
    // assume ano corrente; se mês > mês atual, ano anterior
    let ano = anoAtual;
    if(l.mes > (state.mes+1)) ano = anoAtual - 1;
    const data = new Date(ano, l.mes-1, l.dia, 12, 0);
    const ref = doc(collection(db, 'lancamentos'));
    batch.set(ref, {
      valor: l.valor,
      descricao: l.desc,
      categoriaId: l.categoriaId,
      ts: data.getTime(),
      data: data.toISOString(),
      criadoEm: Date.now(),
      origem: 'pdf',
    });
  }
  await batch.commit();
  pdfLancamentosPendentes = [];
  status.innerHTML = '<span class="ok">Importado! Veja nos lançamentos do mês.</span>';
  toast('Lançamentos importados');
}

// ============================================================
// MODAIS: NOVA/EDITAR CATEGORIA, NOVO ATIVO, COFRE
// ============================================================
const ICONES_CATEGORIA = ['📦','🏠','🛒','🍔','🚗','⛽','📱','📺','💊','👶','🎁','🙏','✂️','💄','🛡️','📈','🎓','🎨','🏋️','🐕','✈️','💻','📚','💼'];

function abreModalCategoria(catId){
  editandoCategoria = catId;
  const titulo = document.getElementById('catModalTitle');
  const btnDel = document.getElementById('btnDeletarCategoria');
  const inpNome = document.getElementById('catNome');
  const inpTeto = document.getElementById('catTeto');
  const inpIcone = document.getElementById('catIcone');

  if(catId){
    const cat = state.categorias.find(c => c.id === catId);
    titulo.textContent = `Editar: ${cat.nome}`;
    inpNome.value = cat.nome;
    inpTeto.value = (cat.teto||0).toString().replace('.', ',');
    inpIcone.value = cat.icone || '📦';
    btnDel.classList.remove('hidden');
  } else {
    titulo.textContent = 'Nova categoria';
    inpNome.value = '';
    inpTeto.value = '';
    inpIcone.value = '📦';
    btnDel.classList.add('hidden');
  }

  // renderiza grid de ícones
  const grid = document.getElementById('iconGrid');
  grid.innerHTML = ICONES_CATEGORIA.map(ic => `<div class="icon-opt ${ic===inpIcone.value?'sel':''}" data-ic="${ic}">${ic}</div>`).join('');
  grid.querySelectorAll('.icon-opt').forEach(el => {
    el.onclick = () => {
      grid.querySelectorAll('.icon-opt').forEach(x => x.classList.remove('sel'));
      el.classList.add('sel');
      inpIcone.value = el.dataset.ic;
    };
  });

  document.getElementById('modalCategoria').classList.remove('hidden');
}

function bindModalCategoria(){
  const btnNova = document.getElementById('btnNovaCategoria');
  if(btnNova) btnNova.onclick = () => abreModalCategoria(null);

  document.getElementById('btnSalvarCategoria').onclick = async () => {
    const nome = document.getElementById('catNome').value.trim();
    const tetoStr = document.getElementById('catTeto').value.replace(',', '.');
    const teto = parseFloat(tetoStr) || 0;
    const icone = document.getElementById('catIcone').value;
    if(!nome){ toast('Digite o nome'); return; }
    if(editandoCategoria){
      await atualizaCategoria(editandoCategoria, { nome, teto, icone });
      toast('Categoria atualizada');
    } else {
      // id derivado do nome
      const id = normaliza(nome).replace(/[^a-z0-9]/g,'').slice(0,30) || ('cat' + Date.now());
      await criaCategoria({ id, nome, icone, teto });
      toast('Categoria criada');
    }
    fechaModais();
  };

  document.getElementById('btnDeletarCategoria').onclick = async () => {
    if(!editandoCategoria) return;
    const cat = state.categorias.find(c => c.id === editandoCategoria);
    if(!cat) return;
    if(cat.id === 'outros'){ toast('A categoria Outros não pode ser excluída'); return; }
    const qtd = await contaLancamentosDaCategoria(editandoCategoria);
    if(qtd === 0){
      // sem lançamentos: deleta direto
      await deletaCategoriaCompleto(editandoCategoria, 'moveOutros');
      fechaModais();
      toast('Categoria excluída');
    } else {
      // tem lançamentos: pergunta o que fazer
      document.getElementById('delCatTexto').innerHTML = `A categoria <strong>${cat.nome}</strong> tem <strong>${qtd}</strong> lançamento${qtd>1?'s':''}. O que fazer com ${qtd>1?'eles':'ele'}?`;
      document.getElementById('modalCategoria').classList.add('hidden');
      document.getElementById('modalDeletarCat').classList.remove('hidden');
    }
  };

  document.getElementById('btnDelMoveOutros').onclick = async () => {
    await deletaCategoriaCompleto(editandoCategoria, 'moveOutros');
    fechaModais();
    toast('Categoria excluída, lançamentos movidos pra Outros');
  };
  document.getElementById('btnDelTudo').onclick = async () => {
    await deletaCategoriaCompleto(editandoCategoria, 'deletaTudo');
    fechaModais();
    toast('Categoria e lançamentos excluídos');
  };
}

function bindModalNovoAtivo(){
  const btn = document.getElementById('btnNovoAtivo');
  if(!btn) return;
  btn.onclick = () => abreModalNovoAtivo();

  const quadSel = document.getElementById('novoAtivoQuad');
  if(quadSel){
    quadSel.onchange = () => {
      document.getElementById('checkCripto').style.display = quadSel.value === 'internacional' ? 'flex' : 'none';
    };
  }

  document.getElementById('btnSalvarNovoAtivo').onclick = async () => {
    const quad = document.getElementById('novoAtivoQuad').value;
    const nome = document.getElementById('novoAtivoNome').value.trim();
    const valor = parseFloat(document.getElementById('novoAtivoValor').value.replace(',', '.'));
    const cripto = document.getElementById('novoAtivoCripto').checked;
    if(!nome){ toast('Nome do ativo'); return; }
    if(!valor || valor < 0){ toast('Valor inválido'); return; }
    const ativo = { nome, valor };
    if(quad === 'internacional' && cripto) ativo.cripto = true;
    await adicionaAtivo(quad, ativo);
    fechaModais();
    toast('Ativo adicionado');
  };
}

function abreModalNovoAtivo(){
  document.getElementById('novoAtivoQuad').value = 'rendaFixa';
  document.getElementById('novoAtivoNome').value = '';
  document.getElementById('novoAtivoValor').value = '';
  document.getElementById('novoAtivoCripto').checked = false;
  document.getElementById('checkCripto').style.display = 'none';
  document.getElementById('modalNovoAtivo').classList.remove('hidden');
}

// Long-press em ativo pra deletar
function setupLongPressAtivos(){
  document.querySelectorAll('.ativo').forEach(el => {
    let timer = null;
    let pressed = false;
    const start = () => {
      pressed = false;
      timer = setTimeout(() => {
        pressed = true;
        const q = el.dataset.quad;
        const idx = parseInt(el.dataset.idx);
        const ativo = state.investimentos[q][idx];
        if(confirm(`Excluir ${ativo.nome} (${fmt(ativo.valor)})?`)){
          deletaAtivo(q, idx).then(() => toast('Ativo excluído'));
        }
      }, 600);
    };
    const cancel = () => { if(timer) clearTimeout(timer); };
    el.addEventListener('touchstart', start);
    el.addEventListener('touchend', cancel);
    el.addEventListener('touchmove', cancel);
    el.addEventListener('mousedown', start);
    el.addEventListener('mouseup', cancel);
    el.addEventListener('mouseleave', cancel);
  });
}

function abreModalCofre(cofreId){
  editandoCofre = cofreId;
  const titulo = document.getElementById('cofreModalTitle');
  const btnDel = document.getElementById('btnDeletarCofre');
  const inpNome = document.getElementById('cofreNome');
  const inpMeta = document.getElementById('cofreMeta');
  const inpAtual = document.getElementById('cofreAtual');
  const inpMes = document.getElementById('cofreMesAlvo');
  const inpIcone = document.getElementById('cofreIcone');

  // popula select de meses se ainda não foi
  if(inpMes.options.length === 0){
    inpMes.innerHTML = MESES_NOMES.map((m,i) => `<option value="${i+1}">${m}</option>`).join('');
  }

  if(cofreId){
    const c = state.cofres.find(x => x.id === cofreId);
    titulo.textContent = `Editar: ${c.nome}`;
    inpNome.value = c.nome;
    inpMeta.value = (c.meta||0).toString().replace('.', ',');
    inpAtual.value = (c.atual||0).toString().replace('.', ',');
    inpMes.value = c.mesAlvo || 1;
    inpIcone.value = c.icone || '🏛️';
    btnDel.classList.remove('hidden');
  } else {
    titulo.textContent = 'Novo cofre';
    inpNome.value = '';
    inpMeta.value = '';
    inpAtual.value = '0';
    inpMes.value = 1;
    inpIcone.value = '🏛️';
    btnDel.classList.add('hidden');
  }

  // grid de ícones
  const grid = document.getElementById('cofreIconGrid');
  grid.innerHTML = COFRES_ICONES.map(ic => `<div class="icon-opt ${ic===inpIcone.value?'sel':''}" data-ic="${ic}">${ic}</div>`).join('');
  grid.querySelectorAll('.icon-opt').forEach(el => {
    el.onclick = () => {
      grid.querySelectorAll('.icon-opt').forEach(x => x.classList.remove('sel'));
      el.classList.add('sel');
      inpIcone.value = el.dataset.ic;
    };
  });

  document.getElementById('modalCofre').classList.remove('hidden');
}

function bindModalCofre(){
  const btnNovo = document.getElementById('btnAddCofre');
  if(btnNovo) btnNovo.onclick = () => abreModalCofre(null);

  document.getElementById('btnSalvarCofre').onclick = async () => {
    const nome = document.getElementById('cofreNome').value.trim();
    const meta = parseFloat(document.getElementById('cofreMeta').value.replace(',', '.')) || 0;
    const atual = parseFloat(document.getElementById('cofreAtual').value.replace(',', '.')) || 0;
    const mesAlvo = parseInt(document.getElementById('cofreMesAlvo').value);
    const icone = document.getElementById('cofreIcone').value;
    if(!nome){ toast('Digite o nome'); return; }
    if(meta <= 0){ toast('Meta deve ser maior que zero'); return; }
    if(editandoCofre){
      await atualizaCofre(editandoCofre, { nome, meta, atual, mesAlvo, icone });
      toast('Cofre atualizado');
    } else {
      await criaCofre({ nome, meta, atual, mesAlvo, icone });
      toast('Cofre criado');
    }
    fechaModais();
  };

  document.getElementById('btnDeletarCofre').onclick = async () => {
    if(!editandoCofre) return;
    if(confirm('Excluir esse cofre?')){
      await deletaCofre(editandoCofre);
      fechaModais();
      toast('Cofre excluído');
    }
  };
}

// ============================================================
// SEED v2.8 — importação única consolidada
// ============================================================
function bindSeedV28(){
  const btn = document.getElementById('btnSeedV28');
  const status = document.getElementById('seedV28Status');
  const box = document.getElementById('seedBoxV28');
  if(!btn) return;

  getDoc(doc(db, 'config', 'seedV28Executado')).then(snap => {
    if(snap.exists() && box){
      box.style.display = 'none';
    }
  }).catch(()=>{});

  btn.onclick = async () => {
    btn.disabled = true;
    status.textContent = 'Importando… pode levar 30-60 segundos.';
    try {
      const mod = await import('./seed-v28.js');
      await mod.executaSeedV28(db, toast);
      status.innerHTML = '<span style="color:var(--green)">✓ Importação concluída! Confira nas abas Hoje, Histórico e Futuro.</span>';
      setTimeout(() => { if(box) box.style.display = 'none'; }, 4000);
    } catch(err){
      console.error(err);
      status.innerHTML = `<span style="color:var(--red)">Erro: ${err.message}. Veja o console (F12).</span>`;
      btn.disabled = false;
    }
  };
}

function bindSeedV29(){
  const btn = document.getElementById('btnSeedV29');
  const status = document.getElementById('seedV29Status');
  const box = document.getElementById('seedBoxV29');
  if(!btn) return;

  getDoc(doc(db, 'config', 'seedV29Executado')).then(snap => {
    if(snap.exists() && box){
      box.style.display = 'none';
    }
  }).catch(()=>{});

  btn.onclick = async () => {
    btn.disabled = true;
    status.textContent = 'Aplicando v2.9… aguarde.';
    try {
      const mod = await import('./seed-v29.js');
      await mod.executaSeedV29(db, toast);
      status.innerHTML = '<span style="color:var(--green)">✓ Concluído! Confira aba Hoje.</span>';
      setTimeout(() => { if(box) box.style.display = 'none'; }, 4000);
    } catch(err){
      console.error(err);
      status.innerHTML = `<span style="color:var(--red)">Erro: ${err.message}. Veja o console (F12).</span>`;
      btn.disabled = false;
    }
  };
}

function bindSeedV211(){
  const btn = document.getElementById('btnSeedV211');
  const status = document.getElementById('seedV211Status');
  const box = document.getElementById('seedBoxV211');
  if(!btn) return;

  getDoc(doc(db, 'config', 'seedV211Executado')).then(snap => {
    if(snap.exists() && box){
      box.style.display = 'none';
    }
  }).catch(()=>{});

  btn.onclick = async () => {
    btn.disabled = true;
    status.textContent = 'Atualizando carteira…';
    try {
      const mod = await import('./seed-v211.js');
      await mod.executaSeedV211(db, toast);
      status.innerHTML = '<span style="color:var(--green)">✓ Carteira atualizada!</span>';
      setTimeout(() => { if(box) box.style.display = 'none'; }, 4000);
    } catch(err){
      console.error(err);
      status.innerHTML = `<span style="color:var(--red)">Erro: ${err.message}. Veja o console (F12).</span>`;
      btn.disabled = false;
    }
  };
}

// ============================================================
// BOOTSTRAP
// ============================================================
async function init(){
  try {
    document.getElementById('app').classList.remove('hidden');

    bindTabs();
    bindFab();
    bindMesNav();
    bindModais();
    bindModalAtivo();
    bindProjecaoSliders();
    bindPdfUpload();
    bindModalCategoria();
    bindModalNovoAtivo();
    bindModalCofre();
    bindModalEditarLanc();
    bindModalVirtual();
    bindModalEditarRec();
    bindModalSaldo();
    bindSeedV28();
    bindSeedV29();
    bindSeedV211();

    await semeaSeNecessario();
    escutaCategorias();
    escutaLancamentos();
    escutaEstabelecimentos();
    escutaInvestimentos();
    escutaCofres();
    escutaRecorrencias();
    escutaSaldo();

    // Plano A: carrega lançamentos reais de mai/26 em diante pra mesclar com histórico semente
    await carregaHistoricoRealNovo();
    render();
  } catch(err){
    console.error('Erro init:', err);
    markSync('err');
    toast('Erro de conexão. Veja o console.');
  }
}

// dá um instante pro splash sumir
window.__s=state; window.__r={renderHoje,mudaMes,CATEGORIAS_SEMENTE,INVEST_SEMENTE,GRAO_SEMENTE,MESES_NOMES}; window.__s=state; window.__r={renderHoje,mudaMes,CATEGORIAS_SEMENTE,INVEST_SEMENTE,GRAO_SEMENTE}; window.__s=state; window.__r={renderHoje,renderLancamentos,abreModalVirtual,lancamentosVirtuaisDoMes,CATEGORIAS_SEMENTE,INVEST_SEMENTE,GRAO_SEMENTE};

// ============================================================
// GATE DE LOGIN — mostra tela de entrada até autenticar com
// conta Google permitida; só então inicia o app.
// ============================================================
let appIniciado = false;

function mostraTela(id){
  ['loginScreen', 'accessDenied', 'app'].forEach(tid => {
    document.getElementById(tid).classList.toggle('hidden', tid !== id);
  });
}

document.getElementById('btnGoogleLogin').onclick = async () => {
  try {
    await signInWithPopup(auth, googleProvider);
  } catch(err){
    // Popup falha em PWA instalado (iOS Safari standalone bloqueia popup) — cai pro redirect.
    console.error('Erro no login via popup, tentando redirect:', err);
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch(err2){
      console.error('Erro no login via redirect:', err2);
      toast('Não deu pra entrar. Tenta de novo.');
    }
  }
};
document.getElementById('btnLogout').onclick = () => signOut(auth);
document.getElementById('btnLogoutHdr').onclick = () => signOut(auth);

onAuthStateChanged(auth, (user) => {
  if(!user){
    mostraTela('loginScreen');
    return;
  }
  if(!ALLOWED_EMAILS.includes(user.email)){
    document.getElementById('accessDeniedMsg').textContent =
      `${user.email} não tem acesso ao Bolso.`;
    mostraTela('accessDenied');
    return;
  }
  mostraTela('app');
  if(!appIniciado){
    appIniciado = true;
    setTimeout(init, 1300);
  }
});
