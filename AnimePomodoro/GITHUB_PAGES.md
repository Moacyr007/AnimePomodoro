# Configuração do GitHub Pages

## Passos para ativar o GitHub Pages

1. **Push do código para o repositório:**
   ```bash
   git add .
   git commit -m "Add GitHub Pages configuration"
   git push origin master
   ```

2. **Configurar GitHub Pages nas configurações do repositório:**
   - Vá para **Settings** → **Pages** no seu repositório GitHub
   - Em "Build and deployment", escolha:
     - **Source:** GitHub Actions
   - O workflow será executado automaticamente

3. **Workflow automático:**
   - Sempre que você fizer push para `master`, o GitHub Actions:
     - Fará build do projeto com `dotnet publish`
     - Atualizará o `base href` em `index.html` para `/AnimePomodoro/`
     - Fará deploy automático para GitHub Pages

4. **Acessar a aplicação:**
   - A aplicação estará disponível em: `https://<seu-usuario>.github.io/AnimePomodoro/`

## Desenvolvimento Local

Para desenvolvimento local, use:
```bash
dotnet run
```

A aplicação rode em `http://localhost:5000` com a configuração local.

## Notas Importantes

- O projeto já possui:
  - ✅ Arquivo `404.html` para roteamento SPA
  - ✅ Arquivo `.nojekyll` para desabilitar Jekyll
  - ✅ Workflow GitHub Actions configurado
  - ✅ Base path configurado dinamicamente

- A configuração do `StaticWebAssetBasePath` no `.csproj` garante que os assets estejam no caminho correto

