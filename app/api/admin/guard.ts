/**
 * Porteiro das rotas /api/admin/*.
 *
 * Nada de autenticação nova: usa o cookie assinado que lib/access/admin-session
 * já sabia criar e conferir, e que o /api/access/check emite quando a Google
 * confirma um e-mail que está em ADMIN_EMAILS.
 *
 * Por que o header `x-admin-email` quase não vale mais: era o único jeito que o
 * painel tinha, e qualquer pessoa forja um header — quem soubesse a URL lia a
 * lista inteira de compradores (nome, e-mail, compra). Vazamento de dado
 * pessoal, LGPD. Agora ele só é aceito FORA de produção; no servidor de verdade,
 * enquanto não houver segredo de sessão configurado, o admin simplesmente não
 * abre (503 pedindo pra configurar). Fechado por padrão: na dúvida, ninguém lê
 * a lista de compradores.
 */
import { ADMIN_COOKIE, isAdminEmail, verifyAdminSession } from "@/lib/access/admin-session";

export interface AdminAuth {
  email: string | null;
  /** Como a rota deve responder quando `email` é nulo: 401 (a pessoa resolve) ou 503 (o servidor não está configurado). */
  status?: 401 | 503;
  /** Mensagem pro painel explicar, em português, por que barrou. */
  message?: string;
  /** Aviso pro painel mostrar quando a porta só abriu porque isto aqui é dev. */
  warning?: string;
}

/* Textos de tela: português simples, sem jargão e sem nome de variável de
   ambiente (quem lê pode ser o dono no celular, não um programador). O nome
   exato da configuração vai pro log do servidor, onde ajuda de verdade. */
const MSG_SEM_SEGREDO =
  "O painel de administração ainda não foi liberado neste servidor. " +
  "Falta configurar o segredo que protege a lista de compradores — as instruções " +
  "estão no arquivo de exemplo de configuração do projeto. Depois de configurar, reinicie o servidor.";

const MSG_SESSAO_VENCIDA =
  "Sua sessão de administrador venceu. Entre de novo no app com a sua conta Google e volte aqui.";

const MSG_FORA_DA_LISTA =
  "Este e-mail não está na lista de administradores do servidor.";

const AVISO_DEV =
  "Atenção: este servidor está em modo de desenvolvimento e o painel abriu sem segredo de administrador. " +
  "Em produção ele fica fechado até o segredo ser configurado.";

/** Um log por processo: em produção isso é erro de configuração, não ruído. */
let jaAvisouNoLog = false;

function cookieValue(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() === name) {
      return decodeURIComponent(part.slice(eq + 1).trim());
    }
  }
  return null;
}

export function authenticateAdmin(request: Request): AdminAuth {
  // Caminho certo: cookie assinado emitido no login com a conta Google.
  const viaCookie = verifyAdminSession(cookieValue(request, ADMIN_COOKIE));
  if (viaCookie) return { email: viaCookie };

  const segredoConfigurado = (process.env.ADMIN_SESSION_SECRET ?? "").length >= 16;
  if (segredoConfigurado) {
    return { email: null, status: 401, message: MSG_SESSAO_VENCIDA };
  }

  // Sem segredo configurado não existe sessão assinada possível. Em produção
  // aceitar o header seria deixar a lista de compradores aberta pra quem
  // souber a URL — então a porta fica fechada até o dono configurar.
  if (process.env.NODE_ENV === "production") {
    if (!jaAvisouNoLog) {
      jaAvisouNoLog = true;
      console.error(
        "[admin] ADMIN_SESSION_SECRET não está configurado: as rotas /api/admin/* " +
          "ficam fechadas (503) em produção para não expor a lista de compradores. " +
          "Gere um valor aleatório (ver .env.example) e reinicie o servidor."
      );
    }
    return { email: null, status: 503, message: MSG_SEM_SEGREDO };
  }

  // Fora de produção o header antigo continua servindo pra desenvolver, mas o
  // painel mostra em tela que a porta está aberta.
  const legado = request.headers.get("x-admin-email");
  if (isAdminEmail(legado)) {
    return { email: (legado as string).trim().toLowerCase(), warning: AVISO_DEV };
  }

  return { email: null, status: 401, message: MSG_FORA_DA_LISTA };
}
