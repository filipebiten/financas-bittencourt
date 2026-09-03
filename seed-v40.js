// ============================================================
// SEED v4.0 — SINCRONIZAR COM A REALIDADE (setembro/2026)
//
// Ordem de serviço: alinhar o app com o extrato Santander de agosto/2026
// e com as decisões estratégicas já tomadas.
//
// RODA UMA VEZ. Idempotente (pode rodar de novo sem estragar).
// Rode no console (F12) LOGADO no app:
//   const m = await import('./seed-v40.js?v=1'); await m.executaSeedV40();
//
// NÃO apaga histórico. Faz:
//   1. Ancora saldo real da conta em R$ 820,29 (01/09/2026)
//   2. Substitui a carteira ARCA (4 quadrantes) + Grão + saldo parado
//   3. Bolsos Tesouro Selic 2031 FORA do ARCA (reserva + férias)
//   4. Substitui os tetos de todas as categorias
//   5. Corrige / encerra / cadastra recorrências
//   6. Garante os cofres (IPVA, Manutenção) + cria Aniversários
//
// Tudo é logado no console com prefixo [seed-v40].
// ============================================================

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore, doc, setDoc, updateDoc, addDoc, collection, getDoc, getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC6q9FtRdqdvVG4rbKQGfW97hzjagppeao",
  authDomain: "financas-bittencourt.firebaseapp.com",
  projectId: "financas-bittencourt",
  storageBucket: "financas-bittencourt.appspot.com",
};

