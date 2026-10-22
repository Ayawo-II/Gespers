export interface AnnualLeaveBalance {
  annee: number;
  joursAnnuels: number;
  joursCredites: number;
  joursPris: number;
  joursRestants: number;
  reportIllimite: boolean;
}

export function calculateAnnualLeaveBalance(
  dateEntree: Date,
  joursAnnuels: number,
  joursPris: number,
  annee: number,
  reportIllimite = true,
): AnnualLeaveBalance {
  const yearsGranted = Math.max(
    0,
    annee - dateEntree.getUTCFullYear() + 1,
  );
  const joursCredites = yearsGranted * joursAnnuels;
  return {
    annee,
    joursAnnuels,
    joursCredites,
    joursPris,
    joursRestants: joursCredites - joursPris,
    reportIllimite,
  };
}
