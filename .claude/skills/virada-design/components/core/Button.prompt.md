Botão do app: verde para a única ação principal da tela, secundário com borda para o resto, nunca dois primários juntos.

```jsx
<Button size="lg" full icon={<Mic size={18} />}>Lançar agora</Button>
<Button variant="secondary">Conectar</Button>
<Button variant="danger" size="sm">Excluir</Button>
```

- Texto em Onest 700; altura mínima 44px (toque); 52px na ação principal.
- Hover do primário: `--brand-primary-hover`. Disabled: opacity .5, sem sombra.
- Nunca usar emoji dentro do botão.
