Campo de valor em reais. Substitui o `<input type="number">` da tela Lançar, que rejeita vírgula. A pessoa digita só dígitos; o campo mostra "R$ 35,90" enquanto digita.

```jsx
const [cents, setCents] = useState(0);
<CurrencyInput cents={cents} onChange={setCents} autoFocus />
```

- inputMode="numeric" abre o teclado numérico no celular.
- Guarda centavos como inteiro; converta com cents / 100 ao salvar.
