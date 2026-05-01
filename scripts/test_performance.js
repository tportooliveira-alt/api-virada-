/**
 * Teste de performance e memória.
 * Insere volumes grandes de dados e mede tempo de resposta + uso de memória.
 */
const http = require("http");

function req(method, path, body, cookie) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: "localhost", port: 3000, path, method,
      headers: {
        "Content-Type": "application/json",
        "Cookie": cookie || "",
        ...(data ? { "Content-Length": Buffer.byteLength(data) } : {}),
      },
    };
    const start = Date.now();
    const r = http.request(opts, res => {
      let raw = "";
      res.on("data", c => raw += c);
      res.on("end", () => {
        const ck = res.headers["set-cookie"] || [];
        const ms = Date.now() - start;
        try { resolve({ status: res.statusCode, body: JSON.parse(raw || "{}"), cookie: ck.join("; "), ms }); }
        catch { resolve({ status: res.statusCode, body: raw, cookie: ck.join("; "), ms }); }
      });
    });
    r.on("error", reject);
    if (data) r.write(data);
    r.end();
  });
}

function memMB() {
  const m = process.memoryUsage();
  return { heapUsed: (m.heapUsed / 1024 / 1024).toFixed(1), rss: (m.rss / 1024 / 1024).toFixed(1) };
}

function brl(v) { return "R$ " + Number(v).toFixed(2).replace(".", ","); }

const CATS_EXP = ["Mercado","Energia","Transporte","Aluguel","Saúde","Delivery","Lazer","Cartão","Internet","Educação","Água","Outros"];
const CATS_INC = ["Salário","Venda","Serviço","Renda extra","Recebimento","Comissão","Outros"];
const PAYMENTS = ["Pix","Dinheiro","Débito","Crédito","Boleto"];
function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randVal(min, max) { return Math.round((min + Math.random() * (max - min)) * 100) / 100; }
function randDate() {
  const d = new Date(); d.setDate(d.getDate() - Math.floor(Math.random() * 365));
  return d.toISOString().split("T")[0];
}

