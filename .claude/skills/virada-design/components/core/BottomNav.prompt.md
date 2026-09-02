Menu inferior flutuante do celular (abaixo de 1024px). Item ativo em verde-claro com texto verde-escuro; rótulo sempre visível (12px).

```jsx
<BottomNav active="inicio" onChange={go} items={[
  { key:"inicio", label:"Início", icon:<Gauge size={18}/> },
  { key:"lancar", label:"Lançar", icon:<PenLine size={18}/> },
  { key:"relatorios", label:"Relatórios", icon:<Table size={18}/> },
  { key:"conta", label:"Conta", icon:<Settings size={18}/> }]} />
```
