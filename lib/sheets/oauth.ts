/**
 * Escopos e chaves do acesso do comprador ao Google.
 *
 * Vive fora do GoogleSyncButton porque o AuthGate também precisa deles: a
 * permissão da planilha é pedida JUNTO com a do login, numa tela só do Google.
 * O comprador autoriza uma vez e a planilha nasce sozinha (components/AutoPlanilha.tsx);
 * antes eram duas telas em momentos diferentes e quem não achava o botão
 * "Conectar" na tela Conta simplesmente ficava sem planilha.
 *
 * drive.file é escopo NÃO sensível: dá acesso só aos arquivos que o próprio app
 * cria. Não trocar por "spreadsheets" — ver a pegadinha nº 7 do CLAUDE.md.
 */
export const SHEETS_SCOPE = "https://www.googleapis.com/auth/drive.file";
export const LOGIN_SCOPES = `openid email profile ${SHEETS_SCOPE}`;

export const TOKEN_KEY = "virada_google_token";
export const SHEET_KEY = "virada_sheet_meta";

export interface GoogleToken {
  access_token: string;
  expires_at: number;
}

export interface SheetMeta {
  spreadsheetId: string;
  spreadsheetUrl: string;
  lastSync: string;
  /** Layout aplicado nessa planilha. Ausente = planilha anterior ao versionamento. */
  layoutVersion?: string;
}

/** O token do Google vale 1h; guardamos 55min para nunca usar um já vencido. */
export function saveGoogleToken(accessToken: string): void {
  try {
    const token: GoogleToken = { access_token: accessToken, expires_at: Date.now() + 55 * 60 * 1000 };
    localStorage.setItem(TOKEN_KEY, JSON.stringify(token));
  } catch {
    // navegador sem storage (aba anônima travada): o botão da tela Conta segue como plano B
  }
}

/** Devolve o token só se ainda estiver válido — senão null, e quem chamou pede outro. */
export function loadGoogleToken(): GoogleToken | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const token = JSON.parse(raw) as GoogleToken;
    return token.expires_at > Date.now() ? token : null;
  } catch {
    return null;
  }
}

/**
 * O editor do Sheets só abre com `/edit` no fim. Sem ele, tocar no link dentro do
 * app instalado (PWA em tela cheia) não abre nada — foi o "a planilha não abre".
 */
export function sheetUrlFor(spreadsheetId: string): string {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
}

/**
 * Planilha criada antes do conserto tem a URL sem `/edit` GRAVADA no aparelho.
 * Corrigir só a montagem não alcançaria quem já comprou — por isso normalizamos na leitura.
 */
export function normalizeSheetUrl(url: string | undefined | null, spreadsheetId: string): string {
  if (!url) return sheetUrlFor(spreadsheetId);
  const semQuery = url.split("?")[0].split("#")[0];
  return semQuery.endsWith("/edit") ? url : sheetUrlFor(spreadsheetId);
}

export function loadSheetMeta(): SheetMeta | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SHEET_KEY);
    if (!raw) return null;
    const meta = JSON.parse(raw) as SheetMeta;
    const spreadsheetUrl = normalizeSheetUrl(meta.spreadsheetUrl, meta.spreadsheetId);
    if (spreadsheetUrl !== meta.spreadsheetUrl) {
      const corrigido = { ...meta, spreadsheetUrl };
      localStorage.setItem(SHEET_KEY, JSON.stringify(corrigido));
      return corrigido;
    }
    return meta;
  } catch {
    return null;
  }
}
