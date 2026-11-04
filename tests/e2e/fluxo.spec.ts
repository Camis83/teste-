import { test, expect } from "@playwright/test";
test("login → cadastrar → editar → recarregar → detalhe → dashboard → sair (adaptador simulado)", async ({
  page,
}) => {
  await page.goto("/propostas");
  await page.screenshot({ path: "docs/fluxo-login.png", fullPage: true });
  await expect(page).toHaveURL(/login/);
  await page.getByLabel("E-mail", { exact: true }).fill("aluno@example.com");
  await page.getByLabel("Senha", { exact: true }).fill("senha-incorreta");
  await page.getByRole("button", { name: "Entrar no Atlas" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Não foi possível entrar" }),
  ).toContainText("Não foi possível entrar");
  await page.getByLabel("E-mail", { exact: true }).fill("aluno@example.com");
  await page.getByLabel("Senha", { exact: true }).fill("Atlas-lab-2026!");
  await page.getByRole("button", { name: "Entrar no Atlas" }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.getByRole("link", { name: "+ Nova proposta" }).click();
  await page.getByLabel("Código", { exact: true }).fill("ATL-2026-0118");
  await page.getByLabel("Cliente", { exact: true }).selectOption("CLI-022");
  await page.getByLabel("Vendedor", { exact: true }).selectOption("VEN-01");
  await page.getByLabel("Produto", { exact: true }).selectOption("PRD-03");
  await page.getByLabel("Etapa", { exact: true }).selectOption("Negociacao");
  await page.getByLabel("Validade", { exact: true }).fill("2099-11-30");
  await page.getByLabel("Preço unitário (R$)", { exact: true }).fill("48000");
  await page
    .getByLabel("Desconto (fração: 0,10 = 10%)", { exact: true })
    .fill("0.10");
  await page.getByLabel("Custo total (R$)", { exact: true }).fill("25200");
  await page
    .getByLabel("Condição de pagamento", { exact: true })
    .fill("50% no aceite e 50% na entrega");
  await page
    .getByLabel("Próxima ação", { exact: true })
    .fill("Confirmar condições com o contato");
  await page.getByRole("button", { name: "Salvar proposta" }).click();
  await expect(
    page.getByRole("heading", { name: "ATL-2026-0118", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Ganho bloqueado para revisão")).toBeVisible();
  await expect(page.getByText("R$ 43.200,00", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Editar proposta" }).click();
  await page
    .getByLabel("Próxima ação", { exact: true })
    .fill("Telefonar amanhã e confirmar condições");
  await page.getByRole("button", { name: "Salvar proposta" }).click();
  await expect(page).toHaveURL(/\/propostas\/ATL-2026-0118\?sucesso=1$/);
  await page.reload();
  await expect(
    page.getByText("Telefonar amanhã e confirmar condições", { exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "docs/fluxo-detalhe.png", fullPage: true });
  await page.getByRole("link", { name: "Voltar para propostas" }).click();
  await page.getByLabel("Buscar código").fill("0118");
  await page.getByRole("button", { name: "Aplicar", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "ATL-2026-0118 ↗" }),
  ).toBeVisible();
  await page.getByLabel("Canal", { exact: true }).selectOption("Outbound");
  await page.getByRole("button", { name: "Aplicar", exact: true }).click();
  await expect(page.getByText("Nenhuma proposta por aqui.")).toBeVisible();
  await page.getByRole("link", { name: "Visão geral" }).click();
  await expect(
    page.getByText("R$ 43.200,00", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByText("Meta não cadastrada", { exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "docs/fluxo-dashboard.png", fullPage: true });
  await page.getByRole("link", { name: "Fila de respostas" }).click();
  await expect(page.getByText(/Envio de e-mail desativado/)).toBeVisible();
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await expect(page).toHaveURL(/login/);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/login/);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("button", { name: "Entrar no Atlas" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.body.scrollWidth <= innerWidth),
  ).toBe(true);
  await page.screenshot({
    path: "docs/fluxo-login-mobile.png",
    fullPage: true,
  });
});
