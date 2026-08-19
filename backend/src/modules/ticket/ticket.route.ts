import { Elysia, t } from "elysia";

import { authMiddleware } from "../../middleware/auth.middleware";
import { ticketController } from "./ticket.controller";

export const ticketRoute = new Elysia({
  prefix: "/tickets",
})
  .use(authMiddleware)

  .post(
    "/",
    (context) => ticketController.create(context),
    {
      body: t.Object({
        keluhan: t.String({
          minLength: 10,
          maxLength: 2000,
        }),

        evidence: t.Optional(
          t.File({
            maxSize: "5m",
            type: [
              "image/jpeg",
              "image/png",
              "image/webp",
              "application/pdf",
            ],
          })
        ),
      }),
    }
  )

  //  admin
  .get(
    "/",
    (context) =>
      ticketController.getAllTickets(
        context
      )
  )

  // user/karyawan
  .get(
    "/my",
    (context) => ticketController.getMyTickets(context)
  )

  .get(
    "/evidences/:evidenceId",
    (context) =>
      ticketController.getEvidenceFile(
        context
      ),
    {
      params: t.Object({
        evidenceId: t.String(),
      }),
    }
  )

  // .patch(
  //   "/:id/assign",
  //   (context) =>
  //     ticketController.assignTicket(
  //       context
  //     ),
  //   {
  //     params: t.Object({
  //       id: t.String(),
  //     }),
  //   }
  // )

  .get(
    "/detail/:id",
    (context) =>
      ticketController.getTicketDetail(
        context
      ),
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )

  .patch(
  "/:id/progress",
  (context) =>
    ticketController.updateTicketProgress(
      context
    ),
  {
    params: t.Object({
      id: t.String(),
    }),

    body: t.Object({
      kategoriKeluhan: t.Optional(
        t.Nullable(t.String())
      ),

      priority: t.Optional(
        t.Number()
      ),

      sla: t.Optional(
        t.Nullable(
          t.Union([
            t.String(),
            t.Number(),
          ])
        )
      ),

      eskalasi: t.Optional(
        t.Nullable(t.String())
      ),

      batasResponse: t.Optional(
        t.Nullable(t.String())
      ),

      selesaiResponse: t.Optional(
        t.Nullable(t.String())
      ),

      keteranganResponse: t.Optional(
        t.Nullable(t.String())
      ),

      isPending: t.Optional(
        t.Boolean()
      ),

      lamaPending: t.Optional(
        t.Nullable(t.Number())
      ),

      analisaAwal: t.Optional(
        t.Nullable(t.String())
      ),

      hasilAnalisa: t.Optional(
        t.Nullable(t.String())
      ),

      mulaiPengerjaan: t.Optional(
        t.Nullable(t.String())
      ),

      estimasiPengerjaan: t.Optional(
        t.Nullable(t.String())
      ),

      selesaiPengerjaan: t.Optional(
        t.Nullable(t.String())
      ),

      catatan: t.Optional(
        t.Nullable(t.String())
      ),

      status: t.Optional(
        t.Union([
          t.Literal("MASUK"),
          t.Literal("OPEN"),
          t.Literal("ON_GOING"),
          t.Literal("PENDING"),
          t.Literal("COMPLETED"),
          t.Literal("CANCELLED"),
        ])
      ),

      keterangan: t.Optional(
        t.Nullable(t.String())
      ),
    }),
  }
)

  .get(
    "/it-helpdesk-users",
    (context) =>
      ticketController
        .getItHelpdeskUsers(
          context
        )
  )

  .patch(
    "/:id/assignment",
    (context) =>
      ticketController
        .assignTicketByAdmin(
          context
        ),
    {
      params: t.Object({
        id: t.String(),
      }),

      body: t.Object({
        handlerId: t.Number(),

        kategoriKeluhan:
          t.String({
            minLength: 1,
            maxLength: 100,
          }),

        sla: t.Number({
          minimum: 1,
        }),

        priority: t.Optional(
          t.Number()
        ),

        eskalasi: t.Optional(
          t.Nullable(
            t.String()
          )
        ),

        analisaAwal: t.Optional(
          t.Nullable(
            t.String()
          )
        ),

        batasResponse: t.Optional(
          t.Nullable(
            t.String()
          )
        ),

        estimasiPengerjaan:
          t.Optional(
            t.Nullable(
              t.String()
            )
          ),

        selesaiResponse: t.Optional(
          t.Nullable(
            t.String()
          )
        ),

        keteranganResponse: t.Optional(
          t.Nullable(
            t.String()
          )
        ),

        catatan: t.Optional(
          t.Nullable(
            t.String()
          )
        ),

        keterangan: t.Optional(
          t.Nullable(
            t.String()
          )
        ),
      }),
    }
  )

  .get(
    "/:id",
    (context) =>
      ticketController.getMyTicketDetail(context),
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  );