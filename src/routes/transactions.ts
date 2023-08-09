import { FastifyInstance } from "fastify";
import { knex } from "../database";
import { string, z } from "zod";
import { title } from "process";
import crypto from "node:crypto";
import { randomUUID } from "crypto";
import { checkSessionIdExists } from "../middlewares/check-session-id-exists";

export async function transactionRoutes(app: FastifyInstance) {
  //GET Todas as transações
  app.get(
    "/",
    {
      preHandler: [checkSessionIdExists],
    },
    async (request, reply) => {
      const { sessionId } = request.cookies;

      const transactions = await knex("transactions")
        .where("session_id", sessionId)
        .select();
      return {
        transactions,
      };
    }
  );

  //GET Resumo das transações
  app.get(
    "/summary",
    {
      preHandler: [checkSessionIdExists],
    },
    async (request) => {
      const { sessionId } = request.cookies;

      const summary = await knex("transactions")
        .sum("amount", {
          as: "Resumo das transações",
        })
        .where({
          session_id: sessionId,
        });
      return { summary };
    }
  );

  //GET Transação pelo ID
  app.get(
    "/:id",
    {
      preHandler: [checkSessionIdExists],
    },
    async (request) => {
      const getTransactionParamsSchema = z.object({
        id: z.string().uuid(),
      });
      const { sessionId } = request.cookies;

      const { id } = getTransactionParamsSchema.parse(request.params);

      const transaction = await knex("transactions")
        .where({
          session_id: sessionId,
          id,
        })
        .first();

      return { transaction };
    }
  );

  //POST Cria uma transação
  app.post("/", async (request, response) => {
    request.body;

    const createTransactionBodySchema = z.object({
      title: z.string(),
      amount: z.number(),
      type: z.enum(["credit", "debit"]),
    });

    const { title, amount, type } = createTransactionBodySchema.parse(
      request.body
    );

    let sessionId = request.cookies.sessionId;
    if (!sessionId) {
      sessionId = randomUUID();

      response.cookie("sessionId", sessionId, {
        path: "/",
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7days
      });
    }

    await knex("transactions").insert({
      id: crypto.randomUUID(),
      title,
      amount: type === "credit" ? amount : amount * -1,
      session_id: sessionId,
    });

    return response.status(201).send();
  });
}
