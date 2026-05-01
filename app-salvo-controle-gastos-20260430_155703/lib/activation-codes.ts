/**
 * Códigos de ativação do Virada App — lote #1 (100 unidades)
 * Cada hash = btoa(código) — ofuscado para não aparecer em texto puro
 * Para gerar mais códigos: use o script em /scripts/gerar-codigos.js
 */

export const ACTIVATION_KEY = "virada-activated-v1";

// Hashes base64 dos 100 códigos válidos (lote 1)
const VALID_HASHES = new Set([
  "VlItSzdQQy1WWUZO","VlItQUU2Ri02N1g3","VlItWlpZRi0zSEha","VlItNzRFQS02M0VG",
  "VlItRUJRTC0zRUNZ","VlItOFZFNC1GVEJE","VlItNjZGRy05Rkw1","VlItTjlWSy1NQTlM",
  "VlItUkJMQS1LTDlK","VlItUVA4Qy1CVzRL","VlItRlk5Vy0yN1E3","VlItUzRUOC1DWFpG",
  "VlItSjlBQi1GOFQy","VlItOU02My00UjlQ","VlItTTdZRC1INUFT","VlItNEVKRy1HSzM3",
  "VlItMkxQRy1DMkdZ","VlItUFA5RS1NVzY3","VlItTkg1RS1FQVVW","VlItU1RGQi01R0NT",
  "VlItQ1NTRS1HOUxU","VlItVkpaQi1SODRV","VlItVDlHNC05RzdF","VlItUDdDTS1TTVJE",
  "VlItRjU4VS0zU0Uy","VlItU1k5WC05MzhZ","VlItMjZKOS04WU40","VlItWTlLUi1MSkg4",
  "VlItTjVYUi1LTUJN","VlItRE5GRi1QOFU3","VlItVFdKSC1FNjJQ","VlItQzhLNC1YTlM3",
  "VlItNFpCNi1HWjVZ","VlItTko4NC1NR1RX","VlItRkxLNC1aUVlD","VlItUEJEWC1NRjRK",
  "VlItSkNDOS1ENlpR","VlItQlM0Qy1UNTNa","VlItRTUyOC1WUloy","VlItS0xTMy1WQVo0",
  "VlItWU1TSi1SU0RW","VlItQUpTVy1USEtY","VlItQUdLTi1VN1RN","VlItVlVOMy1ONlg5",
  "VlItOEFGMy03TEIy","VlItNzROQi1XR0hX","VlItTkVIRS1FNENU","VlItTTlCTC05NzZa",
  "VlItODM4QS05SlpB","VlItM1ZTUy1HUTRF","VlItUjRRRy00RUtD","VlItRVZLUy1ZVjVH",
  "VlItTUtOVy0yUTI4","VlItUFE2RS0zWTVM","VlItU0JHSy1QWjJF","VlItRUFFMi1FWUhS",
  "VlItOU5HTi1YWDUy","VlItVE03Ti1aNVdC","VlItUEEyWC1CUEoy","VlItV0Q2RS1BVDdC",
  "VlItSFdQWC1DWVRB","VlItSEtaRS0zU0w5","VlItTDczQy05WVhE","VlItQVdDSy05OFJH",
  "VlItUFlTOS1SRlAy","VlItU1FZRy1MOVpF","VlItNUtKTi02M0NT","VlItNkhNUC1SUFZE",
  "VlItQ0pGSC00Wk02","VlItVTJWQi1TSlVV","VlItQ0FVSy1GS0RO","VlItWjdZSC1aOFdE",
  "VlItNjhUVi01WjdO","VlItRTM3NS1BMjZU","VlItV1c0Qy1HS0pH","VlItVTczOS1RRDk2",
  "VlItQlQ3RS00OENW","VlItOVpLRi1WSFY5","VlItVFM5TC1DOVc0","VlItVk5KMi1GS1VQ",
  "VlItVFVDSy1aRlk0","VlItRU45Sy1aMlZN","VlItUTNWMi02VDMz","VlItSzhISy1ZTVlK",
  "VlItUTRDSy1XNUQ4","VlItOEdLSC1DQVVM","VlItTUVCUC1LNkRK","VlItOFg3Ti1WVEpU",
  "VlItOEw5Qi1NRjRZ","VlItUlQ0QS1DQUtD","VlItUDVTSC1OMk1W","VlItRVI1Ry1DRVZR",
  "VlItTEJHQi1VUExS","VlItNUFTUS1aUkNB","VlItVFJWQy1YVlJG","VlItVVM4US1VTVNW",
  "VlItM1lGNC02TEdW","VlItTjVQTS00NEZW","VlItSjdWSC0zNFk4","VlItSkpXUy1IWkFW",
]);

/** Verifica se um código digitado é válido */
export function isValidCode(raw: string): boolean {
  const normalized = raw.trim().toUpperCase();
  const hash = btoa(normalized);
  return VALID_HASHES.has(hash);
}

/** Retorna o estado de ativação salvo no dispositivo */
export function getActivationState(): { activated: boolean; code?: string } {
  try {
    const saved = localStorage.getItem(ACTIVATION_KEY);
    if (!saved) return { activated: false };
    return JSON.parse(saved) as { activated: boolean; code?: string };
  } catch {
    return { activated: false };
  }
}

/** Salva a ativação no dispositivo */
export function saveActivation(code: string): void {
  localStorage.setItem(
    ACTIVATION_KEY,
    JSON.stringify({ activated: true, code, activatedAt: new Date().toISOString() })
  );
}
