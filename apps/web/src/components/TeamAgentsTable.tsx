"use client";

import { useRouter } from "next/navigation";
import { Card, Empty } from "@/components/ui";
import { StatutBadge } from "@/components/status";
import { CLASSE_LABELS, type Agent } from "@/lib/types";
import { fullName } from "@/lib/utils";

export function TeamAgentsTable({ agents }: { agents: Agent[] }) {
  const router = useRouter();

  if (agents.length === 0) {
    return (
      <Card>
        <Empty title="Aucun agent" hint="Aucun agent rattaché à votre périmètre." />
      </Card>
    );
  }

  return (
    <Card>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Matricule</th>
              <th>Agent</th>
              <th>Type Agent</th>
              <th>Grade & Position</th>
              <th>Service / Fonction</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((a) => (
              <tr
                key={a.id}
                onClick={() => router.push(`/agents/${a.id}`)}
                style={{ cursor: "pointer" }}
              >
                <td>{a.matricule}</td>
                <td>
                  <strong>{fullName(a)}</strong>
                </td>
                <td>
                  <StatutBadge value={a.typeAgent || a.statut} />
                </td>
                <td>
                  Cat. {a.categorie} · {CLASSE_LABELS[a.classe] ?? a.classe} · Éch. {a.echelon}
                </td>
                <td>
                  {a.fonction || a.poste}
                  <div className="muted">{a.service}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
