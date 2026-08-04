# LaysFlix

PWA pessoal para organizar filmes e séries usando dados do TMDB. A biblioteca, a chave do TMDB e o progresso ficam armazenados somente no navegador do aparelho.

## Publicar no GitHub Pages

1. No GitHub, crie um repositório público chamado `laysflix`.
2. Envie **todo o conteúdo desta pasta** para a raiz do repositório, mantendo as pastas e os nomes dos arquivos.
3. Abra **Settings → Pages** no repositório.
4. Em **Build and deployment**, selecione **Deploy from a branch**.
5. Escolha a branch `main`, a pasta `/ (root)` e clique em **Save**.
6. Aguarde alguns minutos. O endereço será `https://SEU-USUARIO.github.io/laysflix/`.

Os caminhos do manifest e do service worker são relativos, portanto funcionam corretamente dentro da subpasta do GitHub Pages.

## Instalar no iPhone

1. Abra o endereço publicado no **Safari**.
2. Toque no botão **Compartilhar** (quadrado com seta para cima).
3. Role a lista e toque em **Adicionar à Tela de Início**.
4. Confirme o nome `LaysFlix` e toque em **Adicionar**.
5. Abra o novo ícone, toque na engrenagem e informe a chave da API ou o token de leitura do TMDB.

Se a opção não aparecer, confirme que a página foi aberta no Safari, e não dentro do navegador de outro aplicativo.

## Atualizações e dados

- Após o primeiro carregamento, a interface básica funciona offline. Pesquisas e imagens do TMDB precisam de internet.
- A chave e a biblioteca ficam no aparelho. Limpar os dados do Safari remove essas informações.
- Use **Exportar backup** regularmente e guarde o arquivo em local seguro.
- Para atualizar o app, substitua os arquivos no GitHub. Se o iPhone mantiver uma versão antiga, feche o app, abra a URL no Safari e recarregue a página.

## Segurança da chave

Não coloque a chave do TMDB em `app.js` nem em outro arquivo do repositório. O app pede a chave no próprio aparelho e a salva no armazenamento local.

## Créditos

Este produto usa a API do TMDB, mas não é endossado nem certificado pelo TMDB.
