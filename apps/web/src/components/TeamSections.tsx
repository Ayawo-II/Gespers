"use client";

import { useRouter } from "next/navigation";
import { Badge, Card, Empty } from "@/components/ui";
import { StatutBadge } from "@/components/status";
import { CLASSE_LABELS, type Agent } from "@/lib/types";
import { fullName } from "@/lib/utils";
import type { VueSection } from "@/lib/visibility";

export function TeamSections({
  sections,
  horsSection = [],
}: {
  sections: VueSection[];
  horsSection?: Agent[];
}) {
  const router = useRouter();

  if (sections.length === 0) {
    return (
      <Card>
        <Empty title="Aucune section" hint="Aucune section n'est rattachée à votre périmètre." />
      </Card>
    );
  }

  return (
    <>
      {sections.map(({ section, chef, membres }) => {
        const autres = membres.filter((m) => m.id !== chef?.id);
        return (
          <Card key={section.id}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
                marginBottom: 14,
              }}
            >
              <div>
                <h3 style={{ color: "var(--navy)", margin: 0, fontSize: 17 }}>{section.libelle}</h3>
                <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
                  {chef ? (
                    <>
                      Chef de section :{" "}
                      <strong style={{ color: "var(--navy)" }}>{fullName(chef)}</strong> — {chef.fonction || chef.poste}
                    </>
                  ) : (
                    "Chef de section non désigné"
                  )}
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <Badge tone="blue">{membres.length} agent(s)</Badge>
                {chef ? <Badge tone="gold">Chef : {fullName(chef)}</Badge> : <Badge tone="red">Sans chef</Badge>}
              </div>
            </div>

            {membres.length === 0 ? (
              <p className="muted">Aucun agent rattaché à cette section.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Matricule</th>
                      <th>Agent</th>
                      <th>Rôle</th>
                      <th>Type Agent</th>
                      <th>Grade & Position</th>
                      <th>Fonction</th>
                    </tr>
                  </thead>
                  <tbody>
                    {membres.map((a) => (
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
                          {chef && a.id === chef.id ? (
                            <Badge tone="gold">Chef de section</Badge>
                          ) : (
                            <Badge tone="gray">Membre</Badge>
                          )}
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
            )}

            {autres.length === 0 && chef && membres.length === 1 ? (
              <p className="muted" style={{ fontSize: 13, marginTop: 10, marginBottom: 0 }}>
                Aucun membre autre que le chef de section.
              </p>
            ) : null}
          </Card>
        );
      })}

      {horsSection.length > 0 ? (
        <Card>
          <h3 style={{ color: "var(--navy)", marginBottom: 14, fontSize: 17 }}>
            Agents sans section rattachée ({horsSection.length})
          </h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Matricule</th>
                  <th>Agent</th>
                  <th>Type Agent</th>
                  <th>Grade & Position</th>
                  <th>Fonction</th>
                </tr>
              </thead>
              <tbody>
                {horsSection.map((a) => (
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
      ) : null}
    </>
  );
}
