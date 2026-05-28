// ============================================================
// BOLSO · Bittencourt — App Financeiro Familiar
// Stack: Firebase Firestore + Vanilla JS + GitHub Pages
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, collection, addDoc,
  query, where, orderBy, onSnapshot, deleteDoc, updateDoc, getDocs, writeBatch
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

  // Restaurante / Delivery
  'prime churrascaria': 'restaurante',
  'ifd': 'restaurante',
  'ifood': 'restaurante',
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
  'rede faleiros': 'transporte',
  'uber': 'transporte',
  'campo grande parking': 'transporte',
  'park': 'transporte',

  // Saúde
  'drogasil': 'saude',
  'unimed': 'saude',
  'oticas carol': 'saude',
  'saude livre': 'saude',

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
  estabelecimentos: {},  // texto digitado -> categoriaId
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
}

async function escutaCategorias(){
  const q = query(collection(db, 'categorias'), orderBy('ordem'));
  onSnapshot(q, (snap) => {
    state.categorias = snap.docs.map(d => ({id: d.id, ...d.data()}));
    state.categorias.sort((a,b) => (a.ordem||99) - (b.ordem||99));
    render();
  });
}

async function escutaLancamentos(){
  const ini = new Date(state.ano, state.mes, 1).getTime();
  const fim = new Date(state.ano, state.mes+1, 0, 23,59,59).getTime();
  const q = query(
    collection(db, 'lancamentos'),
    where('ts', '>=', ini),
    where('ts', '<=', fim),
    orderBy('ts', 'desc')
  );
  onSnapshot(q, (snap) => {
    state.lancamentos = snap.docs.map(d => ({id: d.id, ...d.data()}));
    render();
    markSync('ok');
  }, (err) => {
    console.error('Erro escutando lançamentos:', err);
    markSync('err');
  });
}

async function escutaEstabelecimentos(){
  onSnapshot(collection(db, 'estabelecimentos'), (snap) => {
    state.estabelecimentos = {};
    snap.docs.forEach(d => {
      state.estabelecimentos[d.id] = d.data().categoriaId;
    });
  });
}

