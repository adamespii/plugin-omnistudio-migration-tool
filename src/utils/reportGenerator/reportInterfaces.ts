export type CTASummary = {
  name: string;
  message: string;
  link: string;
};

export interface OrgParam {
  name: string;
  id: string;
  namespace: string;
  dataModel: string;
}

export interface SummaryItemParam {
  name: string;
  total: number;
  data: SummaryItemDetailParam[];
  file: string;
  showDetails?: boolean; // Set to false to hide counts and view report button
}

export interface SummaryItemDetailParam {
  name: string;
  count: number;
  cssClass: string;
}

export interface DashboardParam {
  mode: 'assess' | 'migrate';
  title: string;
  heading: string;
  org: OrgParam;
  assessmentDate: string;
  summaryItems: SummaryItemParam[];
  actionItems?: string[];
}

export interface ReportDataParam {
  title: string | string[];
  searchable: boolean;
  key: string;
  value: string;
  rowspan: number;
  colspan: number;
  isHref: boolean;
  uri?: string;
  customClass?: string;
}

export interface ReportRowParam {
  data: ReportDataParam[];
  rowId: string;
}

export interface ReportHeaderParam {
  name: string;
  colspan: number;
  rowspan: number;
}

export interface ReportHeaderGroupParam {
  header: ReportHeaderParam[];
}

export interface FilterParam {
  label: string;
}

export interface FilterGroupParam {
  label: string;
  key: string;
  filters: FilterParam[];
}

export interface ReportParam {
  title: string;
  heading: string;
  org: OrgParam;
  assessmentDate: string;
  total: number;
  filterGroups: FilterGroupParam[];
  headerGroups: ReportHeaderGroupParam[];
  rows: ReportRowParam[];
  rollbackFlags?: string[];
  callToAction?: CTASummary[];
  description?: string; // Description message displayed below the heading in the report
  pagination?: {
    currentPage: number;
    totalPages: number;
    pageSize: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    nextPageFile?: string;
    previousPageFile?: string;
  };
  props?: string;
  reportType?: string; // Used to identify specific report types like 'customlabels' for custom styling
}
