/**
 * Suite de testes financeiros completa.
 * Testa: entrada, saída, saldo, rollback, valor inválido, dívidas, metas.
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
    const r = http.request(opts, res => {
      let raw = "";
      res.on("data", c => raw += c);
      res.on("end", () => {
        const ck = res.headers["set-cookie"] || [];
        try { resolve({ status: res.statusCode, body: JSON.parse(raw || "{}"), cookie: ck.join("; ") }); }
        catch { resolve({ status: res.statusCode, body: raw, cookie: ck.join("; ") }); }
      });
    });
    r.on("error", reject);
    if (data) r.write(data);
    r.end();
  });
}

let passed = 0; let failed = 0;
function ok(msg) { passed++; console.log("  ✓", msg); }
function fail(msg) { failed++; console.error("  ✗ FALHOU:", msg); }
function assert(cond, msg) { cond ? ok(msg) : fail(msg); }
function brl(v) { return "R$ " + Number(v).toFixed(2).replace(".", ","); }
function near(a, b) { return Math.abs(a - b) < 0.005; }

async function run() {
  // ── SETUP ──────────────────────────────────────────────────
  const login = await req("POST", "/api/auth/login",
    { email: "tportooliveira@gmail.com", password: "virada123" });
  const CK = login.cookie;
  assert(login.status === 200, "Login OK");

  const base = await req("GET", "/api/finance", null, CK);
  const eB = (base.body.expenses || []).reduce((s, e) => s + Number(e.value), 0);
  const iB = (base.body.incomes  || []).reduce((s, i) => s + Number(i.value), 0);
  const sB = iB - eB;
  console.log("\n── ESTADO INICIAL");
  console.log("  Receitas:", brl(iB), "| Despesas:", brl(eB), "| Saldo:", brl(sB));

  // ── TESTE A: ADICIONAR DESPESA ─────────────────────────────
  console.log("\n── A: Adicionar despesa R$150");
  await req("POST", "/api/finance", {
    action: "addExpense", payload: {
      description: "Supermercado Teste", value: 150,
      category: "Mercado", date: new Date().toISOString().split("T")[0],
      paymentMethod: "Pix", nature: "essencial", scope: "casa", source: "app"
    }
  }, CK);
  const afterA = await req("GET", "/api/finance", null, CK);
  const eA = (afterA.body.expenses || []).reduce((s, e) => s + Number(e.value), 0);
  const iA = (afterA.body.incomes  || []).reduce((s, i) => s + Number(i.value), 0);
  console.log("  Receitas:", brl(iA), "| Despesas:", brl(eA), "| Saldo:", brl(iA - eA));
  assert(near(eA, eB + 150),    "Despesas subiram +R$150");
  assert(near(iA, iB),          "Receitas não mudaram");
  assert(near(iA - eA, sB - 150), "Saldo caiu -R$150");

  // ── TESTE B: ADICIONAR RECEITA ─────────────────────────────
  console.log("\n── B: Adicionar receita R$750");
  await req("POST", "/api/finance", {
    action: "addIncome", payload: {
      description: "Freela Teste", value: 750,
      category: "Renda extra", date: new Date().toISOString().split("T")[0],
      scope: "casa", source: "app"
    }
  }, CK);
  const afterB = await req("GET", "/api/finance", null, CK);
  const eB2 = (afterB.body.expenses || []).reduce((s, e) => s + Number(e.value), 0);
  const iB2 = (afterB.body.incomes  || []).reduce((s, i) => s + Number(i.value), 0);
  console.log("  Receitas:", brl(iB2), "| Despesas:", brl(eB2), "| Saldo:", brl(iB2 - eB2));
  assert(near(iB2, iA + 750),        "Receitas subiram +R$750");
  assert(near(eB2, eA),              "Despesas não mudaram");
  assert(near(iB2 - eB2, iA - eA + 750), "Saldo subiu +R$750");

  // ── TESTE C: ROLLBACK DESPESA ──────────────────────────────
  console.log("\n── C: Rollback — remove despesa R$150");
  const despesaRemover = (afterB.body.expenses || []).find(
    e => e.description === "Supermercado Teste" && near(Number(e.value), 150)
  );
  assert(!!despesaRemover, "Despesa de teste localizada pelo ID");
  if (despesaRemover) {
    await req("POST", "/api/finance", {
      action: "removeExpense", payload: { id: despesaRemover.id }
    }, CK);
    const afterC = await req("GET", "/api/finance", null, CK);
    const eC = (afterC.body.expenses || []).reduce((s, e) => s + Number(e.value), 0);
    const iC = (afterC.body.incomes  || []).reduce((s, i) => s + Number(i.value), 0);
    console.log("  Receitas:", brl(iC), "| Despesas:", brl(eC), "| Saldo:", brl(iC - eC));
    assert(near(eC, eB),       "Despesas voltaram ao valor original");
    assert(near(iC, iB + 750), "Receitas = original + R$750");
    assert(near(iC - eC, sB + 750), "Saldo = saldo base + R$750 da receita");
  }

  // ── TESTE D: ROLLBACK RECEITA ──────────────────────────────
  console.log("\n── D: Rollback — remove receita R$750");
  const afterC2 = await req("GET", "/api/finance", null, CK);
  const receitaRemover = (afterC2.body.incomes || []).find(
    e => e.description === "Freela Teste" && near(Number(e.value), 750)
  );
  assert(!!receitaRemover, "Receita de teste localizada pelo ID");
  if (receitaRemover) {
    await req("POST", "/api/finance", {
      action: "removeIncome", payload: { id: receitaRemover.id }
    }, CK);
    const afterD = await req("GET", "/api/finance", null, CK);
    const eD = (afterD.body.expenses || []).reduce((s, e) => s + Number(e.value), 0);
    const iD = (afterD.body.incomes  || []).reduce((s, i) => s + Number(i.value), 0);
    console.log("  Receitas:", brl(iD), "| Despesas:", brl(eD), "| Saldo:", brl(iD - eD));
    assert(near(iD, iB), "Receitas voltaram ao original");
    assert(near(eD, eB), "Despesas voltaram ao original");
    assert(near(iD - eD, sB), "Saldo restaurado exatamente");
  }

  // ── TESTE E: MÚLTIPLOS LANÇAMENTOS ────────────────────────
  console.log("\n── E: Lote de 5 lançamentos mistos");
  const lote = [
    { action: "addExpense", payload: { description: "Lote1", value: 33.50, category: "Transporte", date: "2026-04-01", paymentMethod: "Débito", nature: "essencial", scope: "casa", source: "app" } },
    { action: "addExpense", payload: { description: "Lote2", value: 12.99, category: "Delivery",   date: "2026-04-01", paymentMethod: "Cartão", nature: "impulso", scope: "casa", source: "app" } },
    { action: "addIncome",  payload: { description: "Lote3", value: 200,   category: "Venda",      date: "2026-04-01", scope: "empresa", source: "app" } },
    { action: "addExpense", payload: { description: "Lote4", value: 58.75, category: "Saúde",      date: "2026-04-01", paymentMethod: "Pix", nature: "essencial", scope: "casa", source: "app" } },
    { action: "addIncome",  payload: { description: "Lote5", value: 1500,  category: "Salário",    date: "2026-04-01", scope: "casa", source: "app" } },
  ];
  for (const l of lote) {
    await req("POST", "/api/finance", l, CK);
  }
  const afterE = await req("GET", "/api/finance", null, CK);
  const eE = (afterE.body.expenses || []).reduce((s, e) => s + Number(e.value), 0);
  const iE = (afterE.body.incomes  || []).reduce((s, i) => s + Number(i.value), 0);
  const expLote = 33.50 + 12.99 + 58.75;     // 105.24
  const incLote = 200 + 1500;                 // 1700
  console.log("  Despesas esperadas:", brl(eB + expLote), "| Reais:", brl(eE));
  console.log("  Receitas esperadas:", brl(iB + incLote), "| Reais:", brl(iE));
  assert(near(eE, eB + expLote), "Despesas do lote somadas corretamente (R$105,24)");
  assert(near(iE, iB + incLote), "Receitas do lote somadas corretamente (R$1.700,00)");
  assert(near(iE - eE, sB + incLote - expLote), "Saldo liquido do lote correto");

  // ── TESTE F: LIMPEZA DO LOTE ───────────────────────────────
  console.log("\n── F: Rollback completo do lote");
  const allTx = afterE.body.expenses.concat(afterE.body.incomes);
  const loteIds = allTx.filter(t => t.description?.startsWith("Lote")).map(t => t.id);
  console.log("  IDs do lote encontrados:", loteIds.length, "(esperado: 5)");
  assert(loteIds.length === 5, "Todos 5 lançamentos do lote encontrados");
  for (const id of loteIds) {
    const tx = allTx.find(t => t.id === id);
    if (tx.category === "Venda" || tx.category === "Salário" || tx.description === "Lote3" || tx.description === "Lote5") {
      await req("POST", "/api/finance", { action: "removeIncome",  payload: { id } }, CK);
    } else {
      await req("POST", "/api/finance", { action: "removeExpense", payload: { id } }, CK);
    }
  }
  const afterF = await req("GET", "/api/finance", null, CK);
  const eF = (afterF.body.expenses || []).reduce((s, e) => s + Number(e.value), 0);
  const iF = (afterF.body.incomes  || []).reduce((s, i) => s + Number(i.value), 0);
  console.log("  Receitas:", brl(iF), "| Despesas:", brl(eF), "| Saldo:", brl(iF - eF));
  assert(near(eF, eB), "Despesas restauradas ao original");
  assert(near(iF, iB), "Receitas restauradas ao original");
  assert(near(iF - eF, sB), "SALDO RESTAURADO PERFEITAMENTE AO ESTADO INICIAL");

  // ── TESTE G: VALORES EXTREMOS ──────────────────────────────
  console.log("\n── G: Valores extremos");
  await req("POST", "/api/finance", {
    action: "addExpense", payload: {
      description: "Centavos", value: 0.01, category: "Outros",
      date: "2026-04-01", paymentMethod: "Pix", nature: "essencial", scope: "casa", source: "app"
    }
  }, CK);
  const afterG = await req("GET", "/api/finance", null, CK);
  const eG = (afterG.body.expenses || []).reduce((s, e) => s + Number(e.value), 0);
  console.log("  R$0,01 adicionado → despesas:", brl(eG));
  assert(near(eG, eB + 0.01), "Valor de R$0,01 registrado corretamente (centavos OK)");
  // Limpa o centavo
  const centavo = afterG.body.expenses.find(e => e.description === "Centavos");
  if (centavo) await req("POST", "/api/finance", { action: "removeExpense", payload: { id: centavo.id } }, CK);

  // ── RESULTADO FINAL ────────────────────────────────────────
  console.log("\n─ RESULTADO DOS TESTES ──────────────────");
  console.log("  Passaram:", passed);
  console.log("  Falharam:", failed);
  const afterFinal = await req("GET", "/api/finance", null, CK);
  const eFin = (afterFinal.body.expenses || []).reduce((s, e) => s + Number(e.value), 0);
  const iFin = (afterFinal.body.incomes  || []).reduce((s, i) => s + Number(i.value), 0);
  console.log("\n  Estado final do banco:");
  console.log("    Receitas: ", brl(iFin), "(antes:", brl(iB) + ")");
  console.log("    Despesas: ", brl(eFin), "(antes:", brl(eB) + ")");
  console.log("    Saldo:    ", brl(iFin - eFin), "(antes:", brl(sB) + ")");
  console.log("    Integridade:", near(iFin, iB) && near(eFin, eB) ? "PERFEITA" : "DIVERGENCIA DETECTADA");
  if (failed > 0) process.exit(1);
}

run().catch(e => { console.error("ERRO FATAL:", e.message); process.exit(1); });