async function novoLancamento(valor, descricao, categoriaId, dataIso){
  const data = dataIso ? new Date(dataIso + 'T12:00:00') : new Date();
  await addDoc(collection(db, 'lancamentos'), {
    valor: valor,
    descricao: descricao,
    categoriaId: categoriaId,
    ts: data.getTime(),
    data: data.toISOString(),
    criadoEm: Date.now(),
  });
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

// ============================================================
// RENDER
// ============================================================
function render(){
  renderHeader();
  renderHoje();
  renderHistorico();
  renderCategorias();
  renderLancamentos();
  renderFuturo();
}

function renderHeader(){
  document.getElementById('hdrTitle').textContent = `${MESES_NOMES[state.mes]} · ${state.ano}`;
  document.getElementById('hdrSub').textContent = `dia ${diaDoMes()} de ${diasNoMes()}`;
}

function gastoPorCategoria(catId){
  return state.lancamentos
    .filter(l => l.categoriaId === catId)
    .reduce((acc, l) => acc + (l.valor||0), 0);
}

function renderHoje(){
  const tetoTotal = state.categorias.reduce((acc,c) => acc + (c.teto||0), 0);
  const gastoTotal = state.lancamentos.reduce((acc,l) => acc + (l.valor||0), 0);
  const pct = tetoTotal ? (gastoTotal / tetoTotal) : 0;

  // Termômetro principal
  document.getElementById('gastoMes').textContent = fmtBig(gastoTotal);
  document.getElementById('tetoMes').textContent = fmt(tetoTotal);

  // Barra
  const fill = document.getElementById('thermoFill');
  fill.style.width = Math.min(100, pct * 100) + '%';
  fill.classList.remove('amber','red');
  if(pct >= 0.9) fill.classList.add('red');
  else if(pct >= 0.7) fill.classList.add('amber');

  // Marcador de dia (proporção do mês passada)
  const propDia = diaDoMes() / diasNoMes();
  document.getElementById('thermoMarker').style.left = (propDia * 100) + '%';

  // Projeção: no ritmo atual, fecha em quanto?
  const dia = diaDoMes();
  const total = diasNoMes();
  const projecao = dia > 0 ? (gastoTotal / dia) * total : 0;
  const elRitmo = document.getElementById('ritmoFech');
  const fechaMaior = projecao > tetoTotal;
  elRitmo.textContent = `Fecha em ${fmt(projecao)}`;
  elRitmo.className = 'foot-val ' + (fechaMaior ? 'danger' : 'ok');

  // Disponível
  const falta = tetoTotal - gastoTotal;
  document.getElementById('dispMes').textContent = falta >= 0 ? fmt(falta) : `−${fmt(Math.abs(falta))}`;

  // Aviso julho
  const dias = diasAteJulho();
  document.getElementById('diasJulho').textContent = dias;
  if(dias <= 0 || dias > 90){
    document.getElementById('warnJulho').style.display = 'none';
  }

  // Lista categorias
  const list = document.getElementById('catsList');
  list.innerHTML = '';
  state.categorias.forEach(cat => {
    const gasto = gastoPorCategoria(cat.id);
    const teto = cat.teto || 0;
    const p = teto ? gasto / teto : 0;
    let cls = 'g', clsFill = '';
    if(p >= 0.9){ cls = 'r'; clsFill = 'r'; }
    else if(p >= 0.7){ cls = 'a'; clsFill = 'a'; }

    const el = document.createElement('div');
    el.className = 'cat';
    el.innerHTML = `
      <div class="cat-left">
        <div class="cat-name"><span class="cat-dot ${cls}"></span>${cat.icone||''} ${cat.nome}</div>
        <div class="cat-bar"><div class="cat-bar-fill ${clsFill}" style="width:${Math.min(100,p*100)}%"></div></div>
      </div>
      <div class="cat-right">
        <div class="cat-spent">${fmt(gasto)}</div>
        <div class="cat-of">de ${fmt(teto)}</div>
      </div>
    `;
    list.appendChild(el);
  });
}

function renderHistorico(){
  const meses = Object.keys(HISTORICO_MENSAL).sort();
  if(meses.length === 0) return;

  // série conforme categoria ativa
  const serie = meses.map(m => {
    if(histCategoriaAtiva === 'total'){
      return Object.values(HISTORICO_MENSAL[m]).reduce((a,b)=>a+b,0);
    }
    return HISTORICO_MENSAL[m][histCategoriaAtiva] || 0;
  });

  const ultimo = serie[serie.length-1];
  const penultimo = serie[serie.length-2] || ultimo;
  const elBig = document.getElementById('chartBigVal');
  if(elBig) elBig.textContent = fmt(ultimo);

  // tendência
  const elTrend = document.getElementById('chartTrend');
  if(elTrend){
    const delta = ultimo - penultimo;
    const pct = penultimo ? Math.round((delta/penultimo)*100) : 0;
    elTrend.className = 'chart-trend ' + (delta > 0 ? 'up' : 'down');
    elTrend.textContent = (delta > 0 ? '↑ ' : '↓ ') + Math.abs(pct) + '% vs mês anterior';
  }

  // desenhar linha SVG
  const svg = document.getElementById('lineChart');
  if(svg){
    const W = 320, H = 140, pad = 8;
    const max = Math.max(...serie) * 1.1;
    const min = Math.min(...serie) * 0.9;
    const range = max - min || 1;
    const pts = serie.map((v,i) => {
      const x = pad + (i/(serie.length-1)) * (W - pad*2);
      const y = H - pad - ((v-min)/range) * (H - pad*2);
      return [x, y];
    });
    const linePath = pts.map((p,i) => (i===0?'M':'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
    const areaPath = linePath + ` L${pts[pts.length-1][0].toFixed(1)},${H-pad} L${pts[0][0].toFixed(1)},${H-pad} Z`;

    svg.innerHTML = `
      <defs>
        <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#c4622d" stop-opacity="0.18"/>
          <stop offset="100%" stop-color="#c4622d" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path d="${areaPath}" fill="url(#grad)"/>
      <path d="${linePath}" fill="none" stroke="#c4622d" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      ${pts.map((p,i) => i===pts.length-1 ? `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="4" fill="#c4622d"/>` : '').join('')}
    `;
  }

  // labels X
  const elX = document.getElementById('chartXLabels');
  if(elX){
    elX.innerHTML = meses.map((m,i) =>
      (i % 2 === 0) ? `<span>${HIST_MESES_LBL[m]}</span>` : `<span></span>`
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

  // comparativo: média 12m vs teto
  const cmp = document.getElementById('compareList');
  if(cmp && state.categorias.length){
    const itens = state.categorias.filter(c => c.id !== 'outros' && c.id !== 'moradia').map(cat => {
      const vals = meses.map(m => HISTORICO_MENSAL[m][cat.id] || 0);
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
    el.onclick = () => abreModalTeto(cat);
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
  if(state.lancamentos.length === 0){
    box.innerHTML = '<div class="empty">Nenhum lançamento ainda este mês.</div>';
    return;
  }
  box.innerHTML = '';
  state.lancamentos.forEach(l => {
    const cat = state.categorias.find(c => c.id === l.categoriaId);
    const data = new Date(l.ts);
    const dia = data.getDate().toString().padStart(2,'0');
    const mes = (data.getMonth()+1).toString().padStart(2,'0');
    const el = document.createElement('div');
    el.className = 'lanc';
    el.innerHTML = `
      <div class="lanc-left">
        <div class="lanc-desc">${l.descricao || '—'}</div>
        <div class="lanc-meta">${dia}/${mes} · ${cat ? (cat.icone||'') + ' ' + cat.nome : 'Sem categoria'}</div>
      </div>
      <div class="lanc-val">${fmt(l.valor||0)}</div>
    `;
    el.onclick = () => {
      if(confirm(`Excluir "${l.descricao}" (${fmt(l.valor)})?`)){
        deletaLancamento(l.id).then(() => toast('Lançamento excluído'));
      }
    };
    box.appendChild(el);
  });
}

function renderFuturo(){
  const tetoTotal = state.categorias.reduce((acc,c) => acc + (c.teto||0), 0);
  const folga = 7804.93 - tetoTotal;
  document.getElementById('projFolga').textContent = `${fmt(folga*12)} / ano de folga`;
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

function abreModalAdd(){
  document.getElementById('inpValor').value = '';
  document.getElementById('inpDesc').value = '';
  document.getElementById('autoCat').textContent = '';
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

  // máscara monetária leve
  document.getElementById('inpValor').addEventListener('input', e => {
    let v = e.target.value.replace(/[^\d,]/g, '');
    e.target.value = v;
  });

  document.getElementById('micHint').onclick = () => {
    toast('Toque no campo descrição e use o microfone do teclado');
    document.getElementById('inpDesc').focus();
  };

  document.getElementById('btnSalvar').onclick = async () => {
    const valor = parseFloat(document.getElementById('inpValor').value.replace(',', '.'));
    const desc = document.getElementById('inpDesc').value.trim();
    const cat = document.getElementById('inpCat').value;
    const data = document.getElementById('inpData').value;

    if(!valor || valor <= 0){
      toast('Informe um valor válido');
      return;
    }
    if(!desc){
      toast('Adicione uma descrição');
      return;
    }

    // verificar se é estabelecimento desconhecido
    const detectado = detectaCategoria(desc);
    if(!detectado && !state.estabelecimentos[normaliza(desc).slice(0,60)]){
      // abrir modal de aprendizado
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
        await novoLancamento(valor, desc, catEscolhida, data);
        fechaModais();
        toast('Lançamento salvo');
      };
      return;
    }

    await novoLancamento(valor, desc, cat, data);
    fechaModais();
    toast('Lançamento salvo');
  };
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
// BOOTSTRAP
// ============================================================
async function init(){
  try {
    document.getElementById('app').classList.remove('hidden');

    bindTabs();
    bindFab();
    bindModais();

    await semeaSeNecessario();
    escutaCategorias();
    escutaLancamentos();
    escutaEstabelecimentos();
  } catch(err){
    console.error('Erro init:', err);
    markSync('err');
    toast('Erro de conexão. Veja o console.');
  }
}

// dá um instante pro splash sumir
setTimeout(init, 1300);
