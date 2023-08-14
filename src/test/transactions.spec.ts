import { expect, beforeAll, afterAll, describe, it } from "vitest";
import { app } from "../app";
import request from "supertest";
import { beforeEach } from "node:test";
import { execSync } from "node:child_process";
import { number } from "zod";

describe("Rotas de transação", () => {
  beforeAll(async () => {
    await app.ready();
  });
  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    execSync("npm run knex migrate:rollback");
    execSync("npm run knex migrate:latest");
  });

  it("O usuário consegue criar uma nova transação", async () => {
    await request(app.server)
      .post("/transactions")
      .send({
        title: "Nova Transação",
        amount: 5000,
        type: "credit",
      })
      .expect(201);
  });

  it("O usuário consegue listar todas as transações", async () => {
    const createTransactionsResponse = await request(app.server)
      .post("/transactions")
      .send({
        title: "Nova Transação",
        amount: 5000,
        type: "credit",
      });

    const cookies = createTransactionsResponse.get("Set-Cookie");

    const listTransactionsResponse = await request(app.server)
      .get("/transactions")
      .set("Cookie", cookies)
      .expect(200);
    expect(listTransactionsResponse.body.transactions).toEqual([
      expect.objectContaining({
        id: expect.any(String),
        title: "Nova Transação",
        amount: 5000,
      }),
    ]);
  });

  it("O usuário consegue listar uma transação específica", async () => {
    const createTransactionsResponse = await request(app.server)
      .post("/transactions")
      .send({
        title: "Nova Transação",
        amount: 5000,
        type: "credit",
      });

    const cookies = createTransactionsResponse.get("Set-Cookie");

    const listTransactionsResponse = await request(app.server)
      .get("/transactions")
      .set("Cookie", cookies)
      .expect(200);

    const transactionId = listTransactionsResponse.body.transactions[0].id;

    const getTransactionResponse = await request(app.server)
      .get(`/transactions/${transactionId}`)
      .set("Cookie", cookies)
      .expect(200);

    expect(getTransactionResponse.body.transaction).toEqual(
      expect.objectContaining({
        title: "Nova Transação",
        amount: 5000,
      })
    );
  });

  it("O usuário consegue listar o resumo das transações", async () => {
    const createTransactionsResponse = await request(app.server)
      .post("/transactions")
      .send({
        title: "Transação de crédito",
        amount: 10000,
        type: "credit",
      });

    const cookies = createTransactionsResponse.get("Set-Cookie");

    await request(app.server)
      .post("/transactions")
      .send({
        title: "Transação de débito",
        amount: 5000,
        type: "debit",
      })
      .set("Cookie", cookies);

    const summaryResponse = await request(app.server)
      .get("/transactions/summary")
      .set("Cookie", cookies)
      .expect(200);

    expect(summaryResponse.body.summary).toEqual([
      expect.objectContaining({
        "Resumo das transações": expect.any(Number),
      }),
    ]);
  });
});
