Confirmação única do app (substitui window.confirm e o "Sim/Não" inline). Folha inferior no celular; botões de 44px lado a lado.

```jsx
<Dialog open={ask} danger title="Excluir este lançamento?" body="Ele sai do app e da próxima sincronização da planilha." confirmLabel="Excluir" onConfirm={del} onCancel={() => setAsk(false)} />
```