async function run() {
  console.log("=== TESTE DE PERFORMANCE E MEMÓRIA ===\n");

  // Login
  const login = await req("POST", "/api/auth/login",
    { email: "tportooliveira@gmail.com", password: "virada123" });
  const CK = login.cookie;
  console.log("Login:", login.ms + "ms");

  // Estado inicial
  const base = await req("GET", "/api/finance", null, CK);
  const countBefore = (base.body.expenses?.length || 0) + (base.body.incomes?.length || 0);
  console.log("Registros atuais:", countBefore, "| GET em:", base.ms + "ms\n");

  const idsParaLimpar = [];

  // ── FASE 1: 50 lançamentos ────────────────────────────────
  console.log("── FASE 1: Inserir 50 lançamentos");
  const t1start = Date.now();
  for (let i = 0; i < 50; i++) {
    const isExp = Math.random() > 0.35;
    const r = await req("POST", "/api/finance", {
      action: isExp ? "addExpense" : "addIncome",
      payload: isExp ? {
        description: `Gasto#${i+1} ${rand(CATS_EXP)}`,
        value: randVal(5, 500), category: rand(CATS_EXP),
        date: randDate(), paymentMethod: rand(PAYMENTS),
        nature: Math.random() > 0.5 ? "essencial" : "impulso",
        scope: "casa", source: "app"
      } : {
        description: `Receita#${i+1} ${rand(CATS_INC)}`,
        value: randVal(50, 3000), category: rand(CATS_INC),
        date: randDate(), scope: "casa", source: "app"
      }
    }, CK);
    if (r.status === 200) {
      const bundle = r.body;
      // Pega o último ID inserido
      const allTx = [...(bundle.expenses || []), ...(bundle.incomes || [])];
      const desc = isExp ? `Gasto#${i+1}` : `Receita#${i+1}`;
      const item = allTx.find(t => t.description?.startsWith(desc));
      if (item) idsParaLimpar.push({ id: item.id, type: item.value > 0 ? (isExp ? "exp" : "inc") : "exp" });
    }
  }
  const t1 = Date.now() - t1start;
  const after50 = await req("GET", "/api/finance", null, CK);
  const count50 = (after50.body.expenses?.length || 0) + (after50.body.incomes?.length || 0);
  const exp50 = (after50.body.expenses || []).reduce((s, e) => s + Number(e.value), 0);
  const inc50 = (after50.body.incomes  || []).reduce((s, i) => s + Number(i.value), 0);
  console.log("  Registros totais:", count50);
  console.log("  Tempo inserção:  ", t1 + "ms (" + (t1/50).toFixed(0) + "ms/registro)");
  console.log("  GET após 50:     ", after50.ms + "ms");
  console.log("  Total despesas:  ", brl(exp50));
  console.log("  Total receitas:  ", brl(inc50));
  console.log("  Saldo:           ", brl(inc50 - exp50));
  console.log("  Memória cliente: ", memMB().heapUsed + " MB heap");

  // ── FASE 2: +150 lançamentos (total 200) ──────────────────
  console.log("\n── FASE 2: +150 lançamentos (total ~200)");
  const t2start = Date.now();
  for (let i = 0; i < 150; i++) {
    const isExp = Math.random() > 0.35;
    const r = await req("POST", "/api/finance", {
      action: isExp ? "addExpense" : "addIncome",
      payload: isExp ? {
        description: `LoteB#${i+1}`, value: randVal(1, 1000),
        category: rand(CATS_EXP), date: randDate(),
        paymentMethod: rand(PAYMENTS), nature: "essencial",
        scope: "casa", source: "app"
      } : {
        description: `LoteB#${i+1}`, value: randVal(10, 5000),
        category: rand(CATS_INC), date: randDate(),
        scope: "empresa", source: "app"
      }
    }, CK);
    if (r.status === 200) {
      const allTx = [...(r.body.expenses || []), ...(r.body.incomes || [])];
      const item = allTx.find(t => t.description === `LoteB#${i+1}`);
      if (item) idsParaLimpar.push({ id: item.id, type: isExp ? "exp" : "inc" });
    }
  }
  const t2 = Date.now() - t2start;
  const after200 = await req("GET", "/api/finance", null, CK);
  const count200 = (after200.body.expenses?.length || 0) + (after200.body.incomes?.length || 0);
  const expFull = (after200.body.expenses || []).reduce((s, e) => s + Number(e.value), 0);
  const incFull = (after200.body.incomes  || []).reduce((s, i) => s + Number(i.value), 0);
  console.log("  Registros totais:", count200);
  console.log("  Tempo inserção:  ", t2 + "ms (" + (t2/150).toFixed(0) + "ms/registro)");
  console.log("  GET após 200:    ", after200.ms + "ms");
  console.log("  Total despesas:  ", brl(expFull));
  console.log("  Total receitas:  ", brl(incFull));
  console.log("  Saldo:           ", brl(incFull - expFull));
  console.log("  Memória cliente: ", memMB().heapUsed + " MB heap");

  // ── TESTE: múltiplos GET rápidos (leitura sob carga) ──────
  console.log("\n── Leitura repetida: 10x GET com 200 registros");
  const readTimes = [];
  for (let i = 0; i < 10; i++) {
    const r = await req("GET", "/api/finance", null, CK);
    readTimes.push(r.ms);
  }
  const avgRead = (readTimes.reduce((a, b) => a + b, 0) / readTimes.length).toFixed(0);
  const maxRead = Math.max(...readTimes);
  const minRead = Math.min(...readTimes);
  console.log("  Tempos (ms):     ", readTimes.join(", "));
  console.log("  Média:           ", avgRead + "ms");
  console.log("  Min/Max:         ", minRead + "ms / " + maxRead + "ms");

  // ── TESTE: precisão com muitos números ────────────────────
  console.log("\n── Precisão numérica com 200 registros");
  const allExp = after200.body.expenses || [];
  const allInc = after200.body.incomes  || [];
  // Re-soma manualmente para verificar
  const manualExp = allExp.reduce((s, e) => s + Number(e.value), 0);
  const manualInc = allInc.reduce((s, i) => s + Number(i.value), 0);
  // Verifica que nenhum valor virou NaN
  const hasNaN = allExp.concat(allInc).some(t => isNaN(Number(t.value)));
  console.log("  Valores NaN:     ", hasNaN ? "SIM (PROBLEMA!)" : "NENHUM ✓");
  console.log("  Saldo calculado: ", brl(manualInc - manualExp));
  // Verifica valores negativos acidentais
  const negativas = allExp.concat(allInc).filter(t => Number(t.value) < 0);
  console.log("  Valores negativos:", negativas.length === 0 ? "NENHUM ✓" : negativas.length + " (PROBLEMA!)");
  // Verifica campos obrigatórios
  const semId = allExp.concat(allInc).filter(t => !t.id);
  const semData = allExp.concat(allInc).filter(t => !t.date);
  console.log("  Sem ID:          ", semId.length === 0 ? "NENHUM ✓" : semId.length + " (PROBLEMA!)");
  console.log("  Sem data:        ", semData.length === 0 ? "NENHUM ✓" : semData.length + " (PROBLEMA!)");

  // ── CLEANUP: remove todos os registros de teste ───────────
  console.log("\n── Limpeza: removendo", idsParaLimpar.length, "registros de teste");
  const tCleanStart = Date.now();
  const allTxFinal = [...allExp, ...allInc];
  // Remove por descrição (mais seguro)
  const toRemoveExp = allExp.filter(e => e.description?.match(/^(Gasto#|LoteB#)/));
  const toRemoveInc = allInc.filter(i => i.description?.match(/^(Receita#|LoteB#)/));
  for (const e of toRemoveExp) {
    await req("POST", "/api/finance", { action: "removeExpense", payload: { id: e.id } }, CK);
  }
  for (const i of toRemoveInc) {
    await req("POST", "/api/finance", { action: "removeIncome",  payload: { id: i.id } }, CK);
  }
  const tClean = Date.now() - tCleanStart;

  const afterClean = await req("GET", "/api/finance", null, CK);
  const expClean = (afterClean.body.expenses || []).reduce((s, e) => s + Number(e.value), 0);
  const incClean = (afterClean.body.incomes  || []).reduce((s, i) => s + Number(i.value), 0);
  const countClean = (afterClean.body.expenses?.length || 0) + (afterClean.body.incomes?.length || 0);
  console.log("  Limpeza em:      ", tClean + "ms");
  console.log("  Registros finais:", countClean, "(original:", countBefore + ")");
  console.log("  Saldo final:     ", brl(incClean - expClean));
  const baseExp = (base.body.expenses || []).reduce((s, e) => s + Number(e.value), 0);
  const baseInc = (base.body.incomes  || []).reduce((s, i) => s + Number(i.value), 0);
  const integro = Math.abs(expClean - baseExp) < 0.01 && Math.abs(incClean - baseInc) < 0.01;

  // ── SUMÁRIO ───────────────────────────────────────────────
  console.log("\n════ SUMÁRIO DE PERFORMANCE ═══════════════");
  console.log("  Inserção (50 reg):     ", (t1/50).toFixed(0) + "ms/reg");
  console.log("  Inserção (150 reg):    ", (t2/150).toFixed(0) + "ms/reg");
  console.log("  Leitura média (200 reg):", avgRead + "ms");
  console.log("  Leitura máxima:        ", maxRead + "ms");
  console.log("  Limpeza (200 remoções):", (tClean/(toRemoveExp.length + toRemoveInc.length)).toFixed(0) + "ms/remoção");
  console.log("  Integridade final:     ", integro ? "PERFEITA ✓" : "DIVERGENCIA ✗");
  console.log("  Memória Node.js:       ", memMB().heapUsed + " MB heap / " + memMB().rss + " MB RSS");
  console.log("\n  VEREDICTO:");
  if (avgRead < 100 && maxRead < 300) console.log("  ✅ LEITURA RÁPIDA — rodará bem no celular");
  else console.log("  ⚠️  LEITURA LENTA — pode precisar otimizar");
  if (integro) console.log("  ✅ INTEGRIDADE PERFEITA — todos os números batem");
  else console.log("  ❌ DIVERGENCIA DETECTADA — revisar");
}

run().catch(e => { console.error("ERRO:", e.message, e.stack); process.exit(1); });
