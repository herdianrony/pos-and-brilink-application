export interface RekeningKoranSummary {
  count: number;
  totalIn: number;
  totalOut: number;
  openingBalance: number;
  closingBalance: number;
  netChange: number;
}

export type DatePreset = "today" | "yesterday" | "week" | "month" | "lastmonth" | "year";