export async function executaSeedV40(dbArg, toastArg){
  // Reusa o Firebase do app (traz o login) se rodar no console; senão inicializa o próprio.
  const db = dbArg || getFirestore(getApps().length ? getApp() : initializeApp(firebaseConfig, 'seedv40'));
  const log = (...a) => console.log('[seed-v40]', ...a);
  const toast = toastArg || (m => log(m));
  const norm = s => (s ?? '').toString().toLowerCase();

  const flagRef = doc(db, 'config', 'seedV40Executado');
  if((await getDoc(flagRef)).exists()){
    if(!confirm('⚠️ seed-v40 já rodou. É idempotente (re-aplica os mesmos valores). Continuar?')){
      log('Cancelado.'); return;
    }
  }

  // ---------------------------------------------------------
  // 1. SALDO ANCORADO — 01/09/2026
  // ---------------------------------------------------------
  await setDoc(doc(db, 'config', 'saldoConta'), {
    valor: 820.29,
    atualizadoEm: Date.now(),
  });
  log('1. Saldo ancorado: R$ 820,29');

  // ---------------------------------------------------------
  // 2 + 3. CARTEIRA ARCA + BOLSOS FORA DO ARCA
  // Selic 2031 vai em bolsosForaArca — o código já soma isso separado
  // dos 4 quadrantes (donut e % usam só totalArca).
  // ---------------------------------------------------------
  const carteiraRef = doc(db, 'investimentos', 'carteira');
  const grAntigo = ((await getDoc(carteiraRef)).data()?.grao) || {};

  await setDoc(carteiraRef, {
    arca: {
      acoesBR: [
        { nome: 'SOJA3', valor: 690.58 },
        { nome: 'BBDC4', valor: 477.36 },
        { nome: 'CMIG4', valor: 153.72 },
      ],
      fiis: [
        { nome: 'XPML11', valor: 513.25 },
        { nome: 'FIGS11', valor: 288.60 },
        { nome: 'BTHF11', valor: 204.93 },
      ],
      rendaFixa: [
        { nome: 'NTN-B1 Renda+ 2065',     valor: 486.42 },
        { nome: 'Tesouro Selic 2029',     valor: 395.30 },
        { nome: 'Tesouro Selic 2028',     valor: 197.77 },
        { nome: 'Tesouro Prefixado 2028', valor: 117.79 },
      ],
      internacional: [
        { nome: 'Rico Bitcoin Dólar FIMRL',  valor: 860.36, cripto: true },
        { nome: 'VCLT (Nomad · US$ 71,69)',  valor: 366.34 },
        { nome: 'Bitcoin direto (Bitybank)', valor: 157.94, cripto: true },
        { nome: 'NVDC34 (BDR NVIDIA)',       valor: 47.70 },
      ],
    },
    grao: { ...grAntigo, valor: 3498.71 },
    saldoCarteira: 19.23,
    bolsosForaArca: [
      { titulo: 'Tesouro Selic 2031', finalidade: 'Reserva de emergência', valor: 7403.43 },
      { titulo: 'Tesouro Selic 2031', finalidade: 'Cofre férias',          valor: 3898.63 },
    ],
    atualizadoEm: Date.now(),
  });
  log('2+3. Carteira ARCA trocada (total 4.958,06). Grão 3.498,71. Saldo parado 19,23.');
  log('     Bolsos Selic 2031 fora do ARCA: 7.403,43 + 3.898,63 = 11.431,82. Patrimônio 19.907,82.');

  // ---------------------------------------------------------
  // 4. TETOS DE CATEGORIA — soma alvo R$ 6.845
  // ---------------------------------------------------------
  const tetos = {
    moradia: 2350, alimentacao: 1200, restaurante: 150, transporte: 620,
    comunicacao: 320, seguros: 70, saude: 180, filhos: 150, dizimo: 787,
    pessoalfilipe: 60, pessoalmari: 100, assinaturas: 370, presentes: 80,
    investimentos: 408, outros: 0, lazer: 0, bancojuros: 0, impostos: 0,
  };
  const catsSnap = await getDocs(collection(db, 'categorias'));
  const catIds = new Set(catsSnap.docs.map(d => d.id));
  const semCat = [];
  let somaTetos = 0;
  for(const [id, teto] of Object.entries(tetos)){
    if(catIds.has(id)){
      await updateDoc(doc(db, 'categorias', id), { teto });
      somaTetos += teto;
    } else {
      semCat.push(id);
    }
  }
  log(`4. Tetos aplicados. Soma dos aplicados: R$ ${somaTetos} (alvo 6.845).`);
  if(semCat.length){
    log(`   ⚠️ ids da OS que NÃO existem no banco (ajustar manual): ${semCat.join(', ')}`);
    log(`   ids de categoria existentes no banco: ${[...catIds].sort().join(', ')}`);
  }

  // ---------------------------------------------------------
  // 5. RECORRÊNCIAS
  // ---------------------------------------------------------
  const recSnap = await getDocs(collection(db, 'recorrencias'));
  const recs = recSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const acha = pred => recs.filter(pred);
  const umUnico = (label, pred) => {
    const hits = acha(pred);
    if(hits.length === 1) return hits[0];
    log(`   ⚠️ "${label}": ${hits.length} matches — PULADO. ${hits.map(h => `${h.descricao}=${h.valor}`).join(' | ')}`);
    return null;
  };

  // 5a. corrigir valor + categoria
  const correcoes = [
    ['Porto Seguro',        r => norm(r.descricao).includes('porto'),                                            66.05, 'seguros'],
    ['ALSOL',               r => norm(r.descricao).includes('alsol'),                                           196.22, 'moradia'],
    ['Amazon Prime Canais', r => norm(r.descricao).includes('prime') && norm(r.descricao).includes('canais'),    29.90, 'assinaturas'],
    ['Claude AI',           r => norm(r.descricao).includes('claude'),                                          120.69, 'assinaturas'],
  ];
  for(const [label, pred, valor, categoriaId] of correcoes){
    const r = umUnico(label, pred);
    if(r){
      await updateDoc(doc(db, 'recorrencias', r.id), { valor, categoriaId });
      log(`5a. ${label}: ${r.valor} -> ${valor}`);
    }
  }

  // 5b. encerrar Minas Brasil (dataFim = 27/08/2026, para de materializar)
  {
    const r = umUnico('Minas Brasil', x => norm(x.descricao).includes('minas brasil'));
    if(r){
      await updateDoc(doc(db, 'recorrencias', r.id), { dataFim: new Date(2026, 7, 27, 12, 0).toISOString() });
      log('5b. Minas Brasil encerrada (dataFim 27/08/2026).');
    }
  }

  // 5c. novas — check-antes: se já existe equivalente, atualiza; senão cria
  const dataInicio = new Date(2026, 8, 1, 12, 0).toISOString();
  const criaOuAtualiza = async (label, pred, dados) => {
    const hits = acha(pred);
    if(hits.length >= 1){
      await updateDoc(doc(db, 'recorrencias', hits[0].id), dados);
      log(`5c. ${label}: já existia ("${hits[0].descricao}") -> atualizado (valor ${dados.valor})` +
          (hits.length > 1 ? ` [${hits.length} matches, só o 1º]` : ''));
    } else {
      await addDoc(collection(db, 'recorrencias'), {
        ...dados, dataInicio, criadoEm: Date.now(), origem: 'seed-v40',
      });
      log(`5c. ${label}: CRIADA (valor ${dados.valor}, dia ${dados.diaDoMes})`);
    }
  };

  await criaOuAtualiza('Tarifa Santander',
    r => norm(r.descricao).includes('santander') || (norm(r.descricao).includes('tarifa') && norm(r.descricao).includes('pacote')),
    { valor: 32.70, descricao: 'Tarifa pacote serviços Santander', categoriaId: 'bancojuros', diaDoMes: 25 });

  await criaOuAtualiza('TIM Mari',
    r => norm(r.descricao).includes('tim') && norm(r.descricao).includes('mari'),
    { valor: 98.99, descricao: 'TIM Mari', categoriaId: 'comunicacao', diaDoMes: 15 });

  await criaOuAtualiza('Apple Mari',
    r => norm(r.descricao).includes('icloud') || (norm(r.descricao).includes('apple') && norm(r.descricao).includes('mari')),
    { valor: 9.99, descricao: 'Apple Mari', categoriaId: 'assinaturas', diaDoMes: 11 });

  await criaOuAtualiza('Apple Filipe',
    r => norm(r.descricao).includes('apple') && norm(r.descricao).includes('filipe'),
    { valor: 66.90, descricao: 'Apple Filipe', categoriaId: 'assinaturas', diaDoMes: 17 });

  await criaOuAtualiza('Disney+',
    r => norm(r.descricao).includes('disney'),
    { valor: 29.90, descricao: 'Disney+', categoriaId: 'assinaturas', diaDoMes: 12 });

  // ---------------------------------------------------------
  // 6. COFRES (só dado — pausa de aporte e alerta de IPVA são código, passo separado)
  // ---------------------------------------------------------
  const cofSnap = await getDocs(collection(db, 'cofres'));
  const cofres = cofSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const achaCof = k => cofres.find(c => norm(c.nome).includes(k));

  const ipva = achaCof('ipva');
  if(ipva){ await updateDoc(doc(db, 'cofres', ipva.id), { meta: 1800, atual: 0, mesAlvo: 1 }); log('6. IPVA carro: 1800 / 0 / jan.'); }
  else log('6. ⚠️ cofre IPVA não encontrado.');

  const manut = achaCof('manuten');
  if(manut){ await updateDoc(doc(db, 'cofres', manut.id), { meta: 1800, atual: 0, mesAlvo: 12 }); log('6. Manutenção carro: 1800 / 0 / dez.'); }
  else log('6. ⚠️ cofre Manutenção não encontrado.');

  const aniv = achaCof('anivers');
  if(!aniv){
    await addDoc(collection(db, 'cofres'), {
      nome: 'Aniversários (Pedro + João)', icone: '🎂',
      meta: 3000, atual: 0, mesAlvo: 6, criadoEm: Date.now(),
    });
    log('6. Cofre Aniversários CRIADO (3000 / 0 / jun).');
  } else {
    log('6. Cofre Aniversários já existe — mantido.');
  }

  // ---------------------------------------------------------
  await setDoc(flagRef, { executadoEm: Date.now() });
  toast('✓ seed-v40 concluída. Confira: aba Hoje (saldo 820,29 + tetos), aba Investir (ARCA 4.958,06, bolsos Selic 2031). Recarregue o app.');
}
